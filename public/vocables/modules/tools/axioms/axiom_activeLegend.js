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
                var suggestions = ["allValuesFrom", "someValuesFrom", "hasValue", "maxCardinality", "minCardinality", "cardinality"];

                common.fillSelectOptions("axioms_legend_suggestionsSelect", suggestions, false);
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

        //   self.hideForbiddenResources(selectedObject);
    };

    self.onNodeGraphClick = function (node, point, nodeEvent) {
        if (node && node.data) {
            self.currentGraphNode = node;
            Axioms_graph.currentGraphNode = node;
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
            var label = $("#axioms_legend_suggestionsSelect option:selected").text();
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

        var visjsNode=Axioms_graph.getVisjsNode(newResource, level)
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
           var  numberOfEdgesFromCurrentGraphNode=0
            edges.forEach(function (edge) {
                if (edge.from == Axioms_graph.currentGraphNode.id) {
                    if (resourceType != "Class") {
                        var nodeToType = nodesMap[edge.to].data.type
                        hiddenNodes.push(nodeToType);
                    }
                    numberOfEdgesFromCurrentGraphNode+=1

                }
            })

            hiddenNodes.push(Axioms_graph.currentGraphNode.type);
            if( numberOfEdgesFromCurrentGraphNode>1)//dont alllow more than two edges from a node
                hiddenNodes=null

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
        visjsData.nodes.push(
            {
                id: "Class",
                label: "Class",
                shape: "box",
                color: "#00afef",
                size: 8,
                level: -1,
                font: {
                    bold: true,
                },
                data: {
                    id: "Class",
                    label: "Class Class",
                    type: "Class",
                },
                x: 0,
                y: -400,

                fixed: {x: true, y: true},
            },

            {
                id: "ObjectProperty",
                label: "ObjectProperty",
                shape: "box",
                color: "#f5ef39",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "ObjectProperty",
                    label: "ObjectProperty",
                    type: "ObjectProperty",
                },
                x: 0,
                y: -350,

                fixed: {x: true, y: true},
            },
            {
                id: "Restriction",
                label: "Restriction",
                shape: "box",
                color: "#cb9801",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "Restriction",
                    label: "Restriction",
                    type: "Restriction",
                },

                x: 0,
                y: -300,

                fixed: {x: true, y: true},
            },
            {
                id: "Union",
                label: "⨆ union",
                shape: "box",
                color: "#70ac47",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "Union",
                    label: "⨆ union",
                    type: "Union",
                    symbol: "⨆"
                },

                x: 0,
                y: -250,

                fixed: {x: true, y: true},
            },
            {
                id: "Intersection",
                label: "⊓ Intersection",
                shape: "box",
                color: "#70ac47",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "Intersection",
                    label: "⊓ Intersection",
                    type: "Intersection",
                    symbol: "⊓"
                },

                x: 0,
                y: -200,

                fixed: {x: true, y: true},
            },
            {
                id: "Complement",
                label: "┓ Complement",
                shape: "box",
                color: "#70ac47",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "Complement",
                    label: "┓ Complement",
                    type: "Complement",
                    symbol: "┓"
                },

                x: 0,
                y: -150,

                fixed: {x: true, y: true},
            }
        );
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

    }

    return self;
})();

export default Axiom_activeLegend;
window.Axiom_activeLegend = Axiom_activeLegend;
