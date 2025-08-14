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
        Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.layout.hierarchical.enabled = false;
        Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
    };

    self.listAllNodeRelations = function (rootNodeId) {
        var visjsData = self.getHierarchicalViewVisjsdata(rootNodeId);

        var levelMin = 100;
        var levelMax = 0;
        var edgesToMap = {};
        var nodesMap = {};


        var levelsMap={}
        visjsData.nodes.forEach(function (node) {
            if (!nodesMap[node.id]) {
                nodesMap[node.id] = node;
            }
            if(!levelsMap[node.level]){
                levelsMap[node.level]= []
            }
            levelsMap[node.level].push(node.id)

            levelMax = Math.max(levelMax, node.level);
            levelMin = Math.min(levelMin, node.level);
        });

        visjsData.edges.forEach(function (edge) {
            if (!edgesToMap[edge.to]) {
                edgesToMap[edge.to] = edge;
            }

        });

        var sep="\t"
        var line=""
        function recurse(nodeId){

            if(edgesToMap[nodeId]){
                var edgeFrom=edgesToMap[nodeId].from
                if(!edgeFrom)
                    return line
                var edgeLabel=edgesToMap[nodeId].label
                if(edgeLabel)
                    edgeLabel="-"+edgeLabel+"->"+sep
                else
                    edgeLabel="-->"+sep
                line=nodesMap[edgeFrom].label+sep+edgeLabel+line
                if(nodesMap[edgeFrom].level>=levelMin){
                recurse(edgeFrom)}
                else{
                    return line
                }
            }   else{
                return line
            }
           // return line

        }

var str=""

        for (var level = levelMax; level >= levelMin; level--) {
            if(levelsMap[level] ){
                levelsMap[level].forEach(function(nodeId){
                   line=nodesMap[nodeId].label+sep;
                  recurse(nodeId)
                    console.log(line)
                    str+=line+"\n"
                })

            }






        }

        var x=str;



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
