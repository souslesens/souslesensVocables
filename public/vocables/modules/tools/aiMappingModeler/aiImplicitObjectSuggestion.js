import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import AIMappingModeler from "./aiMappingModeler.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIColumnClassSuggestion from "./aiColumnClassSuggestion.js";
import AIColumnRestrictionSuggestion from "./aiColumnRestrictionSuggestion.js";

/**
 * Suggests a business object that no column identifies, such as the process a row records, as a virtual column
 * with its class and its restrictions toward the mapped columns it links. One at a time, drawn over the graph like
 * the other suggestions; one click creates the class if it is new, the restrictions, the virtual column and its edges.
 * @module AIImplicitObjectSuggestion
 */
var AIImplicitObjectSuggestion = (function () {
    var self = {};

    // right of every node shown, where nothing drawn by the tool can sit
    self.virtualColumnGap = 60;
    // { table, implicitObject, columnIdsByName, classIdByColumnId } of the participants when it was offered
    self.implicitSuggestion = null;

    self.clear = function () {
        self.implicitSuggestion = null;
    };

    // the first one stays until it is accepted, refused or no longer holds
    self.offer = function (table, implicitObject, columnIdsByName) {
        if (self.getDrawnSuggestion()) {
            return;
        }
        var classIdByColumnId = {};
        Object.values(columnIdsByName).forEach(function (columnId) {
            classIdByColumnId[columnId] = AIMappingColumnsGraph.getColumnClass(columnId);
        });
        self.implicitSuggestion = { table: table, implicitObject: implicitObject, columnIdsByName: columnIdsByName, classIdByColumnId: classIdByColumnId };
        if (self.getDrawnSuggestion()) {
            AIColumnClassSuggestion.showInView(self.getLayout(self.implicitSuggestion).allBoxes);
        }
    };

    // { from, to } of a restriction, given what stands for the implicit object and for its participant
    self.getEnds = function (implicitObject, restriction, implicitEnd, participantEnd) {
        var isFromImplicit = restriction.fromColumn == implicitObject.column;
        var ends = isFromImplicit ? { from: implicitEnd, to: participantEnd } : { from: participantEnd, to: implicitEnd };
        return ends;
    };

    // after a failed write: back for a second click, unless another one was offered meanwhile
    self.restore = function (implicitSuggestion) {
        if (!self.implicitSuggestion) {
            self.implicitSuggestion = implicitSuggestion;
        }
        AIColumnClassSuggestion.redraw();
    };

    self.isSameNameVirtualColumn = function (graphNode, table, column) {
        var isSameName = Boolean(graphNode.data) && graphNode.data.type == "VirtualColumn" && graphNode.data.dataTable == table && graphNode.label.toLowerCase() == column.toLowerCase();
        return isSameName;
    };

    // the participant of a restriction: the end that is not the implicit object
    self.getParticipantId = function (implicitSuggestion, restriction) {
        var implicitColumn = implicitSuggestion.implicitObject.column;
        var participantName = restriction.fromColumn == implicitColumn ? restriction.toColumn : restriction.fromColumn;
        var participantId = implicitSuggestion.columnIdsByName[participantName];
        return participantId;
    };

    // its participants still shown with the classes it was chosen for, and no virtual column of the table already named so
    self.getDrawnSuggestion = function () {
        if (!self.implicitSuggestion) {
            return null;
        }
        var graphNodes = AIMappingColumnsGraph.visjsGraph.data.nodes;
        var implicitObject = self.implicitSuggestion.implicitObject;
        var hasParticipants = implicitObject.restrictions.every(function (restriction) {
            var participantId = self.getParticipantId(self.implicitSuggestion, restriction);
            var participantNode = graphNodes.get(participantId);
            return Boolean(participantNode) && !participantNode.hidden && AIMappingColumnsGraph.getColumnClass(participantId) == self.implicitSuggestion.classIdByColumnId[participantId];
        });
        var sameNameColumns = graphNodes.get({
            filter: function (graphNode) {
                return self.isSameNameVirtualColumn(graphNode, self.implicitSuggestion.table, implicitObject.column);
            },
        });
        var drawnSuggestion = hasParticipants && sameNameColumns.length == 0 ? self.implicitSuggestion : null;
        return drawnSuggestion;
    };

    // canvas coordinates of everything drawn: the virtual column, its class and superclass above it, its restrictions
    self.getLayout = function (implicitSuggestion) {
        var network = AIMappingColumnsGraph.visjsGraph.network;
        var implicitObject = implicitSuggestion.implicitObject;
        var shownNodes = AIMappingColumnsGraph.visjsGraph.data.nodes.get({
            filter: function (graphNode) {
                return !graphNode.hidden;
            },
        });
        var nodeRightEdges = shownNodes.map(function (shownNode) {
            return network.getBoundingBox(shownNode.id).right;
        });
        var drawnClasses = AIColumnClassSuggestion.getDrawnClasses(implicitObject.classSuggestion);
        var classLabels = drawnClasses.map(function (drawnClass) {
            return drawnClass.label;
        });
        var labels = [implicitObject.column].concat(classLabels);
        var labelWidths = labels.map(AIColumnClassSuggestion.getBoxWidth);
        var firstParticipantPosition = network.getPosition(self.getParticipantId(implicitSuggestion, implicitObject.restrictions[0]));
        var virtualPoint = { x: Math.max(...nodeRightEdges) + self.virtualColumnGap + Math.max(...labelWidths) / 2, y: firstParticipantPosition.y };
        // the virtual column on the row of the columns, its class and superclass above it
        var virtualBox = { label: implicitObject.column, x: virtualPoint.x, y: virtualPoint.y, width: labelWidths[0] };
        var classBoxes = drawnClasses.map(function (drawnClass, classIndex) {
            var classY = virtualPoint.y - drawnClass.levelsAboveColumn * AIMappingColumnsGraph.layoutHierarchical.levelSeparation;
            return { label: drawnClass.label, x: virtualPoint.x, y: classY, width: labelWidths[classIndex + 1], describedResource: drawnClass };
        });
        var boxes = [virtualBox].concat(classBoxes);
        var curves = implicitObject.restrictions.map(function (restriction, restrictionIndex) {
            var participantPoint = network.getPosition(self.getParticipantId(implicitSuggestion, restriction));
            var ends = self.getEnds(implicitObject, restriction, virtualPoint, participantPoint);
            return AIColumnRestrictionSuggestion.getCurve(ends.from, ends.to, restriction, restrictionIndex);
        });
        var curveBoxes = curves.map(function (curve) {
            return curve.box;
        });
        var layout = { virtualPoint: virtualPoint, virtualBox: virtualBox, classBoxes: classBoxes, curves: curves, allBoxes: boxes.concat(curveBoxes) };
        return layout;
    };

    self.draw = function (context) {
        var implicitSuggestion = self.getDrawnSuggestion();
        if (!implicitSuggestion) {
            return;
        }
        context.save();
        var layout = self.getLayout(implicitSuggestion);
        layout.curves.forEach(function (curve) {
            AIColumnRestrictionSuggestion.drawCurveAndBox(context, curve);
        });
        // from the virtual column to its class, from the class to its superclass
        var linkStarts = [layout.virtualPoint].concat(layout.classBoxes);
        layout.classBoxes.forEach(function (classBox, boxIndex) {
            AIColumnClassSuggestion.drawLink(context, linkStarts[boxIndex], classBox);
            AIColumnClassSuggestion.drawBox(context, classBox, AIMappingModeler.legendItems.Class.color);
        });
        AIColumnClassSuggestion.drawBox(context, layout.virtualBox, AIMappingModeler.legendItems.VirtualColumn.color);
        context.restore();
    };

    // the box under the point, null when none
    self.findBoxAt = function (canvasPoint) {
        var implicitSuggestion = self.getDrawnSuggestion();
        if (!implicitSuggestion) {
            return null;
        }
        var layout = self.getLayout(implicitSuggestion);
        var boxUnderPoint = layout.allBoxes.find(function (box) {
            return AIColumnRestrictionSuggestion.isPointInBox(canvasPoint, box);
        });
        var foundBox = boxUnderPoint || null;
        return foundBox;
    };

    self.getConfirmationText = function (implicitObject) {
        var classSuggestion = implicitObject.classSuggestion;
        var classText =
            classSuggestion.columnKind == "existingClass"
                ? 'class "' + classSuggestion.label + '"'
                : 'new class "' + classSuggestion.label + '", subclass of "' + classSuggestion.parentLabel + '"';
        var restrictionLines = implicitObject.restrictions.map(function (restriction) {
            return "    " + restriction.fromColumn + " " + AIColumnRestrictionSuggestion.getRestrictionText(restriction) + " " + restriction.toColumn;
        });
        var definitionText = classSuggestion.definition ? "\n\n" + classSuggestion.definition : "";
        var reasonText = implicitObject.reason ? "\n\nWhy: " + implicitObject.reason : "";
        var confirmationText =
            'Create the virtual column "' +
            implicitObject.column +
            '" mapped to ' +
            classText +
            ", with the restrictions:\n" +
            restrictionLines.join("\n") +
            definitionText +
            reasonText +
            "\n\nThe class and the restrictions are written in the ontology of " + AIMappingModeler.currentSLSsource + ".";
        return confirmationText;
    };

    // the class to map, written first when it is new; a class of the same label accepted since is reused
    self.getImplicitClass = function (classSuggestion, callback) {
        var classIdToMap = AIColumnClassSuggestion.getClassIdToMap(classSuggestion);
        if (classIdToMap) {
            return callback(null, classIdToMap);
        }
        AIColumnClassSuggestion.writeNewClass(classSuggestion, callback);
    };

    // what would stop the virtual column from being created once the ontology is written, null when nothing does
    self.getCreationProblem = function (implicitSuggestion) {
        var implicitObject = implicitSuggestion.implicitObject;
        var classSuggestion = implicitObject.classSuggestion;
        var currentTable = AIMappingModeler.currentTable;
        if (!currentTable || currentTable.name != implicitSuggestion.table) {
            return "Open the table " + implicitSuggestion.table + " again to create the virtual column " + implicitObject.column;
        }
        var sameNameColumns = AIMappingColumnsGraph.visjsGraph.data.nodes.get({
            filter: function (graphNode) {
                return self.isSameNameVirtualColumn(graphNode, implicitSuggestion.table, implicitObject.column);
            },
        });
        if (sameNameColumns.length > 0) {
            return "The table already has a virtual column " + implicitObject.column;
        }
        // the classes of the tool load after it opens, and may lag behind the ontologies prepared on the server
        var isClassMissing = classSuggestion.columnKind == "existingClass" && !AIMappingModeler.allResourcesMap[classSuggestion.classId];
        if (!AIMappingModeler.allClasses || isClassMissing) {
            return 'The classes of this source do not hold "' + classSuggestion.label + '" yet, refresh them and click again';
        }
        return null;
    };

    // created as the user would, from the legend: the tool links it to its table; the node the user was on stays current
    self.createVirtualColumn = function (implicitSuggestion, classId) {
        var implicitObject = implicitSuggestion.implicitObject;
        var previousGraphNode = AIMappingColumnsGraph.currentGraphNode;
        AIMappingModeler.currentResourceType = "VirtualColumn";
        AIMappingModeler.onSuggestionsSelect(null, { node: { id: implicitObject.column } });
        var virtualNode = AIMappingColumnsGraph.currentGraphNode;
        if (!virtualNode || virtualNode === previousGraphNode || !self.isSameNameVirtualColumn(virtualNode, implicitSuggestion.table, implicitObject.column)) {
            return MainController.errorAlert("The class and the restrictions of " + implicitObject.column + " are written, but its virtual column could not be created: create it by hand");
        }
        // linked before it gets its class: the restriction suggestion it then asks for leaves these pairs out
        implicitObject.restrictions.forEach(function (restriction) {
            var ends = self.getEnds(implicitObject, restriction, virtualNode.id, self.getParticipantId(implicitSuggestion, restriction));
            AIColumnRestrictionSuggestion.addMappingEdge(ends.from, ends.to, restriction);
        });
        AIColumnClassSuggestion.mapColumnToClass(virtualNode, classId);
        if (previousGraphNode) {
            AIMappingColumnsGraph.currentGraphNode = previousGraphNode;
        }
    };

    self.onSuggestionClick = function () {
        var implicitSuggestion = self.implicitSuggestion;
        var implicitObject = implicitSuggestion.implicitObject;
        var isAccepted = confirm(self.getConfirmationText(implicitObject));
        // gone before the writes: a second click cannot write them twice
        self.clear();
        AIColumnClassSuggestion.redraw();
        if (!isAccepted) {
            return;
        }
        // checked before any write: nothing is written for a column that could not be created
        var creationProblem = self.getCreationProblem(implicitSuggestion);
        if (creationProblem) {
            self.restore(implicitSuggestion);
            return UI.message(creationProblem);
        }
        self.getImplicitClass(implicitObject.classSuggestion, function (error, classId) {
            if (error) {
                self.restore(implicitSuggestion);
                return MainController.errorAlert(error);
            }
            var writeTriples = [];
            implicitObject.restrictions.forEach(function (restriction) {
                var participantClassId = implicitSuggestion.classIdByColumnId[self.getParticipantId(implicitSuggestion, restriction)];
                var ends = self.getEnds(implicitObject, restriction, classId, participantClassId);
                writeTriples = writeTriples.concat(AIColumnRestrictionSuggestion.getRestrictionWriteTriples(ends.from, ends.to, restriction));
            });
            Sparql_generic.insertTriples(AIMappingModeler.currentSLSsource, writeTriples, null, function (error) {
                if (error) {
                    // the class may be written already: a second click finds it by its label
                    self.restore(implicitSuggestion);
                    return MainController.errorAlert(error);
                }
                self.createVirtualColumn(implicitSuggestion, classId);
            });
        });
    };

    return self;
})();

export default AIImplicitObjectSuggestion;
window.AIImplicitObjectSuggestion = AIImplicitObjectSuggestion;
