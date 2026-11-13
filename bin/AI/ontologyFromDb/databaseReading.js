import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import async from "async";
import * as dbConnector from "../../databases/dbConnector.js";
import { modelMaxOutputTokens, jsonBlockRegex, createMessage, getCutAnswerError, getAnswerText } from "./ontology/ontologyAnswer.js";
import { saveDatabaseChecks } from "./ontology/ontologyRuns.js";
import { describeDatabase, getSampleTexts } from "./databaseDescription.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const linkCandidatesPromptPath = join(currentDirectory, "prompts/link_candidates_from_db.md");

// OpenRouter id, fixed here: the page does not choose the model
const linkCandidatesModelId = "anthropic/claude-haiku-5.5";
const linkCandidatesReasoningEffort = "medium";
const sampleRowCount = 5;
// database checks run before the call, a few at once: 8 saturate a postgres server on the biggest tables
const parallelCheckCount = 4;
const maxMeasuredPairs = 150;
const maxPairsPlaceholderRegex = /\{maxPairs\}/g;
// one pair of the link candidates answer, in the key order the prompt asks for
const streamedPairRegex = /\{\s*"left"\s*:\s*"([^"]+)"\s*,\s*"right"\s*:\s*"([^"]+)"\s*\}/g;

// a pair and its reverse are one measure, kept under this key in databaseChecks.json
function getPairKey(leftColumn, rightColumn) {
    const sortedColumns = [leftColumn, rightColumn].sort();
    const pairKey = sortedColumns.join("=");
    return pairKey;
}

// { columnsByTable, columnsByQualifiedName }: the qualified name table.column is the form of the prompt and of the link candidates
function indexSchemaColumns(schema) {
    const columnsByQualifiedName = new Map();
    const columnsByTable = {};
    schema.columns.forEach(function (column) {
        columnsByQualifiedName.set(column.table_name + "." + column.column_name, column);
        if (!columnsByTable[column.table_name]) {
            columnsByTable[column.table_name] = [];
        }
        columnsByTable[column.table_name].push(column);
    });
    return { columnsByTable: columnsByTable, columnsByQualifiedName: columnsByQualifiedName };
}

// the samples of every table, as earlier runs read them when its columns did not change; a schema file holds none
async function readTableSamples(connection, clientDriver, columnsByTable, databaseChecks, isSchemaFile, stopSignal) {
    const tableInspections = {};
    await async.eachLimit(Object.keys(columnsByTable), parallelCheckCount, async function (tableName) {
        const columnNames = columnsByTable[tableName].map((column) => column.column_name).join(",");
        const cachedInspection = databaseChecks.inspectionsByTable[tableName];
        // a table whose columns changed since the earlier runs is read again
        const inspection = cachedInspection && cachedInspection.columnNames == columnNames ? { ...cachedInspection } : { columnNames: columnNames };
        tableInspections[tableName] = inspection;
        if (inspection.sampleTexts || isSchemaFile || stopSignal.aborted) {
            return;
        }
        // a view without select right, or a broken one, must not stop the whole description
        try {
            const sampleRows = await dbConnector.getSampleData(connection, tableName, sampleRowCount, clientDriver);
            inspection.sampleTexts = getSampleTexts(sampleRows, columnsByTable[tableName]);
        } catch (sampleError) {
            inspection.sampleError = sampleError.message;
        }
    });
    return tableInspections;
}

// the schema and the samples, without the profiles, even those of earlier runs: the link candidates read the same text at every run
function getLinkCandidatesPrompt(database, schema, columnsByTable, tableInspections) {
    const sampleInspections = {};
    for (const [tableName, inspection] of Object.entries(tableInspections)) {
        sampleInspections[tableName] = { sampleTexts: inspection.sampleTexts, sampleError: inspection.sampleError };
    }
    const samplesDatabaseText = describeDatabase(database, schema, columnsByTable, sampleInspections);
    const linkCandidatesTemplate = readFileSync(linkCandidatesPromptPath, "utf8");
    const linkCandidatesPrompt = linkCandidatesTemplate.replace(maxPairsPlaceholderRegex, String(maxMeasuredPairs)) + "\n\n# Database\n\n" + samplesDatabaseText;
    return linkCandidatesPrompt;
}

// the profiles of the tables, then the pairs worth measuring, given by the caller or proposed by a small model that reads
// the database only, each measured as soon as it is known; reading.endStep(step, start, details) and reading.sendProgress
// tell the progress, steps "profiles", "linkCandidates" and "pairs"
async function measureLinkCandidates(reading) {
    const { connection, clientDriver, columnsByTable, columnsByQualifiedName, tableInspections, databaseChecks, isSchemaFile, stopSignal, sendProgress, endStep } = reading;
    const tableNames = Object.keys(columnsByTable);
    let profiledTableCount = 0;
    let cachedProfileCount = 0;
    const profilesDone = async
        .eachLimit(isSchemaFile ? [] : tableNames, parallelCheckCount, async function (tableName) {
            if (stopSignal.aborted) {
                return;
            }
            const inspection = tableInspections[tableName];
            if (inspection.profile) {
                cachedProfileCount++;
            } else {
                const columnNames = columnsByTable[tableName].map((column) => column.column_name);
                try {
                    inspection.profile = await dbConnector.getColumnProfile(connection, clientDriver, tableName, columnNames);
                } catch (profileError) {
                    inspection.profileError = profileError.message;
                }
            }
            profiledTableCount++;
            sendProgress({ type: "progress", step: "profiles", done: profiledTableCount, total: tableNames.length, item: tableName });
        })
        .then(() => endStep("profiles", reading.preparationStart, { cachedTableCount: cachedProfileCount }));

    // a pair and its reverse are one measure; a pair is measured as soon as it is known, while the model still writes the next ones
    const distinctCountOf = (column) => tableInspections[column.table_name].profile?.columnsByName[column.column_name]?.distinctCount;
    const measuredPairKeys = new Set();
    // indexed by the order the pairs were proposed in, so the prompt lists them the same way at every run
    const measuredOverlaps = [];
    let measuredPairCount = 0;
    let cachedOverlapCount = 0;
    const pairsStart = Date.now();
    sendProgress({ type: "stepStart", step: "pairs" });
    const pairMeasureQueue = async.queue(async function ({ pair, pairKey, pairIndex }) {
        if (stopSignal.aborted) {
            return;
        }
        const measuredOverlap = { left: pair.left, right: pair.right };
        const leftColumn = columnsByQualifiedName.get(pair.left);
        const rightColumn = columnsByQualifiedName.get(pair.right);
        if (!leftColumn || !rightColumn) {
            measuredOverlap.error = "unknown column";
        } else {
            // the distinct values of each column come from the profiles, one query per pair is left
            measuredOverlap.leftDistinctValues = distinctCountOf(leftColumn);
            measuredOverlap.rightDistinctValues = distinctCountOf(rightColumn);
            const cachedSharedValues = databaseChecks.overlapsByPairKey[pairKey];
            if (cachedSharedValues !== undefined) {
                measuredOverlap.sharedDistinctValues = cachedSharedValues;
                cachedOverlapCount++;
            } else {
                try {
                    measuredOverlap.sharedDistinctValues = await dbConnector.getSharedDistinctValueCount(
                        connection,
                        clientDriver,
                        leftColumn.table_name,
                        leftColumn.column_name,
                        rightColumn.table_name,
                        rightColumn.column_name,
                    );
                    databaseChecks.overlapsByPairKey[pairKey] = measuredOverlap.sharedDistinctValues;
                } catch (overlapError) {
                    measuredOverlap.error = overlapError.message;
                }
            }
        }
        measuredOverlaps[pairIndex] = measuredOverlap;
        measuredPairCount++;
        sendProgress({ type: "progress", step: "pairs", done: measuredPairCount, total: measuredPairKeys.size, item: pair.left + " = " + pair.right });
    }, parallelCheckCount);
    // the measures wait for the profiles: both at once saturate a postgres server
    pairMeasureQueue.pause();
    // resumed on a failure too: the failure is met where profilesDone is awaited
    const resumePairMeasures = () => pairMeasureQueue.resume();
    profilesDone.then(resumePairMeasures, resumePairMeasures);
    function queuePairMeasure(pair) {
        // the answer of a model may hold a pair of another shape
        if (!pair || typeof pair.left != "string" || typeof pair.right != "string") {
            return;
        }
        const pairKey = getPairKey(pair.left, pair.right);
        if (measuredPairKeys.has(pairKey) || measuredPairKeys.size >= maxMeasuredPairs) {
            return;
        }
        measuredPairKeys.add(pairKey);
        pairMeasureQueue.push({ pair: pair, pairKey: pairKey, pairIndex: measuredPairKeys.size - 1 });
    }

    // no value to measure a pair on: the links of a schema file are its declared keys
    let linkCandidates = isSchemaFile ? { pairs: [] } : reading.givenLinkCandidates;
    let linkCandidatesAnswer = null;
    let linkCandidatesModel = null;
    let linkCandidatesError = null;
    const linkCandidatesUsage = { input_tokens: 0, output_tokens: 0 };
    const linkCandidatesStart = Date.now();
    if (!linkCandidates) {
        sendProgress({ type: "stepStart", step: "linkCandidates", model: linkCandidatesModelId });
        let streamedCandidatesText = "";
        let pairScanPosition = 0;
        try {
            const candidatesMessage = {
                messages: [{ role: "user", content: reading.linkCandidatesPrompt }],
                maxTokens: modelMaxOutputTokens,
                model: linkCandidatesModelId,
                reasoningEffort: linkCandidatesReasoningEffort,
                abortSignal: stopSignal,
                onTextDelta: function (textDelta) {
                    streamedCandidatesText += textDelta;
                    // a pair cut in the middle is left for the next delta
                    const unscannedText = streamedCandidatesText.slice(pairScanPosition);
                    let scannedLength = 0;
                    for (const pairMatch of unscannedText.matchAll(streamedPairRegex)) {
                        queuePairMeasure({ left: pairMatch[1], right: pairMatch[2] });
                        scannedLength = pairMatch.index + pairMatch[0].length;
                    }
                    pairScanPosition += scannedLength;
                },
            };
            const candidatesCompletion = await createMessage(candidatesMessage, linkCandidatesUsage);
            linkCandidatesModel = candidatesCompletion.model;
            linkCandidatesAnswer = getAnswerText(candidatesCompletion);
            linkCandidatesError = getCutAnswerError(candidatesCompletion, linkCandidatesAnswer);
            if (!linkCandidatesError) {
                const candidatesMatch = linkCandidatesAnswer.match(jsonBlockRegex);
                linkCandidates = JSON.parse(candidatesMatch ? candidatesMatch[1] : linkCandidatesAnswer);
            }
        } catch (candidatesError) {
            linkCandidatesError = "the list of pairs could not be read: " + candidatesError.message;
        }
    }
    if (!linkCandidatesError && !Array.isArray(linkCandidates?.pairs)) {
        linkCandidatesError = "the link candidates hold no pairs array";
    }
    if (linkCandidatesError) {
        console.warn("[ai/databaseReading] link candidates: " + linkCandidatesError);
    }
    endStep("linkCandidates", linkCandidatesStart, { pairCount: linkCandidates?.pairs?.length ?? measuredPairKeys.size, error: linkCandidatesError, isStopped: stopSignal.aborted });

    // pairs given by the caller, or written in a shape the streamed reading missed
    if (Array.isArray(linkCandidates?.pairs)) {
        linkCandidates.pairs.forEach(queuePairMeasure);
    }
    await profilesDone;
    // drain() never resolves on a queue that is already idle
    if (!pairMeasureQueue.idle()) {
        await pairMeasureQueue.drain();
    }
    const sharingOverlaps = measuredOverlaps.filter((overlap) => overlap.sharedDistinctValues > 0);
    endStep("pairs", pairsStart, { sharingCount: sharingOverlaps.length, cachedPairCount: cachedOverlapCount });
    const measuredLinks = {
        linkCandidates: linkCandidates,
        linkCandidatesAnswer: linkCandidatesAnswer,
        linkCandidatesModel: linkCandidatesModel,
        linkCandidatesError: linkCandidatesError,
        linkCandidatesUsage: linkCandidatesUsage,
        measuredOverlaps: measuredOverlaps,
    };
    return measuredLinks;
}

// only what was read without error is kept, a failed check is tried again at the next run
async function saveTableInspections(databaseFolder, databaseChecks, tableInspections) {
    for (const [tableName, inspection] of Object.entries(tableInspections)) {
        if (inspection.sampleTexts && inspection.profile) {
            databaseChecks.inspectionsByTable[tableName] = { columnNames: inspection.columnNames, sampleTexts: inspection.sampleTexts, profile: inspection.profile };
        }
    }
    await saveDatabaseChecks(databaseFolder, databaseChecks);
}

// the measured overlaps as the prompts read them; given pairs to decide ({ id, left, right }), each sharing line starts with
// the id of its pair
function getOverlapsText(measuredLinks, isSchemaFile, pairsToDecide) {
    const { linkCandidates, linkCandidatesError, measuredOverlaps } = measuredLinks;
    const pairIdText = pairsToDecide ? "id of the pair to decide then " : "";
    let overlapsText = "\n## Overlaps measured between candidate columns\n\n";
    if (isSchemaFile) {
        overlapsText = "";
    } else if (linkCandidatesError && measuredOverlaps.length == 0) {
        overlapsText += "The first reading of the database failed (" + linkCandidatesError + "): no overlap was measured, every link hypothesis without a declared key stays unchecked.\n";
    } else if (measuredOverlaps.length == 0) {
        overlapsText += "The first reading of the database proposed no pair of columns to measure.\n";
    } else {
        if (linkCandidatesError) {
            overlapsText += "The first reading of the database stopped early (" + linkCandidatesError + "): only the pairs it proposed before are measured.\n";
        }
        overlapsText +=
            "Pairs of columns proposed as possible links by a first reading of the database, measured before this call. " +
            "Line format: " +
            pairIdText +
            "column = reference: shared distinct values / distinct values of the column / distinct values of the reference, ? when the column could not be counted.\n";
    }
    const repeatingTablePairs = linkCandidatesError ? [] : (linkCandidates.repeatingTables || []).filter((tablePair) => Array.isArray(tablePair) && tablePair.length == 2);
    if (repeatingTablePairs.length > 0) {
        const repeatingPairTexts = repeatingTablePairs.map(([repeatingTable, repeatedTable]) => repeatingTable + " ~ " + repeatedTable);
        overlapsText += "Tables repeating the columns of another one (copies, views or extracts), not compared with each other: " + repeatingPairTexts.join(", ") + "\n";
    }
    const sharingOverlaps = measuredOverlaps.filter((overlap) => overlap.sharedDistinctValues > 0);
    sharingOverlaps.forEach(function (overlap) {
        const overlapPair = pairsToDecide?.find((pair) => pair.left == overlap.left && pair.right == overlap.right);
        const pairIdPrefix = overlapPair ? overlapPair.id + " " : "";
        const measuresText = overlap.sharedDistinctValues + " / " + (overlap.leftDistinctValues ?? "?") + " / " + (overlap.rightDistinctValues ?? "?");
        overlapsText += pairIdPrefix + overlap.left + " = " + overlap.right + ": " + measuresText + "\n";
    });
    const disjointOverlaps = measuredOverlaps.filter((overlap) => overlap.sharedDistinctValues === 0);
    if (disjointOverlaps.length > 0) {
        const disjointPairTexts = disjointOverlaps.map((overlap) => overlap.left + " = " + overlap.right);
        overlapsText += "No shared value: " + disjointPairTexts.join(", ") + "\n";
    }
    const failedOverlaps = measuredOverlaps.filter((overlap) => overlap.error);
    if (failedOverlaps.length > 0) {
        const failedPairTexts = failedOverlaps.map((overlap) => overlap.left + " = " + overlap.right + " (" + overlap.error + ")");
        overlapsText += "Not measured: " + failedPairTexts.join(", ") + "\n";
    }
    return overlapsText;
}

export { getPairKey, indexSchemaColumns, readTableSamples, getLinkCandidatesPrompt, measureLinkCandidates, saveTableInspections, getOverlapsText };
