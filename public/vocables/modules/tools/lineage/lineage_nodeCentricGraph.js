/**
 *
 * manage a hierarchcial view of Whiteboardcontent starting from a specific node
 * @type {{}}
 */
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_graphPaths from "./lineage_graphPaths.js";
import GraphPaths_bot from "../../bots/graphPaths_bot.js";

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

                //relations inverses
                edges = edgesToMap[nodeId];
                if (false && edges) {
                    edges.forEach(function (edge) {
                        if (!existingNodes[edge.id]) {
                            existingNodes[edge.id] = 1;
                            newEdges.push(edge);
                            recurse(edge.from, level + 1);
                        }
                    });
                }
            } else {
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

    self.draw = function (rootNodeId, updown) {
        var visjsData = self.getHierarchicalViewVisjsdata(rootNodeId);
        var directionGraph;
        var forceDirectionGraph;
        if (updown) {
            directionGraph = "UD";
            forceDirectionGraph = "vertical";
        } else {
            directionGraph = "LR";
            forceDirectionGraph = "horizontal";
        }
        var xOffset = 110;
        var yOffset = 90;
        var options = {
            layoutHierarchical: {
                direction: directionGraph,
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
                    forceDirection: forceDirectionGraph,

                    roundness: 0.4,
                },
            },
        };
        Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv", options);
        Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.layout.hierarchical.enabled = false;
        Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
    };

    self.listAllNodeRelations = function (rootNodeId) {
        var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
        var visjsData = { nodes: nodes, edges: edges };

        GraphPaths_bot.start(visjsData, rootNodeId, null);

        return;
        var str = Lineage_graphPaths.getAllpathsFromNode(visjsData, rootNodeId, "text");
        common.copyTextToClipboard(str);

        return;
    };

    return self;
})();

export default Lineage_nodeCentricGraph;
window.Lineage_nodeCentricGraph = Lineage_nodeCentricGraph;
