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
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";

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
                // var fullNode = (self.KGqueryGraph && self.KGqueryGraph.data && self.KGqueryGraph.data.nodes.get(node.id)) || node;
                // var hasSubclasses = fullNode.data && fullNode.data.subclasses && fullNode.data.subclasses.length > 0;
                // if (hasSubclasses) {
                //     var container = document.getElementById("KGquery_graphDiv");
                //     var rect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
                //     var clickEvent = { clientX: (point && point.x ? point.x : 0) + rect.left, clientY: (point && point.y ? point.y : 0) + rect.top };
                //     self.onSubclassExpandClick(node.id, clickEvent);
                //     return;
                // }
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

        // Check for pending KGmodelGraph userdata
        if (KGquery._pendingKGmodelGraph && KGquery._pendingKGmodelGraph.data_content) {
            self.visjsData = KGquery._pendingKGmodelGraph.data_content;
            KGquery._pendingKGmodelGraph = null;
            $("#waitImg").css("display", "none");
            self.drawModel(options?.displayGraphInList);
            KGquery.initVarNamesMap();
            return;
        }

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
                // add  decoration
                function (callbackSeries) {
                    self.fillDecoration(function (err) {
                        callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (err) {
                    if (err == "notFound") {
                        options.saveGraph = true;
                        return self.drawVisjsModel("inferred", options);
                    }
                    return MainController.errorAlert(err.responseText || err);
                }
                self.drawModel(options.displayGraphInList);

                KGquery.initVarNamesMap();

                if (savedGraphLocation == "file" || options?.saveGraph) {
                    self.saveVisjsModelGraph();
                }
            },
        );
    };

    self.fillDecoration = function (callback) {
        var fileName = MainController.currentSource + "_decoration.json";
        //Get current decoration file
        var payload = {
            dir: "graphs/",
            fileName: fileName,
        };
        if (!self.visjsData && !(self.visjsData?.nodes?.length > 0)) {
            if (callback) {
                return callback();
            }
            return;
        }
        //get decoration file
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                var data = JSON.parse(result);

                for (var node in data) {
                    var visjsCorrespondingNode = self.visjsData.nodes.filter((attr) => attr.id === node)[0];
                    for (var decoration in data[node]) {
                        //decoration = clé de décoration
                        if (visjsCorrespondingNode) {
                            visjsCorrespondingNode[decoration] = data[node][decoration];
                        }
                    }
                }
                // J'ajoute mes différentes décorations aux classes visés dans le visjsdata
                // Si j'ai des icones je  met dans un répertoire côté client les icones nécessaires à ce graph
                if (callback) {
                    return callback();
                }
                return;
            },
            error(err) {
                // don't throw error for decoration
                if (callback) {
                    return callback();
                }
                return;
            },
        });
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
    // Deprecated method replaced by hypergraphMaker_bot
    /* 
    self.DrawImportsCommonGraph = function () {
        var source = KGquery.currentSource;
        var sources = [];
        var imports = Config.sources[source].imports;
        if (imports) {
            sources = sources.concat(imports);
        }
        var visjsData = { nodes: [], edges: [] };
        var uniqueNodes = {};
        self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", { nodes: [], edges: [] }, self.visjsOptions);
        async.eachSeries(
            sources,

            function (source, callbackEach) {
                var visjsDataSource = { nodes: [], edges: [] };
                self.downloadVisjsGraph(source, function (err, result) {
                    if (err && err != "notFound") {
                        return alert(err || err.responseText);
                    }

                    if (result) {
                        visjsDataSource.nodes = result.nodes;
                        visjsDataSource.edges = result.edges;
                    }
                    if (visjsDataSource.nodes) {
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
                    self.visjsData = null;
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return MainController.errorAlert(err);
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
    */
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
                            //skip containers !!!!!!!!!!
                            return callbackSeries();

                            KGquery_graph.message("getContainerBreakdownClasses");
                            OntologyModels.getContainerBreakdownClasses(source, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                /*
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
                                });*/
                                result.forEach(function (item) {
                                    if (item?.propLabel?.value) {
                                        item.propLabel.value = item.propLabel.value + " -->";
                                    }
                                });
                                implicitModel = implicitModel.concat(result);
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
                    return callback(null, null);
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
        } else {
            options.output = "graph";
        }
        /*
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
        var data_type = "KGmodelGraph";*/
        var fileName = KGquery.currentSource + "_KGmodelGraph.json";
        self.visjsData = null;

        options.callback = function () {
            self.visjsData = {};
            self.visjsData.nodes = self.KGqueryGraph.data.nodes.get();
            self.visjsData.edges = self.KGqueryGraph.data.edges.get();
            if (callback) {
                callback();
            }
        };

        self.KGqueryGraph.saveGraph(fileName, true, options);

        return;
        /*if (self.currentUserDataModel && self.currentUserDataModel.id) {
            UserDataWidget.currentTreeNode = { id: self.currentUserDataModel.id };
        }
        UserDataWidget.saveMetadata(label, data_type, data, group, function (err, result) {
            if (err) {
                return MainController.errorAlert(err.responseText || err);
            }
            $("#KGquery_messageDiv").text("saved graph");
            self.currentUserDataModel = { id: result?.id };
            self.visjsData = data;
            if (callback) {
                callback();
            }
        });
        return;*/
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
                    return MainController.errorAlert(err);
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
                        UI.message("Decoration saved");
                    },
                    error(err) {
                        alert(err.responseText || err);
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
        self.visjsData = null;
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
                        $("#KGquery_displayGraphInList").prop("checked", true);
                    } else {
                        $("#KGquery_displayGraphInList").prop("checked", false);
                    }

                    return callback(null, self.visjsData);
                },
                true,
            );
            /*UserDataWidget.listUserData(
                {
                    data_type: "KGmodelGraph",
                    data_tool: "KGquery",
                    data_source: MainController.currentSource,
                },
                function (err, result) {
                    if (err) {
                        return MainController.errorAlert(err || err.responseText);
                    }
                    if (result.length > 0) {
                        // new method in userData
                        // order to get last saved instance of our graph in user_data
                        result = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        if (result[0]?.id) {
                            UserDataWidget.loadUserDatabyId(result[0].id, function (err, result) {
                                if (err) {
                                    return callback("notFound");
                                }
                                if (!result || !result.data_content) {
                                    return callback("notFound");
                                }
                                self.visjsData = result.data_content;
                                self.currentUserDataModel = result;
                                return callback(null, self.visjsData);
                            });
                        }
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
            );*/
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
                    self.getImplicitModelVisjsData(source, function (err, result2) {
                        if (err) {
                            return MainController.errorAlert(err);
                        }

                        if (result2 === null) {
                            return alert("no implicit graph model for source " + source);
                            var transformOntologyToIndividuals = confirm("no implicit graph model . Do you want to generate a SKG from TBOX for source " + source + "");
                            if (transformOntologyToIndividuals) {
                                $("#KGqueryGraph_useSkgUriCBX").prop("checked", true);
                            }
                            return;
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
                },
                // add cardinalities
                function (callbackSeries) {
                    self.addCardinalityToEdges(source, visjsData, function (err) {
                        if (err) {
                            console.log("Error adding cardinalities:", err);
                        }
                        callbackSeries(err);
                    });
                },
                // gestion of subclasses to not overload the graph
                function (callbackSeries) {
                    self.manageSubclasses(source, visjsData, function (err) {
                        if (err) {
                            console.log("Error managing subclasses:", err);
                        }
                        callbackSeries(err);
                    });
                },

                //Add decoration data from decorate file
                function (callbackSeries) {
                    self.fillDecoration(function (err) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        callbackSeries();
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
     * Calculates and adds cardinality information to graph edges
     * @function
     * @name addCardinalityToEdges
     * @memberof module:KGquery_graph
     * @param {string} source - The data source name
     * @param {Object} visjsData - The graph data containing nodes and edges
     * @param {Function} callback - Callback function (err)
     * @returns {void}
     *
     * @description
     * This function calculates the maximum cardinality for each edge in the graph
     * by querying the SPARQL endpoint. The cardinality represents the maximum number
     * of instances of the target class that can be related to a single instance of
     * the source class via the edge's property.
     */
    self.addCardinalityToEdges = function (source, visjsData, callback) {
        if (!visjsData || !visjsData.edges || visjsData.edges.length === 0) {
            return callback();
        }

        KGquery_graph.message("calculating cardinalities for edges");

        // Process edges sequentially to avoid overwhelming the SPARQL endpoint
        async.eachSeries(
            visjsData.edges,
            function (edge, callbackEach) {
                // Skip edges without propertyId
                if (!edge.data || !edge.data.propertyId) {
                    return callbackEach();
                }

                var startClass = edge.from;
                var endClass = edge.to;
                var propertyId = edge.data.propertyId;
                var fromStr = Sparql_common.getFromStr(source);
                // Build SPARQL query to get max cardinality
                var query =
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                    "SELECT (MAX(?count) AS ?maxCardinality) " +
                    fromStr +
                    "WHERE { " +
                    "{ " +
                    "SELECT (COUNT(DISTINCT ?endingInstance) AS ?count) " +
                    "WHERE { " +
                    "?startingInstance rdf:type <" +
                    startClass +
                    ">. " +
                    "?startingInstance <" +
                    propertyId +
                    "> ?endingInstance. " +
                    "?endingInstance rdf:type <" +
                    endClass +
                    ">. " +
                    "} " +
                    "GROUP BY ?startingInstance " +
                    "ORDER BY DESC(?count) " +
                    "} " +
                    "}";

                var url = Config.sources[source].sparql_server.url + "?format=json&query=";
                // Execute SPARQL query
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, cardinalityResult) {
                    if (err) {
                        console.log("Error calculating cardinality for edge " + edge.id + ":", err);
                        // Set default cardinality on error
                        edge.data.maxCardinality = 1;
                        return callbackEach();
                    }

                    // Extract and store cardinality in edge data
                    var cardinality = 1;
                    if (
                        cardinalityResult &&
                        cardinalityResult.results &&
                        cardinalityResult.results.bindings &&
                        cardinalityResult.results.bindings.length > 0 &&
                        cardinalityResult.results.bindings[0].maxCardinality
                    ) {
                        cardinality = parseInt(cardinalityResult.results.bindings[0].maxCardinality.value);
                    }

                    edge.data.maxCardinality = cardinality;
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    console.log("Error processing edge cardinalities:", err);
                }
                KGquery_graph.message("");
                callback(err);
            },
        );
    };
    /**
     * Detects graph nodes that share a common superclass not present in the graph,
     * groups them under a synthetic superclass node, and rewrites edges accordingly.
     *
     * The algorithm works in four phases:
     *  1. **Superclass discovery** — for every node URI, fetch its hierarchy via
     *     `OntologyModels.getClassHierarchyTreeData` and record how many graph nodes
     *     share the same direct superclass.
     *  2. **Common-edge detection** — for each superclass that covers ≥ 2 graph nodes
     *     and is itself absent from the graph, compare each pair of sibling subclasses:
     *     if two subclasses share an outgoing edge (same target + same property) or an
     *     incoming edge (same source + same property), that edge is promoted to the
     *     superclass level and stored in `commonSubClassEdges`.
     *  3. **Superclass node injection** — a new vis.js node is created for every
     *     superclass that has at least one grouped subclass. Its `data.subclasses` lists
     *     the grouped children; its `data.nonObjectProperties` is the union of all
     *     subclasses' datatype properties.
     *  4. **Subclass hiding + edge rewriting** — grouped subclass nodes are hidden
     *     (`hidden: true`); promoted edges have their `from`/`to` replaced by the
     *     superclass URI when the original endpoint was itself a grouped subclass, and
     *     their `id` is rebuilt as `from_propertyIdto`.
     *
     * @function
     * @name manageSubclasses
     * @memberof module:KGquery_graph
     * @param {string}   source    - Source name (key in `Config.sources`).
     * @param {Object}   visjsData - Vis.js graph data mutated in place.
     * @param {Array}    visjsData.nodes - Node array; new superclass nodes are pushed here.
     * @param {Array}    visjsData.edges - Edge array; promoted edges are pushed here.
     * @param {Function} callback  - Error-first callback `(err) => void`.
     * @returns {void}
     */
    self.manageSubclasses = function (source, visjsData, callback) {
        if (!visjsData || !visjsData.edges || visjsData.edges.length === 0) {            
            return callback();
        }
        KGquery_graph.message("managing subclasses ...");
        var nodesUris = visjsData.nodes?.map((node) => node.id) || [];
        // Need at least two nodes for sibling detection to make sense
        if (nodesUris.length < 2) {
            return callback();
        }

        // --- Phase 1: discover direct superclasses for each graph node ---
        var descendatsMaps = {};
        var directSuperClassCounts = {};
        var directSuperClassMaps = {};
        nodesUris.forEach(function (nodeUri) {
            descendatsMaps[nodeUri] = OntologyModels.getClassHierarchyTreeData(source, nodeUri, "descendants");
            if (descendatsMaps[nodeUri] && descendatsMaps[nodeUri].length > 0) {
                var directSuperClass = descendatsMaps[nodeUri][0]?.superClass;
                if(directSuperClass) {
                    directSuperClassCounts[directSuperClass] = (directSuperClassCounts[directSuperClass] || 0) + 1;
                    if (!directSuperClassMaps[directSuperClass]) {
                        directSuperClassMaps[directSuperClass] = [];
                    }
                    directSuperClassMaps[directSuperClass].push(nodeUri);
                }else{
                    console.log("No direct superclass found for node " + nodeUri);
                }

                
            }
        });

        if (Object.keys(directSuperClassCounts).length === 0) {
            return callback();
        }

        // Keep only superclasses shared by ≥ 2 graph nodes and not already in the graph
        var commonSuperClassNotInGraph = Object.keys(directSuperClassCounts).filter(function (item) {
            return directSuperClassCounts[item] > 1 && !nodesUris.includes(item);
        });
        if (commonSuperClassNotInGraph.length === 0) {
            return callback();
        }

        // Map node URI → its direct superclass when that superclass is itself a regrouping target.
        // Used to relax the pair-match in Phase 2: two edges may be considered equivalent when their
        // endpoints differ but both endpoints will be merged under the same regrouping superclass.
        var nodeToRegroupingSuperClass = {};
        nodesUris.forEach(function (nodeUri) {
            var directSuper = descendatsMaps[nodeUri] && descendatsMaps[nodeUri][0] ? descendatsMaps[nodeUri][0].superClass : null;
            if (directSuper && commonSuperClassNotInGraph.includes(directSuper)) {
                nodeToRegroupingSuperClass[nodeUri] = directSuper;
            }
        });

        // --- Phase 2: detect edges shared by sibling subclasses ---
        // commonSubClassEdges[superClassUri] — edges promoted to the superclass level
        // subclassGrouped[superClassUri]     — subclass URIs that will be hidden
        var commonSubClassEdges = {};
        var subclassGrouped = {};
        commonSuperClassNotInGraph.forEach(function (superClassUri) {
            var subClassUris = directSuperClassMaps[superClassUri];

            // Collect all edges touching each subclass, preserving index alignment with subClassUris
            var subclassEdges = [];
            subClassUris.forEach(function (subClassUri) {
                var edgesConcerned = visjsData.edges.filter(function (edge) {
                    return edge.from === subClassUri || edge.to === subClassUri;
                });
                subclassEdges.push(edgesConcerned);
            });

            commonSubClassEdges[superClassUri] = [];
            subclassGrouped[superClassUri] = [];

            // Compare every pair of siblings (i, j) to find matching edges
            for (let i = 0; i < subclassEdges.length; i++) {
                for (let j = i + 1; j < subclassEdges.length; j++) {
                    const edgesGroup1 = subclassEdges[i];
                    const edgesGroup2 = subclassEdges[j];
                    const subClassUri1 = subClassUris[i];
                    const subClassUri2 = subClassUris[j];
                    edgesGroup1.forEach(function (edge1) {
                        edgesGroup2.forEach(function (edge2) {
                            var outgoingTargetsMatch =
                                edge1.to == edge2.to ||
                                (nodeToRegroupingSuperClass[edge1.to] &&
                                    nodeToRegroupingSuperClass[edge1.to] === nodeToRegroupingSuperClass[edge2.to]);
                            var incomingSourcesMatch =
                                edge1.from == edge2.from ||
                                (nodeToRegroupingSuperClass[edge1.from] &&
                                    nodeToRegroupingSuperClass[edge1.from] === nodeToRegroupingSuperClass[edge2.from]);
                            // Outgoing match: both subclasses point to the same target via the same property
                            if (edge1.from == subClassUri1 && edge2.from == subClassUri2 && outgoingTargetsMatch && edge1.data.propertyId == edge2.data.propertyId) {
                                var newEdge = common.array.deepCloneWithFunctions(edge1);
                                newEdge.id = superClassUri + "_" + edge1.data.propertyId + "_" + edge1.to;
                                newEdge.from = superClassUri;
                                var isAlreadyPresent = commonSubClassEdges[superClassUri].some(function (item) {
                                    return item.id === newEdge.id;
                                });
                                if (!isAlreadyPresent) {
                                    commonSubClassEdges[superClassUri].push(common.array.deepCloneWithFunctions(newEdge));
                                }
                                if (!subclassGrouped[superClassUri].includes(subClassUri1)) {
                                    subclassGrouped[superClassUri].push(subClassUri1);
                                }
                                if (!subclassGrouped[superClassUri].includes(subClassUri2)) {
                                    subclassGrouped[superClassUri].push(subClassUri2);
                                }
                            }
                            // Incoming match: both subclasses receive an edge from the same source via the same property
                            if (edge1.to == subClassUri1 && edge2.to == subClassUri2 && incomingSourcesMatch && edge1.data.propertyId == edge2.data.propertyId) {
                                var newEdge = common.array.deepCloneWithFunctions(edge1);
                                newEdge.id = edge1.from + "_" + edge1.data.propertyId + "_" + superClassUri;
                                newEdge.to = superClassUri;
                                var isAlreadyPresent = commonSubClassEdges[superClassUri].some(function (item) {
                                    return item.id === newEdge.id;
                                });
                                if (!isAlreadyPresent) {
                                    commonSubClassEdges[superClassUri].push(common.array.deepCloneWithFunctions(newEdge));
                                }
                                if (!subclassGrouped[superClassUri].includes(subClassUri1)) {
                                    subclassGrouped[superClassUri].push(subClassUri1);
                                }
                                if (!subclassGrouped[superClassUri].includes(subClassUri2)) {
                                    subclassGrouped[superClassUri].push(subClassUri2);
                                }
                            }
                        });
                    });
                }
            }
        });

        // --- Phase 3: inject a synthetic node for each non-empty superclass group ---
        Object.keys(subclassGrouped).forEach(function (superClassUri) {
            if (subclassGrouped[superClassUri].length === 0) {
                return;
            }
            var label = Sparql_common.getLabelFromURI(superClassUri);
            var textMeasureCtx = document.createElement("canvas").getContext("2d");
            textMeasureCtx.font = "14px arial,verdana,sans-serif";
            var textWidthCanvas = textMeasureCtx.measureText(label).width;
            var nodeOptions = {
                shape: self.visjsNodeOptions.shape,
                color: Lineage_whiteboard.getSourceColor(source),
                font: { align: "left" },
                widthConstraint: { minimum: textWidthCanvas + 30 },
                data: {
                    subclasses: subclassGrouped[superClassUri],
                    source: source,
                },
            };
            var node = VisjsUtil.getVisjsNode(source, superClassUri, label, null, nodeOptions);
            node.data.id = superClassUri;
            node.data.label = label;
            // Merge datatype properties from all grouped subclasses
            node.data.nonObjectProperties = subclassGrouped[superClassUri].reduce(function (acc, subClassUri) {
                var subclassNode = visjsData.nodes.find(function (n) {
                    return n.id === subClassUri;
                });
                if (subclassNode && subclassNode.data && subclassNode.data.nonObjectProperties) {
                    return acc.concat(subclassNode.data.nonObjectProperties);
                }
                return acc;
            }, []);
            visjsData.nodes.push(node);
        });

        // --- Phase 4a: hide grouped subclass nodes ---
        // Reverse map: subClassUri → superClassUri (needed by both 4a and 4b)
        var subclassToSuperclassMap = {};
        Object.keys(subclassGrouped).forEach(function (superClassUri) {
            subclassGrouped[superClassUri].forEach(function (subClassUri) {
                subclassToSuperclassMap[subClassUri] = superClassUri;
            });
        });

        var groupedSubclassUris = Object.values(subclassGrouped).reduce(function (acc, subclasses) {
            return acc.concat(subclasses);
        }, []);
        visjsData.nodes.forEach(function (node) {
            if (groupedSubclassUris.includes(node.id)) {
                node.hidden = true;
                if (!node.data) node.data = {};
                node.data.superclass = subclassToSuperclassMap[node.id];
            }
        });

        // --- Phase 4b: for each edge touching a grouped subclass, keep the original edge AND add a
        //     superclass-substituted copy so both the subclass and its superclass stay connected ---

        Object.keys(commonSubClassEdges).forEach(function (superClassUri) {
            commonSubClassEdges[superClassUri].forEach(function (edge) {
                var isOriginalAlreadyPresent = visjsData.edges.some(function (e) {
                    return e.id === edge.id;
                });
                if (!isOriginalAlreadyPresent) {
                    visjsData.edges.push(edge);
                }

                var superFrom = subclassToSuperclassMap[edge.from] || edge.from;
                var superTo = subclassToSuperclassMap[edge.to] || edge.to;
                var superEdge = common.array.deepCloneWithFunctions(edge);
                superEdge.from = superFrom;
                superEdge.to = superTo;
                superEdge.id = superFrom + "_" + edge.data.propertyId + "_" + superTo;
                superEdge.data.subclassEdge = true;
                var isSuperEdgeAlreadyPresent = visjsData.edges.some(function (e) {
                    return e.id === superEdge.id;
                });
                if (!isSuperEdgeAlreadyPresent) {
                    visjsData.edges.push(superEdge);
                }
            });
        });

        // --- Phase 4c: catch edges touching a grouped subclass that Phase 2 missed.
        //     Emit every distinct promotion variant:
        //     (Super(from), to), (from, Super(to)), (Super(from), Super(to)).
        var rawEdgesSnapshot = visjsData.edges.slice();
        rawEdgesSnapshot.forEach(function (edge) {
            var superFromUri = subclassToSuperclassMap[edge.from];
            var superToUri = subclassToSuperclassMap[edge.to];
            if (!superFromUri && !superToUri) {
                return;
            }
            var variants = [];
            if (superFromUri) {
                variants.push({ from: superFromUri, to: edge.to });
            }
            if (superToUri) {
                variants.push({ from: edge.from, to: superToUri });
            }
            if (superFromUri && superToUri) {
                variants.push({ from: superFromUri, to: superToUri });
            }
            variants.forEach(function (variant) {
                if (variant.from === edge.from && variant.to === edge.to) {
                    return;
                }
                var promotedId = variant.from + "_" + edge.data.propertyId + "_" + variant.to;
                var alreadyExists = visjsData.edges.some(function (e) {
                    return e.id === promotedId;
                });
                if (alreadyExists) {
                    return;
                }
                var promotedEdge = common.array.deepCloneWithFunctions(edge);
                promotedEdge.from = variant.from;
                promotedEdge.to = variant.to;
                promotedEdge.id = promotedId;
                promotedEdge.data.subclassEdge = true;
                visjsData.edges.push(promotedEdge);
            });
        });

        return callback();
    };
    /**
     * Gets the original label of an edge (without cardinality suffix)
     * @function
     * @name getEdgeOriginalLabel
     * @memberof module:KGquery_graph
     * @param {Object|string} edge - The edge object or edge ID
     * @returns {string} The original label without cardinality
     *
     * @description
     * This function retrieves the original label of an edge before cardinality
     * was added. It's useful when you need the property name without the "(1)" or "(n)" suffix.
     */
    self.getEdgeOriginalLabel = function (edge) {
        var edgeObj = edge;

        // If edge is a string (ID), find the edge object
        if (typeof edge === "string") {
            edgeObj = self.visjsData.edges.find(function (e) {
                return e.id === edge;
            });
        }

        if (!edgeObj) {
            return "";
        }
        var baseLabel = edgeObj.data.originalLabel || edgeObj.data.propertyLabel || edgeObj.label;
        return baseLabel;
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
                return MainController.errorAlert(err);
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
    /**
     * Creates absolutely-positioned `<button class="arrow-icon slsv">` elements over
     * every vis.js node whose `data.subclasses` is non-empty.
     * The container is set to `position:relative` so child buttons are positioned
     * relative to it. Each button carries a `data-node-id` attribute for later
     * position updates and stores the node id for the click handler.
     */
    self.renderSubclassExpandButtons = function () {
        var container = document.getElementById("KGquery_graphDiv");
        if (!container || !self.KGqueryGraph) return;

        container.style.position = "relative";
        container.querySelectorAll(".subclass-expand-btn").forEach(function (btn) {
            btn.remove();
        });

        var allNodes = self.KGqueryGraph.data.nodes.get();
        var btnNodes = allNodes.filter(function (node) {
            if (node.hidden || !node.data) return false;
            var hasSubclasses = node.data.subclasses && node.data.subclasses.length > 0;
            var hasSuperclass = !!node.data.superclass;
            return hasSubclasses || hasSuperclass;
        });
        if (btnNodes.length === 0) return;

        var ctx = document.createElement("canvas").getContext("2d");
        ctx.font = "14px arial,verdana,sans-serif";
        var widthUpdates = btnNodes.map(function (node) {
            var labelWidth = ctx.measureText(node.label || "").width;
            var newMin = labelWidth + 30;
            var existing = (node.widthConstraint && node.widthConstraint.minimum) || 0;
            return { id: node.id, widthConstraint: { minimum: Math.max(newMin, existing) } };
        });
        self.KGqueryGraph.data.nodes.update(widthUpdates);

        self.KGqueryGraph.network.once("afterDrawing", function () {
            self.renderSubclassExpandButtonsInternal(btnNodes);
        });
    };

    self.renderSubclassExpandButtonsInternal = function (btnNodes) {
        var container = document.getElementById("KGquery_graphDiv");
        if (!container || !self.KGqueryGraph) return;
        var scale = self.KGqueryGraph.network.getScale();
        var btnSize = Math.round(20 * scale);
        var ctx = document.createElement("canvas").getContext("2d");
        ctx.font = "14px arial,verdana,sans-serif";
        btnNodes.forEach(function (node) {
            var positions = self.KGqueryGraph.network.getPositions([node.id]);
            var nodePos = positions[node.id];
            if (!nodePos) return;
            var labelWidth = ctx.measureText(node.label || "").width;
            var domPos = self.KGqueryGraph.network.canvasToDOM({
                x: nodePos.x + labelWidth / 2 + 5,
                y: nodePos.y,
            });
            var isCollapse = !!node.data.superclass && !(node.data.subclasses && node.data.subclasses.length > 0);
            var iconClass = isCollapse ? "arrow-icon-up" : "arrow-icon";
            var transform = isCollapse ? "translate(0,-50%) rotate(-180deg)" : "translate(0,-50%)";
            var btn = document.createElement("button");
            btn.className = iconClass + " slsv slsv-invisible-button subclass-expand-btn";
            btn.dataset.nodeId = node.id;
            btn.dataset.btnType = isCollapse ? "collapse" : "expand";
            btn.style.cssText =
                "position:absolute;" +
                "left:" +
                domPos.x +
                "px;" +
                "top:" +
                domPos.y +
                "px;" +
                "transform:" +
                transform +
                ";" +
                "width:" +
                btnSize +
                "px;" +
                "height:" +
                btnSize +
                "px;" +
                "cursor:pointer;" +
                "pointer-events:all;";
            btn.addEventListener("click", function (event) {
                event.stopPropagation();
                if (isCollapse) {
                    self.onSuperclassCollapseClick(node.id, event);
                } else {
                    self.onSubclassExpandClick(node.id, event);
                }
            });
            container.appendChild(btn);
        });
    };

    /**
     * Updates the `left`/`top` of every `.subclass-expand-btn` to follow their node
     * during zoom and pan. Called on every `afterDrawing` event.
     */
    self.updateSubclassExpandButtonPositions = function () {
        var container = document.getElementById("KGquery_graphDiv");
        if (!container || !self.KGqueryGraph) return;
        var scale = self.KGqueryGraph.network.getScale();
        var btnSize = Math.round(20 * scale);
        var ctx = document.createElement("canvas").getContext("2d");
        ctx.font = "14px arial,verdana,sans-serif";
        container.querySelectorAll(".subclass-expand-btn").forEach(function (btn) {
            var node = self.KGqueryGraph.data.nodes.get(btn.dataset.nodeId);
            if (!node) return;
            var positions = self.KGqueryGraph.network.getPositions([node.id]);
            var nodePos = positions[node.id];
            if (!nodePos) return;
            var labelWidth = ctx.measureText(node.label || "").width;
            var domPos = self.KGqueryGraph.network.canvasToDOM({
                x: nodePos.x + labelWidth / 2 + 1,
                y: nodePos.y,
            });
            btn.style.left = domPos.x + "px";
            btn.style.top = domPos.y + "px";
            btn.style.width = btnSize + "px";
            btn.style.height = btnSize + "px";
        });
    };

    /**
     * Click handler for a superclass node's expand button.
     * @param {string} nodeId - URI of the superclass node.
     */
    self.onSubclassExpandClick = function (nodeId, event) {
        var node = self.KGqueryGraph.data.nodes.get(nodeId);
        if (!node || !node.data || !node.data.subclasses || node.data.subclasses.length === 0) return;

        var html = "";
        node.data.subclasses.forEach(function (subclassUri) {
            var label = self.labelsMap[subclassUri] || Sparql_common.getLabelFromURI(subclassUri);
            html += '    <span class="popupMenuItem" onclick="event.stopPropagation(); KGquery_graph.onSubclassSelected(\'' + nodeId + "', '" + subclassUri + "');\"> " + label + " </span>";
        });

        $("#popupMenuWidgetDiv").html(html);
        var point = { x: event.clientX, y: event.clientY };
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
        self.attachSubclassPopupDismiss();
    };

    self.onSubclassSelected = function (superclassId, subclassId) {
        $(document).off("mousedown.kgquerySubclassDismiss");
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        self.inheritWidthConstraint(superclassId, subclassId);
        self.KGqueryGraph.data.nodes.update({ id: superclassId, hidden: true });
        self.KGqueryGraph.data.nodes.update({ id: subclassId, hidden: false });
        var container = document.getElementById("KGquery_graphDiv");
        if (container) {
            var btn = container.querySelector('.subclass-expand-btn[data-node-id="' + superclassId + '"]');
            if (btn) btn.remove();
        }
        self.renderSubclassExpandButtons();

        var subclassNode = self.KGqueryGraph.data.nodes.get(subclassId);
        if (subclassNode && self.visjsOptions && typeof self.visjsOptions.onclickFn === "function") {
            self.visjsOptions.onclickFn(subclassNode, { x: 0, y: 0 }, { ctrlKey: false });
        }
    };

    self.inheritWidthConstraint = function (fromId, toId) {
        var fromNode = self.KGqueryGraph.data.nodes.get(fromId);
        var toNode = self.KGqueryGraph.data.nodes.get(toId);
        if (!fromNode || !toNode) return;
        var fromMin = (fromNode.widthConstraint && fromNode.widthConstraint.minimum) || 0;
        var toMin = (toNode.widthConstraint && toNode.widthConstraint.minimum) || 0;
        var newMin = Math.max(fromMin, toMin);
        if (newMin > 0) {
            self.KGqueryGraph.data.nodes.update({ id: toId, widthConstraint: { minimum: newMin } });
        }
    };

    /**
     * Click handler for a subclass node's collapse button (returns to superclass).
     * @param {string} nodeId - URI of the subclass node currently shown.
     * @param {Event} event - Click event for popup positioning.
     */
    self.onSuperclassCollapseClick = function (nodeId, event) {
        var node = self.KGqueryGraph.data.nodes.get(nodeId);
        if (!node || !node.data || !node.data.superclass) return;

        var superclassUri = node.data.superclass;
        var label = self.labelsMap[superclassUri] || Sparql_common.getLabelFromURI(superclassUri);
        var html = '    <span class="popupMenuItem" onclick="event.stopPropagation(); KGquery_graph.onSuperclassSelected(\'' + nodeId + "', '" + superclassUri + "');\"> " + label + " </span>";

        $("#popupMenuWidgetDiv").html(html);
        var point = { x: event.clientX, y: event.clientY };
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
        self.attachSubclassPopupDismiss();
    };

    self.attachSubclassPopupDismiss = function () {
        setTimeout(function () {
            $(document).off("mousedown.kgquerySubclassDismiss");
            $(document).on("mousedown.kgquerySubclassDismiss", function (evt) {
                if (!$(evt.target).closest("#popupMenuWidgetDiv").length) {
                    PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
                    $(document).off("mousedown.kgquerySubclassDismiss");
                }
            });
        }, 0);
    };

    self.onSuperclassSelected = function (subclassId, superclassId) {
        $(document).off("mousedown.kgquerySubclassDismiss");
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        self.inheritWidthConstraint(subclassId, superclassId);
        self.KGqueryGraph.data.nodes.update({ id: subclassId, hidden: true });
        self.KGqueryGraph.data.nodes.update({ id: superclassId, hidden: false });
        var container = document.getElementById("KGquery_graphDiv");
        if (container) {
            var btn = container.querySelector('.subclass-expand-btn[data-node-id="' + subclassId + '"]');
            if (btn) btn.remove();
        }
        self.renderSubclassExpandButtons();
    };

    self.drawModel = function (displayGraphInList, callback) {
        if (!self.visjsData) {
            return alert("no graph model");
        }

        if (self.visjsData.nodes && self.visjsData.nodes.length > 200) {
            return alert(" graph model too large " + self.visjsData.nodes.length);
        }

        KGquery_graph.message("drawing graph");
        self.visjsData.nodes = common.removeDuplicatesFromArray(self.visjsData.nodes, "id");
        self.visjsData.edges = common.removeDuplicatesFromArray(self.visjsData.edges, "id");

        // Reset subclass/superclass visibility to default on full redraw:
        // grouped subclasses hidden, synthetic superclasses shown.
        self.visjsData.nodes.forEach(function (node) {
            if (!node.data) return;
            var isSuperclassNode = node.data.subclasses && node.data.subclasses.length > 0;
            var isGroupedSubclass = !!node.data.superclass;
            if (isSuperclassNode) {
                node.hidden = false;
            } else if (isGroupedSubclass) {
                node.hidden = true;
            }
        });

        self.visjsData.nodes.forEach(function (item) {
            self.labelsMap[item.id] = item.label || item.id;
        });

        self.visjsData.edges.forEach(function (item) {
            // Preserve original label if not already saved
            if (!item.data) {
                item.data = {};
            }
            if (!item.data.originalLabel && item.label) {
                item.data.originalLabel = item.label;
            }

            // Get the base label (from original label, propertyLabel, or current label)
            var baseLabel = item.data.originalLabel || item.data.propertyLabel || item.label;

            // Enrich label with cardinality if available
            if (item.data.maxCardinality !== undefined) {
                var cardinalityLabel = item.data.maxCardinality === 1 ? "1" : "n";
                item.label = baseLabel + " : " + cardinalityLabel;
            } else {
                // No cardinality calculated, use base label
                item.label = baseLabel;
            }

            // Update labelsMap with enriched label
            self.labelsMap[item.id] = item.label;
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

            self.renderSubclassExpandButtons();
            self.KGqueryGraph.network.on("afterDrawing", function () {
                self.updateSubclassExpandButtonPositions();
            });

            if (callback) {
                callback();
            }
        });
    };
    self.deleteGraph = function () {
        var confirm = window.confirm("Are you sure you want to delete the graph?");
        if (!confirm) {
            return;
        }
        var confirm = window.confirm("your actual model graph will be deleted, are you really sure?");
        if (!confirm) {
            return;
        }
        self.visjsData = { nodes: [], edges: [] };

        self.KGqueryGraph = null;
        self.drawModel(null, function () {
            KGquery_graph.message("Graph deleted", true);
            KGquery_graph.saveVisjsModelGraph();
        });
    };

    return self;
})();

export default KGquery_graph;
window.KGquery_graph = KGquery_graph;
