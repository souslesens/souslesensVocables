import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { databaseModel } from "../../../model/databases.js";
import { askKeyModel, keyDetectionModelId, getKeyDetection, writeMappingAiKeys, readDatabaseSchema, addAiKeysToSchema, aiForeignKeyPrefix } from "./keyDetection.js";
import { getGuessPhaseStep, describeDecidedMasterData, describeGuessedDatabase, layOutReadings, readGuessedEntries, classifyClasses, findByLabel, findParentOption, getPropertySource, getGuessEntries } from "./masterData.js";
import { getPreparedSource, getNotPreparedError } from "./sourcePreparation.js";
import { getTermIri } from "../ontologyFromDb/mappings/mappingAnswer.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const eventsGuessPromptPath = join(currentDirectory, "prompts/events_guess.md");
const linkPropertiesPromptPath = join(currentDirectory, "prompts/link_properties.md");
// per superclass assumed: an undecided class gets the options of each of its alternatives
const maxPropertyOptions = 3;

// the label of the class of one entry, as the links graph of the client draws it: the class of its decided reading, the
// first one while undecided
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

// what each entry of the guesses a step was built from was, by entry label: its class label and its decision; the
// client compares them with the current entries to tell the step is outdated, a rename or a removal included
function getEntriesGuessedFrom(guesses) {
    const entriesGuessedFrom = {};
    guesses.forEach(function (guess) {
        getGuessEntries(guess).forEach((guessEntry) => {
            const decision = guessEntry.decision || {};
            entriesGuessedFrom[guessEntry.label] = { classLabel: getDecidedClassLabel(guessEntry, guess), readingIndex: decision.readingIndex ?? null, superClassId: decision.superClassId ?? null };
        });
    });
    return entriesGuessedFrom;
}

// the tables holding each class of steps 1 and 2, one object per class label, { label: [tables] }: those the entries
// were guessed with, then those the model names for the entries of a guess saved without them
function readClassTables(answeredClassTables, columnsByTable, masterDataGuess, importantClassesGuess) {
    const classTables = {};
    const stepEntries = [];
    [masterDataGuess, importantClassesGuess].forEach((guess) => getGuessEntries(guess).forEach((entry) => stepEntries.push({ entry: entry, guess: guess })));
    stepEntries.forEach(function (stepEntry) {
        const classLabel = getDecidedClassLabel(stepEntry.entry, stepEntry.guess);
        const existingTables = classTables[classLabel] || [];
        const entryTables = stepEntry.entry.tables || [];
        classTables[classLabel] = existingTables.concat(entryTables.filter((table) => !existingTables.includes(table)));
    });
    (Array.isArray(answeredClassTables) ? answeredClassTables : []).forEach(function (answeredClassTable) {
        const found = stepEntries.find((stepEntry) => findByLabel([stepEntry.entry], readText(answeredClassTable?.class)));
        if (!found) {
            return;
        }
        const classLabel = getDecidedClassLabel(found.entry, found.guess);
        const answeredTables = Array.isArray(answeredClassTable.tables) ? answeredClassTable.tables : [];
        const trimmedTables = answeredTables.map((tableName) => String(tableName).trim());
        const tables = trimmedTables.filter((tableName) => Object.hasOwn(columnsByTable, tableName));
        const existingTables = classTables[classLabel] || [];
        classTables[classLabel] = existingTables.concat(tables.filter((table) => !existingTables.includes(table)));
    });
    // a class without tables takes part in no link
    Object.keys(classTables).forEach(function (classLabel) {
        if (classTables[classLabel].length == 0) {
            delete classTables[classLabel];
        }
    });
    return classTables;
}

// the tables and columns carrying each class of step 3: an explicit one keeps the existing tables, one listed for a class
// of steps 1 and 2 included; a table two associations claim goes to neither and is named in contestedTables; an implicit
// one keeps the columns of a table of a class. A class carried by nothing stays, marked hasNoData, with no link
function attachEventSupports(eventClasses, answeredEvents, columnsByTable, classTables) {
    const tablesHeldByClasses = new Set();
    Object.values(classTables).forEach(function (classTablesOfSource) {
        classTablesOfSource.forEach((table) => tablesHeldByClasses.add(table));
    });
    const writtenTablesByEvent = {};
    const claimCountByTable = {};
    eventClasses.forEach(function (eventClass) {
        const answeredEvent = answeredEvents.find((candidateEvent) => readText(candidateEvent?.label).toLowerCase() == eventClass.label.toLowerCase());
        const writtenTables = (Array.isArray(answeredEvent?.tables) ? answeredEvent.tables : []).map((tableName) => String(tableName || "").trim());
        const existingTables = writtenTables.filter((tableName) => Object.hasOwn(columnsByTable, tableName));
        writtenTablesByEvent[eventClass.label] = existingTables;
        existingTables.forEach((tableName) => (claimCountByTable[tableName] = (claimCountByTable[tableName] || 0) + 1));
        const writtenColumns = Array.isArray(answeredEvent?.columns) ? answeredEvent.columns : [];
        const columns = [];
        writtenColumns.forEach(function (tableColumn) {
            const trimmedTableColumn = String(tableColumn || "").trim();
            const [tableName, columnName] = trimmedTableColumn.split(".");
            const isClassColumn = tablesHeldByClasses.has(tableName) && (columnsByTable[tableName] || []).some((column) => column.column_name == columnName);
            if (isClassColumn) {
                columns.push(tableName + "." + columnName);
            }
        });
        eventClass.columns = columns;
        const answeredJoins = Array.isArray(answeredEvent?.joins) ? answeredEvent.joins : [];
        const joins = answeredJoins.map(readText);
        eventClass.joins = joins.filter(Boolean);
    });
    eventClasses.forEach(function (eventClass) {
        const existingTables = writtenTablesByEvent[eventClass.label];
        const tables = existingTables.filter((tableName) => claimCountByTable[tableName] == 1);
        const contestedTables = existingTables.filter((tableName) => claimCountByTable[tableName] > 1);
        if (tables.length > 0) {
            eventClass.tables = tables;
            delete eventClass.columns;
        } else {
            delete eventClass.tables;
        }
        if (!eventClass.tables && eventClass.columns.length == 0) {
            delete eventClass.columns;
            eventClass.hasNoData = true;
        }
        if (contestedTables.length > 0) {
            eventClass.contestedTables = contestedTables;
        }
    });
}

// the foreign keys of the schema and of the AI keys, one group per constraint so that a composite key stays one link
function getForeignKeyGroups(schema, aiKeys) {
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
    return Object.values(keyGroups);
}

function getNewLink(linkId, fromClass, toClass, viaEvent) {
    const link = { id: linkId, fromClass: fromClass, toClass: toClass, viaEvent: viaEvent, foreignKey: null, rowColumns: null, sameRowTable: null, propertyOptions: [], cardinality: "", inverseCardinality: "", reason: "", decision: null };
    return link;
}

// one link per foreign key between the classes of its tables, named by the class label as every class. An implicit
// association takes the foreign keys among its columns. viaEvent names the association entry, removed with it
function computeLinks(schema, aiKeys, eventsGuess) {
    const classesByTable = {};
    const mainClassesByTable = {};
    const addTableClass = function (table, tableClass, isMainTable) {
        classesByTable[table] = (classesByTable[table] || []).concat([tableClass]);
        if (isMainTable) {
            mainClassesByTable[table] = (mainClassesByTable[table] || []).concat([tableClass]);
        }
    };
    // the rows of the main table of an association are associations: a class of steps 1 and 2 listing it first is only
    // named in them, and has no main table
    const associationMainTables = new Set();
    const associationTables = new Set();
    const classCountByTable = {};
    eventsGuess.eventClasses.forEach(function (eventClass) {
        if (eventClass.tables) {
            associationMainTables.add(eventClass.tables[0]);
        }
        (eventClass.tables || []).forEach(function (table) {
            associationTables.add(table);
            classCountByTable[table] = (classCountByTable[table] || 0) + 1;
        });
    });
    Object.values(eventsGuess.classTables).forEach(function (tables) {
        tables.forEach((table) => (classCountByTable[table] = (classCountByTable[table] || 0) + 1));
    });
    // a class with no table of its own, as a work center listed with the equipment and location tables naming it in a
    // column, is only named in their rows: main table of none
    const classesWithOwnTable = new Set();
    Object.entries(eventsGuess.classTables).forEach(function ([classLabel, tables]) {
        if (tables.some((table) => classCountByTable[table] == 1)) {
            classesWithOwnTable.add(classLabel);
        }
    });
    Object.entries(eventsGuess.classTables).forEach(function ([classLabel, tables]) {
        tables.forEach(function (table, tableIndex) {
            const isMainTable = tableIndex == 0 && classesWithOwnTable.has(classLabel) && !associationMainTables.has(table);
            addTableClass(table, { label: classLabel, eventLabel: null }, isMainTable);
        });
    });
    // a table no such class lists first, as a navigator export listed last by the functional location, goes to the
    // classes with a table of their own listing it; one listed by none of them stays to all its classes
    Object.entries(classesByTable).forEach(function ([table, tableClasses]) {
        if (mainClassesByTable[table] || associationTables.has(table)) {
            return;
        }
        const ownerClasses = tableClasses.filter((tableClass) => classesWithOwnTable.has(tableClass.label));
        if (ownerClasses.length > 0) {
            mainClassesByTable[table] = ownerClasses;
        }
    });
    const implicitEventByColumn = {};
    eventsGuess.eventClasses.forEach(function (eventClass) {
        const eventTableClass = { label: getDecidedClassLabel(eventClass, eventsGuess), eventLabel: eventClass.label };
        (eventClass.tables || []).forEach((table, tableIndex) => addTableClass(table, eventTableClass, tableIndex == 0));
        (eventClass.columns || []).forEach((tableColumn) => (implicitEventByColumn[tableColumn] = eventTableClass));
    });
    // a key names a row, so the class whose main table it is; each class of a table main for none
    const getRowClasses = function (table) {
        const rowClasses = mainClassesByTable[table] || classesByTable[table] || [];
        return rowClasses;
    };
    const links = [];
    getForeignKeyGroups(schema, aiKeys).forEach(function (keyGroup) {
        const implicitEvent = implicitEventByColumn[keyGroup.table + "." + keyGroup.columns[0]];
        const fromClasses = implicitEvent ? [implicitEvent] : getRowClasses(keyGroup.table);
        const toClasses = getRowClasses(keyGroup.referencedTable);
        const isSharedKey = fromClasses.length > 1 || toClasses.length > 1;
        const foreignKeyId = keyGroup.table + ".(" + keyGroup.columns.join(", ") + ")->" + keyGroup.referencedTable + ".(" + keyGroup.referencedColumns.join(", ") + ")";
        fromClasses.forEach(function (fromClass) {
            toClasses.forEach(function (toClass) {
                // two tables of one class, as a customer and the person row it extends: the key joins the class to
                // itself, no link; a table pointing at itself stays one, as an employee and its manager
                if (fromClass.label == toClass.label && keyGroup.table != keyGroup.referencedTable) {
                    return;
                }
                const linkId = isSharedKey ? foreignKeyId + " " + fromClass.label + "->" + toClass.label : foreignKeyId;
                const link = getNewLink(linkId, fromClass.label, toClass.label, fromClass.eventLabel || toClass.eventLabel);
                link.foreignKey = {
                    table: keyGroup.table,
                    columns: keyGroup.columns,
                    referencedTable: keyGroup.referencedTable,
                    referencedColumns: keyGroup.referencedColumns,
                    foundInData: keyGroup.foundInData,
                };
                links.push(link);
            });
        });
    });
    eventsGuess.eventClasses.forEach(function (eventClass) {
        const columnsByEventTable = {};
        (eventClass.columns || []).forEach(function (tableColumn) {
            const tableName = tableColumn.split(".")[0];
            columnsByEventTable[tableName] = (columnsByEventTable[tableName] || []).concat([tableColumn]);
        });
        // an association read in several tables of one class gives one link per table
        const isEventInSeveralTables = Object.keys(columnsByEventTable).length > 1;
        Object.entries(columnsByEventTable).forEach(function ([tableName, rowColumns]) {
            getRowClasses(tableName).forEach(function (rowClass) {
                const eventLinkId = eventClass.label + "->" + rowClass.label + (isEventInSeveralTables ? " (" + tableName + ")" : "");
                const link = getNewLink(eventLinkId, getDecidedClassLabel(eventClass, eventsGuess), rowClass.label, eventClass.label);
                link.rowColumns = rowColumns;
                links.push(link);
            });
        });
    });
    // the other classes of a table hang on its main class through the row, unless a key of the table joins them already
    const keyJoinedPairs = new Set();
    links.forEach(function (link) {
        if (link.foreignKey) {
            keyJoinedPairs.add(link.foreignKey.table + "|" + link.fromClass + "|" + link.toClass);
        }
    });
    Object.entries(mainClassesByTable).forEach(function ([table, mainClasses]) {
        const otherClasses = classesByTable[table].filter((tableClass) => !mainClasses.some((mainClass) => mainClass.label == tableClass.label));
        mainClasses.forEach(function (mainClass) {
            otherClasses.forEach(function (otherClass) {
                if (keyJoinedPairs.has(table + "|" + mainClass.label + "|" + otherClass.label)) {
                    return;
                }
                const link = getNewLink(table + " row " + mainClass.label + "->" + otherClass.label, mainClass.label, otherClass.label, mainClass.eventLabel || otherClass.eventLabel);
                link.sameRowTable = table;
                links.push(link);
            });
        });
    });
    return links;
}

// what carries a link in the database, in one line
function describeLinkEvidence(link) {
    if (link.sameRowTable) {
        return "both in one row of " + link.sameRowTable;
    }
    if (link.rowColumns) {
        return "columns " + link.rowColumns.join(", ") + " of the row of " + link.toClass;
    }
    const foreignKey = link.foreignKey;
    const columnMatches = foreignKey.columns.map((column, columnIndex) => foreignKey.table + "." + column + " matches " + foreignKey.referencedTable + "." + foreignKey.referencedColumns[columnIndex]);
    const evidenceText = columnMatches.join(", ") + (foreignKey.foundInData ? " (found in the data)" : " (declared foreign key)");
    return evidenceText;
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

// what each class is under, by class label: anchorTexts its decided superclass, or every superclass it may still take,
// the alternatives the properties are proposed for, written as their options in parentOptionsByClass
function describeClassAnchors(guesses) {
    const anchorTexts = {};
    const parentOptionsByClass = {};
    guesses.forEach(function (guess) {
        getGuessEntries(guess).forEach(function (entry) {
            const classLabel = getDecidedClassLabel(entry, guess);
            if (classLabel in anchorTexts) {
                return;
            }
            const decision = entry.decision || { readingIndex: 0 };
            const reading = entry.readings ? entry.readings[decision.readingIndex] : null;
            if (!reading) {
                return;
            }
            const classification = guess.classificationByClass?.[reading.classKey] || entry.classification;
            if (!classification || classification.classKind == "unclassified") {
                return;
            }
            if (classification.classKind == "existingClass") {
                anchorTexts[classLabel] = classLabel + " is the upper class " + classification.classLabel;
                return;
            }
            const chosenParent = entry.decision ? findParentOption(classification.parentOptions, entry.decision.superClassId) : null;
            if (chosenParent) {
                anchorTexts[classLabel] = classLabel + " subClassOf " + chosenParent.parentLabel;
            } else if (classification.parentOptions.length > 0) {
                const optionTexts = classification.parentOptions.map((parentOption) => parentOption.parentLabel + " " + parentOption.probability + "%");
                anchorTexts[classLabel] = classLabel + " not decided, subClassOf one of: " + optionTexts.join(", ");
                parentOptionsByClass[classLabel] = classification.parentOptions;
            }
        });
    });
    return { anchorTexts, parentOptionsByClass };
}

// the class and the superclass an option assumes, as the guess writes them; null when the class is decided or the
// superclass is none of its options
function readAssumption(answeredAssumption, parentOptionsByClass) {
    const lowerCaseClass = readText(answeredAssumption?.class).toLowerCase();
    const assumedClass = Object.keys(parentOptionsByClass).find((classLabel) => classLabel.toLowerCase() == lowerCaseClass);
    const assumedParent = assumedClass ? findParentOption(parentOptionsByClass[assumedClass], readText(answeredAssumption.superClass)) : null;
    const assumption = assumedParent ? { class: assumedClass, superClass: assumedParent.parentLabel } : null;
    return assumption;
}

// the options of the links: each link keeps the options the model named, valid in one of the upper ontologies and, for
// an option assuming a superclass, valid among the options of its class, in the order the model wrote them, at most
// maxPropertyOptions per superclass assumed; the cardinality is read from the answer too
function readPropertyOptions(links, answeredLinks, preparedSource, parentOptionsByClass) {
    const answeredByLinkIndex = {};
    (Array.isArray(answeredLinks) ? answeredLinks : []).forEach(function (answeredLink) {
        if (answeredLink && answeredLink.link > 0) {
            answeredByLinkIndex[answeredLink.link] = answeredLink;
        }
    });
    links.forEach(function (link, linkIndex) {
        const answeredLink = answeredByLinkIndex[linkIndex + 1] || {};
        const options = [];
        const optionCountByAssumption = {};
        (Array.isArray(answeredLink.options) ? answeredLink.options : []).forEach(function (option) {
            const propertyIri = getTermIri(readText(option.property), preparedSource.modelPrefixes);
            const propertySource = propertyIri ? getPropertySource(preparedSource, propertyIri) : null;
            const property = propertySource ? preparedSource.ontologyModels[propertySource].properties[propertyIri] : null;
            if (!propertySource || !property) {
                return;
            }
            const assumption = option.assumes ? readAssumption(option.assumes, parentOptionsByClass) : null;
            if (option.assumes && !assumption) {
                return;
            }
            const assumptionKey = assumption ? assumption.class + "|" + assumption.superClass : "";
            optionCountByAssumption[assumptionKey] = (optionCountByAssumption[assumptionKey] || 0) + 1;
            if (optionCountByAssumption[assumptionKey] > maxPropertyOptions) {
                return;
            }
            const propertyOption = {
                propertyIri: propertyIri,
                propertyLabel: property.label || propertyIri,
                propertySource: propertySource,
                reason: readText(option.reason),
                probability: Math.min(100, Math.max(0, Number(option.probability) || 0)),
                inverse: Boolean(option.inverse),
            };
            if (assumption) {
                propertyOption.assumes = assumption;
            }
            options.push(propertyOption);
        });
        link.propertyOptions = options;
        const answeredCardinality = readText(answeredLink.cardinality).toLowerCase();
        const answeredInverseCardinality = readText(answeredLink.inverseCardinality).toLowerCase();
        link.cardinality = cardinalityWords.includes(answeredCardinality) ? answeredCardinality : "";
        link.inverseCardinality = cardinalityWords.includes(answeredInverseCardinality) ? answeredInverseCardinality : "";
    });
}

// the words link_properties.md asks for a cardinality
const cardinalityWords = ["one", "several"];

function readText(value) {
    const text = typeof value == "string" ? value.trim() : "";
    return text;
}

// the property options of every link, by the object properties of the upper ontologies, for each alternative of an
// undecided class
async function guessLinkProperties(links, classAnchors, domain, preparedSource, tellStep) {
    if (links.length == 0) {
        return null;
    }
    const linkLines = links.map(function (link, linkIndex) {
        const linkLine = "Link " + (linkIndex + 1) + ": " + link.fromClass + " -> " + link.toClass + (link.viaEvent ? ", participation in " + link.viaEvent : "") + ", " + describeLinkEvidence(link);
        const anchorLines = [classAnchors.anchorTexts[link.fromClass], classAnchors.anchorTexts[link.toClass]].filter(Boolean);
        const indentedAnchorLines = anchorLines.map((anchorLine) => "\n  " + anchorLine);
        const anchoredLinkLine = linkLine + indentedAnchorLines.join("");
        return anchoredLinkLine;
    });
    const propertiesText = getObjectPropertiesText(preparedSource.modelText);
    const linkPropertiesPrompt = readFileSync(linkPropertiesPromptPath, "utf8") + "\n\n# Upper ontologies, most abstract first\n\n" + propertiesText + "\n\n# Domain\n\n" + domain + "\n\n# Links\n\n" + linkLines.join("\n\n") + "\n";
    tellStep("the model proposes the properties of the upper ontologies for the links, about a minute");
    const answer = await askKeyModel(linkPropertiesPrompt);
    if (answer.error) {
        return { error: answer.error };
    }
    readPropertyOptions(links, answer.answer?.links, preparedSource, classAnchors.parentOptionsByClass);
    return null;
}

// { masterDataGuess, importantClassesGuess } or { error }: the guesses of steps 1 and 2 the next steps are built from
function getClassGuesses(aiKeys) {
    if (!aiKeys?.masterDataGuess) {
        return { error: "the master data of this database are not guessed" };
    }
    if (!aiKeys.importantClassesGuess) {
        return { error: "the important classes of this database are not guessed" };
    }
    return { masterDataGuess: aiKeys.masterDataGuess, importantClassesGuess: aiKeys.importantClassesGuess };
}

// { eventsGuess } or { error }, step 3 of the workflow: the tables of the classes of steps 1 and 2, then the event,
// process and association classes of the business joining them, explicit or implicit, read and classified as the
// classes of steps 1 and 2; an undecided class is given with its alternatives
async function guessEvents(source, databaseId, userInfo, tellStep) {
    const aiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    const classGuesses = getClassGuesses(aiKeys);
    if (classGuesses.error) {
        return classGuesses;
    }
    const { masterDataGuess, importantClassesGuess } = classGuesses;
    const describedMasterData = describeDecidedMasterData(masterDataGuess);
    const describedImportantClasses = describeDecidedMasterData(importantClassesGuess);
    const preparedSource = await getPreparedSource(source);
    if (!preparedSource) {
        return { error: getNotPreparedError(source) };
    }
    const { database, connection, schema, columnsByTable } = await readDatabaseSchema(databaseId, userInfo);
    const domain = masterDataGuess.domain;
    const changeLogLines = describedMasterData.changeLogLines.concat(describedImportantClasses.changeLogLines);
    const eventsPrompt =
        readFileSync(eventsGuessPromptPath, "utf8") +
        "\n\n# Domain\n\n" +
        domain +
        "\n\n# Master data\n\n" +
        describedMasterData.decidedLines.join("\n") +
        "\n\n# Important classes\n\n" +
        describedImportantClasses.decidedLines.join("\n") +
        "\n\n# Why the user decided them\n\n" +
        (changeLogLines.length > 0 ? changeLogLines.join("\n") : "decided on the cards, no discussion") +
        "\n\n# Database\n\n" +
        describeGuessedDatabase(database, schema, columnsByTable, aiKeys);
    getGuessPhaseStep(tellStep, 1)("the model names the tables of the classes and the associations, about a minute");
    const eventsAnswer = await askKeyModel(eventsPrompt);
    if (eventsAnswer.error) {
        return { error: eventsAnswer.error };
    }
    const classTables = readClassTables(eventsAnswer.answer?.classTables, columnsByTable, masterDataGuess, importantClassesGuess);
    const answeredEvents = Array.isArray(eventsAnswer.answer?.eventClasses) ? eventsAnswer.answer.eventClasses : [];
    const eventClasses = await readGuessedEntries(answeredEvents, connection, databaseModel.getClientDriver(database.driver), columnsByTable, getGuessPhaseStep(tellStep, 2));
    attachEventSupports(eventClasses, answeredEvents, columnsByTable, classTables);
    const classEntries = [];
    [masterDataGuess, importantClassesGuess].forEach((guess) => getGuessEntries(guess).forEach((entry) => classEntries.push(getDecidedClassLabel(entry, guess))));
    // a class with no table the model named takes part in no link: the user sees it
    const classesWithoutTables = classEntries.filter((classLabel) => !classTables[classLabel]);
    const eventsGuess = {
        eventClasses: eventClasses,
        classTables: classTables,
        classesWithoutTables: classesWithoutTables,
        classificationByClass: {},
        entriesGuessedFrom: getEntriesGuessedFrom([masterDataGuess, importantClassesGuess]),
        model: keyDetectionModelId,
        guessedAt: new Date().toISOString(),
    };
    if (eventClasses.length > 0) {
        await layOutReadings(eventClasses, domain, getGuessPhaseStep(tellStep, 3));
        const decidedClasses = describedMasterData.decidedClasses.concat(describedImportantClasses.decidedClasses);
        const classified = await classifyClasses(source, domain, eventClasses, decidedClasses, preparedSource, getGuessPhaseStep(tellStep, 4));
        if (classified.error) {
            return { error: classified.error };
        }
        eventsGuess.classificationByClass = classified.classificationByLabel;
    }
    // read again: decisions taken while the model worked are kept
    const savedAiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    savedAiKeys.eventsGuess = eventsGuess;
    await writeMappingAiKeys(source, databaseId, savedAiKeys);
    return { eventsGuess };
}

// { linksGuess } or { error }, step 4 of the workflow: the links between the classes of steps 1 to 3 along the keys of
// the database, each with the properties of the upper ontologies, per alternative of a class still undecided
async function guessLinks(source, databaseId, userInfo, tellStep) {
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
    const { schema } = await readDatabaseSchema(databaseId, userInfo);
    const classGuessList = [classGuesses.masterDataGuess, classGuesses.importantClassesGuess, eventsGuess];
    const links = computeLinks(schema, aiKeys, eventsGuess);
    const propertiesError = await guessLinkProperties(links, describeClassAnchors(classGuessList), classGuesses.masterDataGuess.domain, preparedSource, tellStep);
    if (propertiesError) {
        return propertiesError;
    }
    const linksGuess = { links: links, entriesGuessedFrom: getEntriesGuessedFrom(classGuessList), model: keyDetectionModelId, guessedAt: new Date().toISOString() };
    // read again: decisions taken while the model worked are kept
    const savedAiKeys = (await getKeyDetection(source, databaseId)).aiKeys;
    savedAiKeys.linksGuess = linksGuess;
    await writeMappingAiKeys(source, databaseId, savedAiKeys);
    return { linksGuess };
}

export { guessEvents, guessLinks, getDecidedClassLabel, getEntriesGuessedFrom, getClassGuesses, describeClassAnchors };
