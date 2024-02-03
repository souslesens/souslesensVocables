import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import KGquery from "./KGquery.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import OntologyModels from "../../shared/ontologyModels.js";
import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";

var KGquery_graph = (function () {
    var self = {};

    self.init = function () {
        $("#KGquery_leftPanelTabs").tabs();

        common.fillSelectWithColorPalette("KGquery_graph_nodeColorSelect");
        var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
        common.fillSelectOptions("KGquery_graph_nodeShapeSelect", shapes, true);
    };

    self.visjsOptions = {
        onclickFn: function (node, point, nodeEvent) {
            if (!node || node.from) {
                return;
            }
            self.currentGraphNode = node;
            if (nodeEvent.ctrlKey) {
                NodeInfosWidget.showNodeInfos(KGquery.currentSource, node, "smallDialogDiv", {});
            } else {
                KGquery.addNode(node, nodeEvent);
            }
        },
        visjsOptions: {
            manipulation: {
                enabled: false,
                initiallyActive: true,
                deleteNode: false,
                deleteEdge: false,

                addEdge: function (edgeData, callback) {
                    KGquery_graph.addInterGraphLink(edgeData, callback);
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

    self.saveVisjsModelGraph = function () {
        var fileName = KGquery.currentSource + "_KGmodelGraph.json";
        self.KGqueryGraph.saveGraph(fileName, true);
        return;
    };

    self.drawVisjsModel = function (mode) {
        var source = KGquery.currentSource;
        var visjsData = { nodes: [], edges: [] };

        //  KGquery.clearAll();

        async.series(
            [
                //saved visjgraphData
                function (callbackSeries) {
                    if (mode.indexOf("saved") < 0) {
                        return callbackSeries();
                    }

                    self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", { nodes: [], edges: [] }, self.visjsOptions);
                    var visjsGraphFileName = source + "_KGmodelGraph.json";
                    self.KGqueryGraph.loadGraph(visjsGraphFileName, null, function (err, result) {
                        if (err) {
                            return callbackSeries("notFound");
                        }
                        visjsData = result;
                        return callbackSeries();
                    });
                },
                //inferred
                function (callbackSeries) {
                    if (mode.indexOf("inferred") < 0) {
                        return callbackSeries();
                    }

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
                    OntologyModels.getInferredAnnotationProperties(source, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var annotationPropertiesmap = {};
                        result.forEach(function (item) {
                            if (!annotationPropertiesmap[item.class.value]) {
                                annotationPropertiesmap[item.class.value] = { label: item.classLabel.value, id: item.class.value, properties: [] };
                            }
                            annotationPropertiesmap[item.class.value].properties.push({ label: item.propLabel.value, id: item.prop.value });
                        });
                        visjsData.nodes.forEach(function (node) {
                            if (annotationPropertiesmap[node.data.id]) {
                                node.data.annotationProperties = annotationPropertiesmap[node.data.id].properties;
                            }
                        });
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (err) {
                    if (err == "notFound") {
                        return self.drawVisjsModel("inferred");
                    }
                    return alert(err);
                }

                visjsData.nodes.forEach(function (item) {
                    // item.color="#ddd"
                    if (item.label.indexOf("Date") > -1) item.color = "#96f696";
                    else item.color = "#f3ebbe";
                    item.initialColor = item.color;
                    item.initialShape = item.shape;
                });

                self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", visjsData, self.visjsOptions);

                // cannot get colors from loadGraph ???!!
                self.KGqueryGraph.draw(function () {
                    var newNodes = [];
                    visjsData.nodes.forEach(function (node) {
                        newNodes.push({ id: node.id, color: node.color, shape: node.shape });
                    });
                    self.KGqueryGraph.data.nodes.update(newNodes);
                });

                //  KGquery.clearAll();
            }
        );
    };

    self.getInferredModelVisjsData = function (source, callback) {
        if (!source) {
            source = self.source;
        }
        var inferredModel = [];
        var dataTypes = {};
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
                            OntologyModels.getInferredModel(source, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                inferredModel = inferredModel.concat(result);

                                callbackSeries();
                            });
                        },

                        function (callbackSeries) {
                            OntologyModels.getInferredClassValueDataTypes(source, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                result.forEach(function (item) {
                                    dataTypes[item.class.value] = item.datatype.value;
                                });
                                callbackSeries();
                            });
                        },
                    ],
                    function (err) {
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
                        self.visjsNodeOptions.data = { datatype: dataTypes[item.sClass.value], source: source, id: item.sClass.value, label: label };

                        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.sClass.value, label, null, self.visjsNodeOptions));
                    }
                    if (!existingNodes[item.oClass.value]) {
                        existingNodes[item.oClass.value] = 1;
                        var label = item.oClassLabel ? item.oClassLabel.value : Sparql_common.getLabelFromURI(item.oClass.value);
                        self.visjsNodeOptions.data = { source: source, datatype: dataTypes[item.oClass.value], id: item.oClass.value, label: label };
                        //  self.visjsNodeOptions.color = common.getResourceColor("class", item.oClass.value, "palette");
                        self.visjsNodeOptions.color = Lineage_whiteboard.getSourceColor(source);
                        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.oClass.value, label, null, self.visjsNodeOptions));
                    }
                    var edgeId = item.sClass.value + "_" + item.prop.value + "_" + item.oClass.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        visjsData.edges.push({
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
                        });
                    }
                });
                return callback(null, visjsData);
                /*   self.getInterGraphModel(source, visjsData, function(err, result) {

 return callback(null, result);
});*/
            }
        );
    };

    self.getInterGraphModel = function (source, visjsData, callback) {
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "      SELECT   distinct ?sparent ?prop ?oparent where {\n" +
            "{graph  <http://data.total/resource/tsf/new_prodom/> {?s ?x ?y.  ?s rdf:type ?sparent.  ?s rdf:type owl:NamedIndividual.?sparent rdf:type ?sparentType filter (?sparentType!=owl:NamedIndividual)\n" +
            "  }}\n" +
            "{graph <http://data.total/resource/tsf/dalia-lifex/> {?o ?x2 ?y2 .  ?o rdf:type ?oparent.?o rdf:type owl:NamedIndividual.?oparent rdf:type ?oparentType filter (?oparentType!=owl:NamedIndividual) } }\n" +
            "  ?s ?prop ?o. ?p rdf:type  owl:ObjectProperty filter( ?prop !=rdfs:subClassOf)\n" +
            "}limit 100";

        var url = Config.sources[source].sparql_server.url;

        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: source }, function (err, result) {
            if (err) {
                return callbackSeries(err);
            }
            result.results.bindings.forEach(function (item) {
                var label = Sparql_common.getLabelFromURI(item.prop.value);
                var x = visjsData.edges.push({
                    id: item.prop.value,
                    from: item.sparent.value,
                    to: item.oparent.value,

                    label: label,
                    font: { color: Lineage_whiteboard.defaultPredicateEdgeColor },
                    data: {
                        propertyId: item.prop.value,
                        source: source,
                        propertyLabel: label,
                    },

                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },

                    color: Lineage_whiteboard.defaultPredicateEdgeColor,
                });
            });
            return callback(null, visjsData);
        });
    };

    self.addInterGraphLink = function (edgeData, callback) {
        var source = KGquery.currentSource;
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "select distinct ?prop where { ?s ?prop ?o." +
            "?s rdf:type <" +
            edgeData.from +
            ">.?o rdf:type <" +
            edgeData.to +
            ">.} limit 100";

        var url = Config.sources[source].sparql_server.url;
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: source }, function (err, result) {
            if (err) {
                return callbackSeries(err);
            }

            if (result.results.bindings.length == 0) {
                return alert(" no matching triples between " + edgeData.from + " and " + edgeData.to);
            }

            var visjsData = { edges: [] };
            result.results.bindings.forEach(function (item) {
                var label = Sparql_common.getLabelFromURI(item.prop.value);
                var x = visjsData.edges.push({
                    id: edgeData.from + "_" + item.prop.value + "_" + edgeData.to,
                    from: edgeData.from,
                    to: edgeData.to,

                    label: label,
                    font: { color: Lineage_whiteboard.defaultPredicateEdgeColor },
                    data: {
                        propertyId: item.prop.value,
                        source: source,
                        propertyLabel: label,
                    },

                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                });
            });

            self.KGqueryGraph.data.edges.update(visjsData.edges);
        });
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
            if (KGquery_graph.KGqueryGraph.data.nodes.get) nodes = KGquery_graph.KGqueryGraph.data.nodes.get();
            else return;
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
        if (KGquery_graph.KGqueryGraph.data.edges.getIds) edges = KGquery_graph.KGqueryGraph.data.edges.getIds();
        else return;

        edges.forEach(function (edgeId, index) {
            newVisjsEdges.push({ id: edgeId, color: Lineage_whiteboard.restrictionColor, width: 1 });
        });
        KGquery_graph.KGqueryGraph.data.edges.update(newVisjsEdges);
    };

    self.outlineNode = function (nodeId) {
        KGquery_graph.KGqueryGraph.data.nodes.update([{ id: nodeId, color: "#b0f5f5" }]);
        /* setTimeout(function(){
        KGquery_graph.KGqueryGraph.data.nodes.update([{ id: nodeId, shape: "ellipse", color: "#b0f5f5" }]);
        },500)*/
    };

    return self;
})();

export default KGquery_graph;
window.KGquery_graph = KGquery_graph;
