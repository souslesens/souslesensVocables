import Lineage_createResource from "../lineage/lineage_createResource.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import AIMappingModeler from "./aiMappingModeler.js";
import AIDataSourceManager from "./aiDataSourcesManager.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIColumnRestrictionSuggestion from "./aiColumnRestrictionSuggestion.js";
import AIImplicitObjectSuggestion from "./aiImplicitObjectSuggestion.js";

/**
 * Suggests what a selected column maps to: a new class of the application ontology, a class that
 * already denotes its objects, a value that maps to no class, or a technical key, which maps to no class either.
 * The readings are listed at the top of the Classes tree and are never nodes of the graph: everything that reads the graph,
 * the saved mapping, the technical mappings and the triples first of all, stays unaware of them.
 * Nothing is written before the user accepts one.
 * @module AIColumnClassSuggestion
 */
var AIColumnClassSuggestion = (function () {
    var self = {};

    self.panelDivId = "aiMappingModeler_columnClassSuggestionDiv";
    self.tableReadingDivId = "aiMappingModeler_tableReadingDiv";
    // between two looks at a running reading of a table, which takes 7 to 22 s
    self.tableReadingPollDelay = 5000;
    self.tableReadingPollTimer = null;
    // per table key: { status, reading, error }, as the tableReading route answers
    self.tableReadingsByKey = {};
    // same number of rows as the ontology generation
    self.sampleRowCount = 5;
    // beyond this the classes of an ontology no longer fit a call answered while the user waits
    self.maxClassesPerOntology = 1000;
    // the longest answer, the implicit object judgement, reasons at medium effort; the server stops the model when the page gives up
    self.aiAnswerTimeout = 3 * 60 * 1000;
    // the server answers it once it has forgotten the prepared ontologies, after a restart
    self.sourceNotPreparedStatus = 409;
    // { source, callbacks }: the requests that met a server restart together wait for one preparation; null when none runs
    self.runningPreparation = null;
    self.boxOpacity = 0.35;
    self.textOpacity = 0.75;
    self.boxHeight = 26;
    self.boxPaddingX = 8;
    self.boxRadius = 6;
    // the server brings the probabilities of the readings of a column back to this total
    self.fullProbability = 100;
    // the readings that map the column to no class: the label of their tree node, and the text of the panel and of the confirmation
    self.noClassKinds = {
        value: { label: "not a class", text: "a value, no class" },
        technicalKey: { label: "technical key, not a class", text: "a technical key, no class" },
    };
    self.valueColor = "#b0b0b0";
    self.proposalTreeDivId = "suggestionsSelectJstreeDiv";
    self.treeNodeId = "aiClassSuggestions";
    self.arrowSize = 8;
    self.linkWidth = 2;
    self.linkDash = [6, 6];
    self.font = "14px arial";
    self.textColor = "#343434";
    self.viewMargin = 80;
    self.viewAnimationDuration = 300;
    self.leftOutOntologies = [];
    self.sampleRowsByTable = {};
    self.currentTableKey = null;
    self.panelColumnId = null;
    self.requestsByColumnId = {};
    self.suggestionsByColumnId = {};
    self.boundNetwork = null;
    // { label, resourceId } or { label, newClassSuggestion } of the box or the tree node right clicked last
    self.popupMenuResource = null;
    // the default class of an empty ontology says nothing about a column
    self.defaultClassId = "owl:Thing";
    // the columns a class or a restriction can be told about
    self.mappedColumnTypes = ["Column", "VirtualColumn"];
    self.measureContext = document.createElement("canvas").getContext("2d");

    self.getTransitiveImports = function (source) {
        var transitiveImports = [];
        var sourcesToWalk = [source];
        while (sourcesToWalk.length > 0) {
            var walkedSource = sourcesToWalk.pop();
            // an import outside the user's profile is listed but not walked
            var walkedSourceConfig = Config.sources[walkedSource];
            var imports = (walkedSourceConfig && walkedSourceConfig.imports) || [];
            imports.forEach(function (importSource) {
                if (transitiveImports.indexOf(importSource) < 0) {
                    transitiveImports.push(importSource);
                    sourcesToWalk.push(importSource);
                }
            });
        }
        return transitiveImports;
    };

    // same order as the sls-virtual-db-creator plugin, a submodule this tool cannot depend on:
    // direct imports, most abstract first, a source sits one level above the deepest source it imports
    self.getImportsSortedByAbstraction = function (source) {
        var transitiveImportsBySource = {};
        transitiveImportsBySource[source] = self.getTransitiveImports(source);
        transitiveImportsBySource[source].forEach(function (importSource) {
            transitiveImportsBySource[importSource] = self.getTransitiveImports(importSource);
        });

        var levelBySource = {};
        var getLevel = function (upperSource) {
            if (levelBySource[upperSource] !== undefined) {
                return levelBySource[upperSource];
            }
            // an import that imports upperSource back is in a cycle with it, not below it
            var sourcesBelow = transitiveImportsBySource[upperSource].filter(function (importSource) {
                return transitiveImportsBySource[importSource].indexOf(upperSource) < 0;
            });
            var level = 0;
            sourcesBelow.forEach(function (sourceBelow) {
                level = Math.max(level, getLevel(sourceBelow) + 1);
            });
            levelBySource[upperSource] = level;
            return level;
        };

        var sortedImports = (Config.sources[source].imports || []).slice();
        sortedImports.sort(function (importSource1, importSource2) {
            var levelGap = getLevel(importSource1) - getLevel(importSource2);
            if (levelGap != 0) {
                return levelGap;
            }
            return importSource1.localeCompare(importSource2);
        });
        return sortedImports;
    };

    self.getErrorText = function (error) {
        if (typeof error == "string") {
            return error;
        }
        if (error.statusText == "timeout") {
            var timeoutText = "no answer within " + self.aiAnswerTimeout / (60 * 1000) + " min";
            return timeoutText;
        }
        var serverMessage = error.responseJSON ? error.responseJSON.error || error.responseJSON.message : null;
        var errorText = serverMessage || error.responseText || error.statusText || "no answer from the server";
        return errorText;
    };

    self.showFailure = function (failureText, isShownInPanel) {
        if (isShownInPanel) {
            return self.showMessage(failureText);
        }
        UI.message(CommonBotFunctions.escapeHtml(failureText));
    };

    self.prepare = function () {
        self.clearAll();
        self.currentTableKey = null;
        self.sampleRowsByTable = {};
        self.tableReadingsByKey = {};
        clearTimeout(self.tableReadingPollTimer);
        $("#" + self.tableReadingDivId).empty();
        self.prepareSource(function (error) {
            if (error) {
                UI.message("AI suggestions are not ready: " + self.getErrorText(error));
            }
        });
    };

    self.prepareSource = function (callback) {
        var source = AIMappingModeler.currentSLSsource;
        // the tool opened again on another source during a preparation does not get the ontologies of the previous one
        if (self.runningPreparation && self.runningPreparation.source == source) {
            self.runningPreparation.callbacks.push(callback);
            return;
        }
        var preparation = { source: source, callbacks: [callback] };
        self.runningPreparation = preparation;
        var endPreparation = function (error) {
            if (self.runningPreparation === preparation) {
                self.runningPreparation = null;
            }
            preparation.callbacks.forEach(function (preparationCallback) {
                preparationCallback(error);
            });
        };
        self.leftOutOntologies = [];
        var upperOntologies = [];
        self.getImportsSortedByAbstraction(source).forEach(function (importSource) {
            if (!Config.sources[importSource]) {
                return;
            }
            var ontologyModel = Config.ontologiesVocabularyModels[importSource];
            if (ontologyModel && ontologyModel.classesCount > self.maxClassesPerOntology) {
                self.leftOutOntologies.push(importSource);
                return;
            }
            upperOntologies.push(importSource);
        });
        var payload = {
            source: source,
            upperOntologies: upperOntologies,
            databaseIds: Object.keys(AIDataSourceManager.currentConfig.databaseSources),
            clientSocketId: Config.clientSocketId,
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingModeler/preparation",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            timeout: self.aiAnswerTimeout,
            success: function (result) {
                var unreachableDatabases = Object.keys(result.databaseErrors);
                if (unreachableDatabases.length > 0) {
                    UI.message("AI suggestions read no schema for: " + unreachableDatabases.join(", "));
                }
                endPreparation(null);
            },
            error: function (error) {
                endPreparation(error);
            },
        });
    };

    // pendingRequest: { xhr }, kept so that its caller can abort it; the server forgets the prepared ontologies when it restarts,
    // they are prepared again and the request sent again, once
    self.postAiRequest = function (route, payload, pendingRequest, callback) {
        var send = function (isPreparedAgain) {
            pendingRequest.xhr = $.ajax({
                type: "POST",
                url: Config.apiUrl + "/ai/aiMappingModeler/" + route,
                data: JSON.stringify(payload),
                contentType: "application/json",
                dataType: "json",
                timeout: self.aiAnswerTimeout,
                success: function (result) {
                    callback(null, result);
                },
                error: function (error) {
                    if (error.status != self.sourceNotPreparedStatus || isPreparedAgain) {
                        return callback(error);
                    }
                    // aborted as an xhr would be, while no request is on the way
                    var isCancelled = false;
                    pendingRequest.xhr = {
                        abort: function () {
                            isCancelled = true;
                            callback({ statusText: "abort" });
                        },
                    };
                    self.prepareSource(function (preparationError) {
                        if (isCancelled) {
                            return;
                        }
                        if (preparationError) {
                            return callback(preparationError);
                        }
                        send(true);
                    });
                },
            });
        };
        send(false);
    };

    self.getTableKey = function (dataSourceId, table) {
        var tableKey = dataSourceId + "|" + table;
        return tableKey;
    };

    // a table that cannot be read still gets a suggestion, from its column names, and is read again next time
    self.getSampleRows = function (dataSourceId, table, callback) {
        var tableKey = self.getTableKey(dataSourceId, table);
        if (self.sampleRowsByTable[tableKey]) {
            return callback(self.sampleRowsByTable[tableKey]);
        }
        AIMappingModeler.getTableSampleRows(dataSourceId, table, self.sampleRowCount, function (error, rows) {
            // a csv file without any data row gives no rows at all
            if (error || !rows) {
                return callback([]);
            }
            var sampleRows = rows.slice(0, self.sampleRowCount);
            self.sampleRowsByTable[tableKey] = sampleRows;
            callback(sampleRows);
        });
    };

    // its rows are read ahead, and the AI reads the table
    self.onColumnsListed = function () {
        var currentDataSource = AIDataSourceManager.currentConfig.currentDataSource;
        var tableName = AIMappingModeler.currentTable.name;
        var tableKey = self.getTableKey(currentDataSource.id, tableName);
        if (self.currentTableKey && self.currentTableKey != tableKey) {
            self.clearAll();
        }
        self.currentTableKey = tableKey;
        self.readTable(false);
    };

    // the reading of the current table, started on the server when it has none; the suggestions of its columns get it there
    self.readTable = function (isReadAgain) {
        var currentDataSource = AIDataSourceManager.currentConfig.currentDataSource;
        var table = AIMappingModeler.currentTable.name;
        var tableColumns = AIMappingModeler.currentTable.columns;
        clearTimeout(self.tableReadingPollTimer);
        self.showTableReading();
        self.getSampleRows(currentDataSource.id, table, function (sampleRows) {
            var payload = {
                source: AIMappingModeler.currentSLSsource,
                dataSourceName: currentDataSource.name,
                table: table,
                columns: tableColumns,
                sampleRows: sampleRows,
                isReadAgain: isReadAgain,
            };
            if (AIDataSourceManager.currentConfig.databaseSources[currentDataSource.id]) {
                payload.databaseId = currentDataSource.id;
            }
            self.postAiRequest("tableReading", payload, { xhr: null }, function (error, tableReading) {
                if (error) {
                    return self.onTableReading(currentDataSource.id, table, { status: "failed", reading: null, error: self.getErrorText(error) });
                }
                self.onTableReading(currentDataSource.id, table, tableReading);
            });
        });
    };

    // tableReading: { status, reading, error }; a reading ending a run asks again the suggestions of the table, so that they get it
    self.onTableReading = function (dataSourceId, table, tableReading) {
        var tableKey = self.getTableKey(dataSourceId, table);
        var previousReading = self.tableReadingsByKey[tableKey];
        self.tableReadingsByKey[tableKey] = tableReading;
        // the save of the mapping writes the config as the page holds it, whatever table is open
        var rawConfig = AIDataSourceManager.rawConfig;
        var rawDataSource = (rawConfig.databaseSources && rawConfig.databaseSources[dataSourceId]) || (rawConfig.csvSources && rawConfig.csvSources[dataSourceId]);
        if (tableReading.status == "done" && rawDataSource) {
            rawDataSource.tableReadings = rawDataSource.tableReadings || {};
            rawDataSource.tableReadings[table] = tableReading.reading;
        }
        if (tableKey != self.currentTableKey) {
            return;
        }
        self.showTableReading();
        if (tableReading.status == "running") {
            self.tableReadingPollTimer = setTimeout(function () {
                // the open table may have changed without its columns being listed again
                var currentTable = AIMappingModeler.currentTable;
                var currentDataSource = AIDataSourceManager.currentConfig.currentDataSource;
                if (currentTable && currentDataSource && self.getTableKey(currentDataSource.id, currentTable.name) == tableKey) {
                    self.readTable(false);
                }
            }, self.tableReadingPollDelay);
            return;
        }
        if (tableReading.status == "done" && previousReading && previousReading.status == "running") {
            self.suggestTableAgain(table);
        }
    };

    // the open suggestions of the table, shown or still asked
    self.suggestTableAgain = function (table) {
        var columnNodesById = {};
        Object.values(self.suggestionsByColumnId).forEach(function (columnSuggestion) {
            columnNodesById[columnSuggestion.columnNode.id] = columnSuggestion.columnNode;
        });
        Object.values(self.requestsByColumnId).forEach(function (pendingRequest) {
            columnNodesById[pendingRequest.columnNode.id] = pendingRequest.columnNode;
        });
        Object.values(columnNodesById).forEach(function (columnNode) {
            if (columnNode.data.dataTable != table || !self.isColumnOpen(columnNode.id)) {
                return;
            }
            self.clearColumn(columnNode.id);
            self.suggest(columnNode);
        });
    };

    self.showTableReading = function () {
        var readingDiv = $("#" + self.tableReadingDivId);
        readingDiv.empty();
        var tableReading = self.tableReadingsByKey[self.currentTableKey];
        if (!tableReading) {
            return;
        }
        if (tableReading.status == "running") {
            readingDiv.append($("<i>").text("AI reading of the table..."));
            return;
        }
        var readAgainLink = $("<a href='#'>")
            .text("read again")
            .on("click", function () {
                self.readTable(true);
                return false;
            });
        if (tableReading.status == "failed") {
            readingDiv.append($("<span>").text("AI reading of the table failed: " + tableReading.error + " "), readAgainLink);
            return;
        }
        // the text of the model, never read as html
        var readingText = $("<div>").css({ "white-space": "pre-wrap", "font-size": "11px" }).text(tableReading.reading.text).hide();
        var showLink = $("<a href='#'>")
            .text("AI reading of the table")
            .attr("title", "read by " + tableReading.reading.model + " on " + tableReading.reading.readAt + ", click to show it")
            .on("click", function () {
                readingText.toggle();
                return false;
            });
        readingDiv.append(showLink, " (", readAgainLink, ")", readingText);
    };

    self.getLocalClasses = function () {
        var source = AIMappingModeler.currentSLSsource;
        var sourceClasses = (AIMappingModeler.allClasses || []).filter(function (ontologyClass) {
            return ontologyClass.source == source;
        });
        var localClasses = sourceClasses.map(function (ontologyClass) {
            return { id: ontologyClass.id, label: self.getLabelWithoutPrefix(ontologyClass.label) };
        });
        return localClasses;
    };

    // getAllClasses prefixes each label with the start of its source name
    self.getLabelWithoutPrefix = function (classLabel) {
        var labelStart = classLabel.indexOf(":") + 1;
        var labelWithoutPrefix = classLabel.substring(labelStart);
        return labelWithoutPrefix;
    };

    self.getMappedColumns = function () {
        var mappedColumns = [];
        AIMappingColumnsGraph.visjsGraph.data.nodes.get().forEach(function (graphNode) {
            if (!graphNode.data || self.mappedColumnTypes.indexOf(graphNode.data.type) < 0) {
                return;
            }
            var classId = AIMappingColumnsGraph.getColumnClass(graphNode);
            if (classId && classId != self.defaultClassId) {
                var classLabel = self.getLabelWithoutPrefix(self.getExistingClassLabel(classId, classId));
                mappedColumns.push({
                    columnId: graphNode.id,
                    table: graphNode.data.dataTable,
                    column: graphNode.data.label,
                    classId: classId,
                    classLabel: classLabel,
                    isVirtual: graphNode.data.type == "VirtualColumn",
                });
            }
        });
        return mappedColumns;
    };

    self.clearColumn = function (columnId) {
        var pendingRequest = self.requestsByColumnId[columnId];
        if (pendingRequest && pendingRequest.xhr) {
            pendingRequest.xhr.abort();
        }
        delete self.requestsByColumnId[columnId];
        delete self.suggestionsByColumnId[columnId];
        if (self.panelColumnId == columnId) {
            self.panelColumnId = null;
            $("#" + self.panelDivId).empty();
        }
        self.showInTree();
    };

    self.clearAll = function () {
        var columnIds = Object.keys(self.requestsByColumnId).concat(Object.keys(self.suggestionsByColumnId));
        columnIds.forEach(self.clearColumn);
        // a value or a failure leaves its message in the panel, and no column to clear
        self.panelColumnId = null;
        $("#" + self.panelDivId).empty();
        AIColumnRestrictionSuggestion.clearAll();
    };

    self.suggest = function (columnNode) {
        var column = columnNode.data.label;
        var table = columnNode.data.dataTable;
        var dataSourceId = columnNode.data.datasource;
        self.panelColumnId = columnNode.id;
        self.showMessage("AI suggestion for " + column + "...");

        var pendingRequest = { xhr: null, columnNode: columnNode };
        self.requestsByColumnId[columnNode.id] = pendingRequest;
        var databaseSources = AIDataSourceManager.currentConfig.databaseSources;
        var dataSourceName = AIDataSourceManager.currentConfig.currentDataSource.name;
        var tableColumns = AIMappingModeler.currentTable.columns;
        self.getSampleRows(dataSourceId, table, function (sampleRows) {
            // the suggestion ended while the rows were read
            if (self.requestsByColumnId[columnNode.id] !== pendingRequest) {
                return;
            }
            var payload = {
                source: AIMappingModeler.currentSLSsource,
                dataSourceName: dataSourceName,
                table: table,
                column: column,
                columns: tableColumns,
                sampleRows: sampleRows,
                localClasses: self.getLocalClasses(),
                mappedColumns: self.getMappedColumns(),
            };
            if (databaseSources[dataSourceId]) {
                payload.databaseId = dataSourceId;
            }
            self.postAiRequest("columnClassSuggestion", payload, pendingRequest, function (error, result) {
                if (error && error.statusText == "abort") {
                    return;
                }
                if (self.requestsByColumnId[columnNode.id] !== pendingRequest) {
                    return;
                }
                delete self.requestsByColumnId[columnNode.id];
                if (error) {
                    return self.showFailure("AI suggestion for " + column + " failed: " + self.getErrorText(error), self.panelColumnId == columnNode.id);
                }
                self.showSuggestion(columnNode, result.suggestions);
            });
        });
    };

    self.showMessage = function (message) {
        var panel = $("#" + self.panelDivId);
        panel.empty();
        // text of the model, never read as html
        panel.append($("<div>").text(message));
        if (self.leftOutOntologies.length > 0) {
            panel.append($("<div style='font-style: italic'>").text("Left out, too many classes: " + self.leftOutOntologies.join(", ")));
        }
    };

    // the label the class takes once it is mapped
    self.getExistingClassLabel = function (classId, fallbackLabel) {
        var classResource = AIMappingModeler.allResourcesMap[classId];
        var classLabel = classResource ? classResource.label : fallbackLabel;
        return classLabel;
    };

    // from the column upward: the class, then the superclass of a new class, which has no URI before it is written;
    // a value is listed as such, so that the other readings read as an alternative to it
    self.getDrawnClasses = function (suggestion) {
        var noClassKind = self.noClassKinds[suggestion.columnKind];
        if (noClassKind) {
            return [{ label: noClassKind.label, isNoClass: true, levelsAboveColumn: 1 }];
        }
        if (suggestion.columnKind == "existingClass") {
            // a class of another source sits on the level of the superclass of a local class
            var isLocalClass = AIMappingColumnsGraph.getResourceSource(suggestion.classId) == AIMappingModeler.currentSLSsource;
            var existingClass = { label: self.getExistingClassLabel(suggestion.classId, suggestion.label), resourceId: suggestion.classId, levelsAboveColumn: isLocalClass ? 1 : 2 };
            return [existingClass];
        }
        var newClass = { label: AIMappingModeler.getClassLabelInTool(AIMappingModeler.currentSLSsource, suggestion.label), newClassSuggestion: suggestion, levelsAboveColumn: 1 };
        var superClass = { label: self.getExistingClassLabel(suggestion.parentId, suggestion.parentLabel), resourceId: suggestion.parentId, levelsAboveColumn: 2 };
        var drawnClasses = [newClass, superClass];
        return drawnClasses;
    };

    // a reading the model is sure of shows no percentage
    self.getProbabilityText = function (suggestion) {
        var probabilityText = suggestion.probability < self.fullProbability ? " " + suggestion.probability + " %" : "";
        return probabilityText;
    };

    // each probability right after what it qualifies: the reading, then each superclass of a new class
    self.getSuggestionText = function (suggestion) {
        var probabilityText = self.getProbabilityText(suggestion);
        var noClassKind = self.noClassKinds[suggestion.columnKind];
        if (noClassKind) {
            var noClassText = noClassKind.text + probabilityText;
            return noClassText;
        }
        if (suggestion.columnKind == "existingClass") {
            return 'class "' + suggestion.label + '"' + probabilityText;
        }
        var parentOptions = suggestion.parentOptions || [suggestion];
        var parentTexts = parentOptions.map(function (parentOption) {
            return '"' + parentOption.parentLabel + '"' + self.getProbabilityText(parentOption);
        });
        var suggestionText = 'new class "' + suggestion.label + '"' + probabilityText + ", subclass of " + parentTexts.join(" or ");
        return suggestionText;
    };

    // the new class under one of the superclasses the model hesitated between
    self.getSuggestionUnderParent = function (suggestion, parentOption) {
        var parentSuggestion = { ...suggestion, parentId: parentOption.parentId, parentLabel: parentOption.parentLabel, definition: parentOption.definition, parentOptions: [parentOption] };
        return parentSuggestion;
    };

    // suggestions: the readings of the column, most probable first, with the probability the model estimates
    self.showSuggestion = function (columnNode, suggestions) {
        // deleted or mapped while the model answered
        if (!self.isColumnOpen(columnNode.id)) {
            self.clearColumn(columnNode.id);
            return;
        }
        // the readings are chosen in the Classes tree
        if (self.panelColumnId == columnNode.id) {
            self.showMessage("");
        }
        var candidates = suggestions.map(function (suggestion) {
            return { suggestion: suggestion, drawnClasses: self.getDrawnClasses(suggestion) };
        });
        self.suggestionsByColumnId[columnNode.id] = { columnNode: columnNode, candidates: candidates };
        self.showInTree();
    };

    self.isColumnOpen = function (columnId) {
        var columnNode = AIMappingColumnsGraph.visjsGraph.data.nodes.get(columnId);
        var isOpen = Boolean(columnNode) && !AIMappingColumnsGraph.getColumnClass(columnNode);
        return isOpen;
    };

    // a label of the model, never read as html, with its definition on hover
    self.getTreeNodeText = function (label, color, definition) {
        var nodeSpan = $("<span>")
            .css("color", color)
            .attr("title", definition || "")
            .text(label);
        var nodeText = nodeSpan[0].outerHTML;
        return nodeText;
    };

    // the readings of the column the Classes tree maps to, none when it has none: per reading its class with its probability,
    // under it the superclasses of a new class, one per superclass the model hesitated between, each with its probability
    self.getTreeNodes = function () {
        var columnSuggestion = self.suggestionsByColumnId[AIMappingColumnsGraph.currentGraphNode.id];
        if (!columnSuggestion || !self.isColumnOpen(columnSuggestion.columnNode.id)) {
            return [];
        }
        var columnId = columnSuggestion.columnNode.id;
        var classColor = AIMappingModeler.legendItems.Class.color;
        var headerText = $("<span>")
            .css({ "font-weight": "bold", color: classColor })
            .text("AI proposal for " + columnSuggestion.columnNode.data.label);
        var treeNodes = [{ id: self.treeNodeId, parent: "Classes", text: headerText[0].outerHTML, data: { resourceType: "aiClassSuggestion" } }];
        columnSuggestion.candidates.forEach(function (candidate, candidateIndex) {
            var suggestion = candidate.suggestion;
            var drawnClass = candidate.drawnClasses[0];
            var candidateNodeId = self.treeNodeId + "_" + candidateIndex;
            var candidateColor = drawnClass.isNoClass ? self.valueColor : classColor;
            treeNodes.push({
                id: candidateNodeId,
                parent: self.treeNodeId,
                text: self.getTreeNodeText(drawnClass.label + self.getProbabilityText(suggestion), candidateColor, suggestion.definition),
                data: { resourceType: "aiClassSuggestion", columnId: columnId, candidateIndex: candidateIndex, describedResource: drawnClass.isNoClass ? null : drawnClass },
            });
            var superclasses = [];
            if (suggestion.parentOptions) {
                superclasses = suggestion.parentOptions.map(function (parentOption) {
                    var parentLabel = self.getExistingClassLabel(parentOption.parentId, parentOption.parentLabel);
                    return { resource: { label: parentLabel, resourceId: parentOption.parentId }, text: parentLabel + self.getProbabilityText(parentOption), definition: parentOption.definition };
                });
            } else {
                // a single superclass carries no probability of its own
                var drawnParents = candidate.drawnClasses.slice(1);
                superclasses = drawnParents.map(function (drawnParent) {
                    return { resource: drawnParent, text: drawnParent.label, definition: suggestion.definition };
                });
            }
            superclasses.forEach(function (superclass, parentIndex) {
                treeNodes.push({
                    id: candidateNodeId + "_" + parentIndex,
                    parent: candidateNodeId,
                    text: self.getTreeNodeText("subclass of " + superclass.text, classColor, superclass.definition),
                    data: { resourceType: "aiClassSuggestion", columnId: columnId, candidateIndex: candidateIndex, parentIndex: parentIndex, describedResource: superclass.resource },
                });
            });
        });
        return treeNodes;
    };

    // the readings of the column the Classes tree maps to, above the classes of the sources
    self.showInTree = function () {
        var proposalTree = $("#" + self.proposalTreeDivId).jstree(true);
        if (!proposalTree || !proposalTree.get_node("Classes")) {
            return;
        }
        if (proposalTree.get_node(self.treeNodeId)) {
            proposalTree.delete_node(self.treeNodeId);
        }
        self.getTreeNodes().forEach(function (treeNode) {
            var position = treeNode.id == self.treeNodeId ? "first" : "last";
            proposalTree.create_node(treeNode.parent, treeNode, position);
        });
        proposalTree.open_all(self.treeNodeId);
    };

    self.onTreeNodeSelect = function (treeNodeData) {
        // a second click on the same node must answer too
        $("#" + self.proposalTreeDivId)
            .jstree(true)
            .deselect_all(true);
        var columnSuggestion = self.suggestionsByColumnId[treeNodeData.columnId];
        // the title of the readings
        if (!columnSuggestion) {
            return;
        }
        // jstree keeps a copy of the node data: the objects of the suggestion are found again by their index
        var candidate = columnSuggestion.candidates[treeNodeData.candidateIndex];
        var parentOptions = candidate.suggestion.parentOptions || [];
        // undefined on the node of the reading itself, and on the superclass of a new class without options
        var clickedParent = parentOptions[treeNodeData.parentIndex];
        self.onSuggestionClick(columnSuggestion, candidate, clickedParent);
    };

    self.getBoxWidth = function (label) {
        self.measureContext.font = self.font;
        var boxWidth = self.measureContext.measureText(label).width + 2 * self.boxPaddingX;
        return boxWidth;
    };

    self.drawLink = function (context, fromPoint, toPoint) {
        var color = AIMappingModeler.legendItems.Class.color;
        var fromY = fromPoint.y - self.boxHeight / 2;
        var toY = toPoint.y + self.boxHeight / 2;
        context.globalAlpha = self.boxOpacity;
        context.strokeStyle = color;
        context.fillStyle = color;
        context.lineWidth = self.linkWidth;
        context.setLineDash(self.linkDash);
        context.beginPath();
        context.moveTo(fromPoint.x, fromY);
        context.lineTo(toPoint.x, toY);
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(toPoint.x, toY);
        context.lineTo(toPoint.x - self.arrowSize / 2, toY + self.arrowSize);
        context.lineTo(toPoint.x + self.arrowSize / 2, toY + self.arrowSize);
        context.closePath();
        context.fill();
    };

    self.drawBox = function (context, box, color) {
        context.globalAlpha = self.boxOpacity;
        context.fillStyle = color;
        context.beginPath();
        context.roundRect(box.x - box.width / 2, box.y - self.boxHeight / 2, box.width, self.boxHeight, self.boxRadius);
        context.fill();
        context.globalAlpha = self.textOpacity;
        context.fillStyle = self.textColor;
        context.font = self.font;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(box.label, box.x, box.y);
    };

    // in the order the clicks follow: the implicit object, a restriction
    self.findAnyBoxAt = function (canvasPoint) {
        var implicitObjectBox = AIImplicitObjectSuggestion.findBoxAt(canvasPoint);
        if (implicitObjectBox) {
            return implicitObjectBox;
        }
        var restrictionSuggestion = AIColumnRestrictionSuggestion.findSuggestionAt(canvasPoint);
        var restrictionBox = restrictionSuggestion ? restrictionSuggestion.box : null;
        return restrictionBox;
    };

    // a real node or edge keeps its own menu: showGraphPopupMenu has already made it the current graph node
    self.onGraphRightClick = function (contextParams) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        if (network.getNodeAt(contextParams.pointer.DOM) || network.getEdgeAt(contextParams.pointer.DOM)) {
            return;
        }
        var box = self.findAnyBoxAt(contextParams.pointer.canvas);
        // the box of a virtual column describes no resource
        if (!box || !box.describedResource) {
            return;
        }
        self.popupMenuResource = box.describedResource;
        $("#popupMenuWidgetDiv").html('<span class="popupMenuItem" onclick="AIColumnClassSuggestion.showPopupMenuResourceInfos()">Node Infos</span>');
        PopupMenuWidget.showPopup({ x: contextParams.event.x, y: contextParams.event.y }, "popupMenuWidgetDiv");
    };

    self.showPopupMenuResourceInfos = function () {
        var resource = self.popupMenuResource;
        if (resource.newClassSuggestion) {
            return self.showNewClassInfos(resource.newClassSuggestion);
        }
        var resourceNode = { id: resource.resourceId, data: { id: resource.resourceId, label: resource.label } };
        NodeInfosWidget.showNodeInfos(AIMappingColumnsGraph.getResourceSource(resource.resourceId), resourceNode, "smallDialogDiv");
    };

    // a new class is not in the ontology yet: its infos are the triples writeNewClass would write
    self.showNewClassInfos = function (suggestion) {
        var infoRows = [
            { predicate: "rdfs:label", value: suggestion.label },
            { predicate: "rdfs:subClassOf", value: suggestion.parentLabel },
            { predicate: "skos:definition", value: suggestion.definition },
        ];
        var infosTable = $("<table class='infosTable'>");
        infoRows.forEach(function (infoRow) {
            // text of the model, never read as html
            var predicateCell = $("<td class='NodesInfos_CardId'>").text(infoRow.predicate);
            var valueCell = $("<td>").text(infoRow.value);
            infosTable.append($("<tr>").append(predicateCell, valueCell));
        });
        var dialogDiv = $("#smallDialogDiv");
        dialogDiv.empty();
        dialogDiv.append($("<div style='font-style: italic'>").text("Suggested class, written in " + AIMappingModeler.currentSLSsource + " once accepted"));
        dialogDiv.append(infosTable);
        UI.openDialog("smallDialogDiv", { title: "Node infos : " + suggestion.label });
    };

    self.onGraphMouseMove = function (event) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        var canvasPoint = network.DOMtoCanvas({ x: event.offsetX, y: event.offsetY });
        event.target.style.cursor = self.findAnyBoxAt(canvasPoint) ? "pointer" : "";
    };

    // the tool draws a new network when its graph is cleared or a source opens
    self.bindToGraph = function () {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        if (self.boundNetwork === network) {
            return;
        }
        self.boundNetwork = network;
        network.on("oncontext", self.onGraphRightClick);
        $("#" + AIMappingColumnsGraph.graphDiv + " canvas")
            .off("mousemove.columnClassSuggestion")
            .on("mousemove.columnClassSuggestion", self.onGraphMouseMove);
    };

    self.redraw = function () {
        var graph = AIMappingColumnsGraph.visjsGraph;
        if (graph && graph.network) {
            graph.network.redraw();
        }
    };

    // no move when the suggestion is already in view: the graph would jump at every column
    self.showInView = function (boxes) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        var graphDiv = $("#" + AIMappingColumnsGraph.graphDiv);
        var viewWidth = graphDiv.width();
        var viewHeight = graphDiv.height();
        // the technical tabs hide the graph
        if (viewWidth == 0) {
            return;
        }
        var isInView = boxes.every(function (box) {
            var domPoint = network.canvasToDOM({ x: box.x, y: box.y });
            return domPoint.x >= 0 && domPoint.y >= 0 && domPoint.x <= viewWidth && domPoint.y <= viewHeight;
        });
        if (isInView) {
            return;
        }
        var points = Object.values(network.getPositions()).concat(boxes);
        var xValues = points.map((point) => point.x);
        var yValues = points.map((point) => point.y);
        var minX = Math.min(...xValues);
        var maxX = Math.max(...xValues);
        var minY = Math.min(...yValues);
        var maxY = Math.max(...yValues);
        var scale = Math.min(viewWidth / (maxX - minX + self.viewMargin), viewHeight / (maxY - minY + self.viewMargin), network.getScale());
        network.moveTo({ position: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, scale: scale, animation: { duration: self.viewAnimationDuration } });
    };

    self.mapColumnToClass = function (columnNode, classId) {
        var previousGraphNode = AIMappingColumnsGraph.currentGraphNode;
        // drawResource links the class to currentGraphNode, then makes the class current
        AIMappingColumnsGraph.currentGraphNode = columnNode;
        AIMappingModeler.currentResourceType = "Class";
        AIMappingModeler.onSuggestionsSelect(null, { node: { id: classId } });
        // the user may be working on another column
        if (previousGraphNode.id != columnNode.id) {
            AIMappingColumnsGraph.currentGraphNode = previousGraphNode;
        }
    };

    // the new class of a suggestion written in the source and added to the classes of the tool
    self.writeNewClass = function (suggestion, callback) {
        var source = AIMappingModeler.currentSLSsource;
        var triples = Lineage_createResource.getResourceTriples(source, "owl:Class", null, suggestion.label, suggestion.parentId);
        var classId = triples[0].subject;
        // triplesObjectToString reads the part after @ as the language of the literal
        triples.push({ subject: classId, predicate: "skos:definition", object: Sparql_common.formatStringForTriple(suggestion.definition) + "@en" });
        Lineage_createResource.writeResource(source, triples, function (error, createdClassId) {
            if (error) {
                return callback(error);
            }
            AIMappingModeler.registerCreatedResource("Class", {
                id: createdClassId,
                label: suggestion.label,
                resourceType: "Class",
                data: { id: createdClassId, label: suggestion.label, type: "Class", subType: null },
            });
            callback(null, createdClassId);
        });
    };

    self.createClass = function (columnSuggestion, suggestion) {
        var columnNode = columnSuggestion.columnNode;
        self.writeNewClass(suggestion, function (error, createdClassId) {
            if (error) {
                // nothing else can ask again for this column
                self.suggestionsByColumnId[columnNode.id] = columnSuggestion;
                self.showInTree();
                return MainController.errorAlert(error);
            }
            self.mapColumnToClass(columnNode, createdClassId);
        });
    };

    self.getConfirmationText = function (columnNode, suggestion) {
        var definitionText = suggestion.definition ? "\n\n" + suggestion.definition : "";
        var suggestionText = self.getSuggestionText(suggestion);
        var estimateText = suggestionText.includes(" %") ? "\n\nPercentages estimated by the model." : "";
        if (self.noClassKinds[suggestion.columnKind]) {
            var keepText = 'Keep column "' + columnNode.data.label + '" as ' + suggestionText + "?" + definitionText + estimateText;
            return keepText;
        }
        var confirmationText = 'Map column "' + columnNode.data.label + '" to the ' + suggestionText + "?" + definitionText + estimateText;
        return confirmationText;
    };

    // the class this suggestion stands for, now that others may have been accepted: null for a class still to create
    self.getClassIdToMap = function (suggestion) {
        if (suggestion.columnKind == "existingClass") {
            return suggestion.classId;
        }
        var sameLabelClass = self.getLocalClasses().find(function (localClass) {
            return localClass.label.toLowerCase() == suggestion.label.toLowerCase();
        });
        var classIdToMap = sameLabelClass ? sameLabelClass.id : null;
        return classIdToMap;
    };

    // a refused candidate, or a refused superclass of a new class, goes alone: the others stay
    self.onSuggestionClick = function (columnSuggestion, clickedCandidate, clickedParent) {
        var columnNode = columnSuggestion.columnNode;
        var candidateSuggestion = clickedCandidate.suggestion;
        var parentOptions = candidateSuggestion.parentOptions;
        // a superclass node chooses the superclass, the class node takes the most probable one
        var chosenParent = clickedParent || (parentOptions ? parentOptions[0] : null);
        var suggestion = chosenParent ? self.getSuggestionUnderParent(candidateSuggestion, chosenParent) : candidateSuggestion;
        var isAccepted = confirm(self.getConfirmationText(columnNode, suggestion));
        if (!isAccepted && clickedParent && parentOptions.length > 1) {
            candidateSuggestion.parentOptions = parentOptions.filter(function (parentOption) {
                return parentOption !== clickedParent;
            });
            return self.showInTree();
        }
        if (!isAccepted) {
            columnSuggestion.candidates = columnSuggestion.candidates.filter(function (candidate) {
                return candidate !== clickedCandidate;
            });
            if (columnSuggestion.candidates.length == 0) {
                return self.clearColumn(columnNode.id);
            }
            return self.showInTree();
        }
        // a reading without a class: the other readings go, nothing is written
        if (self.noClassKinds[suggestion.columnKind]) {
            return self.clearColumn(columnNode.id);
        }
        var classIdToMap = self.getClassIdToMap(suggestion);
        // the classes of the tool load after it opens, and may lag behind the ontologies prepared on the server
        if (!AIMappingModeler.allClasses || (classIdToMap && !AIMappingModeler.allResourcesMap[classIdToMap])) {
            UI.message('The classes of this source do not hold "' + suggestion.label + '" yet, refresh them and click again');
            return;
        }
        // gone before the write: a second click cannot write the class twice
        self.clearColumn(columnNode.id);
        if (classIdToMap) {
            self.mapColumnToClass(columnNode, classIdToMap);
        } else {
            self.createClass(columnSuggestion, suggestion);
        }
    };

    return self;
})();

export default AIColumnClassSuggestion;
window.AIColumnClassSuggestion = AIColumnClassSuggestion;
