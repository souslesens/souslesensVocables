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

                    {label: "someValuesFrom", id: "some"},
                    {label: "allValuesFrom", id: "only"},
                    {label: "hasValue", id: "value"},
                    {label: "maxCardinality", id: "max"},
                    {label: "minCardinality", id: "min"},
                    {label: "cardinality", id: "cardinality"},

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


            var label = ""
            if (nodeType == "Restriction") {
                label = $("#axioms_legend_suggestionsSelect").val();
            } else {
                label = $("#axioms_legend_suggestionsSelect option:selected").text();
            }


            newResource = {
                id: common.getRandomHexaId(5),
                label: label,
                resourceType: nodeType,
                data: {
                    id: resourceUri,
                    label: label,
                    resourceType: nodeType
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

        var visjsNode = Axioms_graph.getVisjsNode(newResource, level)
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
            hiddenNodes.push("Intersection");
            hiddenNodes.push("Union");
            hiddenNodes.push("Intersection");
            hiddenNodes.push("Restriction");
            hiddenNodes.push("Complement");
            hiddenNodes.push("DisjointWith");
        } else if (resourceType == "Restriction") {
            hiddenNodes.push("Restriction");


        } else if (resourceType == "Intersection") {
        } else if (resourceType == "Union") {
        } else if (resourceType == "Complement") {
        }


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
    };

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
            {label: "Union", color: "#70ac47", symbol: "⨆"},
            {label: "Intersection", color: "#70ac47", symbol: "⊓"},
            {label: "Complement", color: "#70ac47", symbol: "┓"},
            {label: "DisjointWith", color: "#70ac47", symbol: "⊑ ┓"},


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

        function recurse(nodeId, predicate) {
            var triple = {}
            var edges = edgesFromMap[nodeId]
            if (!edges) {
                return
            }

            edges.forEach(function (edge) {
                var fromNode=nodesMap[nodeId]
                var toNode = nodesMap[edge.to]
                if (predicate) {
                    triple.s = fromNode.data.id;
                    triple.p = predicate;
                    triple.o = toNode.data.id;
                    triples.push(triple);
                    recurse(toNode.id)
                } else {


                    var nextEdges = edgesFromMap[edge.from]
                    if (!nextEdges) {
                        return
                    }
                    nextEdges.forEach(function (nextEdge) {
                        var nextToNode = nodesMap[nextEdge.to]

                        triple.s = fromNode.data.id;
                        triple.p = toNode.data.id;
                        triple.o = nextToNode.data.id;
                        triples.push(triple);

                        recurse(nextToNode.id)
                    })
                }
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
        nodes: [
            {
                "id": "https://spec.industrialontologies.org/ontology/core/Core/MeasurementProcess",
                "label": "MeasurementProcess",
                "shape": "dot",
                "color": "#00afef",
                "size": 8,
                "level": 0,
                "font": {
                    "bold": true,
                    "color": "#00afef"
                },
                "data": {
                    "id": "https://spec.industrialontologies.org/ontology/core/Core/MeasurementProcess",
                    "label": "MeasurementProcess",
                    "type": "Class"
                },
                "borderWidth": 1
            },
            {
                "id": "bc224",
                "label": "only",
                "shape": "box",
                "color": "#cb9801",
                "size": 8,
                "level": 1,
                "font": null,
                "data": {
                    "id": "bc224",
                    "label": "only",
                    "type": "Restriction"
                },
                "borderWidth": 1
            },
            {
                "id": "https://spec.industrialontologies.org/ontology/core/Core/designatedBy",
                "label": "designated_by",
                "shape": "box",
                "color": "#f5ef39",
                "size": 8,
                "level": 2,
                "font": null,
                "data": {
                    "id": "https://spec.industrialontologies.org/ontology/core/Core/designatedBy",
                    "label": "designated_by",
                    "type": "ObjectProperty"
                },
                "borderWidth": 1
            },
            {
                "id": "https://spec.industrialontologies.org/ontology/core/Core/BusinessFunction",
                "label": "business_function",
                "shape": "dot",
                "color": "#00afef",
                "size": 8,
                "level": 2,
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
                "id": "0aa54",
                "from": "https://spec.industrialontologies.org/ontology/core/Core/MeasurementProcess",
                "to": "bc224"
            },
            {
                "id": "50c28",
                "from": "bc224",
                "to": "https://spec.industrialontologies.org/ontology/core/Core/designatedBy"
            },
            {
                "id": "9d23e",
                "from": "bc224",
                "to": "https://spec.industrialontologies.org/ontology/core/Core/BusinessFunction"
            }
        ]
    }

    self.visjsGraphToTriples(visjsData.nodes, visjsData.edges);


}
    return self;
})();


Axiom_activeLegend.testTriplesCreation()

export default Axiom_activeLegend;
window.Axiom_activeLegend = Axiom_activeLegend;
