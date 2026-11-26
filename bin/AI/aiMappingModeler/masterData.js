import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { databaseModel } from "../../../model/databases.js";
import { askKeyModel, readJsonAnswer, describeKeyedDatabase, keyDetectionModelId, getKeyDetection, writeMappingAiKeys, readDatabaseSchema, addAiKeysToSchema } from "./keyDetection.js";
import { getTermIri } from "../ontologyFromDb/mappings/mappingAnswer.js";
import { readClassAnswer } from "./columnClassSuggestion.js";
import { runAgentLoop } from "../ontologyFromDb/revision/revisionAgent.js";
import { getPreparedSource, getNotPreparedError } from "./sourcePreparation.js";
import { changeGuessMapping, mappingChangeNames } from "./mappingGuess.js";
import { getDecidedClassLabel, getEntriesGuessedFrom, describeClassAnchors, readAllowedLinkProperties, isLinkOptionAllowed, computeLinks } from "./linksGuess.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const masterDataGuessPromptPath = join(currentDirectory, "prompts/master_data_guess.md");
const importantClassesGuessPromptPath = join(currentDirectory, "prompts/important_classes_guess.md");
const masterDataReadingsPromptPath = join(currentDirectory, "prompts/master_data_readings.md");
const masterDataClassificationPromptPath = join(currentDirectory, "prompts/master_data_classification.md");
const columnClassPromptPath = join(currentDirectory, "prompts/column_class_suggestion.md");
// the rules of a new local class are written once, in section 3 of the column prompt, taken here without their number
const newClassSectionRegex = /^3\. (Otherwise declare a new local class[\s\S]*?)^4\. Answer/m;
const answerHeadingRegex = /^Answer\r?$/m;
const masterDataClassKinds = ["existingClass", "newClass"];
const entryChangeNames = ["add_reading", "undo_decision", "remove_entry", "split_entry"];
// an evidence query is one statement reading the data, whatever the model writes
const readingStatementStartRegex = /^\s*(select|with)\b/i;
const statementSeparatorRegex = /;/;
// models often end a statement with one
const trailingSemicolonRegex = /;\s*$/;
const maxReadings = 3;
const evidenceRowLimit = 20;
// the rows a reading shows as its example: a few, read by a person at a glance
const exampleRowLimit = 3;
// the queries the model runs to test the readings of one class, more cost time, fewer leave a reading untested
const maxReadingQueries = 6;

const runSqlTool = {
    name: "run_sql",
    description: "Run one read-only SELECT on the database the user opened. At most 20 rows come back, the user sees them as a table under the answer.",
    input_schema: {
        type: "object",
        properties: {
            purpose: { type: "string", description: "What the rows show, in one short sentence, written above the table." },
            sql: { type: "string", description: "One SELECT or WITH statement, table names without schema prefix." },
        },
        required: ["purpose", "sql"],
    },
};
const evidenceQueryTimeoutMs = 10000;
const evidenceValueMaxLength = 60;
// the knex client of the databases the evidence queries run on, as databaseModel.getClientDriver names it
const evidenceClientDriver = "pg";

function findByLabel(labelledEntries, label) {
    const lowerCaseLabel = String(label).toLowerCase();
    const labelledEntry = labelledEntries.find((entry) => entry && String(entry.label).toLowerCase() == lowerCaseLabel);
    return labelledEntry;
}

function readText(value) {
    const text = typeof value == "string" ? value.trim() : "";
    return text;
}

// { columns, rows } of at most evidenceRowLimit rows, values as text, or { error }: the query of the model runs in a read-only
// transaction, on the public schema the tables are read in, and is stopped after evidenceQueryTimeoutMs
async function runEvidenceQuery(connection, clientDriver, writtenSql) {
    if (clientDriver != evidenceClientDriver) {
        return { error: "evidence queries run on Postgres databases only" };
    }
    const sql = writtenSql.replace(trailingSemicolonRegex, "");
    if (!readingStatementStartRegex.test(sql) || statementSeparatorRegex.test(sql)) {
        return { error: "the query is not one SELECT" };
    }
    let queryResult;
    try {
        queryResult = await connection.transaction(async function (transaction) {
            await transaction.raw("set transaction read only");
            await transaction.raw("set local statement_timeout = " + evidenceQueryTimeoutMs);
            await transaction.raw("set local search_path to public");
            // on lines of their own: a comment ending the query of the model cannot swallow the limit
            // rows as arrays: two columns of the same name, as a.name and b.name, keep both values
            const limitedResult = await transaction.raw("select * from (\n" + sql + "\n) as evidence limit " + evidenceRowLimit).options({ rowMode: "array" });
            return limitedResult;
        });
    } catch (queryError) {
        return { error: queryError.message };
    }
    const columns = queryResult.fields.map((field) => field.name);
    const rows = queryResult.rows.map((resultRow) => resultRow.map((value) => String(value ?? "").slice(0, evidenceValueMaxLength)));
    return { columns, rows };
}

function getEvidenceText(evidence) {
    const headerLine = evidence.columns.join(" | ");
    const rowLines = evidence.rows.map((row) => row.join(" | "));
    const evidenceText = "Purpose: " + evidence.purpose + "\nQuery: " + evidence.sql + "\nResult:\n" + headerLine + "\n" + rowLines.join("\n");
    return evidenceText;
}

// the one reading of a master data whose data leave nothing open: its class keeps its label and definition
function getDefaultReading(masterDataEntry) {
    const defaultReading = { label: "", rowIs: "", inData: "", askBusiness: "", definition: masterDataEntry.definition, classKey: masterDataEntry.label };
    return defaultReading;
}

// a guess saved before the readings shared the class of their entry gives each reading its own class
function hasClassPerReading(readings) {
    const classKeys = readings.map((reading) => reading.classKey);
    const isClassPerReading = new Set(classKeys).size > 1;
    return isClassPerReading;
}

// at most maxReadings readings of one answered entry, null when none holds a definition; the readings share the class of
// the entry: the superclass chosen settles what a row denotes
function readReadings(answeredEntry, masterDataEntry) {
    const answeredReadings = Array.isArray(answeredEntry?.readings) ? answeredEntry.readings : [];
    const definedReadings = answeredReadings.filter((answeredReading) => answeredReading && readText(answeredReading.label) && readText(answeredReading.definition));
    const keptReadings = definedReadings.slice(0, maxReadings);
    if (keptReadings.length == 0) {
        return null;
    }
    const readings = keptReadings.map(function (answeredReading) {
        const readingLabel = readText(answeredReading.label);
        return {
            label: readingLabel,
            rowIs: readText(answeredReading.rowIs),
            inData: readText(answeredReading.inData),
            exampleQueryNumber: Number(answeredReading.exampleQuery) || null,
            askBusiness: readText(answeredReading.askBusiness),
            definition: readText(answeredReading.definition),
            classKey: masterDataEntry.label,
        };
    });
    return readings;
}

// the readings of what a row denotes, each class tested by the model with queries of its own before it answers, all the
// classes at once; an entry without data read, or that the model leaves without a reading, keeps one reading
async function layOutReadings(guessEntries, domain, connection, clientDriver, tellStep) {
    const evidencedEntries = guessEntries.filter((guessEntry) => guessEntry.evidence && !guessEntry.evidence.error);
    tellStep("the model tests what a row denotes for " + evidencedEntries.length + " classes with queries of its own, a few minutes");
    const answeredEntries = await Promise.all(evidencedEntries.map((guessEntry) => testEntryReadings(guessEntry, domain, connection, clientDriver)));
    evidencedEntries.forEach(function (guessEntry, entryIndex) {
        const testedEntry = answeredEntries[entryIndex];
        guessEntry.readings = readReadings(testedEntry.answer, guessEntry);
        // the example of a reading: rows of a query the model ran and saw, never a query written blind
        (guessEntry.readings || []).forEach(function (reading) {
            const exampleQuery = testedEntry.queries[reading.exampleQueryNumber - 1];
            if (exampleQuery && exampleQuery.rows.length > 0) {
                reading.example = { purpose: exampleQuery.purpose, columns: exampleQuery.columns, rows: exampleQuery.rows.slice(0, exampleRowLimit) };
            }
            delete reading.exampleQueryNumber;
        });
    });
    guessEntries.forEach(function (guessEntry) {
        if (!guessEntry.readings) {
            guessEntry.readings = [getDefaultReading(guessEntry)];
        }
    });
}

// { answer, queries } of one class: the model runs at most maxReadingQueries queries, numbered from 1, then answers its
// readings; an answer the model could not give is null
async function testEntryReadings(guessEntry, domain, connection, clientDriver) {
    const readingLabels = (guessEntry.readings || []).map((reading) => reading.label);
    // an entry read again keeps the labels of its readings, which the decisions of the user name
    const keptReadingsText = readingLabels.some(Boolean) ? "\n\nReadings to keep: " + readingLabels.join("; ") : "";
    const system =
        readFileSync(masterDataReadingsPromptPath, "utf8").split("{maxReadingQueries}").join(String(maxReadingQueries)) +
        "\n\n# Domain\n\n" +
        domain +
        "\n\n# Class\n\n## " +
        guessEntry.label +
        "\n" +
        guessEntry.definition +
        "\nTables: " +
        (guessEntry.tables || []).join(", ") +
        "\n" +
        getEvidenceText(guessEntry.evidence) +
        keptReadingsText +
        "\n";
    const queries = [];
    const runSql = async function (toolInput) {
        if (queries.length >= maxReadingQueries) {
            return { error: "no query left: answer now" };
        }
        const queryResult = await runEvidenceQuery(connection, clientDriver, String(toolInput.sql || ""));
        if (queryResult.error) {
            return queryResult;
        }
        queries.push({ purpose: readText(toolInput.purpose), columns: queryResult.columns, rows: queryResult.rows });
        const numberedResult = { queryNumber: queries.length, columns: queryResult.columns, rows: queryResult.rows };
        return numberedResult;
    };
    let answerText = null;
    try {
        answerText = await runAgentLoop({
            system: system,
            conversation: [{ role: "user", content: "Test the readings of " + guessEntry.label + " in the data, then answer." }],
            tools: [runSqlTool],
            toolFunctionsByName: { run_sql: runSql },
            getToolOutcome: () => null,
            usage: { input_tokens: 0, output_tokens: 0 },
            sendProgress: () => null,
            isRequestClosed: () => false,
            model: keyDetectionModelId,
        });
    } catch (loopError) {
        console.warn("[aiMappingModeler/masterData] readings of " + guessEntry.label + " not tested by the AI: " + loopError.message);
    }
    const readAnswer = answerText ? readJsonAnswer(answerText) : { error: "no answer" };
    if (readAnswer.error) {
        console.warn("[aiMappingModeler/masterData] readings of " + guessEntry.label + " not read: " + readAnswer.error);
    }
    const testedEntry = { answer: readAnswer.answer || null, queries: queries };
    return testedEntry;
}

// the upper ontology defining a class, the first checked ontology holding it; null for a class none of them holds
function getClassSource(classIri, preparedSource) {
    const classSource = preparedSource.checkedOntologies.find((ontology) => preparedSource.ontologyModels[ontology]?.classes?.[classIri]);
    return classSource || null;
}

// { classification } or { error }, read as the column suggestions read a class: { classKind: "existingClass", classId,
// classLabel, classSource } or { classKind: "newClass", classLabel, parentOptions: [{ parentId, parentLabel, parentSource,
// definition, probability, impact }] }; a class the answer itself declares is read as a class of the source
function readClassClassification(answeredEntry, preparedSource, declaredClasses, source) {
    if (!masterDataClassKinds.includes(answeredEntry.classKind)) {
        return { error: "unknown classKind " + JSON.stringify(answeredEntry.classKind) };
    }
    const classAnswer = readClassAnswer(
        { columnKind: answeredEntry.classKind, class: answeredEntry.class, label: answeredEntry.newLabel, parents: answeredEntry.parents },
        preparedSource,
        [],
        declaredClasses,
    );
    if (classAnswer.error) {
        return { error: classAnswer.error };
    }
    const suggestion = classAnswer.suggestion;
    // a new class labelled as an imported one is read as that imported class
    if (suggestion.columnKind == "existingClass") {
        const existingClassification = {
            classKind: "existingClass",
            classId: suggestion.classId,
            classLabel: suggestion.label,
            classSource: getClassSource(suggestion.classId, preparedSource) || source,
        };
        return { classification: existingClassification };
    }
    const parentOptions = suggestion.parentOptions.map((parentOption) => ({ ...parentOption, parentSource: getClassSource(parentOption.parentId, preparedSource) || source }));
    const newClassification = { classKind: "newClass", classLabel: suggestion.label, parentOptions: parentOptions };
    const split = readSplit(answeredEntry.split, preparedSource, source, declaredClasses);
    if (split) {
        newClassification.split = split;
    }
    return { classification: newClassification };
}

// { newLabel, definition, reason, parentOption } of the second class the answer proposes over the same rows, when two
// readings hold at once under disjoint superclasses; null when none is proposed or its superclass is not written
function readSplit(answeredSplit, preparedSource, source, declaredClasses) {
    const newLabel = readText(answeredSplit?.newLabel);
    if (!newLabel) {
        return null;
    }
    const certainProbability = 100;
    const splitParentAnswer = { class: answeredSplit.class, definition: answeredSplit.definition, probability: certainProbability, impact: answeredSplit.impact };
    const splitClassification = readClassClassification({ classKind: "newClass", newLabel: newLabel, parents: [splitParentAnswer] }, preparedSource, declaredClasses, source);
    if (splitClassification.error || splitClassification.classification.classKind != "newClass") {
        return null;
    }
    const splitParent = splitClassification.classification.parentOptions[0];
    const split = { newLabel: newLabel, definition: readText(answeredSplit.definition), reason: readText(answeredSplit.reason), parentOption: splitParent };
    return split;
}

// { classificationByLabel, refusalByLabel } of the labels still to classify, read in one answer of the model
function readClassClassifications(labelsToClassify, answer, preparedSource, source, declaredClasses) {
    const answeredEntries = Array.isArray(answer?.classes) ? answer.classes : [];
    const classificationByLabel = {};
    const refusalByLabel = {};
    labelsToClassify.forEach(function (label) {
        const answeredEntry = findByLabel(answeredEntries, label);
        if (!answeredEntry) {
            refusalByLabel[label] = "no classification given";
            return;
        }
        const readClassification = readClassClassification(answeredEntry, preparedSource, declaredClasses, source);
        if (readClassification.error) {
            refusalByLabel[label] = readClassification.error;
            return;
        }
        classificationByLabel[label] = readClassification.classification;
    });
    return { classificationByLabel, refusalByLabel };
}

// the new local classes one answer declares: another entry may take one as its superclass
function getDeclaredClasses(answer) {
    const answeredEntries = Array.isArray(answer?.classes) ? answer.classes : [];
    const declaredClasses = [];
    answeredEntries.forEach(function (answeredEntry) {
        const newLabel = readText(answeredEntry?.newLabel);
        if (answeredEntry?.classKind != "newClass" || !newLabel || findByLabel(declaredClasses, newLabel)) {
            return;
        }
        declaredClasses.push({ id: newLabel, label: newLabel });
    });
    return declaredClasses;
}

// { classificationByLabel } of the class of each reading of the entries under the upper ontologies of the source, keyed by
// classKey, or { error }; decidedClasses [{ label, definition }] are local classes a class may take as superclass; a label
// the model could not classify after a second turn gets { classKind: "unclassified", reason }
async function classifyClasses(source, domain, guessEntries, decidedClasses, preparedSource, tellStep) {
    const newClassRulesMatch = readFileSync(columnClassPromptPath, "utf8").match(newClassSectionRegex);
    if (!newClassRulesMatch) {
        return { error: "the rules of a new local class are missing from column_class_suggestion.md" };
    }
    const classificationPromptText = readFileSync(masterDataClassificationPromptPath, "utf8").replace("{newClassRules}", newClassRulesMatch[1]);
    // the answer section is moved after the ontologies and the classes, which would stand between it and the question
    const answerSectionStart = classificationPromptText.search(answerHeadingRegex);
    if (answerSectionStart == -1) {
        return { error: "the Answer section is missing from master_data_classification.md" };
    }
    const classesToClassify = guessEntries.map(function (guessEntry) {
        const readingTexts = guessEntry.readings.map(function (reading) {
            const rowText = reading.rowIs ? " a row is " + reading.rowIs : "";
            const dataText = reading.inData ? " In the data: " + reading.inData : "";
            const readingText = "\n  - reading " + reading.label + ":" + rowText + dataText;
            return readingText;
        });
        const readingsText = guessEntry.readings.length > 1 ? readingTexts.join("") : "";
        return { label: guessEntry.readings[0].classKey, definition: guessEntry.definition + readingsText };
    });
    const classLines = classesToClassify.map((classToClassify) => "- " + classToClassify.label + ": " + classToClassify.definition);
    const decidedClassLines = decidedClasses.map((decidedClass) => "- " + decidedClass.label + ": " + decidedClass.definition);
    const decidedClassesText = decidedClassLines.length > 0 ? "\n\n# Classes already decided\n\n" + decidedClassLines.join("\n") : "";
    const classificationPrompt =
        classificationPromptText.slice(0, answerSectionStart) +
        "\n# Upper ontologies, most specific first\n" +
        preparedSource.specificFirstClassesText +
        "\n\n# Domain\n\n" +
        domain +
        "\n\n# Classes\n\n" +
        classLines.join("\n") +
        decidedClassesText +
        "\n\n" +
        classificationPromptText.slice(answerSectionStart);
    tellStep("the model classifies " + classesToClassify.length + " classes under the upper ontologies, about a minute");
    const classificationAnswer = await askKeyModel(classificationPrompt);
    if (classificationAnswer.error) {
        return { error: classificationAnswer.error };
    }
    const allLabels = classesToClassify.map((classToClassify) => classToClassify.label);
    const decidedLocalClasses = decidedClasses.map((decidedClass) => ({ id: decidedClass.label, label: decidedClass.label }));
    const declaredClasses = decidedLocalClasses.concat(getDeclaredClasses(classificationAnswer.answer));
    const firstReading = readClassClassifications(allLabels, classificationAnswer.answer, preparedSource, source, declaredClasses);
    const refusedLabels = Object.keys(firstReading.refusalByLabel);
    let correctedReading = { classificationByLabel: {}, refusalByLabel: firstReading.refusalByLabel };
    if (refusedLabels.length > 0) {
        const refusalTexts = refusedLabels.map((label) => label + ": " + firstReading.refusalByLabel[label]);
        const correctionPrompt =
            classificationPrompt +
            "\n# Your first answer\n\n" +
            JSON.stringify(classificationAnswer.answer) +
            "\nThese entries were refused: " +
            refusalTexts.join("; ") +
            ". Answer the same JSON for these classes only, each class written exactly as the upper ontologies write it.\n";
        tellStep("asking the model again for " + refusedLabels.length + " classes not classified");
        const correctionAnswer = await askKeyModel(correctionPrompt);
        if (!correctionAnswer.error) {
            const correctionDeclaredClasses = declaredClasses.concat(getDeclaredClasses(correctionAnswer.answer));
            correctedReading = readClassClassifications(refusedLabels, correctionAnswer.answer, preparedSource, source, correctionDeclaredClasses);
        }
    }
    const classificationByLabel = { ...firstReading.classificationByLabel, ...correctedReading.classificationByLabel };
    const lastRefusals = Object.entries(correctedReading.refusalByLabel);
    lastRefusals.forEach(([label, refusal]) => (classificationByLabel[label] = { classKind: "unclassified", reason: refusal }));
    return { classificationByLabel };
}

// the schema with its AI keys, then the tables a first reading set apart, as the guess prompts read them
function describeGuessedDatabase(database, schema, columnsByTable, aiKeys) {
    // describeDatabase reads an inspection per table, an empty one gives neither profile nor sample rows
    const schemaOnlyInspections = {};
    Object.keys(columnsByTable).forEach((tableName) => (schemaOnlyInspections[tableName] = {}));
    const tableGroupLines = aiKeys.tableGroups.map((tableGroup) => tableGroup.table + ": " + tableGroup.group + ", " + tableGroup.reason);
    const databaseText =
        describeKeyedDatabase(database, schema, columnsByTable, schemaOnlyInspections, aiKeys) +
        "\n## Definition and computed tables\n\n" +
        (tableGroupLines.length > 0 ? tableGroupLines.join("\n") : "none") +
        "\n";
    return databaseText;
}

// the entries the model answered, one per label, with the data of their evidence query read
// the tables of an entry are those the model named that exist, exactly as the description names them
async function readGuessedEntries(answeredEntries, connection, clientDriver, columnsByTable, tellStep) {
    const guessEntries = [];
    for (const answeredEntry of answeredEntries) {
        if (!answeredEntry || !readText(answeredEntry.label) || findByLabel(guessEntries, answeredEntry.label)) {
            continue;
        }
        const answeredTables = Array.isArray(answeredEntry.tables) ? answeredEntry.tables : [];
        const trimmedTables = answeredTables.map(readText);
        const tables = trimmedTables.filter((tableName) => Object.hasOwn(columnsByTable, tableName));
        const guessEntry = { label: readText(answeredEntry.label), definition: readText(answeredEntry.definition), reason: readText(answeredEntry.reason), tables: tables };
        // an important class names the master data it is about
        if (answeredEntry.aboutMasterData) {
            guessEntry.aboutMasterData = readText(answeredEntry.aboutMasterData);
        }
        const evidenceSql = readText(answeredEntry.evidenceQuery?.sql);
        if (evidenceSql) {
            tellStep("reading the data showing what a row of " + guessEntry.label + " denotes");
            const evidenceResult = await runEvidenceQuery(connection, clientDriver, evidenceSql);
            guessEntry.evidence = { purpose: readText(answeredEntry.evidenceQuery.purpose), sql: evidenceSql, ...evidenceResult };
        }
        guessEntries.push(guessEntry);
    }
    return guessEntries;
}

// { domain, masterData: [{ label, definition, reason, evidence, readings, classification }], classificationByClass, model,
// guessedAt }: the master data guessed from the schema and the AI keys, the data read by their evidence queries, the
// readings of what a row denotes laid out from those data, then the class of each reading classified under the upper
// ontologies, keyed by classKey; classification is the one of the first reading, drawn by the graph. null when the
// ontologies are not prepared or a model failed, asked again at the next server start
async function guessMasterData(source, database, connection, schema, columnsByTable, aiKeys, tellStep) {
    // checked first: the guess alone would be thrown away
    const preparedSource = await getPreparedSource(source);
    if (!preparedSource) {
        console.warn("[aiMappingModeler/masterData] " + database.database + ": master data not guessed: " + getNotPreparedError(source));
        return null;
    }
    const tellGuessStep = (stepText) => tellStep("AI keys 5/6: " + stepText);
    const masterDataPrompt = readFileSync(masterDataGuessPromptPath, "utf8") + "\n\n# Database\n\n" + describeGuessedDatabase(database, schema, columnsByTable, aiKeys);
    tellGuessStep("the model guesses the master data of the domain, about a minute");
    const masterDataAnswer = await askKeyModel(masterDataPrompt);
    if (masterDataAnswer.error) {
        console.warn("[aiMappingModeler/masterData] " + database.database + ": master data not guessed by the AI: " + masterDataAnswer.error);
        return null;
    }
    const answer = masterDataAnswer.answer || {};
    const answeredMasterData = Array.isArray(answer.masterData) ? answer.masterData : [];
    const masterData = await readGuessedEntries(answeredMasterData, connection, databaseModel.getClientDriver(database.driver), columnsByTable, tellGuessStep);
    const masterDataGuess = { domain: readText(answer.domain), masterData: masterData, model: keyDetectionModelId, guessedAt: new Date().toISOString() };
    if (masterData.length == 0) {
        return masterDataGuess;
    }
    await layOutReadings(masterData, masterDataGuess.domain, connection, databaseModel.getClientDriver(database.driver), tellGuessStep);
    const classified = await classifyClasses(source, masterDataGuess.domain, masterData, [], preparedSource, tellGuessStep);
    if (classified.error) {
        console.warn("[aiMappingModeler/masterData] " + database.database + ": master data not classified by the AI: " + classified.error);
        return null;
    }
    masterDataGuess.classificationByClass = classified.classificationByLabel;
    masterData.forEach((masterDataEntry) => (masterDataEntry.classification = classified.classificationByLabel[masterDataEntry.readings[0].classKey]));
    return masterDataGuess;
}

// the entries of a guess: the master data of step 1, the important classes of step 2, the event, process and association classes of step 3
function getGuessEntries(guess) {
    const guessEntries = guess.masterData || guess.importantClasses || guess.eventClasses;
    return guessEntries;
}

// the text of what an entry may still be: each reading with its class and every superclass option, the next steps keep
// them all as alternatives
function describeUndecidedEntry(guess, masterDataEntry) {
    const readings = masterDataEntry.readings || [getDefaultReading(masterDataEntry)];
    const readingClassKeys = readings.map((reading) => reading.classKey);
    const classKeys = [...new Set(readingClassKeys)];
    const classTexts = classKeys.map(function (classKey) {
        const classification = guess.classificationByClass?.[classKey] || masterDataEntry.classification || { classKind: "unclassified" };
        let classText = "not classified";
        if (classification.classKind == "existingClass") {
            classText = "the upper class " + classification.classLabel;
        } else if (classification.classKind == "newClass") {
            const optionTexts = classification.parentOptions.map((parentOption) => parentOption.parentLabel + " " + parentOption.probability + "%");
            classText = "class " + classification.classLabel + (optionTexts.length > 0 ? ", subClassOf one of " + optionTexts.join(", ") : "");
        }
        // the rows each class reads: all of them when the readings share the class
        const classReadings = readings.filter((reading) => reading.classKey == classKey && reading.rowIs);
        const rowTexts = classReadings.map((reading) => reading.rowIs);
        const rowsText = rowTexts.length > 0 ? " (a row is " + rowTexts.join(" Or ") + ")" : "";
        return classText + rowsText;
    });
    const undecidedLine = "- " + masterDataEntry.label + ": not decided yet, " + classTexts.join("; or ") + ". " + (masterDataEntry.definition || readings[0].definition || "");
    return undecidedLine;
}

// { decidedLines, decidedClasses, changeLogLines } of the entries of a guess: one line per entry, an undecided one with
// its alternatives, and the local classes a class may take as superclass
function describeDecidedMasterData(guess) {
    const decidedLines = [];
    const decidedClasses = [];
    getGuessEntries(guess).forEach(function (masterDataEntry) {
        // left open by the user: the links settle its superclass
        if (!masterDataEntry.decision || masterDataEntry.decision.isLeftToLinks) {
            decidedLines.push(describeUndecidedEntry(guess, masterDataEntry));
            return;
        }
        const readings = masterDataEntry.readings || [getDefaultReading(masterDataEntry)];
        const reading = readings[masterDataEntry.decision.readingIndex];
        const classification = guess.classificationByClass?.[reading.classKey] || masterDataEntry.classification || { classKind: "unclassified" };
        // the meaning of the class: the reading picked on an older guess, else the definition under the superclass chosen
        const isClassPerReading = hasClassPerReading(readings);
        let definition = isClassPerReading ? reading.definition : masterDataEntry.definition || reading.definition;
        // a decided entry while unclassified has no class yet
        let classText = "not classified";
        if (classification.classKind == "existingClass") {
            classText = "the upper class " + classification.classLabel;
        } else if (classification.classKind == "newClass") {
            const chosenParent = findParentOption(classification.parentOptions, masterDataEntry.decision.superClassId);
            classText = "class " + classification.classLabel + (chosenParent ? ", subClassOf " + chosenParent.parentLabel : "");
            if (chosenParent && !isClassPerReading) {
                definition = chosenParent.definition;
            }
            decidedClasses.push({ label: classification.classLabel, definition: definition });
        }
        const rowText = isClassPerReading && reading.rowIs ? " A row is " + reading.rowIs : "";
        decidedLines.push("- " + masterDataEntry.label + ": " + classText + ". " + definition + rowText);
    });
    (guess.localClasses || []).forEach(function (localClass) {
        decidedClasses.push({ label: localClass.label, definition: localClass.definition });
        decidedLines.push("- local class " + localClass.label + ", subClassOf " + localClass.superClassLabel + ". " + localClass.definition);
    });
    // why the user took each decision, as the change log keeps it: the request, the rationale and the data read
    const changeLogLines = (guess.changeLog || []).map(function (logLine) {
        const requestText = logLine.userRequest ? " The user asked: " + JSON.stringify(logLine.userRequest) + "." : "";
        const rationaleText = logLine.rationale ? " " + logLine.rationale : "";
        const queryTexts = logLine.queries.map(getEvidenceText);
        const queriesText = queryTexts.length > 0 ? "\n" + queryTexts.join("\n") : "";
        const changeLogLine = "- " + logLine.summary + "." + requestText + rationaleText + queriesText;
        return changeLogLine;
    });
    return { decidedLines, decidedClasses, changeLogLines };
}

// the step function of one phase of a guess of steps 2 and 3, out of its phases: the model answer, the data read, the
// readings, the classes; the page draws its progress bar from "phase/phases"
const guessPhaseCount = 4;
function getGuessPhaseStep(tellStep, phaseNumber, phaseCount = guessPhaseCount) {
    const tellPhaseStep = (stepText) => tellStep(phaseNumber + "/" + phaseCount + " " + stepText);
    return tellPhaseStep;
}

// { importantClassesGuess } or { error }: step 2 of the workflow, run once every master data is decided; the important
// classes around the decided master data, guessed from the schema, read and classified as the master data are, written in
// the mapping with the decisions it was built from
async function guessImportantClasses(source, databaseId, userInfo, tellStep) {
    const aiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    const masterDataGuess = aiKeys?.masterDataGuess;
    if (!masterDataGuess) {
        return { error: "the master data of this database are not guessed" };
    }
    const decidedMasterData = describeDecidedMasterData(masterDataGuess);
    const preparedSource = await getPreparedSource(source);
    if (!preparedSource) {
        return { error: getNotPreparedError(source) };
    }
    const { database, connection, schema, columnsByTable } = await readDatabaseSchema(databaseId, userInfo);
    const importantClassesPrompt =
        readFileSync(importantClassesGuessPromptPath, "utf8") +
        "\n\n# Domain\n\n" +
        masterDataGuess.domain +
        "\n\n# Master data\n\n" +
        decidedMasterData.decidedLines.join("\n") +
        "\n\n# Why the user decided them\n\n" +
        (decidedMasterData.changeLogLines.length > 0 ? decidedMasterData.changeLogLines.join("\n") : "decided on the cards, no discussion") +
        "\n\n# Database\n\n" +
        describeGuessedDatabase(database, schema, columnsByTable, aiKeys);
    getGuessPhaseStep(tellStep, 1)("the model guesses the important classes around the master data, about a minute");
    const importantClassesAnswer = await askKeyModel(importantClassesPrompt);
    if (importantClassesAnswer.error) {
        return { error: importantClassesAnswer.error };
    }
    const answeredClasses = Array.isArray(importantClassesAnswer.answer?.importantClasses) ? importantClassesAnswer.answer.importantClasses : [];
    const importantClasses = await readGuessedEntries(answeredClasses, connection, databaseModel.getClientDriver(database.driver), columnsByTable, getGuessPhaseStep(tellStep, 2));
    const decisionsByMasterData = {};
    masterDataGuess.masterData.forEach((masterDataEntry) => (decisionsByMasterData[masterDataEntry.label] = masterDataEntry.decision));
    const importantClassesGuess = {
        importantClasses: importantClasses,
        classificationByClass: {},
        decisionsByMasterData: decisionsByMasterData,
        model: keyDetectionModelId,
        guessedAt: new Date().toISOString(),
    };
    if (importantClasses.length > 0) {
        await layOutReadings(importantClasses, masterDataGuess.domain, connection, databaseModel.getClientDriver(database.driver), getGuessPhaseStep(tellStep, 3));
        const classified = await classifyClasses(source, masterDataGuess.domain, importantClasses, decidedMasterData.decidedClasses, preparedSource, getGuessPhaseStep(tellStep, 4));
        if (classified.error) {
            return { error: classified.error };
        }
        importantClassesGuess.classificationByClass = classified.classificationByLabel;
    }
    // read again: decisions taken while the model worked are kept
    const savedAiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    const guessBefore = savedAiKeys.importantClassesGuess;
    savedAiKeys.importantClassesGuess = importantClassesGuess;
    const nextGuesses = guessBefore ? carryStepGuessedAgain(savedAiKeys, "importantClassesGuess", guessBefore, schema) : {};
    await writeMappingAiKeys(source, databaseId, savedAiKeys);
    return { importantClassesGuess, nextGuesses };
}

// { guessEntry, readingIndex, classification } of the reading the chat names, or { error } naming what the guess holds;
// a guess saved before the readings gets its single reading here, keyed by the master data label
function findGuessReading(guess, entryLabel, readingLabel) {
    const guessEntries = getGuessEntries(guess);
    const guessEntry = findByLabel(guessEntries, entryLabel);
    if (!guessEntry) {
        const entryLabels = guessEntries.map((otherEntry) => otherEntry.label);
        return { error: "no entry " + JSON.stringify(entryLabel) + " in the guess, it holds: " + entryLabels.join(", ") };
    }
    if (!guessEntry.readings) {
        guessEntry.readings = [getDefaultReading(guessEntry)];
    }
    if (!guess.classificationByClass) {
        guess.classificationByClass = {};
    }
    if (guessEntry.classification && !guess.classificationByClass[guessEntry.label]) {
        guess.classificationByClass[guessEntry.label] = guessEntry.classification;
    }
    const readingLabels = guessEntry.readings.map((reading) => reading.label);
    let readingIndex = 0;
    if (readingLabel) {
        readingIndex = readingLabels.findIndex((label) => label.toLowerCase() == String(readingLabel).toLowerCase());
    } else if (hasClassPerReading(guessEntry.readings)) {
        readingIndex = -1;
    }
    if (readingIndex < 0) {
        return { guessEntry, error: "name one reading of " + guessEntry.label + ": " + readingLabels.join(", ") };
    }
    const classKey = guessEntry.readings[readingIndex].classKey;
    const classification = guess.classificationByClass[classKey] || { classKind: "unclassified", reason: "not classified" };
    return { guessEntry, readingIndex, classification };
}

// { parentOption } of a class of the upper ontologies, or of a local class added by the chat, or { error }: a superclass
// the chat proposes must exist in one of them; a local class is identified by its label, as the classification identifies
// the classes it declares
function getParentOption(preparedSource, guess, source, optionInput) {
    const superClass = readText(optionInput.superClassIri);
    const localClass = findByLabel(guess.localClasses || [], superClass);
    const parentSource = localClass ? source : getClassSource(superClass, preparedSource);
    if (!parentSource) {
        return { error: JSON.stringify(superClass) + " is neither a class of the upper ontologies nor a local class added with add_local_class, search the upper ontologies for its IRI" };
    }
    const parentLabel = localClass ? localClass.label : preparedSource.ontologyModels[parentSource].classes[superClass].label;
    const parentOption = {
        parentId: localClass ? localClass.label : superClass,
        parentLabel: parentLabel,
        parentSource: parentSource,
        definition: readText(optionInput.definition),
        probability: Number(optionInput.probability) || 0,
        impact: readText(optionInput.impact),
    };
    return { parentOption };
}

// { summary } or { error }: a local class of the ontology the user needs between an upper class and the entries, as a
// client above the reseller and the individual customer; its own superclass is an upper class or another local class
function addLocalClass(preparedSource, guess, source, changeInput) {
    const label = readText(changeInput.newLabel);
    if (!label) {
        return { error: "a local class needs a label" };
    }
    if (findByLabel(guess.localClasses || [], label)) {
        return { error: label + " is already a local class" };
    }
    const parent = getParentOption(preparedSource, guess, source, changeInput);
    if (parent.error) {
        return { error: parent.error };
    }
    if (!guess.localClasses) {
        guess.localClasses = [];
    }
    const { parentId, parentLabel, parentSource } = parent.parentOption;
    guess.localClasses.push({ label: label, definition: readText(changeInput.definition), superClassId: parentId, superClassLabel: parentLabel, superClassSource: parentSource });
    const summary = "local class " + label + " added, subClassOf " + parentLabel;
    return { summary, entryLabel: label };
}

function findParentOption(parentOptions, superClass) {
    const lowerCaseSuperClass = String(superClass).toLowerCase();
    const parentOption = parentOptions.find((option) => option.parentId == superClass || String(option.parentLabel).toLowerCase() == lowerCaseSuperClass);
    return parentOption;
}

// { summary, entryLabel } of a change of one entry of the guess, or { error }: a decision taken or undone, a superclass
// option or a reading added or removed, a class renamed, redefined or replaced by an upper class, the entry removed
function changeGuessEntry(preparedSource, guess, source, changeName, changeInput) {
    // these changes act on the whole entry, they name none of its readings
    const isEntryChange = entryChangeNames.includes(changeName);
    const found = findGuessReading(guess, changeInput.entry, isEntryChange ? null : changeInput.reading);
    if (!found.guessEntry) {
        return { error: found.error };
    }
    // the error of an entry with several readings, when the change names none
    if (found.error && !isEntryChange) {
        return { error: found.error };
    }
    const { guessEntry, readingIndex, classification } = found;
    const parentOptions = classification && classification.classKind == "newClass" ? classification.parentOptions : [];
    let summary = null;
    if (changeName == "apply_decision" && changeInput.isLeftToLinks) {
        guessEntry.decision = { readingIndex: readingIndex, superClassId: null, isLeftToLinks: true };
        summary = guessEntry.label + " left open until the relations";
    } else if (changeName == "apply_decision") {
        const chosenParent = changeInput.superClass ? findParentOption(parentOptions, changeInput.superClass) : null;
        if (classification.classKind == "newClass" && !chosenParent) {
            const parentLabels = parentOptions.map((parentOption) => parentOption.parentLabel);
            return {
                error: "name one superclass option of " + guessEntry.label + ": " + parentLabels.join(", ") + "; another class of the upper ontologies, or a local class, is added first with add_superclass_option",
            };
        }
        guessEntry.decision = { readingIndex: readingIndex, superClassId: chosenParent ? chosenParent.parentId : null };
        summary = guessEntry.label + " decided" + (chosenParent ? ": subClassOf " + chosenParent.parentLabel : "");
    } else if (changeName == "add_superclass_option") {
        if (classification.classKind != "newClass") {
            return { error: "the class of " + guessEntry.label + " is " + classification.classKind + ", it takes no superclass option" };
        }
        const optionParent = getParentOption(preparedSource, guess, source, changeInput);
        if (optionParent.error) {
            return { error: optionParent.error };
        }
        if (findParentOption(parentOptions, optionParent.parentOption.parentId)) {
            return { error: optionParent.parentOption.parentLabel + " is already an option" };
        }
        parentOptions.push(optionParent.parentOption);
        summary = optionParent.parentOption.parentLabel + " added as a superclass option of " + guessEntry.label;
    } else if (changeName == "remove_superclass_option") {
        const removedParent = findParentOption(parentOptions, changeInput.superClass);
        if (!removedParent) {
            return { error: "no superclass option " + JSON.stringify(changeInput.superClass) + " for " + guessEntry.label };
        }
        parentOptions.splice(parentOptions.indexOf(removedParent), 1);
        // a decision on the removed superclass is undone
        if (guessEntry.decision?.superClassId == removedParent.parentId) {
            delete guessEntry.decision;
        }
        summary = removedParent.parentLabel + " removed from the superclass options of " + guessEntry.label;
    } else if (changeName == "add_reading") {
        const readingLabel = readText(changeInput.newLabel);
        if (!readingLabel || findByLabel(guessEntry.readings, readingLabel)) {
            return { error: "a new reading needs a label of its own" };
        }
        const newParentOptions = [];
        for (const optionInput of changeInput.superClassOptions || []) {
            const optionParent = getParentOption(preparedSource, guess, source, optionInput);
            if (optionParent.error) {
                return { error: optionParent.error };
            }
            newParentOptions.push(optionParent.parentOption);
        }
        const isClassPerReading = hasClassPerReading(guessEntry.readings);
        const classKey = isClassPerReading ? guessEntry.label + ", read as " + readingLabel.toLowerCase() : guessEntry.readings[0].classKey;
        guessEntry.readings.push({
            label: readingLabel,
            rowIs: readText(changeInput.rowIs),
            inData: readText(changeInput.inData),
            askBusiness: readText(changeInput.askBusiness),
            definition: readText(changeInput.definition),
            classKey: classKey,
        });
        if (isClassPerReading || classification.classKind != "newClass") {
            guess.classificationByClass[classKey] = { classKind: "newClass", classLabel: guessEntry.label, parentOptions: newParentOptions };
        } else {
            // the reading brings its superclasses to the class it shares
            const addedParentOptions = newParentOptions.filter((newParentOption) => !findParentOption(parentOptions, newParentOption.parentId));
            parentOptions.push(...addedParentOptions);
        }
        summary = "reading " + readingLabel + " added to " + guessEntry.label;
    } else if (changeName == "update_class") {
        const reading = guessEntry.readings[readingIndex];
        const newLabel = readText(changeInput.newLabel);
        const definition = readText(changeInput.definition);
        const existingClassIri = readText(changeInput.existingClassIri);
        if (!newLabel && !definition && !existingClassIri) {
            return { error: "give a new label, a definition or an existing class" };
        }
        if (newLabel && existingClassIri) {
            return { error: "an existing class keeps its own label, give a new label or an existing class" };
        }
        let changedClassification = classification;
        // the class and the superclass options proposed before the user replaced them, given back by undo_decision
        if ((existingClassIri || classification.classKind != "newClass") && !reading.replacedClassification) {
            reading.replacedClassification = classification;
        }
        if (existingClassIri) {
            const classSource = getClassSource(existingClassIri, preparedSource);
            if (!classSource) {
                return { error: JSON.stringify(existingClassIri) + " is no class of the upper ontologies, search them for its IRI" };
            }
            const classLabel = preparedSource.ontologyModels[classSource].classes[existingClassIri].label;
            changedClassification = { classKind: "existingClass", classId: existingClassIri, classLabel: classLabel, classSource: classSource };
        } else if (newLabel && classification.classKind == "newClass") {
            changedClassification.classLabel = newLabel;
        } else if (newLabel) {
            // an imported or unclassified class becomes a local class, its superclass options still to add
            changedClassification = { classKind: "newClass", classLabel: newLabel, parentOptions: [] };
        }
        guess.classificationByClass[reading.classKey] = changedClassification;
        // a superclass decided before no longer belongs to the class
        if (changedClassification.classKind != "newClass" && guessEntry.decision?.readingIndex == readingIndex) {
            guessEntry.decision.superClassId = null;
        }
        if (definition) {
            reading.definition = definition;
        }
        const changedTexts = [];
        if (newLabel) {
            changedTexts.push("renamed " + newLabel);
        }
        if (existingClassIri) {
            changedTexts.push("is now " + changedClassification.classLabel);
        }
        if (definition) {
            changedTexts.push("definition changed");
        }
        summary = "class of " + guessEntry.label + ": " + changedTexts.join(", ");
    } else if (changeName == "undo_decision" && guessEntry.splitFrom) {
        // a class born of a split goes back into the proposal of the class it came from
        const splitClassKey = guessEntry.readings[0].classKey;
        const splitParentOption = guess.classificationByClass[splitClassKey]?.parentOptions?.[0];
        const originEntry = findByLabel(getGuessEntries(guess), guessEntry.splitFrom);
        const originClassification = originEntry ? guess.classificationByClass[originEntry.readings[0].classKey] : null;
        if (originClassification && originClassification.classKind == "newClass" && splitParentOption) {
            // a split made before the option was kept gives back the proposal only
            if (guessEntry.movedParentOption && !findParentOption(originClassification.parentOptions, guessEntry.movedParentOption.parentId)) {
                originClassification.parentOptions.push(guessEntry.movedParentOption);
            }
            originClassification.split = { newLabel: guessEntry.label, definition: guessEntry.definition, reason: guessEntry.reason, parentOption: splitParentOption };
        }
        const guessEntries = getGuessEntries(guess);
        guessEntries.splice(guessEntries.indexOf(guessEntry), 1);
        delete guess.classificationByClass[splitClassKey];
        summary = "split of " + guessEntry.splitFrom + " undone: " + guessEntry.label + " removed";
    } else if (changeName == "undo_decision") {
        const replacedReadings = guessEntry.readings.filter((reading) => reading.replacedClassification);
        if (!guessEntry.decision && replacedReadings.length == 0) {
            return { error: guessEntry.label + " is not decided" };
        }
        delete guessEntry.decision;
        replacedReadings.forEach(function (reading) {
            guess.classificationByClass[reading.classKey] = reading.replacedClassification;
            delete reading.replacedClassification;
        });
        summary = "decision on " + guessEntry.label + " undone, back to the classes proposed";
    } else if (changeName == "remove_reading") {
        if (guessEntry.readings.length == 1) {
            return { error: guessEntry.label + " has a single reading, remove the entry itself" };
        }
        const [removedReading] = guessEntry.readings.splice(readingIndex, 1);
        // the readings share the class of the entry
        if (!guessEntry.readings.some((reading) => reading.classKey == removedReading.classKey)) {
            delete guess.classificationByClass[removedReading.classKey];
        }
        // the decision points to its reading by index
        const decidedReadingIndex = guessEntry.decision?.readingIndex;
        if (decidedReadingIndex == readingIndex) {
            delete guessEntry.decision;
        } else if (decidedReadingIndex > readingIndex) {
            guessEntry.decision.readingIndex = decidedReadingIndex - 1;
        }
        summary = "reading " + removedReading.label + " removed from " + guessEntry.label;
    } else if (changeName == "remove_entry") {
        const guessEntries = getGuessEntries(guess);
        guessEntries.splice(guessEntries.indexOf(guessEntry), 1);
        guessEntry.readings.forEach((reading) => delete guess.classificationByClass[reading.classKey]);
        summary = guessEntry.label + " removed from the guess";
    } else if (changeName == "split_entry") {
        const split = classification?.split;
        if (!split) {
            return { error: "no second class is proposed for " + guessEntry.label };
        }
        if (guessEntry.decision) {
            return { error: guessEntry.label + " is decided, undo the decision before splitting it" };
        }
        if (findByLabel(getGuessEntries(guess), split.newLabel)) {
            return { error: split.newLabel + " is already an entry" };
        }
        // the second class reads the same rows, decided under the superclass proposed for it
        const splitEntry = {
            label: split.newLabel,
            definition: split.definition,
            reason: split.reason,
            evidence: guessEntry.evidence,
            splitFrom: guessEntry.label,
            readings: [getDefaultReading({ label: split.newLabel, definition: split.definition })],
            decision: { readingIndex: 0, superClassId: split.parentOption.parentId },
        };
        guess.classificationByClass[split.newLabel] = { classKind: "newClass", classLabel: split.newLabel, parentOptions: [split.parentOption] };
        const guessEntries = getGuessEntries(guess);
        guessEntries.splice(guessEntries.indexOf(guessEntry) + 1, 0, splitEntry);
        // the superclass now taken by the second class leaves the options of the first, which keeps at least one
        const movedParent = findParentOption(parentOptions, split.parentOption.parentId);
        if (movedParent && parentOptions.length > 1) {
            parentOptions.splice(parentOptions.indexOf(movedParent), 1);
            // given back to the first class when the split is undone
            splitEntry.movedParentOption = movedParent;
        }
        delete classification.split;
        summary = guessEntry.label + " split: " + split.newLabel + " added over the same rows, subClassOf " + split.parentOption.parentLabel;
    } else {
        return { error: "unknown change " + changeName };
    }
    return { summary, entryLabel: guessEntry.label };
}

// the links changes of the chat on the guess of step 4, and the names of their inputs; an error names the link to act on
const guessKeyByStep = { masterData: "masterDataGuess", importantClasses: "importantClassesGuess", events: "eventsGuess", links: "linksGuess", mapping: "mappingGuess" };
const linkChangeNames = ["apply_link_decision", "undo_link_decision", "add_link_property_option", "remove_link_property_option", "remove_link", "add_link"];
// the changes reading the tables of the database
const databaseChangeNames = ["add_entry", "set_entry_tables", "add_link"];
// the guesses of the steps in their order: a change of one is carried to the next ones; the mapping of step 5 names the
// classes in the mappings of other classes too, it is guessed again
const stepGuessKeys = ["masterDataGuess", "importantClassesGuess", "eventsGuess", "linksGuess"];
// a double quote inside a quoted Postgres name is written twice
const doubleQuoteRegex = /"/g;
// the distinct key values a link added by the user is checked on, enough to tell a key from a coincidence within the
// timeout of an evidence query
const keyCheckSampleSize = 1000;

// { tables } as the database names them, or { error }: a name is taken as written first, then whatever its case when one
// table alone has it, as EQUI2 and equi2 are two tables
function readTableNames(tableNames, columnsByTable) {
    const databaseTables = Object.keys(columnsByTable);
    const tables = [];
    for (const tableName of Array.isArray(tableNames) ? tableNames : []) {
        const writtenTable = readText(tableName);
        const lowerCaseTable = writtenTable.toLowerCase();
        const sameCaseTables = databaseTables.filter((databaseTable) => databaseTable.toLowerCase() == lowerCaseTable);
        const databaseTable = databaseTables.includes(writtenTable) ? writtenTable : sameCaseTables.length == 1 ? sameCaseTables[0] : null;
        if (!databaseTable) {
            return { error: "no table " + JSON.stringify(writtenTable) + " in the database" + (sameCaseTables.length > 1 ? ", write one of " + sameCaseTables.join(", ") : "") };
        }
        if (!tables.includes(databaseTable)) {
            tables.push(databaseTable);
        }
    }
    return { tables };
}

// { columns } of a table as the database names them, or { error }
function readColumnNames(table, columnNames, columnsByTable) {
    const tableColumns = (columnsByTable[table] || []).map((tableColumn) => tableColumn.column_name);
    const columns = [];
    for (const columnName of Array.isArray(columnNames) ? columnNames : []) {
        const writtenColumn = readText(columnName);
        const lowerCaseColumn = writtenColumn.toLowerCase();
        const databaseColumn = tableColumns.includes(writtenColumn) ? writtenColumn : tableColumns.find((tableColumn) => tableColumn.toLowerCase() == lowerCaseColumn);
        if (!databaseColumn) {
            return { error: "no column " + JSON.stringify(writtenColumn) + " in " + table };
        }
        columns.push(databaseColumn);
    }
    if (columns.length == 0) {
        return { error: "name the columns of " + table };
    }
    return { columns };
}

// the tables holding the rows of an entry, on the entry; a class of steps 1 and 2 has them in the classTables of step 3 too,
// which the links are computed from
function setEntryTables(aiKeys, guessKey, guess, guessEntry, tables) {
    guessEntry.tables = tables;
    if (guessKey != "eventsGuess" && aiKeys.eventsGuess) {
        aiKeys.eventsGuess.classTables[getDecidedClassLabel(guessEntry, guess)] = tables;
    }
}

// { summary, entryLabel } of a class or an association the user adds, with its tables and its superclass options, or { error }
function addEntry(preparedSource, aiKeys, guessKey, guess, source, changeInput, columnsByTable) {
    const label = readText(changeInput.newLabel);
    if (!label) {
        return { error: "a new class needs a label" };
    }
    const lowerCaseLabel = label.toLowerCase();
    const isClassLabelTaken = getGuessEntries(guess).some((guessEntry) => getDecidedClassLabel(guessEntry, guess).toLowerCase() == lowerCaseLabel);
    if (findByLabel(getGuessEntries(guess), label) || isClassLabelTaken) {
        return { error: label + " is already in the guess" };
    }
    const tableNames = readTableNames(changeInput.tables, columnsByTable);
    if (tableNames.error) {
        return { error: tableNames.error };
    }
    const parentOptions = [];
    for (const optionInput of changeInput.superClassOptions || []) {
        const optionParent = getParentOption(preparedSource, guess, source, optionInput);
        if (optionParent.error) {
            return { error: optionParent.error };
        }
        parentOptions.push(optionParent.parentOption);
    }
    const definition = readText(changeInput.definition);
    const addedEntry = { label: label, definition: definition, reason: readText(changeInput.rationale), readings: [getDefaultReading({ label: label, definition: definition })] };
    getGuessEntries(guess).push(addedEntry);
    guess.classificationByClass[label] = { classKind: "newClass", classLabel: label, parentOptions: parentOptions };
    if (tableNames.tables.length > 0) {
        setEntryTables(aiKeys, guessKey, guess, addedEntry, tableNames.tables);
    }
    const tablesText = tableNames.tables.length > 0 ? ", on " + tableNames.tables.join(", ") : "";
    const summary = label + " added" + tablesText;
    return { summary, entryLabel: label };
}

// { summary, entryLabel } of the tables of an entry the user changes, or { error }
function changeEntryTables(aiKeys, guessKey, guess, changeInput, columnsByTable) {
    const guessEntry = findByLabel(getGuessEntries(guess), changeInput.entry);
    if (!guessEntry) {
        return { error: "no entry " + JSON.stringify(changeInput.entry) + " in the guess" };
    }
    const tableNames = readTableNames(changeInput.tables, columnsByTable);
    if (tableNames.error) {
        return { error: tableNames.error };
    }
    // the first table is the main one, whose key names a row of the class
    setEntryTables(aiKeys, guessKey, guess, guessEntry, tableNames.tables);
    const summary = "tables of " + guessEntry.label + ": " + (tableNames.tables.join(", ") || "none");
    return { summary, entryLabel: guessEntry.label };
}

// the class label of each class of steps 1 to 3, by lower case label, as the links name them
function getLinkClassLabels(aiKeys) {
    const classLabelByLowerCase = {};
    ["masterDataGuess", "importantClassesGuess", "eventsGuess"].forEach(function (guessKey) {
        const guess = aiKeys[guessKey];
        if (!guess) {
            return;
        }
        getGuessEntries(guess).forEach(function (guessEntry) {
            const classLabel = getDecidedClassLabel(guessEntry, guess);
            classLabelByLowerCase[classLabel.toLowerCase()] = classLabel;
        });
    });
    return classLabelByLowerCase;
}

// { matchedText } of the distinct values of a foreign key found in the referenced table, on a sample, or { error } when
// none is; a query the database stops leaves the key unchecked rather than refused
async function checkForeignKeyInData(databaseSchema, foreignKey) {
    const quoteName = (name) => '"' + name.replace(doubleQuoteRegex, '""') + '"';
    // one text value per key, a composite key joined by a separator no value is compared with
    const getKeyValueSql = (columns) => columns.map((column) => quoteName(column) + "::text").join(" || '|' || ");
    const sql =
        "SELECT COUNT(*) AS sampled_values, COUNT(referenced.key_value) AS found_values FROM (SELECT DISTINCT " +
        getKeyValueSql(foreignKey.columns) +
        " AS key_value FROM " +
        quoteName(foreignKey.table) +
        " WHERE " +
        quoteName(foreignKey.columns[0]) +
        " IS NOT NULL ORDER BY key_value LIMIT " +
        keyCheckSampleSize +
        ") AS keyed LEFT JOIN (SELECT DISTINCT " +
        getKeyValueSql(foreignKey.referencedColumns) +
        " AS key_value FROM " +
        quoteName(foreignKey.referencedTable) +
        ") AS referenced ON keyed.key_value = referenced.key_value";
    const clientDriver = databaseModel.getClientDriver(databaseSchema.database.driver);
    const evidence = await runEvidenceQuery(databaseSchema.connection, clientDriver, sql);
    if (evidence.error) {
        return { matchedText: "not checked in the data: " + evidence.error };
    }
    const [sampledValues, foundValues] = evidence.rows[0];
    if (Number(foundValues) == 0) {
        return { error: "no value of " + foreignKey.table + "." + foreignKey.columns.join(", ") + " is found in " + foreignKey.referencedTable + ", the key joins nothing" };
    }
    const matchedText = foundValues + " of " + sampledValues + " distinct values found in " + foreignKey.referencedTable;
    return { matchedText };
}

// what a link is whatever its id: its two classes and the key, row or columns carrying it; the ids of the links of the AI
// name their classes only when a key is shared
function getLinkIdentityKey(link) {
    const foreignKey = link.foreignKey;
    const keyText = foreignKey ? foreignKey.table + "." + foreignKey.columns.join(",") + "->" + foreignKey.referencedTable + "." + foreignKey.referencedColumns.join(",") : "";
    const carrierText = link.sameRowTable || keyText || (link.rowColumns || []).join(",");
    const linkIdentityKey = link.fromClass + "|" + link.toClass + "|" + carrierText;
    return linkIdentityKey;
}

// { summary, entryLabel } of a link the user adds between two classes of steps 1 to 3, or { error }: on a foreign key whose
// values are found in the referenced table, or on a row of a table holding both classes; its property is added after
async function addLink(aiKeys, guess, changeInput, databaseSchema) {
    const classLabelByLowerCase = getLinkClassLabels(aiKeys);
    const fromClass = classLabelByLowerCase[readText(changeInput.fromClass).toLowerCase()];
    const toClass = classLabelByLowerCase[readText(changeInput.toClass).toLowerCase()];
    if (!fromClass || !toClass) {
        return { error: "name two classes of steps 1 to 3: " + Object.values(classLabelByLowerCase).join(", ") };
    }
    const columnsByTable = databaseSchema.columnsByTable;
    const link = {
        id: null,
        fromClass: fromClass,
        toClass: toClass,
        viaEvent: null,
        foreignKey: null,
        rowColumns: null,
        sameRowTable: null,
        propertyOptions: [],
        cardinality: "",
        inverseCardinality: "",
        reason: readText(changeInput.rationale),
        decision: null,
        isAddedByUser: true,
    };
    let evidenceText = null;
    if (readText(changeInput.sameRowTable)) {
        const rowTable = readTableNames([changeInput.sameRowTable], columnsByTable);
        if (rowTable.error) {
            return { error: rowTable.error };
        }
        link.sameRowTable = rowTable.tables[0];
        link.id = link.sameRowTable + " row " + fromClass + "->" + toClass;
        evidenceText = "both in one row of " + link.sameRowTable;
    } else {
        const keyTables = readTableNames([changeInput.table, changeInput.referencedTable], columnsByTable);
        if (keyTables.error) {
            return { error: keyTables.error };
        }
        const [table, referencedTable] = keyTables.tables.length == 2 ? keyTables.tables : [keyTables.tables[0], keyTables.tables[0]];
        const keyColumns = readColumnNames(table, changeInput.columns, columnsByTable);
        const referencedColumns = readColumnNames(referencedTable, changeInput.referencedColumns, columnsByTable);
        const columnsError = keyColumns.error || referencedColumns.error;
        if (columnsError) {
            return { error: columnsError };
        }
        if (keyColumns.columns.length != referencedColumns.columns.length) {
            return { error: "the key names as many columns as the referenced columns" };
        }
        link.foreignKey = { table: table, columns: keyColumns.columns, referencedTable: referencedTable, referencedColumns: referencedColumns.columns, foundInData: true };
        const checked = await checkForeignKeyInData(databaseSchema, link.foreignKey);
        if (checked.error) {
            return { error: checked.error };
        }
        link.id = table + ".(" + keyColumns.columns.join(", ") + ")->" + referencedTable + ".(" + referencedColumns.columns.join(", ") + ") " + fromClass + "->" + toClass;
        evidenceText = table + "." + keyColumns.columns.join(", ") + " matches " + referencedTable + "." + referencedColumns.columns.join(", ") + ", " + checked.matchedText;
    }
    const sameLink = guess.links.find((guessLink) => getLinkIdentityKey(guessLink) == getLinkIdentityKey(link));
    if (sameLink) {
        return { error: "the relation " + sameLink.id + " already joins these classes on this key" };
    }
    guess.links.push(link);
    const summary = "relation " + fromClass + " -> " + toClass + " added: " + evidenceText;
    return { summary, entryLabel: link.id };
}

// the links of step 4 follow a change of the tables: a link computed again keeps its options and its decision, a link
// gone with its table leaves, a link the user added stays, one the user removed stays out; { linksText } says what changed
function recomputeLinks(aiKeys, schema) {
    const linksGuess = aiKeys.linksGuess;
    const linkByIdentity = {};
    linksGuess.links.forEach((link) => (linkByIdentity[getLinkIdentityKey(link)] = link));
    const removedIdentities = (linksGuess.removedLinks || []).map(getLinkIdentityKey);
    const allComputedLinks = computeLinks(schema, aiKeys, aiKeys.eventsGuess);
    const computedLinks = allComputedLinks.filter((computedLink) => !removedIdentities.includes(getLinkIdentityKey(computedLink)));
    const computedIdentities = new Set(computedLinks.map(getLinkIdentityKey));
    const keptLinks = computedLinks.map((computedLink) => linkByIdentity[getLinkIdentityKey(computedLink)] || computedLink);
    const userLinks = linksGuess.links.filter((link) => link.isAddedByUser && !computedIdentities.has(getLinkIdentityKey(link)));
    const addedCount = computedLinks.filter((computedLink) => !linkByIdentity[getLinkIdentityKey(computedLink)]).length;
    const removedCount = linksGuess.links.filter((link) => !link.isAddedByUser && !computedIdentities.has(getLinkIdentityKey(link))).length;
    linksGuess.links = keptLinks.concat(userLinks);
    const linksText = "relations of step 4: " + addedCount + " added, without property yet, " + removedCount + " removed";
    return { linksText };
}

// the next steps keep up with a change of the entries of a step: a class renamed is renamed in the tables of step 3 and the
// links of step 4, a class removed leaves them, and what the next steps were guessed from is updated for the entries
// changed, so that none of them is to guess again. entriesBefore is getEntriesGuessedFrom of the guess before the change
function carryEntryChange(aiKeys, guessKey, guess, entriesBefore) {
    const entriesAfter = getEntriesGuessedFrom([guess]);
    // several entries may hold one class, a master data and an important class included: it is renamed or removed once
    // no entry of any step holds it any more
    const heldClassLabels = Object.values(getLinkClassLabels(aiKeys));
    const classLabelsAfter = new Set(heldClassLabels);
    const classLabelsBefore = new Set(Object.values(entriesBefore).map((guessedEntry) => guessedEntry.classLabel));
    const renamedClasses = {};
    const removedClasses = [];
    Object.entries(entriesBefore).forEach(function ([entryLabel, entryBefore]) {
        if (classLabelsAfter.has(entryBefore.classLabel)) {
            return;
        }
        const entryAfter = entriesAfter[entryLabel];
        if (entryAfter && !classLabelsBefore.has(entryAfter.classLabel)) {
            renamedClasses[entryBefore.classLabel] = entryAfter.classLabel;
        } else if (!removedClasses.includes(entryBefore.classLabel)) {
            removedClasses.push(entryBefore.classLabel);
        }
    });
    const eventsGuess = guessKey == "eventsGuess" ? null : aiKeys.eventsGuess;
    if (eventsGuess) {
        removedClasses.forEach((removedClass) => delete eventsGuess.classTables[removedClass]);
        Object.entries(renamedClasses).forEach(function ([classLabelBefore, classLabelAfter]) {
            if (eventsGuess.classTables[classLabelBefore]) {
                eventsGuess.classTables[classLabelAfter] = eventsGuess.classTables[classLabelBefore];
                delete eventsGuess.classTables[classLabelBefore];
            }
        });
    }
    const linksGuess = aiKeys.linksGuess;
    if (linksGuess) {
        linksGuess.links = linksGuess.links.filter((link) => !removedClasses.includes(link.fromClass) && !removedClasses.includes(link.toClass));
        const renameLinkClasses = function (link) {
            link.fromClass = renamedClasses[link.fromClass] || link.fromClass;
            link.toClass = renamedClasses[link.toClass] || link.toClass;
        };
        linksGuess.links.forEach(function (link) {
            renameLinkClasses(link);
            link.propertyOptions.forEach(function (option) {
                if (option.assumes) {
                    option.assumes.class = renamedClasses[option.assumes.class] || option.assumes.class;
                }
            });
        });
        (linksGuess.removedLinks || []).forEach(renameLinkClasses);
    }
    const changedEntryLabels = Object.keys(entriesBefore).filter((entryLabel) => JSON.stringify(entriesBefore[entryLabel]) != JSON.stringify(entriesAfter[entryLabel]));
    const addedEntryLabels = Object.keys(entriesAfter).filter((entryLabel) => !entriesBefore[entryLabel]);
    const carriedEntryLabels = changedEntryLabels.concat(addedEntryLabels);
    stepGuessKeys.slice(stepGuessKeys.indexOf(guessKey) + 1).forEach(function (nextGuessKey) {
        const nextGuess = aiKeys[nextGuessKey];
        if (!nextGuess) {
            return;
        }
        // a guess saved before entriesGuessedFrom keeps the decisions of the master data only
        const isLegacyGuess = !nextGuess.entriesGuessedFrom;
        const guessedEntries = isLegacyGuess ? nextGuess.decisionsByMasterData : nextGuess.entriesGuessedFrom;
        if (!guessedEntries) {
            return;
        }
        carriedEntryLabels.forEach(function (entryLabel) {
            const entryAfter = entriesAfter[entryLabel];
            delete guessedEntries[entryLabel];
            if (!entryAfter) {
                return;
            }
            if (!isLegacyGuess) {
                guessedEntries[entryLabel] = entryAfter;
            } else if (entryAfter.superClassId !== null || entryAfter.readingIndex !== null) {
                guessedEntries[entryLabel] = { readingIndex: entryAfter.readingIndex, superClassId: entryAfter.superClassId };
            }
        });
    });
}

// the guesses of the steps after guessKey, by key, sent back to the client once a change was carried to them
function getNextGuesses(aiKeys, guessKey) {
    const nextGuesses = {};
    stepGuessKeys.slice(stepGuessKeys.indexOf(guessKey) + 1).forEach(function (nextGuessKey) {
        if (aiKeys[nextGuessKey]) {
            nextGuesses[nextGuessKey] = aiKeys[nextGuessKey];
        }
    });
    return nextGuesses;
}

// a new class of steps 1 and 2 takes part in the relations through the tables the model named for it, if any
function carryStepGuessedAgain(aiKeys, guessKey, guessBefore, schema) {
    const guess = aiKeys[guessKey];
    carryEntryChange(aiKeys, guessKey, guess, getEntriesGuessedFrom([guessBefore]));
    const eventsGuess = aiKeys.eventsGuess;
    if (guessKey != "eventsGuess" && eventsGuess) {
        getGuessEntries(guess).forEach(function (guessEntry) {
            const classLabel = getDecidedClassLabel(guessEntry, guess);
            if (!eventsGuess.classTables[classLabel] && guessEntry.tables && guessEntry.tables.length > 0) {
                eventsGuess.classTables[classLabel] = guessEntry.tables;
            }
        });
        const classLabels = [];
        [aiKeys.masterDataGuess, aiKeys.importantClassesGuess].forEach((classGuess) => getGuessEntries(classGuess).forEach((guessEntry) => classLabels.push(getDecidedClassLabel(guessEntry, classGuess))));
        eventsGuess.classesWithoutTables = classLabels.filter((classLabel) => !eventsGuess.classTables[classLabel]);
    }
    if (aiKeys.linksGuess && eventsGuess) {
        recomputeLinks(aiKeys, schema);
    }
    const nextGuesses = getNextGuesses(aiKeys, guessKey);
    return nextGuesses;
}

// { link } or { error }, of one link of a links guess by its id
function findGuessLink(guess, linkId) {
    const guessLinks = guess.links || [];
    const link = guessLinks.find((guessLink) => guessLink.id == linkId);
    return link || null;
}

// { propertySource } of a property of the upper ontologies of the source, the first ontology holding it; null when no one does
function getPropertySource(preparedSource, propertyIri) {
    const propertySource = preparedSource.checkedOntologies.find((ontology) => preparedSource.ontologyModels[ontology]?.properties?.[propertyIri]);
    return propertySource || null;
}

// { option } of one of the options of a link, by the IRI the input names or by the label; null when none
function findLinkOption(link, optionReference) {
    const lowerCaseOptionReference = String(optionReference || "").toLowerCase();
    return link.propertyOptions.find((option) => option.propertyIri == optionReference || String(option.propertyLabel).toLowerCase() == lowerCaseOptionReference) || null;
}

// { assumption } the property may carry the link under, by the domain and range of the upper ontologies, null when the
// link touches no undecided class, or { error }: an option the user or the chat adds follows the rule of the model
async function readAllowedAssumption(aiKeys, link, propertyIri, isInverse, preparedSource, source, userContext) {
    const classGuesses = [aiKeys.masterDataGuess, aiKeys.importantClassesGuess, aiKeys.eventsGuess].filter((classGuess) => classGuess);
    const classAnchors = describeClassAnchors(classGuesses);
    const { linkAlternatives, allowedByLink } = await readAllowedLinkProperties([link], classAnchors.upperClassesByClass, preparedSource, source, userContext);
    const allowedAlternative = linkAlternatives[0].find((alternative) => isLinkOptionAllowed(allowedByLink[0], propertyIri, isInverse, alternative.assumption));
    if (!allowedAlternative) {
        const wayText = isInverse ? link.toClass + " to " + link.fromClass : link.fromClass + " to " + link.toClass;
        return { error: "the domain and range of " + propertyIri + " do not fit a relation from " + wayText + " under the superclasses of these classes" };
    }
    return { assumption: allowedAlternative.assumption };
}

// { summary, entryLabel } of one change on one link of a links guess, or { error }; allowedAssumption is the superclass an
// added option holds under, read by readAllowedAssumption
function changeGuessLink(preparedSource, guess, changeName, changeInput, allowedAssumption) {
    const linkId = readText(changeInput.link);
    const link = linkId ? findGuessLink(guess, linkId) : null;
    if (!link) {
        return { error: "no relation " + JSON.stringify(linkId) + " in linksGuess, name its id" };
    }
    let summary = null;
    if (changeName == "apply_link_decision") {
        const option = findLinkOption(link, changeInput.property);
        if (!option) {
            return { error: "no property " + JSON.stringify(changeInput.property) + " among the options of " + link.id };
        }
        link.decision = { propertyIri: option.propertyIri };
        summary = "relation " + link.fromClass + " -> " + link.toClass + " decided: " + option.propertyLabel;
    } else if (changeName == "undo_link_decision") {
        if (!link.decision) {
            return { error: "the relation " + link.id + " is not decided" };
        }
        delete link.decision;
        summary = "relation " + link.fromClass + " -> " + link.toClass + " not decided";
    } else if (changeName == "add_link_property_option") {
        const propertyIri = getTermIri(readText(changeInput.propertyIri), preparedSource.modelPrefixes);
        const propertySource = propertyIri && getPropertySource(preparedSource, propertyIri);
        if (!propertySource) {
            return { error: JSON.stringify(changeInput.propertyIri) + " is no property of the upper ontologies, search them with search_upper_ontologies" };
        }
        if (findLinkOption(link, propertyIri)) {
            return { error: preparedSource.ontologyModels[propertySource].properties[propertyIri].label + " is already an option of " + link.id };
        }
        const addedOption = {
            propertyIri: propertyIri,
            propertyLabel: preparedSource.ontologyModels[propertySource].properties[propertyIri].label,
            propertySource: propertySource,
            definition: readText(changeInput.definition),
            probability: Math.min(100, Math.max(0, Number(changeInput.probability) || 0)),
            inverse: Boolean(changeInput.inverse),
        };
        if (allowedAssumption) {
            addedOption.assumes = allowedAssumption;
        }
        link.propertyOptions.push(addedOption);
        const assumptionText = allowedAssumption ? ", if " + allowedAssumption.class + " is a " + allowedAssumption.superClass : "";
        summary = "property " + addedOption.propertyLabel + " added to the relation " + link.id + assumptionText;
    } else if (changeName == "remove_link_property_option") {
        const removedOption = findLinkOption(link, changeInput.property);
        if (!removedOption) {
            return { error: "no property " + JSON.stringify(changeInput.property) + " among the options of " + link.id };
        }
        link.propertyOptions.splice(link.propertyOptions.indexOf(removedOption), 1);
        if (link.decision?.propertyIri == removedOption.propertyIri) {
            delete link.decision;
        }
        summary = "property removed from the relation " + link.id;
    } else if (changeName == "remove_link") {
        guess.links.splice(guess.links.indexOf(link), 1);
        // the links computed again from the tables leave it out, its classes renamed with the others
        const removedLink = { fromClass: link.fromClass, toClass: link.toClass, foreignKey: link.foreignKey, sameRowTable: link.sameRowTable, rowColumns: link.rowColumns };
        guess.removedLinks = (guess.removedLinks || []).concat([removedLink]);
        summary = "relation " + link.id + " removed";
    }
    return { summary, entryLabel: linkId };
}

// the changes the chat makes to the guess of a workflow step when the user asks, an entry changed, a link changed, or a
// local class added, logged with what the user asked, the rationale of the model and the queries it read before, so that
// the next steps and the chat read why each choice was made; { summary, guessKey, guess, nextGuesses } once written in the
// mapping, nextGuesses the guesses of the next steps by key, which the change carried to, or { error }.
// userContext { user, userSources } opens the database for the changes reading its tables
async function changeGuess(source, databaseId, changeName, changeInput, chatEvidence, userContext) {
    const rationale = readText(changeInput.rationale);
    if (!rationale) {
        return { error: "give the rationale of the change" };
    }
    const keyDetection = await getKeyDetection(source, databaseId);
    const guessKey = guessKeyByStep[changeInput.step];
    if (!guessKey) {
        return { error: "name the step of the guess to change, one of " + Object.keys(guessKeyByStep).join(", ") };
    }
    // the links guess holds links, the mapping guess class mappings, the others entries
    let changedGuessKey = "entries";
    if (linkChangeNames.includes(changeName)) {
        changedGuessKey = "linksGuess";
    }
    if (mappingChangeNames.includes(changeName)) {
        changedGuessKey = "mappingGuess";
    }
    const stepGuessKey = guessKey == "linksGuess" || guessKey == "mappingGuess" ? guessKey : "entries";
    if (changedGuessKey != stepGuessKey) {
        const changedTexts = { entries: "the entries of steps 1 to 3", linksGuess: "the relations of step 4", mappingGuess: "the class mappings of step 5" };
        const wrongStepError = changeName + " changes " + changedTexts[changedGuessKey] + ", not the " + guessKey;
        return { error: wrongStepError };
    }
    const guess = keyDetection.aiKeys?.[guessKey];
    if (!guess) {
        return { error: "no " + guessKey + " for this database yet" };
    }
    const preparedSource = await getPreparedSource(source);
    if (!preparedSource) {
        return { error: getNotPreparedError(source) };
    }
    const aiKeys = keyDetection.aiKeys;
    const databaseSchema = databaseChangeNames.includes(changeName) ? await readDatabaseSchema(databaseId, userContext.user) : null;
    const entriesBefore = changedGuessKey == "entries" ? getEntriesGuessedFrom([guess]) : null;
    const newLabel = readText(changeInput.newLabel);
    if (changeName == "update_class" && newLabel) {
        const renamedEntry = findByLabel(getGuessEntries(guess), changeInput.entry);
        const ownClassLabel = renamedEntry ? getDecidedClassLabel(renamedEntry, guess).toLowerCase() : null;
        const heldClassLabel = getLinkClassLabels(aiKeys)[newLabel.toLowerCase()];
        if (heldClassLabel && heldClassLabel.toLowerCase() != ownClassLabel) {
            return { error: heldClassLabel + " is already the class of another entry, give another label" };
        }
    }
    let changed = null;
    if (changeName == "add_link") {
        changed = await addLink(aiKeys, guess, changeInput, databaseSchema);
    } else if (changeName == "add_link_property_option") {
        const link = findGuessLink(guess, readText(changeInput.link));
        const propertyIri = getTermIri(readText(changeInput.propertyIri), preparedSource.modelPrefixes);
        const allowed = link && propertyIri ? await readAllowedAssumption(aiKeys, link, propertyIri, Boolean(changeInput.inverse), preparedSource, source, userContext) : { assumption: null };
        changed = allowed.error ? allowed : changeGuessLink(preparedSource, guess, changeName, changeInput, allowed.assumption);
    } else if (changedGuessKey == "linksGuess") {
        changed = changeGuessLink(preparedSource, guess, changeName, changeInput, null);
    } else if (changedGuessKey == "mappingGuess") {
        changed = await changeGuessMapping(guess, changeName, changeInput, preparedSource, userContext);
    } else if (changeName == "add_local_class") {
        // a local class belongs to the ontology, to no entry of the guess
        changed = addLocalClass(preparedSource, guess, source, changeInput);
    } else if (changeName == "add_entry") {
        changed = addEntry(preparedSource, aiKeys, guessKey, guess, source, changeInput, databaseSchema.columnsByTable);
    } else if (changeName == "set_entry_tables") {
        changed = changeEntryTables(aiKeys, guessKey, guess, changeInput, databaseSchema.columnsByTable);
    } else {
        changed = changeGuessEntry(preparedSource, guess, source, changeName, changeInput);
    }
    if (changed.error) {
        return { error: changed.error };
    }
    if (changedGuessKey == "entries") {
        carryEntryChange(aiKeys, guessKey, guess, entriesBefore);
    }
    const isTablesChange = changeName == "set_entry_tables" || changeName == "add_entry";
    if (isTablesChange && aiKeys.linksGuess && aiKeys.eventsGuess) {
        changed.summary += "; " + recomputeLinks(aiKeys, databaseSchema.schema).linksText;
    }
    const linksGuess = keyDetection.aiKeys.linksGuess;
    if (guessKey == "eventsGuess" && changeName == "remove_entry" && linksGuess) {
        // removing an event takes its links with it
        linksGuess.links = linksGuess.links.filter((link) => link.viaEvent != changed.entryLabel);
    }
    if (!guess.changeLog) {
        guess.changeLog = [];
    }
    guess.changeLog.push({
        change: changeName,
        entry: changed.entryLabel,
        summary: changed.summary,
        userRequest: chatEvidence.userRequest,
        rationale: rationale,
        queries: chatEvidence.queries,
        at: new Date().toISOString(),
    });
    await writeMappingAiKeys(source, databaseId, keyDetection.aiKeys);
    const nextGuesses = changedGuessKey == "entries" ? getNextGuesses(aiKeys, guessKey) : {};
    return { summary: changed.summary, guessKey, guess, nextGuesses };
}

export { runSqlTool, guessMasterData, guessImportantClasses, carryStepGuessedAgain, getGuessPhaseStep, runEvidenceQuery, changeGuess, linkChangeNames, describeDecidedMasterData, describeGuessedDatabase, layOutReadings, readGuessedEntries, classifyClasses, findByLabel, findParentOption, getPropertySource, getGuessEntries };
