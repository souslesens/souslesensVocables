import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axiom_editor from "./axiom_editor.js";
import Axioms_graph from "./axioms_graph.js";


var Axiom_activeLegend = (function () {
        var self = {};
        self.axiomsLegendVisjsGraph = null;

        self.init = function (graphLegendDiv, axiomGraphDiv, source, resource) {
            self.graphLegendDiv = graphLegendDiv;
            self.axiomGraphDiv = axiomGraphDiv;
            self.currentSource = source;
            self.currentResource = resource;
        };
        self.filterSuggestion = function (suggestions, resourceType) {
            var selection = [];
            suggestions.forEach(function (item) {
                if (item.resourceType == resourceType) {
                    selection.push(item);
                }
            });
            return selection;
        };
        self.onLegendNodeClick = function (node, point, nodeEvent) {
            self.currentNodeType = null;
            if (node && node.data) {
                self.currentNodeType = node.data.type;
                self.currentLegendNodeType = node.data.type
                if (node.data.type == "Class") {
                    var classes = Axiom_editor.getAllClasses();


                    common.fillSelectOptions("axioms_legend_suggestionsSelect", classes, false, "label", "id");
                    self.hideLegendItems()
                } else if (node.data.type == "ObjectProperty") {
                    self.hideLegendItems()
                    if (Axioms_graph.currentGraphNode.owlType == "Restriction") {
                        var properties = Axiom_editor.getAllProperties();
                        common.fillSelectOptions("axioms_legend_suggestionsSelect", properties, false, "label", "id");
                    } else {// pertinent ???
                        Axioms_suggestions.getValidPropertiesForClass(self.currentClass.id, function (err, properties) {
                            common.fillSelectOptions("axioms_legend_suggestionsSelect", properties, false, "label", "id");
                        });
                    }
                } else if (node.data.type == "Restriction") {
                    self.hideLegendItems()
                    var suggestions = [

                        {label: "owl:someValuesFrom", id: "some"},
                        {label: "owl:allValuesFrom", id: "only"},
                        {label: "owl:hasValue", id: "value"},
                        {label: "owl:maxCardinality", id: "max"},
                        {label: "owl:minCardinality", id: "min"},
                        {label: "owl:cardinality", id: "cardinality"},

                    ]

                    common.fillSelectOptions("axioms_legend_suggestionsSelect", suggestions, false, "label", "id");
                } else if (node.data.type == "Connective") {
                    self.hideLegendItems()
                    var suggestions = [

                        {label: "Union", id: "owl:unionOf"},
                        {label: "Intersection", id: "owl:intersectionOf"},
                        {label: "Complement", id: "owl:complementOf"},
                        {label: "Enumeration", id: "owl:oneOf"},


                    ]

                    common.fillSelectOptions("axioms_legend_suggestionsSelect", suggestions, false, "label", "id");
                } else {
                    self.onSuggestionsSelect(null, node);
                }
            }
        };
        self.drawNewAxiom = function (selectedObject) {
            var currentNode = {
                id: selectedObject.id,
                label: selectedObject.label,
                owlType: selectedObject.resourceType,
                symbol: null,
            };
            self.currentNodeType = selectedObject.resourceType;

            var visjsData = {nodes: [], edges: []};
            var visjsNode = Axioms_graph.getVisjsNode(currentNode, 0);
            visjsData.nodes.push(visjsNode);
            self.hierarchicalLevel = 0;
            var options = {
                keepHierarchyLayout: true,
                onNodeClick: Axiom_activeLegend.onNodeGraphClick
            }
            Axioms_graph.drawGraph(visjsData, self.axiomGraphDiv, options);
            Axioms_graph.currentGraphNode = visjsNode;
            self.currentResource.visjsId = selectedObject.id

            //   self.hideForbiddenResources(selectedObject);
        };

        self.onNodeGraphClick = function (node, point, nodeEvent) {
            if (node && node.data) {
                self.currentGraphNode = node;
                Axioms_graph.currentGraphNode = node;
                Axioms_graph.outlineNode(Axioms_graph.currentGraphNode.id)
                Axiom_activeLegend.hideForbiddenResources("" + node.data.type);
                if (nodeEvent.ctrlKey) {
                    if (node.data.type.indexOf("Class") > -1 || node.data.type.indexOf("ObjectProperty") > -1) {
                        NodeInfosWidget.showNodeInfos(Axiom_editor.currentSource, node, "mainDialogDiv");
                    }
                }
            } else {
                self.currentGraphNode = null;
                Axioms_graph.currentGraphNode = null;
            }
        };

        self.onSuggestionsSelect = function (resourceUri, legendNode) {
            var newResource;

            var nodeType = self.currentLegendNodeType


            if (legendNode) {

                newResource = {
                    id: common.getRandomHexaId(5),
                    label: legendNode.label,
                    resourceType: legendNode.label,
                    symbol: legendNode.data.symbol,
                    data: {
                        id: common.getRandomHexaId(5),
                        label: legendNode.label,
                        resourceType: legendNode.label,
                    },
                    predicates: []
                }

            } else if (nodeType == "Class") {
                newResource = Axiom_editor.allResourcesMap[resourceUri];
                self.currentClass = newResource
            } else if (nodeType == "ObjectProperty") {
                newResource = Axiom_editor.allResourcesMap[resourceUri];
                self.currentObjectProperty = newResource

            } else {

                var subType = null
                var label = ""
                if (nodeType == "Restriction") {
                    label = $("#axioms_legend_suggestionsSelect").val();
                    subType = $("#axioms_legend_suggestionsSelect option:selected").text();
                } else {
                    label = $("#axioms_legend_suggestionsSelect option:selected").text();
                    subType = $("#axioms_legend_suggestionsSelect").val();
                }
                var symbolsMap = {
                    "Intersection": "⊓",
                    "Union": "⨆",
                    "Complement": "┓"

                }

                newResource = {
                    id: "_:b" + common.getRandomHexaId(10),
                    label: label,
                    resourceType: nodeType,
                    symbol: symbolsMap[label],
                    data: {
                        id: resourceUri,
                        label: label,
                        type: nodeType,
                        subType: subType,

                    },
                    predicates: []
                }

            }
            if (!newResource) {
                return;
            }

            var visjsData = {nodes: [], edges: []};
            var level = Axioms_graph.currentGraphNode.level + 1;
            newResource.owlType = newResource.resourceType
            newResource.level = level

            var visjsNode = Axioms_graph.getVisjsNode(newResource, level);

            visjsData.nodes.push(visjsNode);

            if (Axioms_graph.axiomsVisjsGraph) {
                Axioms_graph.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
                if (Axioms_graph.currentGraphNode) {
                    //  var edgeId = Axioms_graph.currentGraphNode.id + "_" + newResource.id;
                    var edgeId = common.getRandomHexaId(5)
                    visjsData.edges.push({
                        id: edgeId,
                        from: Axioms_graph.currentGraphNode.id,
                        to: newResource.id,
                    });
                    if (newResource.resourceType != "ObjectProperty") {
                        Axioms_graph.currentGraphNode = visjsNode
                        Axioms_graph.outlineNode(Axioms_graph.currentGraphNode.id)
                    }
                    Axioms_graph.axiomsVisjsGraph.data.edges.add(visjsData.edges);
                }

                //
            } else {
                self.hierarchicalLevel = 0;
                var options = {
                    onNodeClick: function (node, event) {
                        Axioms_graph.currentGraphNode = node
                    }

                }
                Axioms_graph.drawGraph(visjsData, self.axiomGraphDiv, options);
            }

            self.hideForbiddenResources(Axioms_graph.currentGraphNode.data.type);
            $("#axioms_legend_suggestionsSelect").empty();
        };


        self.hideForbiddenResources = function (resourceType) {
            var hiddenNodes = [];
            if (resourceType == "Class") {
                hiddenNodes.push("ObjectProperty");
            } else if (resourceType == "ObjectProperty") {
                hiddenNodes.push("ObjectProperty");
                hiddenNodes.push("Class");
                hiddenNodes.push("Restriction");
                hiddenNodes.push("Connective");
                /*  hiddenNodes.push("Union");
                  hiddenNodes.push("Intersection");

                  hiddenNodes.push("Complement");*/
                hiddenNodes.push("DisjointWith");
            } else if (resourceType == "Restriction") {

            }
            /*   } else if (resourceType == "Intersection") {
               } else if (resourceType == "Union") {
               } else if (resourceType == "Complement") {
               }*/


            var edges = Axioms_graph.axiomsVisjsGraph.data.edges.get();
            var nodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
            var nodesMap = {}
            nodes.forEach(function (node) {
                nodesMap[node.id] = node
            })
            var numberOfEdgesFromCurrentGraphNode = 0


            if (resourceType == "Intersection" || resourceType == "Union" || resourceType == "Complement") {
                ;
            } else {
                edges.forEach(function (edge) {
                    if (edge.from == Axioms_graph.currentGraphNode.id) {
                        if (resourceType != "Class") {
                            var nodeToType = nodesMap[edge.to].data.type;

                            hiddenNodes.push(nodeToType);
                        }
                        numberOfEdgesFromCurrentGraphNode += 1

                    }
                })
            }


            hiddenNodes.push(Axioms_graph.currentGraphNode.type);
            if (numberOfEdgesFromCurrentGraphNode > 1 && resourceType != "DisjointWith")//dont alllow more than two edges from a node
            {
                hiddenNodes = null
            }

            self.hideLegendItems(hiddenNodes)

            //  });
        }
        ;

        self.hideLegendItems = function (hiddenNodes) {
            var legendNodes = self.axiomsLegendVisjsGraph.data.nodes.getIds();
            var newNodes = [];
            legendNodes.forEach(function (nodeId) {
                var hidden = !hiddenNodes || hiddenNodes.indexOf(nodeId) > -1;
                newNodes.push({id: nodeId, hidden: hidden});
            });
            Axiom_activeLegend.axiomsLegendVisjsGraph.data.nodes.update(newNodes);
        }

        self.drawLegend = function () {
            var visjsData = {nodes: [], edges: []};


            var legendItems = [

                {label: "Class", color: "#00afef"},
                {label: "ObjectProperty", color: "#f5ef39"},
                {label: "Restriction", color: "#cb9801"},
                {label: "Connective", color: "#70ac47"},
                /*  {label: "Union", color: "#70ac47", symbol: "⨆"},
                  {label: "Intersection", color: "#70ac47", symbol: "⊓"},
                  {label: "Complement", color: "#70ac47", symbol: "┓"},
                  {label: "DisjointWith", color: "#70ac47", symbol: "⊑ ┓"},*/


            ]


            var yOffset = -450
            legendItems.forEach(function (item) {
                visjsData.nodes.push({

                    id: item.label,
                    label: item.label,
                    shape: "box",
                    color: item.color,
                    size: 8,
                    level: -1,
                    font: {
                        bold: true,
                    },
                    data: {
                        id: item.label,
                        label: item.label,
                        type: item.label,
                        symbol: item.symbol
                    },
                    x: 0,
                    y: yOffset,

                    fixed: {x: true, y: true},
                })
                yOffset += 50

            })


            var options = {
                physics: {
                    enabled: true,
                },

                visjsOptions: {},
                onclickFn: Axiom_activeLegend.onLegendNodeClick,
                onRightClickFn: Axiom_activeLegend.showGraphPopupMenu,
            };

            self.axiomsLegendVisjsGraph = new VisjsGraphClass(self.graphLegendDiv, visjsData, options);
            self.axiomsLegendVisjsGraph.draw(function () {
            });
        };

        self.clearAxiom = function () {
            // self.axiomsLegendVisjsGraph.clearGraph();
            Axioms_graph.axiomsVisjsGraph.clearGraph();
            NodeInfosAxioms.newAxiom()

        };

        self.graphToManchesterSyntax = function () {

        }
        self.saveAxiom = function () {
            self.visjsGraphToTriples()
        }


        self.visjsGraphToTriples = function (nodes, edges) {

            if (!edges) {
                edges = Axioms_graph.axiomsVisjsGraph.data.edges.get();
            }
            if (!nodes) {
                nodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
            }
            var nodesMap = {}
            var edgesFromMap = {}
            nodes.forEach(function (node) {
                nodesMap[node.id] = node
            })


            edges.forEach(function (edge) {
                if (!edgesFromMap[edge.from]) {
                    edgesFromMap[edge.from] = []
                }
                edgesFromMap[edge.from].push(edge)
            })

            var triples = []

            function recurse(nodeId, _predicate) {

                var edges = edgesFromMap[nodeId]
                if (!edges) {
                    return
                }

                edges.forEach(function (edge) {
                    var triple = {}
                    var fromNode = nodesMap[nodeId]
                    var toNode = nodesMap[edge.to]

                    var object = toNode.data.id;
                    var predicate = null;
                    if (_predicate) {
                        predicate = _predicate;
                    } else if (fromNode.data.type == "Restriction") {
                        if (toNode.data.type == "ObjectProperty") {
                            predicate = "owl:onProperty"
                        } else {
                            predicate = fromNode.data.subType
                        }

                    } else if (fromNode.data.type == "Class") {
                        predicate = "rdfs:subClassOf"
                    } else if (fromNode.data.type == "ObjectProperty") {
                        ;
                    }else if (fromNode.data.type == "Connective") {
                                




                    }  else {
                        ;
                    }


                    if (predicate) {
                        triple.s = fromNode.data.id;
                        triple.p = predicate;
                        triple.o = object
                        triples.push(triple);
                    }


                    if (toNode.data.type == "Restriction") {
                        triples.push({
                            s: toNode.data.id,
                            p: "rdf:type",
                            o: "owl:Restriction"

                        });
                    }else   if (toNode.data.type == "Connective") {
                        triples.push({
                            s: toNode.data.id,
                            p: "rdf:type",
                            o: "owl:Restriction"

                        });
                    }

                    recurse(toNode.id)

                })
            }


// edgesFromMap[self.currentResource.id].forEach(function (edge) {
//   recurse(self.currentResource.id, self.currentAxiomType)
            recurse(nodes[0].id, "SubClassOf")
// })

            var x = triples


        }


        self.testTriplesCreation = function () {
            var visjsData = {
                nodes:[
                    {
                        "id": "https://spec.industrialontologies.org/ontology/core/Core/DesignativeInformationContentEntity",
                        "label": "designative information content entity",
                        "shape": "dot",
                        "color": "#00afef",
                        "size": 8,
                        "level": 0,
                        "font": {
                            "bold": true,
                            "color": "#00afef"
                        },
                        "data": {
                            "id": "https://spec.industrialontologies.org/ontology/core/Core/DesignativeInformationContentEntity",
                            "label": "designative information content entity",
                            "type": "Class"
                        },
                        "borderWidth": 1
                    },
                    {
                        "id": "_:b5b03383671",
                        "label": "┓",
                        "shape": "circle",
                        "color": "#70ac47",
                        "size": 8,
                        "level": 1,
                        "font": null,
                        "data": {
                            "id": "owl:complementOf",
                            "label": "Complement",
                            "type": "Connective",
                            "subType": "owl:complementOf"
                        },
                        "borderWidth": 1,
                        "_graphPosition": {
                            "x": 329,
                            "y": 214
                        }
                    },
                    {
                        "id": "https://spec.industrialontologies.org/ontology/core/Core/AssemblyProcess",
                        "label": "assembly_process",
                        "shape": "dot",
                        "color": "#00afef",
                        "size": 8,
                        "level": 2,
                        "font": {
                            "bold": true,
                            "color": "#00afef"
                        },
                        "data": {
                            "id": "https://spec.industrialontologies.org/ontology/core/Core/AssemblyProcess",
                            "label": "assembly_process",
                            "type": "Class"
                        },
                        "borderWidth": 1
                    },
                    {
                        "id": "_:b5498d0f17c",
                        "label": "⊓",
                        "shape": "circle",
                        "color": "#70ac47",
                        "size": 8,
                        "level": 2,
                        "font": null,
                        "data": {
                            "id": "owl:intersectionOf",
                            "label": "Intersection",
                            "type": "Connective",
                            "subType": "owl:intersectionOf"
                        },
                        "borderWidth": 1,
                        "_graphPosition": {
                            "x": 359,
                            "y": 251
                        }
                    },
                    {
                        "id": "https://spec.industrialontologies.org/ontology/core/Core/Algorithm",
                        "label": "algorithm",
                        "shape": "dot",
                        "color": "#00afef",
                        "size": 8,
                        "level": 3,
                        "font": {
                            "bold": true,
                            "color": "#00afef"
                        },
                        "data": {
                            "id": "https://spec.industrialontologies.org/ontology/core/Core/Algorithm",
                            "label": "algorithm",
                            "type": "Class"
                        },
                        "borderWidth": 1
                    },
                    {
                        "id": "_:be37acfeb78",
                        "label": "some",
                        "shape": "box",
                        "color": "#cb9801",
                        "size": 8,
                        "level": 3,
                        "font": null,
                        "data": {
                            "id": "some",
                            "label": "some",
                            "resourceType": "Restriction",
                            "subType": "owl:someValuesFrom"
                        },
                        "borderWidth": 1,
                        "_graphPosition": {
                            "x": 420,
                            "y": 271
                        }
                    },
                    {
                        "id": "http://purl.obolibrary.org/obo/BFO_0000084",
                        "label": "generically_depends_on_at_some_time",
                        "shape": "box",
                        "color": "#f5ef39",
                        "size": 8,
                        "level": 4,
                        "font": null,
                        "data": {
                            "id": "http://purl.obolibrary.org/obo/BFO_0000084",
                            "label": "generically_depends_on_at_some_time",
                            "type": "ObjectProperty"
                        },
                        "fixed": false,
                        "borderWidth": 1
                    },
                    {
                        "id": "https://spec.industrialontologies.org/ontology/core/Core/BusinessFunction",
                        "label": "business_function",
                        "shape": "dot",
                        "color": "#00afef",
                        "size": 8,
                        "level": 4,
                        "font": {
                            "bold": true,
                            "color": "#00afef"
                        },
                        "data": {
                            "id": "https://spec.industrialontologies.org/ontology/core/Core/BusinessFunction",
                            "label": "business_function",
                            "type": "Class"
                        },
                        "borderWidth": 5
                    }
                ],
                edges: [
                    {
                        "id": "74732",
                        "from": "https://spec.industrialontologies.org/ontology/core/Core/DesignativeInformationContentEntity",
                        "to": "_:b5b03383671"
                    },
                    {
                        "id": "58559",
                        "from": "_:b5b03383671",
                        "to": "https://spec.industrialontologies.org/ontology/core/Core/AssemblyProcess"
                    },
                    {
                        "id": "10d1a",
                        "from": "_:b5b03383671",
                        "to": "_:b5498d0f17c"
                    },
                    {
                        "id": "06174",
                        "from": "_:b5498d0f17c",
                        "to": "https://spec.industrialontologies.org/ontology/core/Core/Algorithm"
                    },
                    {
                        "id": "fb596",
                        "from": "_:b5498d0f17c",
                        "to": "_:be37acfeb78"
                    },
                    {
                        "id": "7114c",
                        "from": "_:be37acfeb78",
                        "to": "http://purl.obolibrary.org/obo/BFO_0000084"
                    },
                    {
                        "id": "406d3",
                        "from": "_:be37acfeb78",
                        "to": "https://spec.industrialontologies.org/ontology/core/Core/BusinessFunction"
                    }
                ]
            }

            self.visjsGraphToTriples(visjsData.nodes, visjsData.edges);


        }
        return self;
    }
)
();


Axiom_activeLegend.testTriplesCreation()

export default Axiom_activeLegend;
window.Axiom_activeLegend = Axiom_activeLegend;
