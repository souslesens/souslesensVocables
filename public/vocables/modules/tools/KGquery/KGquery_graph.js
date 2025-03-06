import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import KGquery from "./KGquery.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import OntologyModels from "../../shared/ontologyModels.js";
import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import KGquery_nodeSelector from "./KGquery_nodeSelector.js";

/**
 * Module for managing the visual graph representation in the KG query interface.
 * Handles graph initialization, visualization, and interaction.
 * @module KGquery_graph
 */
var KGquery_graph = (function () {
    var self = {};
    self.visjsData = null;

    /**
     * Initializes the graph interface.
     * Sets up tabs and populates color and shape selectors.
     * @function
     * @name init
     */
    self.init = function () {
        $("#KGquery_leftPanelTabs").tabs();

        common.fillSelectWithColorPalette("KGquery_graph_nodeColorSelect");
        var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
        common.fillSelectOptions("KGquery_graph_nodeShapeSelect", shapes, true);
    };

    /**
     * Configuration options for the Visjs graph visualization.
     * @property {Object} visjsOptions
     */
    self.visjsOptions = {
        onclickFn: function (node, point, nodeEvent) {
            if (!node) {
                return;
            }
            if (node.from) {
                self.currentGraphNode = null;
                KGquery.addEdge(node, nodeEvent);
            } else {
                self.currentGraphNode = node;
                if (nodeEvent.ctrlKey) {
                    NodeInfosWidget.showNodeInfos(KGquery.currentSource, node, "smallDialogDiv", {});
                } else {
                    KGquery.addNode(node, nodeEvent);
                }
            }
        },
        visjsOptions: {
            manipulation: {
                enabled: false,
                initiallyActive: true,
                deleteNode: false,
                deleteEdge: false,

                addEdge: function (edgeData, callback) {
                    // KGquery_graph.addInterGraphLink(edgeData, callback);
                    KGquery_graph.addInterGraphProperty(edgeData, callback);
                    return false;
                },
            },
        },
    };

    /**
     * Default options for nodes in the Visjs graph.
     * @property {Object} visjsNodeOptions
     */
    self.visjsNodeOptions = {
        shape: "box", //Lineage_whiteboard.defaultShape,
        //   size: Lineage_whiteboard.defaultShapeSize,
        color: "#ddd", //Lineage_whiteboard.getSourceColor(source)
    };

    /**
     * Draws the Visjs model based on specified mode.
     * @function
     * @name drawVisjsModel
     * @param {string} mode - The drawing mode ('saved', 'inferred', etc.)
     */
    self.drawVisjsModel = function (mode) {
        var display = "graph";
        var source = KGquery.currentSource;
        var visjsData = { nodes: [], edges: [] };

        //  KGquery.clearAll();
        $("#waitImg").css("display", "block");
        async.series(
            [
                //saved visjgraphData
                function (callbackSeries) {
                    if (mode.indexOf("saved") < 0) {
                        return callbackSeries();
                    }

                    self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", { nodes: [], edges: [] }, self.visjsOptions);
                    var visjsGraphFileName = source + "_KGmodelGraph.json";

                    KGquery_graph.message("loading graph display");
                    self.KGqueryGraph.loadGraph(
                        visjsGraphFileName,
                        null,
                        function (err, result) {
                            if (err) {
                                return callbackSeries("notFound");

                                //self.DrawImportsCommonGraph(source);
                                ///  return callbackSeries("generate commonGraph");
                            }
                            visjsData = result;
                            if (result && result.options && result.options.output) {
                                display = result.options.output;
                            }

                            return callbackSeries();
                        },
                        true
                    );
                },
                //inferred
                function (callbackSeries) {
                    if (mode.indexOf("inferred") < 0) {
                        return callbackSeries();
                    }
                    KGquery_graph.message("generating tbox graph from abox graph");
                    self.getInferredModelVisjsData(KGquery.currentSource, function (err, result2) {
                        if (err) {
                            return alert(err);
                        }
                        var oldNodesMap = {};
                        var oldEdgesMap = {};
                        var newNodes = [];
                        var newEdges = [];
                        visjsData.nodes.forEach(function (item) {
                            oldNodesMap[item.id] = item;
                        });

                        visjsData.edges.forEach(function (item) {
                            oldEdgesMap[item.id] = item;
                        });

                        result2.nodes.forEach(function (item) {
                            if (!oldNodesMap[item.id]) {
                                newNodes.push(item);
                            }
                        });
                        result2.edges.forEach(function (item) {
                            if (!oldEdgesMap[item.id]) {
                                newEdges.push(item);
                            }
                        });

                        visjsData.nodes = visjsData.nodes.concat(newNodes);
                        visjsData.edges = visjsData.edges.concat(newEdges);

                        callbackSeries();
                    });
                },
                // load annotationProperties
                function (callbackSeries) {
                    if (mode.indexOf("inferred") < 0) {
                        return callbackSeries();
                    }
                    KGquery_graph.message("loading datatypeProperties");
                    OntologyModels.getKGnonObjectProperties(source, {}, function (err, nonObjectPropertiesmap) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        visjsData.nodes.forEach(function (node) {
                            if (nonObjectPropertiesmap[node.data.id]) {
                                if (!node.data.nonObjectProperties) {
                                    node.data.nonObjectProperties = [];
                                }
                                node.data.nonObjectProperties = node.data.nonObjectProperties.concat(nonObjectPropertiesmap[node.data.id].properties);
                            }
                        });
                        callbackSeries();
                    });
                }, //Add decoration data from decorate file
                function (callbackSeries) {
                    if (mode.indexOf("saved") < 0) {
                        return callbackSeries();
                    }
                    var fileName = MainController.currentSource + "_decoration.json";
                    //Get current decoration file
                    var payload = {
                        dir: "graphs/",
                        fileName: fileName,
                    };
                    //get decoration file
                    $.ajax({
                        type: "GET",
                        url: `${Config.apiUrl}/data/file`,
                        data: payload,
                        dataType: "json",
                        success: function (result, _textStatus, _jqXHR) {
                            var data = JSON.parse(result);

                            for (var node in data) {
                                var visjsCorrespondingNode = visjsData.nodes.filter((attr) => attr.id === node)[0];
                                for (var decoration in data[node]) {
                                    //decoration = clé de décoration
                                    if (visjsCorrespondingNode) {
                                        visjsCorrespondingNode[decoration] = data[node][decoration];
                                    }
                                }
                            }
                            // J'ajoute mes différentes décorations aux classes visés dans le visjsdata
                            // Si j'ai des icones je  met dans un répertoire côté client les icones nécessaires à ce graph
                            callbackSeries();
                        },
                        error(err) {
                            return callbackSeries("no decoration");
                        },
                    });
                },

                function (callbackSeries) {
                    return callbackSeries();
                },

                //change shape of nodes without nonObjectProperties
                function (callbackSeries) {
                    callbackSeries();
                },
            ],
            function (err) {
                if (err && err != "no decoration") {
                    if (err == "notFound") {
                        return self.drawVisjsModel("inferred");
                    }
                    KGquery_graph.message("", true);
                    return alert(err);
                }
                KGquery_graph.message("drawing graph");

                var newNodes = [];
                visjsData.nodes.forEach(function (node) {
                    node.x = node.x || 0;
                    node.y = node.y || 0;
                    //node.fixed = false;
                    newNodes.push(node);
                });
                visjsData.nodes = newNodes;
                self.visjsData = visjsData;
                if (display == "list") {
                    return KGquery_nodeSelector.showInferredModelInJstree(visjsData);
                }
                /*self.visjsOptions.visjsOptions.physics={enabled: true,
                stabilization: {
                  enabled: true,
                  iterations: 1000, // Nombre d'itérations pour stabiliser le réseau
                  updateInterval: 25,
                  onlyDynamicEdges: false,
                  fit: true
                }};*/
                self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", visjsData, self.visjsOptions);

                // cannot get colors from loadGraph ???!!
                self.KGqueryGraph.draw(function () {
                    self.simulationOn = true;
                    var newNodes = [];
                    visjsData.nodes.forEach(function (node) {
                        newNodes.push({ id: node.id, color: node.color, shape: node.shape });
                    });
                    //    self.KGqueryGraph.data.nodes.update(visjsData.nodes);
                    KGquery_graph.message("", true);
                    var nodes_sizes = [];
                    self.KGqueryGraph.data.nodes.get().forEach(function (node) {
                        //delete node.x;
                        //delete node.y;
                        if (node.size) {
                            node.originalSize = node.size;
                        }

                        nodes_sizes.push(node);
                    });
                    self.KGqueryGraph.data.nodes.update(nodes_sizes);
                    self.KGqueryGraph.network.moveTo({
                        position: { x: 0, y: 0 }, // Position centrale, à ajuster si nécessaire
                        scale: 1 / 0.9,
                    });
                    self.KGqueryGraph.onScaleChange();
                });

                //  KGquery.clearAll();
            }
        );
    };

    /**
     * Starts or stops the graph simulation.
     * @function
     * @name startStopSimulation
     */
    self.startStopSimulation = function () {
        if (!self.simulationOn) {
            self.KGqueryGraph.network.startSimulation();
        } else {
            self.KGqueryGraph.network.stopSimulation();
        }
        self.simulationOn = !self.simulationOn;
    };

    /**
     * Draws a common graph for imports.
     * @function
     * @name DrawImportsCommonGraph
     */
    self.DrawImportsCommonGraph = function () {
        var source = KGquery.currentSource;
        var sources = [source];
        var imports = Config.sources[source].imports;
        if (imports) {
            sources = sources.concat(imports);
        }

        self.saveVisjsModelGraph();
        var visjsData = { nodes: [], edges: [] };
        var uniqueNodes = {};
        self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", { nodes: [], edges: [] }, self.visjsOptions);
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var visjsGraphFileName = source + "_KGmodelGraph.json";

                KGquery_graph.message("loading graph display");
                self.KGqueryGraph.loadGraph(
                    visjsGraphFileName,
                    null,
                    function (err, result) {
                        if (!err && result.nodes) {
                            result.nodes.forEach(function (node) {
                                if (!uniqueNodes[node.id]) {
                                    uniqueNodes[node.id] = 1;
                                    node.x = null;
                                    node.y = null;
                                    //node.fixed = false;
                                    visjsData.nodes.push(node);
                                }
                            });
                            result.edges.forEach(function (edge) {
                                if (!uniqueNodes[edge.id]) {
                                    uniqueNodes[edge.id] = 1;
                                    visjsData.edges.push(edge);
                                }
                            });
                        }

                        callbackEach();
                    },
                    true
                );
            },
            function (err) {
                if (err) {
                    return alert(err);
                }

                self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", visjsData, self.visjsOptions);

                // cannot get colors from loadGraph ???!!
                self.KGqueryGraph.draw(function () {
                    self.simulationOn = true;
                    var newNodes = [];
                    visjsData.nodes.forEach(function (node) {
                        newNodes.push({ id: node.id, color: node.color, shape: node.shape });
                    });
                    //  self.KGqueryGraph.data.nodes.update(visjsData.nodes);
                });
                KGquery_graph.message("xx3", true);
            }
        );
    };

    /**
     * Gets inferred model data for Visjs visualization.
     * @function
     * @name getInferredModelVisjsData
     * @param {string} source - The source to get model data from
     * @param {Function} callback - Callback function called with (error, visjsData)
     */
    self.getInferredModelVisjsData = function (source, callback) {
        KGquery_graph.message("creating graph");

        if (!source) {
            source = self.source;
        }
        var inferredModel = [];
        var nonObjectProperties = {};
        var existingNodes = {};
        var visjsData = { nodes: [], edges: [] };
        var sources = []; // Config.sources[source].imports;
        if (!sources) {
            sources = [];
        }
        sources.push(source);

        async.eachSeries(
            sources,
            function (source, callbackEach) {
                async.series(
                    [
                        //get effective distinct ObjectProperties
                        function (callbackSeries) {
                            KGquery_graph.message("getInferredModel");
                            OntologyModels.getInferredModel(source, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                inferredModel = inferredModel.concat(result);

                                callbackSeries();
                            });
                        },

                        function (callbackSeries) {
                            KGquery_graph.message("getInferredClassValueDataTypes");
                            OntologyModels.getInferredClassValueDataTypes(source, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                result.forEach(function (item) {
                                    if (item.datatype) {
                                        if (!nonObjectProperties[item.class.value]) {
                                            nonObjectProperties[item.class.value] = [];
                                        }
                                        nonObjectProperties[item.class.value].push({
                                            label: Sparql_common.getLabelFromURI(item.prop.value),
                                            id: item.prop.value,
                                            datatype: item.datatype.value,
                                        });
                                    }
                                });
                                callbackSeries();
                            });
                        },
                        function (callbackSeries) {
                            KGquery_graph.message("getContainerBreakdownClasses");
                            OntologyModels.getContainerBreakdownClasses(source, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.forEach(function (item) {
                                    var edegId = common.getRandomHexaId(5);
                                    visjsData.edges.push({
                                        id: edegId,
                                        from: item.sClass.value,
                                        to: item.oClass.value,
                                        arrows: "to",
                                        label: "->",
                                        font: { ital: true },
                                        dashes: [5, 5],
                                        selfReference: { renderBehindTheNode: true, size: 50 },
                                        data: { propertyId: "rdfs:member" },
                                    });
                                });
                                return callbackSeries();
                            });
                        },
                    ],
                    function (err) {
                        KGquery_graph.message("");
                        if (err) {
                            return callbackEach(err);
                        }

                        return callbackEach(null);
                    }
                );
            },
            function (err) {
                if (err) {
                    return callback();
                }
                if (inferredModel.length == 0) {
                    callback("no inferred model for source " + source);
                }

                var reflexiveEdges = {};
                inferredModel.forEach(function (item) {
                    item.sClass = item.sClass || item.sparent;
                    item.oClass = item.oClass || item.oparent;

                    item.sClassLabel = item.sClassLabel || item.sparentLabel;
                    item.oClassLabel = item.oClassLabel || item.oparentLabel;

                    if (!existingNodes[item.sClass.value]) {
                        existingNodes[item.sClass.value] = 1;
                        self.visjsNodeOptions.color = common.getResourceColor("class", item.sClass.value, "palette");
                        self.visjsNodeOptions.color = Lineage_whiteboard.getSourceColor(source);
                        var label = item.sClassLabel ? item.sClassLabel.value : Sparql_common.getLabelFromURI(item.sClass.value);
                        self.visjsNodeOptions.data = { nonObjectProperties: nonObjectProperties[item.sClass.value], source: source, id: item.sClass.value, label: label };

                        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.sClass.value, label, null, self.visjsNodeOptions));
                    }
                    if (!existingNodes[item.oClass.value]) {
                        existingNodes[item.oClass.value] = 1;
                        var label = item.oClassLabel ? item.oClassLabel.value : Sparql_common.getLabelFromURI(item.oClass.value);
                        self.visjsNodeOptions.data = { source: source, nonObjectProperties: nonObjectProperties[item.oClass.value], id: item.oClass.value, label: label };
                        //  self.visjsNodeOptions.color = common.getResourceColor("class", item.oClass.value, "palette");
                        self.visjsNodeOptions.color = Lineage_whiteboard.getSourceColor(source);
                        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.oClass.value, label, null, self.visjsNodeOptions));
                    }
                    var edgeId = item.sClass.value + "_" + item.prop.value + "_" + item.oClass.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        var edge = {
                            id: edgeId,
                            from: item.sClass.value,
                            to: item.oClass.value,
                            label: item.propLabel.value,
                            font: { color: Lineage_whiteboard.defaultPredicateEdgeColor },
                            data: {
                                propertyId: item.prop.value,
                                source: source,
                                propertyLabel: item.propLabel.value,
                            },

                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "solid",
                                    scaleFactor: 0.5,
                                },
                            },
                            // dashes: true,
                            color: Lineage_whiteboard.defaultPredicateEdgeColor,
                        };
                        if (item.sClass.value == item.oClass.value) {
                            if (!reflexiveEdges[item.sClass.value]) {
                                reflexiveEdges[item.sClass.value] = 0;
                            }

                            var edgeSize = 30 + reflexiveEdges[item.sClass.value];

                            (edge.dashes = [5, 5]), (edge.selfReference = { renderBehindTheNode: true, size: edgeSize });
                            reflexiveEdges[item.sClass.value] += 15;
                        }
                        visjsData.edges.push(edge);
                    }
                });
                KGquery_graph.message("xx4", true);
                return callback(null, visjsData);
            }
        );
    };

    /**
     * Enables edge mode in the graph.
     * @function
     * @name setEdgeMode
     */
    self.setEdgeMode = function () {
        self.KGqueryGraph.network.addEdgeMode();
    };

    /**
     * Sets an attribute for the current node.
     * @function
     * @name setNodeAttr
     * @param {string} attr - The attribute to set
     * @param {*} value - The value to set
     */
    self.setNodeAttr = function (attr, value) {
        if (!self.currentGraphNode) {
            return;
        }

        var newNode = {
            id: self.currentGraphNode.id,
            [attr]: value,
        };
        self.KGqueryGraph.data.nodes.update(newNode);
    };

    /**
     * Sets font size for all nodes.
     * @function
     * @name setAllNodesFontSize
     */
    self.setAllNodesFontSize = function () {
        var fontSize = prompt("font size");
        if (!fontSize) {
            return;
        }
        self.setAllNodesAttr("font", { size: parseInt(fontSize) });
    };

    /**
     * Sets an attribute for all nodes.
     * @function
     * @name setAllNodesAttr
     * @param {string} attr - The attribute to set
     * @param {*} value - The value to set
     */
    self.setAllNodesAttr = function (attr, value) {
        var nodesId = self.KGqueryGraph.data.nodes.getIds();
        var newNodes = [];
        nodesId.forEach(function (id) {
            newNodes.push({
                id: id,
                [attr]: value,
            });
        });
        self.KGqueryGraph.data.nodes.update(newNodes);
    };

    /**
     * Resets Visjs nodes to their initial state.
     * @function
     * @name resetVisjNodes
     * @param {Array} [nodes] - Optional array of nodes to reset
     */
    self.resetVisjNodes = function (nodes) {
        if (!KGquery_graph.KGqueryGraph) {
            return;
        }
        var newNodes = [];

        if (!nodes) {
            nodes = [];
            if (KGquery_graph.KGqueryGraph.data.nodes.get) {
                nodes = KGquery_graph.KGqueryGraph.data.nodes.get();
            } else {
                return;
            }
        }
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }
        nodes.forEach(function (item) {
            newNodes.push({
                id: item.id,
                shape: item.initialShape,
                color: item.initialColor,
            });
        });
        KGquery_graph.KGqueryGraph.data.nodes.update(newNodes);
    };

    /**
     * Resets Visjs edges to their initial state.
     * @function
     * @name resetVisjEdges
     */
    self.resetVisjEdges = function () {
        if (!KGquery_graph.KGqueryGraph) {
            return;
        }
        var newVisjsEdges = [];
        var edges = [];
        if (KGquery_graph.KGqueryGraph.data.edges.getIds) {
            edges = KGquery_graph.KGqueryGraph.data.edges.getIds();
        } else {
            return;
        }

        edges.forEach(function (edgeId, index) {
            newVisjsEdges.push({ id: edgeId, color: Lineage_whiteboard.restrictionColor, width: 1 });
        });
        KGquery_graph.KGqueryGraph.data.edges.update(newVisjsEdges);
    };

    /**
     * Outlines a specific node in the graph.
     * @function
     * @name outlineNode
     * @param {string} nodeId - ID of the node to outline
     */
    self.outlineNode = function (nodeId) {
        if (!KGquery_graph.KGqueryGraph.data.nodes.update) {
            return;
        }
        KGquery_graph.KGqueryGraph.data.nodes.update([{ id: nodeId, color: "#b0f5f5" }]);
        /* setTimeout(function(){
        KGquery_graph.KGqueryGraph.data.nodes.update([{ id: nodeId, shape: "ellipse", color: "#b0f5f5" }]);
        },500)*/
    };
    /**
     * Saves the current Visjs model graph.
     * @function
     * @name saveVisjsModelGraph
     */
    self.saveVisjsModelGraph = function () {
        var fileName = KGquery.currentSource + "_KGmodelGraph.json";
        self.KGqueryGraph.saveGraph(fileName, true);
        return;
    };
    /**
     * Adds an inter-graph property.
     * @function
     * @name addInterGraphProperty
     * @param {Object} edgeData - Data for the edge to add
     */
    self.addInterGraphProperty = function (edgeData) {
        var propertyId = prompt("enter property URI");
        if (!propertyId) {
            return;
        }

        var propertyLabel = prompt("enter property label");
        if (!propertyLabel) {
            return;
        }

        var edge = {
            from: edgeData.from,
            to: edgeData.to,
            id: common.getRandomHexaId(10),
            label: propertyLabel,
            data: {
                propertyId: propertyId,
                source: KGquery.currentSource,
                propertyLabel: propertyLabel,
            },
        };

        self.KGqueryGraph.data.edges.add(edge);
    };

    /**
     * Displays a message in the graph interface.
     * @function
     * @name message
     * @param {string} message - The message to display
     * @param {boolean} [stopWaitImage] - Whether to stop the wait image
     */
    self.message = function (message, stopWaitImage) {
        $("#KGquery_graph_messageDiv").html(message);
    };
    /**
     * Generates common decoration for the graph.
     * @function
     * @name genereateCommonDecoration
     */
    self.genereateCommonDecoration = function () {
        var source = KGquery.currentSource;
        var sources = [];
        var imports = Config.sources[source].imports;
        if (imports) {
            sources = sources.concat(imports);
        }

        //self.saveVisjsModelGraph();

        var commonDecoration = {};

        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var visjsGraphFileName = source + "_decoration.json";
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
                        commonDecoration = { ...commonDecoration, ...data };

                        // J'ajoute mes différentes décorations aux classes visés dans le visjsdata
                        // Si j'ai des icones je  met dans un répertoire côté client les icones nécessaires à ce graph
                        callbackEach();
                    },
                    error(err) {
                        return callbackEach();
                    },
                });
            },
            function (err) {
                if (err) {
                    return alert(err);
                }
                var fileName = MainController.currentSource + "_decoration.json";
                var payload = {
                    dir: "graphs/",
                    fileName: fileName,
                    data: JSON.stringify(commonDecoration),
                };
                $.ajax({
                    type: "POST",
                    url: `${Config.apiUrl}/data/file`,
                    data: payload,
                    dataType: "json",
                    success: function (_result, _textStatus, _jqXHR) {
                        MainController.UI.message("Decoration saved");
                        callbackSeries();
                    },
                    error(err) {
                        return callbackSeries(err);
                    },
                });
            }
        );
    };
    return self;
})();

export default KGquery_graph;
window.KGquery_graph = KGquery_graph;
