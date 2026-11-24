import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { databaseModel } from "../../../model/databases.js";
import { askKeyModel, describeKeyedDatabase, keyDetectionModelId, getKeyDetection, writeMappingAiKeys, readDatabaseSchema, addAiKeysToSchema } from "./keyDetection.js";
import { getTermIri } from "../ontologyFromDb/mappings/mappingAnswer.js";
import { readClassAnswer } from "./columnClassSuggestion.js";
import { getPreparedSource, getNotPreparedError } from "./sourcePreparation.js";

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
const entryChangeNames = ["add_reading", "undo_decision", "remove_entry"];
// an evidence query is one statement reading the data, whatever the model writes
const readingStatementStartRegex = /^\s*(select|with)\b/i;
const statementSeparatorRegex = /;/;
// models often end a statement with one
const trailingSemicolonRegex = /;\s*$/;
const maxReadings = 3;
const evidenceRowLimit = 20;
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

// at most maxReadings readings of one answered entry, null when none holds a definition; with several readings each class is
// keyed by the reading, its classification depending on what a row denotes
function readReadings(answeredEntry, masterDataEntry) {
    const answeredReadings = Array.isArray(answeredEntry?.readings) ? answeredEntry.readings : [];
    const definedReadings = answeredReadings.filter((answeredReading) => answeredReading && readText(answeredReading.label) && readText(answeredReading.definition));
    const keptReadings = definedReadings.slice(0, maxReadings);
    if (keptReadings.length == 0) {
        return null;
    }
    const readings = keptReadings.map(function (answeredReading) {
        const readingLabel = readText(answeredReading.label);
        const classKey = keptReadings.length > 1 ? masterDataEntry.label + ", read as " + readingLabel.toLowerCase() : masterDataEntry.label;
        return {
            label: readingLabel,
            rowIs: readText(answeredReading.rowIs),
            inData: readText(answeredReading.inData),
            askBusiness: readText(answeredReading.askBusiness),
            definition: readText(answeredReading.definition),
            classKey: classKey,
        };
    });
    return readings;
}

// the readings of what a row denotes, laid out by the model from the data the evidence queries read; an entry without
// data read, or that the model leaves without a reading, keeps one reading
async function layOutReadings(guessEntries, domain, tellStep) {
    const evidencedEntries = guessEntries.filter((guessEntry) => guessEntry.evidence && !guessEntry.evidence.error);
    let answeredEntries = [];
    if (evidencedEntries.length > 0) {
        const entryTexts = evidencedEntries.map((guessEntry) => "## " + guessEntry.label + "\n" + guessEntry.definition + "\n" + getEvidenceText(guessEntry.evidence));
        const readingsPrompt = readFileSync(masterDataReadingsPromptPath, "utf8") + "\n\n# Domain\n\n" + domain + "\n\n# Classes\n\n" + entryTexts.join("\n\n") + "\n";
        tellStep("the model reads what a row denotes for " + evidencedEntries.length + " classes, about a minute");
        const readingsAnswer = await askKeyModel(readingsPrompt);
        if (readingsAnswer.error) {
            console.warn("[aiMappingModeler/masterData] readings not laid out by the AI: " + readingsAnswer.error);
        }
        answeredEntries = Array.isArray(readingsAnswer.answer?.classes) ? readingsAnswer.answer.classes : [];
    }
    guessEntries.forEach(function (masterDataEntry) {
        const answeredEntry = masterDataEntry.evidence ? findByLabel(answeredEntries, masterDataEntry.label) : null;
        masterDataEntry.readings = readReadings(answeredEntry, masterDataEntry) || [getDefaultReading(masterDataEntry)];
    });
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
    return { classification: newClassification };
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
    const classesToClassify = [];
    guessEntries.forEach((guessEntry) => guessEntry.readings.forEach((reading) => classesToClassify.push({ label: reading.classKey, definition: reading.definition })));
    const classLines = classesToClassify.map((classToClassify) => "- " + classToClassify.label + ": " + classToClassify.definition);
    const decidedClassLines = decidedClasses.map((decidedClass) => "- " + decidedClass.label + ": " + decidedClass.definition);
    const decidedClassesText = decidedClassLines.length > 0 ? "\n\n# Classes already decided\n\n" + decidedClassLines.join("\n") : "";
    const classificationPrompt =
        classificationPromptText.slice(0, answerSectionStart) +
        "\n# Upper ontologies, most abstract first\n" +
        preparedSource.classesText +
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
async function readGuessedEntries(answeredEntries, connection, clientDriver, tellStep) {
    const guessEntries = [];
    for (const answeredEntry of answeredEntries) {
        if (!answeredEntry || !readText(answeredEntry.label) || findByLabel(guessEntries, answeredEntry.label)) {
            continue;
        }
        const guessEntry = { label: readText(answeredEntry.label), definition: readText(answeredEntry.definition), reason: readText(answeredEntry.reason) };
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
    const masterData = await readGuessedEntries(answeredMasterData, connection, databaseModel.getClientDriver(database.driver), tellGuessStep);
    const masterDataGuess = { domain: readText(answer.domain), masterData: masterData, model: keyDetectionModelId, guessedAt: new Date().toISOString() };
    if (masterData.length == 0) {
        return masterDataGuess;
    }
    await layOutReadings(masterData, masterDataGuess.domain, tellGuessStep);
    const classified = await classifyClasses(source, masterDataGuess.domain, masterData, [], preparedSource, tellGuessStep);
    if (classified.error) {
        console.warn("[aiMappingModeler/masterData] " + database.database + ": master data not classified by the AI: " + classified.error);
        return null;
    }
    masterDataGuess.classificationByClass = classified.classificationByLabel;
    masterData.forEach((masterDataEntry) => (masterDataEntry.classification = classified.classificationByLabel[masterDataEntry.readings[0].classKey]));
    return masterDataGuess;
}

// the entries of a guess: the master data of step 1, the important classes of step 2, the event classes of step 3
function getGuessEntries(guess) {
    const guessEntries = guess.masterData || guess.importantClasses || guess.eventClasses;
    return guessEntries;
}

// the text of what an entry may still be: each reading with its class and every superclass option, the next steps keep
// them all as alternatives
function describeUndecidedEntry(guess, masterDataEntry) {
    const readings = masterDataEntry.readings || [getDefaultReading(masterDataEntry)];
    const readingTexts = readings.map(function (reading) {
        const classification = guess.classificationByClass?.[reading.classKey] || masterDataEntry.classification || { classKind: "unclassified" };
        const rowText = reading.rowIs ? "a row is " + reading.rowIs + ", " : "";
        if (classification.classKind == "existingClass") {
            return rowText + "the upper class " + classification.classLabel;
        }
        if (classification.classKind != "newClass") {
            return rowText + "not classified";
        }
        const optionTexts = classification.parentOptions.map((parentOption) => parentOption.parentLabel + " " + parentOption.probability + "%");
        const readingText = rowText + "class " + classification.classLabel + (optionTexts.length > 0 ? ", subClassOf one of " + optionTexts.join(", ") : "");
        return readingText;
    });
    const undecidedLine = "- " + masterDataEntry.label + ": not decided yet, alternatives: " + readingTexts.join("; or ") + ". " + (readings[0].definition || "");
    return undecidedLine;
}

// { decidedLines, decidedClasses, changeLogLines } of the entries of a guess: one line per entry, an undecided one with
// its alternatives, and the local classes a class may take as superclass
function describeDecidedMasterData(guess) {
    const decidedLines = [];
    const decidedClasses = [];
    getGuessEntries(guess).forEach(function (masterDataEntry) {
        if (!masterDataEntry.decision) {
            decidedLines.push(describeUndecidedEntry(guess, masterDataEntry));
            return;
        }
        const reading = (masterDataEntry.readings || [getDefaultReading(masterDataEntry)])[masterDataEntry.decision.readingIndex];
        const classification = guess.classificationByClass?.[reading.classKey] || masterDataEntry.classification || { classKind: "unclassified" };
        // a decided entry while unclassified has no class yet
        let classText = "not classified";
        if (classification.classKind == "existingClass") {
            classText = "the upper class " + classification.classLabel;
        } else if (classification.classKind == "newClass") {
            const chosenParent = findParentOption(classification.parentOptions, masterDataEntry.decision.superClassId);
            classText = "class " + classification.classLabel + (chosenParent ? ", subClassOf " + chosenParent.parentLabel : "");
            decidedClasses.push({ label: classification.classLabel, definition: reading.definition });
        }
        const rowText = reading.rowIs ? " A row is " + reading.rowIs : "";
        decidedLines.push("- " + masterDataEntry.label + ": " + classText + ". " + reading.definition + rowText);
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
    tellStep("the model guesses the important classes around the master data, about a minute");
    const importantClassesAnswer = await askKeyModel(importantClassesPrompt);
    if (importantClassesAnswer.error) {
        return { error: importantClassesAnswer.error };
    }
    const answeredClasses = Array.isArray(importantClassesAnswer.answer?.importantClasses) ? importantClassesAnswer.answer.importantClasses : [];
    const importantClasses = await readGuessedEntries(answeredClasses, connection, databaseModel.getClientDriver(database.driver), tellStep);
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
        await layOutReadings(importantClasses, masterDataGuess.domain, tellStep);
        const classified = await classifyClasses(source, masterDataGuess.domain, importantClasses, decidedMasterData.decidedClasses, preparedSource, tellStep);
        if (classified.error) {
            return { error: classified.error };
        }
        importantClassesGuess.classificationByClass = classified.classificationByLabel;
    }
    // read again: decisions taken while the model worked are kept
    const savedAiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    savedAiKeys.importantClassesGuess = importantClassesGuess;
    await writeMappingAiKeys(source, databaseId, savedAiKeys);
    return { importantClassesGuess };
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
    } else if (guessEntry.readings.length > 1) {
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
    if (changeName == "apply_decision") {
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
        const classKey = guessEntry.label + ", read as " + readingLabel.toLowerCase();
        guessEntry.readings.push({
            label: readingLabel,
            rowIs: readText(changeInput.rowIs),
            inData: readText(changeInput.inData),
            askBusiness: readText(changeInput.askBusiness),
            definition: readText(changeInput.definition),
            classKey: classKey,
        });
        guess.classificationByClass[classKey] = { classKind: "newClass", classLabel: guessEntry.label, parentOptions: newParentOptions };
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
        delete guess.classificationByClass[removedReading.classKey];
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
    } else {
        return { error: "unknown change " + changeName };
    }
    return { summary, entryLabel: guessEntry.label };
}

// the links changes of the chat on the guess of step 3, and the names of their inputs; an error names the link to act on
const guessKeyByStep = { masterData: "masterDataGuess", importantClasses: "importantClassesGuess", links: "linksGuess" };
const linkChangeNames = ["apply_link_decision", "undo_link_decision", "add_link_property_option", "remove_link_property_option", "remove_link"];

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

// { summary, entryLabel } of one change on one link of a links guess, or { error }
function changeGuessLink(preparedSource, guess, changeName, changeInput) {
    const linkId = readText(changeInput.link);
    const link = linkId ? findGuessLink(guess, linkId) : null;
    if (!link) {
        return { error: "no link " + JSON.stringify(linkId) + " in the links guess, name its id" };
    }
    let summary = null;
    if (changeName == "apply_link_decision") {
        const option = findLinkOption(link, changeInput.property);
        if (!option) {
            return { error: "no property " + JSON.stringify(changeInput.property) + " among the options of " + link.id };
        }
        link.decision = { propertyIri: option.propertyIri };
        summary = "link " + link.fromClass + " -> " + link.toClass + " decided: " + option.propertyLabel;
    } else if (changeName == "undo_link_decision") {
        if (!link.decision) {
            return { error: "the link " + link.id + " is not decided" };
        }
        delete link.decision;
        summary = "link " + link.fromClass + " -> " + link.toClass + " not decided";
    } else if (changeName == "add_link_property_option") {
        const propertyIri = getTermIri(readText(changeInput.propertyIri), preparedSource.modelPrefixes);
        const propertySource = propertyIri && getPropertySource(preparedSource, propertyIri);
        if (!propertySource) {
            return { error: JSON.stringify(changeInput.propertyIri) + " is no property of the upper ontologies, search them with search_upper_ontologies" };
        }
        if (findLinkOption(link, propertyIri)) {
            return { error: preparedSource.ontologyModels[propertySource].properties[propertyIri].label + " is already an option of " + link.id };
        }
        link.propertyOptions.push({
            propertyIri: propertyIri,
            propertyLabel: preparedSource.ontologyModels[propertySource].properties[propertyIri].label,
            propertySource: propertySource,
            definition: readText(changeInput.definition),
            probability: Number(changeInput.probability) || 0,
            inverse: Boolean(changeInput.inverse),
        });
        summary = "property added to the link " + link.id;
    } else if (changeName == "remove_link_property_option") {
        const removedOption = findLinkOption(link, changeInput.property);
        if (!removedOption) {
            return { error: "no property " + JSON.stringify(changeInput.property) + " among the options of " + link.id };
        }
        link.propertyOptions.splice(link.propertyOptions.indexOf(removedOption), 1);
        if (link.decision?.propertyIri == removedOption.propertyIri) {
            delete link.decision;
        }
        summary = "property removed from the link " + link.id;
    } else if (changeName == "remove_link") {
        guess.links.splice(guess.links.indexOf(link), 1);
        summary = "link " + link.id + " removed";
    }
    return { summary, entryLabel: linkId };
}

// the changes the chat makes to the guess of a workflow step when the user asks, an entry changed, a link changed, or a
// local class added, logged with what the user asked, the rationale of the model and the queries it read before, so that
// the next steps and the chat read why each choice was made; { summary, guessKey, guess } once written in the mapping, or { error }
async function changeGuess(source, databaseId, changeName, changeInput, chatEvidence) {
    const rationale = readText(changeInput.rationale);
    if (!rationale) {
        return { error: "give the rationale of the change" };
    }
    const keyDetection = await getKeyDetection(source, databaseId);
    const guessKey = guessKeyByStep[changeInput.step] || "masterDataGuess";
    const guess = keyDetection.aiKeys?.[guessKey];
    if (!guess) {
        return { error: "no " + guessKey + " for this database yet" };
    }
    const preparedSource = await getPreparedSource(source);
    if (!preparedSource) {
        return { error: getNotPreparedError(source) };
    }
    let changed = null;
    if (linkChangeNames.includes(changeName)) {
        changed = changeGuessLink(preparedSource, guess, changeName, changeInput);
    } else {
        // a local class belongs to the ontology, to no entry of the guess
        changed = changeName == "add_local_class" ? addLocalClass(preparedSource, guess, source, changeInput) : changeGuessEntry(preparedSource, guess, source, changeName, changeInput);
    }
    if (changed.error) {
        return { error: changed.error };
    }
    if (guessKey == "linksGuess" && changeName == "remove_entry" && changed.entryLabel) {
        // removing an event takes its links with it
        guess.links = (guess.links || []).filter((link) => link.viaEvent != changed.entryLabel && link.fromClass != changed.entryLabel && link.toClass != changed.entryLabel);
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
    return { summary: changed.summary, guessKey, guess };
}

export { guessMasterData, guessImportantClasses, runEvidenceQuery, changeGuess, linkChangeNames, describeDecidedMasterData, describeGuessedDatabase, layOutReadings, readGuessedEntries, classifyClasses, findByLabel, findParentOption, getPropertySource, getGuessEntries };
