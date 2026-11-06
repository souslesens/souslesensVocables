import Lineage_createResource from "../lineage/lineage_createResource.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import AIMappingModeler from "./aiMappingModeler.js";
import AIDataSourceManager from "./aiDataSourcesManager.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIColumnRestrictionSuggestion from "./aiColumnRestrictionSuggestion.js";
import AIImplicitObjectSuggestion from "./aiImplicitObjectSuggestion.js";

/**
 * Suggests what a selected column maps to: a new class of the application ontology, a class that
 * already denotes its objects, a value that maps to no class, or a technical key, which maps to no class either.
 * A suggestion is drawn over the graph and is never one of its nodes: everything that reads the graph,
 * the saved mapping, the technical mappings and the triples first of all, stays unaware of it,
 * and the layout does not move when it comes and goes. Nothing is written before the user accepts it.
 * @module AIColumnClassSuggestion
 */
var AIColumnClassSuggestion = (function () {
    var self = {};

    self.panelDivId = "aiMappingModeler_columnClassSuggestionDiv";
    // same number of rows as the ontology generation
    self.sampleRowCount = 5;
    // beyond this the classes of an ontology no longer fit a call answered while the user waits
    self.maxClassesPerOntology = 1000;
    self.boxOpacity = 0.35;
    self.textOpacity = 0.75;
    self.boxHeight = 26;
    self.boxPaddingX = 8;
    self.boxRadius = 6;
    // between two candidates of one column
    self.candidateGap = 24;
    // the server brings the probabilities of the readings of a column back to this total
    self.fullProbability = 100;
    // the readings that map the column to no class: the label of their box, and the text of the panel and of the confirmation
    self.noClassKinds = {
        value: { label: "not a class", text: "a value, no class" },
        technicalKey: { label: "technical key, not a class", text: "a technical key, no class" },
    };
    self.valueColor = "#b0b0b0";
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
    // { label, resourceId } or { label, newClassSuggestion } of the box right clicked last
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
        var serverMessage = error.responseJSON ? error.responseJSON.error || error.responseJSON.message : null;
        var errorText = serverMessage || error.responseText || error.statusText || "no answer from the server";
        return errorText;
    };

    self.prepare = function () {
        self.clearAll();
        self.currentTableKey = null;
        self.sampleRowsByTable = {};
        self.leftOutOntologies = [];
        var source = AIMappingModeler.currentSLSsource;
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
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingModeler/preparation",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                var unreachableDatabases = Object.keys(result.databaseErrors);
                if (unreachableDatabases.length > 0) {
                    UI.message("AI suggestions read no schema for: " + unreachableDatabases.join(", "));
                }
            },
            error: function (error) {
                UI.message("AI suggestions are not ready: " + self.getErrorText(error));
            },
        });
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

    // its rows are read ahead
    self.onColumnsListed = function () {
        var currentDataSource = AIDataSourceManager.currentConfig.currentDataSource;
        var tableName = AIMappingModeler.currentTable.name;
        var tableKey = self.getTableKey(currentDataSource.id, tableName);
        if (self.currentTableKey && self.currentTableKey != tableKey) {
            self.clearAll();
        }
        self.currentTableKey = tableKey;
        self.getSampleRows(currentDataSource.id, tableName, function () {});
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
        self.redraw();
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

        var pendingRequest = { xhr: null };
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
            pendingRequest.xhr = $.ajax({
                type: "POST",
                url: Config.apiUrl + "/ai/aiMappingModeler/columnClassSuggestion",
                data: JSON.stringify(payload),
                contentType: "application/json",
                dataType: "json",
                success: function (result) {
                    delete self.requestsByColumnId[columnNode.id];
                    self.showSuggestion(columnNode, result.suggestions, result.llmMilliseconds);
                },
                error: function (error) {
                    if (error.statusText == "abort") {
                        return;
                    }
                    delete self.requestsByColumnId[columnNode.id];
                    if (self.panelColumnId == columnNode.id) {
                        self.showMessage("AI suggestion for " + column + " failed: " + self.getErrorText(error));
                    }
                },
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
    // a value is drawn as such, so that the other readings read as an alternative to it
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
    self.showSuggestion = function (columnNode, suggestions, llmMilliseconds) {
        // deleted or mapped while the model answered
        if (!self.isColumnOpen(columnNode.id)) {
            self.clearColumn(columnNode.id);
            return;
        }
        var seconds = (llmMilliseconds / 1000).toFixed(1);
        var readingTexts = suggestions.map(function (suggestion) {
            return self.getSuggestionText(suggestion);
        });
        var technicalKeySuggestion = suggestions.find(function (suggestion) {
            return suggestion.columnKind == "technicalKey";
        });
        var explanationText = technicalKeySuggestion ? " " + technicalKeySuggestion.definition : "";
        var message =
            "AI suggestion for " +
            columnNode.data.label +
            " (" +
            seconds +
            " s): " +
            readingTexts.join("; ") +
            "." +
            explanationText +
            " Click one in the graph to accept it, hover a class for its definition.";
        var isShownColumn = self.panelColumnId == columnNode.id;
        if (isShownColumn) {
            self.showMessage(message);
        }
        var candidates = suggestions.map(function (suggestion) {
            return { suggestion: suggestion, drawnClasses: self.getDrawnClasses(suggestion) };
        });
        var columnSuggestion = { columnNode: columnNode, candidates: candidates };
        self.suggestionsByColumnId[columnNode.id] = columnSuggestion;
        self.bindToGraph();
        self.redraw();
        if (isShownColumn) {
            self.showInView(self.getBoxes(columnSuggestion));
        }
    };

    self.isColumnOpen = function (columnId) {
        var columnNode = AIMappingColumnsGraph.visjsGraph.data.nodes.get(columnId);
        var isOpen = Boolean(columnNode) && !AIMappingColumnsGraph.getColumnClass(columnNode);
        return isOpen;
    };

    self.getDrawnSuggestions = function () {
        var columnSuggestions = Object.values(self.suggestionsByColumnId);
        var drawnSuggestions = columnSuggestions.filter(function (columnSuggestion) {
            var columnId = columnSuggestion.columnNode.id;
            return self.isColumnOpen(columnId) && !AIMappingColumnsGraph.visjsGraph.data.nodes.get(columnId).hidden;
        });
        return drawnSuggestions;
    };

    // per candidate, side by side above the column, its class with its probability then its superclass;
    // canvas coordinates recomputed from the column: a layout or a drag of the real nodes carries them along
    self.getBoxWidth = function (label) {
        self.measureContext.font = self.font;
        var boxWidth = self.measureContext.measureText(label).width + 2 * self.boxPaddingX;
        return boxWidth;
    };

    // the boxes of the superclasses of a new class, one per superclass the model hesitated between, each with its probability
    self.getParentBoxes = function (candidate) {
        var parentOptions = candidate.suggestion.parentOptions;
        if (!parentOptions) {
            var drawnParents = candidate.drawnClasses.slice(1);
            return drawnParents.map(function (drawnParent) {
                return { label: drawnParent.label, width: self.getBoxWidth(drawnParent.label), describedResource: drawnParent };
            });
        }
        var parentBoxes = parentOptions.map(function (parentOption) {
            var parentResource = { label: self.getExistingClassLabel(parentOption.parentId, parentOption.parentLabel), resourceId: parentOption.parentId };
            var parentBoxLabel = parentResource.label + self.getProbabilityText(parentOption);
            return { label: parentBoxLabel, width: self.getBoxWidth(parentBoxLabel), describedResource: parentResource, parentOption: parentOption };
        });
        return parentBoxes;
    };

    self.getRowWidth = function (boxWidths) {
        var rowWidth = (boxWidths.length - 1) * self.candidateGap;
        boxWidths.forEach(function (boxWidth) {
            rowWidth += boxWidth;
        });
        return rowWidth;
    };

    // the left edges of boxes placed side by side and centered on centerX, in the order given
    self.getRowLefts = function (boxWidths, centerX) {
        var rowLefts = [];
        var boxLeft = centerX - self.getRowWidth(boxWidths) / 2;
        boxWidths.forEach(function (boxWidth) {
            rowLefts.push(boxLeft);
            boxLeft += boxWidth + self.candidateGap;
        });
        return rowLefts;
    };

    // the center of a row of boxes on the rows rowYs, moved right past every real node that would sit under it
    self.getFreeCenterX = function (rowWidth, centerX, rowYs) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        var shownNodes = AIMappingColumnsGraph.visjsGraph.data.nodes.get({
            filter: function (graphNode) {
                return !graphNode.hidden;
            },
        });
        var nodeBoxes = shownNodes.map(function (shownNode) {
            return network.getBoundingBox(shownNode.id);
        });
        var rowNodeBoxes = nodeBoxes.filter(function (nodeBox) {
            return rowYs.some(function (rowY) {
                return nodeBox.top <= rowY + self.boxHeight / 2 && nodeBox.bottom >= rowY - self.boxHeight / 2;
            });
        });
        var freeCenterX = centerX;
        // each move may bring the row over the next node: as many tries as there are nodes on the rows
        for (var nodeIndex = 0; nodeIndex < rowNodeBoxes.length; nodeIndex++) {
            var rowLeft = freeCenterX - rowWidth / 2 - self.candidateGap;
            var rowRight = freeCenterX + rowWidth / 2 + self.candidateGap;
            var blockingBox = rowNodeBoxes.find(function (nodeBox) {
                return nodeBox.left < rowRight && nodeBox.right > rowLeft;
            });
            if (!blockingBox) {
                break;
            }
            freeCenterX = blockingBox.right + self.candidateGap + rowWidth / 2;
        }
        return freeCenterX;
    };

    // per candidate, side by side above the column: its class with its probability, then its superclasses side by side above it
    self.getCandidateLayouts = function (columnSuggestion) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        var columnPosition = network.getPosition(columnSuggestion.columnNode.id);
        var levelSeparation = AIMappingColumnsGraph.layoutHierarchical.levelSeparation;
        var candidateLayouts = columnSuggestion.candidates.map(function (candidate) {
            var drawnClass = candidate.drawnClasses[0];
            var classBoxLabel = drawnClass.label + self.getProbabilityText(candidate.suggestion);
            var classBox = { label: classBoxLabel, width: self.getBoxWidth(classBoxLabel), describedResource: drawnClass.isNoClass ? null : drawnClass };
            var parentBoxes = self.getParentBoxes(candidate);
            var parentWidths = parentBoxes.map(function (parentBox) {
                return parentBox.width;
            });
            var candidateWidth = Math.max(classBox.width, self.getRowWidth(parentWidths));
            return { candidate: candidate, columnPosition: columnPosition, classBox: classBox, parentBoxes: parentBoxes, parentWidths: parentWidths, width: candidateWidth };
        });
        var candidateWidths = candidateLayouts.map(function (candidateLayout) {
            return candidateLayout.width;
        });
        var rowYs = [columnPosition.y - levelSeparation, columnPosition.y - 2 * levelSeparation];
        var rowCenterX = self.getFreeCenterX(self.getRowWidth(candidateWidths), columnPosition.x, rowYs);
        var candidateLefts = self.getRowLefts(candidateWidths, rowCenterX);
        candidateLayouts.forEach(function (candidateLayout, candidateIndex) {
            var candidateX = candidateLefts[candidateIndex] + candidateLayout.width / 2;
            candidateLayout.classBox.x = candidateX;
            candidateLayout.classBox.y = columnPosition.y - candidateLayout.candidate.drawnClasses[0].levelsAboveColumn * levelSeparation;
            var parentLefts = self.getRowLefts(candidateLayout.parentWidths, candidateX);
            candidateLayout.parentBoxes.forEach(function (parentBox, parentIndex) {
                parentBox.x = parentLefts[parentIndex] + parentBox.width / 2;
                parentBox.y = columnPosition.y - 2 * levelSeparation;
            });
            candidateLayout.boxes = [candidateLayout.classBox].concat(candidateLayout.parentBoxes);
        });
        return candidateLayouts;
    };

    self.getBoxes = function (columnSuggestion) {
        var boxes = [];
        self.getCandidateLayouts(columnSuggestion).forEach(function (candidateLayout) {
            boxes = boxes.concat(candidateLayout.boxes);
        });
        return boxes;
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

    self.draw = function (context) {
        context.save();
        self.getDrawnSuggestions().forEach(function (columnSuggestion) {
            self.getCandidateLayouts(columnSuggestion).forEach(function (candidateLayout) {
                // from the column to the class, from the class to each of its superclasses
                var isNoClass = Boolean(candidateLayout.candidate.drawnClasses[0].isNoClass);
                var boxColor = isNoClass ? self.valueColor : AIMappingModeler.legendItems.Class.color;
                self.drawLink(context, candidateLayout.columnPosition, candidateLayout.classBox);
                self.drawBox(context, candidateLayout.classBox, boxColor);
                candidateLayout.parentBoxes.forEach(function (parentBox) {
                    self.drawLink(context, candidateLayout.classBox, parentBox);
                    self.drawBox(context, parentBox, boxColor);
                });
            });
        });
        context.restore();
    };

    // { columnSuggestion, candidate, box } under the point, null when none
    self.findSuggestionAt = function (canvasPoint) {
        var foundSuggestion = null;
        self.getDrawnSuggestions().forEach(function (columnSuggestion) {
            self.getCandidateLayouts(columnSuggestion).forEach(function (candidateLayout) {
                var boxUnderPoint = candidateLayout.boxes.find(function (box) {
                    return AIColumnRestrictionSuggestion.isPointInBox(canvasPoint, box);
                });
                if (boxUnderPoint) {
                    foundSuggestion = { columnSuggestion: columnSuggestion, candidate: candidateLayout.candidate, box: boxUnderPoint };
                }
            });
        });
        return foundSuggestion;
    };

    // in the order the clicks follow: a class suggestion, the implicit object, a restriction
    self.findAnyBoxAt = function (canvasPoint) {
        var classSuggestion = self.findSuggestionAt(canvasPoint);
        if (classSuggestion) {
            return classSuggestion.box;
        }
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

    self.onGraphClick = function (clickParams) {
        // a real node takes the click; a real edge under a box does not, the box is drawn over it
        if (clickParams.nodes.length > 0) {
            return;
        }
        var clickedSuggestion = self.findSuggestionAt(clickParams.pointer.canvas);
        if (clickedSuggestion) {
            self.onSuggestionClick(clickedSuggestion);
        }
    };

    self.onGraphMouseMove = function (event) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        var canvasPoint = network.DOMtoCanvas({ x: event.offsetX, y: event.offsetY });
        var hoveredSuggestion = self.findSuggestionAt(canvasPoint);
        var hoveredRestriction = AIColumnRestrictionSuggestion.findSuggestionAt(canvasPoint);
        var isOverImplicitObject = Boolean(AIImplicitObjectSuggestion.findBoxAt(canvasPoint));
        event.target.style.cursor = hoveredSuggestion || hoveredRestriction || isOverImplicitObject ? "pointer" : "";
        var hoveredOption = hoveredSuggestion ? hoveredSuggestion.box.parentOption || hoveredSuggestion.candidate.suggestion : null;
        event.target.title = hoveredOption && hoveredOption.definition ? hoveredOption.definition : "";
    };

    // the tool draws a new network when its graph is cleared or a source opens
    self.bindToGraph = function () {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        if (self.boundNetwork === network) {
            return;
        }
        self.boundNetwork = network;
        network.on("afterDrawing", self.draw);
        network.on("click", self.onGraphClick);
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
                self.redraw();
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
    self.onSuggestionClick = function (clickedSuggestion) {
        var columnSuggestion = clickedSuggestion.columnSuggestion;
        var columnNode = columnSuggestion.columnNode;
        var candidateSuggestion = clickedSuggestion.candidate.suggestion;
        var parentOptions = candidateSuggestion.parentOptions;
        var clickedParent = clickedSuggestion.box.parentOption;
        // a superclass box chooses the superclass, the class box takes the most probable one
        var chosenParent = clickedParent || (parentOptions ? parentOptions[0] : null);
        var suggestion = chosenParent ? self.getSuggestionUnderParent(candidateSuggestion, chosenParent) : candidateSuggestion;
        var isAccepted = confirm(self.getConfirmationText(columnNode, suggestion));
        if (!isAccepted && clickedParent && parentOptions.length > 1) {
            candidateSuggestion.parentOptions = parentOptions.filter(function (parentOption) {
                return parentOption !== clickedParent;
            });
            return self.redraw();
        }
        if (!isAccepted) {
            columnSuggestion.candidates = columnSuggestion.candidates.filter(function (candidate) {
                return candidate !== clickedSuggestion.candidate;
            });
            if (columnSuggestion.candidates.length == 0) {
                return self.clearColumn(columnNode.id);
            }
            return self.redraw();
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
