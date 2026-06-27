/**
 *
 * manage a hierarchcial view of Whiteboardcontent starting from a specific node
 * @type {{}}
 */
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_graphPaths from "./lineage_graphPaths.js";
import GraphPaths_bot from "../../bots/graphPaths_bot.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

var Lineage_nodeCentricGraph = (function () {
    var self = {};

    self.levelsSelection = [];
    self.savedVisjsData = null;

    /**
     * Builds a hierarchical sub‑graph of a Vis.js starting from a given root node
     * It collects reachable nodes and edges, assigns a level depth to each node, and also
     * identifies orphan nodes that are not reachable from the root
     * @function
     * @name getHierarchicalViewVisjsdata
     * @memberof module:lineage_nodeCentricGraph
     * @param {string} rootNodeId Identifier of the node that serves as the graph's root
     * @returns {object} nodes: newNodes, edges: newEdges, hierarchical sub‑graph
     * (nodes with level, and the traversed edges)
     */
    self.getHierarchicalViewVisjsdata = function (rootNodeId, options) {
        if (!options) {
            options = {};
        }
        var edgesFromMap = {};
        var edgesToMap = {};
        var nodesMap = {};
        var existingNodes = {};

        var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        allNodes = JSON.parse(JSON.stringify(allNodes));

        allNodes.forEach(function (item) {
            item.data.relation = null;
            nodesMap[item.id] = item;
        });

        var allEdges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
        allEdges = JSON.parse(JSON.stringify(allEdges));

        allEdges.forEach(function (item) {
            if (!edgesFromMap[item.from]) {
                edgesFromMap[item.from] = [];
            }

            edgesFromMap[item.from].push(item);

            /*  if(options.parents) {
                  if (item.data && item.data.type === "parent") {
                      var newEdge = {
                          from: item.to,
                          to: item.from,
                          data: item.data,
                          id: common.getRandomHexaId(6),
                          label: item.label
                      }
                      // nodesMap[edge.from].data.isInverse=true
                      if (newEdge.data.type === "parent") {
                          // newEdge.data.type = null;
                      }

                      if (!edgesFromMap[item.to]) {
                          edgesFromMap[item.to] = [];
                      }
                      edgesFromMap[item.to].push(item);
                  }
              }*/

            if (!edgesToMap[item.to]) {
                edgesToMap[item.to] = [];
            }

            edgesToMap[item.to].push(item);
        });

        if (false) {
            /*reverse relations*/
            for (var key in edgesToMap) {
                var edges = edgesToMap[key];
                //    var isParent = (edge.data && edge.data.type == "parent")
                //  var ok = edge.data && edge.data.type === "parent"
                edges.forEach(function (edge) {
                    if (edge.data.type === "parent") {
                        if (!existingNodes[edge.id]) {
                            var newEdge = {
                                from: edge.to,
                                to: edge.from,
                                data: edge.data,
                                id: common.getRandomHexaId(6),
                                label: edge.label,
                            };
                            nodesMap[edge.from].data.isInverse = true;
                            if (newEdge.data.type === "parent") {
                                // newEdge.data.type = null;
                            }

                            if (!edgesFromMap[newEdge.from]) {
                                edgesFromMap[newEdge.from] = [];
                            }
                            edgesFromMap[newEdge.from].push(newEdge);
                        }
                    }
                });
            }
        }

        var newNodes = [];
        var newEdges = [];

        function recurse(nodeId, level) {
            if (!nodesMap[nodeId]) {
                return;
            }
            if (!existingNodes[nodeId]) {
                existingNodes[nodeId] = 1;
                nodesMap[nodeId].level = level;
                var node = nodesMap[nodeId];
                newNodes.push(node);

                //process direct relations
                var edges = edgesFromMap[nodeId];
                if (edges) {
                    if (true) {
                        edges.forEach(function (edge) {
                            var isParent = edge.data && edge.data.type == "parent";

                            var ok = false;
                            if (isParent && options.parents) {
                                ok = true;
                            } else if (options.inverse) {
                                //onGoing relations are already reversed
                                if (!isParent) {
                                    ok = true;
                                }
                            } else if (options.relations) {
                                if (!isParent) {
                                    ok = true;
                                }
                            }
                            if (ok) {
                                if (!existingNodes[edge.id]) {
                                    existingNodes[edge.id] = 1;
                                    newEdges.push(edge);
                                    if (!options.stopPropagation) {
                                        recurse(edge.to, level + 1);
                                    }
                                }
                            }
                        });
                    }
                }

                /*  else {
                               //relations inverses
                               var inverseEdges = edgesToMap[nodeId];
                               if (inverseEdges) {

                                   inverseEdges.forEach(function (edge) {
                                       var isParent = (edge.data && edge.data.type == "parent")

                                       var ok = false
                                       if (isParent && options.parents) {
                                           ok = true
                                       } else if (options.inverse) {
                                           ok = false
                                       } else if (options.relations) {
                                           if (!isParent) {
                                               ok = true
                                           }
                                       }
                                       if (ok) {
                                           if (!existingNodes[edge.id]) {
                                               var newEdge = {
                                                   from: edge.to,
                                                   to: edge.from,
                                                   data: edge.data,
                                                   id: common.getRandomHexaId(6),
                                                   label: edge.label
                                               }
                                               existingNodes[newEdge.id] = 1;
                                               newEdges.push(newEdge);
                                               recurse(edge.from, level + 1);


                                           }
                                       }
                                   })
                               }


                           }*/
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

    /**
     * Builds a hierarchical Vis.js graph configuration based on a root node and
     * a directional flag, then renders the graph on a whiteboard
     * Draws a hierarchical Vis.js graph for a given root node
     * @function
     * @name draw
     * @memberof module:lineage_nodeCentricGraph
     * @param {string} rootNodeId Identifier of the node that serves as the graph's root
     * @param {boolean} updown If true, graph flows top‑to‑bottom (UD); otherwise left‑to‑right (LR)
     */
    self.draw = function (rootNodeId, updown) {
        if (!self.savedVisjsData) {
            self.savedVisjsData = {
                nodes: Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(),
                edges: Lineage_whiteboard.lineageVisjsGraph.data.edges.get(),
            };
        }
        var visjsData = self.getHierarchicalViewVisjsdata(rootNodeId, { inverse: 0, parents: 1, relations: 1 });
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

    /**
     * Defines a method `listAllNodeRelations` on the `self` object. It extracts
     * the current Vis.js graph nodes and edges, packages them, and hands them off
     * to `GraphPaths_bot.start` for further processing
     * @function
     * @name listAllNodeRelations
     * @memberof module:lineage_nodeCentricGraph
     * @param {string} rootNodeId Identifier of the node that serves as the graph's root
     */
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

    self.showVisjsGraphTreeTextDialog = function () {
        $("#mainDialogDiv").load("modules/tools/lineage/html/lineage_textTreeDialog.html", function () {
            //   self.loadVisjsGraphTreeTextJstree()
            $("#mainDialogDiv").dialog("open");
            // $("#mainDialogDiv").width(1000);
            UI.clampAndCenterDialog("mainDialogDiv");

            //   $("#Lineage_graphTraversal_numberOfPathes").prop("disabled", true);
        });
    };

    self.loadVisjsGraphTreeTextJstree = function () {
        var rootNode = Lineage_whiteboard.currentGraphNode;
        var hierarchicalVisjsData = self.getHierarchicalViewVisjsdata(rootNode.id, {
            inverse: 0,
            parents: 1,
            relations: 1,
        });
        var jstreeData = [];
        var existingLabels = {};
        jstreeData.push({
            id: "root",
            text: rootNode.label + " relations",
            parent: "#",
        });
        hierarchicalVisjsData.edges.forEach(function (edge) {
            var label = edge.label || edge.data.type;
            if (!existingLabels[label]) {
                existingLabels[label] = 1;
                jstreeData.push({
                    id: label,
                    text: label,
                    parent: "root",
                });
            }
        });
        var options = {
            withCheckboxes: true,
            openAll: true,
        };
        JstreeWidget.loadJsTree("VisjsGraphTreeTextJstree", jstreeData, options, function () {
            JstreeWidget.checkAll("VisjsGraphTreeTextJstree");
        });
    };
    /**
     * provides a text of the tree calculated from a root node
     */

    self.exportVisjsGraphTreeText = function () {
        var selectedEdges = []; //$("#VisjsGraphTreeTextJstree").jstree().get_checked()
        var parents = $("#VisjsGraphTreeTextClasHierarchyCBX").prop("checked");
        var relations = $("#VisjsGraphTreeTextOutgoingRelationsCBX").prop("checked");
        var inverses = $("#VisjsGraphTreeTextIngoingRelationsCBX").prop("checked");
        var noRootNode = $("#VisjsGraphTreeTextIngoingNoRoot").prop("checked");

        var showSuperClasses = true;

        var stopPropagation = false;

        var nl = String.fromCharCode(10);
        var nl = "<br>";
        var whiteSpace = "&nbsp;";
        var str = "";

        var edgesFromMap = {};
        var edgesToMap = {};
        var nodesMap = {};
        var existingNodes = {};

        /* -------------------------initiates allnodes and edges map---------------*/
        var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        allNodes = JSON.parse(JSON.stringify(allNodes));

        allNodes.forEach(function (item) {
            item.data.relation = null;
            nodesMap[item.id] = item;
        });

        var allEdges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
        allEdges = JSON.parse(JSON.stringify(allEdges));

        allEdges.forEach(function (item) {
            if (!edgesFromMap[item.from]) {
                edgesFromMap[item.from] = [];
            }
            edgesFromMap[item.from].push(item);

            if (!edgesToMap[item.to]) {
                edgesToMap[item.to] = [];
            }

            edgesToMap[item.to].push(item);
        });

        var rootNode = Lineage_whiteboard.currentGraphNode;
        async.series(
            [
                //get SuperClasses optional
                function (callbackSeries) {
                    if (!showSuperClasses) {
                        return callbackSeries();
                    }
                    var ids = Object.keys(nodesMap);
                    Sparql_OWL.getNodeParents(rootNode.data.source, null, ids, 1, null, function (err, result) {
                        if (err) {
                            return callbackSeries();
                        }
                        result.forEach(function (item) {
                            nodesMap[item.subject.value].data.parentLabel = item.broader1Label ? item.broader1Label.value : null;
                        });
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    /**-----------------get rootNodesArray-----------------------*/

                    var rooNodes = [];
                    if (rootNode && !noRootNode) {
                        rooNodes.push(rootNode); //  return alert("select a node as root for the tree and do it again")
                    } else {
                        allNodes.forEach(function (node) {
                            if (edgesToMap[node.id] && !edgesFromMap[node.id]) {
                                if (rooNodes.indexOf(node) < 0) {
                                    rooNodes.push(node);
                                }
                            }
                        });
                    }

                    var visitedNodes = {};
                    rooNodes.forEach(function (rootNode) {
                        /**   --------------recurse---------*/

                        function recurse(nodeId, level, parentId) {
                            var hasDirectRelation = false;
                            var node = nodesMap[nodeId];
                            for (var i = 1; i <= level; i++) {
                                //  str += "──"
                                str += "+&nbsp;&nbsp;";
                            }
                            //   str += "│"

                            var label = node.data.label;
                            if (showSuperClasses && node.data.parentLabel) {
                                label += " (" + node.data.parentLabel + ")";
                            }

                            var color = Lineage_whiteboard.getPropertyColor(node.data.source, "palette5colors");
                            if (color) {
                                label = "<span style=color:" + color + ">" + label + "</span>";
                            }

                            if (level === 0) {
                                // str += label + nl
                            } else {
                                var edgesTo = edgesToMap[node.id];
                                if (edgesTo && !inverses) {
                                    edgesTo.forEach(function (edgeTo) {
                                        if (edgeTo.from === parentId && edgeTo.label) {
                                            label = "<i>[" + edgeTo.label + "]</i>─>" + whiteSpace + label;
                                        }
                                    });
                                } else {
                                    var edgesFrom = edgesFromMap[node.id];
                                    if (edgesFrom) {
                                        edgesFrom.forEach(function (edgeFrom) {
                                            if (edgeFrom.to === parentId && edgeFrom.label) {
                                                label = "<─<i>[" + edgeFrom.label + "]</i>" + whiteSpace + label;
                                            }
                                        });
                                    } else {
                                    }
                                }
                            }
                            str += "" + label + nl;

                            if (edgesFromMap[nodeId]) {
                                edgesFromMap[nodeId].forEach(function (edge) {
                                    if (!visitedNodes[edge.id]) {
                                        if (nodesMap[edge.to]) {
                                            visitedNodes[edge.id] = 1;
                                            if (!stopPropagation) {
                                                if (edge.data.type == "parent") {
                                                    if (parents && edge.data) {
                                                        recurse(edge.to, level + 1, node.id);
                                                    }
                                                } else if (relations) {
                                                    hasDirectRelation = true;
                                                    recurse(edge.to, level + 1, node.id);
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                            if (edgesToMap[nodeId]) {
                                edgesToMap[nodeId].forEach(function (edge) {
                                    if (!visitedNodes[edge.id]) {
                                        if (nodesMap[edge.from]) {
                                            visitedNodes[edge.id] = 1;
                                            if (!stopPropagation) {
                                                if (edge.data.type == "parent") {
                                                    if (parents && edge.data) {
                                                        recurse(edge.from, level + 1, node.id);
                                                    }
                                                } else if (inverses && !hasDirectRelation) {
                                                    recurse(edge.from, level + 1, node.id);
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        }

                        recurse(rootNode.id, 0, null);
                    });

                    //   $("#VisjsGraphTreeTextTA").html(str)

                    const editor = document.getElementById("VisjsGraphTreeTextTA");

                    editor.innerHTML = str;
                    common.copyTextToClipboard(str, function (err, result) {
                        if (err) {
                            return UI.message(err);
                        }
                        UI.message(result);
                    });
                },
            ],
            function (err) {},
        );
    };
    return self;
})();

export default Lineage_nodeCentricGraph;
window.Lineage_nodeCentricGraph = Lineage_nodeCentricGraph;
