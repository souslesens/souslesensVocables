/**
 *
 * manage a hierarchcial view of Whiteboardcontent starting from a specific node
 * @type {{}}
 */
import Lineage_whiteboard from "./lineage_whiteboard.js";

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

        return {nodes: newNodes, edges: newEdges};
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
        Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.layout.hierarchical.enabled = false;
        Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
    };

    self.listAllNodeRelations = function (rootNodeId) {
        var nodesMap = {}

        Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().forEach(function (item) {
            nodesMap[item.id] = item;
        });


        var rightAdjacent = []
        var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get()
        var edgeFromMap = {}
        edges.forEach(function (edge) {
            if (!edgeFromMap[edge.from]) {
                edgeFromMap[edge.from] = []
            }
            edgeFromMap[edge.from].push(edge)


        })
        var index = 0
        var uniqueNodes = {}
        var nodeIndicesMap = {}

        function recurse2(from) {
            if (!edgeFromMap[from]) {
                return;
            }
            edgeFromMap[from].forEach(function (edge) {
                if (!edge) {
                    return;
                }
                if (uniqueNodes[from]) {

                    rightAdjacent.push([])
                }
                uniqueNodes[from]=1
                if (!nodeIndicesMap[index]) {
                    nodeIndicesMap[index] = edge.from
                }
                if (!edgeFromMap[edge.to]) {
                    rightAdjacent.push([index])
                } else {
                    if (!nodeIndicesMap[index + 1]) {
                        nodeIndicesMap[index + 1] = edge.to
                    }
                    rightAdjacent.push([index, ++index])
                }
                recurse2(edge.to)
            })
        }


        recurse2(rootNodeId)

        var x = rightAdjacent
        //   var rightAdjacent = [[1,7],[2],[3,9],[4],[5],[6,10],[],[8],[2],[5],[11],[12]];

        var visited = {}

        function dfs(node, path) {
            visited[node] = true
            path.push(node)
            if (node >= rightAdjacent.length || rightAdjacent[node].length == 0) {
                console.log(path)
            } else {
                for (var i = 0; i < rightAdjacent[node].length; i++) {
                    if (!visited[rightAdjacent[node][i]]) {
                        dfs(rightAdjacent[node][i], path)
                    }
                }
            }
            visited[node] = false
            path.pop()
        }

        dfs(0, [])


        var visjsData = self.getHierarchicalViewVisjsdata(rootNodeId);

        // start fom original edges
        var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get()
        var levelMin = 100;
        var levelMax = 0;
        var edgesToMap = {};
        var nodesMap = {};

        visjsData.nodes.forEach(function (node) {
            if (!nodesMap[node.id]) {
                nodesMap[node.id] = node;
            }
        })

        edges.forEach(function (edge) {

            if ((edge.data && edge.data.type === "parent")) {// inverse parent /child relation from child to parent to parent to child
                var to = edge.to
                edge.to = edge.from
                edge.from = to;
                edge.data.inverse = true
            }


        })


        var levelsMap = {}
        visjsData.nodes.forEach(function (node) {
            if (!levelsMap[node.level]) {
                levelsMap[node.level] = []
            }
            levelsMap[node.level].push(node.id)

            levelMax = Math.max(levelMax, node.level);
            levelMin = Math.min(levelMin, node.level);
        });


        edges.forEach(function (edge) {

            var isInverse = edge.data && edge.data.isInverse
            // if (!isInverse && edge.to !== edge.from ) {
            if (edge.to !== edge.from) {
                if (edge.to == "http://data.totalenergies.com/resource/tsf/ontology/business-objects/Tag") {
                    var x = 3
                }
                if (!edgesToMap[edge.to]) {
                    edgesToMap[edge.to] = []
                }
                edgesToMap[edge.to].push(edge);

            }

        });

        var sep = "\t"
        var line = ""
        var lineUniqueNodes = {}

        function recurse(nodeId, ok) {
            if (!ok) {
                return line
            }
            console.log(nodeId)
            if (true || !lineUniqueNodes[nodeId]) {
                lineUniqueNodes[nodeId] = 1
                if (nodeId == rootNodeId) {
                    ok = false;
                }
                try {
                    if (edgesToMap[nodeId]) {
                        edgesToMap[nodeId].forEach(function (edge) {
                            if (!lineUniqueNodes[edge.id]) {
                                lineUniqueNodes[edge.id] = 1

                                var edgeFrom = edge.from
                                if (!edgeFrom) {
                                    ok = false;
                                }

                                var edgeLabel = edge.label
                                if (edgeLabel) {
                                    edgeLabel = "-" + edgeLabel + "->" + sep
                                } else {
                                    edgeLabel = "-->" + sep
                                }
                                line = nodesMap[edgeFrom].label + sep + edgeLabel + line

                                if (nodesMap[edgeFrom].level >= levelMin) {

                                    if (ok) {
                                        recurse(edgeFrom, true)
                                    } else {
                                        return line
                                    }


                                } else {
                                    ok = false;
                                }
                            }
                        })
                    } else {
                        return line
                    }
                    // return line
                } catch (e) {
                    var x = 3
                    return line
                }
            }
            return line;

        }

        var str = ""
        var rootLabel = nodesMap[rootNodeId].label
        for (var level = levelMax; level >= levelMin; level--) {
            lineUniqueNodes = {}
            if (levelsMap[level]) {
                levelsMap[level].forEach(function (nodeId) {
                    var initialLine = nodesMap[nodeId].label + sep;
                    line = initialLine;

                    line = recurse(nodeId, true)
                    if (true || (line != initialLine && str.indexOf(line) < 0 && line.startsWith(rootLabel))) {
                        console.log("-----" + line)
                        str += line + "\n"
                    }
                })

            }


        }

        var x = str;


        return;

        visjsData.nodes.forEach(function (node) {
        })

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
