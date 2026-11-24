import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { databaseModel } from "../../../model/databases.js";
import { askKeyModel, describeKeyedDatabase, keyDetectionModelId, getKeyDetection, writeMappingAiKeys, readDatabaseSchema, addAiKeysToSchema, aiForeignKeyPrefix } from "./keyDetection.js";
import { describeDecidedMasterData, describeGuessedDatabase, layOutReadings, readGuessedEntries, classifyClasses, findByLabel, findParentOption, getPropertySource, getGuessEntries } from "./masterData.js";
import { getPreparedSource, getNotPreparedError } from "./sourcePreparation.js";
import { getTermIri } from "../ontologyFromDb/mappings/mappingAnswer.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const linkClassesGuessPromptPath = join(currentDirectory, "prompts/link_classes_guess.md");
const linkPropertiesPromptPath = join(currentDirectory, "prompts/link_properties.md");
const maxPropertyOptions = 3;

// the label of the decided class of one step 1 or 2 entry, as the links graph of the client draws it
function getDecidedClassLabel(guessEntry, guess) {
    const decision = guessEntry.decision || { readingIndex: 0 };
    const reading = guessEntry.readings ? guessEntry.readings[decision.readingIndex] : null;
    if (!reading) {
        return guessEntry.label;
    }
    const classification = guess.classificationByClass?.[reading.classKey] || guessEntry.classification;
    if (!classification) {
        return guessEntry.label;
    }
    return classification.classKind == "newClass" || classification.classKind == "existingClass" ? classification.classLabel : guessEntry.label;
}

// the decided entries of the steps 1 and 2, as { guess, entries } pairs
function getDecidedGuessEntries(masterDataGuess, importantClassesGuess) {
    return [{ guess: masterDataGuess, entries: masterDataGuess.masterData }, { guess: importantClassesGuess, entries: importantClassesGuess.importantClasses }];
}

// the tables holding each decided class, one object per class label, { label: [tables] }; the model writes the tables
// exactly as the description names them and only after checking they exist
function readClassTables(answeredClassTables, columnsByTable, decidedGuesses) {
    const classTables = {};
    const decidedEntries = decidedGuesses.flatMap((decidedGuess) => decidedGuess.entries.map((entry) => ({ entry: entry, guess: decidedGuess.guess })));
    (Array.isArray(answeredClassTables) ? answeredClassTables : []).forEach(function (answeredClassTable) {
        const found = decidedEntries.find((decidedEntry) => findByLabel([decidedEntry.entry], readText(answeredClassTable?.class)));
        if (!found) {
            return;
        }
        const classLabel = getDecidedClassLabel(found.entry, found.guess);
        const tables = (Array.isArray(answeredClassTable.tables) ? answeredClassTable.tables : [])
            .map((tableName) => String(tableName).trim())
            .filter((tableName) => Object.hasOwn(columnsByTable, tableName));
        const existingTables = classTables[classLabel] || [];
        if (tables.length > 0) {
            classTables[classLabel] = existingTables.concat(tables.filter((table) => !existingTables.includes(table)));
        }
    });
    return classTables;
}

// an event class without a table is no link of anyone: its tables are validated, then the tables already held by a
// decided class or by another event drop out
function attachEventTables(eventClasses, answeredEvents, columnsByTable, classTables) {
    const tablesHeldByClasses = new Set();
    Object.values(classTables).forEach(function (classTablesOfSource) {
        classTablesOfSource.forEach((table) => tablesHeldByClasses.add(table));
    });
    const takenEventTables = new Set();
    eventClasses.forEach(function (eventClass) {
        const answeredEvent = findByLabel(answeredEvents, eventClass.label);
        const writtenTables = Array.isArray(answeredEvent?.tables) ? answeredEvent.tables : [];
        const tables = [];
        writtenTables.forEach(function (tableName) {
            const trimmedTable = String(tableName || "").trim();
            if (trimmedTable && Object.hasOwn(columnsByTable, trimmedTable) && !tablesHeldByClasses.has(trimmedTable) && !takenEventTables.has(trimmedTable)) {
                tables.push(trimmedTable);
            }
        });
        if (tables.length > 0) {
            eventClass.tables = tables;
            tables.forEach((table) => takenEventTables.add(table));
        }
    });
    return eventClasses.filter((eventClass) => eventClass.tables);
}

// one link per foreign key between the tables of the classes, grouped by constraint so that a composite key stays one link
function computeLinks(schema, aiKeys, classTables, eventClasses) {
    const { schema: schemaWithAiKeys } = addAiKeysToSchema(schema, aiKeys);
    const keyGroups = {};
    schemaWithAiKeys.foreignKeys.forEach(function (keyColumn) {
        const groupKey = keyColumn.table_name + "|" + keyColumn.constraint_name;
        if (!keyGroups[groupKey]) {
            keyGroups[groupKey] = {
                table: keyColumn.table_name,
                constraintName: keyColumn.constraint_name,
                foundInData: String(keyColumn.constraint_name || "").startsWith(aiForeignKeyPrefix),
                columns: [],
                referencedTable: keyColumn.referenced_table,
                referencedColumns: [],
            };
        }
        const keyGroup = keyGroups[groupKey];
        if (!keyGroup.columns.includes(keyColumn.column_name)) {
            keyGroup.columns.push(keyColumn.column_name);
        }
        const referencedColumn = String(keyColumn.referenced_column || "");
        if (referencedColumn && !keyGroup.referencedColumns.includes(referencedColumn)) {
            keyGroup.referencedColumns.push(referencedColumn);
        }
    });
    const classByTable = {};
    Object.entries(classTables).forEach(function ([classLabel, tables]) {
        tables.forEach((table) => (classByTable[table] = { label: classLabel, isEvent: false }));
    });
    eventClasses.forEach((eventClass) => (eventClass.tables || []).forEach((table) => (classByTable[table] = { label: eventClass.label, isEvent: true })));
    const links = [];
    const seenLinkIds = new Set();
    Object.values(keyGroups).forEach(function (keyGroup) {
        const fromClass = classByTable[keyGroup.table];
        const toClass = classByTable[keyGroup.referencedTable];
        if (!fromClass || !toClass) {
            return;
        }
        // two tables of one class, as a customer and the person row it extends: the key joins the class to itself,
        // no link; a table pointing at itself stays one, as an employee and its manager
        if (fromClass.label == toClass.label && keyGroup.table != keyGroup.referencedTable) {
            return;
        }
        const columnsText = keyGroup.columns.join(", ");
        const referencedColumnsText = keyGroup.referencedColumns.join(", ");
        const linkId = keyGroup.table + ".(" + columnsText + ")->" + keyGroup.referencedTable + ".(" + referencedColumnsText + ")";
        if (seenLinkIds.has(linkId)) {
            return;
        }
        seenLinkIds.add(linkId);
        const viaEvent = fromClass.isEvent ? fromClass.label : toClass.isEvent ? toClass.label : null;
        links.push({
            id: linkId,
            fromClass: fromClass.label,
            toClass: toClass.label,
            viaEvent: viaEvent,
            foreignKey: {
                table: keyGroup.table,
                columns: keyGroup.columns,
                referencedTable: keyGroup.referencedTable,
                referencedColumns: keyGroup.referencedColumns,
                foundInData: keyGroup.foundInData,
            },
            propertyOptions: [],
            cardinality: "",
            reason: "",
            decision: null,
        });
    });
    return links;
}

// the object properties only of the upper ontology model text, keeping its prefixes
function getObjectPropertiesText(modelText) {
    const textBlocks = String(modelText || "").split("\n## ");
    const propertiesTextBlocks = [];
    textBlocks.forEach(function (textBlock, blockIndex) {
        if (blockIndex == 0) {
            return;
        }
        const propertiesStart = textBlock.indexOf("### Object properties");
        if (propertiesStart > -1) {
            propertiesTextBlocks.push("## " + textBlock.slice(propertiesStart));
        }
    });
    return propertiesTextBlocks.join("\n");
}

// the text of what the decided classes and the event classes are under: the first reading of an entry, as the client
// draws them, from the class of the reading or the decision chosen; { [classLabel]: "is ... / subClassOf ..." }
function describeClassAnchors(guessEntriesByGuess) {
    const classAnchors = {};
    guessEntriesByGuess.forEach(function (guessEntriesAndGuess) {
        const guess = guessEntriesAndGuess.guess;
        guessEntriesAndGuess.entries.forEach(function (entry) {
            const classLabel = getDecidedClassLabel(entry, guess);
            if (classLabel == entry.label && entry.label in classAnchors) {
                return;
            }
            if (classLabel in classAnchors) {
                return;
            }
            const reading = entry.readings ? entry.readings[0] : null;
            if (!reading) {
                return;
            }
            const classification = guess.classificationByClass?.[reading.classKey] || entry.classification;
            if (!classification || classification.classKind == "unclassified") {
                return;
            }
            if (classification.classKind == "existingClass") {
                classAnchors[classLabel] = "is the upper class " + classification.classLabel;
                return;
            }
            const chosenParent = entry.decision ? findParentOption(classification.parentOptions, entry.decision.superClassId) : null;
            if (chosenParent) {
                classAnchors[classLabel] = "subClassOf " + chosenParent.parentLabel;
            } else if (classification.parentOptions.length > 0) {
                classAnchors[classLabel] = "not chosen yet, likely " + classification.parentOptions[0].parentLabel;
            }
        });
    });
    return classAnchors;
}

// the options of the links: each link keeps the options the model named, valid in one of the upper ontologies, in the
// order the model wrote them, at most maxPropertyOptions; the cardinality of each link is read from the answer too
function readPropertyOptions(links, answeredLinks, preparedSource) {
    const answeredByLinkIndex = {};
    (Array.isArray(answeredLinks) ? answeredLinks : []).forEach(function (answeredLink) {
        if (answeredLink && answeredLink.link > 0) {
            answeredByLinkIndex[answeredLink.link] = answeredLink;
        }
    });
    links.forEach(function (link, linkIndex) {
        const answeredLink = answeredByLinkIndex[linkIndex + 1] || {};
        const options = [];
        (Array.isArray(answeredLink.options) ? answeredLink.options : []).slice(0, maxPropertyOptions).forEach(function (option) {
            const propertyIri = getTermIri(readText(option.property), preparedSource.modelPrefixes);
            const propertySource = propertyIri ? getPropertySource(preparedSource, propertyIri) : null;
            const property = propertySource ? preparedSource.ontologyModels[propertySource].properties[propertyIri] : null;
            if (!propertySource || !property) {
                return;
            }
            options.push({
                propertyIri: propertyIri,
                propertyLabel: property.label || propertyIri,
                propertySource: propertySource,
                reason: readText(option.reason),
                probability: Math.min(100, Math.max(0, Number(option.probability) || 0)),
                inverse: Boolean(option.inverse),
            });
        });
        link.propertyOptions = options;
        link.cardinality = readText(answeredLink.cardinality);
    });
}

function readText(value) {
    const text = typeof value == "string" ? value.trim() : "";
    return text;
}

// pass 2: the property options of every link, by the object properties of the upper ontologies
async function guessLinkProperties(links, classAnchors, domain, preparedSource, tellStep) {
    if (links.length == 0) {
        return null;
    }
    const linkLines = links.map(function (link, linkIndex) {
        const foreignKeyColumns = link.foreignKey.columns.map((column, columnIndex) => link.foreignKey.table + "." + column + " -> " + link.foreignKey.referencedTable + "." + link.foreignKey.referencedColumns[columnIndex]);
        const linkLine =
            "Link " +
            (linkIndex + 1) +
            ": " +
            link.fromClass +
            (link.viaEvent ? " (event class " + link.viaEvent + ")" : "") +
            " -> " +
            link.toClass +
            (link.viaEvent ? ", participation of " + link.viaEvent : "") +
            ", foreign key " +
            foreignKeyColumns.join("; ") +
            (link.foreignKey.foundInData ? ", found in the data" : "");
        const anchorLines = [classAnchors[link.fromClass], classAnchors[link.toClass]].filter(Boolean);
        return anchorLines.length > 0 ? linkLine + "\n" + anchorLines.map((anchorLine) => "  " + anchorLine).join("\n") : linkLine;
    });
    const propertiesText = getObjectPropertiesText(preparedSource.modelText);
    const linkPropertiesPrompt = readFileSync(linkPropertiesPromptPath, "utf8") + "\n\n# Upper ontologies, most abstract first\n\n" + propertiesText + "\n\n# Domain\n\n" + domain + "\n\n# Links\n\n" + linkLines.join("\n\n") + "\n";
    tellStep("the model proposes the properties of the upper ontologies for the links, about a minute");
    const answer = await askKeyModel(linkPropertiesPrompt);
    if (answer.error) {
        return { error: answer.error };
    }
    readPropertyOptions(links, answer.answer?.links, preparedSource);
    return null;
}

// { linksGuess } or { error }, step 3 of the workflow: the event classes of the business around the decided classes,
// then the links between every pair of classes they join, each with the properties of the upper ontologies
async function guessLinks(source, databaseId, userInfo, tellStep) {
    const aiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    const masterDataGuess = aiKeys?.masterDataGuess;
    const importantClassesGuess = aiKeys?.importantClassesGuess;
    if (!masterDataGuess) {
        return { error: "the master data of this database are not guessed" };
    }
    if (!importantClassesGuess) {
        return { error: "the important classes of this database are not guessed" };
    }
    const decidedMasterData = describeDecidedMasterData(masterDataGuess);
    if (decidedMasterData.error) {
        return { error: decidedMasterData.error };
    }
    const decidedImportantClasses = describeDecidedMasterData(importantClassesGuess, "important class");
    if (decidedImportantClasses.error) {
        return { error: decidedImportantClasses.error };
    }
    const preparedSource = await getPreparedSource(source);
    if (!preparedSource) {
        return { error: getNotPreparedError(source) };
    }
    const { database, connection, schema, columnsByTable } = await readDatabaseSchema(databaseId, userInfo);
    const clientDriver = databaseModel.getClientDriver(database.driver);
    const domain = masterDataGuess.domain;
    const tellGuessStep = tellStep;
    const decidedLines = decidedMasterData.decidedLines.concat(decidedImportantClasses.decidedLines);
    const decidedClasses = decidedMasterData.decidedClasses.concat(decidedImportantClasses.decidedClasses);
    const decidedGuessEntries = getDecidedGuessEntries(masterDataGuess, importantClassesGuess);
    // pass 1: the tables of the decided classes, the event classes, their evidence
    const linkClassesPrompt =
        readFileSync(linkClassesGuessPromptPath, "utf8") +
        "\n\n# Domain\n\n" +
        domain +
        "\n\n# Decided master data\n\n" +
        decidedMasterData.decidedLines.join("\n") +
        "\n\n# Decided important classes\n\n" +
        decidedImportantClasses.decidedLines.join("\n") +
        "\n\n# Why the user decided them\n\n" +
        (decidedMasterData.changeLogLines.concat(decidedImportantClasses.changeLogLines).length > 0
            ? decidedMasterData.changeLogLines.concat(decidedImportantClasses.changeLogLines).join("\n")
            : "decided on the cards, no discussion") +
        "\n\n# Database\n\n" +
        describeGuessedDatabase(database, schema, columnsByTable, aiKeys);
    tellGuessStep("the model names the tables of the classes and the event classes, about a minute");
    const classesAnswer = await askKeyModel(linkClassesPrompt);
    if (classesAnswer.error) {
        return { error: classesAnswer.error };
    }
    const classTables = readClassTables(classesAnswer.answer?.classTables, columnsByTable, decidedGuessEntries);
    const answeredEvents = Array.isArray(classesAnswer.answer?.eventClasses) ? classesAnswer.answer.eventClasses : [];
    const eventClasses = await readGuessedEntries(answeredEvents, connection, clientDriver, tellGuessStep);
    attachEventTables(eventClasses, answeredEvents, columnsByTable, classTables);
    // pass 2 happens below, after the links are computed: the tables of the events exclude the decided ones
    await layOutReadings(eventClasses, domain, tellGuessStep);
    const classified = await classifyClasses(source, domain, eventClasses, decidedClasses, preparedSource, tellGuessStep);
    if (classified.error) {
        return { error: classified.error };
    }
    eventClasses.forEach((eventClass) => (eventClass.classification = classified.classificationByLabel[eventClass.readings[0].classKey]));
    // pass 2: the links between the classes, then the properties of each link under the upper ontologies
    const links = computeLinks(schema, aiKeys, classTables, eventClasses);
    const classAnchors = describeClassAnchors([
        { guess: masterDataGuess, entries: masterDataGuess.masterData },
        { guess: importantClassesGuess, entries: importantClassesGuess.importantClasses },
        { guess: { classificationByClass: classified.classificationByLabel }, entries: eventClasses },
    ]);
    const propertiesError = await guessLinkProperties(links, classAnchors, domain, preparedSource, tellGuessStep);
    if (propertiesError) {
        return propertiesError;
    }
    const decisionsByClass = {};
    [masterDataGuess, importantClassesGuess].forEach(function (guess) {
        getGuessEntries(guess).forEach((guessEntry) => {
            if (guessEntry.decision) {
                decisionsByClass[guessEntry.label] = guessEntry.decision;
            }
        });
    });
    const linksGuess = {
        eventClasses: eventClasses,
        classTables: classTables,
        links: links,
        classificationByClass: classified.classificationByLabel,
        decisionsByClass: decisionsByClass,
        model: keyDetectionModelId,
        guessedAt: new Date().toISOString(),
    };
    // read again: decisions taken while the model worked are kept
    const savedAiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    savedAiKeys.linksGuess = linksGuess;
    await writeMappingAiKeys(source, databaseId, savedAiKeys);
    return { linksGuess };
}

export { guessLinks };
