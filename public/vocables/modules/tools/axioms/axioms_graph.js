import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axiom_activeLegend from "./axiom_activeLegend.js";

var Axioms_graph = (function () {
    var self = {};

    self.getVisjsNode = function (node, level) {
        var color = "#ddd";
        var shape = "box";
        var label = node.symbol || node.label || "";
        var size = 12;
        var font = null;
        if (node.symbol) {
            shape = "circle";
            color = "#70ac47";
            if (node.symbol == "^") {
                shape = "ellipse";
                font = { bold: true };
                color = "#f5ef39";
            }
        } else if (node.type && node.type.indexOf("Class") > -1) {
            color = "#00afef";

            // shape = "dot";
            shape = "box";
            //  font = {bold: false, color: "#fff"};
        } else if (node.type && node.type.indexOf("ObjectProperty") > -1) {
            color = "#f5ef39";
        } else if (node.type && node.type.indexOf("Restriction") > -1) {
            shape = "text";
            label = node.label;
            node.predicates.forEach(function (predicate) {
                level = level - 1;
                if (predicate.p.indexOf("someValuesFrom") > -1) {
                    label = "«some»";
                } else if (predicate.p.indexOf("allValuesFrom") > -1) {
                    label = "«only»";
                } else if (predicate.p.indexOf("hasValue") > -1) {
                    label = "«value»";
                } else {
                    if (predicate.p.indexOf("http://www.w3.org/2002/07/owl#onProperty") < 0) {
                        label = predicate.p.replace("http://www.w3.org/2002/07/owl#", "");
                    }
                }
                if (predicate.p.toLowerCase().indexOf("cardinality") > -1) {
                    label += " " + predicate.o;
                }
            });

            color = "#cb9801";
        } else {
            shape = "dot";
            size = 2; //0.2;
            color = "#70ac47";
        }

        if (!label && node.id.startsWith("http")) {
            label = Sparql_common.getLabelFromURI(node.id);
        }

        var visjsNode = {
            id: node.id,
            label: label,
            shape: shape,
            color: color,
            size: size,
            level: level,
            font: font,
            data: node.data || {
                id: node.id,
                label: node.label || "",
                type: node.type,
                source: node.source,
            },
        };
        return visjsNode;
    };

    self.drawNodeAxioms2 = function (sourceLabel, rootNodeId, axiomsTriples, divId, options, callback) {
        self.currentAxiomTriples=axiomsTriples;
        Axiom_activeLegend.showTriples()
        if (!options) {
            options = {};
        }
        self.graphDivId = divId;
        var nodesMap = {};
        var visjsData = { nodes: [], edges: [] };
        var edgesToRemove = {};
        var disjointClassesAxiomRoot = null;
        async.series(
            [
                //format mancheseter triples
                function (callbackSeries) {
                    var data = [];
                    axiomsTriples.forEach(function (triple,axiomIndex) {
                        var s = triple.subject.replace("[OntObject]", "");
                        var p = triple.predicate.replace("[OntObject]", "");
                        var o = triple.object.replace("[OntObject]", "");

                        function getType(uri) {
                            if (uri.indexOf("http") > -1) {
                                return "uri";
                            }
                            return "bnode";
                        }

                        if (!nodesMap[s]) {
                            nodesMap[s] = { id: s, axiomId:axiomIndex };
                            if (s.indexOf("http") == 0) {
                                var obj = Axiom_manager.allResourcesMap[s];
                                nodesMap[s].label = obj ? obj.label.replace(/_/g, " ") : null;
                            }
                        }
                        if (p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && !nodesMap[s].type) {
                            nodesMap[s].type = o;
                        } else if (p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest" && o == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        } else {
                            if (!nodesMap[s].predicates) {
                                nodesMap[s].predicates = [];
                            }

                            var obj = Axiom_manager.allResourcesMap[p];
                            nodesMap[s].predicates.push({
                                p: p,
                                o: o,
                                pLabel: obj ? obj.label.replace(/_/g, " ") : null,
                                axiomId:axiomIndex
                            });
                        }

                        if (p == "http://www.w3.org/2002/07/owl#unionOf") {
                            nodesMap[s].type = "unionOf";
                            nodesMap[s].symbol = "⨆";
                        } else if (p == "http://www.w3.org/2002/07/owl#intersectionOf") {
                            nodesMap[s].type = "intersectionOf";
                            nodesMap[s].symbol = "⊓";
                        } else if (p == "http://www.w3.org/2002/07/owl#complementOf") {
                            nodesMap[s].type = "complementOf";
                            nodesMap[s].symbol = "┓";
                        } else if (p == "http://www.w3.org/2002/07/owl#inverseOf") {
                            nodesMap[s].type = "inverseOf";
                            nodesMap[s].symbol = "^";
                        } else if (p == "http://www.w3.org/2002/07/owl#members") {
                            nodesMap[s].type = "AllDisjointClasses";
                            nodesMap[s].symbol = "⊑ ┓";
                        }

                        if (o == "http://www.w3.org/2002/07/owl#AllDisjointClasses") {
                            disjointClassesAxiomRoot = s;
                        }
                    });

                    callbackSeries();
                },

                //reduce distance between successiveBlankNodes
                function (callbackSeries) {
                    return callbackSeries();

                    var itemsToRemove = [];

                    function recurse(nodeId) {
                        var node = nodesMap[nodeId];
                        if (!node) {
                            return;
                        }
                        if (!node.predicates) {
                            return;
                        }
                        node.predicates.forEach(function (predicate, index) {
                            // if(nodeId.indexOf("http")<0 && predicate.o.indexOf("http")<0){
                            if (predicate.p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest") {
                                var predicateObject = nodesMap[predicate.o];
                                if (!predicateObject.predicates) {
                                    return;
                                }

                                predicateObject.predicates.forEach(function (nextPredicate) {
                                    if (nextPredicate.p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#first") {
                                        node.predicates.splice(index, 1);
                                        node.predicates.push(nextPredicate);
                                        recurse(nextPredicate.o);
                                    }
                                });
                            } else {
                                recurse(predicate.o);
                            }
                        });
                    }

                    itemsToRemove.forEach(function (nodeId) {
                        delete nodesMap[nodeId];
                    });

                    recurse(rootNodeId);

                    callbackSeries();
                },

                //recurse nodes from nodeId
                function (callbackSeries) {
                    var existingNodes = {};

                    if (options.addToGraph && self.axiomsVisjsGraph) {
                        existingNodes = self.axiomsVisjsGraph.getExistingIdsMap();
                    }
                    var stop = false;

                    function recurse(nodeId, level) {
                        if (stop) {
                            return;
                        }

                        var node = nodesMap[nodeId];
                        if (!node) {
                            return;
                        }

                        if (node.id == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        }

                        // children
                        var skipNode = false;

                        if (node.predicates) {
                            node.predicates.forEach(function (predicate) {
                                var childNode = nodesMap[predicate.o];
                                if (!childNode) {
                                    return;
                                }

                                if (predicate.p.indexOf("allValuesFrom") > -1) {
                                    var x = 3;
                                }

                                if (predicate.p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#first") {
                                    skipNode = true;
                                }
                                if (predicate.p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest") {
                                    skipNode = true;
                                }
                                var edgeLabel = null;
                                if (!existingNodes[childNode.id]) {
                                    existingNodes[childNode.id] = 1;

                                    var visjsNode = self.getVisjsNode(childNode, level + 1);
                                    if (rootNodeId == node.id) {
                                        var edgeid = options.axiomType || predicate.pLabel || Sparql_common.getLabelFromURI(predicate.p);
                                        edgeid = edgeid.toLowerCase();
                                        if (edgeid.indexOf("subclassof") > -1) {
                                            edgeLabel = "⊑";
                                        } else if (edgeid.indexOf("equivalent") > -1) {
                                            edgeLabel = "≡";
                                        } else if (edgeid.indexOf("disjoint") > -1) {
                                            edgeLabel = "⊑ ┓";
                                        }
                                    }
                                    visjsNode.data.axiomId=childNode.axiomId

                                    visjsData.nodes.push(visjsNode);
                                }

                                var edgeId = node.id + "_" + childNode.id;

                                var arrows = null;
                                if (!visjsNode) {
                                    visjsNode = {}; // return;
                                }
                                if (childNode.id.indexOf("http") == 0) {
                                    //   if (visjsNode.shape != "dot" && predicate.p != "http://www.w3.org/2002/07/owl#inverseOf") {
                                    arrows = {
                                        to: {
                                            enabled: true,
                                            type: "solid",
                                            scaleFactor: 0.5,
                                        },
                                    };
                                }
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: node.id,
                                        to: childNode.id,
                                        label: edgeLabel,
                                        arrows: arrows,
                                        color: "#222",
                                        data: {
                                            id: edgeId,
                                            from: node.id,
                                            to: childNode.id,
                                            axiomId:predicate.axiomId

                                        },
                                    });

                                    recurse(predicate.o, level + 1);
                                }
                            });

                            if (existingNodes[nodeId]) {
                                visjsData.nodes.forEach(function (node, nodeIndex) {
                                    if (node.id == nodeId && node.level > level) {
                                        visjsData.nodes[nodeIndex].level = level;
                                    }
                                });
                            } else {
                                if (!skipNode) {
                                    existingNodes[node.id] = 1;
                                    var visjsNode = self.getVisjsNode(node, level);

                                    visjsData.nodes.push(visjsNode);
                                }
                            }
                        }
                    }

                    var level = 1;
                    if (options.startLevel) {
                        level = options.startLevel;
                    }

                    //  when disjointClassesAxiomRoot is not null tree starts from it
                    recurse(disjointClassesAxiomRoot || rootNodeId, level);

                    return callbackSeries();
                },

                //optimize nodes levels
                function (callbackSeries) {
                    //    return callbackSeries();

                    var nodesMap = common.array.toMap(visjsData.nodes, "id");
                    var max = 20;
                    var iterations = 0;
                    var stop = true;
                    do {
                        iterations += 1;
                        visjsData.edges.forEach(function (edge, nodeIndex) {
                            if (nodesMap[edge.from] && nodesMap[edge.to] && nodesMap[edge.to].level < nodesMap[edge.from].level) {
                                nodesMap[edge.to].level = nodesMap[edge.from].level + 1;
                                stop = false;
                            }

                            if (nodesMap[edge.from] && rootNodeId == edge.from) {
                                nodesMap[edge.from].color = "#90d6e4";
                                nodesMap[edge.from].shape = "star";
                                edge.arrows = {
                                    to: {
                                        enabled: true,
                                        type: "solid",
                                        scaleFactor: 0.5,
                                    },
                                };
                            }
                            if (edge.to == rootNodeId) {
                                edge.smooth = {
                                    type: "diagonalCross",
                                    forceDirection: "horizontal",

                                    roundness: 0.4,
                                };
                            }
                            /*   if (rootNodeId ==edge.to) {
                                   nodesMap[edge.to].color = "#096eac";
                               }*/
                        });
                    } while (stop == false && iterations <= max);

                    return callbackSeries();
                },

                //process inversion of some and property
                function (callbackSeries) {
                    //    return callbackSeries()
                    var nodesMap = {};
                    self.minNodeLevel = 5000;
                    visjsData.nodes.forEach(function (node) {
                        self.minNodeLevel = Math.min(self.minNodeLevel, node.level);
                        nodesMap[node.id] = node;
                    });
                    var nodesToDelete = [];
                    visjsData.edges.forEach(function (edge, index) {
                        var x = nodesMap[edge.from].label;
                        if (nodesMap[edge.from].data.type == "inverseOf") {
                            //concat inverse and exists
                            nodesMap[edge.from].label += nodesMap[edge.to].label + "";
                            nodesToDelete.push(edge.to);
                        }

                        if (nodesMap[edge.from].color == "#cb9801") {
                            //restrcition
                            if (nodesMap[edge.to].data.type == "http://www.w3.org/2002/07/owl#ObjectProperty") {
                                var edegLabel = "";
                                var labelTo = nodesMap[edge.to].label;

                                var maxLineLength = 20;
                                var lineToLength = maxLineLength;
                                var labelToLength = Math.min(lineToLength, labelTo.length);
                                if (labelToLength >= maxLineLength) {
                                    // on coupe au dernier blanc
                                    var indexb = labelTo.substring(0, labelToLength).lastIndexOf(" ");
                                    if (indexb > 0) {
                                        labelToLength = Math.min(indexb, labelToLength);
                                    }
                                }

                                if (labelTo.length <= labelToLength) {
                                    edegLabel = labelTo + "\n" + nodesMap[edge.from].label + "";
                                } else {
                                    edegLabel = labelTo.substring(0, labelToLength) + "\n" + labelTo.substring(labelToLength + 1) + " " + nodesMap[edge.from].label + "";
                                }

                                nodesMap[edge.from].label = edegLabel;
                                //   nodesMap[edge.from].color = "#f5ef39"
                                nodesMap[edge.from].font = { size: 14, color: "#cb9801" };
                                visjsData.edges[index].length = 120;
                                nodesMap[edge.from].shape = "ellipse";
                                nodesMap[edge.from]["color"] = "#eee";
                                nodesMap[edge.from]["borderWidth"] = 0;

                                nodesToDelete.push(edge.to);
                            } else if (nodesMap[edge.to].data.type == "inverseOf") {
                                nodesMap[edge.from].label = nodesMap[edge.to].label;
                                //  nodesMap[edge.from].color = "#f5ef39"
                                nodesMap[edge.from].font = { size: 18, color: "#cb9801" };
                                //  visjsData.edges[index].length = 120;
                                nodesToDelete.push(edge.to);
                            }
                        }
                    });
                    var nodesToKeep = [];
                    visjsData.nodes.forEach(function (node) {
                        if (nodesToDelete.indexOf(node.id) < 0) {
                            nodesToKeep.push(node);
                        }
                    });
                    visjsData.nodes = nodesToKeep;

                    return callbackSeries();
                },

                function (callbackSeries) {
                    // on ne bouge pas le noeud  de départ
                    visjsData.nodes.forEach(function (node) {
                        if (node.id == rootNodeId) {
                            node.level = self.minNodeLevel - 1;
                        }
                    });
                    callbackSeries();
                },

                function (callbackSeries) {
                    //remove blankNodes edges //!!!!!!!!!!!!dont work

                    return callbackSeries();

                    var edgesTodelete = {};
                    var nodesTodelete = {};
                    var edgesFromMap = {};
                    visjsData.edges.forEach(function (edge) {
                        edgesFromMap[edge.from] = edge;
                    });
                    var nodesMap = {};
                    visjsData.nodes.forEach(function (node) {
                        nodesMap[node.id] = node;
                    });

                    visjsData.edges.forEach(function (edge) {
                        if (nodesMap[edge.to] && nodesMap[edge.to].color == "#70ac47") {
                            //blanknode
                            edgesFromMap[edge.to].from = edge.from;
                            nodesTodelete[edge.to] = 1;
                            edgesTodelete[edge.id] = 1;
                        }
                    });

                    var newNodes = [];
                    var newEdges = [];
                    visjsData.nodes.forEach(function (node) {
                        if (!nodesTodelete[node.id]) {
                            newNodes.push(node);
                        }
                    });
                    visjsData.edges.forEach(function (edge) {
                        if (!edgesTodelete[edge.id]) {
                            newEdges.push(edge);
                        }
                    });
                    visjsData = { nodes: newNodes, edges: newEdges };

                    callbackSeries();
                },
                //draw graph

                function (callbackSeries) {
                    if (options.addToGraph && self.axiomsVisjsGraph) {
                        if (true) {
                            self.switchToHierarchicalLayout(true);
                        }

                        self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
                        self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
                        self.switchToHierarchicalLayout(false);
                    } else {
                        options.onNodeClick=Axiom_activeLegend.onNodeGraphClick
                        self.drawGraph(visjsData, divId, options);
                        self.currentVisjsData = visjsData;
                        self.switchToHierarchicalLayout(false);
                    }
                    return callbackSeries();
                },
            ],

            function (err) {
                if (callback) {
                    return callback(err);
                }
            },
        );
    };

    self.drawGraph = function (visjsData, graphDiv, options) {
        var xOffset = 95;
        var yOffset = 90;
        //    xOffset = parseInt($("#axiomsDraw_xOffset").val());
        //   yOffset = parseInt($("#axiomsDraw_yOffset").val());

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
            onclickFn: options.onNodeClick,
            onRightClickFn: options.onRightClickFn || Axioms_graph.showGraphPopupMenu,
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

        /*   $("#" + self.graphDivContainer).html(
               "<span style='font-size: 16px;color: blue; font-weight: bold'> WORK IN PROGRESS</span>" +
               "  <button onclick=\"AxiomEditor.init()\">Edit Axiom</button>" +
               "<div id='axiomsGraphDiv3' style='width:800px;height:525px;' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>"
           );*/

        self.axiomsVisjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.axiomsVisjsGraph.draw(function () {
            if (false && !options.keepHierarchyLayout) {
                self.switchToHierarchicalLayout(false);
            }
        });
    };

    self.switchToHierarchicalLayout = function (booleanValue) {
        if (self.graphOptions.visjsOptions.layout && self.graphOptions.visjsOptions.layout.hierarchical) {
            self.graphOptions.visjsOptions.layout.hierarchical.enabled = booleanValue;
            self.axiomsVisjsGraph.network.setOptions(self.graphOptions.visjsOptions);
        }
    };

    self.showGraphPopupMenu = function (node, point, event) {
        return;
        if (!node) {
            return;
        }
        self.currentGraphNode = node;
        if (!node || !node.data) {
            return;
        }
        var html = "";
        html = '    <span class="popupMenuItem" onclick="NodeInfosAxioms.expandGraphFromNode();"> expand from Node</span>';
        html += '    <span class="popupMenuItem" onclick="NodeInfosAxioms.collapseGraphToNode();"> collapse to Node</span>';
        html += '    <span class="popupMenuItem" onclick="NodeInfosAxioms.startFromNode();"> start from Node</span>';
        html += '    <span class="popupMenuItem" onclick="NodeInfosAxioms.nodeInfos();"> NodeInfos</span>';

        if (Lineage_sources.isSourceEditableForUser(NodeInfosAxioms.currentSource)) {
            html += '    <span class="popupMenuItem" onclick="Axioms_graph.removeNodeFromGraph();"> Remove node</span>';
            html += '    <span class="popupMenuItem" onclick="Axiom_activeLegend.createAxiomFromGraph();"> create Axiom</span>';
        }
        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.clearGraph = function () {
        $("#" + self.graphDivId).html("");
    };

    self.outlineNode = function (nodeId) {
        var newNodes = [];
        self.axiomsVisjsGraph.decorateNodes(null, { borderWidth: 1 });
        self.axiomsVisjsGraph.decorateNodes(nodeId, { borderWidth: 5 });
    };
    self.removeNodeFromGraph = function () {
        if (confirm("delete node")) {
            var edges = self.axiomsVisjsGraph.network.getConnectedEdges(self.currentGraphNode.id);
            self.axiomsVisjsGraph.data.edges.remove(edges);
            self.axiomsVisjsGraph.data.nodes.remove(self.currentGraphNode.id);
        }
    };
    self.showGraphDisplay = function () {
        self.axiomsVisjsGraph.showGraphConfig();
    };

    self.toGraphMl = function () {
        self.axiomsVisjsGraph.toGraphMl();
    };
    self.toSVG = function () {
        self.axiomsVisjsGraph.toSVG();
    };
    self.visjsDataToClassDiagram = function () {
        var visjsData = {
            nodes: self.axiomsVisjsGraph.data.nodes.get(),
            edges: self.axiomsVisjsGraph.data.edges.get(),
        };
        PlantUmlTransformer.visjsDataToClassDiagram(visjsData);
    };

    return self;
})();

export default Axioms_graph;
window.Axioms_graph = Axioms_graph;
