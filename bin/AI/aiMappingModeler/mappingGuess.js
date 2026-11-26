import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import async from "async";
import { databaseModel } from "../../../model/databases.js";
import { getColumnProfile, getRepeatedValueRows, getSampleData } from "../../databases/dbConnector.js";
import { callVocablesFunction } from "../../remoteCodeRunner.js";
import { askKeyModel, keyDetectionModelId, getKeyDetection, writeMappingAiKeys, readDatabaseSchema } from "./keyDetection.js";
import { getGuessPhaseStep, getGuessEntries } from "./masterData.js";
import { getDecidedClassLabel, getEntriesGuessedFrom, getClassGuesses, describeClassAnchors } from "./linksGuess.js";
import { getPreparedSource, getNotPreparedError } from "./sourcePreparation.js";
import { getSampleTexts } from "../ontologyFromDb/databaseDescription.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const mappingGuessPromptPath = join(currentDirectory, "prompts/mapping_guess.md");
// a column holding at most this many distinct values shows its most frequent ones: a code list is read on them
const codeListValueLimit = 50;
const frequentValueCount = 6;
const sampleRowCount = 5;
const parallelModelCallCount = 3;
// the kinds of mapping a column may take, as prompts/mapping_guess.md lists them
const mappingKinds = ["existingProperty", "newProperty", "subclassPerValue", "individualPerValue", "implicitClass", "identifierClass", "splitValue", "unmapped", "other"];
const uriTypes = ["fromLabel", "blankNode", "randomIdentifier"];
const dateRanges = ["xsd:date", "xsd:dateTime"];
const sqlDateTypeRegex = /date|timestamp/;
const uriSchemeRegex = /^https?:\/\//;
const trailingUriSeparatorRegex = /[#/]$/;
// the phases of the progress bar: the properties, the columns, the model
const mappingPhaseCount = 3;
const mappingChangeNames = ["apply_class_mapping", "undo_class_mapping"];

function readText(value) {
    const text = typeof value == "string" ? value.trim() : "";
    return text;
}

// step 3 writes the columns of an implicit association as table.column
function getTableOfColumn(tableColumn) {
    const [tableName] = tableColumn.split(".");
    return tableName;
}

// the classes of steps 1 to 3 with the table holding their objects, its main one first as step 3 named it; an implicit
// association has no table, its row is the table of its columns. A class several entries take is mapped once
function getMappedClasses(classGuesses, eventsGuess) {
    const mappedClasses = [];
    const classesWithoutTables = [];
    const addMappedClass = function (classLabel, tables, rowTable, isImplicit) {
        if (mappedClasses.some((mappedClass) => mappedClass.classLabel == classLabel)) {
            return;
        }
        if (!rowTable) {
            classesWithoutTables.push(classLabel);
            return;
        }
        mappedClasses.push({ classLabel: classLabel, table: rowTable, otherTables: tables.filter((table) => table != rowTable), isImplicit: isImplicit });
    };
    [classGuesses.masterDataGuess, classGuesses.importantClassesGuess].forEach(function (guess) {
        getGuessEntries(guess).forEach(function (entry) {
            const classLabel = getDecidedClassLabel(entry, guess);
            const tables = eventsGuess.classTables[classLabel] || [];
            addMappedClass(classLabel, tables, tables[0], false);
        });
    });
    eventsGuess.eventClasses.forEach(function (eventClass) {
        const classLabel = getDecidedClassLabel(eventClass, eventsGuess);
        const tables = eventClass.tables || [];
        const implicitRowTable = eventClass.columns?.length > 0 ? getTableOfColumn(eventClass.columns[0]) : null;
        addMappedClass(classLabel, tables, tables[0] || implicitRowTable, tables.length == 0);
    });
    return { mappedClasses, classesWithoutTables };
}

// the other classes one row of the table gives: a class sharing the table, the target of a foreign key of the table, an
// association read in columns of the table; [{ classLabel, via }]
function getRowResources(mappedClass, mappedClasses, links) {
    const rowResources = [];
    const addRowResource = function (classLabel, via) {
        if (classLabel == mappedClass.classLabel || rowResources.some((rowResource) => rowResource.classLabel == classLabel)) {
            return;
        }
        rowResources.push({ classLabel: classLabel, via: via });
    };
    mappedClasses.forEach(function (otherClass) {
        if (otherClass.table == mappedClass.table || otherClass.otherTables.includes(mappedClass.table)) {
            addRowResource(otherClass.classLabel, "read in the same table");
        }
    });
    links.forEach(function (link) {
        if (link.foreignKey?.table == mappedClass.table && link.fromClass == mappedClass.classLabel) {
            addRowResource(link.toClass, "foreign key " + link.foreignKey.columns.join(", "));
        }
        if (link.rowColumns && getTableOfColumn(link.rowColumns[0]) == mappedClass.table) {
            addRowResource(link.fromClass, "association read in " + link.rowColumns.join(", "));
        }
    });
    return rowResources;
}

// per column of the table, what the data shows of it: { column, type, rowCount, filledCount, distinctCount,
// frequentValues: [{ value, rowCount }], sampleValues }
async function readColumnEvidence(connection, clientDriver, tableName, tableColumns) {
    const columnNames = tableColumns.map((tableColumn) => tableColumn.column_name);
    const profile = await getColumnProfile(connection, clientDriver, tableName, columnNames);
    const sampleRows = await getSampleData(connection, tableName, sampleRowCount, clientDriver);
    const columnEvidences = [];
    for (const tableColumn of tableColumns) {
        const columnProfile = profile.columnsByName[tableColumn.column_name];
        const sampleTexts = getSampleTexts(
            sampleRows.map((sampleRow) => ({ [tableColumn.column_name]: sampleRow[tableColumn.column_name] })),
            [tableColumn],
        );
        let frequentValues = [];
        if (columnProfile.distinctCount > 0 && columnProfile.distinctCount <= codeListValueLimit) {
            const repeatedValueRows = await getRepeatedValueRows(connection, clientDriver, tableName, tableColumn.column_name, frequentValueCount, 1);
            frequentValues = repeatedValueRows.map((repeatedValue) => ({ value: repeatedValue.value, rowCount: repeatedValue.rowCount }));
        }
        columnEvidences.push({
            column: tableColumn.column_name,
            type: tableColumn.data_type,
            rowCount: profile.rowCount,
            filledCount: columnProfile.filledCount,
            distinctCount: columnProfile.distinctCount,
            frequentValues: frequentValues,
            sampleValues: sampleTexts.filter((sampleText) => sampleText != "NULL"),
        });
    }
    return columnEvidences;
}

function describeColumnEvidence(columnEvidence) {
    const frequentTexts = columnEvidence.frequentValues.map((frequentValue) => JSON.stringify(frequentValue.value) + " " + frequentValue.rowCount);
    const columnText =
        "- " +
        columnEvidence.column +
        " (" +
        columnEvidence.type +
        "): " +
        columnEvidence.filledCount +
        " of " +
        columnEvidence.rowCount +
        " rows filled, " +
        columnEvidence.distinctCount +
        " distinct" +
        (frequentTexts.length > 0 ? "; most frequent: " + frequentTexts.join(", ") : "") +
        (columnEvidence.sampleValues.length > 0 ? "; samples: " + columnEvidence.sampleValues.join(" | ") : "");
    return columnText;
}

// the datatype and annotation properties of the imported ontologies and of the vocabularies of base, by IRI:
// { propertyIri: { label, range, source } }
async function readAvailableProperties(preparedSource, userContext) {
    // the runner of the vocables code holds the vocabularies of base, as app_config.js does for the client
    const basicVocabularySources = Object.keys(globalThis.Config?.basicVocabularies || {});
    const modelSources = preparedSource.checkedOntologies.concat(basicVocabularySources);
    const ontologyModels = await callVocablesFunction("OntologyModels", "registerSourcesModel", [modelSources, {}], userContext);
    const propertyByIri = {};
    modelSources.forEach(function (modelSource) {
        const nonObjectProperties = ontologyModels[modelSource]?.nonObjectProperties || {};
        for (const [propertyIri, nonObjectProperty] of Object.entries(nonObjectProperties)) {
            propertyByIri[propertyIri] = propertyByIri[propertyIri] || { label: nonObjectProperty.label || propertyIri, range: nonObjectProperty.range || null, source: modelSource };
        }
    });
    // a vocabulary lists the properties of the vocabularies it uses too: a property is named by the one of its namespace.
    // The graphUris of the vocabularies differ from their namespaces by the scheme and the last separator
    for (const [propertyIri, property] of Object.entries(propertyByIri)) {
        const iriWithoutScheme = propertyIri.replace(uriSchemeRegex, "");
        const namespaceSource = basicVocabularySources.find(function (vocabularySource) {
            const graphUri = globalThis.Config.basicVocabularies[vocabularySource].graphUri;
            const graphUriWithoutScheme = graphUri.replace(uriSchemeRegex, "");
            const namespace = graphUriWithoutScheme.replace(trailingUriSeparatorRegex, "");
            const separatorAfterNamespace = iriWithoutScheme.charAt(namespace.length);
            return iriWithoutScheme.startsWith(namespace) && (separatorAfterNamespace == "#" || separatorAfterNamespace == "/");
        });
        property.source = namespaceSource || property.source;
    }
    return propertyByIri;
}

// one option of the answer, checked against the columns, the classes of the row and the properties; what does not fit
// stays, named in problem
function readMappingOption(answeredOption, classMapping, columnEvidences, propertyByIri) {
    const kind = mappingKinds.includes(answeredOption?.kind) ? answeredOption.kind : "other";
    const onClass = readText(answeredOption?.onClass) || classMapping.classLabel;
    const option = {
        kind: kind,
        propertyIri: null,
        propertyLabel: null,
        propertySource: null,
        newPropertyName: null,
        onClass: onClass,
        range: null,
        dateFormat: null,
        detail: readText(answeredOption?.detail),
        probability: Math.min(100, Math.max(0, Number(answeredOption?.probability) || 0)),
        problem: null,
    };
    const rowResourceLabels = classMapping.rowResources.map((rowResource) => rowResource.classLabel);
    const rowClassLabels = [classMapping.classLabel].concat(rowResourceLabels);
    if (!rowClassLabels.includes(onClass)) {
        option.problem = onClass + " is no class of the row";
    }
    if (kind == "existingProperty") {
        const propertyIri = readText(answeredOption.propertyIri);
        const property = propertyByIri[propertyIri];
        if (!property) {
            option.problem = propertyIri + " is no property of the ontologies";
        }
        option.propertyIri = propertyIri;
        option.propertyLabel = property ? property.label : propertyIri;
        option.propertySource = property ? property.source : null;
    }
    if (kind == "newProperty") {
        option.newPropertyName = readText(answeredOption.newPropertyName);
    }
    if (kind == "existingProperty" || kind == "newProperty") {
        option.range = readText(answeredOption.range) || "xsd:string";
        option.dateFormat = readText(answeredOption.dateFormat) || null;
        const isTextColumn = columnEvidences.some((columnEvidence) => !sqlDateTypeRegex.test(columnEvidence.type));
        if (dateRanges.includes(option.range) && isTextColumn && !option.dateFormat) {
            option.problem = "a date held as text needs its dateFormat";
        }
    }
    return option;
}

// the answer of the model for one class, each column of the table given once: a column the answer forgets is left unmapped
function readClassMapping(answer, classMapping, columnEvidences, propertyByIri) {
    const columnNames = columnEvidences.map((columnEvidence) => columnEvidence.column);
    const evidenceByColumn = {};
    columnEvidences.forEach((columnEvidence) => (evidenceByColumn[columnEvidence.column] = columnEvidence));
    const answeredInstance = answer?.instance || {};
    const answeredIdentifiers = Array.isArray(answeredInstance.identifierColumns) ? answeredInstance.identifierColumns.map(readText) : [];
    const labelColumn = readText(answeredInstance.labelColumn);
    classMapping.instance = {
        identifierColumns: answeredIdentifiers.filter((column) => columnNames.includes(column)),
        uriType: uriTypes.includes(answeredInstance.uriType) ? answeredInstance.uriType : "fromLabel",
        prefixURI: readText(answeredInstance.prefixURI),
        labelColumn: columnNames.includes(labelColumn) ? labelColumn : null,
        reason: readText(answeredInstance.reason),
    };
    const givenColumns = new Set();
    const answeredColumns = Array.isArray(answer?.columns) ? answer.columns : [];
    answeredColumns.forEach(function (answeredColumn) {
        const answeredNames = Array.isArray(answeredColumn?.columns) ? answeredColumn.columns.map(readText) : [];
        const columns = answeredNames.filter((column) => columnNames.includes(column) && !givenColumns.has(column));
        const answeredOptions = Array.isArray(answeredColumn?.options) ? answeredColumn.options : [];
        if (columns.length == 0 || answeredOptions.length == 0) {
            return;
        }
        columns.forEach((column) => givenColumns.add(column));
        const evidences = columns.map((column) => evidenceByColumn[column]);
        const options = answeredOptions.map((answeredOption) => readMappingOption(answeredOption, classMapping, evidences, propertyByIri));
        classMapping.columnMappings.push({
            columns: columns,
            reason: readText(answeredColumn.reason),
            evidences: evidences,
            options: options,
            decision: null,
        });
    });
    const answeredUnmapped = Array.isArray(answer?.unmapped) ? answer.unmapped : [];
    answeredUnmapped.forEach(function (unmappedColumn) {
        const column = readText(unmappedColumn?.column);
        if (!columnNames.includes(column) || givenColumns.has(column)) {
            return;
        }
        givenColumns.add(column);
        classMapping.unmappedColumns.push({ column: column, reason: readText(unmappedColumn.reason), evidence: evidenceByColumn[column] });
    });
    columnNames.forEach(function (column) {
        if (!givenColumns.has(column)) {
            classMapping.unmappedColumns.push({ column: column, reason: "not answered by the model", evidence: evidenceByColumn[column] });
        }
    });
}

async function guessClassMapping(classMapping, classAnchorText, domain, columnEvidences, propertiesText, propertyByIri) {
    const rowResourceLines = classMapping.rowResources.map((rowResource) => "- " + rowResource.classLabel + ", " + rowResource.via);
    const mappingPrompt =
        readFileSync(mappingGuessPromptPath, "utf8") +
        "\n\n# Domain\n\n" +
        domain +
        "\n\n# Class\n\n" +
        (classAnchorText || classMapping.classLabel) +
        "\n\n# Table\n\n" +
        classMapping.table +
        (classMapping.identifierColumns.length > 0 ? ", identifier " + classMapping.identifierColumns.join(", ") : ", no identifier found") +
        (classMapping.otherTables.length > 0 ? "; the class is also in " + classMapping.otherTables.join(", ") : "") +
        "\n\n# Resources of the row\n\n" +
        (rowResourceLines.length > 0 ? rowResourceLines.join("\n") : "none") +
        "\n\n# Columns\n\n" +
        columnEvidences.map(describeColumnEvidence).join("\n") +
        "\n\n# Properties available\n\n" +
        propertiesText +
        "\n";
    const answer = await askKeyModel(mappingPrompt);
    if (answer.error) {
        classMapping.error = answer.error;
        return;
    }
    readClassMapping(answer.answer, classMapping, columnEvidences, propertyByIri);
}

// { mappingGuess } or { error }, step 5 of the workflow: for each class of steps 1 to 3, how one row of its table gives
// one instance, then what each column becomes, among the kinds of mapping_guess.md, rested on what the data shows. An
// implicit association gets no model call: one blank node per row of its table, no column of its own
async function guessMapping(source, databaseId, userInfo, userSources, tellStep) {
    const aiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    const classGuesses = getClassGuesses(aiKeys);
    if (classGuesses.error) {
        return classGuesses;
    }
    const eventsGuess = aiKeys.eventsGuess;
    if (!eventsGuess) {
        return { error: "the associations of this database are not guessed" };
    }
    const preparedSource = await getPreparedSource(source);
    if (!preparedSource) {
        return { error: getNotPreparedError(source) };
    }
    const { database, connection, columnsByTable } = await readDatabaseSchema(databaseId, userInfo);
    const clientDriver = databaseModel.getClientDriver(database.driver);
    const classGuessList = [classGuesses.masterDataGuess, classGuesses.importantClassesGuess, eventsGuess];
    const { mappedClasses, classesWithoutTables } = getMappedClasses(classGuesses, eventsGuess);
    const links = aiKeys.linksGuess?.links || [];
    const classMappings = mappedClasses.map(function (mappedClass) {
        const primaryKey = (aiKeys.primaryKeys || []).find((candidateKey) => candidateKey.table == mappedClass.table);
        const classMapping = {
            classLabel: mappedClass.classLabel,
            table: mappedClass.table,
            otherTables: mappedClass.otherTables,
            isImplicit: mappedClass.isImplicit,
            identifierColumns: primaryKey && !mappedClass.isImplicit ? primaryKey.columns : [],
            rowResources: getRowResources(mappedClass, mappedClasses, links),
            instance: null,
            columnMappings: [],
            unmappedColumns: [],
            decision: null,
        };
        if (mappedClass.isImplicit) {
            classMapping.instance = { identifierColumns: [], uriType: "blankNode", prefixURI: "", labelColumn: null, reason: "an implicit association: one per row of " + mappedClass.table };
        }
        return classMapping;
    });
    const tellPropertiesStep = getGuessPhaseStep(tellStep, 1, mappingPhaseCount);
    tellPropertiesStep("reading the properties of the ontologies and of the vocabularies of base");
    const propertyByIri = await readAvailableProperties(preparedSource, { user: userInfo, userSources: userSources });
    const propertyLines = Object.entries(propertyByIri).map(([propertyIri, property]) => "- <" + propertyIri + "> " + property.label + (property.range ? ", range " + property.range : "") + ", in " + property.source);
    const propertiesText = propertyLines.join("\n");
    const tellColumnsStep = getGuessPhaseStep(tellStep, 2, mappingPhaseCount);
    const columnEvidencesByTable = {};
    classMappings.forEach(function (classMapping) {
        if (!columnsByTable[classMapping.table]) {
            classMapping.error = "no table " + classMapping.table + " in the database";
        }
    });
    const modelledMappings = classMappings.filter((classMapping) => !classMapping.isImplicit && !classMapping.error);
    for (const [mappingIndex, classMapping] of modelledMappings.entries()) {
        tellColumnsStep("reading the columns of " + classMapping.table + ", table " + (mappingIndex + 1) + "/" + modelledMappings.length);
        if (!columnEvidencesByTable[classMapping.table]) {
            columnEvidencesByTable[classMapping.table] = await readColumnEvidence(connection, clientDriver, classMapping.table, columnsByTable[classMapping.table]);
        }
    }
    const classAnchors = describeClassAnchors(classGuessList);
    const tellModelStep = getGuessPhaseStep(tellStep, 3, mappingPhaseCount);
    let answeredCount = 0;
    tellModelStep("the model maps the columns of " + modelledMappings.length + " classes, about a minute each, three at a time");
    await async.eachLimit(modelledMappings, parallelModelCallCount, async function (classMapping) {
        await guessClassMapping(classMapping, classAnchors.anchorTexts[classMapping.classLabel], classGuesses.masterDataGuess.domain, columnEvidencesByTable[classMapping.table], propertiesText, propertyByIri);
        answeredCount++;
        tellModelStep("the model mapped " + answeredCount + "/" + modelledMappings.length + " classes, the last " + classMapping.classLabel);
    });
    const mappingGuess = {
        classMappings: classMappings,
        classesWithoutTables: classesWithoutTables,
        entriesGuessedFrom: getEntriesGuessedFrom(classGuessList),
        model: keyDetectionModelId,
        guessedAt: new Date().toISOString(),
    };
    // read again: decisions taken while the model worked are kept
    const savedAiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    if (!savedAiKeys) {
        return { error: "the keys of this database were deleted while the model worked" };
    }
    savedAiKeys.mappingGuess = mappingGuess;
    await writeMappingAiKeys(source, databaseId, savedAiKeys);
    return { mappingGuess };
}

// the option a column choice names: one of the AI by optionIndex, or one given by the user, checked as an option of the
// model is; { columnMapping, unmappedColumn, option, optionIndex } or { error }
function readColumnChoice(classMapping, columnChoice, propertyByIri) {
    const columnMapping = classMapping.columnMappings.find((candidateMapping) => candidateMapping.columns.join(", ") == columnChoice.columns);
    if (!columnChoice.option) {
        if (!columnMapping || !columnMapping.options[columnChoice.optionIndex]) {
            const noOptionError = "no option " + columnChoice.optionIndex + " for the columns " + JSON.stringify(columnChoice.columns) + " of " + classMapping.classLabel;
            return { error: noOptionError };
        }
        return { columnMapping: columnMapping, optionIndex: columnChoice.optionIndex };
    }
    // a column the model left out can be mapped by the user
    const unmappedColumn = columnMapping ? null : classMapping.unmappedColumns.find((candidateColumn) => candidateColumn.column == columnChoice.columns);
    if (!columnMapping && !unmappedColumn) {
        const noColumnError = JSON.stringify(columnChoice.columns) + ": no column of " + classMapping.table;
        return { error: noColumnError };
    }
    const evidences = columnMapping ? columnMapping.evidences : [unmappedColumn.evidence];
    const option = readMappingOption(columnChoice.option, classMapping, evidences, propertyByIri);
    // an option of the user is valid or refused, never kept with a problem as one of the model is
    if (option.problem) {
        return { error: columnChoice.columns + ": " + option.problem };
    }
    if (option.kind == "newProperty" && !option.newPropertyName) {
        return { error: "name the new property" };
    }
    option.probability = null;
    option.detail = "chosen by the user";
    return { columnMapping: columnMapping, unmappedColumn: unmappedColumn, option: option };
}

// a class mapping applied with the instance and the option chosen for each column on its card, or undone; { summary,
// entryLabel } or { error }
async function changeGuessMapping(guess, changeName, changeInput, preparedSource, userContext) {
    const classLabel = readText(changeInput.classLabel);
    const classMapping = guess.classMappings.find((candidateMapping) => candidateMapping.classLabel == classLabel);
    if (!classMapping) {
        const noClassError = "no class " + JSON.stringify(classLabel) + " in the mapping guess, name it as the guess does";
        return { error: noClassError };
    }
    if (changeName == "undo_class_mapping") {
        if (!classMapping.decision) {
            const notAppliedError = "the mapping of " + classLabel + " is not applied";
            return { error: notAppliedError };
        }
        classMapping.decision = null;
        // what the user added goes: the options made by hand, the columns mapped from the unmapped ones go back there
        classMapping.columnMappings.forEach(function (columnMapping) {
            columnMapping.decision = null;
            columnMapping.options = columnMapping.options.filter((option) => option.probability !== null);
        });
        const columnsMappedByHand = classMapping.columnMappings.filter((columnMapping) => columnMapping.unmappedReason !== undefined);
        columnsMappedByHand.forEach(function (columnMapping) {
            classMapping.unmappedColumns.push({ column: columnMapping.columns[0], reason: columnMapping.unmappedReason, evidence: columnMapping.evidences[0] });
        });
        classMapping.columnMappings = classMapping.columnMappings.filter((columnMapping) => columnMapping.unmappedReason === undefined);
        const undoneSummary = "mapping of " + classLabel + " undone";
        return { summary: undoneSummary, entryLabel: classLabel };
    }
    const instance = changeInput.instance || classMapping.instance;
    if (!instance) {
        const noInstanceError = "the model gave no mapping for " + classLabel + ": give the instance";
        return { error: noInstanceError };
    }
    const mappedColumns = classMapping.columnMappings.flatMap((columnMapping) => columnMapping.columns);
    const unmappedColumnNames = classMapping.unmappedColumns.map((unmappedColumn) => unmappedColumn.column);
    const tableColumns = mappedColumns.concat(unmappedColumnNames);
    const identifierColumns = Array.isArray(instance.identifierColumns) ? instance.identifierColumns : [];
    const namedColumns = identifierColumns.concat(instance.labelColumn ? [instance.labelColumn] : []);
    const unknownColumns = namedColumns.filter((column) => !tableColumns.includes(column));
    if (unknownColumns.length > 0) {
        const unknownColumnsError = unknownColumns.join(", ") + ": no column of " + classMapping.table;
        return { error: unknownColumnsError };
    }
    if (!uriTypes.includes(instance.uriType)) {
        const uriTypeError = "the uriType is one of " + uriTypes.join(", ");
        return { error: uriTypeError };
    }
    const columnChoices = Array.isArray(changeInput.columnChoices) ? changeInput.columnChoices : [];
    const choiceColumns = columnChoices.map((columnChoice) => columnChoice.columns);
    const repeatedColumns = choiceColumns.find((columns, choiceIndex) => choiceColumns.indexOf(columns) != choiceIndex);
    if (repeatedColumns) {
        const repeatedChoiceError = "one choice per column: " + repeatedColumns + " is given twice";
        return { error: repeatedChoiceError };
    }
    const hasUserProperty = columnChoices.some((columnChoice) => columnChoice.option?.kind == "existingProperty");
    const propertyByIri = hasUserProperty ? await readAvailableProperties(preparedSource, userContext) : {};
    // every choice read before any is written: one wrong choice leaves the mapping as it was
    const readChoices = columnChoices.map((columnChoice) => readColumnChoice(classMapping, columnChoice, propertyByIri));
    const wrongChoice = readChoices.find((readChoice) => readChoice.error);
    if (wrongChoice) {
        return { error: wrongChoice.error };
    }
    readChoices.forEach(function (readChoice) {
        let columnMapping = readChoice.columnMapping;
        if (readChoice.unmappedColumn) {
            columnMapping = {
                columns: [readChoice.unmappedColumn.column],
                reason: "",
                evidences: [readChoice.unmappedColumn.evidence],
                options: [],
                decision: null,
                unmappedReason: readChoice.unmappedColumn.reason,
            };
            classMapping.columnMappings.push(columnMapping);
            classMapping.unmappedColumns = classMapping.unmappedColumns.filter((unmappedColumn) => unmappedColumn != readChoice.unmappedColumn);
        }
        let optionIndex = readChoice.optionIndex;
        if (readChoice.option) {
            // the same choice made again takes the option it added before
            const optionFields = ["kind", "propertyIri", "newPropertyName", "onClass", "range", "dateFormat"];
            optionIndex = columnMapping.options.findIndex((existingOption) => optionFields.every((optionField) => existingOption[optionField] == readChoice.option[optionField]));
            if (optionIndex < 0) {
                columnMapping.options.push(readChoice.option);
                optionIndex = columnMapping.options.length - 1;
            }
        }
        columnMapping.decision = { optionIndex: optionIndex };
    });
    classMapping.decision = {
        instance: {
            identifierColumns: identifierColumns,
            uriType: instance.uriType,
            prefixURI: readText(instance.prefixURI),
            suffixURI: readText(instance.suffixURI),
            labelColumn: instance.labelColumn || null,
        },
    };
    const appliedSummary = "mapping of " + classLabel + " applied";
    return { summary: appliedSummary, entryLabel: classLabel };
}

export { guessMapping, changeGuessMapping, mappingChangeNames, readAvailableProperties };
