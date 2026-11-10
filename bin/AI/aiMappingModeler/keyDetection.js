import { readFileSync } from "fs";
import { rename, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getSchemaDescription, getRepeatedValueRows } from "../../KG/dbConnector.js";
import { databaseModel } from "../../../model/databases.js";
import SocketManager from "../../socketManager.js";
import { nonNameCharacterRegex, readDatabaseChecks } from "../ontologyFromDb/ontology/ontologyRuns.js";
import { getMappingModelerPath, readMappingModelerFile } from "../ontologyFromDb/mappings/mappingRuns.js";
import { modelMaxOutputTokens, createMessage, getAnswerText, getCutAnswerError, jsonBlockRegex } from "../ontologyFromDb/ontology/ontologyAnswer.js";
import { describeDatabase, getSampleTexts } from "../ontologyFromDb/databaseDescription.js";
import { indexSchemaColumns, readTableSamples, getLinkCandidatesPrompt, measureLinkCandidates, saveTableInspections, getOverlapsText } from "../ontologyFromDb/databaseReading.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const keyDetectionPromptPath = join(currentDirectory, "prompts/key_detection_from_db.md");
const repeatJudgementPromptPath = join(currentDirectory, "prompts/key_repeat_judgement.md");
const tableGroupsPromptPath = join(currentDirectory, "prompts/table_groups.md");
// the groups the tree shows apart from the main list of tables, named as in table_groups.md
const tableGroupNames = ["definition", "computed"];
const aiForeignKeyPrefix = "found_in_the_data_";
// the detection reads the database to the end
const neverStopped = new AbortController().signal;
// per identifier whose values repeat, the values held by the most rows and the rows read for each
const repeatedValueLimit = 3;
const repeatedRowLimit = 5;
// OpenRouter id, fixed here as in the suggestions: the page does not choose the model; as good as Claude Opus 5.5 on the
// pazflor keys, for a third of its price
const keyDetectionModelId = "openai/gpt-6.1-sol";
const keyDetectionReasoningEffort = "medium";
// the socket channel of the steps, read by socketIoProxy.js
const keyDetectionChannel = "aiKeyDetection";

// per database, its detection, run once per server start: { isRunning, aiKeys, error, clientSocketIds, lastStepText }; the suggestions read its keys
const detectionsByDatabaseId = {};

// the keys the mapping of the source holds for the database, written in options.config.databaseSources[databaseId].aiKeys;
// null when the mapping was never saved or holds none
async function readSavedAiKeys(source, databaseId) {
    const mapping = await readMappingModelerFile(source);
    const databaseSource = mapping?.options?.config?.databaseSources?.[databaseId];
    const savedAiKeys = databaseSource?.aiKeys || null;
    return savedAiKeys;
}

// read again right before the write and written whole at once: a save of the page is never mixed with an older copy;
// a mapping never saved, or one whose config does not list the database yet, gets the keys from the page at its next save
async function writeMappingAiKeys(source, databaseId, aiKeys) {
    const mapping = await readMappingModelerFile(source);
    const databaseSource = mapping?.options?.config?.databaseSources?.[databaseId];
    if (!databaseSource) {
        return;
    }
    databaseSource.aiKeys = aiKeys;
    const mappingPath = getMappingModelerPath(source);
    const writtenPath = mappingPath + ".aiKeys";
    await writeFile(writtenPath, JSON.stringify(mapping, null, 2));
    await rename(writtenPath, mappingPath);
}

// the decisions of the answers, the first answer before the one completing it, entries that are not objects left out
function readKeyAnswers(answers) {
    const keyDecisions = { primaryKeys: [], tablesWithoutIdentifier: [], pairDecisions: [] };
    answers.forEach(function (answer) {
        Object.keys(keyDecisions).forEach(function (answerListName) {
            const answerList = Array.isArray(answer?.[answerListName]) ? answer[answerListName] : [];
            const decisionObjects = answerList.filter((decision) => decision && typeof decision == "object");
            keyDecisions[answerListName] = keyDecisions[answerListName].concat(decisionObjects);
        });
    });
    return keyDecisions;
}

// per table declaring no primary key, the first valid decision: one known identifier column, or a table without identifier
// with no column or the several columns identifying its rows together; { primaryKeys, tablesWithoutIdentifier, undecidedTables }
function readIdentifiers(keyDecisions, tablesToDecide, columnsByQualifiedName) {
    const primaryKeys = [];
    const tablesWithoutIdentifier = [];
    const decidedTables = [];
    const isValidDecision = function (answeredTable) {
        const columns = Array.isArray(answeredTable.columns) ? answeredTable.columns : [];
        const areKnownColumns = columns.every((column) => columnsByQualifiedName.has(answeredTable.table + "." + column));
        const isValid = tablesToDecide.includes(answeredTable.table) && !decidedTables.includes(answeredTable.table) && areKnownColumns;
        return isValid;
    };
    keyDecisions.primaryKeys.forEach(function (answeredTable) {
        if (!isValidDecision(answeredTable) || !Array.isArray(answeredTable.columns) || answeredTable.columns.length != 1) {
            return;
        }
        decidedTables.push(answeredTable.table);
        primaryKeys.push({ table: answeredTable.table, columns: answeredTable.columns, reason: String(answeredTable.reason || "") });
    });
    keyDecisions.tablesWithoutIdentifier.forEach(function (answeredTable) {
        const columns = Array.isArray(answeredTable.columns) ? answeredTable.columns : [];
        if (!isValidDecision(answeredTable) || columns.length == 1) {
            return;
        }
        decidedTables.push(answeredTable.table);
        tablesWithoutIdentifier.push({ table: answeredTable.table, columns: columns, reason: String(answeredTable.reason || "") });
    });
    const undecidedTables = tablesToDecide.filter((table) => !decidedTables.includes(table));
    return { primaryKeys, tablesWithoutIdentifier, undecidedTables };
}

function getUndecidedPairs(keyDecisions, pairsToDecide) {
    const validPairDecisions = keyDecisions.pairDecisions.filter((pairDecision) => typeof pairDecision.isForeignKey == "boolean");
    const decidedPairIds = validPairDecisions.map((pairDecision) => pairDecision.pair);
    const undecidedPairs = pairsToDecide.filter((pair) => !decidedPairIds.includes(pair.id));
    return undecidedPairs;
}

// the foreign keys of the first decision of each pair: not declared, one per column, referring to the identifier of its
// table; every pair not kept, undecided ones included, with the reason of the model or of the check, so that a missing
// foreign key can be explained; { foreignKeys, rejectedPairs }, both as { table, column, referencedTable, referencedColumn, reason }
function readForeignKeys(keyDecisions, pairsToDecide, aiPrimaryKeys, schema, columnsByQualifiedName, missingDecisionsError) {
    const declaredKeyColumns = schema.primaryKeys.map((keyColumn) => keyColumn.table_name + "." + keyColumn.column_name);
    const declaredForeignKeyColumns = schema.foreignKeys.map((keyColumn) => keyColumn.table_name + "." + keyColumn.column_name);
    const aiKeyColumns = aiPrimaryKeys.map((primaryKey) => primaryKey.table + "." + primaryKey.columns[0]);
    const foreignKeys = [];
    const rejectedPairs = [];
    pairsToDecide.forEach(function (pair) {
        const pairDecision = keyDecisions.pairDecisions.find((answeredPair) => answeredPair.pair == pair.id && typeof answeredPair.isForeignKey == "boolean");
        const modelReason = pairDecision ? String(pairDecision.reason || "") : "";
        // the left column of a measured pair is the one proposed as referring
        const isReferringColumnInPair = pairDecision && [pair.left, pair.right].includes(pairDecision.referringColumn);
        const columnName = isReferringColumnInPair ? pairDecision.referringColumn : pair.left;
        const referencedName = columnName == pair.left ? pair.right : pair.left;
        const referringColumn = columnsByQualifiedName.get(columnName);
        const referencedColumn = columnsByQualifiedName.get(referencedName);
        const candidateForeignKey = {
            table: referringColumn.table_name,
            column: referringColumn.column_name,
            referencedTable: referencedColumn.table_name,
            referencedColumn: referencedColumn.column_name,
        };
        let rejectionReason = null;
        if (!pairDecision) {
            rejectionReason = missingDecisionsError ? "the model did not decide it, asking again failed: " + missingDecisionsError : "the model did not decide it, even when asked again.";
        } else if (!pairDecision.isForeignKey) {
            rejectionReason = modelReason;
        } else if (!isReferringColumnInPair) {
            rejectionReason = "the referring column given, " + pairDecision.referringColumn + ", is none of the pair. " + modelReason;
        } else if (!declaredKeyColumns.includes(referencedName) && !aiKeyColumns.includes(referencedName)) {
            rejectionReason = referencedName + " is not the identifier of its table. " + modelReason;
        } else if (declaredForeignKeyColumns.includes(columnName) || foreignKeys.some((foreignKey) => foreignKey.table + "." + foreignKey.column == columnName)) {
            rejectionReason = columnName + " already has a foreign key. " + modelReason;
        }
        if (rejectionReason !== null) {
            rejectedPairs.push({ ...candidateForeignKey, reason: rejectionReason });
            return;
        }
        foreignKeys.push({ ...candidateForeignKey, reason: modelReason });
    });
    return { foreignKeys, rejectedPairs };
}

// { answer } or { error }: the JSON answer of the model the detection relies on
async function askKeyModel(prompt) {
    const messageParams = { messages: [{ role: "user", content: prompt }], model: keyDetectionModelId, maxTokens: modelMaxOutputTokens, reasoningEffort: keyDetectionReasoningEffort };
    let completion;
    try {
        completion = await createMessage(messageParams, { input_tokens: 0, output_tokens: 0 });
    } catch (callError) {
        return { error: "the model could not be called: " + callError.message };
    }
    const answerText = getAnswerText(completion);
    const cutAnswerError = getCutAnswerError(completion, answerText);
    if (cutAnswerError) {
        return { error: cutAnswerError };
    }
    const jsonBlockMatch = answerText.match(jsonBlockRegex);
    try {
        const answer = JSON.parse(jsonBlockMatch ? jsonBlockMatch[1] : answerText);
        return { answer: answer };
    } catch {
        return { error: "the model gave an unreadable answer" };
    }
}

// the rows sharing the most repeated values of each identifier: copies of one row keep it, rows that differ give a text for
// the judgement; [{ table, text }]
async function readRepeatedIdentifiers(connection, clientDriver, primaryKeys, columnsByTable, tableInspections, tellStep) {
    const repeatTexts = [];
    for (const [primaryKeyIndex, primaryKey] of primaryKeys.entries()) {
        tellStep("AI keys 3/5: checking the repeated values of the identifiers, table " + (primaryKeyIndex + 1) + "/" + primaryKeys.length);
        const identifierColumn = primaryKey.columns[0];
        const profile = tableInspections[primaryKey.table]?.profile;
        const columnProfile = profile?.columnsByName[identifierColumn];
        // the distinct values are counted on the filled rows only
        if (columnProfile && columnProfile.distinctCount == columnProfile.filledCount) {
            continue;
        }
        let repeatedValues;
        try {
            repeatedValues = await getRepeatedValueRows(connection, clientDriver, primaryKey.table, identifierColumn, repeatedValueLimit, repeatedRowLimit);
        } catch (readError) {
            primaryKey.reason += " Its repeated values could not be read: " + readError.message;
            continue;
        }
        let differingRowsText = "";
        repeatedValues.forEach(function (repeatedValue) {
            // a value cut in the sample texts may hide a difference, as a binary column does
            const rowTexts = getSampleTexts(repeatedValue.rows, columnsByTable[primaryKey.table]);
            const differentRowTexts = [...new Set(rowTexts)];
            if (differentRowTexts.length > 1) {
                differingRowsText += "Value " + JSON.stringify(repeatedValue.value) + ", held by " + repeatedValue.rowCount + " rows, of which these differ:\n" + differentRowTexts.join("\n") + "\n";
            }
        });
        if (repeatedValues.length > 0 && !differingRowsText) {
            primaryKey.reason += " The rows sharing its most repeated values are copies of one row.";
            continue;
        }
        if (differingRowsText) {
            const columnNames = columnsByTable[primaryKey.table].map((column) => column.column_name);
            const rowCountText = profile ? profile.rowCount + " rows, " + columnProfile.distinctCount + " distinct values" : "rows not counted";
            const tableText = "## Table " + primaryKey.table + ", identifier " + identifierColumn + ": " + rowCountText + "\nColumns: " + columnNames.join(" | ") + "\n" + differingRowsText;
            repeatTexts.push({ table: primaryKey.table, text: tableText });
        }
    }
    return repeatTexts;
}

// an identifier whose repeated values name different objects gives way to the column the judgement names instead, otherwise
// leaves its table without identifier; only the tables sent to the judgement are read in its answer
function applyRepeatJudgements(identifiers, answer, judgedTables, columnsByQualifiedName) {
    const judgements = Array.isArray(answer?.judgements) ? answer.judgements : [];
    const sentJudgements = judgements.filter((judgement) => judgement && judgedTables.includes(judgement.table));
    sentJudgements.forEach(function (judgement) {
        const primaryKey = identifiers.primaryKeys.find((aiPrimaryKey) => aiPrimaryKey.table == judgement.table);
        const judgementReason = String(judgement.reason || "");
        if (judgement.isSameObject !== false) {
            primaryKey.reason += " " + judgementReason;
            return;
        }
        const differentObjectsText = "Its column " + primaryKey.columns[0] + " names different objects: " + judgementReason;
        if (judgement.identifierColumn && judgement.identifierColumn != primaryKey.columns[0] && columnsByQualifiedName.has(primaryKey.table + "." + judgement.identifierColumn)) {
            primaryKey.columns = [judgement.identifierColumn];
            primaryKey.reason = differentObjectsText + " " + judgement.identifierColumn + " names them, its repeated values were not read.";
            return;
        }
        identifiers.tablesWithoutIdentifier.push({ table: primaryKey.table, columns: [], reason: differentObjectsText });
    });
    const tableNamesWithoutIdentifier = identifiers.tablesWithoutIdentifier.map((tableWithoutIdentifier) => tableWithoutIdentifier.table);
    identifiers.primaryKeys = identifiers.primaryKeys.filter((primaryKey) => !tableNamesWithoutIdentifier.includes(primaryKey.table));
}

// the schema with the keys the AI found beside the declared ones, and the AI keys kept: { schema, aiKeys }; keys found
// before the schema declared them are left out
function addAiKeysToSchema(schema, aiKeys) {
    const declaredKeyTables = schema.primaryKeys.map((keyColumn) => keyColumn.table_name);
    const declaredForeignKeyColumns = schema.foreignKeys.map((keyColumn) => keyColumn.table_name + "." + keyColumn.column_name);
    const undeclaredPrimaryKeys = aiKeys.primaryKeys.filter((primaryKey) => !declaredKeyTables.includes(primaryKey.table));
    const undeclaredForeignKeys = aiKeys.foreignKeys.filter((foreignKey) => !declaredForeignKeyColumns.includes(foreignKey.table + "." + foreignKey.column));
    const aiPrimaryKeys = [];
    undeclaredPrimaryKeys.forEach(function (primaryKey) {
        primaryKey.columns.forEach((columnName) => aiPrimaryKeys.push({ table_name: primaryKey.table, column_name: columnName }));
    });
    // describeDatabase groups the columns of a foreign key by its constraint name
    const aiForeignKeys = undeclaredForeignKeys.map((foreignKey) => ({
        constraint_name: aiForeignKeyPrefix + foreignKey.column,
        table_name: foreignKey.table,
        column_name: foreignKey.column,
        referenced_table: foreignKey.referencedTable,
        referenced_column: foreignKey.referencedColumn,
    }));
    const schemaWithAiKeys = {
        ...schema,
        primaryKeys: schema.primaryKeys.concat(aiPrimaryKeys),
        foreignKeys: schema.foreignKeys.concat(aiForeignKeys),
    };
    // keys detected before the tables without identifier were told apart hold none
    const aiTablesWithoutIdentifier = aiKeys.tablesWithoutIdentifier || [];
    const undeclaredTablesWithoutIdentifier = aiTablesWithoutIdentifier.filter((tableWithoutIdentifier) => !declaredKeyTables.includes(tableWithoutIdentifier.table));
    const keptAiKeys = { primaryKeys: undeclaredPrimaryKeys, tablesWithoutIdentifier: undeclaredTablesWithoutIdentifier, foreignKeys: undeclaredForeignKeys };
    const schemaAndAiKeys = { schema: schemaWithAiKeys, aiKeys: keptAiKeys };
    return schemaAndAiKeys;
}

// the definition and computed tables the model names, [{ table, group, reason }], one per known table; null when the model
// failed: the keys are kept without groups, asked again at the next server start
async function suggestTableGroups(database, schema, columnsByTable, tableInspections, aiKeys, tellStep) {
    const { schema: schemaWithAiKeys, aiKeys: keptAiKeys } = addAiKeysToSchema(schema, aiKeys);
    const referencingTablesByTable = {};
    schemaWithAiKeys.foreignKeys.forEach(function (keyColumn) {
        if (keyColumn.table_name == keyColumn.referenced_table) {
            return;
        }
        if (!referencingTablesByTable[keyColumn.referenced_table]) {
            referencingTablesByTable[keyColumn.referenced_table] = new Set();
        }
        referencingTablesByTable[keyColumn.referenced_table].add(keyColumn.table_name);
    });
    const referencingLines = Object.entries(referencingTablesByTable).map(([table, referencingTables]) => table + ": " + [...referencingTables].join(", "));
    const withoutIdentifierLines = keptAiKeys.tablesWithoutIdentifier.map((tableWithoutIdentifier) => tableWithoutIdentifier.table + ": " + tableWithoutIdentifier.reason);
    const tableGroupsPrompt =
        readFileSync(tableGroupsPromptPath, "utf8") +
        "\n\n# Database\n\n" +
        describeDatabase(database, schemaWithAiKeys, columnsByTable, tableInspections) +
        "\n## Tables pointing at each table\n\n" +
        (referencingLines.length > 0 ? referencingLines.join("\n") : "none") +
        "\n\n## Tables where no column identifies the object\n\n" +
        (withoutIdentifierLines.length > 0 ? withoutIdentifierLines.join("\n") : "none") +
        "\n";
    tellStep("AI keys 4/5: the model groups the " + Object.keys(columnsByTable).length + " tables, about a minute");
    const groupsAnswer = await askKeyModel(tableGroupsPrompt);
    if (groupsAnswer.error) {
        console.warn("[aiMappingModeler/keyDetection] " + database.database + ": tables not grouped by the AI: " + groupsAnswer.error);
        return null;
    }
    const answeredGroups = Array.isArray(groupsAnswer.answer?.tableGroups) ? groupsAnswer.answer.tableGroups : [];
    const tableGroups = [];
    answeredGroups.forEach(function (answeredGroup) {
        const isValidGroup = answeredGroup && Object.hasOwn(columnsByTable, answeredGroup.table) && tableGroupNames.includes(answeredGroup.group);
        const isGroupedAlready = tableGroups.some((tableGroup) => tableGroup.table == answeredGroup?.table);
        if (!isValidGroup || isGroupedAlready) {
            return;
        }
        tableGroups.push({ table: answeredGroup.table, group: answeredGroup.group, reason: String(answeredGroup.reason || "") });
    });
    return tableGroups;
}

// the database, its schema and the samples of its tables, those of earlier runs read from the saved database checks
async function readDatabaseSamples(databaseId, userInfo, tellStep) {
    const database = await databaseModel.getDatabase(databaseId);
    const connection = await databaseModel.getUserConnection(userInfo.user, databaseId);
    const schema = await getSchemaDescription(connection, database.driver);
    const clientDriver = databaseModel.getClientDriver(database.driver);
    const databaseFolder = database.database.replace(nonNameCharacterRegex, "_");
    const databaseChecks = await readDatabaseChecks(databaseFolder);
    const { columnsByTable, columnsByQualifiedName } = indexSchemaColumns(schema);
    tellStep("AI keys 1/5: reading the samples of " + Object.keys(columnsByTable).length + " tables");
    const tableInspections = await readTableSamples(connection, clientDriver, columnsByTable, databaseChecks, false, neverStopped);
    const databaseSamples = { database, connection, schema, clientDriver, databaseFolder, databaseChecks, columnsByTable, columnsByQualifiedName, tableInspections };
    return databaseSamples;
}

// the groups of the tables for keys found before the groups existed
async function suggestSavedKeysTableGroups(databaseId, userInfo, aiKeys, tellStep) {
    const { database, schema, columnsByTable, tableInspections } = await readDatabaseSamples(databaseId, userInfo, tellStep);
    const tableGroups = await suggestTableGroups(database, schema, columnsByTable, tableInspections, aiKeys, tellStep);
    return tableGroups;
}

// { aiKeys } or { error }: the readings of the ontology generation, profiles, link candidates and overlaps, kept in the same
// databaseChecks.json, then a model reasoning on them, without any ontology: the identifiers first, checked on the rows,
// then the foreign keys referring to them; tellStep(text) tells each step to the pages waiting for the keys
async function detectDatabaseKeys(databaseId, userInfo, tellStep) {
    const { database, connection, schema, clientDriver, databaseFolder, databaseChecks, columnsByTable, columnsByQualifiedName, tableInspections } = await readDatabaseSamples(
        databaseId,
        userInfo,
        tellStep,
    );
    const tableCount = Object.keys(columnsByTable).length;
    // the profiles, the links the model proposes and the measures of the pairs run at once
    const readingProgress = { profiledTableCount: 0, measuredPairCount: 0, proposedPairCount: 0, isModelProposingLinks: false };
    const tellReading = function () {
        const modelText = readingProgress.isModelProposingLinks ? ", the model proposes links" : "";
        const tablesText = readingProgress.profiledTableCount + "/" + tableCount + " tables profiled";
        const pairsText = readingProgress.measuredPairCount + "/" + readingProgress.proposedPairCount + " pairs measured";
        const readingText = "AI keys 1/5: reading the database, " + tablesText + ", " + pairsText + modelText;
        tellStep(readingText);
    };
    const tellReadingProgress = function (progressEvent) {
        if (progressEvent.type == "stepStart" && progressEvent.step != "linkCandidates") {
            return;
        }
        if (progressEvent.step == "linkCandidates") {
            readingProgress.isModelProposingLinks = true;
        } else if (progressEvent.step == "profiles") {
            readingProgress.profiledTableCount = progressEvent.done;
        } else if (progressEvent.step == "pairs" && progressEvent.type == "progress") {
            readingProgress.measuredPairCount = progressEvent.done;
            readingProgress.proposedPairCount = progressEvent.total;
        }
        tellReading();
    };
    const endReadingStep = function (step) {
        if (step == "linkCandidates") {
            readingProgress.isModelProposingLinks = false;
            tellReading();
        }
    };
    const measuredLinks = await measureLinkCandidates({
        connection: connection,
        clientDriver: clientDriver,
        columnsByTable: columnsByTable,
        columnsByQualifiedName: columnsByQualifiedName,
        tableInspections: tableInspections,
        databaseChecks: databaseChecks,
        isSchemaFile: false,
        stopSignal: neverStopped,
        sendProgress: tellReadingProgress,
        endStep: endReadingStep,
        preparationStart: Date.now(),
        linkCandidatesPrompt: getLinkCandidatesPrompt(database, schema, columnsByTable, tableInspections),
        givenLinkCandidates: null,
    });
    try {
        await saveTableInspections(databaseFolder, databaseChecks, tableInspections);
    } catch (writeError) {
        console.warn("[aiMappingModeler/keyDetection] database checks not saved: " + writeError.message);
    }
    const sharingOverlaps = measuredLinks.measuredOverlaps.filter((overlap) => overlap.sharedDistinctValues > 0);
    const pairsToDecide = sharingOverlaps.map((overlap, pairIndex) => ({ id: "P" + (pairIndex + 1), left: overlap.left, right: overlap.right }));
    const keyPrompt =
        readFileSync(keyDetectionPromptPath, "utf8") +
        "\n\n# Database\n\n" +
        describeDatabase(database, schema, columnsByTable, tableInspections) +
        getOverlapsText(measuredLinks, false, pairsToDecide);
    const declaredKeyTables = schema.primaryKeys.map((keyColumn) => keyColumn.table_name);
    const allTables = Object.keys(columnsByTable);
    const tablesToDecide = allTables.filter((table) => !declaredKeyTables.includes(table));
    tellStep("AI keys 2/5: the model decides the identifiers of " + tablesToDecide.length + " tables and " + pairsToDecide.length + " pairs, about a minute");
    const keyAnswer = await askKeyModel(keyPrompt);
    if (keyAnswer.error) {
        return { error: keyAnswer.error };
    }
    let keyDecisions = readKeyAnswers([keyAnswer.answer]);
    const firstUndecidedTables = readIdentifiers(keyDecisions, tablesToDecide, columnsByQualifiedName).undecidedTables;
    const firstUndecidedPairs = getUndecidedPairs(keyDecisions, pairsToDecide);
    // what the first answer left out or decided wrongly is asked once more, with that answer given back
    let missingDecisionsError = null;
    if (firstUndecidedTables.length > 0 || firstUndecidedPairs.length > 0) {
        const undecidedPairLines = firstUndecidedPairs.map((pair) => pair.id + " " + pair.left + " = " + pair.right);
        const missingDecisionsPrompt =
            keyPrompt +
            "\n# Decisions your first answer left out\n\nYour first answer: " +
            JSON.stringify(keyAnswer.answer) +
            "\nIt left out, or decided against the rules, the tables and the pairs below. Answer the same JSON with the decisions for these only, every one of them.\nTables: " +
            (firstUndecidedTables.length > 0 ? firstUndecidedTables.join(", ") : "none") +
            "\nPairs:\n" +
            (undecidedPairLines.length > 0 ? undecidedPairLines.join("\n") : "none") +
            "\n";
        tellStep("AI keys 2/5: asking the model again for " + firstUndecidedTables.length + " tables and " + firstUndecidedPairs.length + " pairs left out");
        const missingAnswer = await askKeyModel(missingDecisionsPrompt);
        missingDecisionsError = missingAnswer.error || null;
        keyDecisions = readKeyAnswers([keyAnswer.answer, missingAnswer.answer]);
    }
    const identifiers = readIdentifiers(keyDecisions, tablesToDecide, columnsByQualifiedName);
    const repeatTexts = await readRepeatedIdentifiers(connection, clientDriver, identifiers.primaryKeys, columnsByTable, tableInspections, tellStep);
    if (repeatTexts.length > 0) {
        const repeatTableTexts = repeatTexts.map((repeatText) => repeatText.text);
        const judgementPrompt = readFileSync(repeatJudgementPromptPath, "utf8") + "\n\n# Tables\n\n" + repeatTableTexts.join("\n");
        tellStep("AI keys 3/5: the model judges the repeated values of " + repeatTexts.length + " identifiers");
        const judgementAnswer = await askKeyModel(judgementPrompt);
        if (judgementAnswer.error) {
            const judgementError = "repeated identifiers not judged: " + judgementAnswer.error;
            return { error: judgementError };
        }
        const judgedTables = repeatTexts.map((repeatText) => repeatText.table);
        applyRepeatJudgements(identifiers, judgementAnswer.answer, judgedTables, columnsByQualifiedName);
    }
    const { foreignKeys, rejectedPairs } = readForeignKeys(keyDecisions, pairsToDecide, identifiers.primaryKeys, schema, columnsByQualifiedName, missingDecisionsError);
    const aiKeys = {
        primaryKeys: identifiers.primaryKeys,
        tablesWithoutIdentifier: identifiers.tablesWithoutIdentifier,
        undecidedTables: identifiers.undecidedTables,
        foreignKeys: foreignKeys,
        rejectedPairs: rejectedPairs,
        model: keyDetectionModelId,
        detectedAt: new Date().toISOString(),
    };
    const tableGroups = await suggestTableGroups(database, schema, columnsByTable, tableInspections, aiKeys, tellStep);
    if (tableGroups) {
        aiKeys.tableGroups = tableGroups;
    }
    return { aiKeys: aiKeys };
}

// { aiKeys } or { error }: the keys a mapping already holds, grouped if they were found before the groups existed,
// otherwise a detection whose keys go in the mapping
async function findDatabaseKeys(source, databaseId, userInfo, tellStep, detection) {
    const savedAiKeys = await readSavedAiKeys(source, databaseId);
    if (savedAiKeys && savedAiKeys.tableGroups) {
        return { aiKeys: savedAiKeys };
    }
    if (savedAiKeys) {
        // the suggestions read the saved keys while the tables are grouped
        detection.aiKeys = savedAiKeys;
        let tableGroups = null;
        try {
            tableGroups = await suggestSavedKeysTableGroups(databaseId, userInfo, savedAiKeys, tellStep);
        } catch (groupsError) {
            console.warn("[aiMappingModeler/keyDetection] " + databaseId + ": tables not grouped by the AI: " + groupsError.message);
        }
        if (!tableGroups) {
            tellStep("Tables not grouped by the AI");
            return { aiKeys: savedAiKeys };
        }
        const groupedAiKeys = { ...savedAiKeys, tableGroups: tableGroups };
        tellStep("AI keys 5/5: saving in the mapping");
        await writeMappingAiKeys(source, databaseId, groupedAiKeys);
        tellStep("Tables grouped by the AI: " + tableGroups.length + " definition or computed tables");
        return { aiKeys: groupedAiKeys };
    }
    const detected = await detectDatabaseKeys(databaseId, userInfo, tellStep);
    if (!detected.aiKeys) {
        return detected;
    }
    tellStep("AI keys 5/5: saving in the mapping");
    await writeMappingAiKeys(source, databaseId, detected.aiKeys);
    const { primaryKeys, tablesWithoutIdentifier, foreignKeys, tableGroups } = detected.aiKeys;
    const tableGroupsText = tableGroups ? tableGroups.length + " definition or computed tables" : "tables not grouped";
    tellStep("AI keys found: " + primaryKeys.length + " PK, " + tablesWithoutIdentifier.length + " tables without identifier, " + foreignKeys.length + " FK, " + tableGroupsText);
    return detected;
}

// once per database and server start, whether a page still waits for the keys or not; a failed detection is not run again
// before the server restarts, its error is told to the pages
function startKeyDetection(source, databaseId, userInfo) {
    if (detectionsByDatabaseId[databaseId]) {
        return;
    }
    // registered before the first await: a page opening meanwhile joins this detection instead of paying for another one
    const detection = { isRunning: true, aiKeys: null, error: null, clientSocketIds: new Set(), lastStepText: null };
    detectionsByDatabaseId[databaseId] = detection;
    const tellStep = function (stepText) {
        detection.lastStepText = stepText;
        detection.clientSocketIds.forEach((clientSocketId) => SocketManager.message(clientSocketId, keyDetectionChannel, { databaseId: databaseId, message: stepText }));
    };
    findDatabaseKeys(source, databaseId, userInfo, tellStep, detection)
        .then(function (foundKeys) {
            detection.aiKeys = foundKeys.aiKeys || null;
            detection.error = foundKeys.error || null;
        })
        .catch(function (detectionError) {
            detection.error = detectionError.message;
        })
        .finally(function () {
            detection.isRunning = false;
            if (detection.error) {
                console.warn("[aiMappingModeler/keyDetection] " + databaseId + ": " + detection.error);
            }
        });
}

// a page joining during a long step, as the call deciding the keys, gets that step at once
function followKeyDetection(databaseId, clientSocketId) {
    const detection = detectionsByDatabaseId[databaseId];
    if (!detection || !detection.isRunning || !clientSocketId || detection.clientSocketIds.has(clientSocketId)) {
        return;
    }
    detection.clientSocketIds.add(clientSocketId);
    if (detection.lastStepText) {
        SocketManager.message(clientSocketId, keyDetectionChannel, { databaseId: databaseId, message: detection.lastStepText });
    }
}

// { status: "done" | "running" | "failed" | "none", aiKeys, error }; keys missing from the mapping of the source, dropped by a
// save of a page that had not got them yet or never written for this source, are written in it
async function getKeyDetection(source, databaseId) {
    let savedAiKeys = null;
    try {
        savedAiKeys = await readSavedAiKeys(source, databaseId);
    } catch (readError) {
        const mappingReadError = "the mapping of " + source + " could not be read: " + readError.message;
        return { status: "failed", aiKeys: null, error: mappingReadError };
    }
    if (savedAiKeys && savedAiKeys.tableGroups) {
        return { status: "done", aiKeys: savedAiKeys };
    }
    const detection = detectionsByDatabaseId[databaseId];
    // saved keys without groups: the groups were never asked, or are asked now, or failed
    const savedKeysDetection = { status: "done", aiKeys: savedAiKeys };
    if (!detection) {
        const notStartedDetection = savedAiKeys ? savedKeysDetection : { status: "none", aiKeys: null };
        return notStartedDetection;
    }
    if (detection.isRunning) {
        return { status: "running", aiKeys: savedAiKeys };
    }
    if (detection.error) {
        const failedDetection = savedAiKeys ? savedKeysDetection : { status: "failed", aiKeys: null, error: detection.error };
        return failedDetection;
    }
    // the same keys without groups are not written again at each reading
    if (!savedAiKeys || detection.aiKeys.tableGroups) {
        await writeMappingAiKeys(source, databaseId, detection.aiKeys);
    }
    return { status: "done", aiKeys: detection.aiKeys };
}

// null before the detection of the database ends
function getKnownAiKeys(databaseId) {
    const detection = detectionsByDatabaseId[databaseId];
    const knownAiKeys = detection ? detection.aiKeys : null;
    return knownAiKeys;
}

export { startKeyDetection, followKeyDetection, getKeyDetection, getKnownAiKeys, addAiKeysToSchema };
