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

var KGquery_graph = (function () {
    var self = {};
    self.visjsData = null;

    self.init = function () {
        $("#KGquery_leftPanelTabs").tabs();

        common.fillSelectWithColorPalette("KGquery_graph_nodeColorSelect");
        var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
        common.fillSelectOptions("KGquery_graph_nodeShapeSelect", shapes, true);
    };

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

    self.drawVisjsModel = function (mode, options) {
        var display = "graph";
        var source = KGquery.currentSource;
        var visjsData = { nodes: [], edges: [] };

        //  KGquery.clearAll();
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        var savedGraphLocation='UserData';
        async.series(
            [
                //saved visjgraphData default saved in user_data
                function (callbackSeries) {
                    if (mode.indexOf("saved") < 0) {
                        return callbackSeries();
                    }
                    self.KGqueryGraph = new VisjsGraphClass(
                        "KGquery_graphDiv",
                        {
                            nodes: [],
                            edges: [],
                        },
                        self.visjsOptions,
                    );

                
                    UserDataWidget.listUserData({data_type:'KGmodelGraph',data_tool:'KGquery',data_source:MainController.currentSource}, function (err, result) {
                        if (err) {
                            return alert(err || err.responseText);
                        }
                        if(result.length==0){
                            savedGraphLocation='file';
                        }
                        // order to get last saved instance of our graph in user_data
                        result = result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                        //if graph loaded with loadSaved --> display=checkBox loadAsGraph else last instance graph
                        result.forEach(function (item) {
                            if (item.data_label == source + "_model") {
                                visjsData = item.data_content;
                                display = "graph";
                                if (visjsData && visjsData.options && visjsData.options.output) {
                                    display = visjsData.options.output;
                                }
                            }
                        });
                        if (options.loadAsGraph) {
                            display = "graph";
                        }
                        if (options.loadAsGraph == false) {
                            display = "list";
                        }
                        if (display == "graph") {
                            $("#KGquery_loadAsGraph").prop("checked", true);
                        } else {
                            $("#KGquery_loadAsGraph").prop("checked", false);
                        }

                        return callbackSeries();
                    });

                        
                    

                   
                },
                // get from file if the transition to userData is not done
                function (callbackSeries) {
                    if (mode.indexOf("saved") < 0) {
                        return callbackSeries();
                    }
                    if(savedGraphLocation!='file'){
                        return callbackSeries();
                    }
                    var visjsGraphFileName = source + "_KGmodelGraph.json";

                    KGquery_graph.message("loading graph display");
                    self.KGqueryGraph.loadGraph(
                        visjsGraphFileName,
                        null,
                        function (err, result) {
                            if (err) {
                                return callbackSeries("notFound");

                            }
                            visjsData = result;
                            if (result && result.options && result.options.output) {
                                display = result.options.output;
                            }

                            return callbackSeries();
                        },
                        true,
                    );

                },
                //inferred
                function (callbackSeries) {
                    if (mode.indexOf("inferred") < 0) {
                        return callbackSeries();
                    }
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
                    // Draw a empty graph to fit with the object self.KGqueryGraph that has no nodes and edges

                    self.KGqueryGraph.draw(function () {});
                    return KGquery_nodeSelector.showImplicitModelInJstree(visjsData);
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
                    var nodes_fonts = [];
                    visjsData.nodes.forEach(function (node) {
                        //delete node.x;
                        //delete node.y;
                        if (node.font) {
                            nodes_fonts.push({id:node.id,font:node.font});
                        }
                    });
                    self.KGqueryGraph.data.nodes.update(nodes_fonts);
                    if(savedGraphLocation=='file'){
                        self.saveVisjsModelGraph();
                    }
                });

                //  KGquery.clearAll();
            },
        );
    };

    self.startStopSimulation = function () {
        if (!self.simulationOn) {
            self.KGqueryGraph.network.startSimulation();
        } else {
            self.KGqueryGraph.network.stopSimulation();
        }
        self.simulationOn = !self.simulationOn;
    };

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
                /*var visjsGraphFileName = source + "_KGmodelGraph.json";

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
                    true,
                );*/
                var visjsDataSource = { nodes: [], edges: [] };
                UserDataWidget.listUserData(null, function (err, result) {
                    if (err) {
                        return alert(err || err.responseText);
                    }
                    // order to get last saved instance of our graph in user_data
                    result = result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    //if graph loaded with loadSaved --> display=checkBox loadAsGraph else last instance graph
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

                            (edge.dashes = [5, 5]), (edge.selfReference = { renderBehindTheNode: true, size: edgeSize });
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

    self.setEdgeMode = function () {
        self.KGqueryGraph.network.addEdgeMode();
    };

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

    self.setAllNodesFontSize = function () {
        var fontSize = prompt("font size");
        if (!fontSize) {
            return;
        }
        self.setAllNodesAttr("font", { size: parseInt(fontSize) });
    };
    self.setAllNodesSizes = function () {
        var size = prompt(" size");
        if (!size) {
            return;
        }
        self.setAllNodesAttr("size",  parseInt(size) );
        self.KGqueryGraph.onScaleChange();

    };
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
    self.saveVisjsModelGraph = function () {
        var nodes = KGquery_graph.KGqueryGraph.data.nodes.get();
        var edges = KGquery_graph.KGqueryGraph.data.edges.get();
        var positions = KGquery_graph.KGqueryGraph.network.getPositions();
        var options = {};
        $("#KGquery_loadAsGraph").prop("checked", true);
        if (KGquery_graph.KGqueryGraph.data.edges.get().length > 30) {
            if (confirm("many Edges: choose  list display mode?")) {
                options.output = "list";
                $("#KGquery_loadAsGraph").prop("checked", false);
            }
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
        var data_type='KGmodelGraph'
        UserDataWidget.saveMetadata(label, data_type, data, group, function (err, result) {
            $("#KGquery_messageDiv").text("saved graph");
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
    self.loadSaved = function () {
        var loadAsGraph = $("#KGquery_loadAsGraph").prop("checked");
        self.drawVisjsModel("saved", { loadAsGraph: loadAsGraph });
    };

    return self;
})();

export default KGquery_graph;
window.KGquery_graph = KGquery_graph;
