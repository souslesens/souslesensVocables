/**
 *
 * manage a hierarchcial view of Whiteboardcontent starting from a specific node
 * @type {{}}
 */
import Lineage_whiteboard from "./lineage_whiteboard.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";

var Lineage_nodeCentricGraph = (function () {
    var self = {};

    self.levelsSelection = [];

    self.getHierarchicalViewVisjsdata = function (rootNodeId) {
        var edgesFromMap = {};
        var edgesToMap = {};
        var nodesMap = {};
        var existingNodes = {};

        Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().forEach(function (item) {
            nodesMap[item.id] = item;
        });
        Lineage_whiteboard.lineageVisjsGraph.data.edges.get().forEach(function (item) {
            if (!edgesFromMap[item.from]) {
                edgesFromMap[item.from] = [];
            }
            edgesFromMap[item.from].push(item);
            if (!edgesToMap[item.to]) {
                edgesToMap[item.to] = [];
            }
            edgesToMap[item.to].push(item);
        });
        var newNodes = [];
        var newEdges = [];

        function recurse(nodeId, level) {
            if (!nodesMap[nodeId]) {
                return;
            }
            if (!existingNodes[nodeId]) {
                existingNodes[nodeId] = 1;
                nodesMap[nodeId].level = level;
                newNodes.push(nodesMap[nodeId]);
                var edges = edgesFromMap[nodeId];
                if (edges) {
                    edges.forEach(function (edge) {
                        if (!existingNodes[edge.id]) {
                            existingNodes[edge.id] = 1;
                            newEdges.push(edge);
                            recurse(edge.to, level + 1);
                        }
                    });
                }
                edges = edgesToMap[nodeId];
                if (edges) {
                    edges.forEach(function (edge) {
                        if (!existingNodes[edge.id]) {
                            existingNodes[edge.id] = 1;
                            newEdges.push(edge);
                            recurse(edge.from, level + 1);
                        }
                    });
                }
            }
        }

        recurse(rootNodeId, 1);
        self.orphanNodes = [];
        for (var nodeId in nodesMap) {
            // add orphan nodes
            if (!existingNodes[nodeId]) {
                var node = nodesMap[nodeId];
                self.orphanNodes.push(node);
            }
        }

        return { nodes: newNodes, edges: newEdges };
    };

    self.draw = function (rootNodeId) {
        var visjsData = self.getHierarchicalViewVisjsdata(rootNodeId);

        var xOffset = 110;
        var yOffset = 90;
        var options = {
            layoutHierarchical: {
                direction: "LR",
                sortMethod: "hubsize",
                levelSeparation: xOffset,
                // parentCentralization: false,
                shakeTowards: "roots",
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,

                nodeSpacing: yOffset,
            },
            edges: {
                smooth: {
                    type: "cubicBezier",
                    // type: "diagonalCross",
                    forceDirection: "horizontal",

                    roundness: 0.4,
                },
            },
        };
        Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv", options);
        Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.layout.hierarchical.enabled = true;
        Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
    };

    self.graphActions = {
        showNodeInfos: function () {
            var node = Lineage_nodeCentricGraph.currentGraphNode;
            NodeInfosWidget.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv");
        },
        showAxioms: function () {
            var node = Lineage_nodeCentricGraph.currentGraphNode;
            NodeInfosAxioms.init(node.data.source, node.data.id, "smallDialogDiv");
        },
        selectLevel: function () {
            var node = Lineage_nodeCentricGraph.currentGraphNode;
            self.levelsSelection.push(node.level);
        },
    };

    self.drawGraph = function (visjsData, graphDiv, options) {
        var xOffset = 90;
        var yOffset = 25;

        self.graphOptions = {
            keepNodePositionOnDrag: true,
            /* physics: {
enabled:true},*/

            visjsOptions: {
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        // type: "diagonalCross",
                        forceDirection: "horizontal",

                        roundness: 0.4,
                    },
                },
            },
        };

        if (!options.randomLayout) {
            self.graphOptions.layoutHierarchical = {
                direction: "LR",
                sortMethod: "hubsize",
                levelSeparation: xOffset,
                // parentCentralization: false,
                shakeTowards: "roots",
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,

                nodeSpacing: yOffset,
            };
        }

        if (graphDiv != "graphDiv") {
            self.graphOptions.onclickFn = function (node, point, event) {
                Lineage_nodeCentricGraph.currentGraphNode = node;
            };
            self.graphOptions.onRightClickFn = Lineage_nodeCentricGraph.showPopupMenu;
        } else {
        }

        self.visjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.visjsGraph.draw(function () {});
    };

    self.showPopupMenu = function (node, point, event) {
        Lineage_nodeCentricGraph.currentGraphNode = node;

        point = {};
        point.x = event.x;
        point.y = event.y;
        var html =
            '    <span  class="popupMenuItem" onclick=" Lineage_nodeCentricGraph.graphActions.showNodeInfos() "> Node infos</span>' +
            ' <span  class="popupMenuItem" onclick=" Lineage_nodeCentricGraph.graphActions.showAxioms() "> Axioms</span>' +
            ' <span  class="popupMenuItem" onclick=" Lineage_nodeCentricGraph.graphActions.selectLevel() "> Select level</span>';

        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
        $("#popupMenuWidgetDiv").html(html);
    };

    self.levelsToTable = function () {
        self.levelsSelection.sort().reverse();

        var edgesFromMap = {};
        var edgesToMap = {};
        var nodesMap = {};
        var existingNodes = {};

        var lines = {};
        var matrix = [];

        //on selectionne uniquement les noeuds qui sont dans les niveaux selectionnés
        self.visjsGraph.data.nodes.get().forEach(function (item) {
            if (self.levelsSelection.indexOf(item.level) > -1) {
                if (!lines[item.level]) {
                    lines[item.level] = {};
                }
                lines[item.level][item.id] = item;
                nodesMap[item.id] = item;
            }
        });

        self.visjsGraph.data.edges.get().forEach(function (item) {
            if (!edgesFromMap[item.from]) {
                edgesFromMap[item.from] = [];
            }
            edgesFromMap[item.from].push(item);
            if (!edgesToMap[item.to]) {
                edgesToMap[item.to] = [];
            }
            edgesToMap[item.to].push(item);
        });

        self.levelsSelection.forEach(function (level) {
            var output = [];
            var nodes = lines[level];
            for (var nodeId in nodes) {
                var fromEdges = edgesFromMap[nodeId];
                fromEdges.forEach(function (item) {});
            }
        });
    };

    self.normalLayout = function () {
        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            Lineage_whiteboard.lineageVisjsGraph.network.setOptions({ hierarchical: { enabled: false } });
            Lineage_whiteboard.lineageVisjsGraph.network.redraw();
        }
    };

    self.listAllNodeRelations = function (rootNodeId) {
        var visjsData = self.getHierarchicalViewVisjsdata(rootNodeId);

        var levelMin = 0;
        var levelMax = 100;
        var edgesFromMap = {};
        var nodesMap = {};

        visjsData.nodes.forEach(function (node) {
            if (!nodesMap[node.id]) {
                nodesMap[node.id] = node;
            }

            levelMax = Math.max(levelMax, node.level);
            levelMin = Math.min(levelMin, node.level);
        });

        visjsData.edges.forEach(function (edge) {
            if (!edgesFromMap[edge.from]) {
                edgesFromMap[edge.from] = {};
            }
            var level = nodesMap[edge.from].level;
            if (!edgesFromMap[edge.from][level]) {
                edgesFromMap[edge.from][level] = [];
            }
            edge.fromLabel = nodesMap[edge.from].label;
            edge.toLabel = nodesMap[edge.to].label;
            edgesFromMap[edge.from][level].push(edge);
        });

        var matrix = [];
        var uniqueNodes = {};
        var str = "";

        for (var edgeFrom in edgesFromMap) {
            for (var level = levelMin; level < levelMax; level++) {
                var edges = edgesFromMap[edgeFrom][level];

                if (edges) {
                    edges.forEach(function (edge) {
                        str += edge.fromLabel + "-" + (edge.label || "-") + "-" + edge.toLabel;
                        str += "\t";
                    });
                }
                str += "\n";
            }
        }

        console.log(str);
    };

    return self;
})();

export default Lineage_nodeCentricGraph;
window.Lineage_nodeCentricGraph = Lineage_nodeCentricGraph;
