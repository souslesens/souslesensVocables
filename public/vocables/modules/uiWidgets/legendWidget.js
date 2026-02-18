import Lineage_decoration from "../tools/lineage/lineage_decoration.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";

var LegendWidget = (function () {
    var self = {};
    self.currentLegendDJstreedata = {};
    self.legendDivsStack = {};
    self.legendNodeStates = {};

    self.clearLegend = function () {
        self.legendDivsStack = {};
        $("#Lineage_classes_graphDecoration_legendDiv").html("");
        self.legendMap = {};
    };

    self.drawLegend = function (legendDivId, jstreeData) {
        self.currentLegendDJstreedata[legendDivId] = jstreeData;
        var options = {
            openAll: true,
            //withCheckboxes: true, to finish
            withCheckboxes: false,
            onCheckNodeFn: LegendWidget.onLegendCheckBoxes,
            onUncheckNodeFn: LegendWidget.onLegendCheckBoxes,
            selectTreeNodeFn: function (evt, obj) {
                self.currentLegendNode = obj.node;
            },
            tie_selection: false,
            contextMenu: LegendWidget.getLegendJstreeContextMenu,
            notTypes: true,
        };
        $("#Lineage_classes_graphDecoration_legendDiv").jstree("destroy").empty();
        $("#Lineage_classes_graphDecoration_legendDiv").html(
            "<div  class='jstreeContainer' style='height: 350px;width:90%;max-height:22dvh;'>" + "<div id='legendJstreeDivId' style='height: 25px;width:100%'></div></div>",
        );
        JstreeWidget.loadJsTree(legendDivId, jstreeData, options, function () {
            self.legendDivId = legendDivId;
            /*    $("#" + legendDivId)
                .jstree(true)
                .check_all();*/
        });
    };

    self.onLegendCheckBoxes = function () {
        var checkdeTopClassesIds = $("#" + self.legendDivId)
            .jstree(true)
            .get_checked();

        var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        var newNodes = [];
        allNodes.forEach(function (node) {
            var hidden = true;
            if (node && checkdeTopClassesIds.indexOf(node.legendType) > -1) {
                hidden = false;
            }

            newNodes.push({
                id: node.id,
                hidden: hidden,
            });
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
    };

    self.getEdgeBetweenLegendAndNodes = function (legend, callback) {
        if (!legend) {
            return;
        }
        var edgeLegendNodes = [];
        var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        if (legend && legend.original && legend.original.color) {
            allNodes.forEach(function (node) {
                if (node && node.id) {
                    if (legend.original.color == node.color) {
                        edgeLegendNodes.push(node);
                    }
                }
            });
        }
        if (callback) {
            return callback(null, edgeLegendNodes);
        }
    };

    self.getNodeState = function (nodeId) {
        if (!self.legendNodeStates[nodeId]) {
            self.legendNodeStates[nodeId] = { isHidden: false, hideOthersActive: false, isGrouped: false };
        }
        return self.legendNodeStates[nodeId];
    };

    self.getLegendJstreeContextMenu = function () {
        var items = {};
        var currentNode = self.currentLegendNode;
        var state = self.getNodeState(currentNode.id);

        items.hideShowNodes = {
            label: state.isHidden ? "Show nodes" : "Hide nodes",
            action: function (_e) {
                var nodeState = self.getNodeState(currentNode.id);
                var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                var newNodes = [];
                if (nodeState.isHidden) {
                    allNodes.forEach(function (node) {
                        if (currentNode.original.color == node.color || currentNode.id == node.id) {
                            newNodes.push({ id: node.id, hidden: false });
                        }
                    });
                    $("#Lineage_source_" + Lineage_sources.activeSource).removeClass("lineage_hiddenSource");
                    nodeState.isHidden = false;
                } else {
                    allNodes.forEach(function (node) {
                        if (currentNode.original.color == node.color || currentNode.id == node.id) {
                            newNodes.push({ id: node.id, hidden: true });
                        }
                    });
                    $("#Lineage_source_" + Lineage_sources.activeSource).addClass("lineage_hiddenSource");
                    nodeState.isHidden = true;
                }
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
            },
        };
        items.hideShowOthers = {
            label: state.hideOthersActive ? "Show others" : "Hide others",
            action: function (_e) {
                var nodeState = self.getNodeState(currentNode.id);
                var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                var newNodes = [];
                if (nodeState.hideOthersActive) {
                    allNodes.forEach(function (node) {
                        newNodes.push({ id: node.id, hidden: false });
                    });
                    nodeState.hideOthersActive = false;
                } else {
                    allNodes.forEach(function (node) {
                        if (currentNode.original.color == node.color || currentNode.id == node.id) {
                            newNodes.push({ id: node.id, hidden: false });
                        } else {
                            newNodes.push({ id: node.id, hidden: true });
                        }
                    });
                    nodeState.hideOthersActive = true;
                }
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
            },
        };
        items.groupUngroup = {
            label: state.isGrouped ? "Ungroup nodes" : "Group nodes",
            action: function (_e) {
                var node = self.currentLegendNode;
                var nodeState = self.getNodeState(node.id);
                if (nodeState.isGrouped) {
                    if (node && node.id) {
                        Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(node.id);
                    }
                    nodeState.isGrouped = false;
                } else {
                    self.getEdgeBetweenLegendAndNodes(node, function (err, result) {
                        if (err) {
                            return;
                        }
                        if (result) {
                            PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
                            var color2 = common.colorToRgba(node.original.color, 0.6);
                            var visjsData = { nodes: [], edges: [] };
                            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

                            for (var nodeId of result) {
                                if (nodeId.id in existingNodes) {
                                    var edgeId = nodeId.id + "_" + node.id;
                                    if (!existingNodes[edgeId]) {
                                        existingNodes[nodeId] = 1;
                                        var edge = {
                                            id: edgeId,
                                            from: node.id,
                                            to: nodeId.id,
                                            color: color2,
                                            width: 1,
                                        };
                                        visjsData.edges.push(edge);
                                    }
                                }
                            }
                            if (!existingNodes[node.id]) {
                                existingNodes[node.id] = 1;

                                var text = node.original.text;
                                var div = document.createElement("div");
                                div.innerHTML = text;
                                var label = div.textContent.trim();
                                var sourceNode = {
                                    id: node.id,
                                    label: label,
                                    shadow: Lineage_whiteboard.nodeShadow,
                                    shape: "ellipse",
                                    level: 1,
                                    size: Lineage_whiteboard.defaultShapeSize,
                                    data: node.data,
                                    color: common.colorToRgba(node.original.color, 0.5),
                                };
                                visjsData.nodes.push(sourceNode);
                            }
                            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
                            nodeState.isGrouped = true;
                        }
                    });
                }
            },
        };
        return items;
    };

    return self;
})();

export default LegendWidget;
window.LegendWidget = LegendWidget;
