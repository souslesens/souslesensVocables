import common from "../shared/common.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";

var GraphDecorationWidget = (function () {
    var self = {};
    self.currentAttrsPalette = {};
    var attrsShapes = ["triangle", "box", "diamond"];
    attrsShapes.index = 0;
    var colorPalette = common.paletteIntense;

    self.showDecorateDialog = function (nodeSelectorFn) {
        //$("#smallDialogDiv").parent().css("left", "30%");
        $("#smallDialogDiv").load("modules/tools/lineage/html/lineage_decorateDialog.html", function () {
            UI.openDialog("smallDialogDiv");
            self.currentNodeSelectorFn = null;
            if (nodeSelectorFn) {
                self.currentNodeSelectorFn = nodeSelectorFn;
                $("#lineage_decorate_selectionSelect").css("display", "none");
            }
            $("#lineage_decorate_applyButton").bind("click", GraphDecorationWidget.decorateNodes);
            common.fillSelectWithColorPalette("lineage_decorate_colorSelect");
            var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
            common.fillSelectOptions("lineage_decorate_shapeSelect", shapes, true);
        });
    };
    self.decorateNodes = function () {
        var nodes;
        if (self.currentNodeSelectorFn) {
            nodes = self.currentNodeSelectorFn();
        } else {
            var selection = $("#lineage_decorate_selectionSelect").val();

            if (selection == "Last added nodes") {
                nodes = Lineage_whiteboard.lineageVisjsGraph.lastAddedNodes;
            } else if (selection == "All nodes") {
                nodes = Lineage_whiteboard.lineageVisjsGraph.lastAddedNodes;
            } else if (selection == "Selected nodes") {
                nodes = Lineage_selection.selectedNodes;
            }
        }

        $("#smallDialogDiv").dialog("close");
        var newIds = [];

        var color = $("#lineage_decorate_colorSelect").val();
        var shape = $("#lineage_decorate_shapeSelect").val();
        var size = $("#lineage_decorate_sizeInput").val();
        nodes.forEach(function (node) {
            var id;
            if (typeof node === "object") {
                if (!node.data) {
                    return;
                } else {
                    id = node.id;
                }
            } else {
                id = node;
            }
            var obj = { id: id };
            if (color) {
                obj.color = color;
            }
            if (shape) {
                obj.shape = shape;
            }
            if (size) {
                obj.size = parseInt(size);
            }
            newIds.push(obj);
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newIds);
    };

    self.getNodeDecorationAttrs = function (nodeId) {
        var attrs = self.currentAttrsPalette[nodeId];

        if (!attrs) {
            if (Object.keys(self.currentAttrsPalette).length > colorPalette.length) {
                attrsShapes.index += 1;
            }
            var color = colorPalette[Object.keys(self.currentAttrsPalette).length];
            var shape = attrsShapes[attrsShapes.index];
            attrs = { color: color, shape: shape };
            self.currentAttrsPalette[nodeId] = attrs;
        }
        return attrs;
    };

    self.showOutlinedNodesAndLegend = function (groups) {
        self.currentAttrsPalette = {};
        attrsShapes.index = 0;
        var legendVisjsTreeData = [];
        var newVisjsNodes = [];
        for (var group in groups) {
            var attrs = self.getNodeDecorationAttrs(group);
            legendVisjsTreeData.push({
                id: group,
                text: "<span  style='font-size:10px;background-color:" + attrs.color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;" + groups[group].label,
                parent: "#",
                color: attrs.color,
            });

            groups[group].nodeIds.forEach(function (nodeId) {
                newVisjsNodes.push({ id: nodeId, color: attrs.color, shape: attrs.shape });
            });
        }
        $("#lineage_actionDiv_title").html("Outline Legend");
        LegendWidget.drawLegend("legendJstreeDivId", legendVisjsTreeData);
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisjsNodes);
    };

    return self;
})();
export default GraphDecorationWidget;
window.GraphDecorationWidget = GraphDecorationWidget;
