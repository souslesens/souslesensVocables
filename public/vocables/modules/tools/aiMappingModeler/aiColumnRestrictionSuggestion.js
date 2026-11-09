import Lineage_createRelation from "../lineage/lineage_createRelation.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import AIMappingModeler from "./aiMappingModeler.js";
import AIDataSourceManager from "./aiDataSourcesManager.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIMappingModelerRelations from "./aiMappingModelerRelations.js";
import AIColumnClassSuggestion from "./aiColumnClassSuggestion.js";
import AIImplicitObjectSuggestion from "./aiImplicitObjectSuggestion.js";

/**
 * Suggests, once a column gets its class, the restrictions that link it to the other mapped columns of its table:
 * those the ontology already holds, and those the model chooses among the properties allowed between the two classes.
 * Drawn over the graph like the class suggestions, never one of its edges; nothing is written before the user accepts one.
 * @module AIColumnRestrictionSuggestion
 */
var AIColumnRestrictionSuggestion = (function () {
    var self = {};

    // above the row of the columns, below their classes: underneath, the edges from the table to every column would take the click
    self.curveDepthRatio = 0.4;
    // the middle of the curve rises by half of it, the label boxes must not overlap there
    self.curveDepthStep = 64;
    self.ontologyOrigin = "ontology";
    self.modelOrigin = "model";
    // Manchester syntax
    self.kindLabels = {
        someValuesFrom: "some",
        allValuesFrom: "only",
        qualifiedCardinality: "exactly",
        minQualifiedCardinality: "min",
        maxQualifiedCardinality: "max",
    };
    self.kindRegex = /[^#]+$/;
    self.requestsByColumnId = {};
    // insertion order is the drawing order
    self.suggestionsByPairKey = {};
    self.boundNetwork = null;

    self.getPairKey = function (columnId1, columnId2) {
        var sortedColumnIds = [columnId1, columnId2].sort();
        var pairKey = sortedColumnIds.join("|");
        return pairKey;
    };

    self.hasEdgeBetween = function (columnId1, columnId2) {
        var pairEdges = AIMappingColumnsGraph.visjsGraph.data.edges.get({
            filter: function (edge) {
                return (edge.from == columnId1 && edge.to == columnId2) || (edge.from == columnId2 && edge.to == columnId1);
            },
        });
        var hasEdge = pairEdges.length > 0;
        return hasEdge;
    };

    // a column typed as a class gets its restrictions row by row from the mapping, not from here
    self.isLinkableColumn = function (columnId) {
        var columnNode = AIMappingColumnsGraph.visjsGraph.data.nodes.get(columnId);
        var isLinkable = Boolean(columnNode) && AIColumnClassSuggestion.mappedColumnTypes.indexOf(columnNode.data.type) > -1 && !AIMappingColumnsGraph.isClassColumn(columnId);
        return isLinkable;
    };

    self.countColumnSuggestions = function (columnId) {
        var columnSuggestions = Object.values(self.suggestionsByPairKey).filter(function (restrictionSuggestion) {
            return restrictionSuggestion.validatedColumnId == columnId;
        });
        return columnSuggestions.length;
    };

    // the classes of the two columns are kept: a suggestion holds only as long as they do
    self.addSuggestion = function (validatedColumnId, fromColumnId, toColumnId, restriction, origin) {
        var pairKey = self.getPairKey(fromColumnId, toColumnId);
        var existingSuggestion = self.suggestionsByPairKey[pairKey];
        var isOntologyReplacingModel = existingSuggestion && existingSuggestion.origin == self.modelOrigin && origin == self.ontologyOrigin;
        if (existingSuggestion && !isOntologyReplacingModel) {
            return;
        }
        self.suggestionsByPairKey[pairKey] = {
            validatedColumnId: validatedColumnId,
            fromColumnId: fromColumnId,
            toColumnId: toColumnId,
            fromClassId: AIMappingColumnsGraph.getColumnClass(fromColumnId),
            toClassId: AIMappingColumnsGraph.getColumnClass(toColumnId),
            property: restriction.property,
            restrictionType: restriction.restrictionType,
            cardinality: restriction.cardinality,
            origin: origin,
        };
    };

    self.clearAll = function () {
        Object.values(self.requestsByColumnId).forEach(function (pendingRequest) {
            if (pendingRequest.xhr) {
                pendingRequest.xhr.abort();
            }
        });
        self.requestsByColumnId = {};
        self.suggestionsByPairKey = {};
        AIImplicitObjectSuggestion.clear();
        AIColumnClassSuggestion.redraw();
    };

    // the panel belongs to the class suggestion of the column being added
    self.showMessage = function (message) {
        if (!AIColumnClassSuggestion.panelColumnId) {
            AIColumnClassSuggestion.showMessage(message);
        }
    };

    self.suggest = function (columnNode) {
        if (!self.isLinkableColumn(columnNode.id)) {
            return;
        }
        var mappedColumns = AIColumnClassSuggestion.getMappedColumns();
        var mappedColumn = mappedColumns.find(function (candidateColumn) {
            return candidateColumn.columnId == columnNode.id;
        });
        // mapped to the default class
        if (!mappedColumn) {
            return;
        }
        // asked for the class the column had before
        for (var pairKey in self.suggestionsByPairKey) {
            var restrictionSuggestion = self.suggestionsByPairKey[pairKey];
            if (restrictionSuggestion.fromColumnId == columnNode.id || restrictionSuggestion.toColumnId == columnNode.id) {
                delete self.suggestionsByPairKey[pairKey];
            }
        }
        var otherColumns = mappedColumns.filter(function (otherColumn) {
            return (
                otherColumn.columnId != columnNode.id &&
                otherColumn.table == mappedColumn.table &&
                self.isLinkableColumn(otherColumn.columnId) &&
                !self.hasEdgeBetween(columnNode.id, otherColumn.columnId)
            );
        });
        if (otherColumns.length == 0) {
            return;
        }
        var previousRequest = self.requestsByColumnId[columnNode.id];
        if (previousRequest && previousRequest.xhr) {
            previousRequest.xhr.abort();
        }
        var pendingRequest = { xhr: null, classId: mappedColumn.classId };
        self.requestsByColumnId[columnNode.id] = pendingRequest;
        self.showMessage("AI restrictions for " + mappedColumn.column + "...");
        self.addOntologyRestrictions(columnNode.id, otherColumns, pendingRequest);
        self.askModel(columnNode, mappedColumn, otherColumns, pendingRequest);
    };

    // a later request or a clearing replaced it, or the column lost or changed its class while it ran
    self.isRequestCurrent = function (columnId, pendingRequest) {
        var isCurrent = self.requestsByColumnId[columnId] === pendingRequest && AIMappingColumnsGraph.getColumnClass(columnId) == pendingRequest.classId;
        return isCurrent;
    };

    self.addOntologyRestrictions = function (columnId, otherColumns, pendingRequest) {
        var otherColumnIds = otherColumns.map(function (otherColumn) {
            return otherColumn.columnId;
        });
        AIMappingModelerRelations.listPossibleRelations(function (error, jstreeData) {
            if (error || !self.isRequestCurrent(columnId, pendingRequest)) {
                return;
            }
            jstreeData.forEach(function (jstreeNode) {
                var relation = jstreeNode.data;
                // an axiom of an upper ontology already holds by inheritance and names no business relationship
                if (!relation || relation.isAlreadyExisting || relation.source != AIMappingModeler.currentSLSsource) {
                    return;
                }
                var isFromColumn = relation.fromColumn.id == columnId && otherColumnIds.indexOf(relation.toColumn.id) > -1;
                var isToColumn = relation.toColumn.id == columnId && otherColumnIds.indexOf(relation.fromColumn.id) > -1;
                // a class linked to itself holds in both directions here: the model chooses which column is the parent
                var isSameClass = AIMappingColumnsGraph.getColumnClass(relation.fromColumn.id) == AIMappingColumnsGraph.getColumnClass(relation.toColumn.id);
                if ((isFromColumn || isToColumn) && !isSameClass) {
                    self.addSuggestion(columnId, relation.fromColumn.id, relation.toColumn.id, relation, self.ontologyOrigin);
                }
            });
            self.showSuggestions();
        });
    };

    self.askModel = function (columnNode, mappedColumn, otherColumns, pendingRequest) {
        var dataSourceId = columnNode.data.datasource;
        var tableColumns = AIMappingModeler.currentTable.columns;
        var dataSourceName = AIDataSourceManager.currentConfig.currentDataSource.name;
        AIColumnClassSuggestion.getSampleRows(dataSourceId, mappedColumn.table, function (sampleRows) {
            if (!self.isRequestCurrent(columnNode.id, pendingRequest)) {
                return;
            }
            // every table: an implicit object is never an object a column already identifies
            var allMappedColumns = AIColumnClassSuggestion.getMappedColumns();
            var mappedClassIds = allMappedColumns.map(function (anyMappedColumn) {
                return anyMappedColumn.classId;
            });
            var payload = {
                source: AIMappingModeler.currentSLSsource,
                dataSourceName: dataSourceName,
                table: mappedColumn.table,
                columns: tableColumns,
                sampleRows: sampleRows,
                localClasses: AIColumnClassSuggestion.getLocalClasses(),
                mappedClassIds: mappedClassIds,
                mappedColumn: mappedColumn,
                otherColumns: otherColumns,
            };
            if (AIDataSourceManager.currentConfig.databaseSources[dataSourceId]) {
                payload.databaseId = dataSourceId;
            }
            pendingRequest.xhr = $.ajax({
                type: "POST",
                url: Config.apiUrl + "/ai/aiMappingModeler/columnRestrictionSuggestion",
                data: JSON.stringify(payload),
                contentType: "application/json",
                dataType: "json",
                success: function (result) {
                    if (!self.isRequestCurrent(columnNode.id, pendingRequest)) {
                        return;
                    }
                    var columnIdsByName = {};
                    var linkedColumns = [mappedColumn].concat(otherColumns);
                    linkedColumns.forEach(function (linkedColumn) {
                        columnIdsByName[linkedColumn.column] = linkedColumn.columnId;
                    });
                    result.restrictions.forEach(function (restriction) {
                        self.addSuggestion(columnNode.id, columnIdsByName[restriction.fromColumn], columnIdsByName[restriction.toColumn], restriction, self.modelOrigin);
                    });
                    var seconds = ((result.allowedMilliseconds + result.llmMilliseconds) / 1000).toFixed(1);
                    var count = self.countColumnSuggestions(columnNode.id);
                    var countText = count > 0 ? count + ", click one in the graph to add it." : "none.";
                    var restrictionsText = "AI restrictions for " + mappedColumn.column + " (" + seconds + " s): " + countText;
                    var thinkingText = result.implicitJudgementId ? " AI suggestion extra thinking on an implicit object..." : "";
                    self.showMessage(restrictionsText + thinkingText);
                    self.showSuggestions();
                    if (result.implicitJudgementId) {
                        self.askImplicitJudgement(columnNode, linkedColumns, columnIdsByName, result.implicitJudgementId, pendingRequest, restrictionsText);
                    }
                },
                error: function (error) {
                    if (error.statusText == "abort" || !self.isRequestCurrent(columnNode.id, pendingRequest)) {
                        return;
                    }
                    self.showMessage("AI restrictions for " + mappedColumn.column + " failed: " + AIColumnClassSuggestion.getErrorText(error));
                },
            });
        });
    };

    // the implicit object some samples proposed, shown once a longer reasoning holds it legitimate;
    // linkedColumns: the column just mapped, then the other mapped columns of its table, with the classes they were judged with
    self.askImplicitJudgement = function (columnNode, linkedColumns, columnIdsByName, judgementId, pendingRequest, restrictionsText) {
        pendingRequest.xhr = $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingModeler/implicitObjectJudgement",
            data: JSON.stringify({ source: AIMappingModeler.currentSLSsource, judgementId: judgementId }),
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                if (!self.isRequestCurrent(columnNode.id, pendingRequest)) {
                    return;
                }
                // its restrictions were checked against the classes the columns had when it was asked
                var hasKeptClasses = linkedColumns.every(function (linkedColumn) {
                    return AIMappingColumnsGraph.getColumnClass(linkedColumn.columnId) == linkedColumn.classId;
                });
                if (result.implicitObject && hasKeptClasses) {
                    AIImplicitObjectSuggestion.offer(linkedColumns[0].table, result.implicitObject, columnIdsByName);
                }
                var drawnSuggestion = AIImplicitObjectSuggestion.getDrawnSuggestion();
                var isImplicitObjectShown = Boolean(result.implicitObject) && Boolean(drawnSuggestion) && drawnSuggestion.implicitObject === result.implicitObject;
                var seconds = (result.judgementMilliseconds / 1000).toFixed(1);
                var judgementText = "no implicit object kept.";
                if (isImplicitObjectShown) {
                    judgementText = "virtual column " + result.implicitObject.column + " proposed.";
                } else if (result.implicitObject) {
                    judgementText = "virtual column " + result.implicitObject.column + " kept but not shown: a column changed its class, or another virtual column is still proposed.";
                }
                self.showMessage(restrictionsText + " AI suggestion extra thinking (" + seconds + " s): " + judgementText);
                self.showSuggestions();
            },
            error: function (error) {
                if (error.statusText == "abort" || !self.isRequestCurrent(columnNode.id, pendingRequest)) {
                    return;
                }
                self.showMessage(restrictionsText + " AI suggestion extra thinking failed: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    self.showSuggestions = function () {
        self.bindToGraph();
        AIColumnClassSuggestion.redraw();
    };

    // both columns still shown, with the classes the restriction was chosen for, and not linked since
    self.getDrawnSuggestions = function () {
        var graphNodes = AIMappingColumnsGraph.visjsGraph.data.nodes;
        var restrictionSuggestions = Object.values(self.suggestionsByPairKey);
        var drawnSuggestions = restrictionSuggestions.filter(function (restrictionSuggestion) {
            var fromNode = graphNodes.get(restrictionSuggestion.fromColumnId);
            var toNode = graphNodes.get(restrictionSuggestion.toColumnId);
            if (!fromNode || !toNode || fromNode.hidden || toNode.hidden) {
                return false;
            }
            var hasSameClasses =
                AIMappingColumnsGraph.getColumnClass(fromNode.id) == restrictionSuggestion.fromClassId && AIMappingColumnsGraph.getColumnClass(toNode.id) == restrictionSuggestion.toClassId;
            return hasSameClasses && !self.hasEdgeBetween(fromNode.id, toNode.id);
        });
        return drawnSuggestions;
    };

    // a curve rises above the ones drawn before it on the same columns, never above unrelated ones
    self.getStackIndex = function (drawnSuggestions, suggestionIndex) {
        var restrictionSuggestion = drawnSuggestions[suggestionIndex];
        var columnIds = [restrictionSuggestion.fromColumnId, restrictionSuggestion.toColumnId];
        var earlierSuggestions = drawnSuggestions.slice(0, suggestionIndex);
        var sharingSuggestions = earlierSuggestions.filter(function (earlierSuggestion) {
            return columnIds.indexOf(earlierSuggestion.fromColumnId) > -1 || columnIds.indexOf(earlierSuggestion.toColumnId) > -1;
        });
        var stackIndex = sharingSuggestions.length;
        return stackIndex;
    };

    self.getRestrictionText = function (restriction) {
        var kind = restriction.restrictionType.match(self.kindRegex)[0];
        var cardinalityText = restriction.cardinality ? " " + restriction.cardinality.value : "";
        var restrictionText = restriction.property.label + " " + (self.kindLabels[kind] || kind) + cardinalityText;
        return restrictionText;
    };

    // canvas coordinates of the curve and of its label box, recomputed from its two ends at each drawing
    self.getCurve = function (fromPoint, toPoint, restriction, stackIndex) {
        var curveDepth = AIMappingColumnsGraph.layoutHierarchical.levelSeparation * self.curveDepthRatio + stackIndex * self.curveDepthStep;
        var controlPoint = { x: (fromPoint.x + toPoint.x) / 2, y: Math.min(fromPoint.y, toPoint.y) - curveDepth };
        var label = self.getRestrictionText(restriction);
        // the middle of a quadratic curve
        var box = {
            label: label,
            x: (fromPoint.x + 2 * controlPoint.x + toPoint.x) / 4,
            y: (fromPoint.y + 2 * controlPoint.y + toPoint.y) / 4,
            width: AIColumnClassSuggestion.getBoxWidth(label),
            describedResource: { label: restriction.property.label, resourceId: restriction.property.id },
        };
        var curve = { fromPoint: fromPoint, controlPoint: controlPoint, toPoint: toPoint, box: box };
        return curve;
    };

    self.drawCurve = function (context, curve) {
        var color = AIMappingModeler.propertyColor;
        var arrowSize = AIColumnClassSuggestion.arrowSize;
        context.globalAlpha = AIColumnClassSuggestion.boxOpacity;
        context.strokeStyle = color;
        context.fillStyle = color;
        context.lineWidth = AIColumnClassSuggestion.linkWidth;
        context.setLineDash(AIColumnClassSuggestion.linkDash);
        context.beginPath();
        context.moveTo(curve.fromPoint.x, curve.fromPoint.y);
        context.quadraticCurveTo(curve.controlPoint.x, curve.controlPoint.y, curve.toPoint.x, curve.toPoint.y);
        context.stroke();
        context.setLineDash([]);
        // the curve ends along the line from its control point
        var angle = Math.atan2(curve.toPoint.y - curve.controlPoint.y, curve.toPoint.x - curve.controlPoint.x);
        context.beginPath();
        context.moveTo(curve.toPoint.x, curve.toPoint.y);
        context.lineTo(curve.toPoint.x - arrowSize * Math.cos(angle - Math.PI / 6), curve.toPoint.y - arrowSize * Math.sin(angle - Math.PI / 6));
        context.lineTo(curve.toPoint.x - arrowSize * Math.cos(angle + Math.PI / 6), curve.toPoint.y - arrowSize * Math.sin(angle + Math.PI / 6));
        context.closePath();
        context.fill();
    };

    self.getSuggestionCurve = function (drawnSuggestions, suggestionIndex) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        var restrictionSuggestion = drawnSuggestions[suggestionIndex];
        var fromPoint = network.getPosition(restrictionSuggestion.fromColumnId);
        var toPoint = network.getPosition(restrictionSuggestion.toColumnId);
        var curve = self.getCurve(fromPoint, toPoint, restrictionSuggestion, self.getStackIndex(drawnSuggestions, suggestionIndex));
        return curve;
    };

    self.drawCurveAndBox = function (context, curve) {
        self.drawCurve(context, curve);
        AIColumnClassSuggestion.drawBox(context, curve.box, AIMappingModeler.propertyColor);
    };

    self.draw = function (context) {
        context.save();
        var drawnSuggestions = self.getDrawnSuggestions();
        drawnSuggestions.forEach(function (restrictionSuggestion, suggestionIndex) {
            self.drawCurveAndBox(context, self.getSuggestionCurve(drawnSuggestions, suggestionIndex));
        });
        context.restore();
    };

    self.isPointInBox = function (canvasPoint, box) {
        var isInBox = Math.abs(canvasPoint.x - box.x) <= box.width / 2 && Math.abs(canvasPoint.y - box.y) <= AIColumnClassSuggestion.boxHeight / 2;
        return isInBox;
    };

    // { restrictionSuggestion, box } under the point, null when none
    self.findSuggestionAt = function (canvasPoint) {
        var foundSuggestion = null;
        var drawnSuggestions = self.getDrawnSuggestions();
        drawnSuggestions.forEach(function (restrictionSuggestion, suggestionIndex) {
            var box = self.getSuggestionCurve(drawnSuggestions, suggestionIndex).box;
            if (!foundSuggestion && self.isPointInBox(canvasPoint, box)) {
                foundSuggestion = { restrictionSuggestion: restrictionSuggestion, box: box };
            }
        });
        return foundSuggestion;
    };

    self.onGraphClick = function (clickParams) {
        // a real node takes the click; a real edge under a box does not
        var canvasPoint = clickParams.pointer.canvas;
        if (clickParams.nodes.length > 0) {
            return;
        }
        // the implicit object is drawn with these restrictions and answers its own boxes
        if (AIImplicitObjectSuggestion.findBoxAt(canvasPoint)) {
            return AIImplicitObjectSuggestion.onSuggestionClick();
        }
        var clickedSuggestion = self.findSuggestionAt(canvasPoint);
        if (clickedSuggestion) {
            self.onSuggestionClick(clickedSuggestion.restrictionSuggestion);
        }
    };

    // AIColumnClassSuggestion owns the pointer, and shows the hand over these boxes
    self.bindToGraph = function () {
        AIColumnClassSuggestion.bindToGraph();
        var network = AIMappingColumnsGraph.visjsGraph.network;
        if (self.boundNetwork === network) {
            return;
        }
        self.boundNetwork = network;
        network.on("afterDrawing", self.draw);
        network.on("afterDrawing", AIImplicitObjectSuggestion.draw);
        network.on("click", self.onGraphClick);
    };

    self.getConfirmationText = function (restrictionSuggestion) {
        var graphNodes = AIMappingColumnsGraph.visjsGraph.data.nodes;
        var fromClassId = AIMappingColumnsGraph.getColumnClass(restrictionSuggestion.fromColumnId);
        var toClassId = AIMappingColumnsGraph.getColumnClass(restrictionSuggestion.toColumnId);
        var restrictionText =
            AIColumnClassSuggestion.getExistingClassLabel(fromClassId, fromClassId) +
            " " +
            self.getRestrictionText(restrictionSuggestion) +
            " " +
            AIColumnClassSuggestion.getExistingClassLabel(toClassId, toClassId);
        var columnsText = graphNodes.get(restrictionSuggestion.fromColumnId).label + " -> " + graphNodes.get(restrictionSuggestion.toColumnId).label;
        var writtenText =
            restrictionSuggestion.origin == self.ontologyOrigin
                ? "The ontology already holds it: only the mapping gets it."
                : "It is written in the ontology of " + AIMappingModeler.currentSLSsource + " and added to the mapping.";
        var confirmationText = 'Add the restriction "' + restrictionText + '" (' + columnsText + ")?\n\n" + writtenText;
        return confirmationText;
    };

    // the triples of the restriction from one class to the other, with those saying who wrote it
    self.getRestrictionWriteTriples = function (fromClassId, toClassId, restriction) {
        var restrictionTriples = Lineage_createRelation.getRestrictionTriples(fromClassId, toClassId, restriction.restrictionType, restriction.cardinality, restriction.property.id);
        var metaDataTriples = Lineage_createRelation.getCommonMetaDataTriples(restrictionTriples.blankNode, "AIMappingModeler", "candidate", {});
        var writeTriples = restrictionTriples.concat(metaDataTriples);
        return writeTriples;
    };

    self.addMappingEdge = function (fromColumnId, toColumnId, restriction) {
        var propertyId = restriction.property.id;
        var property = AIMappingModeler.allResourcesMap[propertyId];
        var edgeLabel = property ? property.label : restriction.property.label;
        var edge = AIMappingColumnsGraph.getVisjsObjectPropertyEdge(
            fromColumnId,
            toColumnId,
            edgeLabel,
            "diamond",
            property,
            propertyId,
            AIMappingModeler.propertyColor,
            // the columns map to instances: the restriction lives in the ontology, the mapping links the instances
            null,
            null,
        );
        AIMappingColumnsGraph.addEdge([edge]);
    };

    self.onSuggestionClick = function (restrictionSuggestion) {
        var pairKey = self.getPairKey(restrictionSuggestion.fromColumnId, restrictionSuggestion.toColumnId);
        var isAccepted = confirm(self.getConfirmationText(restrictionSuggestion));
        // gone before the write: a second click cannot write the restriction twice
        delete self.suggestionsByPairKey[pairKey];
        AIColumnClassSuggestion.redraw();
        if (!isAccepted) {
            return;
        }
        var fromColumnId = restrictionSuggestion.fromColumnId;
        var toColumnId = restrictionSuggestion.toColumnId;
        if (restrictionSuggestion.origin == self.ontologyOrigin) {
            return self.addMappingEdge(fromColumnId, toColumnId, restrictionSuggestion);
        }
        var writeTriples = self.getRestrictionWriteTriples(AIMappingColumnsGraph.getColumnClass(fromColumnId), AIMappingColumnsGraph.getColumnClass(toColumnId), restrictionSuggestion);
        Sparql_generic.insertTriples(AIMappingModeler.currentSLSsource, writeTriples, null, function (error) {
            if (error) {
                // nothing else can ask again for this pair
                self.suggestionsByPairKey[pairKey] = restrictionSuggestion;
                AIColumnClassSuggestion.redraw();
                return MainController.errorAlert(error);
            }
            self.addMappingEdge(fromColumnId, toColumnId, restrictionSuggestion);
        });
    };

    return self;
})();

export default AIColumnRestrictionSuggestion;
window.AIColumnRestrictionSuggestion = AIColumnRestrictionSuggestion;
