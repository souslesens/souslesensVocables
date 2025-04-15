import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import KGquery from "./KGquery.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import OntologyModels from "../../shared/ontologyModels.js";
import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import KGquery_nodeSelector from "./KGquery_nodeSelector.js";
import UserDataWidget from "../../uiWidgets/userDataWidget.js";
import DataSourceManager from "../mappingModeler/dataSourcesManager.js";
import MainController from "../../shared/mainController.js";
import ImportFileWidget from "../../uiWidgets/importFileWidget.js";

var KGquery_graph = (function () {
    var self = {};
    self.visjsData = null;

    self.labelsMap = {};

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

    self.visjsNodeOptions = {
        shape: "box", //Lineage_whiteboard.defaultShape,
        //   size: Lineage_whiteboard.defaultShapeSize,
        color: "#ddd", //Lineage_whiteboard.getSourceColor(source)
    };

    /**
     * Initializes the graph module.
     * Sets up UI components and color options.
     * @function
     * @name init
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.init = function () {
        $("#KGquery_leftPanelTabs").tabs();

        common.fillSelectWithColorPalette("KGquery_graph_nodeColorSelect");
        var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
        common.fillSelectOptions("KGquery_graph_nodeShapeSelect", shapes, true);
    };

    /**
     * Draws a new Vis.js model based on the specified mode.
     * @function
     * @name drawVisjsModel
     * @memberof module:KGquery_graph
     * @param {string} mode - The drawing mode ('saved', 'inferred', etc.)
     * @param {Object} [options] - Additional drawing options
     * @param {boolean} [options.displayGraphInList] - Whether to display the graph in a list
     * @returns {void}
     */
    self.drawVisjsModel = function (mode, options) {
        var source = KGquery.currentSource;
        var visjsData = { nodes: [], edges: [] };

        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        var savedGraphLocation = "UserData";
        async.series(
            [
                //saved visjgraphData default saved in user_data
                function (callbackSeries) {
                    if (mode.indexOf("saved") < 0) {
                        return callbackSeries();
                    }
                    self.downloadVisjsGraph(source, function (err, result) {
                        callbackSeries(err);
                    });
                },
                //inferred
                function (callbackSeries) {
                    if (mode.indexOf("inferred") < 0) {
                        return callbackSeries();
                    }
                    self.buildInferredGraph(source, function (err, result) {
                        callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (err) {
                    return alert(err.responseText || err);
                }
                self.drawModel(options.displayGraphInList);

                if (savedGraphLocation == "file") {
                    self.saveVisjsModelGraph();
                }
            },
        );
    };

    /**
     * Starts or stops the graph simulation.
     * @function
     * @name startStopSimulation
     * @memberof module:KGquery_graph
     * @returns {void}
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
     * Draws a common graph for all imported sources.
     * Combines and deduplicates nodes and edges from multiple sources.
     * @function
     * @name DrawImportsCommonGraph
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.DrawImportsCommonGraph = function () {
        var source = KGquery.currentSource;
        var sources = [];
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
                var visjsDataSource = { nodes: [], edges: [] };
                UserDataWidget.listUserData(null, function (err, result) {
                    if (err) {
                        return alert(err || err.responseText);
                    }
                    // order to get last saved instance of our graph in user_data
                    result = result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    //if graph loaded with loadSaved --> display=checkBox displayGraphInList else last instance graph
                    result.forEach(function (item) {
                        if (item.data_label == source + "_model") {
                            visjsDataSource = item.data_content;
                        }
                    });
                    if (!err && visjsDataSource.nodes) {
                        visjsDataSource.nodes.forEach(function (node) {
                            if (!uniqueNodes[node.id]) {
                                uniqueNodes[node.id] = 1;
                                node.x = null;
                                node.y = null;
                                //node.fixed = false;
                                visjsData.nodes.push(node);
                            }
                        });
                        visjsDataSource.edges.forEach(function (edge) {
                            if (!uniqueNodes[edge.id]) {
                                uniqueNodes[edge.id] = 1;
                                visjsData.edges.push(edge);
                            }
                        });
                    }

                    callbackEach();
                });
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
            },
        );
    };

    /**
     * Gets the implicit model data in Vis.js format.
     * @function
     * @name getImplicitModelVisjsData
     * @memberof module:KGquery_graph
     * @param {string} source - The source to get the model from
     * @param {Function} callback - Callback function
     * @param {Error} callback.err - Error object if operation fails
     * @param {Object} callback.result - The Vis.js formatted data
     * @returns {void}
     */
    self.getImplicitModelVisjsData = function (source, callback) {
        KGquery_graph.message("creating graph");

        if (!source) {
            source = self.source;
        }
        var implicitModel = [];
        var nonObjectProperties = {};
        var existingNodes = {};
        var visjsData = { nodes: [], edges: [] };
        var sources = []; // Config.sources[source].imports;
        if (!sources) {
            sources = [];
        }
        sources.push(source);
        var currentImplicitModel;
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                async.series(
                    [
                        //get effective distinct ObjectProperties
                        function (callbackSeries) {
                            KGquery_graph.message("getImplicitModel");
                            OntologyModels.getImplicitModel(source, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                //  implicitModel = implicitModel.concat(result);

                                currentImplicitModel = result;
                                callbackSeries();
                            });
                        },

                        //get labels
                        function (callbackSeries) {
                            KGquery_graph.message("getImplicitModel");
                            var filter = "?id rdf:type ?type. FILTER (?type in(owl:Class,owl:ObjectProperty))";
                            Sparql_OWL.getDictionary(source, { filter: filter }, null, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                var labelsMap = {};
                                result.forEach(function (item) {
                                    if (item.label) {
                                        labelsMap[item.id.value] = item.label.value;
                                    }
                                });

                                currentImplicitModel.forEach(function (item) {
                                    item.sClassLabel = { value: labelsMap[item.sClass.value] || Sparql_common.getLabelFromURI(item.sClass.value) };
                                    item.oClassLabel = { value: labelsMap[item.oClass.value] || Sparql_common.getLabelFromURI(item.oClass.value) };
                                    item.propLabel = { value: labelsMap[item.prop.value] || Sparql_common.getLabelFromURI(item.prop.value) };

                                    implicitModel.push(item);
                                });

                                //   implicitModel = implicitModel.concat(result);

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
                    },
                );
            },
            function (err) {
                if (err) {
                    return callback();
                }
                if (implicitModel.length == 0) {
                    return callback("no inferred model for source " + source);
                }

                var reflexiveEdges = {};
                implicitModel.forEach(function (item) {
                    item.sClass = item.sClass || item.sparent;
                    item.oClass = item.oClass || item.oparent;

                    item.sClassLabel = item.sClassLabel || item.sparentLabel;
                    item.oClassLabel = item.oClassLabel || item.oparentLabel;

                    if (!existingNodes[item.sClass.value]) {
                        existingNodes[item.sClass.value] = 1;
                        self.visjsNodeOptions.color = common.getResourceColor("class", item.sClass.value, "palette");
                        self.visjsNodeOptions.color = Lineage_whiteboard.getSourceColor(source);
                        var label = item.sClassLabel ? item.sClassLabel.value : Sparql_common.getLabelFromURI(item.sClass.value);
                        self.visjsNodeOptions.data = {
                            nonObjectProperties: nonObjectProperties[item.sClass.value],
                            source: source,
                            id: item.sClass.value,
                            label: label,
                        };

                        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.sClass.value, label, null, self.visjsNodeOptions));
                    }
                    if (!existingNodes[item.oClass.value]) {
                        existingNodes[item.oClass.value] = 1;
                        var label = item.oClassLabel ? item.oClassLabel.value : Sparql_common.getLabelFromURI(item.oClass.value);
                        self.visjsNodeOptions.data = {
                            source: source,
                            nonObjectProperties: nonObjectProperties[item.oClass.value],
                            id: item.oClass.value,
                            label: label,
                        };
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

                            (edge.dashes = [5, 5]),
                                (edge.selfReference = {
                                    renderBehindTheNode: true,
                                    size: edgeSize,
                                });
                            reflexiveEdges[item.sClass.value] += 15;
                        }
                        visjsData.edges.push(edge);
                    }
                });
                KGquery_graph.message("xx4", true);
                return callback(null, visjsData);
            },
        );
    };

    /**
     * Enables edge creation mode in the graph.
     * @function
     * @name setEdgeMode
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.setEdgeMode = function () {
        self.KGqueryGraph.network.addEdgeMode();
    };

    /**
     * Sets an attribute for the currently selected node.
     * @function
     * @name setNodeAttr
     * @memberof module:KGquery_graph
     * @param {string} attr - The attribute name to set
     * @param {*} value - The value to set for the attribute
     * @returns {void}
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
     * Sets the font size for all nodes in the graph.
     * Prompts user for font size value.
     * @function
     * @name setAllNodesFontSize
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.setAllNodesFontSize = function () {
        var fontSize = prompt("font size");
        if (!fontSize) {
            return;
        }
        self.setAllNodesAttr("font", { size: parseInt(fontSize) });
    };

    /**
     * Sets the size for all nodes in the graph.
     * Prompts user for size value.
     * @function
     * @name setAllNodesSizes
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.setAllNodesSizes = function () {
        var size = prompt(" size");
        if (!size) {
            return;
        }
        self.setAllNodesAttr("size", parseInt(size));
        self.KGqueryGraph.onScaleChange();
        self.setDecorationAttr("size", parseInt(size));
    };

    /**
     * Sets an attribute for all nodes in the graph.
     * @function
     * @name setAllNodesAttr
     * @memberof module:KGquery_graph
     * @param {string} attr - The attribute name to set
     * @param {*} value - The value to set for the attribute
     * @returns {void}
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
     * Sets attributes for graph decorations.
     * @function
     * @name setDecorationAttr
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.setDecorationAttr = function () {};

    /**
     * Resets the visual properties of specified nodes.
     * @function
     * @name resetVisjNodes
     * @memberof module:KGquery_graph
     * @param {Array<Object>} nodes - The nodes to reset
     * @returns {void}
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
     * Saves the current Vis.js graph model.
     * @function
     * @name saveVisjsModelGraph
     * @param {Function} [callback] - Callback function called after saving
     */
    self.saveVisjsModelGraph = function (callback) {
        var nodes = KGquery_graph.KGqueryGraph.data.nodes.get();
        var edges = KGquery_graph.KGqueryGraph.data.edges.get();
        var positions = KGquery_graph.KGqueryGraph.network.getPositions();
        var options = {};

        /*   if (KGquery_graph.KGqueryGraph.data.edges.get().length > 30) {
                   if (confirm("many Edges: choose  list display mode?")) {
                       options.output = "list";
                       $("#KGquery_displayGraphInList").prop("checked", true);
                   }
               }*/
        var displayGraphInList = $("#KGquery_displayGraphInList").prop("checked");
        if (displayGraphInList) {
            options.output = "list";
        }

        var data = {
            nodes: nodes,
            edges: edges,
            context: {},
            positions: positions,
            options: options,
        };
        data.nodes.forEach(function (node) {
            if (data.positions[node.id]) {
                node.x = data.positions[node.id].x;
                node.y = data.positions[node.id].y;
            }
        });
        var label = KGquery.currentSource + "_model";
        var group = "KGquery/models";
        var data_type = "KGmodelGraph";
        if (self.currentUserDataModel && self.currentUserDataModel.id) {
            UserDataWidget.currentTreeNode = { id: self.currentUserDataModel.id };
        }
        UserDataWidget.saveMetadata(label, data_type, data, group, function (err, result) {
            $("#KGquery_messageDiv").text("saved graph");
            if (callback) {
                callback();
            }
        });
        return;
        var fileName = KGquery.currentSource + "_KGmodelGraph.json";
        self.KGqueryGraph.saveGraph(fileName, true);
        return;
    };
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

    self.message = function (message, stopWaitImage) {
        $("#KGquery_graph_messageDiv").html(message);
    };
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
            },
        );
    };
    /**
     * Loads a saved graph visualization.
     * @function
     * @name loadSaved
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.loadSaved = function () {
        var displayGraphInList = $("#KGquery_displayGraphInList").prop("checked");
        self.drawVisjsModel("saved", { displayGraphInList: displayGraphInList });
    };

    /**
     * Handles changes in the display graph in list checkbox.
     * @function
     * @name onDisplayGraphInListCBXchange
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.onDisplayGraphInListCBXchange = function () {
        var inList = $("#KGquery_displayGraphInList").prop("checked");
        if (inList) {
            return KGquery_nodeSelector.showImplicitModelInJstree(self.visjsData);
        }
    };

    /**
     * Downloads a previously saved Vis.js graph.
     * @function
     * @name downloadVisjsGraph
     * @memberof module:KGquery_graph
     * @param {string} source - The source identifier
     * @param {Function} callback - Callback function to handle the downloaded graph

     * @returns {void}
     */
    self.downloadVisjsGraph = function (source, callback) {
        self.KGqueryGraph = new VisjsGraphClass(
            "KGquery_graphDiv",
            {
                nodes: [],
                edges: [],
            },
            self.visjsOptions,
        );

        //use Cache
        if (self.visjsData) {
            return callback(null, self.visjsData);
        } else {
            KGquery_graph.message("loading graph display");
            UserDataWidget.listUserData(
                {
                    data_type: "KGmodelGraph",
                    data_tool: "KGquery",
                    data_source: MainController.currentSource,
                },
                function (err, result) {
                    if (err) {
                        return alert(err || err.responseText);
                    }
                    if (result.length > 0 && result[0].data_content) {
                        // new method in userData
                        // order to get last saved instance of our graph in user_data
                        result = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        self.visjsData = result[0].data_content;
                        self.currentUserDataModel = result[0];
                        return callback(null, self.visjsData);
                    } else {
                        // get from file if the transition to userData is not done

                        var visjsGraphFileName = source + "_KGmodelGraph.json";
                        KGquery_graph.message("loading graph display");
                        self.KGqueryGraph.loadGraph(
                            visjsGraphFileName,
                            null,
                            function (err, result) {
                                if (err) {
                                    return callback("notFound");
                                }
                                self.visjsData = result;
                                var display = "graph";
                                if (result && result.options && result.options.output) {
                                    display = result.options.output;
                                }
                                if (display == "list") {
                                    $("#KGquery_displayGraphInList").prop("checked", false);
                                } else {
                                    $("#KGquery_displayGraphInList").prop("checked", true);
                                }

                                return callback(null, self.visjsData);
                            },
                            true,
                        );
                    }
                },
            );
        }
    };
    /**
     * Builds the implicit graph model from predicates.
     * @function
     * @name buildInferredGraph
     * @memberof module:KGquery_graph
     * @param {string} source - The source to build the graph from
     * @param {Function} callback - Callback function

     * @returns {void}
     */
    self.buildInferredGraph = function (source, callback) {
        var visjsData = { nodes: [], edges: [] };
        async.series(
            [
                function (callbackSeries) {
                    KGquery_graph.message("generating tbox graph from abox graph");
                    self.getImplicitModelVisjsData(KGquery.currentSource, function (err, result2) {
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
                            return callbackSeries();
                        },
                    });
                },

                function (callbackSeries) {
                    var newNodes = [];
                    visjsData.nodes.forEach(function (node) {
                        node.x = node.x || 0;
                        node.y = node.y || 0;
                        //node.fixed = false;
                        newNodes.push(node);
                    });
                    visjsData.nodes = newNodes;
                    self.visjsData = visjsData;
                    callbackSeries();
                },
            ],
            function (err) {
                self.visjsData = visjsData;
                return callback(err, visjsData);
            },
        );
    };

    /**
     * Exports the current graph model by saving it first and then downloading it.
     * @function
     * @name exportVisjsGraph
     * @memberof module:KGquery_graph
     * @returns {void}
     */
    self.exportVisjsGraph = function () {
        self.saveVisjsModelGraph(function () {
            self.downloadVisjsGraph(KGquery.currentSource, function (err, result) {
                var fileName = KGquery.currentSource + "_KGmodelGraph" + ".json";
                Export.downloadJSON(result, fileName);
            });
        });
    };

    /**
     * Imports a KG model graph from a JSON file.
     * @function
     * @name importKGmodel
     * @memberof module:KGquery_graph
     * @returns {void}
     *
     * @description
     * This function allows importing a previously exported KG model graph.
     * It loads the JSON file, validates its content, and displays the graph in the interface.
     *
     */
    self.importKGmodel = function () {
        ImportFileWidget.showImportDialog(function (err, result) {
            if (err) {
                return alert(err);
            }
            var data = JSON.parse(result);
            if (!data.nodes || data.nodes.length == 0) {
                return alert("No nodes in file");
            }

            self.visjsData = data;
            var displayGraphInList = $("#KGquery_displayGraphInList").prop("checked");
            self.drawModel(displayGraphInList);
        });
    };

    /**
         * Draws the model using the current visjsData.
         *
         * @function
         * @name drawModel
         * @memberof KGquery_graph
         * @param {boolean} [displayGraphInList] - Whether to display the graph as a list
         * @returns {void}
         *
         * @description
         * This function handles the visualization of the graph model. It performs several steps:
         * 1. Updates the labels map for nodes and edges
         * 2. Determines the display mode (graph or list)
         * 3. Removes duplicate nonObjectProperties from nodes
         * 4. Creates a new VisjsGraph instance
         * 5. Draws the graph with proper:
         *    - Node colors and shapes
         *    - Node sizes
         *    - Node positions and scaling
         *    - Font settings

         */
    self.drawModel = function (displayGraphInList) {
        if (!self.visjsData) {
            return alert("no graph model");
        }
        KGquery_graph.message("drawing graph");

        self.visjsData.nodes.forEach(function (item) {
            self.labelsMap[item.id] = item.label || item.id;
        });

        self.visjsData.edges.forEach(function (item) {
            self.labelsMap[item.id] = item.label || item.id;
        });

        var display = "graph";
        if (self.visjsData.options && self.visjsData.options.output) {
            display = self.visjsData.options.output;
        }
        if (displayGraphInList) {
            display = "list";
        }
        if (displayGraphInList == false) {
            display = "graph";
        }

        if ($("#KGquery_displayGraphInList").prop("checked")) {
            display = "list";
        }
        if (display == "list") {
            $("#KGquery_displayGraphInList").prop("checked", true);
            self.onDisplayGraphInListCBXchange();
        }

        //patch to remove duplicate nonObjectProperties
        self.visjsData.nodes.forEach(function (item) {
            if (item.data && item.data.nonObjectProperties) {
                var uniques = {};
                var newProperties = [];
                item.data.nonObjectProperties.forEach(function (prop) {
                    if (!uniques[prop.id]) {
                        uniques[prop.id] = 1;
                        newProperties.push(prop);
                    }
                });
                item.data.nonObjectProperties = newProperties;
            }
        });

        self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", self.visjsData, self.visjsOptions);

        // cannot get colors from loadGraph ???!!
        self.KGqueryGraph.draw(function () {
            self.simulationOn = true;
            var newNodes = [];
            self.visjsData.nodes.forEach(function (node) {
                newNodes.push({ id: node.id, color: node.color, shape: node.shape });
            });
            KGquery_graph.message("", true);
            var nodes_sizes = [];
            self.KGqueryGraph.data.nodes.get().forEach(function (node) {
                if (node.size) {
                    node.originalSize = node.size;
                }
                nodes_sizes.push(node);
            });
            self.KGqueryGraph.data.nodes.update(nodes_sizes);
            self.KGqueryGraph.network.moveTo({
                position: { x: 0, y: 0 },
                scale: 1 / 0.9,
            });
            self.KGqueryGraph.onScaleChange();
            var nodes_fonts = [];
            self.visjsData.nodes.forEach(function (node) {
                if (node.font) {
                    nodes_fonts.push({ id: node.id, font: node.font });
                }
            });
            self.KGqueryGraph.data.nodes.update(nodes_fonts);
        });
    };

    return self;
})();

export default KGquery_graph;
window.KGquery_graph = KGquery_graph;
