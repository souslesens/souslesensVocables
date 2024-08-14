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
            self.hideForbiddenResources(node.data.type);
            if (node.data.type == "add_Class") {
                var classes = Axiom_editor.getAllClasses();

                common.fillSelectOptions("axioms_legend_suggestionsSelect", classes, false, "label", "id");
            } else if (node.data.type == "add_ObjectProperty") {
                Axioms_suggestions.getValidPropertiesForClass(self.currentClass.id, function (err, properties) {
                    common.fillSelectOptions("axioms_legend_suggestionsSelect", properties, false, "label", "id");
                });
            } else if (node.data.type == "add_Restriction") {
                var suggestions = ["allValuesFrom", "someValuesFrom", "hasValue", "maxCardinality", "minCardinality", "cardinality"];

                common.fillSelectOptions("axioms_legend_suggestionsSelect", suggestions, false);
            } else {
                self.onSuggestionsSelect(node.data.type);
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

        var visjsData = { nodes: [], edges: [] };
        var visjsNode = Axioms_graph.getVisjsNode(currentNode, 0);
        visjsData.nodes.push(visjsNode);
        self.hierarchicalLevel = 0;
        Axioms_graph.drawGraph(visjsData, self.axiomGraphDiv, { onNodeClick: Axiom_activeLegend.onNodeGraphClick });
        Axioms_graph.currentGraphNode = visjsNode;

        //   self.hideForbiddenResources(selectedObject);
    };

    self.onNodeGraphClick = function (node, point, nodeEvent) {
        if (node && node.data) {
            self.currentGraphNode = node;
            Axioms_graph.currentGraphNode = node;
            Axiom_activeLegend.hideForbiddenResources("add_" + node.data.type);
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

    self.onSuggestionsSelect = function (selectedObject) {
        var resource;
        var currentNode;

        if (!selectedObject) {
            var selectedText = $("#axioms_legend_suggestionsSelect option:selected").text();
            selectedText = selectedText.replace(/ /g, "_");
            var selectedId = $("#axioms_legend_suggestionsSelect").val();
            selectedObject = { id: selectedId, label: selectedText };
            resource = Axiom_editor.allResourcesMap[selectedId];
        } else {
            resource = Axiom_editor.allResourcesMap[selectedObject.id];
        }

        if (resource) {
            //class or Property
            Axiom_editor.previousTokenType = resource.resourceType;
            selectedObject.resourceType = resource.resourceType;
        } else {
            //keyword
            /*   selectedObject = {
                id: selectedObject,
                label: selectedObject,
                resourceType: selectedObject
            };*/
        }
        currentNode = {
            id: selectedObject.id,
            label: selectedObject.label,
            owlType: self.currentNodeType || selectedObject.resourceType,
            symbol: null,
        };

        if (selectedObject.resourceType == "Class") {
            Axiom_editor.addSuggestion(selectedObject);
        } else if (selectedObject.resourceType == "ObjectProperty") {
            Axiom_editor.addSuggestion(selectedObject);
        } else if (selectedObject.resourceType == "add_Intersection") {
            currentNode.symbol = "⊓";
            Axiom_editor.addSuggestion({ id: "and", label: "and" });
        } else if (selectedObject.resourceType == "add_Union") {
            currentNode.symbol = "⨆";
            Axiom_editor.addSuggestion({ id: "or", label: "or" });
        } else if (selectedObject.resourceType == "add_ComplementOf") {
            currentNode.symbol = "┓";
            Axiom_editor.addSuggestion({ id: "not", label: "not" });
        } else {
            currentNode.owlType = "Restriction";
            Axiom_editor.addSuggestion(selectedObject);
        }

        var level = ++self.hierarchicalLevel;

        var visjsData = { nodes: [], edges: [] };
        visjsData.nodes.push(Axioms_graph.getVisjsNode(currentNode, level));

        if (Axioms_graph.axiomsVisjsGraph) {
            Axioms_graph.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
            if (Axioms_graph.currentGraphNode) {
                var edgeId = Axioms_graph.currentGraphNode.id + "_" + currentNode.id;
                visjsData.edges.push({
                    id: edgeId,
                    from: Axioms_graph.currentGraphNode.id,
                    to: currentNode.id,
                });
                Axioms_graph.axiomsVisjsGraph.data.edges.add(visjsData.edges);
            }

            //
        } else {
            self.hierarchicalLevel = 0;
            Axioms_graph.drawGraph(visjsData, self.axiomGraphDiv);
        }

        $("#axioms_legend_suggestionsSelect").empty();
    };

    self.hideForbiddenResources = function (type) {
        var hiddenNodes = [];
        if (type == "add_Class") {
            hiddenNodes.push("add_Restriction");
        } else if (type == "add_ObjectProperty") {
            hiddenNodes.push("add_Class");
            hiddenNodes.push("add_Intersection");
            hiddenNodes.push("add_Union");
            hiddenNodes.push("add_Intersection");
        } else if (type == "add_Restriction") {
            hiddenNodes.push("add_ObjectProperty");
            hiddenNodes.push("add_Intersection");
            hiddenNodes.push("add_Union");
            hiddenNodes.push("add_Intersection");
        } else if (type == "add_Intersection") {
        } else if (type == "add_Union") {
        } else if (type == "add_Complement") {
        }

        var legendNodes = self.axiomsLegendVisjsGraph.data.nodes.getIds();
        var newNodes = [];
        legendNodes.forEach(function (nodeId) {
            var hidden = hiddenNodes.indexOf(nodeId) > -1;
            newNodes.push({ id: nodeId, hidden: hidden });
        });
        Axiom_activeLegend.axiomsLegendVisjsGraph.data.nodes.update(newNodes);

        //  });
    };

    self.drawLegend = function () {
        var visjsData = { nodes: [], edges: [] };
        visjsData.nodes.push(
            {
                id: "add_Class",
                label: "Class",
                shape: "box",
                color: "#00afef",
                size: 8,
                level: -1,
                font: {
                    bold: true,
                },
                data: {
                    id: "add_Class",
                    label: "Class Class",
                    type: "add_Class",
                },
                x: 0,
                y: -300,

                fixed: { x: true, y: true },
            },

            {
                id: "add_ObjectProperty",
                label: "ObjectProperty",
                shape: "box",
                color: "#f5ef39",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "add_ObjectProperty",
                    label: "ObjectProperty",
                    type: "add_ObjectProperty",
                },
                x: 0,
                y: -250,

                fixed: { x: true, y: true },
            },
            {
                id: "add_Restriction",
                label: "Restriction",
                shape: "box",
                color: "#cb9801",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "add_Restriction",
                    label: "Restriction",
                    type: "add_Restriction",
                },

                x: 0,
                y: -200,

                fixed: { x: true, y: true },
            },
            {
                id: "add_Union",
                label: "⨆ union",
                shape: "box",
                color: "#70ac47",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "add_Union",
                    label: "⨆ union",
                    type: "add_Union",
                },

                x: 0,
                y: -150,

                fixed: { x: true, y: true },
            },
            {
                id: "add_Intersection",
                label: "⊓ Intersection",
                shape: "box",
                color: "#70ac47",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "add_Intersection",
                    label: "⊓ Intersection",
                    type: "add_Intersection",
                },

                x: 0,
                y: -100,

                fixed: { x: true, y: true },
            },
            {
                id: "add_Complement",
                label: "┓ Complement",
                shape: "box",
                color: "#70ac47",
                size: 8,
                level: -1,
                font: null,
                data: {
                    id: "add_Complement",
                    label: "┓ Complement",
                    type: "add_Complement",
                },

                x: 0,
                y: -150,

                fixed: { x: true, y: true },
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
        self.axiomsLegendVisjsGraph.draw(function () {});
    };

    self.clearAxiom = function () {
        // self.axiomsLegendVisjsGraph.clearGraph();
        Axioms_graph.axiomsVisjsGraph.clearGraph();
    };
    return self;
})();

export default Axiom_activeLegend;
window.Axiom_activeLegend = Axiom_activeLegend;
