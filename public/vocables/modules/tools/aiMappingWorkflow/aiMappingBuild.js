import common from "../../shared/common.js";
import Export from "../../shared/export.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_createResource from "../lineage/lineage_createResource.js";
import MappingColumnsGraph from "../mappingModeler/mappingColumnsGraph.js";
import AIMappingColumnsGraph from "../aiMappingModeler/aiMappingColumnsGraph.js";
import AIColumnClassSuggestion from "../aiMappingModeler/aiColumnClassSuggestion.js";
import AIMappingWorkflow from "./aiMappingWorkflow.js";

/**
 * AIMappingBuild module.
 * Step 6 of the AI Mapping Workflow: builds the whole mapping of the database from the steps 1 to 5, by code only.
 * A choice the user took is used, else the option of the AI of highest probability. The classes and datatype properties
 * the AI invented are written in the source, then the mapping of MappingModeler is replaced, exported first.
 * @module AIMappingBuild
 */
var AIMappingBuild = (function () {
    var self = {};

    self.classGuessKeys = ["masterDataGuess", "importantClassesGuess", "eventsGuess"];
    self.mappedPropertyKinds = ["existingProperty", "newProperty"];
    // the edge MappingModeler draws from a table to its columns
    self.tableEdgeColor = "#8f8a8c";
    self.columnNodeIdLength = 8;
    self.edgeIdLength = 5;

    self.showBuildPanel = function () {
        AIMappingWorkflow.clearGuessGraph();
        var buildPanel = $("<div class='masterData-panel'>");
        buildPanel.append(
            $("<div class='masterData-note'>").append(
                $("<div>").text("- Your choices first, else the most probable option of the AI"),
                $("<div>").text("- The classes and properties the AI invented are created in the source"),
                $("<div>").text("- The mapping of MappingModeler is replaced, exported before"),
            ),
        );
        var buildButton = $("<button type='button' class='slsv-button-1'>").text("Build the mapping");
        buildButton.on("click", function () {
            buildButton.prop("disabled", true);
            self.buildMapping(function (error, buildReport) {
                buildButton.prop("disabled", false);
                if (error) {
                    return MainController.errorAlert(error);
                }
                if (buildReport) {
                    self.showBuildReport(buildReport);
                }
            });
        });
        buildPanel.append(buildButton, $("<div id='aiMappingBuild_report'>"));
        $("#aiMappingWorkflow_explanation").empty().append(buildPanel);
    };

    // callback(error, buildReport); no report when the user keeps the mapping in place
    self.buildMapping = function (callback) {
        var aiKeys = AIMappingWorkflow.currentAiKeys;
        var source = AIMappingWorkflow.currentSource;
        if (!aiKeys.mappingGuess) {
            return callback("Guess the mapping of step 5 first");
        }
        var buildReport = { createdResources: [], defaults: [], notBuilt: [] };
        var classPlan = self.getClassPlan(aiKeys, buildReport);
        var mapping = null;
        var isMappingKept = false;
        var resourceIriByLabel = {};
        async.series(
            [
                function (callbackSeries) {
                    AIMappingWorkflow.readMappingFile(function (error, mappingFile) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        mapping = mappingFile;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var oldNodeCount = mapping.nodes ? mapping.nodes.length : 0;
                    if (oldNodeCount == 0) {
                        return callbackSeries();
                    }
                    var fileName = AIMappingWorkflow.getMappingFileName();
                    var replaceText =
                        "The mapping of " + source + " already holds " + oldNodeCount + " nodes: building replaces them.\nIt is exported first to your downloads as " + fileName + ".\nGo on?";
                    isMappingKept = !confirm(replaceText);
                    if (isMappingKept) {
                        return callbackSeries();
                    }
                    Export.downloadJSON(mapping, fileName);
                    UI.message("Former mapping exported as " + fileName);
                    callbackSeries();
                },
                function (callbackSeries) {
                    if (isMappingKept) {
                        return callbackSeries();
                    }
                    self.writeNewResources(source, classPlan, aiKeys.mappingGuess, buildReport, function (error, iriByLabel) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        resourceIriByLabel = iriByLabel;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (isMappingKept) {
                        return callbackSeries();
                    }
                    var mappingGraph = self.getMappingGraph(aiKeys, classPlan, resourceIriByLabel, buildReport);
                    mapping.nodes = mappingGraph.nodes;
                    mapping.edges = mappingGraph.edges;
                    // MappingModeler lays out a graph without positions in levels
                    mapping.positions = {};
                    buildReport.nodeCount = mappingGraph.nodes.length;
                    buildReport.edgeCount = mappingGraph.edges.length;
                    $.ajax({
                        type: "POST",
                        url: Config.apiUrl + "/data/file",
                        data: { dir: "graphs/", fileName: AIMappingWorkflow.getMappingFileName(), data: JSON.stringify(mapping, null, 2) },
                        dataType: "json",
                        success: function () {
                            callbackSeries();
                        },
                        error: function (saveError) {
                            callbackSeries("Mapping not saved: " + AIColumnClassSuggestion.getErrorText(saveError));
                        },
                    });
                },
            ],
            function (error) {
                if (error) {
                    // what was written in the source stays there, a build run again reuses it
                    var createdText = buildReport.createdResources.length > 0 ? "\nAlready created in the source: " + buildReport.createdResources.join(", ") : "";
                    return callback(error + createdText);
                }
                if (isMappingKept) {
                    return callback(null, null);
                }
                callback(null, buildReport);
            },
        );
    };

    // the option of highest probability; equal ones are told apart by getTieBreakValue, never by the order of the answer
    self.getMostProbableOption = function (options, getTieBreakValue) {
        var mostProbableOption = null;
        options.forEach(function (option) {
            var isMoreProbable = !mostProbableOption || option.probability > mostProbableOption.probability;
            var isEquallyProbable = Boolean(mostProbableOption) && option.probability == mostProbableOption.probability;
            if (isMoreProbable || (isEquallyProbable && getTieBreakValue(option) < getTieBreakValue(mostProbableOption))) {
                mostProbableOption = option;
            }
        });
        return mostProbableOption;
    };

    // one class per class label of steps 1 to 3, several entries may hold the same: { classLabel: { classIri, superClassId,
    // definition } }, classIri null for a class to create. The local classes the chat added come too, as new classes
    self.getClassPlan = function (aiKeys, buildReport) {
        var classPlan = {};
        self.classGuessKeys.forEach(function (guessKey) {
            var guess = aiKeys[guessKey];
            if (!guess) {
                return;
            }
            (guess.localClasses || []).forEach(function (localClass) {
                classPlan[localClass.label] = { classIri: null, superClassId: localClass.superClassId, definition: localClass.definition };
            });
            AIMappingWorkflow.getGuessEntries(guess).forEach(function (guessEntry) {
                var classification = AIMappingWorkflow.getDecidedClassification(guessEntry, guess);
                var classLabel = AIMappingWorkflow.getDecidedClassLabel(guessEntry, guess);
                if (classPlan[classLabel]) {
                    return;
                }
                if (classification.classKind == "existingClass") {
                    classPlan[classLabel] = { classIri: classification.classId, classSource: classification.classSource };
                    return;
                }
                if (classification.classKind != "newClass") {
                    buildReport.notBuilt.push(classLabel + ": not classified");
                    return;
                }
                var decision = guessEntry.decision || {};
                var reading = AIMappingWorkflow.getReadings(guessEntry)[decision.readingIndex || 0];
                var superClassId = decision.superClassId;
                if (!superClassId) {
                    var mostProbableParent = self.getMostProbableOption(classification.parentOptions || [], (parentOption) => parentOption.parentId);
                    if (!mostProbableParent) {
                        buildReport.notBuilt.push(classLabel + ": no superclass");
                        return;
                    }
                    superClassId = mostProbableParent.parentId;
                    buildReport.defaults.push(classLabel + ": subclass of " + mostProbableParent.parentLabel + " (" + mostProbableParent.probability + " %)");
                }
                var definition = (reading && reading.definition) || guessEntry.definition;
                classPlan[classLabel] = { classIri: null, superClassId: superClassId, definition: definition };
            });
        });
        return classPlan;
    };

    // the classes and datatype properties to create, a class after its superclass when that one is created too; a resource
    // of the source of the same type already holding the label is reused, so a build run again creates nothing twice
    self.writeNewResources = function (source, classPlan, mappingGuess, buildReport, callback) {
        var classLabels = Object.keys(classPlan);
        var newClassLabels = classLabels.filter((classLabel) => !classPlan[classLabel].classIri);
        var classDepths = {};
        newClassLabels.forEach(function (classLabel) {
            // a local class names its superclass by IRI, a subclass of a local class by its label
            var classDepth = 0;
            var plannedSuperClass = classPlan[classPlan[classLabel].superClassId];
            while (plannedSuperClass && classDepth < newClassLabels.length) {
                classDepth++;
                plannedSuperClass = classPlan[plannedSuperClass.superClassId];
            }
            classDepths[classLabel] = classDepth;
        });
        newClassLabels.sort((classLabel, otherClassLabel) => classDepths[classLabel] - classDepths[otherClassLabel] || classLabel.localeCompare(otherClassLabel));
        var newPropertyRanges = {};
        mappingGuess.classMappings.forEach(function (classMapping) {
            classMapping.columnMappings.forEach(function (columnMapping) {
                var option = self.getColumnOption(columnMapping);
                if (option && option.kind == "newProperty" && option.newPropertyName) {
                    newPropertyRanges[option.newPropertyName] = option.range;
                }
            });
        });
        var newResources = [];
        newClassLabels.forEach((classLabel) => newResources.push({ label: classLabel, resourceType: "owl:Class" }));
        Object.keys(newPropertyRanges).forEach((propertyName) => newResources.push({ label: propertyName, resourceType: "owl:DatatypeProperty" }));

        var resourceIriByLabel = {};
        var fromStr = Sparql_common.getFromStr(source, false, true);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "SELECT ?resource ?type ?label " +
            fromStr +
            " WHERE { ?resource rdf:type ?type . ?resource rdfs:label ?label . FILTER (?type IN (owl:Class, owl:DatatypeProperty)) }";
        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (error, result) {
            if (error) {
                return callback(error);
            }
            // by type and lowercased label; two resources of one label keep the smallest IRI, whatever the row order
            var sourceIriByTypedLabel = {};
            result.results.bindings.forEach(function (binding) {
                var typedLabel = binding.type.value + " " + binding.label.value.toLowerCase();
                var knownIri = sourceIriByTypedLabel[typedLabel];
                if (!knownIri || binding.resource.value < knownIri) {
                    sourceIriByTypedLabel[typedLabel] = binding.resource.value;
                }
            });
            async.eachSeries(
                newResources,
                function (newResource, callbackEach) {
                    var resourceTypeIri = Sparql_common.getUriFromPrefixedName(newResource.resourceType);
                    var existingIri = sourceIriByTypedLabel[resourceTypeIri + " " + newResource.label.toLowerCase()];
                    if (existingIri) {
                        resourceIriByLabel[newResource.label] = existingIri;
                        return callbackEach();
                    }
                    var onResourceWritten = function (error, createdIri) {
                        if (error) {
                            return callbackEach(newResource.label + ": " + AIColumnClassSuggestion.getErrorText(error));
                        }
                        resourceIriByLabel[newResource.label] = createdIri;
                        buildReport.createdResources.push(newResource.label);
                        callbackEach();
                    };
                    if (newResource.resourceType == "owl:Class") {
                        var plannedClass = classPlan[newResource.label];
                        var superClassIri = resourceIriByLabel[plannedClass.superClassId] || plannedClass.superClassId;
                        // the predicate given keeps getResourceTriples from reading one left in a dialog of Lineage
                        var classTriples = Lineage_createResource.getResourceTriples(source, "owl:Class", null, newResource.label, superClassIri, "rdf:type", "owl:Class");
                        if (plannedClass.definition) {
                            // triplesObjectToString reads the part after @ as the language of the literal
                            classTriples.push({ subject: classTriples[0].subject, predicate: "skos:definition", object: Sparql_common.formatStringForTriple(plannedClass.definition) + "@en" });
                        }
                        return Lineage_createResource.writeResource(source, classTriples, onResourceWritten);
                    }
                    // written as createResource_bot writes a datatype property
                    var propertyIri = common.getURI(newResource.label, source, "fromLabel");
                    var propertyRange = newPropertyRanges[newResource.label] || "xsd:string";
                    var propertyTriples = [
                        { subject: propertyIri, predicate: "rdf:type", object: "owl:DatatypeProperty" },
                        { subject: propertyIri, predicate: "rdfs:label", object: Sparql_common.formatStringForTriple(newResource.label) },
                        { subject: propertyIri, predicate: "rdfs:range", object: propertyRange },
                    ];
                    Sparql_generic.insertTriples(source, propertyTriples, null, function (error) {
                        if (error) {
                            return onResourceWritten(error);
                        }
                        var modelData = { nonObjectProperties: { [propertyIri]: { id: propertyIri, label: newResource.label, range: propertyRange } } };
                        OntologyModels.updateModel(source, modelData, {}, function (error) {
                            onResourceWritten(error, propertyIri);
                        });
                    });
                },
                function (error) {
                    callback(error, resourceIriByLabel);
                },
            );
        });
    };

    // the option the user applied on the card of step 5, else the most probable one
    self.getColumnOption = function (columnMapping) {
        var decidedOption = columnMapping.decision ? columnMapping.options[columnMapping.decision.optionIndex] : null;
        if (decidedOption) {
            return decidedOption;
        }
        var mostProbableOption = self.getMostProbableOption(columnMapping.options, (option) => option.kind + " " + (option.propertyIri || option.newPropertyName || ""));
        return mostProbableOption;
    };

    // the instance applied on the card of step 5, else the one of the AI
    self.getClassInstance = function (classMapping) {
        var instance = classMapping.decision ? classMapping.decision.instance : classMapping.instance;
        return instance;
    };

    // the nodes and edges of MappingModeler: per class of step 5 a table, the column of its identifier typed by the class,
    // its value columns as datatype properties of that column; the relations of step 4 as object property edges between
    // the identifier columns. A class read in another table than its own takes there the column of the same values, marked
    // definedInColumn by its identifier column so both give one URI
    self.getMappingGraph = function (aiKeys, classPlan, resourceIriByLabel, buildReport) {
        var datasourceId = AIMappingWorkflow.currentDatabaseId;
        var source = AIMappingWorkflow.currentSource;
        var classMappings = aiKeys.mappingGuess.classMappings;
        var columnLegendItem = AIMappingWorkflow.getLegendItem("Column");
        var virtualColumnLegendItem = AIMappingWorkflow.getLegendItem("VirtualColumn");
        var classLegendItem = AIMappingWorkflow.getLegendItem("Class");
        var mappingGraph = { nodes: [], edges: [] };
        var graphIds = {};
        var propertyEdgeKeys = {};
        var identifierNodeByClass = {};
        var columnNodeByTableColumn = {};
        var tableColumns = {};
        var detectedForeignKeys = aiKeys.foreignKeys || [];

        var addNode = function (node) {
            if (graphIds[node.id]) {
                return;
            }
            graphIds[node.id] = true;
            mappingGraph.nodes.push(node);
        };
        var addEdge = function (edge) {
            edge.id = common.getRandomHexaId(self.edgeIdLength);
            mappingGraph.edges.push(edge);
        };
        var getClassIri = function (classLabel) {
            var plannedClass = classPlan[classLabel];
            if (!plannedClass) {
                return null;
            }
            var classIri = plannedClass.classIri || resourceIriByLabel[classLabel] || null;
            return classIri;
        };
        // a column node of a table typed by its class; the callers check no node holds this table and column yet
        var addColumnNode = function (table, column, nodeType, classLabel, columnData) {
            var legendItem = nodeType == "VirtualColumn" ? virtualColumnLegendItem : columnLegendItem;
            var columnNode = {
                id: common.getRandomHexaId(self.columnNodeIdLength),
                label: column,
                shape: legendItem.shape,
                color: legendItem.color,
                level: 2,
                data: { id: column, label: column, type: nodeType, dataTable: table, datasource: datasourceId },
            };
            Object.keys(columnData).forEach((dataKey) => (columnNode.data[dataKey] = columnData[dataKey]));
            addNode(MappingColumnsGraph.getVisjsTableNode(table));
            addNode(columnNode);
            addEdge({ from: table, to: columnNode.id, color: self.tableEdgeColor });
            var classIri = getClassIri(classLabel);
            var classSource = classPlan[classLabel].classSource || source;
            addNode({
                id: classIri,
                label: classLabel,
                shape: classLegendItem.shape,
                color: classLegendItem.color,
                level: 3,
                data: { id: classIri, label: classLabel, type: "Class", source: classSource },
            });
            mappingGraph.edges.push(AIMappingColumnsGraph.getClassEdge(columnNode.id, classIri, "", "rdf:type"));
            columnNodeByTableColumn[table + "." + column] = columnNode;
            return columnNode;
        };
        // the column giving the URI of a class in a table: its identifier column, else the column of the table holding the
        // same values, by name or by the one foreign key detected on the identifier; null when none, or two keys, give it
        var getClassColumn = function (classLabel, table) {
            var identifierNode = identifierNodeByClass[classLabel];
            if (!identifierNode) {
                return null;
            }
            var identifierColumn = identifierNode.data.id;
            if (identifierNode.data.dataTable == table) {
                return identifierColumn;
            }
            // a blank node per row is only had in its own table
            if (identifierNode.data.type != "Column") {
                return null;
            }
            if (tableColumns[table] && tableColumns[table].includes(identifierColumn)) {
                return identifierColumn;
            }
            var referencingKeys = detectedForeignKeys.filter(
                (foreignKey) => foreignKey.table == table && foreignKey.referencedTable == identifierNode.data.dataTable && foreignKey.referencedColumn == identifierColumn,
            );
            var referencingColumn = referencingKeys.length == 1 ? referencingKeys[0].column : null;
            return referencingColumn;
        };
        // the node of a class on a column of a table, added as a column of the same values as the identifier of the class
        var getClassNode = function (classLabel, table, column) {
            var identifierNode = identifierNodeByClass[classLabel];
            if (identifierNode.data.dataTable == table && identifierNode.data.id == column) {
                return identifierNode;
            }
            var existingNode = columnNodeByTableColumn[table + "." + column];
            if (existingNode) {
                return existingNode;
            }
            var valueNode = addColumnNode(table, column, "Column", classLabel, {
                uriType: identifierNode.data.uriType,
                prefixURI: identifierNode.data.prefixURI,
                definedInColumn: identifierNode.id,
                otherPredicates: [],
            });
            return valueNode;
        };

        classMappings.forEach(function (classMapping) {
            var instance = self.getClassInstance(classMapping);
            var columns = instance ? instance.identifierColumns.slice() : [];
            classMapping.columnMappings.forEach((columnMapping) => columnMapping.columns.forEach((column) => columns.push(column)));
            classMapping.unmappedColumns.forEach((unmappedColumn) => columns.push(unmappedColumn.column));
            tableColumns[classMapping.table] = (tableColumns[classMapping.table] || []).concat(columns);
        });

        // the identifier columns first: the value columns and the relations of a class may sit on the identifier of another
        classMappings.forEach(function (classMapping) {
            var classLabel = classMapping.classLabel;
            if (!getClassIri(classLabel)) {
                buildReport.notBuilt.push(classLabel + ": its class is not built");
                return;
            }
            var instance = self.getClassInstance(classMapping);
            if (!instance) {
                buildReport.notBuilt.push(classLabel + ": no instance guessed in step 5");
                return;
            }
            if (!classMapping.decision) {
                buildReport.defaults.push(classLabel + ": mapping of step 5 not applied, the options of the AI taken");
            }
            var identifierColumns = instance.identifierColumns;
            if (identifierColumns.length > 1) {
                var leftOutColumns = identifierColumns.slice(1);
                buildReport.notBuilt.push(classLabel + ": URI from " + identifierColumns[0] + " only, " + leftOutColumns.join(", ") + " left out");
            }
            var identifierColumn = identifierColumns[0];
            var columnData = { uriType: instance.uriType, prefixURI: instance.prefixURI || "", baseURI: "", rdfType: "owl:NamedIndividual", isMainColumn: true, otherPredicates: [] };
            if (instance.labelColumn) {
                columnData.rdfsLabel = instance.labelColumn;
            }
            // a class without identifier is a blank node per row
            var nodeType = identifierColumn ? "Column" : "VirtualColumn";
            var nodeColumn = identifierColumn || classLabel;
            if (columnNodeByTableColumn[classMapping.table + "." + nodeColumn]) {
                buildReport.notBuilt.push(classLabel + ": " + classMapping.table + "." + nodeColumn + " already gives another class");
                return;
            }
            identifierNodeByClass[classLabel] = addColumnNode(classMapping.table, nodeColumn, nodeType, classLabel, columnData);
        });

        classMappings.forEach(function (classMapping) {
            if (!identifierNodeByClass[classMapping.classLabel]) {
                return;
            }
            classMapping.columnMappings.forEach(function (columnMapping) {
                var option = self.getColumnOption(columnMapping);
                var columnsText = classMapping.table + "." + columnMapping.columns.join(", ");
                if (!option || option.kind == "unmapped") {
                    return;
                }
                if (!self.mappedPropertyKinds.includes(option.kind)) {
                    buildReport.notBuilt.push(columnsText + ": " + AIMappingWorkflow.mappingKindLabels[option.kind] + ", to map by hand");
                    return;
                }
                var propertyIri = option.kind == "existingProperty" ? option.propertyIri : resourceIriByLabel[option.newPropertyName];
                if (!propertyIri) {
                    buildReport.notBuilt.push(columnsText + ": no property");
                    return;
                }
                var subjectColumn = getClassColumn(option.onClass, classMapping.table);
                if (!subjectColumn) {
                    buildReport.notBuilt.push(columnsText + ": no column of " + option.onClass + " in the table");
                    return;
                }
                var subjectNode = getClassNode(option.onClass, classMapping.table, subjectColumn);
                // two classes of one table may map the same column the same way
                columnMapping.columns.forEach(function (column) {
                    var isAlreadyMapped = subjectNode.data.otherPredicates.some((otherPredicate) => otherPredicate.property == propertyIri && otherPredicate.object == column);
                    if (!isAlreadyMapped) {
                        subjectNode.data.otherPredicates.push({ property: propertyIri, object: column, range: option.range, dateFormat: option.dateFormat });
                    }
                });
            });
        });

        var links = aiKeys.linksGuess ? aiKeys.linksGuess.links : [];
        links.forEach(function (link) {
            var linkText = link.fromClass + " -> " + link.toClass;
            var decidedOption = link.decision ? link.propertyOptions.find((propertyOption) => propertyOption.propertyIri == link.decision.propertyIri) : null;
            var propertyOption = decidedOption || self.getMostProbableOption(link.propertyOptions, (option) => option.propertyIri);
            if (!propertyOption) {
                buildReport.notBuilt.push(linkText + ": no property");
                return;
            }
            var foreignKey = link.foreignKey;
            if (foreignKey && foreignKey.columns.length > 1) {
                buildReport.notBuilt.push(linkText + ": key of " + foreignKey.columns.length + " columns");
                return;
            }
            var table = foreignKey ? foreignKey.table : link.sameRowTable;
            if (!table) {
                var [rowColumnTable] = link.rowColumns[0].split(".");
                table = rowColumnTable;
            }
            var toColumn = null;
            if (foreignKey) {
                var referencedNode = identifierNodeByClass[link.toClass];
                var isReferencingIdentifier = Boolean(referencedNode) && referencedNode.data.id == foreignKey.referencedColumns[0];
                if (!isReferencingIdentifier) {
                    buildReport.notBuilt.push(linkText + ": " + foreignKey.referencedTable + "." + foreignKey.referencedColumns[0] + " is not the identifier of " + link.toClass);
                    return;
                }
                toColumn = foreignKey.columns[0];
            } else {
                toColumn = getClassColumn(link.toClass, table);
            }
            var fromColumn = getClassColumn(link.fromClass, table);
            if (!fromColumn || !toColumn) {
                buildReport.notBuilt.push(linkText + ": no column of " + (fromColumn ? link.toClass : link.fromClass) + " in " + table);
                return;
            }
            if (!decidedOption) {
                buildReport.defaults.push(linkText + ": " + propertyOption.propertyLabel + " (" + propertyOption.probability + " %)");
            }
            var fromNode = getClassNode(link.fromClass, table, fromColumn);
            var toNode = getClassNode(link.toClass, table, toColumn);
            var subjectNode = propertyOption.inverse ? toNode : fromNode;
            var objectNode = propertyOption.inverse ? fromNode : toNode;
            // the same relation guessed twice, from two keys of one table, is drawn once
            var propertyEdgeKey = subjectNode.id + " " + propertyOption.propertyIri + " " + objectNode.id;
            if (propertyEdgeKeys[propertyEdgeKey]) {
                return;
            }
            propertyEdgeKeys[propertyEdgeKey] = true;
            var property = { source: propertyOption.propertySource };
            var edge = MappingColumnsGraph.getVisjsObjectPropertyEdge(subjectNode.id, objectNode.id, propertyOption.propertyLabel, "arrow", property, propertyOption.propertyIri);
            addEdge(edge);
        });
        return mappingGraph;
    };

    self.showBuildReport = function (buildReport) {
        var reportDiv = $("#aiMappingBuild_report").empty();
        var builtText =
            "Mapping built: " + buildReport.nodeCount + " nodes, " + buildReport.edgeCount + " edges, " + buildReport.createdResources.length + " classes and properties created in the source.";
        reportDiv.append($("<div>").text(builtText));
        var reportLists = [
            { title: "Most probable option taken", lines: buildReport.defaults },
            { title: "To do by hand in MappingModeler", lines: buildReport.notBuilt },
        ];
        reportLists.forEach(function (reportList) {
            if (reportList.lines.length == 0) {
                return;
            }
            var listDetails = $("<details>").append($("<summary>").text(reportList.title + " (" + reportList.lines.length + ")"));
            reportList.lines.forEach((line) => listDetails.append($("<div>").text("- " + line)));
            reportDiv.append(listDetails);
        });
        var openButton = $("<button type='button' class='slsv-button-1'>").text("Open in MappingModeler");
        openButton.on("click", function () {
            MainController.onToolSelect("MappingModeler");
        });
        reportDiv.append(openButton);
    };

    return self;
})();

export default AIMappingBuild;
window.AIMappingBuild = AIMappingBuild;
