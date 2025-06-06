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
import UserDataWidget from "../../uiWidgets/userDataWidget.js";
import Containers_tree from "../containers/containers_tree.js";
import Export from "../../shared/export.js";
import Lineage_nodeCentricGraph from "./lineage_nodeCentricGraph.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @module Lineage_whiteboard
 
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
    self.restrictionColor = "#efbf00"; //"#fdbf01";
    self.restrictionFontSize = 8;
    self.restrictionEdgeWidth = 1;
    self.namedIndividualShape = "triangle";
    self.namedIndividualColor = "#0067bb";
    self.defaultNodeFontColor = "#343434";
    self.defaultEdgeFontColor = "#343434";
    self.defaultLowOpacity = 1.0;
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

    self.firstLoad = true;

    /**
     * @function
     * @name onLoaded
     * @memberof module:Lineage_whiteboard
     * Initializes the Lineage whiteboard module when loaded.
     * Sets up the search widget, initializes the UI menu bar, and loads necessary components.
     * Also resets the visualization graph for a fresh start.
     * @returns {void}
     */
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

        self.resetVisjsGraph();
        $("#rightControlPanelDiv").load("./modules/tools/lineage/html/whiteBoardButtons.html", function () {
            UI.resetWindowSize();
        });
    };

    /**
     * @function
     * @name unload
     * @memberof module:Lineage_whiteboard
     * Unloads the Lineage whiteboard by clearing the graph display and resetting the lateral panel.
     * @returns {void}
     */
    self.unload = function () {
        $("#graphDiv").empty();
        $("#lateralPanelDiv").resizable("destroy");
        $("#lateralPanelDiv").css("width", "435px");
    };

    /**
     * @function
     * @name resetVisjsGraph
     * @memberof module:Lineage_whiteboard
     * Resets the Vis.js graph by clearing the graph container and drawing a new empty graph.
     * @returns {void}
     */
    self.resetVisjsGraph = function () {
        $("#graphDiv").html("");
        Lineage_whiteboard.drawNewGraph({ nodes: [], edges: [] });
    };

    /**
     * @function
     * @name loadSources
     * @memberof module:Lineage_whiteboard
     * Loads available sources for the Lineage module and initializes the UI components.
     * Handles errors and sets up the lateral panel with the required elements.
     * @returns {void}
     */
    self.loadSources = function (options) {
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

    /**
     * @function
     * @name onSourceSelect
     * @memberof module:Lineage_whiteboard
     * Handles the selection of a source.
     * @param {string} sourceLabel - The label of the selected source.
     * @param {Object} event - The event object containing information about the interaction.
     * @returns {void}
     */
    self.onSourceSelect = function (sourceLabel, event) {};

    /**
     * @function
     * @name onGraphOrTreeNodeClick
     * @memberof module:Lineage_whiteboard
     * Handles click events on graph or tree nodes, determining appropriate actions based on key combinations.
     * @param {Object} node - The clicked node object containing data.
     * @param {Object} nodeEvent - The event object containing key press information.
     * @param {Object} [options={}] - Additional options related to the event.
     * @param {string} [options.callee] - Specifies whether the event originated from "Graph" or "Tree".
     * @returns {null|Object} - Returns null if the action is handled, otherwise returns the event object.
     */
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

    /**
     * @function
     * @name jstreeContextMenu
     * @memberof module:Lineage_whiteboard
     * Generates a custom context menu for the jsTree component, providing additional actions based on user permissions.
     * @returns {Object} - The context menu items object.
     */
    self.jstreeContextMenu = function () {
        var items = {};

        items.addSimilarlabels = {
            label: "add similars (label)",
            action: function (_e) {
                Lineage_whiteboard.drawSimilarsNodes("sameLabel");
            },
        };

        if (authentication.currentUser.groupes.indexOf("admin") > -1) {
            items.wikiPage = {
                label: "Wiki page",
                action: function (_e) {
                    var source = $("#sourcesTreeDiv").jstree().get_selected()[0];
                    Lineage_whiteboard.showWikiPage(source);
                },
            };
        }

        return items;
    };

    /**
     * @function
     * @name selectTreeNodeFn
     * @memberof module:Lineage_whiteboard
     * Handles selection events on tree nodes, managing node data and triggering actions based on user interaction.
     * @param {Object} event - The event object triggered by node selection.
     * @param {Object} propertiesMap - Contains node data and event-related properties.
     * @returns {void}
     */
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

    /**
     * @function
     * @name initUI
     * @memberof module:Lineage_whiteboard
     * Initializes the user interface, resetting elements and loading necessary components.
     * @param {boolean} clearTree - If true, clears the tree and resets the lineage sources.
     * @returns {void}
     */
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

    /**
     * @function
     * @name clearLastAddedNodesAndEdges
     * @memberof module:Lineage_whiteboard
     * Clears the last added nodes and edges from the graph, ensuring a clean state.
     * @returns {void}
     */
    self.clearLastAddedNodesAndEdges = function () {
        var nodes = self.lineageVisjsGraph.lastAddedNodes;
        if (nodes && nodes.length > 0) {
            self.lineageVisjsGraph.data.nodes.remove(nodes);
        }

        var xx = self.lineageVisjsGraph.network;
        Lineage_decoration.decorateByUpperOntologyByClass();
    };

    /**
     * @function
     * @name showLastAddedNodesOnly
     * @memberof module:Lineage_whiteboard
     * Displays only the last added nodes by removing all other nodes from the graph.
     * @returns {void}
     */
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

    /**
     * @function
     * @name showHideIndividuals
     * @memberof module:Lineage_whiteboard
     * Toggles the visibility of individuals (nodes with a specific shape) in the graph.
     * @returns {void}
     */
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
     * @function
     * @name drawModel
     * @memberof module:Lineage_whiteboard
     * Draws top classes and restrictions.
     * @param {string} source - The source name to be visualized.
     * @param {string} graphDiv - The ID of the div container where the graph will be drawn.
     * @param {Object} options - Configuration options for drawing the model.
     * @param {boolean} [options.inverse] - If true, draws inverse relations.
     * @param {boolean} [options.all] - If true, draws all relations.
     * @param {Function} callback - Callback function to execute after the graph is drawn.
     * @returns {void}
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
                    options.data = topConcepts;
                    options.source = source;
                    Lineage_relations.currentQueryInfos = null;
                    if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        options.data = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
                    }
                    var direction = options.inverse ? "inverse" : "direct";
                    if (options.all) {
                        direction = null;
                    }
                    Lineage_relations.drawRelations(direction, "restrictions", null, options, graphDiv);
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
            },
        );
    };

    /**
     * @function
     * @name drawTopConcepts
     * @memberof module:Lineage_whiteboard
     * @description Retrieves and displays the top-level concepts for a given ontology source.
     * It ensures that concepts are properly linked to their respective sources and adds them to the graph.
     * @param {string} source - The ontology source to retrieve top concepts from.
     * @param {Object} [options={}] - Configuration options for fetching and displaying concepts.
     * @param {string} graphDiv - The ID of the div container where the graph will be drawn.
     * @param {Function} callback - Callback function executed after fetching top concepts.
     * @returns {void}
     */
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
            imports.forEach(function (importedSource) {
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
            function (source, callbackEach) {
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
            function (err, _result) {
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
            },
        );
    };

    /**
     * @function
     * @name isResultAcceptable
     * @memberof module:Lineage_whiteboard
     * @description Checks if the result set is acceptable based on predefined constraints.
     * If too many nodes are present, an alert is shown, and false is returned.
     * If no data is found, a message is displayed.
     * @param {Array} result - The result array to be evaluated.
     * @returns {boolean} - Returns true if the result is acceptable, otherwise false.
     */
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

    /**
     * @function
     * @name initWhiteBoard
     * @memberof module:Lineage_whiteboard
     * @description Initializes the whiteboard by clearing or redrawing the graph if necessary.
     * If the graph is empty or the force parameter is set to true, a new empty graph is drawn.
     * @param {boolean} force - If true, forces the graph to reset even if it's not empty.
     * @returns {void}
     */
    self.initWhiteBoard = function (force) {
        if (!self.lineageVisjsGraph.isGraphNotEmpty() || force) {
            self.drawNewGraph({ nodes: [], edges: [] });
        }
    };

    /**
     * @function
     * @name drawNewGraph
     * @memberof module:Lineage_whiteboard
     * @description Draws a new graph with provided data and options. Configures visualization settings
     * such as physics, layout, and interaction settings. Also manages node and edge interactions.
     * @param {Object} visjsData - The data containing nodes and edges to be displayed.
     * @param {string} graphDiv - The ID of the div container where the graph will be rendered.
     * @param {Object} [_options={}] - Optional configuration settings for the graph.
     * @param {Object} [_options.visjsOptions] - Custom options for the Vis.js graph.
     * @param {boolean} [_options.layoutHierarchical] - If true, enables hierarchical layout.
     * @param {Object} [_options.physics] - Custom physics settings for the graph.
     * @param {boolean} [_options.noDecorations] - If true, skips the decoration step after drawing.
     * @param {string} [_options.legendType] - Type of legend to be used for decoration.
     * @returns {void}
     */
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
                    nodes: { font: { color: self.defaultNodeFontColor }, borderWidthSelected: 4 },
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
                onAddNodeToGraph: function (_properties, _senderId) {
                    if (_properties.items.length > 0) {
                        if (!Lineage_sources.activeSource) {
                            var node = self.lineageVisjsGraph.data.nodes.get(_properties.items[0]);
                            Lineage_sources.activeSource = node.data.source;
                        }
                        if (!options.skipDrawLegend) {
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
                enabled: false,
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

    /**
     * Retrieves the graph node IDs associated with a specific data source.
     * @function
     * @name getGraphIdsFromSource
     * @memberof module:LineageWhiteboard
     * @param {any} source - The data source for which to retrieve the node IDs.
     * @returns {Array<string>|null} An array of node IDs related to the source, or null if the graph is empty.
     */
    self.getGraphIdsFromSource = function (source) {
        if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
            return null;
        }
        var existingNodes = self.lineageVisjsGraph.data.nodes.get();

        var sourceNodes = [];
        existingNodes.forEach(function (item) {
            if (item.id != "#" && item.data && item.data.source == source) {
                if (item.id.indexOf(" ") < 0) sourceNodes.push(item.data.id || item.id);
            }
        });
        return sourceNodes;
    };

    /**
     * Adds child nodes associated with the active data source to the graph.
     * @function
     * @name addSourceChildrenToGraph
     * @memberof module:LineageWhiteboard
     * @returns {void} Displays an alert if no source is selected, otherwise adds child nodes to the graph.
     */
    self.addSourceChildrenToGraph = function () {
        var source = Lineage_sources.activeSource;
        if (source == "") {
            return alert("select a source");
        }
        var sourceNodes = self.getGraphIdsFromSource(source);
        self.addChildrenToGraph(source, sourceNodes);
    };

    /**
     * Copies the list of cluster child nodes to the clipboard.
     * @function
     * @name listClusterToClipboard
     * @memberof module:LineageWhiteboard
     * @param {Object} clusterNode - The cluster node object containing the list of children.
     * @param {Array<Object>} clusterNode.data.cluster - An array of objects with child and childLabel properties.
     * @returns {void} Copies the formatted list to the clipboard and displays a message.
     */
    self.listClusterToClipboard = function (clusterNode) {
        var text = "";
        clusterNode.data.cluster.forEach(function (item, _index) {
            text += item.child + "," + item.childLabel + "\n";
        });

        common.copyTextToClipboard(text, function (err, result) {
            if (err) {
                return UI.message(err);
            }
            UI.message(result);
        });
    };

    /**
     * Displays the content of a cluster in a tree structure.
     * @function
     * @name listClusterContent
     * @memberof module:LineageWhiteboard
     * @param {Object} clusterNode - The cluster node containing the child nodes to display.
     * @param {Array<Object>} clusterNode.data.cluster - The list of child nodes to render in the tree.
     * @param {string} clusterNode.data.source - The source related to the cluster.
     * @returns {void} Initializes the tree widget and loads the cluster data.
     */
    self.listClusterContent = function (clusterNode) {
        var jstreeData = [];
        clusterNode.data.cluster.forEach(function (item, _index) {
            jstreeData.push({
                id: item.child,
                text: item.childLabel,
                parent: "#",
                data: { source: clusterNode.data.source, id: item.child, label: item.childLabel },
            });
        });

        var jstreeOptions = {
            openAll: true,
            selectTreeNodeFn: function (event, propertiesMap) {
                return Lineage_whiteboard.selectTreeNodeFn(event, propertiesMap);
            },
            contextMenu: SearchWidget.getJstreeConceptsContextMenu(),
        };

        JstreeWidget.loadJsTree(SearchWidget.currentTargetDiv, jstreeData, jstreeOptions);
    };

    /**
     * Opens and visualizes the content of a cluster node in the graph.
     * If the cluster is too large, it is copied to the clipboard instead.
     * @function
     * @name openCluster
     * @memberof module:LineageWhiteboard
     * @param {Object} clusterNode - The cluster node to visualize.
     * @param {Array<Object>} clusterNode.data.cluster - The child nodes within the cluster.
     * @param {string} clusterNode.data.source - The source related to the cluster node.
     * @param {string} clusterNode.id - The unique ID of the cluster node.
     * @returns {void} Visualizes the cluster nodes and edges in the graph or copies large clusters to the clipboard.
     */
    self.openCluster = function (clusterNode) {
        UI.message("");
        if (clusterNode.data.cluster.length > self.showLimit) {
            self.listClusterToClipboard(clusterNode);
            return alert("cluster content copied to clipboard( too large to draw)");
        }

        var color = self.getSourceColor(clusterNode.data.source);
        var attrs = self.getNodeVisjAttrs(item.child1.type, item.subject, clusterNode.data.source);
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
        clusterNode.data.cluster.forEach(function (item) {
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

    /**
     * Draws similar nodes based on label matching between sources in the graph.
     * This function finds nodes with similar labels and visualizes them with edges connecting the matches.
     * @function
     * @name drawSimilarsNodes
     * @memberof module:LineageWhiteboard
     * @param {any} _similarType - The type of similarity to match (e.g., exact match).
     * @param {any} _node - The node for which similarities are being drawn.
     * @param {any} _sources - The sources to search for similar nodes.
     * @param {any} _descendantsAlso - Flag to include descendants in the search for similar nodes.
     * @returns {void} Updates the graph with similar nodes and edges, or displays an alert in case of an error.
     */
    self.drawSimilarsNodes = function (_similarType, _node, _sources, _descendantsAlso) {
        var toSource = $("#sourcesTreeDiv").jstree().get_selected()[0];
        var fromSource = Lineage_sources.activeSource;
        if (!self.lineageVisjsGraph.isGraphNotEmpty()) {
            return;
        }
        var nodes = self.lineageVisjsGraph.data.nodes.get();

        var labels = [];
        var ids = null;
        var labelsMap = {};
        nodes.forEach(function (node) {
            if (node.data && node.data.label) {
                labels.push(node.data.label);
            }
            labelsMap[node.data.label] = node;
        });

        SearchUtil.getSimilarLabelsInSources(fromSource, [toSource], labels, ids, "exactMatch", null, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };
            result.forEach(function (item) {
                var sourceNode = labelsMap[item.label];
                for (var source in item.matches) {
                    item.matches[source].forEach(function (match) {
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
                                shape: Lineage_whiteboard.defaultShape,
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

    /**
     * Initializes and displays the linked data properties for a source in a tree structure.
     * This function uses the source label to find preferred properties and display them in a hierarchical format.
     * @function
     * @name initLinkedDataPropertiesSelect
     * @memberof module:LineageWhiteboard
     * @param {string | number} sourceLabel - The label of the source for which to display the linked data properties.
     * @returns {void} Populates the tree view with properties from the source configuration.
     */
    self.initLinkedDataPropertiesSelect = function (sourceLabel) {
        var schemaType = Config.sources[sourceLabel].schemaType;
        if (schemaType == "INDIVIDUAL") {
            var preferredProperties = Config.sources[sourceLabel].preferredProperties;
            if (!preferredProperties) {
                return alert("no preferredProperties in source configuration");
            }

            var jstreeData = [];
            var uriPrefixes = {};
            preferredProperties.forEach(function (item) {
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

    /**
     * Fetches and processes the ranges of properties for a given node, visualizing the data in a graph.
     * It queries the SPARQL endpoint to retrieve the domain and range for object properties related to the node.
     * @function
     * @name graphNodeNeighborhoodRanges
     * @memberof module:Lineage
     * @param {Object} nodeData - The data of the node to fetch the property ranges for.
     * @returns {void}
     */
    self.graphNodeNeighborhoodRanges = function (nodeData) {
        var fromSource = Lineage_sources.activeSource;
        Sparql_OWL.getObjectPropertiesDomainAndRange(source, [nodeData.id], {}, function (err, result) {
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
            result.forEach(function (item) {
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

    /**
     * Fetches and processes the neighborhood data for a given node, filtering by the specified property type.
     * It queries the SPARQL endpoint for outcoming, incoming, or all properties related to the node and visualizes the data in a graph.
     * @function
     * @name graphNodeNeighborhood
     * @memberof module:Lineage
     * @param {Object} nodeData - The data of the node to fetch the neighborhood for.
     * @param {string} propFilter - The type of properties to fetch. Can be "ranges", "outcoming", "incoming", or "all".
     * @param {Function} [callback] - A callback function to be executed after the process is complete.
     * @returns {void}
     */
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
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
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
                        },
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
            },
        );
    };

    /**
     * Adds nodes and their parent relationships to the graph for a given source and list of node IDs.
     * It fetches the parent-child relationships from the SPARQL endpoint and visualizes the nodes and edges in the graph.
     * @function
     * @name addNodesAndParentsToGraph
     * @memberof module:Lineage
     * @param {string} [source] - The source from which to fetch the data. If not provided, the active source is used.
     * @param {Array<string>} nodeIds - An array of node IDs to add to the graph.
     * @param {Object} [options] - Optional configuration for the graph population.
     * @param {Function} [callback] - A callback function to be executed after the process is complete.
     * @returns {void}
     */
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
            function (slice, callbackEach) {
                Sparql_OWL.getNodeParents(source, null, slice, 1, options, function (err, result) {
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
                        try {
                            self.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                            self.lineageVisjsGraph.data.edges.add(visjsData.edges);
                        } catch (e) {
                            console.log(e);
                        }
                    } else {
                        Lineage_whiteboard.drawNewGraph(visjsData);
                    }
                    callbackEach();
                });
            },
            function (err) {
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
            },
        );
    };

    /**
     * Adds child nodes and their parent-child relationships to the graph for a given source and node IDs.
     * The method queries the SPARQL endpoint to retrieve child nodes and then processes and visualizes them as nodes and edges in the graph.
     * It supports clustering of child nodes based on a specified threshold.
     * @function
     * @name addChildrenToGraph
     * @memberof module:Lineage
     * @param {string} [source] - The source to fetch the child nodes from. If not provided, the active source is used.
     * @param {Array<string>} nodeIds - An array of node IDs to add as parent nodes for retrieving children.
     * @param {Object} [options] - Optional configuration options for adding child nodes.
     * @param {number} [options.depth=1] - The depth of the child nodes to retrieve.
     * @param {boolean} [options.dontClusterNodes=false] - If true, disables clustering of child nodes.
     * @param {string} [options.shape] - The shape to assign to the nodes.
     * @param {Function} [callback] - A callback function to be executed after the process is complete.
     * @returns {void}
     */
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
            if (!self.lineageVisjsGraph.data || !self.lineageVisjsGraph.data.nodes) {
                if (callback) return callback();
                return;
            }

            parentIds = [];
            var nodes = self.lineageVisjsGraph.data.nodes.get();
            nodes.forEach(function (node) {
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

        options.filter = ' FILTER (regex(str(?child1),"http"))';

        Sparql_generic.getNodeChildren(source, null, parentIds, depth, options, function (err, result) {
            if (err) {
                return UI.message(err);
            }
            var parentsMap = [];

            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                return UI.message("No data found", true);
            }
            if (result.length > self.showLimit) {
                alert("Too may nodes (" + result.length + ") only " + self.showLimit + "can be shown ");
                result = result.slice(0, self.showLimit);
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

    /**
     * Adds an edge between two nodes in the graph, optionally based on a specified predicate.
     * If the predicate indicates a specific relationship (e.g., "subClassOf" or "type"), custom arrow configurations can be applied.
     * @function
     * @name addEdge
     * @memberof module:Lineage
     * @param {string} source - The source from which the edge is being added.
     * @param {string} from - The ID of the starting node for the edge.
     * @param {string} to - The ID of the ending node for the edge.
     * @param {string} predicate - The predicate describing the relationship between the nodes.
     * @returns {void}
     */
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

    /**
     * Deletes an existing edge between two nodes in the graph.
     * @function
     * @name deleteEdge
     * @memberof module:Lineage
     * @param {string} from - The ID of the starting node for the edge.
     * @param {string} to - The ID of the ending node for the edge.
     * @param {string} predicate - The predicate describing the relationship between the nodes (used for matching the edge).
     * @returns {void}
     */
    self.deleteEdge = function (from, to, predicate) {
        var id = from + "_" + to;
        self.lineageVisjsGraph.data.edges.remove(id);
    };

    /**
     * Applies decoration to edges based on their properties.
     * Edges with specific predicates (e.g., "subClassOf" or "type") will have customized arrow types and colors.
     * @function
     * @name setEdgesDecoration
     * @memberof module:Lineage
     * @param {Array<Object>|Object} [edges] - The edges to apply decoration to. If not provided, all edges will be processed.
     * @returns {void}
     */
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

    /**
     * Applies decoration to edges based on their properties.
     * Edges with specific predicates (e.g., "subClassOf" or "type") will have customized arrow types and colors.
     * @function
     * @name setEdgesDecoration
     * @memberof module:Lineage
     * @param {Array<Object>|Object} [edges] - The edges to apply decoration to. If not provided, all edges will be processed.
     * @returns {void}
     */
    self.drawLinkedDataProperties = function (propertyId, classIds, options) {
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
        Sparql_OWL.getFilteredTriples(source, subjects, [propertyId], objects, null, function (err, result) {
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
                        shape: Lineage_whiteboard.defaultShape,
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
                        shape: Lineage_whiteboard.defaultShape,
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

    /**
     * Draws properties as nodes and edges in the graph, based on SPARQL query results.
     * The method processes the result to create nodes for the range and domain of each property
     * and connects them with edges, visualizing the property relationships.
     * @function
     * @name drawProperties
     * @memberof module:Lineage
     * @param {Array<Object>} sparqlResults - The results of a SPARQL query containing property details.
     * @param {Object} sparqlResults.range - The range of the property (target entity).
     * @param {Object} sparqlResults.prop - The property itself (predicate).
     * @param {Object} sparqlResults.domain - The domain of the property (source entity).
     * @param {Object} sparqlResults.propLabel - The label for the property.
     * @param {Object} sparqlResults.rangeLabel - The label for the range.
     * @param {Object} sparqlResults.domainLabel - The label for the domain.
     * @returns {void}
     */
    self.drawProperties = function (sparqlResults) {
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = self.lineageVisjsGraph.getExistingIdsMap();
        self.currentExpandLevel += 1;
        sparqlResults.forEach(function (item) {
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

    /**
     * Draws object properties as nodes and edges in the graph, based on the specified class IDs
     * and the data source.
     * It fetches object properties and their domains and ranges, and visualizes them as nodes and edges in the graph.
     * @function
     * @name drawObjectProperties
     * @memberof module:Lineage
     * @param {string} source - The source of the data (e.g., OWL or Knowledge Graph).
     * @param {string|Array<string>} [classIds] - An array of class IDs to use in the query. If not provided, all class IDs from the source are used.
     * @param {boolean} [_descendantsAlso] - A flag to include descendants as well.
     * @returns {void}
     */
    self.drawObjectProperties = function (source, classIds, _descendantsAlso) {
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
                function (err, result) {
                    if (err) {
                        return UI.message(err);
                    }
                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");

                        return UI.message("No data found", true);
                    }
                    self.drawProperties(result);
                },
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

    /**
     * Draws direct restrictions as nodes and edges in the graph.
     * Direct restrictions are used to define the relationships between properties and entities in the graph.
     * @function
     * @name drawDirectRestrictions
     * @memberof module:Lineage
     * @param {function} callback - A callback function that is executed once the direct restrictions are drawn.
     * @returns {void}
     */
    self.drawDirectRestrictions = function (callback) {
        self.drawRestrictions(null, null, null, null, { inverse: false }, callback);
    };

    /**
     * Draws inverse restrictions as nodes and edges in the graph.
     * Inverse restrictions treat the subject and object of a property as interchangeable, and relationships are drawn in reverse.
     * @function
     * @name drawInverseRestrictions
     * @memberof module:Lineage
     * @param {function} callback - A callback function that is executed once the inverse restrictions are drawn.
     * @returns {void}
     */
    self.drawInverseRestrictions = function (callback) {
        self.drawRestrictions(null, null, null, null, { inverse: true }, callback);
    };

    /**
     * Draws the predicates graph for a given source, node IDs, and properties.
     * It visualizes the relationships between subjects, predicates, and objects in a graph, with nodes representing entities and edges representing their connections.
     * The graph is generated using the data from the specified source and options.
     * @function
     * @name drawPredicatesGraph
     * @memberof module:Lineage
     * @param {string} source - The source from which the data is retrieved (e.g., OWL or Knowledge Graph).
     * @param {Array<string>|string} [nodeIds] - The list of node IDs to visualize. If a single ID is provided, it is converted to an array.
     * @param {Array<string>|string} [properties] - The properties to be used in the query. If not provided, default properties are used.
     * @param {Object} [options] - Options to customize the graph generation.
     * @param {boolean} [options.inversePredicate=false] - Whether to visualize inverse predicates.
     * @param {string} [options.filter=""] - Custom filter to apply to the query.
     * @param {boolean} [options.skipLiterals=false] - Whether to skip literal objects.
     * @param {boolean} [options.OnlySubjects=false] - Whether to include only subject nodes.
     * @param {boolean} [options.returnVisjsData=false] - Whether to return the Visjs graph data.
     * @param {string} [options.edgesColor] - Custom color for the edges.
     * @param {Array<string>} [options.includeSources] - Additional sources to include for equivalent classes or sameAs properties.
     * @param {Function} callback - A callback function to handle the results of the graph generation.
     * @returns {void}
     */
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
                        if (result.length > self.showLimit) {
                            var resultNumber = result.length;
                            data = result.slice(0, 3000);
                            alert("Too many results (" + resultNumber + "), only 1000 showed");
                            return callbackSeries();
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
                    var rdfType;
                    data.forEach(function (item) {
                        // filter blanknodes
                        if (item.subject.startsWith && item.object.startsWith && (!item.subject.startsWith("http") || !item.object.startsWith("http"))) return;

                        if (!existingNodes[item.subject.value]) {
                            existingNodes[item.subject.value] = 1;

                            var label = item.subjectLabel ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value);
                            var shape = Lineage_whiteboard.defaultShape;
                            var size = Lineage_whiteboard.defaultShapeSize;

                            var type = item.subjectType ? item.subjectType.value : "?";
                            rdfType = "NamedIndividual";
                            if (type.indexOf("NamedIndividual") > -1) {
                                shape = Lineage_whiteboard.namedIndividualShape;
                            }

                            if (item.subject.type == "bnode") {
                                label = "";
                                shape = "hexagon";
                                color = "#EEE";
                                size = 2;
                                rdfType = "bnode";
                            }
                            if (type.indexOf("Property") > -1) {
                                shape = "text";
                                color = "#c3c3c3";
                                rdfType = "Property";
                            }

                            var predicateUri = options.inversePredicate ? null : item.prop.value;
                            visjsData.nodes.push(
                                VisjsUtil.getVisjsNode(source, item.subject.value, label, predicateUri, {
                                    shape: shape,
                                    color: color,
                                    rdfType: rdfType,
                                }),
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
                            rdfType = "";
                            if (type.indexOf("NamedIndividual") > -1) {
                                rdfType = "NamedIndividual";
                                shape = Lineage_whiteboard.namedIndividualShape;
                            }
                            if (type.indexOf("Class") > -1) {
                                rdfType = "Class";
                            }

                            if (item.object.type == "bnode") {
                                label = "";
                                shape = "hexagon";
                                color = "#EEE";
                                size = 2;
                                rdfType = "bnode";
                            }
                            if (type.indexOf("Property") > -1) {
                                shape = "text";
                                color = "#c3c3c3";
                                rdfType = "Property";
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
                                    rdfType: rdfType,
                                }),
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
                    Lineage_decoration.decorateByUpperOntologyByClass(visjsData.nodes);
                    $("#waitImg").css("display", "none");
                    if (callback) {
                        return callback(null, visjsData);
                    }
                },
            ],
            function (err) {},
        );
    };

    /**
     * Re-spatializes the graph by adjusting the physics of edges based on the specified mode.
     * If the mode is "excludeRelations", the physics of the edges are disabled. Otherwise, they remain active.
     * This method updates the graph's edges accordingly.
     * @function
     * @name reSpatializeGraph
     * @memberof module:Lineage
     * @param {string} mode - The mode to determine how the graph edges are handled. If "excludeRelations", edges are spatialized without physics; otherwise, physics are applied.
     * @returns {void}
     */
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

    /**
     * Draws the restrictions for a given source, class IDs, and related options.
     * This function handles both inverse and non-inverse restrictions, processes the retrieved data, and updates the graph with nodes and edges representing the restrictions.
     * It supports additional configuration options like excluding imports, adjusting the spatialization, and handling custom edges and nodes.
     * @function
     * @name drawRestrictions
     * @memberof module:Lineage
     * @param {string} source - The source from which the data is fetched (e.g., OWL or Knowledge Graph). If not provided, the active source is used.
     * @param {Array<string>|string} [classIds] - The list of class IDs to consider for drawing the restrictions. If not provided, defaults to the active source's graph IDs.
     * @param {Array<string>|string} [descendants] - The descendants to be included in the drawing (if any).
     * @param {boolean} [withoutImports] - Flag to exclude imports from the restrictions query.
     * @param {Object} [options] - Options to customize the restriction drawing behavior.
     * @param {boolean} [options.inverse=false] - If true, draws inverse restrictions.
     * @param {boolean} [options.allNodes=false] - If true, includes all nodes.
     * @param {boolean} [options.output=""] - Determines the output format (e.g., "table").
     * @param {string} [options.edgesColor] - Custom color for edges.
     * @param {Function} callback - A callback function to handle the results of the restriction drawing.
     * @returns {void}
     */
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
                result.forEach(function (item) {
                    // filter blanknodes
                    if (!item.subject.value.startsWith("http") || !item.value.value.startsWith("http")) return;

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
                                label: item.propLabel.value + ":" + cardinalitylabel,
                                font: { color: options.edgesColor || Lineage_whiteboard.restrictionColor, size: Lineage_whiteboard.restrictionFontSize },
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
                                dashes: true,
                                color: options.edgesColor || Lineage_whiteboard.restrictionColor,
                                physics: physics,
                                width: self.restrictionEdgeWidth,
                            });
                        } else if (!options.inverse) {
                            visjsData.edges.push({
                                id: edgeId,
                                to: item.value.value,
                                from: item.subject.value,
                                //  label: "<i>" + item.propLabel.value + "</i>",
                                label: item.propLabel.value,
                                font: { color: options.edgesColor || Lineage_whiteboard.restrictionColor, size: Lineage_whiteboard.restrictionFontSize },
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
                                width: self.restrictionEdgeWidth,
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
            },
        );
    };

    /**
     * Draws the sameAs restrictions for the dictionary.
     * This function fetches and visualizes the sameAs properties for the dictionary source,
     * displaying the relationships in a graph format.
     * @function
     * @name drawDictionarySameAs
     * @memberof module:Lineage_whiteboard
     * @returns {void}
     */
    self.drawDictionarySameAs = function () {
        function processMetadata(restrictionNodes) {
            var restrictionIds = [];
            restrictionNodes.forEach(function (bNode) {
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

    /**
     * Draws linked data for named classes.
     * This function fetches named linked data from a source based on the provided class IDs,
     * and visualizes the results in the graph, adding new nodes and edges as necessary.
     * @function
     * @name drawNamedLinkedData
     * @memberof module:Lineage_whiteboard
     * @param {any[]} [classIds] - The list of class IDs to filter the linked data by. If not provided, it will be retrieved from the active source.
     * @returns {void}
     */
    self.drawNamedLinkedData = function (/** @type {any[]} */ classIds) {
        var source = Lineage_sources.activeSource;
        if (!source) {
            return alert("select a source");
        }
        if (!classIds) {
            classIds = self.getGraphIdsFromSource(source);
        }
        UI.message("");

        Sparql_OWL.getNamedLinkedData(source, classIds, null, function (err, /** @type {any[]} */ result) {
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
            result.forEach(function (item) {
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

    /**
     * Collapses a node and removes its connected children from the graph.
     * This function collapses the specified node and removes any connected nodes in the "from" direction.
     * @function
     * @name collapseNode
     * @memberof module:Lineage_whiteboard
     * @param {any} nodeId - The ID of the node to collapse.
     * @returns {void}
     */
    self.collapseNode = function (nodeId) {
        if (nodeId) {
            var children = self.lineageVisjsGraph.network.getConnectedNodes(nodeId, "from");
            self.lineageVisjsGraph.data.nodes.remove(children);
        }
    };

    /**
     * Sets the context menu for a graph node based on the node's type and context.
     * This function generates a dynamic context menu for the clicked node with options such as
     * opening clusters, showing property information, or removing nodes from the graph.
     * @function
     * @name setGraphPopupMenus
     * @memberof module:Lineage_whiteboard
     * @param {Object} node - The node that was clicked on in the graph.
     * @param {Event} event - The event triggered by the click, used to set the context menu options.
     * @returns {void}
     */
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
                html +=
                    ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.removeFromGraph();">Remove from graph</span>' +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.removeOthersFromGraph();">Remove others</span>' +
                    '    <span  class="popupMenuItem" onclick="NodeRelations_bot.start();">Relations...</span>';
            } else {
                html +=
                    // '    <span class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.drawSimilars();"> Similars</span>' +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.collapse();">Collapse</span>' +
                    '    <span  class="popupMenuItem" onclick="NodeRelations_bot.start();">Relations...</span>' +
                    // '    <span  class="popupMenuItem" onclick="Lineage_relations.showDrawRelationsDialog(\'Graph\');">Relations...</span>' +
                    //  "   <span  class=\"popupMenuItem\" onclick=\"Lineage_relations.drawRelations('direct',null,'Graph');\">Relations</span>" +
                    //   "    <span  class=\"popupMenuItem\" onclick=\"Lineage_relations.drawRelations('inverse',null,'Graph');\">Inverse Rels</span>" +
                    //  "    <span  class=\"popupMenuItem\" onclick=\"Lineage_whiteboard.graphActions.graphNodeNeighborhood('all');\">ObjectProperties</span>" +
                    //   "    <span  class=\"popupMenuItem\" onclick=\"Lineage_whiteboard.graphActions.showRestrictions();\">Restrictions</span>" +
                    //   "  <span  class=\"popupMenuItem\" onclick=\"Lineage_whiteboard.graphActions.showRestrictions();\">Inv Restr</span>" +
                    "   <hr>" +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.hideShowOthers();">Hide/show others</span>' +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.removeFromGraph();">Remove from graph</span>' +
                    '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.removeOthersFromGraph();">Remove others</span>';
            }
        }
        if (!node.from) {
            html += '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.showHierarchicalView();">Hierarchical view </span>';
        }

        $("#popupMenuWidgetDiv").html(html);
    };

    /**
     * Zooms in on a specific node in the graph and highlights it.
     * This function focuses on the specified node by adjusting the zoom scale and updating its size and font color.
     * It also stores the initial parameters for the node such as shadow, size, and shape.
     *
     * @function
     * @name zoomGraphOnNode
     * @memberof module:LineageWhiteboard
     * @param {any} nodeId - The ID of the node to zoom into.
     * @param {boolean} changeSize - Flag to determine whether the node's size should be adjusted.
     * @returns {void}
     */
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

        var newNodes = [];
        nodes = self.lineageVisjsGraph.data.nodes.get();
        nodes.forEach(function (node) {
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
     * Draws the nodes and their parent relationships in the graph.
     * This function retrieves the parents of the specified nodes and visualizes them in the graph, along with any additional options like shape and level.
     * It updates the graph with new nodes and edges based on the query result and the specified ancestors' depth.
     * @function
     * @name drawNodesAndParents
     * @memberof module:LineageWhiteboard
     * @param {Array|Object} nodes - The nodes to be drawn. Can be a single node or an array of nodes.
     * @param {number} ancestorsDepth - The depth of ancestor nodes to be retrieved.
     * @param {Object} [options={}] - Optional configuration for the drawing process.
     * @param {string} [options.shape="dot"] - The shape of the node. Default is "dot".
     * @param {number} [options.startLevel=0] - The starting level for drawing nodes. Default is 0.
     * @param {boolean} [options.drawBeforeCallback=false] - If true, the callback is called before drawing. Default is false.
     * @param {Function} [options.callback] - A callback function to handle the result after drawing the nodes and edges.
     * @returns {void}
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

            result.forEach(function (item) {
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

    /**
     * Draws the inferred classes model based on the active source or provided source.
     * This function queries the inferred model data and visualizes it in the graph.
     * If the graph is not empty, it updates the existing nodes and edges.
     *
     * @function
     * @name drawInferredClassesModel
     * @memberof module:LineageWhiteboard
     * @param {Object} [source] - The source of the lineage data. If not provided, the active source is used.
     * @returns {void}
     */
    self.drawInferredClassesModel = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        KGquery_graph.getImplicitModelVisjsData(source, function (err, visjsData) {
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
        /**
         * Displays the graph's popup menu for the given node at the specified point.
         * The popup menu shows different options depending on whether the node is a graph edge or a regular node.
         *
         * @function
         * @name showGraphPopupMenu
         * @memberof module:LineageWhiteboard.graphActions
         * @param {Object} node - The node to show the popup for. Contains a `from` property if it is an edge.
         * @param {Object} point - The coordinates (x, y) where the popup should be shown.
         * @param {Object} event - The event object, typically the click event.
         * @returns {void}
         */
        showGraphPopupMenu: function (node, point, event) {
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

        /**
         * Handles a click event on a graph node. If the node is an edge, it updates the current graph edge; otherwise, it updates the current node.
         * The function can also handle double-click actions and expand the node or open a cluster.
         *
         * @function
         * @name onNodeClick
         * @memberof module:LineageWhiteboard.graphActions
         * @param {Object} node - The node that was clicked.
         * @param {Object} point - The coordinates (x, y) where the click occurred.
         * @param {Object} options - Options for the click action.
         * @param {boolean} options.dbleClick - Indicates if the click was a double-click.
         * @returns {void}
         */
        onNodeClick: function (node, point, options) {
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

        /**
         * Expands the current graph node by adding its children. The depth and whether nodes should be clustered is determined based on the current click options.
         *
         * @function
         * @name expand
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
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

        /**
         * Draws the parent nodes of the current graph node.
         * It adds parent nodes based on the `memberPredicate` property, which is true if the node type is "container".
         *
         * @function
         * @name drawParents
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
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

        /**
         * Draws similar nodes to the current graph node. If the user holds down certain keys, descendants may also be included in the search for similar nodes.
         *
         * @function
         * @name drawSimilars
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        drawSimilars: function () {
            if (!self.currentGraphNode) {
                return;
            }
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_whiteboard.drawSimilarsNodes("label", self.currentGraphNode.data.source, self.currentGraphNode.id, descendantsAlso);
        },

        /**
         * Collapses the current graph node, hiding its children.
         *
         * @function
         * @name collapse
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        collapse: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.collapseNode(self.currentGraphNode.id);
        },

        /**
         * Opens a cluster around the current graph node, displaying additional related nodes and information.
         *
         * @function
         * @name openCluster
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        openCluster: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.openCluster(self.currentGraphNode);
        },

        /**
         * Lists the nodes in the current graph cluster and copies the list to the clipboard.
         *
         * @function
         * @name listClusterToClipboard
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        listClusterToClipboard: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.listClusterToClipboard(self.currentGraphNode);
        },

        /**
         * Lists the content of the current graph cluster.
         *
         * @function
         * @name listClusterContent
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        listClusterContent: function () {
            if (!self.currentGraphNode) {
                return;
            }
            Lineage_whiteboard.listClusterContent(self.currentGraphNode);
        },

        /**
         * Displays the information panel for the current graph node or edge.
         * If the node is selected, it shows detailed information about the node; otherwise, it shows information about the edge.
         *
         * @function
         * @name showNodeInfos
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        showNodeInfos: function () {
            if (self.currentGraphNode) {
                NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
            } else if (self.currentGraphEdge) {
                NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge, "mainDialogDiv");
            }
        },

        /**
         * Displays the information panel for a restriction property in the current graph edge.
         *
         * @function
         * @name showRestrictionPropertyNodeInfos
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        showRestrictionPropertyNodeInfos: function () {
            NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge?.data?.propertyId, "mainDialogDiv");
        },

        /**
         * Displays the axioms associated with the current graph node.
         * The title of the dialog is updated to reflect the resource being examined.
         *
         * @function
         * @name showAxioms
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        showAxioms: function () {
            if (self.currentGraphNode) {
                $("#smallDialogDiv").dialog("option", "title", "Axioms of resource " + self.currentGraphNode.data.label);

                NodeInfosAxioms.init(self.currentGraphNode.data.source, self.currentGraphNode, "smallDialogDiv");
            }
        },

        /**
         * Displays information about the object property for the current graph edge.
         * The `hideModifyButtons` option determines whether the modification buttons are visible in the info panel.
         *
         * @function
         * @name showPropertyInfos
         * @memberof module:LineageWhiteboard.graphActions
         * @param {boolean} hideModifyButtons - Whether to hide the modification buttons in the property info panel.
         * @returns {void}
         */
        showPropertyInfos: function (hideModifyButtons) {
            NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge, "mainDialogDiv", { hideModifyButtons: hideModifyButtons });
        },

        /**
         * Displays information about the restriction for the current graph edge.
         * The `hideModifyButtons` option determines whether the modification buttons are visible in the restriction info panel.
         *
         * @function
         * @name showRestrictionInfos
         * @memberof module:LineageWhiteboard.graphActions
         * @param {boolean} hideModifyButtons - Whether to hide the modification buttons in the restriction info panel.
         * @returns {void}
         */
        showRestrictionInfos: function (hideModifyButtons) {
            NodeInfosWidget.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge, "mainDialogDiv", { hideModifyButtons: hideModifyButtons });
        },

        /**
         * Expands an individual node by adding related items (e.g., individuals) to the graph.
         * It queries a filter based on the current node and adds new nodes and edges to the graph.
         *
         * @function
         * @name expandIndividual
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
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

        /**
         * Pastes the current graph node into the selected container node from the search widget tree.
         *
         * @function
         * @name pasteNodeIntoContainer
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        pasteNodeIntoContainer: function () {
            if (SearchWidget.currentTreeNode) {
                Containers_tree.pasteNodeIntoContainer(Lineage_sources.activeSource, self.currentGraphNode);
            }
        },

        /**
         * Displays the neighborhood (incoming, outcoming, or ranges) of the current graph node.
         * The filter parameter determines what type of neighborhood to display.
         *
         * @function
         * @name graphNodeNeighborhood
         * @memberof module:LineageWhiteboard.graphActions
         * @param {string} filter - The filter type, such as 'incoming', 'outcoming', or 'ranges'.
         * @returns {void}
         */
        graphNodeNeighborhood: function (/** @type {any} */ filter) {
            Lineage_whiteboard.graphNodeNeighborhood(self.currentGraphNode.data, filter);
        },

        /**
         * Displays the UI options for the graph node neighborhood, allowing the user to choose between incoming, outcoming, or range relationships.
         *
         * @function
         * @name graphNodeNeighborhoodUI
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        graphNodeNeighborhoodUI: function () {
            var html = ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.graphNodeNeighborhood(\'incoming\');">incoming</span>';
            html += ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.graphNodeNeighborhood(\'outcoming\');">outcoming</span>';
            html += ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.graphNodeNeighborhood(\'ranges\');">ranges</span>';

            $("#popupMenuWidgetDiv").html(html);
            setTimeout(function () {
                $("#popupMenuWidgetDiv").css("display", "flex");
            }, 100);
        },

        /**
         * Removes the current graph node from the graph.
         * The decoration of the graph is updated to reflect the removal.
         *
         * @function
         * @name removeFromGraph
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        removeFromGraph: function () {
            var nodesSelected = self.lineageVisjsGraph.network.getSelectedNodes();
            if (nodesSelected.length > 1) {
                for (var i = 0; i < nodesSelected.length; i++) {
                    var edgeIds = self.lineageVisjsGraph.network.getConnectedEdges(nodesSelected[i].id);
                    self.lineageVisjsGraph.data.edges.remove(edgeIds);
                    self.lineageVisjsGraph.removeNodes("id", nodesSelected[i], true);
                }
                Lineage_decoration.decorateByUpperOntologyByClass();
                return;
            }
            var edgeIds = self.lineageVisjsGraph.network.getConnectedEdges(Lineage_whiteboard.currentGraphNode.id);
            self.lineageVisjsGraph.data.edges.remove(edgeIds);
            self.lineageVisjsGraph.removeNodes("id", Lineage_whiteboard.currentGraphNode.id, true);
            Lineage_decoration.decorateByUpperOntologyByClass();
        },

        /**
         * Removes all nodes from the graph except for the current node.
         *
         * @function
         * @name removeOthersFromGraph
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        removeOthersFromGraph: function () {
            if (!Lineage_whiteboard.currentGraphNode.id) {
                return;
            }
            var nodesSelected = self.lineageVisjsGraph.network.getSelectedNodes();
            if (nodesSelected.length > 1) {
                self.lineageVisjsGraph.removeOtherNodesFromGraph(nodesSelected);
                Lineage_decoration.decorateByUpperOntologyByClass();
                return;
            }
            self.lineageVisjsGraph.removeOtherNodesFromGraph(Lineage_whiteboard.currentGraphNode.id);
            Lineage_decoration.decorateByUpperOntologyByClass();
        },

        showHierarchicalView: function () {
            if (!Lineage_whiteboard.currentGraphNode.id) {
                return;
            }
            Lineage_nodeCentricGraph.draw(Lineage_whiteboard.currentGraphNode.id);
        },

        /**
         * Displays the object properties for the current graph node.
         * If the user holds down certain keys, descendants may also be included in the displayed properties.
         *
         * @function
         * @name showObjectProperties
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        showObjectProperties: function () {
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_whiteboard.drawObjectProperties(self.currentGraphNode.data.source, [self.currentGraphNode.id], descendantsAlso);
        },

        /**
         * Displays the restrictions for the current graph node.
         * If the user holds down certain keys, descendants may also be included in the displayed restrictions.
         *
         * @function
         * @name showRestrictions
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        showRestrictions: function () {
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_whiteboard.drawRestrictions(self.currentGraphNode.data.source, self.currentGraphNode.data.id, descendantsAlso);
        },

        /**
         * Deletes the selected restriction relation from the graph.
         * A confirmation dialog is shown before deleting the relation.
         *
         * @function
         * @name deleteRestriction
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
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

        /**
         * Deletes the selected object property from the graph.
         * A confirmation dialog is shown before deleting the object property.
         *
         * @function
         * @name deleteObjectProperty
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
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

        /**
         * Creates a sub-property for a selected object property and replaces the current relation.
         * The user is prompted to enter a label for the sub-property before proceeding with the replacement.
         *
         * @function
         * @name createSubPropertyAndreplaceRelation
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
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

        /**
         * Displays the linked data for the current graph node.
         * A panel is shown to provide more information about the linked data.
         *
         * @function
         * @name showLinkedData
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
        showLinkedData: function () {
            Lineage_linkedData.showLinkedDataPanel(self.currentGraphNode);
            //Lineage_whiteboard.drawNamedLinkedData([self.currentGraphNode.id]);
        },

        /**
         * Hides or shows all nodes in the graph except for the current node, based on the current state.
         *
         * @function
         * @name hideShowOthers
         * @memberof module:LineageWhiteboard.graphActions
         * @returns {void}
         */
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

    /**
     * @function
     * @name getSourceColor
     * @memberof module:graphActions
     * Returns the color associated with a given source.
     * If the source has no color assigned, a color is generated based on the specified palette.
     * If a node ID is provided, the color is determined based on the graph URI map.
     * @param {string} source - The name of the source.
     * @param {string} [nodeId] - The node identifier to check for specific graph mappings.
     * @param {string} [palette="paletteIntense"] - The color palette to use if no color is found for the source.
     * @returns {string} - The color associated with the source.
     */
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

    /**
     * @function
     * @name getPropertyColor
     * @memberof module:graphActions
     * Returns the color associated with a given property.
     * If the property has no color assigned, a color is generated based on the specified palette.
     * @param {string | number} propertyName - The name or number of the property.
     * @param {string} [palette="paletteIntense"] - The color palette to use if no color is found for the property.
     * @returns {string} - The color associated with the property.
     */
    self.getPropertyColor = function (/** @type {string | number} */ propertyName, /** @type {string} */ palette) {
        if (!palette) {
            palette = "paletteIntense";
        }
        if (!self.propertyColors[propertyName]) {
            self.propertyColors[propertyName] = common[palette][Object.keys(self.propertyColors).length];
        }
        return self.propertyColors[propertyName];
    };

    /**
     * @function
     * @name getNodeVisjAttrs
     * @memberof module:graphActions
     * Returns the visual attributes (shape and color) for a node based on its type, super class, and source.
     * @param {string} type - The type of the node.
     * @param {string} superClass - The super class of the node.
     * @param {string} source - The source of the node.
     * @returns {Object} - An object containing the visual attributes (`shape`, `color`) of the node.
     */
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

    /**
     * @function
     * @name showHideHelp
     * @memberof module:graphActions
     * Toggles the visibility of the help section in the UI.
     * If the help section is currently hidden, it will be shown; otherwise, it will be hidden.
     * @returns {void}
     */
    self.showHideHelp = function () {
        var display = $("#lineage_actionDiv_Keyslegend").css("display");
        if (display == "none") {
            display = "block";
        } else {
            display = "none";
        }
        $("#lineage_actionDiv_Keyslegend").css("display", display);
    };

    /**
     * @function
     * @name showWikiPage
     * @memberof module:graphActions
     * Opens the wiki page for the specified source label in a new browser tab.
     * The URL is constructed using the base wiki URL and the source label.
     * @param {string} sourceLabel - The label of the source for which the wiki page should be opened.
     * @returns {void}
     */
    self.showWikiPage = function (sourceLabel) {
        var wikiUrl = Config.wiki.url + "Source " + sourceLabel;
        window.open(wikiUrl, "_slsvWiki");
    };

    /**
     * @function
     * @name showEdgesLegend
     * @memberof module:graphActions
     * Displays a legend for the edges in the graph, showing each edge label and its associated color.
     * This helps users understand the connections between different nodes in the graph.
     * @returns {void}
     */
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

    /**
     * @function
     * @name copyNode
     * @memberof module:graphActions
     * Copies a node to the clipboard, allowing it to be pasted elsewhere.
     * If no specific node is provided, it will use the currently selected node.
     * @param {Event} event - The event triggering the copy action.
     * @param {Object} node - The node to copy. If not provided, uses the current node.
     * @returns {void}
     */
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
            },
            //  self.currentTreeNode.id + "_anchor"
        );
    };

    self.graph = {
        /**
         * @function
         * @name searchNode
         * @memberof module:graphActions.graph
         * Searches for a specific node by its ID and a search word.
         * This helps locate specific nodes within the graph structure.
         * @param {string} id - The ID of the node to search for.
         * @param {string} word - The word to search within the node.
         * @returns {void}
         */
        searchNode: function (id, word) {
            self.lineageVisjsGraph.searchNode(id, word);
        },

        /**
         * @function
         * @name setLayout
         * @memberof module:graphActions.graph
         * Sets the layout of the graph to the specified type.
         * Different layouts can help present the graph data in various ways, such as hierarchical or circular.
         * @param {string} layout - The layout type to apply to the graph.
         * @returns {void}
         */
        setLayout: function (layout) {
            self.lineageVisjsGraph.setLayout();
        },

        /**
         * @function
         * @name showGraphConfig
         * @memberof module:graphActions.graph
         * Displays the configuration options for the graph.
         * This includes settings like layout type, visual styles, and other graph preferences.
         * @returns {void}
         */
        showGraphConfig: function () {
            self.lineageVisjsGraph.showGraphConfig();
        },

        /**
         * @function
         * @name toSVG
         * @memberof module:graphActions.graph
         * Exports the graph to an SVG format, allowing users to download a graphical representation of the data.
         * @returns {void}
         */
        toSVG: function () {
            self.lineageVisjsGraph.toSVG();
        },

        /**
         * @function
         * @name toGraphMl
         * @memberof module:graphActions.graph
         * Exports the graph to the GraphML format, which can be used for further analysis or visualization in compatible tools.
         * @returns {void}
         */
        toGraphMl: function () {
            self.lineageVisjsGraph.toGraphMl();
        },
        /**
         * @function
         * @name toGraphMl
         * @memberof module:graphActions.graph
         * Exports the graph to the GraphML format, which can be used for further analysis or visualization in compatible tools.
         * @returns {void}
         */
        toPlantUML: function () {
            self.lineageVisjsGraph.toPlantUML(true);
        },
        /**
         * @function
         * @name exportGraphToDataTable
         * @memberof module:graphActions.graph
         * *@param {boolean} exportData - If true, exports visjsGraph elements directy without using dataTable
         * Exports the graph data to a tabular format (data table) for easier inspection and manipulation.
         * @returns {void}
         */
        exportGraphToDataTable: function (exportData) {
            Export.exportGraphToDataTable(self.lineageVisjsGraph, null, null, null, exportData);
        },

        /**
         * @function
         * @name saveWhiteboard
         * @memberof module:graphActions.graph
         *
         *
         * Saves the current whiteboard (graph visualization) as json in user_data database
         * The data_label  is provided by the user through a prompt.
         * @returns {void}
         */

        saveWhiteboard: function () {
            if (Lineage_whiteboard.lineageVisjsGraph.data && Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length > 0) {
                var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                var positions = Lineage_whiteboard.lineageVisjsGraph.network.getPositions();
                var data = {
                    nodes: nodes,
                    edges: Lineage_whiteboard.lineageVisjsGraph.data.edges.get(),
                    context: Lineage_whiteboard.lineageVisjsGraph.currentContext,
                    positions: positions,
                };
                var data_path = "savedWhiteboards";
                UserDataWidget.currentTreeNode = null;
                UserDataWidget.showSaveDialog(data_path, data, null, function (err, result) {
                    if (err) {
                        return alert(err.responseText);
                    }
                    UI.message("Graph saved successfully");
                });

                //Lineage_whiteboard.lineageVisjsGraph.saveGraph(visjsFileName);
            } else {
                alert("No Whiteboard to save");
            }
        },
        /**
         * @function
         * @name loadSavedWhiteboard
         * @memberof module:graphActions.graph
         * Select a previously saved graph on userData and renders it in the current workspace.
         *
         * @returns {void}
         */

        loadSavedWhiteboard: function () {
            UserDataWidget.showListDialog(null, { filter: { data_type: "savedWhiteboards", data_source: MainController.currentSource, data_tool: "lineage" } }, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                if (result?.data_content) {
                    self.loadGraphFromJSON(result.data_content);
                }
            });
        },
        /**
         * Exports the current whiteboard graph to a JSON file.
         *
         * @function
         * @name exportWhiteboard
         * @memberof module:graphActions.graph
         * @returns {void}
         *
         */
        exportWhiteboard: function () {
            if (Lineage_whiteboard.lineageVisjsGraph.data && Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length > 0) {
                var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                var positions = Lineage_whiteboard.lineageVisjsGraph.network.getPositions();
                var data = {
                    nodes: nodes,
                    edges: Lineage_whiteboard.lineageVisjsGraph.data.edges.get(),
                    context: Lineage_whiteboard.lineageVisjsGraph.currentContext,
                    positions: positions,
                };
                var fileName = MainController.currentSource + "_whiteBoard.json";
                Export.downloadJSON(data, fileName);
            } else {
                alert("No Whiteboard to save");
            }
        },
        /**
         * Display a whiteboard graph from a JSON file.
         *
         * @function
         * @name importWhiteboard
         * @memberof module:graphActions.graph
         * @returns {void}
         *
         */
        importWhiteboard: function () {
            ImportFileWidget.showImportDialog(function (err, result) {
                if (err) {
                    return alert(err);
                }
                var data = JSON.parse(result);
                if (data.nodes.length == 0) {
                    return alert("no nodes in file");
                }
                self.loadGraphFromJSON(data);
            });
        },
    };
    /**
     * @function
     * @name loadGraphFromJSON
     * @memberof module:graphActions
     * Initializes the whiteboard tab in the UI from a JSON object.
     *
     * @returns {void}
     */

    self.loadGraphFromJSON = function (json) {
        var data = json;
        var positions = data.positions;
        var options = data.context.options;
        var visjsData = { nodes: [], edges: [] };
        visjsData.options = data.options;
        var existingNodes = {};

        existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        data.nodes.forEach(function (node) {
            if (!existingNodes[node.id]) {
                existingNodes[node.id] = 1;
                if (positions[node.id]) {
                    node.x = positions[node.id].x;
                    node.y = positions[node.id].y;
                }
                visjsData.nodes.push(node);
            }
        });

        data.edges.forEach(function (edge) {
            if (!existingNodes[edge.id]) {
                existingNodes[edge.id] = 1;
                visjsData.edges.push(edge);
            }
        });

        if (Lineage_whiteboard.lineageVisjsGraph?.data?.nodes || Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);

            Lineage_whiteboard.lineageVisjsGraph.network.fit();
        } else {
            Lineage_whiteboard.lineageVisjsGraph.data = visjsData;
            Lineage_whiteboard.lineageVisjsGraph.draw(function () {
                Lineage_whiteboard.lineageVisjsGraph.network.fit();
            });
        }
    };
    /**
     * @function
     * @name initWhiteboardTab
     * @memberof module:graphActions
     * Initializes the whiteboard tab in the UI by loading the necessary HTML content and configuring actions.
     * This includes binding event listeners and setting up the tab's content.
     * @returns {void}
     */
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
                $("#lineageWhiteboard_modelBtn").bind("click", function (e) {
                    Lineage_whiteboard.drawModel(null, null, { inverse: e.ctrlKey });
                });
                $("#lineageWhiteboard_modelBtn").bind("contextmenu", function (e) {
                    e.preventDefault();
                    var html = '<span class="popupMenuItem" onclick="Lineage_whiteboard.drawModel(null, null, { inverse: false });">Direct Restrictions</span>';
                    html += '<span class="popupMenuItem" onclick="Lineage_whiteboard.drawModel(null, null, { inverse: true });">Inverse Restrictions</span>';
                    html += '<span class="popupMenuItem" onclick="Lineage_whiteboard.drawModel(null, null, { all: true })">All Restrictions</span>';
                    PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv");
                });
                $("#lateralPanelDiv").resizable({
                    maxWidth: $(window).width() - 100,
                    minWidth: 150,
                    stop: function (event, ui) {
                        UI.resetWindowSize();
                    },
                });
            });
        }
    };

    /**
     * @function
     * @name initQueryTab
     * @memberof module:graphActions
     * Initializes the classes tab in the UI by loading relevant content and actions related to the classes.
     * @returns {void}
     */
    self.initQueryTab = function () {
        if ($("#queryTab").children().length == 0) {
            $("#queryTab").html("<div id='queryTabDiv'></div>");
            $("#botContainerDiv").css("width", "100%");
            SparqlQuery_bot.start({ divId: "queryTabDiv" });
        }
    };

    /**
     * @function
     * @name initClassesTab
     * @memberof module:graphActions
     * Initializes the classes tab in the UI by loading relevant content and actions related to the classes.
     * @returns {void}
     */
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
                            UI.resetWindowSize();
                        },
                    });*/
                //});
            });
        }
    };

    /**
     * @function
     * @name initPropertiesTab
     * @memberof module:graphActions
     * Initializes the properties tab in the UI by loading content and setting up actions related to the properties.
     * @returns {void}
     */
    self.initPropertiesTab = function () {
        if ($("#propertiesTab").children().length == 0) {
            $("#propertiesTab").load("./modules/tools/lineage/html/propertiesTab.html", function (s) {
                Lineage_whiteboard.hideShowMoreOptions("hide", "Lineage_MorePropertiesOptions");
                Lineage_properties.searchTermInSources();
                self.hideShowMoreOptions("show", "Lineage_MorePropertiesOptions");
            });
        }
    };

    /**
     * @function
     * @name initContainersTab
     * @memberof module:graphActions
     * Initializes the containers tab in the UI by loading the relevant content and setting up actions related to containers.
     * @returns {void}
     */
    self.initContainersTab = function () {
        if (true || $("#containersTab").children().length == 0) {
            $("#containersTab").load("./modules/tools//lineage/html/containersTab.html", function (s) {
                Containers_tree.search("lineage_containers_containersJstree");
                $("#containers_showparentContainersBtn").bind("click", function (e) {
                    if (true || e.ctrlKey) {
                        return Containers_widget.showParentContainersDialog();
                    }
                    Containers_widget.execParentContainersSearch();
                });
                $("#containers_showparentContainersBtn").bind("contextmenu", function (e) {
                    e.preventDefault();
                    var html = '<span class="popupMenuItem" onclick="Containers_widget.showParentContainersDialog();">Select type</span>';
                    html += '<span class="popupMenuItem" onclick="Containers_widget.execParentContainersSearch();">Load</span>';
                    PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv");
                });
            });
        }
    };

    /**
     * @function
     * @name resetCurrentTab
     * @memberof module:graphActions
     * Resets the content and actions of the current active tab.
     * This ensures that each tab's content is refreshed based on its state.
     * @returns {void}
     */
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

    /**
     * @function
     * @name hideShowMoreActions
     * @memberof module:graphActions
     * Toggles the visibility of the "More Actions" section in the UI.
     * This section contains additional actions that can be performed on the graph or data.
     * @param {string} hideShowParameter - If "show", the actions are displayed; if "hide", they are hidden.
     * @returns {void}
     */
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

    /**
     * @function
     * @name hideShowMoreOptions
     * @memberof module:graphActions
     * Toggles the visibility of additional options for a specific section of the UI.
     * @param {string} hideShowParameter - If "show", the options are displayed; if "hide", they are hidden.
     * @param {string} divId - The ID of the section to toggle.
     * @returns {void}
     */
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

    /**
     * @function
     * @name loadDecorationData
     * @memberof module:graphActions
     * Loads decoration data for a specific source label, which is used to modify the graph's appearance.
     * @param {string} sourceLabel - The label of the source for which to load decoration data.
     * @returns {void}
     */
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

    /**
     * @function
     * @name showWhiteBoardDisplay
     * @memberof module:graphActions
     * Displays the whiteboard in a dialog window, allowing users to interact with the visual representation of the graph.
     * @returns {void}
     */
    self.showWhiteBoardDisplay = function () {
        $("#smallDialogDiv").load("./modules/tools/lineage/html/whiteboardDisplay.html", function () {
            $("#smallDialogDiv").dialog("open");
            var userPrefs = localStorage.getItem("whiteboardPreferences");
        });
    };

    return self;
})();

export default Lineage_whiteboard;

window.Lineage_whiteboard = Lineage_whiteboard;
