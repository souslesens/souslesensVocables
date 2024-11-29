import common from "../../shared/common.js";
import Lineage_linkedData_mappings from "./linkedData/lineage_linkedData_mappings.js";
import Lineage_graphTraversal from "./lineage_graphTraversal.js";
import Lineage_selection from "./lineage_selection.js";
import Lineage_decoration from "./lineage_decoration.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Containers_graph from "../containers/containers_graph.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import MainController from "../../shared/mainController.js";
import authentication from "../../shared/authentification.js";
import Clipboard from "../../shared/clipboard.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";
import KGquery_graph from "../KGquery/KGquery_graph.js";
import Lineage_createRelation from "./lineage_createRelation.js";
import NodeInfosAxioms from "../axioms/nodeInfosAxioms.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Lineage_whiteboard = (function () {
    var sourceColors = {};

    var self = {};
    // self.lineageVisjsGraph = {};
    self.lineageVisjsGraph = new VisjsGraphClass("graphDiv", { nodes: [], edges: [] }, {});

    self.showLimit = 1000;
    self.MoreOptionsShow = {};
    var graphContext = {};

    self.propertyColors = {};
    self.defaultShape = "dot";
    self.defaultShapeSize = 5;
    self.orphanShape = "square";
    self.nodeShadow = true;
    self.objectPropertyColor = "#f50707";
    self.defaultEdgeArrowType = "triangle";
    self.defaultEdgeColor = "#aaa";
    self.defaultPredicateEdgeColor = "#266264";
    self.restrictionColor = "#fdbf01";
    self.namedIndividualShape = "triangle";
    self.namedIndividualColor = "#0067bb";
    self.defaultNodeFontColor = "#343434";
    self.defaultEdgeFontColor = "#343434";
    self.defaultLowOpacity = 0.35;
    self.decorationData = {};
    self.arrowTypes = {
        subClassOf: {
            to: {
                enabled: true,
                type: "triangle",
                scaleFactor: 0.5,
            },
        },
        type: {
            to: {
                enabled: true,
                type: "bar",
                scaleFactor: 0.5,
            },
        },
    };

    self.linkedDataShape = "square";
    self.sourcesGraphUriMap = {};

    self.minChildrenForClusters = 30;

    self.isLoaded = false;
    self.currentExpandLevel = 1;

    self.queriesStack = [];

    /**
     *
     *
     * @param callback
     */

    self.firstLoad = true;
    self.onLoaded = function () {
        if (self.firstLoad) {
            self.firstLoad = false;

            SearchWidget.currentTargetDiv = "LineageNodesJsTreeDiv";
        }

        UI.initMenuBar(self.loadSources);
        $("#Lineage_graphEditionButtons").show();
        $("#Lineage_graphEditionButtons").load("./modules/tools/lineage/html/AddNodeEdgeButtons.html");
        $("KGquery_messageDiv").attr("id", "messageDiv");
        $("KGquery_waitImg").attr("id", "waitImg");
    };
    self.unload = function () {
        $("#graphDiv").empty();
        $("#lateralPanelDiv").resizable("destroy");
        $("#lateralPanelDiv").css("width", "435px");
    };
    self.loadSources = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#lateralPanelDiv").load("./modules/tools/lineage/html/lateralPanel.html", function () {
                Lineage_whiteboard.initWhiteboardTab();
                Lineage_whiteboard.initUI();
            });
        });
    };

    self.onSourceSelect = function (sourceLabel, /** @type {{ button: number; }} */ event) {};

    self.onGraphOrTreeNodeClick = function (node, nodeEvent, options) {
        //  console.trace("onGraphOrTreeNodeClick");

        if (!node.data || !node.data.source) {
            return console.log("no data.source in node");
        }
        if (!Config.sources[node.data.source]) {
            return console.log("no matching source for node");
        }
        if (!options) {
            options = {};
        }
        if (node.data.type == "path") {
            return Lineage_graphTraversal.showPathNodesList(node.data.source, node.data.path);
        }
        if (self.currentOwlType == "LinkedData") {
            return Lineage_linkedData.showLinkedDataPanel(self.currentGraphNode);
        }

        if (nodeEvent.ctrlKey && nodeEvent.shiftKey) {
            if (options.callee == "Graph") {
                // remove literals
                Lineage_relations.drawRelations(null, null, "Graph", { skipLiterals: 1 });
                //  Lineage_whiteboard.graphActions.graphNodeNeighborhood("all");
            } else if (options.callee == "Tree") {
                Lineage_whiteboard.drawNodesAndParents(node);
            }
        } else if (nodeEvent.altKey && nodeEvent.shiftKey) {
            if (options.callee == "Graph") {
                //all predicates
                Lineage_relations.drawRelations(null, null, "Graph", {});
                //  Lineage_whiteboard.graphActions.graphNodeNeighborhood("all");
            } else if (options.callee == "Tree") {
                Lineage_whiteboard.drawNodesAndParents(node);
            }
        } else if (nodeEvent.ctrlKey && nodeEvent.altKey) {
            Lineage_selection.addNodeToSelection(node);
        } else if (nodeEvent.ctrlKey) {
            NodeInfosWidget.showNodeInfos(node.data.source, node, "mainDialogDiv", { resetVisited: 1 });
        } else if (nodeEvent.altKey && options.callee == "Tree") {
            SearchWidget.openTreeNode(SearchWidget.currentTargetDiv, node.data.source, node, { reopen: true });
        } else {
            return nodeEvent;
        }

        return null;
    };

    self.jstreeContextMenu = function () {
        var items = {};

        items.addSimilarlabels = {
            label: "add similars (label)",
            action: function (/** @type {any} */ _e) {
                Lineage_whiteboard.drawSimilarsNodes("sameLabel");
            },
        };

        if (authentication.currentUser.groupes.indexOf("admin") > -1) {
            items.wikiPage = {
                label: "Wiki page",
                action: function (/** @type {any} */ _e) {
                    var source = $("#sourcesTreeDiv").jstree().get_selected()[0];
                    Lineage_whiteboard.showWikiPage(source);
                },
            };
        }

        return items;
    };

    self.selectTreeNodeFn = function (event, propertiesMap) {
        SearchWidget.currentTreeNode = propertiesMap.node;
        self.currentTreeNode = propertiesMap.node;
        var data = propertiesMap.node.data;
        if (event.which == 3) {
            return;
        }
        if (self.onGraphOrTreeNodeClick(self.currentTreeNode, propertiesMap.event, { callee: "Tree" }) != null) {
            SearchWidget.openTreeNode(SearchWidget.currentTargetDiv, data.source, propertiesMap.node, { ctrlKey: propertiesMap.event.ctrlKey });
        }
    };

    self.initUI = function (clearTree) {
        UI.message("");
        self.lineageVisjsGraph.clearGraph();
        self.queriesStack = [];
        LegendWidget.clearLegend();
        Lineage_decoration.initLegend();

        if (clearTree) {
            $("#lineage_drawnSources").html("");
            $("#LineageNodesJsTreeDiv").empty();

            if (Lineage_sources.activeSource) {
                Lineage_sources.registerSourceImports(Lineage_sources.activeSource);
                SearchWidget.showTopConcepts(Lineage_sources.activeSource);
            }
        }
    };

    self.clearLastAddedNodesAndEdges = function () {
        var nodes = self.lineageVisjsGraph.lastAddedNodes;
        if (nodes && nodes.length > 0) {
            self.lineageVisjsGraph.data.nodes.remove(nodes);
        }

        var xx = self.lineageVisjsGraph.network;
    };

    self.showLastAddedNodesOnly = function () {
        if (!self.lineageVisjsGraph.lastAddedNodes || self.lineageVisjsGraph.lastAddedNodes.length == 0) {
            return;
        }
        var allNodes = self.lineageVisjsGraph.data.nodes.getIds();
        var nodesToRemove = [];
        allNodes.forEach(function (nodeId) {
            if (self.lineageVisjsGraph.lastAddedNodes.indexOf(nodeId) < 0) {
                nodesToRemove.push(nodeId);
            }
        });
        if (nodesToRemove.length > 0) {
            self.lineageVisjsGraph.data.nodes.remove(nodesToRemove);
        }
    };

    self.showHideIndividuals = function () {
        var hidden = false;
        if (!self.individualsShowing) {
            hidden = !hidden;
            self.individualsShowing = true;
        } else {
            self.individualsShowing = false;
        }
        var allNodes = self.lineageVisjsGraph.data.nodes.get();
        var nodesToHide = [];
        allNodes.forEach(function (node) {
            if (node.shape == self.namedIndividualShape) {
                nodesToHide.push({ id: node.id, hidden: hidden });
            }
        });

        self.lineageVisjsGraph.data.nodes.update(nodesToHide);
    };

    /**
     *
     * draws top classes and restrictions
     *
     * @param source
     */
    self.drawModel = function (source, graphDiv, options, callback) {
        if (!options) {
            options = {};
        }
        if (!source) {
            source = Lineage_sources.activeSource;
        }

        if (!source) {
            return;
        }
        if (!graphDiv) {
            graphDiv = Config.whiteBoardDivId;
        }

        if (!Config.sources[source]) {
            return;
        }
        var topConcepts = [];
        async.series(
            [
                function (callbackSeries) {
                    if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        return callbackSeries();
                    }
                    //  options.skipTopClassFilter = 1;
                    self.drawTopConcepts(source, options, graphDiv, function (err, result) {
                        if (err) {
                            if (err.response) {
                                return alert(err.response);
                            } else {
                                return;
                            }
                        }
                        var options = { output: "graph" };
                        if (!Lineage_whiteboard.lineageVisjsGraph.data?.nodes?.get) {
                            nodes = [];
                        } else {
                            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                        }
                        var data = [];
                        nodes.forEach(function (node) {
                            if (node.data && (!node.data.type || node.data.type != "literal")) {
                                data.push(node.id);
                            }
                        });
                        topConcepts = data;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var options = { data: topConcepts, source: source };
                    Lineage_relations.currentQueryInfos = null;
                    if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        options.data = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
                    }

                    Lineage_relations.drawRelations("direct", "restrictions", null, options, graphDiv);
                    callbackSeries();
                },

                function (callbackSeries) {
                    //to be finished
                    return callbackSeries();
                    Lineage_relations.drawEquivalentClasses(source, topConcepts, graphDiv, function (err, result) {
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (callback) {
                    return callback(err, topConcepts);
                }
                if (err) {
                    return alert(err), topConcepts;
                }
            }
        );
    };

    self.drawTopConcepts = function (source, options, graphDiv, callback) {
        if (!options) {
            options = {};
        }
        UI.showHideRightPanel("hide");
        self.currentExpandLevel = 1;

        if (!source) {
            source = Lineage_sources.activeSource;
        }

        if (!source) {
            return;
        }

        if (!Config.sources[source]) {
            return;
        }

        var allSources = [];

        var visjsData = { nodes: [], edges: [] };
        var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
        var imports = Config.sources[source].imports;
        var importGraphUrisMap = {};

        if (Config.Lineage.showSourceNodesInGraph) {
            if (!existingNodes[source]) {
                existingNodes[source] = 1;
                var sourceNode = {
                    id: source,
                    label: source,
                    shadow: self.nodeShadow,
                    shape: "box",
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: self.getSourceColor(source),
                    data: { source: source },
                    level: 1,
                };
                visjsData.nodes.push(sourceNode);
            }
        }
        if (imports) {
            imports.forEach(function (/** @type {string} */ importedSource) {
                if (!Config.sources[importedSource]) {
                    return;
                }
                var graphUri = Config.sources[importedSource].graphUri;
                var color = self.getSourceColor(importedSource);
                if (!graphUri) {
                    return;
                }
                if (Config.Lineage.showSourceNodesInGraph) {
                    if (!existingNodes[importedSource]) {
                        existingNodes[importedSource] = 1;
                        var importedSourceNode = {
                            id: importedSource,
                            label: importedSource,
                            shadow: self.nodeShadow,
                            shape: "box",
                            level: 1,
                            size: Lineage_whiteboard.defaultShapeSize,
                            data: { source: importedSource },
                            color: color,
                        };
                        importGraphUrisMap[graphUri] = importedSource;

                        visjsData.nodes.push(importedSourceNode);
                    }

                    var edgeId = importedSource + "_" + source;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        var edge = {
                            id: edgeId,
                            from: importedSource,
                            to: source,
                            arrows: " middle",
                            color: color,
                            width: 6,
                        };
                        visjsData.edges.push(edge);
                    }
                }
                //  self.registerSource(importedSource)
            });
        }

        self.currentExpandLevel += 1;
        allSources.push(source);
        async.eachSeries(
            allSources,
            function (/** @type {string} */ source, /** @type {(arg0: undefined) => void} */ callbackEach) {
                UI.message("loading source " + source);
                var queryOptions = { selectGraph: true, withoutImports: Lineage_sources.activeSource || false };
                for (var key in options) {
                    queryOptions[key] = options[key];
                }
                Sparql_generic.getTopConcepts(source, queryOptions, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }

                    if (!Lineage_whiteboard.isResultAcceptable(result)) {
                        return callbackEach(" ");
                        //return callbackEach();
                    }

                    var ids = [];
                    result.forEach(function (item) {
                        ids.push(item.topConcept.value);
                    });

                    var shape = self.defaultShape;
                    result.forEach(function (item) {
                        var nodeSource = item.subjectGraph ? Sparql_common.getSourceFromGraphUri(item.subjectGraph.value, source) : source;
                        //  var color = self.getSourceColor(nodeSource);
                        var attrs = self.getNodeVisjAttrs(item.topConcept, null, nodeSource);
                        if (!existingNodes[item.topConcept.value]) {
                            existingNodes[item.topConcept.value] = 1;
                            var node = {
                                id: item.topConcept.value,
                                label: item.topConceptLabel.value,
                                shadow: self.nodeShadow,
                                shape: attrs.shape,
                                color: attrs.color,
                                size: Lineage_whiteboard.defaultShapeSize,
                                level: self.currentExpandLevel,
                                data: {
                                    source: nodeSource,
                                    label: item.topConceptLabel.value,
                                    id: item.topConcept.value,
                                },
                            };
                            visjsData.nodes.push(node);

                            //link node to source

                            if (Config.Lineage.showSourceNodesInGraph) {
                                var edgeId = item.topConcept.value + "_" + source;
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    var edge = {
                                        id: edgeId,
                                        from: item.topConcept.value,
                                        to: source,
                                    };
                                    visjsData.edges.push(edge);
                                }
                            }
                        }
                    });

                    callbackEach();
                });
            },
            function (/** @type {any} */ err, /** @type {any} */ _result) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    if (err == " ") {
                        return;
                    }
                    return alert(err);
                }
                //   UI.message("", true)
                //  self.drawNewGraph(visjsData);
                if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
                    options["legendType"] = "individualClasses";
                    self.drawNewGraph(visjsData, graphDiv, options);
                } else {
                    self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                    self.lineageVisjsGraph.data.edges.add(visjsData.edges);
                    self.lineageVisjsGraph.network.fit();
                }
                UI.message("", true);

                if (callback) {
                    return callback();
                }
            }
        );
    };

    self.isResultAcceptable = function (result) {
        if (result.length > self.showLimit) {
            alert("Too may nodes (" + result.length + "). Use a filering Query instead ");
            return false;
        }
        if (result.length == 0) {
            UI.message("no data found", true);
            return false;
        }
        return true;
    };

    self.initWhiteBoard = function (force) {
        if (!self.lineageVisjsGraph.isGraphNotEmpty() || force) {
            self.drawNewGraph({ nodes: [], edges: [] });
        }
    };

    self.drawNewGraph = function (visjsData, graphDiv, _options) {
        if (!_options) {
            _options = {};
        }
        if (!graphDiv) {
            graphDiv = "graphDiv";
        }

        graphContext = {};
        var options = {};
        if (_options.visjsOptions) {
            options = _options.visjsOptions;
        } else {
            options = {
                keepNodePositionOnDrag: true,
                onclickFn: Lineage_whiteboard.graphActions.onNodeClick,
                onRightClickFn: Lineage_whiteboard.graphActions.showGraphPopupMenu,
                onHoverNodeFn: Lineage_selection.selectNodesOnHover,
                visjsOptions: {
                    physics: {
                        stabilization: {
                            enabled: false,
                            iterations: 180, // maximum number of iteration to stabilize
                            updateInterval: 10,
                            ///  onlyDynamicEdges: false,
                            fit: true,
                        },
                        barnesHut: {
                            springLength: 0,
                            damping: 0.15,
                            centralGravity: 0.8,
                        },
                        minVelocity: 0.75,
                    },
                    nodes: { font: { color: self.defaultNodeFontColor } },
                    edges: {
                        font: {
                            color: self.defaultEdgeColor,
                            multi: true,
                            size: 10,
                            strokeWidth: 0,

                            //ital: true,
                        },
                    },
                },
                onAddNodeToGraph: function (/** @type {any} */ _properties, /** @type {any} */ _senderId) {
                    if (_properties.items.length > 0) {
                        if (!Lineage_sources.activeSource) {
                            var node = self.lineageVisjsGraph.data.nodes.get(_properties.items[0]);
                            Lineage_sources.activeSource = node.data.source;
                        }
                        if (true) {
                            var nodes = self.lineageVisjsGraph.data.nodes.get(_properties.items);
                            if (nodes) {
                                Lineage_decoration.decorateNodeAndDrawLegend(nodes, _options.legendType);
                            }

                            //!self.lineageVisjsGraph.skipColorGraphNodesByType) {
                            //  var nodes = self.lineageVisjsGraph.data.nodes.get(_properties.items);
                        }
                    }
                },
            };
        }

        if (_options.layout) {
            options.visjsOptions.layout = _options.layout;
        }
        if (_options.layoutHierarchical) {
            options.layoutHierarchical = _options.layoutHierarchical;
        }

        if (_options.physics) {
            options.visjsOptions.physics = _options.physics;
        }
        if (_options.edges) {
            options.visjsOptions.edges = _options.edges;
        }

        if (_options.visjsOptions && _options.visjsOptions.manipulation) {
            options.visjsOptions.manipulation = _options.visjsOptions.manipulation;
        } else if (Lineage_sources.isSourceEditableForUser(Lineage_sources.activeSource)) {
            // if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[Lineage_sources.activeSource] && Config.sources[Lineage_sources.activeSource].editable) {
            options.visjsOptions.manipulation = {
                enabled: true,
                initiallyActive: true,
                deleteNode: false,
                deleteEdge: false,
                editNode: false,
                editEdge: false,

                addEdge: function (edgeData, callback) {
                    var sourceNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.from);
                    edgeData.from = sourceNode.data;
                    var targetNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.to);
                    edgeData.to = targetNode.data;
                    if (false && sourceNode.data && sourceNode.data.type != "container" && targetNode.data && targetNode.data.type == "container") {
                        return Containers_graph.addResourcesToContainer(Lineage_sources.activeSource, targetNode.data, sourceNode.data, true);
                    }

                    if (Lineage_graphTraversal.inPathMode) {
                        Lineage_graphTraversal.inPathMode = false;
                        return Lineage_graphTraversal.drawShortestpath(Lineage_sources.activeSource, edgeData.from, edgeData.to);
                    }

                    if (sourceNode.data.context == Lineage_linkedData_mappings.context || targetNode.data.context == Lineage_linkedData_mappings.context) {
                        Lineage_linkedData_mappings.onAddEdgeDropped(edgeData, function (err, result) {
                            if (err) {
                                return callback(err.responseText);
                            }
                            return null;
                        });
                    } else {
                        Lineage_createRelation.showAddEdgeFromGraphDialog(edgeData, function (err, result) {
                            if (err) {
                                return callback(err.responseText);
                            }
                            return null;
                        });
                    }
                },
            };
            if (false) {
                options.visjsOptions.interaction = {
                    navigationButtons: true,
                };
            }

            Lineage_sources.showHideEditButtons(Lineage_sources.activeSource);
        } else {
        }

        if (!graphDiv) {
            graphDiv = "graphDiv";
        }

        self.lineageVisjsGraph = new VisjsGraphClass(graphDiv, visjsData, options);
        Lineage_decoration.decorationDone = false;
        self.lineageVisjsGraph.draw(function () {
            UI.message("", true);

            //  Lineage_decoration.decorateNodeAndDrawLegend(visjsData.nodes);

            if (!Lineage_decoration.decorationDone && self.lineageVisjsGraph.isGraphNotEmpty() && !_options.noDecorations) {
                Lineage_decoration.decorationDone = true;
                Lineage_decoration.decorateNodeAndDrawLegend(visjsData.nodes, _options.legendType);
                //  GraphDisplayLegend.drawLegend("Lineage", "LineageVisjsLegendCanvas");
            }
        });
        Lineage_sources.showHideEditButtons(Lineage_sources.activeSource);

        return;
    };

    self.getGraphIdsFromSource = function (/** @type {any} */ source) {
        if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
            return null;
        }
        var existingNodes = self.lineageVisjsGraph.data.nodes.get();
        /**
         * @type {any[]}
         */
        var sourceNodes = [];
        existingNodes.forEach(function (/** @type {{ id: string; data: { source: any; id: any; }; }} */ item) {
            if (item.id != "#" && item.data && item.data.source == source) {
                sourceNodes.push(item.data.id || item.id);
            }
        });
        return sourceNodes;
    };

    self.addSourceChildrenToGraph = function () {
        var source = Lineage_sources.activeSource;
        if (source == "") {
            return alert("select a source");
        }
        var sourceNodes = self.getGraphIdsFromSource(source);
        self.addChildrenToGraph(source, sourceNodes);
    };

    self.listClusterToClipboard = function (/** @type {{ data: { cluster: any[]; }; }} */ clusterNode) {
        var text = "";
        clusterNode.data.cluster.forEach(function (/** @type {{ child: string; childLabel: string; }} */ item, /** @type {any} */ _index) {
            text += item.child + "," + item.childLabel + "\n";
        });

        common.copyTextToClipboard(text, function (/** @type {any} */ err, /** @type {any} */ result) {
            if (err) {
                return UI.message(err);
            }
            UI.message(result);
        });
    };

    self.listClusterContent = function (/** @type {{ data: { cluster: any[]; source: any; }; }} */ clusterNode) {
        /**
         * @type {{ id: any; text: any; parent: string; data: { source: any; id: any; label: any; }; }[]}
         */
        var jstreeData = [];
        clusterNode.data.cluster.forEach(function (/** @type {{ child: any; childLabel: any; }} */ item, /** @type {any} */ _index) {
            jstreeData.push({
                id: item.child,
                text: item.childLabel,
                parent: "#",
                data: { source: clusterNode.data.source, id: item.child, label: item.childLabel },
            });
        });

        var jstreeOptions = {
            openAll: true,
            selectTreeNodeFn: function (/** @type {any} */ event, /** @type {any} */ propertiesMap) {
                return Lineage_whiteboard.selectTreeNodeFn(event, propertiesMap);
            },
            contextMenu: SearchWidget.getJstreeConceptsContextMenu(),
        };

        JstreeWidget.loadJsTree(SearchWidget.currentTargetDiv, jstreeData, jstreeOptions);
    };

    self.openCluster = function (/** @type {{ data: { cluster: any[]; source: any; }; id: any; }} */ clusterNode) {
        UI.message("");
        if (clusterNode.data.cluster.length > self.showLimit) {
            self.listClusterToClipboard(clusterNode);
            return alert("cluster content copied to clipboard( too large to draw)");
        }

        var color = self.getSourceColor(clusterNode.data.source);
        var attrs = self.getNodeVisjAttrs(item.child1.type, item.subject, clusterNode.data.source);
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
        clusterNode.data.cluster.forEach(function (/** @type {{ child1: string; child1Label: any; concept: string; }} */ item) {
            if (!existingNodes[item.child1]) {
                existingNodes[item.child1] = 1;
                visjsData.nodes.push({
                    id: item.child1,
                    label: item.child1Label,
                    shadow: self.nodeShadow,
                    shape: attrs.shape,
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: attrs.color,
                    data: {
                        id: item.child1,
                        label: item.child1Label,
                        source: clusterNode.data.source,
                    },
                });

                var edgeId = item.child1 + "_" + item.subject;
                visjsData.edges.push({
                    id: edgeId,
                    from: item.child1,
                    to: item.subject,
                });
            }
        });

        self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
        self.lineageVisjsGraph.data.edges.add(visjsData.edges);
        self.lineageVisjsGraph.network.fit();
        self.lineageVisjsGraph.data.nodes.remove(clusterNode.id);
        $("#waitImg").css("display", "none");
        UI.message("");
    };

    self.drawSimilarsNodes = function (/** @type {any} */ _similarType, /** @type {any} */ _node, /** @type {any} */ _sources, /** @type {any} */ _descendantsAlso) {
        var toSource = $("#sourcesTreeDiv").jstree().get_selected()[0];
        var fromSource = Lineage_sources.activeSource;
        if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
            return;
        }
        var nodes = self.lineageVisjsGraph.data.nodes.get();
        /**
         * @type {any[]}
         */
        var labels = [];
        var ids = null;
        var labelsMap = {};
        nodes.forEach(function (/** @type {{ data: { label: string | number; }; }} */ node) {
            if (node.data && node.data.label) {
                labels.push(node.data.label);
            }
            labelsMap[node.data.label] = node;
        });

        SearchUtil.getSimilarLabelsInSources(fromSource, [toSource], labels, ids, "exactMatch", null, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if (err) {
                return alert(err.responseText);
            }

            var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };
            result.forEach(function (/** @type {{ label: string | number; matches: { [x: string]: any[]; }; }} */ item) {
                var sourceNode = labelsMap[item.label];
                for (var source in item.matches) {
                    item.matches[source].forEach(function (/** @type {{ id: string; label: any; }} */ match) {
                        if (match.id == sourceNode.id) {
                            return;
                        }
                        if (!existingNodes[match.id]) {
                            existingNodes[match.id] = 1;
                            var color = self.getSourceColor(source);
                            visjsData.nodes.push({
                                id: match.id,
                                label: match.label,
                                color: color,
                                shadow: self.nodeShadow,
                                shape: "dot",
                                size: Lineage_whiteboard.defaultShapeSize,
                                data: {
                                    id: match.id,
                                    label: match.label,
                                    source: source,
                                },
                            });
                        }

                        var edgeId = match.id + "_" + sourceNode.id + "_sameLabel";
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                from: match.id,
                                to: sourceNode.data.id,
                                color: "green",
                                width: 3,
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "curve",
                                    },
                                    from: {
                                        enabled: true,
                                        type: "curve",
                                    },
                                    length: 30,
                                },
                                data: {
                                    type: "sameLabel",
                                    from: match.id,
                                    to: sourceNode.id,
                                    fromSource: source,
                                    toSource: sourceNode.data.source,
                                },
                            });
                        }
                    });
                }
            });
            if (visjsData.edges.length > 0) {
                $("#transformSameLabelsEdgesIntoSameAsRelationsButton").css("display", "block");
                self.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                self.lineageVisjsGraph.data.edges.update(visjsData.edges);
                $("#accordion").accordion("option", { active: 2 });
                Lineage_sources.registerSource(toSource);
            }
        });
        UI.message("", true);
    };

    self.initLinkedDataPropertiesSelect = function (/** @type {string | number} */ sourceLabel) {
        var schemaType = Config.sources[sourceLabel].schemaType;
        if (schemaType == "INDIVIDUAL") {
            var preferredProperties = Config.sources[sourceLabel].preferredProperties;
            if (!preferredProperties) {
                return alert("no preferredProperties in source configuration");
            }

            var jstreeData = [];
            var uriPrefixes = {};
            preferredProperties.forEach(function (/** @type {string} */ item) {
                var p;
                p = item.lastIndexOf("#");
                if (p < 0) {
                    p = item.lastIndexOf("/");
                }
                var graphPrefix = item.substring(0, p);
                var propLabel = item.substring(p + 1);
                if (!uriPrefixes[graphPrefix]) {
                    uriPrefixes[graphPrefix] = 1;
                    jstreeData.push({
                        id: graphPrefix,
                        text: graphPrefix,
                        parent: "#",
                    });
                }
                jstreeData.push({
                    id: item,
                    text: propLabel,
                    parent: graphPrefix,
                });
            });
            JstreeWidget.loadJsTree("lineage_linkedDataPropertiesTree", jstreeData, { openAll: true });
        }
    };

    self.graphNodeNeighborhoodRanges = function (/** @type {{ id: string; label: string; }} */ nodeData) {
        var fromSource = Lineage_sources.activeSource;
        Sparql_OWL.getObjectPropertiesDomainAndRange(source, [nodeData.id], {}, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if (err) {
                return UI.message(err);
            }
            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                return UI.message(" no  data found");
            }
            var visjsData = { nodes: [], edges: [] };
            var existingIds = self.lineageVisjsGraph.getExistingIdsMap();
            var hasProperties = false;
            var labelStr = "<b>" + nodeData.label + "</b>\n";
            result.forEach(function (/** @type {{ propLabel: { value: any; }; prop: { value: any; }; rangeLabel: { value: any; }; range: { value: any; }; }} */ item) {
                hasProperties = true;
                var propLabel;
                if (item.propLabel) {
                    propLabel = item.propLabel.value;
                } else {
                    propLabel = Sparql_common.getLabelFromURI(item.prop.value);
                }
                var rangeLabel;
                if (item.rangeLabel) {
                    rangeLabel = item.rangeLabel.value;
                } else {
                    rangeLabel = Sparql_common.getLabelFromURI(item.range.value);
                }
                labelStr += "<i>" + propLabel + " : </i>" + rangeLabel + "\n";
            });
            var color = Lineage_whiteboard.getSourceColor(fromSource);
            if (!existingIds[nodeData.id]) {
                existingIds[nodeData.id] = 1;
                var node = {
                    id: nodeData.id,
                    label: nodeData.label,
                    shadow: self.nodeShadow,
                    shape: Lineage_whiteboard.defaultShape,
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: Lineage_whiteboard.getSourceColor(fromSource, nodeData.id),
                    font: { multi: true, size: 10 },
                    data: {
                        source: fromSource,
                        id: nodeData.id,
                        label: nodeData.label,
                    },
                };

                visjsData.nodes.push(node);
            }
            color = "#ddd";
            var id = nodeData.id + "_range";
            if (hasProperties && !existingIds[id]) {
                existingIds[id] = 1;
                node = {
                    id: id,
                    label: labelStr,
                    shadow: self.nodeShadow,
                    shape: "box",

                    color: color,
                    font: { multi: true, size: 10 },
                    data: {
                        source: fromSource,
                        id: nodeData.id,
                        label: nodeData.label,
                    },
                };
                visjsData.nodes.push(node);

                visjsData.edges.push({
                    id: nodeData.id + "_" + id,
                    from: nodeData.id,
                    to: id,
                    width: 5,
                    data: {
                        from: nodeData.id,
                        to: id,
                        prop: prop,
                        type: "ObjectProperty",
                    },
                });
            }
            self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            self.lineageVisjsGraph.data.edges.add(visjsData.edges);
        });
    };
    self.graphNodeNeighborhood = function (nodeData, propFilter, callback) {
        var fromSource = Lineage_sources.activeSource;
        if (propFilter == "ranges") {
            return graphNodeNeighborhoodRanges(nodeData);
        }
        var ids;
        if (!nodeData) {
            ids = self.lineageVisjsGraph.data.nodes.getIds();
        } else {
            ids = [nodeData.id];
        }
        var source = Lineage_sources.activeSource;

        async.series(
            [
                function (callbackSeries) {
                    var sparql_url = Config.sources[source].sparql_server.url;
                    var fromStr = Sparql_common.getFromStr(source);

                    var slices = common.array.slice(ids, 50);
                    async.eachSeries(
                        slices,
                        function (_ids, callbackEach) {
                            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " + "select * " + fromStr + " where {";
                            var filter = Sparql_common.setFilter("subject", _ids);

                            var queryOutcoming = "{?subject ?prop ?value.  " + filter + Sparql_common.getVariableLangLabel("value", true) + "}";
                            // "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} " +
                            ("?prop rdf:type owl:ObjectProperty. ?value rdf:type ?valueType filter (?valueType in (owl:Class,owl:NamedIndividual))}");
                            var queryIncoming = " {?value ?prop ?subject.  " + filter + filter + Sparql_common.getVariableLangLabel("value", true) + "}";
                            // "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel}" +
                            ("?prop rdf:type owl:ObjectProperty. ?value rdf:type ?valueType filter (?valueType in (owl:Class,owl:NamedIndividual))}");

                            if (propFilter == "outcoming") {
                                query += queryOutcoming;
                            } else if (propFilter == "incoming") {
                                query += queryIncoming;
                            } else if (propFilter == "all") {
                                query += queryOutcoming + " UNION " + queryIncoming;
                            }

                            query += "}";
                            var url = sparql_url + "?format=json&query=";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (/** @type {any} */ err, /** @type {{ results: { bindings: any; }; }} */ result) {
                                if (err) {
                                    return callbackEach();
                                }
                                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "value"]);
                                var data = result.results.bindings;
                                if (data.length == 0) {
                                    $("#waitImg").css("display", "none");
                                    UI.message(" no  data found");
                                    return callbackEach();
                                }

                                var visjsData = { nodes: [], edges: [] };
                                var existingIds = self.lineageVisjsGraph.getExistingIdsMap();
                                data.forEach(function (item) {
                                    if (!existingIds[item.subject.value]) {
                                        existingIds[item.subject.value] = 1;
                                        var node = {
                                            id: item.subject.value,
                                            label: item.subject.value,
                                            shadow: self.nodeShadow,
                                            shape: Lineage_whiteboard.defaultShape,
                                            size: Lineage_whiteboard.defaultShapeSize,
                                            color: Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource, nodeData.id),
                                            font: { multi: true, size: 10 },
                                            level: 5,
                                            data: {
                                                source: Lineage_sources.activeSource,
                                                id: item.subject.value,
                                                label: item.subject.value,
                                            },
                                        };

                                        visjsData.nodes.push(node);
                                    }
                                    var distinctProps = {};
                                    if (true) {
                                        if (!distinctProps[item.prop.value]) {
                                            distinctProps[item.prop.value] = 1;
                                        }
                                        if (item.value.type == "uri" && item.value.value.indexOf("Class") < 0 && item.value.value.indexOf("_:b") < 0) {
                                            // if (!item.prop.value.match(/rdf|owl|skos/) || item.prop.value.indexOf("sameAs") > -1 || item.prop.value.indexOf("partOf") > -1) {
                                            // if (item.prop.value.indexOf("rdf") < 0 && item.prop.value.indexOf("owl") < 0) {
                                            //  if(!graphPropertiesFilterRegex || item.prop.value.match(graphPropertiesFilterRegex)) {
                                            var shape = Lineage_whiteboard.defaultShape;
                                            if (item.valueType.value == "owl:Class") {
                                                shape = Lineage_whiteboard.defaultShape;
                                            } else {
                                                item.valueType.value == "owl:NamedIndividual";
                                            }
                                            shape = Lineage_whiteboard.namedIndividualShape;
                                            if (!existingIds[item.value.value]) {
                                                existingIds[item.value.value] = 1;
                                                var node = {
                                                    id: item.value.value,
                                                    label: item.valueLabel.value,
                                                    shadow: self.nodeShadow,
                                                    shape: shape,
                                                    color: Lineage_whiteboard.getSourceColor(source, item.value.value),
                                                    size: Lineage_whiteboard.defaultShapeSize,
                                                    font: { multi: true, size: 10 },
                                                    level: 5,
                                                    data: {
                                                        source: source,
                                                        id: item.value.value,
                                                        label: item.valueLabel.value,
                                                    },
                                                };

                                                visjsData.nodes.push(node);
                                            }
                                            var propLabel;
                                            if (item.propLabel) {
                                                propLabel = item.propLabel.value;
                                            } else {
                                                propLabel = Sparql_common.getLabelFromURI(item.prop.value);
                                            }
                                            var edgeId = item.subject.value + "_" + item.value.value;
                                            var inverseEdgeId = item.value.value + "_" + item.subject.value;
                                            var arrows;
                                            if (propFilter == "outcoming" || propFilter == "all") {
                                                arrows = {
                                                    to: {
                                                        enabled: true,
                                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                                        scaleFactor: 0.5,
                                                    },
                                                };
                                            }
                                            if (propFilter == "incoming") {
                                                arrows = {
                                                    from: {
                                                        enabled: true,
                                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                                        scaleFactor: 0.5,
                                                    },
                                                };
                                            }

                                            if (!existingIds[edgeId] && !existingIds[inverseEdgeId]) {
                                                existingIds[edgeId] = 1;
                                                visjsData.edges.push({
                                                    id: edgeId,
                                                    from: item.subject.value,
                                                    label: propLabel.indexOf("subClassOf") > -1 ? null : propLabel,
                                                    font: { multi: true, size: 8 },
                                                    color: Lineage_whiteboard.defaultEdgeColor,
                                                    to: item.value.value,
                                                    arrows: arrows,
                                                    data: {
                                                        from: item.subject.value,
                                                        to: item.value.value,
                                                        prop: item.prop.value,
                                                        type: "ObjectProperty",
                                                        source: source,
                                                    },
                                                });
                                            }
                                        }
                                    }
                                });

                                if (self.lineageVisjsGraph.isGraphNotEmpty()) {
                                    self.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                                    self.lineageVisjsGraph.data.edges.update(visjsData.edges);
                                } else {
                                    Lineage_whiteboard.drawNewGraph(visjsData);
                                }
                                callbackEach();
                            });
                        },
                        function (err) {
                            callbackSeries(err);
                        }
                    );
                },

                function (callbackSeries) {
                    if (propFilter != "all") {
                        return callbackSeries();
                    }
                    self.drawRestrictions(nodeData.source, ids, true);
                    callbackSeries();
                },
            ],
            function (err) {
                if (callback) {
                    return callback(err);
                } else if (err) {
                    UI.message(err);
                }
            }
        );
    };

    self.addNodesAndParentsToGraph = function (source, nodeIds, options, callback) {
        if (!nodeIds) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            if (!source) {
                return alert("select a source");
            }
            nodeIds = self.getGraphIdsFromSource(source);
        }
        UI.message("");

        var slices = common.array.slice(nodeIds, 300);

        var memberPredicate = false;

        if (!options) {
            options = {};
        }
        options.selectGraph = 1;
        var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
        var visjsData = { nodes: [], edges: [] };
        async.eachSeries(
            slices,
            function (/** @type {any} */ slice, /** @type {(arg0: undefined) => void} */ callbackEach) {
                Sparql_OWL.getNodeParents(source, null, slice, 1, options, function (/** @type {any} */ err, /** @type {any[]} */ result) {
                    if (err) {
                        return callbackEach(err);
                    }

                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");
                        UI.message("No data found", true);
                        return callbackEach(null);
                    }

                    var shape = self.defaultShape;

                    result.forEach(function (item) {
                        if (item.broader1) {
                            let nodeSource = source;
                            let nodeColor = self.getSourceColor(nodeSource);

                            if (!existingNodes[item.subject.value]) {
                                existingNodes[item.subject.value] = 1;
                                var node = {
                                    id: item.subject.value,
                                    label: item.subjectLabel.value,
                                    shadow: self.nodeShadow,
                                    shape: shape,
                                    color: nodeColor,
                                    size: Lineage_whiteboard.defaultShapeSize,
                                    data: {
                                        source: nodeSource,
                                        label: item.subjectLabel.value,
                                        id: item.subject.value,
                                    },
                                };

                                visjsData.nodes.push(node);
                            }

                            if (!existingNodes[item.broader1.value]) {
                                if (item.broader1 && (item.broader1.type == "bnode" || item.broader1.value.indexOf("_:") == 0)) {
                                    //skip blank nodes
                                    return;
                                }
                                let broaderSource = item.broaderGraphs1 ? Sparql_common.getSourceFromGraphUris(item.broaderGraphs1.value, source) : source;
                                existingNodes[item.broader1.value] = 1;
                                var node = {
                                    id: item.broader1.value,
                                    label: item.broader1Label.value,
                                    shadow: self.nodeShadow,
                                    shape: shape,
                                    color: nodeColor,
                                    size: Lineage_whiteboard.defaultShapeSize,
                                    data: {
                                        source: broaderSource,
                                        label: item.broader1Label.value,
                                        id: item.broader1.value,
                                    },
                                };

                                visjsData.nodes.push(node);
                            } else {
                            }

                            if (item.broader1.value != source) {
                                var edgeId = item.subject.value + "_" + item.broader1.value;
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    var edge = {
                                        id: edgeId,
                                        from: item.subject.value,
                                        to: item.broader1.value,
                                        color: self.defaultEdgeColor,
                                        arrows: {
                                            to: {
                                                enabled: true,
                                                type: Lineage_whiteboard.defaultEdgeArrowType,
                                                scaleFactor: 0.5,
                                            },
                                        },
                                        data: { type: "parent", source: source },
                                    };
                                    visjsData.edges.push(edge);
                                }
                            }
                        }
                    });

                    if (self.lineageVisjsGraph.isGraphNotEmpty()) {
                        self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                        self.lineageVisjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        Lineage_whiteboard.drawNewGraph(visjsData);
                    }
                    callbackEach();
                });
            },
            function (/** @type {any} */ err) {
                $("#waitImg").css("display", "none");
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    return UI.message("No data found", true);
                }
                if (self.lineageVisjsGraph.network) {
                    self.lineageVisjsGraph.network.fit();
                }
                if (callback) {
                    callback(null, visjsData);
                }
                return UI.message("", true);
            }
        );
    };
    self.addChildrenToGraph = function (source, nodeIds, options, callback) {
        var parentIds;
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        if (!source) {
            return alert("select a source");
        }

        if (nodeIds) {
            parentIds = nodeIds;
        } else {
            parentIds = [];
            var nodes = self.lineageVisjsGraph.data.nodes.get();
            nodes.forEach(function (/** @type {{ data: { source: any; id: any; }; }} */ node) {
                if ((source == Lineage_sources.activeSource || (node.data && node.data.source == source)) && node.data && node.data.id != source) {
                    parentIds.push(node.data.id);
                }
            });
        }
        if (parentIds.length == 0) {
            return UI.message("no parent node selected");
        }

        UI.message("");
        if (!options) {
            options = {};
        }
        if (self.currentOwlType == "ObjectProperty") {
            options.owlType = "ObjectProperty";
        }
        var depth = 1;
        if (options.depth) {
            depth = options.depth;
        }
        options.skipRestrictions = 1;
        options.selectGraph = 1;

        Sparql_generic.getNodeChildren(source, null, parentIds, depth, options, function (err, result) {
            if (err) {
                return UI.message(err);
            }
            var parentsMap = [];

            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                return UI.message("No data found", true);
            }

            var color = self.getSourceColor(source);

            //get Clusters

            var clusters = [];

            result.forEach(function (item) {
                if (item.subject && (item.subject.type == "bnode" || item.subject.value.indexOf("_:") == 0)) {
                    //skip blank nodes
                    return;
                }
                if (!parentsMap[item.subject.value]) {
                    parentsMap[item.subject.value] = [];
                }
                var obj = {};
                for (var key in item) {
                    obj[key] = item[key] ? item[key].value : null;
                }
                parentsMap[item.subject.value].push(obj);

                var cancelCluster = true;
                if (!cancelCluster && !clusters[item.subject.value] && !options.dontClusterNodes && parentsMap[item.subject.value].length > Lineage_whiteboard.minChildrenForClusters) {
                    clusters.push([item.subject.value]);
                }
            });

            var existingNodes = self.lineageVisjsGraph.getExistingIdsMap(true);
            var visjsDataClusters = { nodes: [], edges: [] };
            self.currentExpandLevel += 1;
            var expandedLevel = [];

            //pocess Clusters
            for (var parentConcept in parentsMap) {
                //************* parentsMap entry is a cluster
                if (clusters.indexOf(parentConcept) > -1) {
                    //on enleve les cluster du dernier bootomIds dsiono on cree des orphelins au niveau suivant

                    var nodeId = parentConcept + "_cluster";
                    if (!existingNodes[nodeId]) {
                        existingNodes[nodeId] = 1;
                        visjsDataClusters.nodes.push({
                            id: parentConcept + "_cluster",
                            label: parentsMap[parentConcept].length + "children",
                            shadow: self.nodeShadow,
                            shape: "star",
                            size: Lineage_whiteboard.defaultShapeSize,
                            value: parentsMap[parentConcept].length,
                            color: color,
                            level: options.startLevel || self.currentExpandLevel,
                            data: {
                                cluster: parentsMap[parentConcept],
                                id: parentConcept + "_cluster",
                                label: "CLUSTER : " + parentsMap[parentConcept].length + "children",
                                source: source,
                                parent: parentConcept,
                                varName: parentConcept + "_cluster",
                            },
                        });
                    }
                    var edgeId = parentConcept + "_" + parentConcept + "_cluster";
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsDataClusters.edges.push({
                            id: edgeId,
                            to: parentConcept,
                            from: parentConcept + "_cluster",
                            color: Lineage_whiteboard.defaultEdgeColor,
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                            data: { source: source, type: "parent" },
                        });
                    }
                }
            }

            //process non cluster nodes
            var existingIds = self.lineageVisjsGraph.getExistingIdsMap();
            var visjsData2 = { nodes: [], edges: [] };

            for (var parentConcept in parentsMap) {
                if (clusters.indexOf(parentConcept) < 0) {
                    var shapeSize = Lineage_whiteboard.defaultShapeSize;

                    // identify namedLinkedData when several rdf:type
                    var namedLinkedDataMap = {};
                    parentsMap[parentConcept].forEach(function (item) {
                        for (var i = 1; i < depth + 1; i++) {
                            if (item["child" + i + "Type"] && item["child" + i + "Type"].indexOf("NamedIndividual") > -1) {
                                namedLinkedDataMap[item["child" + i]] = 1;
                            }
                        }
                    });

                    parentsMap[parentConcept].forEach(function (item) {
                        expandedLevel.push(item.id);

                        for (var i = 1; i < depth + 1; i++) {
                            if (item["child" + i]) {
                                let childNodeSource = item["child" + i + "Graph"] ? Sparql_common.getSourceFromGraphUri(item["child" + i + "Graph"], source) : source;

                                if (!existingIds[item["child" + i]]) {
                                    var attrs = self.getNodeVisjAttrs(item["child" + i + "Type"], item.subject, childNodeSource);
                                    var isIndividualId = namedLinkedDataMap[item["child" + i]];

                                    var xxx = item["child" + i + "Label"];
                                    if (item["child" + i] == "http://data.total.com/resource/tsf/ontology/apps-categories/greg/Synergi_S_-_SYNERGI") {
                                        var x = 3;
                                    }
                                    if (isIndividualId) {
                                        attrs.shape = self.namedIndividualShape;
                                    }
                                    if (options.shape) {
                                        attrs.shape = options.shape;
                                    }

                                    existingIds[item["child" + i]] = 1;

                                    visjsData2.nodes.push({
                                        id: item["child" + i],
                                        label: item["child" + i + "Label"],
                                        shadow: self.nodeShadow,
                                        shape: attrs.shape,
                                        size: shapeSize,
                                        level: (options.startLevel || 0) + i,
                                        color: attrs.color,

                                        data: {
                                            id: item["child" + i],
                                            label: item["child" + i + "Label"],
                                            source: childNodeSource,
                                            rdfType: namedLinkedDataMap[item["child" + i]] ? "NamedIndividual" : "Class",
                                        },
                                    });
                                }
                                var parent;
                                if (i == 1) {
                                    parent = item.subject;
                                } else {
                                    parent = item["child" + (i - 1)];
                                }
                                var edgeId = item["child" + i] + "_" + parent;
                                var inverseEdge = parent + "_" + item["child" + i];
                                if (!existingIds[edgeId] && !existingIds[inverseEdge]) {
                                    existingIds[edgeId] = 1;
                                    visjsData2.edges.push({
                                        id: edgeId,
                                        to: parent,
                                        from: item["child" + i],
                                        color: Lineage_whiteboard.defaultEdgeColor,
                                        arrows: {
                                            to: {
                                                enabled: true,
                                                type: Lineage_whiteboard.defaultEdgeArrowType,
                                                scaleFactor: 0.5,
                                            },
                                        },
                                        data: { source: childNodeSource, type: "parent" },
                                    });
                                }
                            }
                        }
                    });
                }
            }
            if (callback) {
                if (!options.drawBeforeCallback) {
                    return callback(null, visjsData2);
                }
            }
            var visjsData = {
                nodes: visjsDataClusters.nodes.concat(visjsData2.nodes),
                edges: visjsDataClusters.edges.concat(visjsData2.edges),
            };

            visjsData.nodes = common.removeDuplicatesFromArray(visjsData.nodes, "id");
            self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            self.lineageVisjsGraph.data.edges.add(visjsData.edges);
            self.lineageVisjsGraph.network.fit();

            $("#waitImg").css("display", "none");
            if (callback) {
                return callback(null, visjsData2);
            }
        });
    };

    self.addEdge = function (source, from, to, predicate) {
        var arrows = null;
        if (predicate.indexOf("subClassOf") > -1 || predicate.indexOf("type") > -1) {
        }
        var visjsData = { nodes: [], edges: [] };
        visjsData.edges.push({
            id: from + "_" + to,
            from: from,
            to: to,
            color: Lineage_whiteboard.defaultEdgeColor,
            arrows: arrows,
            data: { source: source },
        });
        self.lineageVisjsGraph.data.edges.add(visjsData.edges);
    };

    self.deleteEdge = function (from, to, predicate) {
        var id = from + "_" + to;
        self.lineageVisjsGraph.data.edges.remove(id);
    };

    self.setEdgesDecoration = function (edges) {
        if (!edges) {
            edges = self.lineageVisjsGraph.data.edges.get();
        }
        if (!Array.isArray(edges)) {
            edges = [edges];
        }
        var newEdges = [];
        edges.forEach(function (edge) {
            var prop = edge.data.property;
            if (!prop) {
                return;
            }
            var arrowType = {};
            var color = Lineage_whiteboard.defaultEdgeColor;
            if (prop.indexOf("subClassOf") > -1) {
                arrowType = self.arrowTypes["subClassOf"];
            } else if (prop.indexOf("type") > -1) {
                arrowType = self.arrowTypes["type"];
                color = "blue";
            }
            newEdges.push({ id: edge.id, color: color, arrow: arrowType });
        });
        self.lineageVisjsGraph.data.edges.update(newEdges);
    };

    self.drawLinkedDataProperties = function (/** @type {any} */ propertyId, /** @type {any} */ classIds, /** @type {{ inverse?: any; }} */ options) {
        if (!options) {
            options = {};
        }
        self.currentExpandLevel += 1;
        if (!propertyId) {
            //  propertyId = $("#lineage_linkedDataPropertiesSelect").val()
            propertyId = $("#lineage_linkedDataPropertiesTree").jstree(true).get_selected();
        }
        var source = Lineage_sources.activeSource;
        if (!source) {
            return alert("select a source");
        }
        var subjects = null;
        var objects = null;
        if (!classIds) {
            var filterType = $("#lineage_clearLinkedDataPropertiesFilterSelect").val();
            if (filterType == "graph nodes") {
                classIds = self.getGraphIdsFromSource(source);
            } else if (filterType == "filter value") {
                return alert("to be developped");
            }
        }
        if (options.inverse) {
            objects = classIds;
        } else {
            subjects = classIds;
        }
        UI.message("");
        Sparql_OWL.getFilteredTriples(source, subjects, [propertyId], objects, null, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if ($("#lineage_clearLinkedDataPropertiesCBX").prop("checked")) {
                var oldIds = Object.keys(self.currentLinkedDataProperties);
                self.lineageVisjsGraph.data.nodes.remove(oldIds);
                self.lineageVisjsGraph.data.edges.remove(oldIds);
            }

            if (err) {
                return UI.message(err);
            }
            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                Lineage_whiteboard.drawRestrictions(classIds);
                return UI.message("No data found", true);
            }
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
            var color = self.getPropertyColor(propertyId);

            result.forEach(function (item) {
                if (!item.subject) {
                    item.subject = { value: "?_" + item.prop.value };
                }
                if (!item.subjectLabel) {
                    item.subjectLabel = { value: "?" };
                }
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    visjsData.nodes.push({
                        id: item.subject.value,
                        label: item.subjectLabel.value,
                        shadow: self.nodeShadow,
                        shape: "dot",
                        level: self.currentExpandLevel,
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: "#ddd",
                        data: { source: source },
                    });
                }
                if (!item.object) {
                    item.object = { value: "?_" + item.prop.value };
                }
                if (!item.objectLabel) {
                    item.objectLabel = { value: "?" };
                }
                if (!existingNodes[item.object.value]) {
                    existingNodes[item.object.value] = 1;
                    visjsData.nodes.push({
                        id: item.object.value,
                        label: item.objectLabel.value,

                        shadow: self.nodeShadow,
                        shape: "dot",
                        level: self.currentExpandLevel,
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: "#ddd",
                        data: { source: source },
                    });
                }
                var edgeId = item.subject.value + "_" + item.object.value + "_" + item.prop.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.subject.value,
                        to: item.object.value,
                        label: "<i>" + item.propLabel.value + "</i>",
                        data: { propertyId: item.prop.value, source: source },
                        font: { multi: true, size: 10 },

                        // font: {align: "middle", ital: {color:Lineage_whiteboard.objectPropertyColor, mod: "italic", size: 10}},
                        //   physics:false,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "bar",
                                scaleFactor: 0.5,
                            },
                        },
                        //  dashes: true,
                        color: color,
                    });
                }
            });
            self.currentLinkedDataProperties = existingNodes;
            if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
                self.drawNewGraph(visjsData);
            } else {
                self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                self.lineageVisjsGraph.data.edges.add(visjsData.edges);
            }
            self.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");

            //   $("#lineage_clearLinkedDataPropertiesCBX").prop("checked",true)
        });
    };

    self.drawProperties = function (sparqlResults) {
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
        self.currentExpandLevel += 1;
        sparqlResults.forEach(function (
            /** @type {{ range: { value?: any; range?: string; }; prop: { value: string; }; rangeLabel: { value: any; }; domain: { value: any; }; propLabel: { value: string; }; }} */ item
        ) {
            if (!item.range) {
                item.range = { value: "?_" + item.prop.value };
            }
            if (!item.range.value.match(/.+:.+|http.+|_:+/)) {
                return;
            }
            if (!item.rangeLabel) {
                item.rangeLabel = { value: "?" };
            }
            if (!existingNodes[item.range.value]) {
                existingNodes[item.range.value] = 1;
                visjsData.nodes.push({
                    id: item.range.value,
                    label: item.rangeLabel.value,
                    shadow: self.nodeShadow,
                    shape: Lineage_whiteboard.defaultShape,
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: self.getSourceColor(source, item.range.value),
                    level: self.currentExpandLevel,
                    data: {
                        source: source,
                        id: item.range.value,
                        label: item.rangeLabel.value,
                        varName: "range",
                    },
                });
            }
            if (!item.domain) {
                item.domain = { value: "?" };
            }
            if (!item.range) {
                item.range = { range: "?" };
            }

            var edgeId = item.domain.value + "_" + item.range.value + "_" + item.prop.value;
            var edgeIdInv = item.range.value + "_" + item.range.value + "_" + item.prop.value;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                if (!existingNodes[edgeIdInv]) {
                    existingNodes[edgeIdInv] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        from: item.range.value,
                        to: item.domain.value,
                        label: "<i>" + item.propLabel.value + "</i>",
                        data: { propertyId: item.prop.value, source: source },
                        font: { multi: true, size: 10 },
                        // font: {align: "middle", ital: {color:Lineage_whiteboard.objectPropertyColor, mod: "italic", size: 10}},
                        //   physics:false,
                        arrows: {
                            from: {
                                enabled: true,
                                type: "bar",
                                scaleFactor: 0.5,
                            },
                        },
                        physics: physics,
                        // dashes: true,
                        // color: Lineage_whiteboard.objectPropertyColor
                    });
                }
            }
        });
        if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
            self.drawNewGraph(visjsData);
        }
        self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
        self.lineageVisjsGraph.data.edges.add(visjsData.edges);
        self.lineageVisjsGraph.network.fit();
        $("#waitImg").css("display", "none");
    };

    self.drawObjectProperties = function (/** @type {any} */ source, /** @type {string | null} */ classIds, /** @type {any} */ _descendantsAlso) {
        if (!classIds) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            if (!source) {
                return alert("select a source");
            }
            classIds = self.getGraphIdsFromSource(source);
        }
        if (classIds == "all") {
            classIds = null;
        }
        var physics = true;
        var graphSpatialisation = $("#Lineage_whiteboard_excludeRelationsFromGraphSpatializationCBX").prop("checked");
        if (excludeRelationsFromPhysic) {
            physics = false;
        }

        if (Config.sources[source].schemaType == "OWL") {
            Sparql_OWL.getObjectPropertiesDomainAndRange(
                source,
                classIds,
                {
                    withoutImports: Lineage_sources.activeSource || false,
                    addInverseRestrictions: 1,
                },
                function (/** @type {any} */ err, /** @type {any[]} */ result) {
                    if (err) {
                        return UI.message(err);
                    }
                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");

                        return UI.message("No data found", true);
                    }
                    self.drawProperties(result);
                }
            );
        }

        if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH") {
            let options = {};
            Sparql_OWL.getFilteredTriples(source, classIds, null, null, options, function (err, result) {
                if (err) {
                    return callback(err);
                }

                result.forEach(function (item) {
                    item.range = { value: item.object.value };
                    item.rangeLabel = { value: item.objectLabel.value };
                    item.domain = { value: item.subject.value };
                    item.domainLabel = { value: item.subjectLabel.value };
                    item.prop = { value: item.prop.value };
                    item.propLabel = { value: item.propLabel.value };
                });
                drawProperties(result);
            });
        }
    };
    self.drawDirectRestrictions = function (callback) {
        self.drawRestrictions(null, null, null, null, { inverse: false }, callback);
    };
    self.drawInverseRestrictions = function (callback) {
        self.drawRestrictions(null, null, null, null, { inverse: true }, callback);
    };

    self.drawPredicatesGraph = function (source, nodeIds, properties, options, callback) {
        if (!options) {
            options = {};
        }
        if (nodeIds && !Array.isArray(nodeIds)) {
            nodeIds = [nodeIds];
        }
        if (properties && !Array.isArray(properties)) {
            properties = [properties];
        }
        var filter = "";
        if ((!properties || properties.length == 0) && !options.filter) {
            filter = " FILTER( ?prop not in(rdf:type, rdfs:subClassOf,rdfs:member))";
        }
        if (!options) {
            options = {};
        }
        var subjectIds, objectIds;

        if (options.inversePredicate) {
            subjectIds = null;
            objectIds = nodeIds;
        } else {
            subjectIds = nodeIds;
            objectIds = null;
        }

        options.filter = (options.filter || "") + " " + filter;

        var data = [];
        async.series(
            [
                function (callbackSeries) {
                    if (!options.getFilteredTriples2) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getFilteredTriples2(source, subjectIds, properties, objectIds, options, function (err, result) {
                        //Sparql_OWL.getFilteredTriples(source, subjectIds, properties, objectIds, options, function(err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        if (!Lineage_whiteboard.isResultAcceptable(result)) {
                            return callbackSeries("no data found");
                        }
                        data = result;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (options.getFilteredTriples2) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getFilteredTriples(source, subjectIds, properties, objectIds, options, function (err, result) {
                        //Sparql_OWL.getFilteredTriples(source, subjectIds, properties, objectIds, options, function(err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        if (!Lineage_whiteboard.isResultAcceptable(result)) {
                            if (callback) {
                                return callback("no data found");
                            } else {
                                return callbackSeries();
                            }
                        }
                        data = result;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    Sparql_common.setSparqlResultPropertiesLabels(source, data, "prop", function (err, result2) {
                        if (err) {
                            return callback(err);
                        }
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var visjsData = { nodes: [], edges: [] };
                    var existingNodes = options.output == "table" ? {} : Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                    var color = Lineage_whiteboard.getSourceColor(source);

                    var toNodesMap = [];
                    if (data.length == 0) {
                        if (callback) {
                            return callback("no data found");
                        }
                        return UI.message("no data found", true);
                    }

                    data.forEach(function (item) {
                        if (!existingNodes[item.subject.value]) {
                            existingNodes[item.subject.value] = 1;

                            var label = item.subjectLabel ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value);
                            var shape = Lineage_whiteboard.defaultShape;
                            var size = Lineage_whiteboard.defaultShapeSize;

                            var type = item.subjectType ? item.subjectType.value : "?";
                            if (type.indexOf("NamedIndividual") > -1) {
                                shape = Lineage_whiteboard.namedIndividualShape;
                            }

                            if (item.subject.type == "bnode") {
                                label = "";
                                shape = "hexagon";
                                color = "#EEE";
                                size = 2;
                            }
                            if (type.indexOf("Property") > -1) {
                                shape = "text";
                                color = "#c3c3c3";
                            }

                            var predicateUri = options.inversePredicate ? null : item.prop.value;
                            visjsData.nodes.push(
                                VisjsUtil.getVisjsNode(source, item.subject.value, label, predicateUri, {
                                    shape: shape,
                                    color: color,
                                })
                            );
                        }
                        if (options.skipLiterals && item.object.type && item.object.type.indexOf("literal") > -1) {
                            return;
                        }
                        if (!options.OnlySubjects && !existingNodes[item.object.value]) {
                            existingNodes[item.object.value] = 1;
                            var label = "";
                            if (item.objectValue) {
                                label = item.objectValue.value.replace(/T[\d:]*Z/, "");
                            } else {
                                label = item.objectLabel ? item.objectLabel.value : Sparql_common.getLabelFromURI(item.object.value);
                            }
                            var shape = Lineage_whiteboard.defaultShape;

                            var type = item.objectType ? item.objectType.value : "?";

                            var size = Lineage_whiteboard.defaultShapeSize;
                            if (type.indexOf("NamedIndividual") > -1) {
                                shape = Lineage_whiteboard.namedIndividualShape;
                            }

                            if (item.object.type == "bnode") {
                                label = "";
                                shape = "hexagon";
                                color = "#EEE";
                                size = 2;
                            }
                            if (type.indexOf("Property") > -1) {
                                shape = "text";
                                color = "#c3c3c3";
                            }

                            var font = null;
                            if (item.object.type == "literal") {
                                shape = "text";
                                if (label.length > Config.whiteBoardMaxLabelLength) {
                                    label = label.substring(0, Config.whiteBoardMaxLabelLength) + "...";
                                }

                                font = "12px arial #3c8fe1";
                            }

                            var predicateUri = options.inversePredicate ? item.prop.value : null;

                            visjsData.nodes.push(
                                VisjsUtil.getVisjsNode(source, item.object.value, label, predicateUri, {
                                    shape: shape,
                                    color: color,
                                })
                            );
                        }
                        if (!options.OnlySubjects) {
                            var edgeId = item.subject.value + "_" + item.prop.value + "_" + item.object.value;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;

                                //specific case of equivalentClass and sameAs
                                {
                                    var nodeSource = source;
                                    var prop = item.prop.value;
                                    if (
                                        options.includeSources &&
                                        options.includeSources.length > 0 &&
                                        (prop == "http://www.w3.org/2002/07/owl#sameAs" || prop == "http://www.w3.org/2002/07/owl#equivalentClass")
                                    ) {
                                        nodeSource = options.includeSources[0];
                                    }
                                }
                                var dashes = false;
                                var edgeColor = options.edgesColor || Lineage_whiteboard.defaultPredicateEdgeColor;
                                if (item.object.type.indexOf("literal") > -1) {
                                    edgeColor = "#3c8fe1";
                                    dashes = [6, 2, 3];
                                }
                                var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.subject.value,
                                    to: item.object.value,
                                    data: {
                                        id: edgeId,
                                        type: "ObjectProperty",
                                        propLabel: propLabel,
                                        from: item.subject.value,
                                        to: item.object.value,
                                        prop: item.prop.value,
                                        source: nodeSource,
                                    },
                                    label: propLabel,
                                    font: { edgeColor },
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: "solid",
                                            scaleFactor: 0.5,
                                        },
                                    },
                                    dashes: dashes,
                                    color: edgeColor,
                                });
                            }
                        }
                    });

                    if (callback && options.returnVisjsData) {
                        return callback(null, visjsData);
                    }
                    if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                        Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
                        //Error on parameters for legend !!!!
                        // Lineage_decoration.drawLegend("individuals");
                    } else {
                        Lineage_whiteboard.drawNewGraph(visjsData, null, { legendType: "individualClasses" });
                    }

                    $("#waitImg").css("display", "none");
                    if (callback) {
                        return callback(null, visjsData);
                    }
                },
            ],
            function (err) {}
        );
    };

    self.reSpatializeGraph = function (mode) {
        var physics = true;
        if (mode == "excludeRelations") {
            physics = false;
        }
        var edges = self.lineageVisjsGraph.data.edges.get();
        var newEdges = [];
        edges.forEach(function (edge) {
            if (edge.color == Lineage_whiteboard.restrictionColor) {
                newEdges.push({ id: edge.id, physics: physics });
            }
        });

        self.lineageVisjsGraph.data.edges.update(newEdges);
    };

    self.drawRestrictions = function (source, classIds, descendants, withoutImports, options, callback) {
        if (!options) {
            options = {};
        }
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        if (!source) {
            return alert("select a source");
        }
        if (!classIds) {
            classIds = self.getGraphIdsFromSource(source);
        }
        if (classIds == "all" || options.allNodes) {
            classIds = null;
        }

        var physics = true;

        var excludeRelationsFromPhysic = $("#Lineage_whiteboard_excludeRelationsFromGraphSpatializationCBX").prop("checked");
        if (excludeRelationsFromPhysic) {
            physics = false;
        }
        UI.message("");
        var result = [];
        async.series(
            [
                function (callbackSeries) {
                    if (options.inverse) {
                        return callbackSeries();
                    }
                    options.withoutImports = Lineage_sources.activeSource || false;

                    //  var _options = { withoutImports: Lineage_sources.activeSource || false };
                    Sparql_OWL.getObjectRestrictions(source, classIds, options, function (err, _result) {
                        if (err) {
                            callbackSeries(err);
                        }
                        result = result.concat(_result);
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    if (!options.inverse) {
                        return callbackSeries();
                    }
                    options.withoutImports = Lineage_sources.activeSource || false;
                    options.inverseRestriction = 1;
                    //  var _options = { withoutImports: Lineage_sources.activeSource || false, inverseRestriction: 1 };
                    Sparql_OWL.getObjectRestrictions(source, classIds, options, function (err, _result) {
                        if (err) {
                            callbackSeries(err);
                        }
                        result = result.concat(_result);
                        callbackSeries();
                    });
                },
            ],

            function (err) {
                if (err) {
                    UI.message(err);
                    if (callback) {
                        return callback(err);
                    }
                }
                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    UI.message("No data found", true);
                    if (callback) {
                        return callback(null, result);
                    }
                }
                if (!Lineage_whiteboard.isResultAcceptable(result)) {
                    return callback("no data found");
                }
                var visjsData = { nodes: [], edges: [] };
                var existingNodes = options.output == "table" ? {} : self.lineageVisjsGraph.getExistingIdsMap();
                self.currentExpandLevel += 1;

                var restrictionSource = source;
                /*  if (!Config.sources[source].editable) {
restrictionSource = Config.predicatesSource;
}*/

                var shape = Lineage_whiteboard.defaultShape;
                result.forEach(function (
                    /** @type {{ concept: { value: string; }; conceptLabel: { value: any; }; value: { value: any; }; prop: { value: string; }; valueLabel: { value: any; }; propLabel: { value: string; }; node: { value: any; }; }} */ item
                ) {
                    if (!existingNodes[item.subject.value]) {
                        existingNodes[item.subject.value] = 1;

                        var predicateUri = options.inverse ? null : item.prop.value;

                        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.subject.value, item.subjectLabel.value, predicateUri));
                    }
                    var color;
                    var size = self.defaultShapeSize;
                    if (!item.value) {
                        color = "#ddd";
                        item.value = { value: "?_" + item.prop.value };
                        item.valueLabel = { value: "any" };
                        shape = "text";
                        size = 3;
                    } else {
                        color = self.getSourceColor(source, item.value.value);
                    }
                    if (!item.valueLabel) {
                        item.valueLabel = { value: "" };
                        size = 3;
                    }

                    if (item.propLabel.value == "sameAs") {
                        shape = "hexagon";
                        color = "#fdac00";
                    }
                    var label = item.valueLabel.value;
                    if (Config.Lineage.logicalOperatorsMap[item.prop.value]) {
                        label = Config.Lineage.logicalOperatorsMap[item.prop.value];
                        shape = "hegagon";
                        color = "#EEE";
                    }

                    if (item.value.type == "literal") {
                        shape = "text";
                        if (label.length > Config.whiteBoardMaxLabelLength) {
                            label = label.substring(0, Config.whiteBoardMaxLabelLength) + "...";
                        }
                    }

                    if (!existingNodes[item.value.value]) {
                        existingNodes[item.value.value] = 1;

                        var predicateUri = options.inverse ? item.prop.value : null;
                        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.value.value, item.valueLabel.value, predicateUri));
                    }
                    var edgeId = item.node.value; //item.value.value + "_" + item.subject.value + "_" + item.prop.value;

                    var cardinalitylabel = "";
                    if (item.cardinalityType) {
                        cardinalitylabel = common.getRestrictionCardinalityLabel(item.cardinalityType.value, item.cardinalityValue.value);
                    }

                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        if (Config.Lineage.logicalOperatorsMap[item.prop.value]) {
                            label = Config.Lineage.logicalOperatorsMap[item.prop.value];
                            shape = "hegagon";
                            color = "#EEE";
                        }
                        if (options.inverse) {
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.value.value,
                                to: item.subject.value,
                                //  label: "<i>" + item.propLabel.value + "</i>",
                                label: cardinalitylabel + " " + item.propLabel.value,
                                font: { color: options.edgesColor || Lineage_whiteboard.restrictionColor },
                                data: {
                                    propertyId: item.prop.value,
                                    bNodeId: item.node.value,
                                    source: restrictionSource,
                                    propertyLabel: item.propLabel.value,
                                    subClassId: item.value.value,
                                },

                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: "solid",
                                        scaleFactor: 0.5,
                                    },
                                },
                                // dashes: true,
                                color: options.edgesColor || Lineage_whiteboard.restrictionColor,
                                physics: physics,
                            });
                        } else if (!options.inverse) {
                            visjsData.edges.push({
                                id: edgeId,
                                to: item.value.value,
                                from: item.subject.value,
                                //  label: "<i>" + item.propLabel.value + "</i>",
                                label: item.propLabel.value,
                                font: { color: options.edgesColor || Lineage_whiteboard.restrictionColor },
                                data: {
                                    propertyId: item.prop.value,
                                    bNodeId: item.node.value,
                                    source: restrictionSource,
                                    propertyLabel: item.propLabel.value,
                                    subClassId: item.subject.value,
                                },

                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "solid",
                                        scaleFactor: 0.5,
                                    },
                                },
                                dashes: true,
                                color: options.edgesColor || Lineage_whiteboard.restrictionColor,
                                physics: physics,
                            });
                        }
                    }
                });
                if (callback && options.returnVisjsData) {
                    return callback(null, visjsData);
                }
                if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
                    self.drawNewGraph(visjsData);
                } else {
                    self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                    self.lineageVisjsGraph.data.edges.add(visjsData.edges);
                    self.lineageVisjsGraph.network.fit();
                }

                $("#waitImg").css("display", "none");

                if (options.processorFn) {
                    options.processorFn(result);
                }

                if (callback) {
                    return callback(null, result);
                }
            }
        );
    };

    self.drawDictionarySameAs = function () {
        /**
         * @param {any[]} restrictionNodes
         */
        function processMetadata(restrictionNodes) {
            var restrictionIds = [];
            restrictionNodes.forEach(function (/** @type {{ node: { id: any; }; }} */ bNode) {
                restrictionIds.push(bNode.node.id);
            });
        }

        var existingNodes = self.lineageVisjsGraph.data.nodes.getIds();
        var options = {
            processorFn: processMetadata,
            filter: " FILTER (?prop in <http://www.w3.org/2002/07/owl#sameAs>) ",
        };
        self.drawRestrictions(Config.dictionarySource, existingNodes, false, false, options);
    };

    self.drawNamedLinkedData = function (/** @type {any[]} */ classIds) {
        var source = Lineage_sources.activeSource;
        if (!source) {
            return alert("select a source");
        }
        if (!classIds) {
            classIds = self.getGraphIdsFromSource(source);
        }
        UI.message("");

        Sparql_OWL.getNamedLinkedData(source, classIds, null, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if (err) {
                return UI.message(err);
            }
            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                return UI.message("No data found", true);
            }
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
            var color = self.getSourceColor(source);
            //  console.log(JSON.stringify(result, null, 2))

            if (!Array.isArray(classIds)) {
                classIds = [classIds];
            }
            result.forEach(function (/** @type {{ node: { value: string; }; nodeLabel: { value: any; }; concept: { value: string; }; conceptLabel: { value: any; }; }} */ item) {
                if (!existingNodes[item.node.value]) {
                    existingNodes[item.node.value] = 1;
                    visjsData.nodes.push({
                        id: item.node.value,
                        label: item.nodeLabel.value,
                        shadow: self.nodeShadow,
                        shape: Lineage_whiteboard.namedIndividualShape,
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: color,
                        data: {
                            source: source,
                            id: item.node.value,
                            label: item.nodeLabel.value,
                            varName: "class",
                        },
                    });
                }

                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    visjsData.nodes.push({
                        id: item.subject.value,
                        label: item.subjectLabel.value,
                        shadow: self.nodeShadow,
                        shape: Lineage_whiteboard.namedIndividualShape,
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: color,
                        data: {
                            source: source,
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            varName: "value",
                            type: "NamedIndividual",
                        },
                    });
                }
                var edgeId = item.subject.value + "_" + item.node.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.subject.value,
                        to: item.node.value,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "solid",
                                scaleFactor: 0.5,
                            },
                        },
                        color: Lineage_whiteboard.namedIndividualColor,
                    });
                }
            });

            self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            self.lineageVisjsGraph.data.edges.add(visjsData.edges);
            self.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        });
    };

    self.collapseNode = function (/** @type {any} */ nodeId) {
        if (nodeId) {
            var children = self.lineageVisjsGraph.network.getConnectedNodes(nodeId, "from");
            self.lineageVisjsGraph.data.nodes.remove(children);
        }
    };

    self.setGraphPopupMenus = function (node, event) {
        if (!node || !node.data) {
            return;
        }
        graphContext.clickOptions = event;
        var html = "";

        if (node.id && node.id.indexOf("_cluster") > 0) {
            html = "";
            if (node.data.cluster.length <= Lineage_whiteboard.showLimit) {
                html = '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.openCluster();"> Open cluster</span>';
            }
            html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.listClusterContent();"> list cluster content</span>';
            html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.listClusterToClipboard();"> list to clipboard</span>';
        } else if (node.from && node.data.bNodeId) {
            html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.showPropertyInfos();"> restriction Infos</span>';
            html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.showRestrictionPropertyNodeInfos();"> property Infos</span>';
            if (Lineage_sources.isSourceEditableForUser(node.data.source)) {
                //   if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[node.data.source] && Config.sources[node.data.source].editable) {
                html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.deleteRestriction();"> Delete relation</span>';
            }
        } else if (node.from && node.data.type == "ObjectProperty") {
            html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.showPropertyInfos();"> Property Infos</span>';
            if (Lineage_sources.isSourceEditableForUser(node.data.source)) {
                html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.deleteObjectProperty();"> Delete relation</span>';
            }
        } else if (false && node.data && node.data.type == "NamedIndividual") {
            html =
                '    <span  class="popupMenuItem" onclick="Lineage_linkedData.graphActions.showIndividualInfos();"> Node infos</span>' +
                '<span  class="popupMenuItem" onclick="Lineage_linkedData.graphActions.expandIndividual();"> Expand individual</span>';
            // '<span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.expandIndividual();"> Expand individual</span>';
        } else if (node.data && node.data.context == Lineage_linkedData_mappings.context) {
            html = "...";
            // '<span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.expandIndividual();"> Expand individual</span>';
        } else if (node.data && node.data.graphPopupMenusFn) {
            html = node.data.graphPopupMenusFn();
        } else {
            html =
                '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.showNodeInfos();"> Node infos</span>' +
                ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.showAxioms();"> Axioms</span>' +
                '   <span  id=\'lineage_graphPopupMenuItem\' class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.expand();"> Expand</span>' +
                '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.drawParents();"> Parents</span>';

            if (node.data && node.data.type == "container") {
                html += '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.pasteNodeIntoContainer();"> past intoToContainer</span>';
            } else {
                html +=
                    '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.drawSimilars();"> Similars</span>' +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.collapse();">Collapse</span>' +
                    '    <span  class="popupMenuItem" onclick="NodeRelations_bot.start();">Relations...</span>' +
                    // '    <span  class="popupMenuItem" onclick="Lineage_relations.showDrawRelationsDialog(\'Graph\');">Relations...</span>' +
                    //  "   <span  class=\"popupMenuItem\" onclick=\"Lineage_relations.drawRelations('direct',null,'Graph');\">Relations</span>" +
                    //   "    <span  class=\"popupMenuItem\" onclick=\"Lineage_relations.drawRelations('inverse',null,'Graph');\">Inverse Rels</span>" +
                    //  "    <span  class=\"popupMenuItem\" onclick=\"Lineage_whiteboard.graphActions.graphNodeNeighborhood('all');\">ObjectProperties</span>" +
                    //   "    <span  class=\"popupMenuItem\" onclick=\"Lineage_whiteboard.graphActions.showRestrictions();\">Restrictions</span>" +
                    //   "  <span  class=\"popupMenuItem\" onclick=\"Lineage_whiteboard.graphActions.showRestrictions();\">Inv Restr</span>" +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.hideShowOthers();">Hide/show others</span>' +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.removeFromGraph();">Remove from graph</span>' +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.removeOthersFromGraph();">Remove others</span>';
            }
        }

        $("#popupMenuWidgetDiv").html(html);
    };

    self.zoomGraphOnNode = function (/** @type {any} */ nodeId, changeSise) {
        var nodes = self.lineageVisjsGraph.data.nodes.getIds();
        if (nodes.indexOf(nodeId) < 0) {
            return;
        }
        self.lineageVisjsGraph.network.focus(nodeId, {
            scale: 1,
            locked: false,
            animation: true,
        });

        /**
         * @type {{ id: any; size: any; shadow: any; shape: any; font: { color: string; }; }[]}
         */
        var newNodes = [];
        nodes = self.lineageVisjsGraph.data.nodes.get();
        nodes.forEach(function (/** @type {{ data: { initialParams: { size: any; shape: any; shadow?: any; }; }; shape: any; size: any; id: any; }} */ node) {
            if (!node.data) {
                return;
            }
            //  if (!node.data.initialParams) {
            node.data.initialParams = {
                shadow: self.nodeShadow,
                shape: node.shape,
                size: node.size,
            };
            //   }
            var size, shape;
            var font = { color: self.defaultNodeFontColor };
            if (node.id == nodeId) {
                size = node.data.initialParams.size * 2;
                //  shape = "hexagon";
                font = { color: "red" };
            } else {
                size = node.data.initialParams.size;
                shape = node.data.initialParams.shape;
            }
            newNodes.push({ id: node.id, size: size, shadow: self.nodeShadow, font: font });
            newNodes.push({ id: node.id, opacity: 1 });
        });
        self.lineageVisjsGraph.data.nodes.update(newNodes);
    };
    /**
     * draws nodes and parents
     *
     * @param node (with data id and source
     * @param ancestorsDepth
     * @param options
     * @param callback
     * @returns {void|*}
     */
    self.drawNodesAndParents = function (nodes, ancestorsDepth, options, callback) {
        if (!options) {
            options = {};
        }
        var source = Lineage_sources.activeSource;
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }

        var nodeIds = [];

        nodes.forEach(function (node) {
            nodeIds.push(node.data.id);
        });

        var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
        if (existingNodes[nodes[0].data.id]) {
            return self.zoomGraphOnNode(nodes[0].data.id);
        }

        UI.message("");

        /* if (ancestorsDepth != 0) {
            ancestorsDepth = 5;
        }*/
        var memberPredicate = false;
        if (nodes[0].data.type == "container") {
            memberPredicate = true;
        }

        // manage draw node from outer source
        if (nodes.length == 1 && nodes[0].data && nodes[0].data.source) {
            source = nodes[0].data.source;
        }

        var queryOptions = { skipRestrictions: 1, memberPredicate: memberPredicate, excludeType: 1, selectGraph: true };
        Sparql_generic.getNodeParents(source, null, nodeIds, ancestorsDepth, queryOptions, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return UI.message(err);
            }
            if (result.length == 0) {
                if (callback) {
                    return callback("No data found");
                }
                $("#waitImg").css("display", "none");
                return UI.message("No data found", true);
            }

            var visjsData = { nodes: [], edges: [] };
            var color = self.getSourceColor(source);
            var newNodeIds = [];

            var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();

            var conceptType = "Class";
            result.forEach(function (item) {
                //if (item.subjectType && item.subjectType.value.indexOf("NamedIndividual") > -1) {
                if (item.subjectTypes && item.subjectTypes.value.indexOf("NamedIndividual") > -1) {
                    conceptType = "NamedIndividual";
                }
            });

            result.forEach(function (/** @type {{ [x: string]: { value: any; }; concept: { value: string | number; }; conceptLabel: { value: any; }; }} */ item) {
                var shape = conceptType == "NamedIndividual" ? self.namedIndividualShape : self.defaultShape;
                if (options.shape) {
                    shape = options.shape;
                }
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    // add  rdfType for legend, need to homegenize rdfType and type parameters for nodes line 1563
                    visjsData.nodes.push({
                        id: item.subject.value,
                        label: item.subjectLabel.value,
                        data: {
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            source: source,
                            type: conceptType,
                            rdfType: conceptType,
                        },
                        shadow: self.nodeShadow,
                        level: options.startLevel || 0,
                        shape: shape,
                        color: self.getSourceColor(source, item.subject.value),
                        size: Lineage_whiteboard.defaultShapeSize,
                    });
                }
                newNodeIds.push(item.subject.value);

                var edgeId;
                for (var i = 1; i < ancestorsDepth; i++) {
                    if (item["broader" + i]) {
                        var broader = item["broader" + i];
                        if (broader && (broader.value.indexOf("_:b") > -1 || broader.value.indexOf("#Class") > -1 || broader.value.indexOf("#NamedIndividual") > -1)) {
                            continue;
                        }

                        if (!existingNodes[broader.value]) {
                            existingNodes[item["broader" + i].value] = 1;
                            visjsData.nodes.push({
                                id: broader.value,
                                label: item["broader" + i + "Label"].value,
                                data: {
                                    source: source,
                                    label: item["broader" + i + "Label"].value,
                                    id: broader.value,
                                },
                                shadow: self.nodeShadow,
                                shape: options.shape || Lineage_whiteboard.defaultShape,
                                color: color,
                                level: (options.startLevel || 0) - i,
                                size: Lineage_whiteboard.defaultShapeSize,
                            });
                            newNodeIds.push(broader.value);
                            var fromId;
                            if (i == 1) {
                                fromId = item.subject.value;
                            } else {
                                fromId = item["broader" + (i - 1)].value;
                            }

                            edgeId = fromId + "_" + broader.value;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: broader.value,
                                    to: fromId,
                                    data: { source: source },
                                    color: Lineage_whiteboard.defaultEdgeColor,
                                    arrows: {
                                        from: {
                                            enabled: true,
                                            type: Lineage_whiteboard.defaultEdgeArrowType,
                                            scaleFactor: 0.5,
                                        },
                                    },
                                });
                            }
                        } else {
                            //join an existing node
                            if (i == 1) {
                                fromId = item.subject.value;
                            } else {
                                fromId = item["broader" + (i - 1)].value;
                            }

                            edgeId = fromId + "_" + item["broader" + i].value;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: fromId,
                                    to: item["broader" + i].value,
                                    data: { source: source },
                                    color: Lineage_whiteboard.defaultEdgeColor,
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: Lineage_whiteboard.defaultEdgeArrowType,
                                            scaleFactor: 0.5,
                                        },
                                    },
                                });
                            }
                            break;
                        }
                    }
                }
            });

            existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
            if (!existingNodes[source]) {
                visjsData.nodes.forEach(function (_item) {
                    // pass
                });
            }
            if (!options) {
                options = {};
            }
            if (callback) {
                if (!options.drawBeforeCallback) {
                    return callback(null, visjsData);
                }
            }

            //Lineage_sources.registerSource(source);

            if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
                self.drawNewGraph(visjsData, null, options);
            } else {
                self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                self.lineageVisjsGraph.data.edges.add(visjsData.edges);
            }

            /*  setTimeout(function () {
self.zoomGraphOnNode(node.data[0].id, false);
}, 500);*/
            UI.message("", true);
            if (callback) {
                return callback(null, visjsData);
            }
        });
    };

    self.drawInferredClassesModel = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        KGquery_graph.getInferredModelVisjsData(source, function (err, visjsData) {
            if (err) {
                return alert(err.responseText);
            }
            if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
                Lineage_whiteboard.drawNewGraph(visjsData);
            } else {
                self.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                self.lineageVisjsGraph.data.edges.update(visjsData.edges);
            }

            $("#waitImg").css("display", "none");
        });
    };

    self.graphActions = {
        showGraphPopupMenu: function (/** @type {{ from: any; }} */ node, /** @type {any} */ point, /** @type {any} */ event) {
            if (node.from) {
                self.currentGraphEdge = node;
                self.currentGraphNode = null;
                point = {};
                point.x = event.x;
                point.y = event.y;
                if (true) {
                    //   if (!self.currentGraphEdge.data || !self.currentGraphEdge.data.propertyId) return;
                    self.setGraphPopupMenus(node, event);
                    PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
                }
                //NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge.data.propertyId, "mainDialogDiv", { resetVisited: 1 });
            } else {
                self.setGraphPopupMenus(node, event);
                self.currentGraphNode = node;
                self.currentGraphEdge = null;
                //start
                point = {};
                point.x = event.x;
                point.y = event.y;
                //end
                PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
            }
        },

        onNodeClick: function (/** @type {{ data: { cluster: any; }; }} */ node, /** @type {any} */ point, /** @type {{ dbleClick: any; }} */ options) {
            if (!node) {
                PopupMenuWidget.hidePopup("popupMenuWidgetDiv");

                return;
            }

            if (node.from) {
                self.currentGraphEdge = node;
            } else {
                self.currentGraphNode = node;
            }

            self.onGraphOrTreeNodeClick(node, options, { callee: "Graph" });

            if (options.dbleClick) {
                if (node.data.cluster) {
                    Lineage_whiteboard.openCluster(self.currentGraphNode);
                } else {
                    Lineage_whiteboard.addChildrenToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id]);
                }
            }
        },

        expand: function () {
            var dontClusterNodes = false;
            var depth = 1;
            if (graphContext.clickOptions.ctrlKey) {
                depth = 2;
                dontClusterNodes = true;
            }
            if (graphContext.clickOptions.ctrlKey && graphContext.clickOptions.altKey) {
                depth = 3;
            }
            var memberPredicate = self.currentGraphNode.data.type == "container";

            Lineage_whiteboard.addChildrenToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id], {
                depth: depth,
                dontClusterNodes: dontClusterNodes,
                memberPredicate: memberPredicate,
            });
        },
        drawParents: function () {
            if (!self.currentGraphNode) {
                return;
            }
            var memberPredicate = false;
            if (self.currentGraphNode.data) {
                memberPredicate = self.currentGraphNode.data.type == "container";
            }
            Lineage_whiteboard.addNodesAndParentsToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id], { memberPredicate: memberPredicate });
        },

        drawSimilars: function () {
            if (!self.currentGraphNode) {
                return;
            }
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_whiteboard.drawSimilarsNodes("label", self.currentGraphNode.data.source, self.currentGraphNode.id, descendantsAlso);
        },
        collapse: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.collapseNode(self.currentGraphNode.id);
        },
        openCluster: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.openCluster(self.currentGraphNode);
        },
        listClusterToClipboard: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.listClusterToClipboard(self.currentGraphNode);
        },
        listClusterContent: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.listClusterContent(self.currentGraphNode);
        },

        showNodeInfos: function () {
            if (self.currentGraphNode) {
                NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
            } else if (self.currentGraphEdge) {
                NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge, "mainDialogDiv");
            }
        },
        showRestrictionPropertyNodeInfos:function(){
            NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge?.data?.propertyId, "mainDialogDiv");
        },
        showAxioms: function () {
            if (self.currentGraphNode) {
                $("#mainDialogDiv").dialog("option", "title", "Axioms of resource " + self.currentGraphNode.data.label);

                NodeInfosAxioms.init(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
            }
        },
        showPropertyInfos: function (hideModifyButtons) {
            NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge, "mainDialogDiv", { hideModifyButtons: hideModifyButtons });
        },

        showRestrictionInfos: function (hideModifyButtons) {
            NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge, "mainDialogDiv", { hideModifyButtons: hideModifyButtons });
        },

        expandIndividual: function () {
            var source = Lineage_sources.activeSource;
            var filter = "?subject ?p2 <" + self.currentGraphNode.data.id + ">. ";
            Sparql_OWL.getItems(self.currentGraphNode.data.source, { filter: filter }, function (err, result) {
                if (err) {
                    return UI.message(err.responseText);
                }
                var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
                var visjsData = { nodes: [], edges: [] };
                var color = self.getSourceColor(source);
                result.forEach(function (item) {
                    if (!existingNodes[item.subject.value]) {
                        existingNodes[item.subject.value] = 1;
                        var label = item.subjectLabel ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value);

                        visjsData.nodes.push({
                            id: item.subject.value,
                            label: label,
                            shadow: self.nodeShadow,
                            shape: self.namedIndividualShape,
                            size: self.defaultShapeSize,
                            level: self.currentExpandLevel,
                            color: color,

                            data: {
                                id: item.subject.value,
                                label: label,
                                source: source,
                                type: "NamedIndividual",
                            },
                        });

                        var edgeId = item.subject.value + "_" + self.currentGraphNode.id;
                        visjsData.edges.push({
                            id: edgeId,
                            to: self.currentGraphNode.id,
                            from: item.subject.value,
                            color: color,
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                            data: {
                                id: edgeId,
                                to: self.currentGraphNode.id,
                                from: item.subject.value,
                                type: "partOf",
                                source: source,
                            },
                        });
                    }
                });

                self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                self.lineageVisjsGraph.data.edges.add(visjsData.edges);
            });
        },

        pasteNodeIntoContainer: function () {
            if (SearchWidget.currentTreeNode) {
                Containers_tree.pasteNodeIntoContainer(Lineage_sources.activeSource, self.currentGraphNode);
            }
        },
        graphNodeNeighborhood: function (/** @type {any} */ filter) {
            Lineage_whiteboard.graphNodeNeighborhood(self.currentGraphNode.data, filter);
        },
        graphNodeNeighborhoodUI: function () {
            var html = ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.graphNodeNeighborhood(\'incoming\');">incoming</span>';
            html += ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.graphNodeNeighborhood(\'outcoming\');">outcoming</span>';
            html += ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.graphNodeNeighborhood(\'ranges\');">ranges</span>';

            $("#popupMenuWidgetDiv").html(html);
            setTimeout(function () {
                $("#popupMenuWidgetDiv").css("display", "flex");
            }, 100);
        },
        removeFromGraph: function () {
            self.lineageVisjsGraph.removeNodes("id", Lineage_whiteboard.currentGraphNode.id, true);
        },
        removeOthersFromGraph: function () {
            if (!Lineage_whiteboard.currentGraphNode.id) {
                return;
            }
            self.lineageVisjsGraph.removeOtherNodesFromGraph(Lineage_whiteboard.currentGraphNode.id);
        },
        showObjectProperties: function () {
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_whiteboard.drawObjectProperties(self.currentGraphNode.data.source, [self.currentGraphNode.id], descendantsAlso);
        },
        showRestrictions: function () {
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_whiteboard.drawRestrictions(self.currentGraphNode.data.source, self.currentGraphNode.data.id, descendantsAlso);
        },
        deleteRestriction: function () {
            var edge = self.currentGraphEdge;
            if (edge.data.bNodeId) {
                //restriction
                if (confirm("delete selected relation ?")) {
                    Lineage_createRelation.deleteRestriction(edge.data.source, edge, function (err, result) {
                        if (err) {
                            return alert(err.responseText);
                        }
                        self.lineageVisjsGraph.data.edges.remove(edge.id);
                    });
                }
            }
        },
        deleteObjectProperty: function () {
            var edge = self.currentGraphEdge;

            if (confirm("Delete object property " + edge.data.propLabel)) {
                Sparql_generic.deleteTriples(edge.data.source, edge.data.from, edge.data.prop, edge.data.to, function (err, _result) {
                    if (err) {
                        return alert(err.responseText);
                    }
                    self.lineageVisjsGraph.data.edges.remove(edge.id);
                });
            }
        },

        createSubPropertyAndreplaceRelation: function () {
            var edge = self.currentGraphEdge;

            if (edge.data && edge.data.bNodeId) {
                //restriction
                var subPropertyLabel = prompt("enter label for subProperty of property " + edge.data.propertyLabel);
                if (!subPropertyLabel) {
                    return;
                }
                Lineage_createRelation.createSubProperty(Lineage_sources.activeSource, edge.data.propertyId, subPropertyLabel, true, function (err, result) {
                    if (err) {
                        return alert(err);
                    }

                    var subPropertyId = result.uri;
                    var sourceVisjsNode = self.lineageVisjsGraph.data.nodes.get(edge.to);
                    var targetVisjsNode = self.lineageVisjsGraph.data.nodes.get(edge.from);
                    var sourceNode = { id: sourceVisjsNode.data.id, source: sourceVisjsNode.data.source };
                    var targetNode = { id: targetVisjsNode.data.id, source: targetVisjsNode.data.source };

                    if (!Lineage_createRelation.currentSpecificObjectPropertiesMap) {
                        Lineage_createRelation.currentSpecificObjectPropertiesMap = {};
                    }
                    if (!Lineage_createRelation.currentSpecificObjectPropertiesMap[edge.data.propertyId]) {
                        Lineage_createRelation.currentSpecificObjectPropertiesMap[edge.data.propertyId] = [];
                    }
                    Lineage_createRelation.currentSpecificObjectPropertiesMap[item.superProp.value].push({
                        id: subPropertyId,
                        label: subPropertyLabel,
                    });

                    Lineage_createRelation.createRelation(Lineage_sources.activeSource, subPropertyId, sourceNode, targetNode, true, true, {}, function (err, _result) {
                        if (err) {
                            alert(err);
                        }
                        Lineage_createRelation.deleteRestriction(Lineage_sources.activeSource, self.currentGraphEdge, function (err) {
                            if (err) {
                                alert(err);
                            }
                        });
                        UI.message("relation replaced", true);
                        self.lineageVisjsGraph.data.edges.remove(edge.id);
                    });
                });
            } else {
                //simple predicate
                var sourceVisjsNode = self.lineageVisjsGraph.data.nodes.get(edge.from);
                var targetVisjsNode = self.lineageVisjsGraph.data.nodes.get(edge.to);
            }
        },
        showLinkedData: function () {
            Lineage_linkedData.showLinkedDataPanel(self.currentGraphNode);
            //Lineage_whiteboard.drawNamedLinkedData([self.currentGraphNode.id]);
        },

        hideShowOthers: function () {
            var node0 = self.currentGraphNode.id;
            var nodes = self.lineageVisjsGraph.data.nodes.getIds();
            var newNodes = [];
            if (!self.hideOthers) {
                self.hideOthers = true;

                nodes.forEach(function (nodeId) {
                    if (node0 != nodeId) {
                        newNodes.push({ id: nodeId, hidden: true });
                    }
                });
            } else {
                self.hideOthers = false;
                nodes.forEach(function (nodeId) {
                    newNodes.push({ id: nodeId, hidden: false });
                });
            }
            self.lineageVisjsGraph.data.nodes.update(newNodes);
        },
    };

    self.getSourceColor = function (source, nodeId, palette) {
        if (!palette) {
            palette = "paletteIntense";
        }

        if (nodeId) {
            for (var graphUri in self.sourcesGraphUriMap) {
                if (nodeId.indexOf(graphUri) == 0) {
                    var color = self.getSourceColor(self.sourcesGraphUriMap[graphUri].name);
                    return color;
                }
            }
        }

        if (source && !sourceColors[source]) {
            sourceColors[source] = common[palette][Object.keys(sourceColors).length];
        }
        return sourceColors[source];
    };

    self.getPropertyColor = function (/** @type {string | number} */ propertyName, /** @type {string} */ palette) {
        if (!palette) {
            palette = "paletteIntense";
        }
        if (!self.propertyColors[propertyName]) {
            self.propertyColors[propertyName] = common[palette][Object.keys(self.propertyColors).length];
        }
        return self.propertyColors[propertyName];
    };

    self.getNodeVisjAttrs = function (type, superClass, source) {
        var attrs = {
            shape: self.defaultShape,
            color: "blue",
        };
        var typeValue = type ? (type.value ? type.value : type) : null;
        var superClassValue = superClass ? (superClass.value ? superClass.value : superClass) : null;
        var sourceValue = source ? (source.value ? source.value : source) : null;

        if (typeValue && typeValue.indexOf("NamedIndividual") > -1) {
            attrs.shape = self.namedIndividualShape;
        }
        /* if(superClassValue){
attrs.color=self.getSourceColor(superClassValue)
}else */
        if (sourceValue && sourceValue) {
            attrs.color = self.getSourceColor(sourceValue);
        }
        return attrs;
    };

    self.showHideHelp = function () {
        var display = $("#lineage_actionDiv_Keyslegend").css("display");
        if (display == "none") {
            display = "block";
        } else {
            display = "none";
        }
        $("#lineage_actionDiv_Keyslegend").css("display", display);
    };

    self.showWikiPage = function (sourceLabel) {
        var wikiUrl = Config.wiki.url + "Source " + sourceLabel;
        window.open(wikiUrl, "_slsvWiki");
    };

    self.showEdgesLegend = function () {
        var edges = self.lineageVisjsGraph.data.edges.get();
        var newEdges = [];
        var distinctEdgeLabels = {};
        edges.forEach(function (edge) {
            if (edge.label) {
                if (!distinctEdgeLabels[edge.label]) {
                    var color = Lineage_whiteboard.getPropertyColor(edge.label);
                    distinctEdgeLabels[edge.label] = { color: color };
                    newEdges.push({ id: edge.id, color: color, label: null });
                }
            }
        });

        var html = "";
        for (var key in distinctEdgeLabels) {
            html += "&nbsp;<span style='color:" + distinctEdgeLabels[key].color + "'>" + key + "</span>";
        }
        self.lineageVisjsGraph.data.edges.update(newEdges);

        $(".vis-manipulation").html(html);
    };

    self.copyNode = function (event, node) {
        if (!node) {
            node = self.currentTreeNode;
        }
        if (!node) {
            node = self.currentGraphNode;
        }
        if (!node) {
            return;
        }

        self.currentCopiedNode = node;
        Clipboard.copy(
            {
                type: "node",
                id: node.data.id,
                label: node.data.label,
                source: node.data.source,
                data: node.data,
            }
            //  self.currentTreeNode.id + "_anchor"
        );
    };

    self.graph = {
        searchNode: function (id, word) {
            self.lineageVisjsGraph.searchNode(id, word);
        },
        setLayout: function (layout) {
            self.lineageVisjsGraph.setLayout();
        },
        showGraphConfig: function () {
            self.lineageVisjsGraph.showGraphConfig();
        },
        toSVG: function () {
            self.lineageVisjsGraph.toSVG();
        },
        toGraphMl: function () {
            self.lineageVisjsGraph.toGraphMl();
        },
        exportGraphToDataTable: function () {
            Export.exportGraphToDataTable(self.lineageVisjsGraph);
        },

        saveWhiteboard: function () {
            var visjsFileName = prompt("file name");
            if (!visjsFileName) {
                return;
            }
            Lineage_whiteboard.lineageVisjsGraph.saveGraph(visjsFileName);
        },
        loadSavedGraph: function () {
            var visjsFileName = prompt("file name");
            if (!visjsFileName) {
                return;
            }
            try {
                Lineage_whiteboard.lineageVisjsGraph.loadGraph(visjsFileName, false, function (err, visjsData) {
                    if (err) {
                        return alert(err.responseText || err);
                    }
                    Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
                });
            } catch (e) {
                alert("file not found");
            }
        },
    };

    self.initWhiteboardTab = function () {
        if ($("#whiteboardTab").children().length == 0) {
            $("#whiteboardTab").load("./modules/tools/lineage/html/whiteboardTab.html", function (s) {
                $("#WhiteboardTabButton").addClass("slsv-tabButtonSelected");
                $("#WhiteboardTabButton").parent().addClass("slsv-selectedTabDiv");
                Lineage_sources.showHideEditButtons(Lineage_sources.activeSource);
                Lineage_whiteboard.hideShowMoreActions("hide");

                if (window.location.href.indexOf("localhost") < 0) {
                    $("#lineage_actionDiv_newAxiom").css("display", "none");
                }

                $("#lateralPanelDiv").resizable({
                    maxWidth: $(window).width() - 100,
                    minWidth: 150,
                    stop: function (event, ui) {
                        UI.resetWindowHeight();
                    },
                });
            });
        }
    };

    self.initClassesTab = function () {
        if ($("#classesTab").children().length == 0) {
            $("#classesTab").load("./modules/tools//lineage/html/classesTab.html", function (s) {
                SearchWidget.targetDiv = "LineageNodesJsTreeDiv";
                //$("#GenericTools_searchAllDiv").load("./snippets/searchAllResponsive.html", function () {
                //SearchWidget.init();
                $("#GenericTools_searchInAllSources").prop("checked", false);
                $("#Lineage_MoreClassesOptions").hide();
                //SearchWidget.showTopConcepts();
                self.hideShowMoreOptions("show", "Lineage_MoreClassesOptions");
                /*
                    $("#lateralPanelDiv").resizable({
                        maxWidth: 435,
                        minWidth: 150,
                        stop: function (event, ui) {
                            UI.resetWindowHeight();
                        },
                    });*/
                //});
            });
        }
    };
    self.initPropertiesTab = function () {
        if ($("#propertiesTab").children().length == 0) {
            $("#propertiesTab").load("./modules/tools/lineage/html/propertiesTab.html", function (s) {
                Lineage_whiteboard.hideShowMoreOptions("hide", "Lineage_MorePropertiesOptions");
                Lineage_properties.searchTermInSources();
                self.hideShowMoreOptions("show", "Lineage_MorePropertiesOptions");
            });
        }
    };
    self.initContainersTab = function () {
        if ($("#containersTab").children().length == 0) {
            $("#containersTab").load("./modules/tools//lineage/html/containersTab.html", function (s) {
                Containers_tree.search("lineage_containers_containersJstree");
            });
        }
    };

    self.resetCurrentTab = function () {
        var currentTab = $(".slsv-tabButtonSelected").parent().attr("title");
        if (currentTab == "Classes") {
            SearchWidget.showTopConcepts();
        }
        if (currentTab == "Properties") {
            Lineage_properties.searchTermInSources();
        }
        if (currentTab == "Containers") {
            Containers_tree.search("lineage_containers_containersJstree");
        }
    };
    self.hideShowMoreActions = function (hideShowParameter) {
        if (hideShowParameter == "hide") {
            self.MoreActionsShow = true;
        }
        if (hideShowParameter == "show") {
            self.MoreActionsShow = false;
        }
        if (!self.MoreActionsShow) {
            $("#Lineage_MoreActionsButtons").show();
            self.MoreActionsShow = true;
            $("#Lineage_MoreActionsSection").removeClass("TitleBoxLine");
        } else {
            $("#Lineage_MoreActionsButtons").hide();
            self.MoreActionsShow = false;
            $("#Lineage_MoreActionsSection").addClass("TitleBoxLine");
        }
    };
    self.hideShowMoreOptions = function (hideShowParameter, divId) {
        if (hideShowParameter == "hide") {
            self.MoreOptionsShow[divId] = false;
        }
        if (hideShowParameter == "show") {
            self.MoreOptionsShow[divId] = true;
        }
        if (self.MoreOptionsShow[divId] || self.MoreOptionsShow[divId] == undefined) {
            $("#" + divId).show();
            self.MoreOptionsShow[divId] = false;
        } else {
            $("#" + divId).hide();
            self.MoreOptionsShow[divId] = true;
        }
    };
    self.loadDecorationData = function (sourceLabel) {
        var visjsGraphFileName = sourceLabel + "_decoration.json";
        var payload = {
            dir: "graphs/",
            fileName: visjsGraphFileName,
        };
        //get decoration file
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                var data = JSON.parse(result);
                if (Object.keys(data).length > 0) {
                    self.decorationData[sourceLabel] = data;
                }
            },
            error(err) {},
        });
    };

    return self;
})();

export default Lineage_whiteboard;

window.Lineage_whiteboard = Lineage_whiteboard;
