import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axiom_editor from "./axiom_editor.js";

var Axiom_activeLegend=(function(){

var self={}
    self.axiomsLegendVisjsGraph=null




    self.filterSuggestion=function(suggestions,resourceType){
    var selection=[]
        suggestions.forEach(function(item){
            if(item.resourceType==resourceType)
                selection.push(item)
        })
        return selection;

    }
    self.onLegendNodeClick=function(node, point, nodeEvent) {


        if (node && node.data) {
            if (node.data.type == "add_Class") {
                Axioms_suggestions.getManchesterParserSuggestions(Axiom_editor.currentNode, false, false, function(err, result) {

                  var suggestions=self.filterSuggestion(result,"Class")
                    common.fillSelectOptions("axioms_legend_suggestionsSelect", suggestions, false, "label", "id")
                })
            }
            if (node && node.data) {
                if (node.data.type == "add_ObjectProperty") {
                    Axioms_suggestions.getManchesterParserSuggestions(Axiom_editor.currentNode, false, false, function(err, result) {

                        var suggestions=self.filterSuggestion(result,"ObjectProperty")
                        common.fillSelectOptions("axioms_legend_suggestionsSelect", suggestions, false, "label", "id")
                    })
                }
            }
        }


    }
    self.onSuggestionsSelect=function(selectedObject){
    var resource
       var  currentNode
        if (!selectedObject) {
            var selectedText = $("#axioms_legend_suggestionsSelect option:selected").text();
            selectedText = selectedText.replace(/ /g, "_");
            var selectedId = $("#axioms_legend_suggestionsSelect").val();
            var selectedObject = { id: selectedId, label: selectedText };
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
            selectedObject.resourceType = "keyword";
        }

        if(selectedObject.resourceType=="Class") {
            currentNode = {
                id: selectedObject.id,
                label: selectedObject.label,
                symbol: null,
                owlType: "Class"

            }
        } if(selectedObject.resourceType=="ObjectProperty"){

        }else{

        }

        var visjsData={nodes:[],edges:[]};
        visjsData.nodes.push(Axioms_graph.getVisjsNode(resource))
        if ( Axioms_graph.axiomsVisjsGraph) {
            Axioms_graph.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
            // self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
        } else {
            Axioms_graph.drawGraph(visjsData, "axiomGraphDiv");

        }


        Axioms_suggestions.getValidResourceTypes(selectedObject, false, false, function(err, result) {
           if(err)
               return alert(err)




            if(result.selectClasses){



            }
            if(result.selectProperties){

            }else{

            }


        });

    }

    self.hideForbiddenResources=function(suggestions){
    var legendNodes=self.axiomsLegendVisjsGraph.data.nodes.getIds()
        return;
        if(result.selectClasses){



        }
        if(result.selectProperties){

        }else{

        }
    }

    self.draw = function() {
        var visjsData = { nodes: [], edges: [] };
        visjsData.nodes.push({
                "id": "add_Class",
                "label": "Class",
                "shape": "box",
                "color": "#00afef",
                "size": 8,
                "level": -1,
                "font": {
                    "bold": true,
                },
                "data": {
                    "id": "add_Class",
                    "label": "Class Class",
                    "type": "add_Class"
                },
                x: 0,
                y: -300,

                fixed: { x: true, y: true }
            },

            {
                "id": "add_ObjectProperty",
                "label": "ObjectProperty",
                "shape": "box",
                "color": "#f5ef39",
                "size": 8,
                "level": -1,
                "font": null,
                "data": {
                    "id": "add_ObjectProperty",
                    "label": "ObjectProperty",
                    "type": "add_ObjectProperty"
                },
                x: 0,
                y: -250,

                fixed: { x: true, y: true }
            }, {
                "id": "add_Some",
                "label": "⊓ some",
                "shape": "box",
                "color": "#cb9801",
                "size": 8,
                "level": -1,
                "font": null,
                "data": {
                    "id": "add_Some",
                    "label": "⊓ Intersection",
                    "type": "add_Some"
                },

                x: 0,
                y: -200,

                fixed: { x: true, y: true }

            },

            {
                "id": "add_Union",
                "label": "⨆ union",
                "shape": "box",
                "color": "#70ac47",
                "size": 8,
                "level": -1,
                "font": null,
                "data": {
                    "id": "add_Union",
                    "label":  "⨆ union",
                    "type": "add_Union"
                },

                x: 0,
                y: -150,

                fixed: { x: true, y: true }

            },  {
                "id": "add_Intersection",
                "label": "⊓ Intersection",
                "shape": "box",
                "color": "#70ac47",
                "size": 8,
                "level": -1,
                "font": null,
                "data": {
                    "id": "add_Intersection",
                    "label": "⊓ Intersection",
                    "type": "add_Intersection"
                },

                x: 0,
                y: -100,

                fixed: { x: true, y: true }

            },








        );
        var options = {

            physics: {
                enabled: true
            },


            visjsOptions: {},
            onclickFn: Axiom_activeLegend.onLegendNodeClick,
            onRightClickFn: Axiom_activeLegend.showGraphPopupMenu

        };

        var graphLegendDiv = "axioms_legend_div";
        self.axiomsLegendVisjsGraph = new VisjsGraphClass(graphLegendDiv, visjsData, options);
        self.axiomsLegendVisjsGraph.draw(function() {

        })
    }
    return self;

})()

export default Axiom_activeLegend
window.Axiom_activeLegend=Axiom_activeLegend
