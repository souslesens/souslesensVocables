import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import async from "async";
import {
    nonNameCharacterRegex,
    runningGenerations,
    getNewRunTimestamp,
    listSourceRuns,
    isTboxSourceOf,
    getRunName,
    getRunGraphUri,
    loadTurtleIntoGraph,
    saveRun,
    readDatabaseChecks,
    saveDatabaseChecks,
} from "../../../../bin/AI/ontologyRuns.js";
import {
    ontologyModelId,
    ontologyReasoningEffort,
    modelMaxOutputTokens,
    getNextOntologyVersion,
    jsonBlockRegex,
    createMessage,
    getCutAnswerError,
    getAnswerText,
    getTermNamespace,
    getAnswerTurtle,
} from "../../../../bin/AI/ontologyAnswer.js";
import userManager from "../../../../bin/user.js";
import * as dbConnector from "../../../../bin/KG/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";
import { sourceModel } from "../../../../model/sources.js";
import { getUpperOntologyModelText } from "../../../../bin/AI/upperOntologyModel.js";
import { checkRunRestrictions } from "../../../../bin/AI/restrictionCheck.js";
import { describeDatabase } from "../../../../bin/AI/databaseDescription.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const ontologyBuildingPromptPath = join(currentDirectory, "../../../../bin/AI/prompts/ontology_building_from_db.md");
const linkCandidatesPromptPath = join(currentDirectory, "../../../../bin/AI/prompts/link_candidates_from_db.md");

// OpenRouter ids, fixed here: the page does not choose the models
const linkCandidatesModelId = "anthropic/claude-haiku-5.5";
const linkCandidatesReasoningEffort = "medium";
const sampleRowCount = 5;
const sampleValueMaxLength = 100;
// YYYY-MM-DD
const dateTextLength = 10;
// database checks run before the call, a few at once: 8 saturate a postgres server on the biggest tables
const parallelCheckCount = 4;
const maxMeasuredPairs = 150;

const lineBreakRegex = /\s*[\r\n]+\s*/g;
const maxPairsPlaceholderRegex = /\{maxPairs\}/g;
const answerLabelRegex = /"label"\s*:\s*"([^"]+)"/g;
// one pair of the link candidates answer, in the key order the prompt asks for
const streamedPairRegex = /\{\s*"left"\s*:\s*"([^"]+)"\s*,\s*"right"\s*:\s*"([^"]+)"\s*\}/g;
// the page is told what the model writes at most once a second
const writingProgressIntervalMs = 1000;

export default function () {
    let operations = {
        POST,
    };

    // one line per sample row, values as the prompt shows them: saved as text, they read the same at every run
    function getSampleTexts(rows, columns) {
        const columnTypes = {};
        columns.forEach(function (column) {
            columnTypes[column.column_name] = column.data_type;
        });
        return rows.map(function (row) {
            const values = Object.entries(row).map(function ([columnName, value]) {
                if (value === null || value === undefined) {
                    return "NULL";
                }
                if (Buffer.isBuffer(value)) {
                    return "<binary>";
                }
                let valueText;
                if (value instanceof Date) {
                    // pg reads a stored date in the server time zone: its local fields are the stored value
                    valueText = value.toLocaleString("sv-SE");
                    if (columnTypes[columnName] == "date") {
                        valueText = valueText.substring(0, dateTextLength);
                    }
                } else if (typeof value == "object") {
                    valueText = JSON.stringify(value);
                } else {
                    valueText = String(value);
                }
                valueText = valueText.replace(lineBreakRegex, " ");
                if (valueText.length > sampleValueMaxLength) {
                    valueText = valueText.substring(0, sampleValueMaxLength) + "...";
                }
                return valueText;
            });
            return values.join(" | ");
        });
    }

    async function POST(req, res, _next) {
        const runStart = Date.now();
        // a generation streams its progress, one JSON object per line; the prompt-only calls answer at once
        const isProgressStreamed = !req.body.promptOnly && !req.body.linkCandidatesPromptOnly;
        // the entry of this generation in runningGenerations, which pages opened later read
        let runningGeneration = null;
        function sendProgress(progressEvent) {
            if (!isProgressStreamed) {
                return;
            }
            if (progressEvent.type == "stepStart") {
                runningGeneration.step = progressEvent.step;
            }
            // the page that started the run may be closed: the run goes on and is saved all the same
            if (res.destroyed || res.writableEnded) {
                return;
            }
            if (!res.headersSent) {
                res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
                res.flushHeaders();
            }
            progressEvent.elapsedSeconds = Math.round((Date.now() - runStart) / 1000);
            res.write(JSON.stringify(progressEvent) + "\n");
        }
        const stepSeconds = {};
        function endStep(stepName, stepStart, stepDetails) {
            stepSeconds[stepName] = Math.round((Date.now() - stepStart) / 1000);
            sendProgress({ type: "stepEnd", step: stepName, seconds: stepSeconds[stepName], ...stepDetails });
        }

        try {
            const source = req.body.source;
            const databaseId = req.body.databaseId;
            // a validated version of the source is imported by it, it is not an upper ontology of the next one
            const upperOntologies = (req.body.upperOntologies || []).filter((upperOntology) => !isTboxSourceOf(req.body.source, upperOntology));

            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);
            const unknownSources = [source, ...upperOntologies].filter((sourceName) => !userSources[sourceName]);
            if (unknownSources.length > 0) {
                return res.status(404).json({ error: "sources not found: " + unknownSources.join(", ") });
            }
            if (isProgressStreamed) {
                if (runningGenerations[source]) {
                    return res.status(409).json({ error: "a generation is already running for " + source + ", started at " + runningGenerations[source].startedAt });
                }
                runningGeneration = { startedAt: new Date(runStart).toISOString(), database: null, step: null };
                runningGenerations[source] = runningGeneration;
            }

            const connection = await databaseModel.getUserConnection(userInfo.user, databaseId);
            const database = await databaseModel.getDatabase(databaseId);
            const schema = await dbConnector.getSchemaDescription(connection, database.driver);
            const clientDriver = databaseModel.getClientDriver(database.driver);
            const databaseFolder = database.database.replace(nonNameCharacterRegex, "_");
            if (runningGeneration) {
                runningGeneration.database = database.database;
            }
            // the samples, profiles and overlaps of the previous runs on the database, unless the caller asks to count again
            const databaseChecks = req.body.refreshDatabaseChecks ? { inspectionsByTable: {}, overlapsByPairKey: {} } : await readDatabaseChecks(databaseFolder);

            const preparationStart = Date.now();
            // the qualified name table.column is the form of the prompt and of the link candidates
            const columnsByQualifiedName = new Map();
            const columnsByTable = {};
            schema.columns.forEach(function (column) {
                columnsByQualifiedName.set(column.table_name + "." + column.column_name, column);
                if (!columnsByTable[column.table_name]) {
                    columnsByTable[column.table_name] = [];
                }
                columnsByTable[column.table_name].push(column);
            });
            const tableNames = Object.keys(columnsByTable);
            const tableInspections = {};
            sendProgress({ type: "stepStart", step: "profiles", tableCount: tableNames.length, columnCount: schema.columns.length });
            // the samples first: the link candidates step reads the schema and the samples while the profiles are counted
            await async.eachLimit(tableNames, parallelCheckCount, async function (tableName) {
                const columnNames = columnsByTable[tableName].map((column) => column.column_name).join(",");
                const cachedInspection = databaseChecks.inspectionsByTable[tableName];
                // a table whose columns changed since the earlier runs is read again
                const inspection = cachedInspection && cachedInspection.columnNames == columnNames ? { ...cachedInspection } : { columnNames: columnNames };
                tableInspections[tableName] = inspection;
                if (inspection.sampleTexts) {
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
            // without the profiles, even those of earlier runs: the link candidates read the same text at every run
            const sampleInspections = {};
            for (const [tableName, inspection] of Object.entries(tableInspections)) {
                sampleInspections[tableName] = { sampleTexts: inspection.sampleTexts, sampleError: inspection.sampleError };
            }
            const samplesDatabaseText = describeDatabase(database, schema, columnsByTable, sampleInspections);

            // the pairs worth measuring: given by the caller, or proposed by a small model that reads the database only
            const linkCandidatesTemplate = readFileSync(linkCandidatesPromptPath, "utf8");
            const linkCandidatesPrompt = linkCandidatesTemplate.replace(maxPairsPlaceholderRegex, String(maxMeasuredPairs)) + "\n\n# Database\n\n" + samplesDatabaseText;
            if (req.body.linkCandidatesPromptOnly) {
                return res.status(200).json({ prompt: linkCandidatesPrompt, promptCharacters: linkCandidatesPrompt.length });
            }

            let profiledTableCount = 0;
            let cachedProfileCount = 0;
            const profilesDone = async
                .eachLimit(tableNames, parallelCheckCount, async function (tableName) {
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
                .then(() => endStep("profiles", preparationStart, { cachedTableCount: cachedProfileCount }));

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
                const sortedColumns = [pair.left, pair.right].sort();
                const pairKey = sortedColumns.join("=");
                if (measuredPairKeys.has(pairKey) || measuredPairKeys.size >= maxMeasuredPairs) {
                    return;
                }
                measuredPairKeys.add(pairKey);
                pairMeasureQueue.push({ pair: pair, pairKey: pairKey, pairIndex: measuredPairKeys.size - 1 });
            }

            let linkCandidates = req.body.linkCandidates;
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
                        messages: [{ role: "user", content: linkCandidatesPrompt }],
                        maxTokens: modelMaxOutputTokens,
                        model: linkCandidatesModelId,
                        reasoningEffort: linkCandidatesReasoningEffort,
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
                console.warn("[ai/ontologyFromDb] link candidates: " + linkCandidatesError);
            }
            endStep("linkCandidates", linkCandidatesStart, { pairCount: linkCandidates?.pairs?.length ?? measuredPairKeys.size, error: linkCandidatesError });

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
            const preparationSeconds = Math.round((Date.now() - preparationStart) / 1000);
            const databaseText = describeDatabase(database, schema, columnsByTable, tableInspections);

            // only what was read without error is kept, a failed check is tried again at the next run
            for (const [tableName, inspection] of Object.entries(tableInspections)) {
                if (inspection.sampleTexts && inspection.profile) {
                    databaseChecks.inspectionsByTable[tableName] = { columnNames: inspection.columnNames, sampleTexts: inspection.sampleTexts, profile: inspection.profile };
                }
            }
            try {
                await saveDatabaseChecks(databaseFolder, databaseChecks);
            } catch (writeError) {
                console.warn("[ai/ontologyFromDb] database checks not saved: " + writeError.message);
            }

            let overlapsText = "\n## Overlaps measured between candidate columns\n\n";
            if (linkCandidatesError && measuredOverlaps.length == 0) {
                overlapsText += "The first reading of the database failed (" + linkCandidatesError + "): no overlap was measured, every link hypothesis without a declared key stays unchecked.\n";
            } else if (measuredOverlaps.length == 0) {
                overlapsText += "The first reading of the database proposed no pair of columns to measure.\n";
            } else {
                if (linkCandidatesError) {
                    overlapsText += "The first reading of the database stopped early (" + linkCandidatesError + "): only the pairs it proposed before are measured.\n";
                }
                overlapsText +=
                    "Pairs of columns proposed as possible links by a first reading of the database, measured before this call. " +
                    "Line format: column = reference: shared distinct values / distinct values of the column / distinct values of the reference, ? when the column could not be counted.\n";
            }
            const repeatingTablePairs = linkCandidatesError ? [] : (linkCandidates.repeatingTables || []).filter((tablePair) => Array.isArray(tablePair) && tablePair.length == 2);
            if (repeatingTablePairs.length > 0) {
                const repeatingPairTexts = repeatingTablePairs.map(([repeatingTable, repeatedTable]) => repeatingTable + " ~ " + repeatedTable);
                overlapsText += "Tables repeating the columns of another one (copies, views or extracts), not compared with each other: " + repeatingPairTexts.join(", ") + "\n";
            }
            sharingOverlaps.forEach(function (overlap) {
                overlapsText +=
                    overlap.left + " = " + overlap.right + ": " + overlap.sharedDistinctValues + " / " + (overlap.leftDistinctValues ?? "?") + " / " + (overlap.rightDistinctValues ?? "?") + "\n";
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

            const upperOntologiesStart = Date.now();
            sendProgress({ type: "stepStart", step: "upperOntologies", sources: upperOntologies });
            const ontologiesText = await getUpperOntologyModelText(upperOntologies, { user: userInfo, userSources: userSources });
            endStep("upperOntologies", upperOntologiesStart, {});

            const basePrompt = readFileSync(ontologyBuildingPromptPath, "utf8");
            const sourceConfig = userSources[source];
            const termNamespace = getTermNamespace(sourceConfig);
            const prompt =
                basePrompt +
                "\n\n# Inputs\n\nSource whose ontology is built: " +
                source +
                "\nGraph: " +
                sourceConfig.graphUri +
                "\nNamespace of its terms: " +
                termNamespace +
                "\n\n## Database\n\n" +
                databaseText +
                overlapsText +
                "\n# Upper ontologies, most abstract first\n" +
                ontologiesText;
            if (req.body.promptOnly) {
                return res.status(200).json({
                    prompt: prompt,
                    promptCharacters: prompt.length,
                    measuredOverlapCount: measuredOverlaps.length,
                    preparationSeconds: preparationSeconds,
                    linkCandidates: linkCandidates,
                    linkCandidatesError: linkCandidatesError,
                    linkCandidatesUsage: linkCandidatesUsage,
                });
            }

            const usage = { input_tokens: 0, output_tokens: 0 };
            let completion = null;
            let failure = null;
            const ontologyStart = Date.now();
            if (!req.body.answer) {
                sendProgress({ type: "stepStart", step: "ontology", model: ontologyModelId, reasoningEffort: ontologyReasoningEffort, promptCharacters: prompt.length });
                let writtenText = "";
                let reasoningText = "";
                let labelScanPosition = 0;
                let sentReasoningLength = 0;
                let lastWritingProgress = 0;
                const sendWritingProgress = function (isLastTick) {
                    if (!isLastTick && Date.now() - lastWritingProgress < writingProgressIntervalMs) {
                        return;
                    }
                    lastWritingProgress = Date.now();
                    const newLabels = [];
                    // a label cut in the middle is left for the next tick
                    const unscannedText = writtenText.slice(labelScanPosition);
                    let scannedLength = 0;
                    for (const labelMatch of unscannedText.matchAll(answerLabelRegex)) {
                        newLabels.push(labelMatch[1]);
                        scannedLength = labelMatch.index + labelMatch[0].length;
                    }
                    labelScanPosition += scannedLength;
                    // the page appends the reasoning, so each tick carries only what came since the last one
                    const newReasoning = reasoningText.slice(sentReasoningLength);
                    sentReasoningLength = reasoningText.length;
                    sendProgress({
                        type: "writing",
                        writtenCharacters: writtenText.length,
                        reasoningCharacters: reasoningText.length,
                        newReasoning: newReasoning,
                        newLabels: newLabels,
                    });
                };
                const ontologyMessage = {
                    messages: [{ role: "user", content: prompt }],
                    maxTokens: modelMaxOutputTokens,
                    model: ontologyModelId,
                    reasoningEffort: ontologyReasoningEffort,
                    onTextDelta: function (textDelta) {
                        writtenText += textDelta;
                        sendWritingProgress();
                    },
                    onReasoningDelta: function (reasoningDelta) {
                        reasoningText += reasoningDelta;
                        sendWritingProgress();
                    },
                };
                try {
                    completion = await createMessage(ontologyMessage, usage);
                } catch (llmError) {
                    console.warn("[ai/ontologyFromDb] " + llmError.message);
                    failure = llmError.message;
                }
                sendWritingProgress(true);
            }
            endStep("ontology", ontologyStart, { usage: usage, failure: failure });

            const answerText = req.body.answer || getAnswerText(completion);
            const answerMatch = answerText.match(jsonBlockRegex);
            let ontologyAnswer = null;
            let answerError = getCutAnswerError(completion, answerText);
            if (!answerError && !answerMatch && !failure) {
                answerError = "the answer holds no JSON block, see the answer saved with the run";
            }
            if (answerMatch) {
                try {
                    ontologyAnswer = JSON.parse(answerMatch[1]);
                } catch (parseError) {
                    answerError = "the JSON of the answer could not be read: " + parseError.message;
                }
            }
            const upperOntologyGraphUris = upperOntologies.map((upperOntology) => userSources[upperOntology].graphUri);
            const ontologyVersion = getNextOntologyVersion(await listSourceRuns(source));
            let answerOntology = null;
            // an answer of an unexpected shape must not stop the save of a paid generation
            try {
                answerOntology = ontologyAnswer ? getAnswerTurtle(ontologyAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris, ontologyVersion) : null;
            } catch (conversionError) {
                answerError = "answer not turned into Turtle: " + conversionError.message;
            }
            const turtle = answerOntology ? answerOntology.turtle : null;

            const runTimestamp = getNewRunTimestamp();
            const runGraphUri = getRunGraphUri(sourceConfig.graphUri, runTimestamp);
            let graphTripleCount = null;
            let graphError = null;
            if (turtle) {
                const graphStart = Date.now();
                sendProgress({ type: "stepStart", step: "graph", graphUri: runGraphUri });
                try {
                    graphTripleCount = await loadTurtleIntoGraph(turtle, runGraphUri);
                } catch (loadError) {
                    graphError = loadError.message;
                }
                endStep("graph", graphStart, { tripleCount: graphTripleCount, error: graphError });
            }
            // the hierarchy of the local classes is read in the run graph: no graph, no check
            let restrictionChecks = null;
            let restrictionCheckError = null;
            if (graphTripleCount) {
                const restrictionCheckStart = Date.now();
                sendProgress({ type: "stepStart", step: "restrictionCheck" });
                try {
                    restrictionChecks = await checkRunRestrictions(turtle, runGraphUri, source, upperOntologies, { user: userInfo, userSources: userSources });
                } catch (checkError) {
                    restrictionCheckError = checkError.message || String(checkError);
                }
                const notAllowedChecks = (restrictionChecks || []).filter((restrictionCheck) => restrictionCheck.status == "notAllowed");
                const uncheckedChecks = (restrictionChecks || []).filter((restrictionCheck) => restrictionCheck.status == "unchecked");
                endStep("restrictionCheck", restrictionCheckStart, {
                    checkedCount: restrictionChecks ? restrictionChecks.length : 0,
                    notAllowedCount: notAllowedChecks.length,
                    uncheckedCount: uncheckedChecks.length,
                    error: restrictionCheckError,
                });
            }
            const totalSeconds = Math.round((Date.now() - runStart) / 1000);

            // every run is kept, failed ones included, a paid generation is never lost
            const runName = getRunName(source, runTimestamp);
            const savedRun = {
                source: source,
                database: database.database,
                databaseId: databaseId,
                upperOntologies: upperOntologies,
                ontologyVersion: ontologyVersion,
                model: completion?.model ?? null,
                reasoningEffort: completion ? ontologyReasoningEffort : null,
                stopReason: completion?.stop_reason ?? null,
                failure: failure,
                usage: usage,
                totalSeconds: totalSeconds,
                stepSeconds: stepSeconds,
                graphUri: turtle ? runGraphUri : null,
                graphTripleCount: graphTripleCount,
                graphError: graphError,
                restrictionChecks: restrictionChecks,
                restrictionCheckError: restrictionCheckError,
                preparationSeconds: preparationSeconds,
                linkCandidatesModel: linkCandidatesModel,
                linkCandidatesUsage: linkCandidatesUsage,
                linkCandidates: linkCandidates,
                linkCandidatesError: linkCandidatesError,
                linkCandidatesAnswer: linkCandidatesAnswer,
                measuredOverlaps: measuredOverlaps,
                report: ontologyAnswer?.report ?? null,
                answerError: answerError,
                answerProblems: answerOntology?.problems ?? null,
                answer: answerText,
            };
            let saveError = null;
            try {
                await saveRun(databaseFolder, runName, savedRun, turtle);
            } catch (writeError) {
                console.warn("[ai/ontologyFromDb] answer not saved: " + writeError.message);
                saveError = writeError.message;
            }

            const savedAs = saveError ? null : "data/semanticVirtualDB/" + databaseFolder + "/" + runName;
            sendProgress({
                type: "result",
                runName: runName,
                failure: failure,
                model: completion?.model ?? null,
                answerError: answerError,
                answerProblems: answerOntology?.problems ?? null,
                stopReason: completion?.stop_reason ?? null,
                usage: usage,
                linkCandidatesUsage: linkCandidatesUsage,
                linkCandidatesError: linkCandidatesError,
                totalSeconds: totalSeconds,
                stepSeconds: stepSeconds,
                graphUri: savedRun.graphUri,
                graphTripleCount: graphTripleCount,
                graphError: graphError,
                restrictionChecks: restrictionChecks,
                restrictionCheckError: restrictionCheckError,
                savedAs: savedAs,
                saveError: saveError,
            });
            res.end();
        } catch (error) {
            console.error("ontologyFromDb route error:", error);
            if (!res.headersSent) {
                return res.status(error.status || 500).json({ error: error.message });
            }
            sendProgress({ type: "error", error: error.message });
            res.end();
        } finally {
            if (runningGeneration && runningGenerations[req.body.source] === runningGeneration) {
                delete runningGenerations[req.body.source];
            }
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Generate a domain ontology from a database and the upper ontologies of a source",
        description:
            "Builds the `bin/AI/prompts/ontology_building_from_db.md` prompt with the database schema (columns, nullability, primary and foreign keys, " +
            "sample rows, row count and per column distinct and null counts), the overlaps measured beforehand between the pairs of columns " +
            "a first LLM call (Claude Haiku 5.5) proposes from the database description alone (150 at most) and the enriched model of the upper ontologies (as GET /ontologyModels/enriched returns it), most abstract first, then calls Claude Opus 5.5 once, at medium reasoning effort, through OpenRouter. " +
            "The answer is one compact JSON object (classes, restrictions, datatype properties, individuals, groups, report) that the route turns into Turtle. " +
            "Each run is saved under `data/semanticVirtualDB/<database>/`, the Turtle in a `.ttl` file, the report, the problems met while writing the Turtle and the whole answer in a `.json` file. " +
            "The Turtle is then loaded into the run graph `<source graphUri>/virtual-db-creator/<run timestamp>/`. " +
            "Each restriction of the run graph is then checked with OntologyModels.getAllowedPropertiesBetweenNodes against the domains and ranges of the upper ontologies, inherited ones included: allowed, notAllowed, or unchecked when the property has no named domain nor range. " +
            "A generation answers in NDJSON, one event per line while it runs: stepStart and stepEnd (profiles, linkCandidates, pairs, upperOntologies, ontology, graph, restrictionCheck) with their seconds, " +
            "progress (tables profiled, pairs measured; the samples, profiles and overlaps of earlier runs on the database are read from its databaseChecks.json), writing (characters written, reasoning excerpt, labels completed) and a last result event with the total time, or an error event.",
        operationId: "postOntologyFromDb",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "databaseId"],
                    properties: {
                        source: { type: "string", description: "Source the ontology is built for." },
                        databaseId: { type: "string", description: "Database id from `databases.json`." },
                        upperOntologies: { type: "array", items: { type: "string" }, description: "Imports of the source, most abstract first." },
                        promptOnly: { type: "boolean", description: "Return the assembled prompt without calling the LLM." },
                        linkCandidatesPromptOnly: { type: "boolean", description: "Return the prompt of the link candidates step (database description only) without calling any LLM." },
                        linkCandidates: {
                            type: "object",
                            properties: {
                                pairs: { type: "array", items: { type: "object", properties: { left: { type: "string" }, right: { type: "string" } } } },
                                repeatingTables: { type: "array", items: { type: "array", items: { type: "string" } } },
                            },
                            description:
                                "Pairs of columns to measure, as the link candidates step returns them: { pairs: [{ left: table.column, right: table.column }], repeatingTables: [[table, table]] }. Skips that step.",
                        },
                        answer: { type: "string", description: "Answer of an earlier call to turn into Turtle and save again, without calling the LLM." },
                        refreshDatabaseChecks: {
                            type: "boolean",
                            description:
                                "Read the samples, profiles and overlaps from the database again instead of the ones the earlier runs saved in `data/semanticVirtualDB/<database>/databaseChecks.json`.",
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description:
                    "Prompt-only calls: the prompt as JSON. A generation: NDJSON progress events ending with a result event (run name, run graph, total time, usage, problems) or an error event.",
            },
            404: { description: "A source is unknown to the user." },
            409: { description: "A generation is already running for the source." },
        },
        tags: ["AI"],
    };

    return operations;
}
