import Axiom_editor from "./axiom_editor.js";
import Axioms_manager from "./axioms_manager.js";
import Axioms_graph from "./axioms_graph.js";

var Axiom_editorUI = (function() {
    var self = {};


    self.initUI = function() {


        $("#graphDiv").load("modules/tools/axioms/html/mainPanel.html", function(x, y) {

            $("#axiomsEditor_input").on("keyup", function(evt) {
                if (evt.key == "Backspace") {
                    Axiom_editor.removeLastElement();
                } else {
                    Axiom_editor.onInputChar($("#axiomsEditor_input").val());
                }
            });
            $("#axiomsEditor_input").focus();


            $("#axiom_triplesTab").tabs();


            $("#lateralPanelDiv").load("modules/tools/axioms/html/leftPanel.html", function(x, y) {

                self.loadConceptTree(Axiom_editor.currentSource);
            });
        });


    };
    self.onNewAxiomClick = function() {

        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").dialog("option", "title", "New Axiom");
        $("#smallDialogDiv").load("modules/tools/axioms/html/newAxiomDialog.html", function() {
            Axiom_editor.getAllClasses(function(err, classes) {

                common.fillSelectOptions("axiomsEditor_allClasses", classes, true, "label", "id");
            });
            Axiom_editor.getAllProperties(function(err, properties) {
                common.fillSelectOptions("axiomsEditor_allProperties", properties, true, "label", "id");

            });


        });

    };


    self.setCurrentResource = function(node, isProperty) {
        if (!node) {
            return alert("select a class or a property");
        }
        $("#smallDialogDiv").dialog("close");
        var resourceNode;
        if (isProperty) {
            resourceNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "ObjectProperty"
            };
        } else {
            resourceNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "Class"
            };
        }
        Axiom_editor.setCurrentResource(resourceNode, isProperty);

        Axiom_editor.axiomType = $("#Axioms_editor_axiomTypeSelect").val();

        var html = resourceNode.resourceType + " " + resourceNode.label + " " + Axiom_editor.axiomType;
        $("#axiomsEditor_input_currentClassDiv").html(html);
    };


    self.loadConceptTree = function(source) {


        Axioms_manager.loadAxiomsSubgraphsMap(source, function(err, subGraphsMap) {
            if (err) {
                return alert(err);
            }
            var jstreeData=[]
            var uniqueNodes={}
            for (var  className in subGraphsMap) {

               var resource= Axiom_editor.allResourcesMap[ className];

               for(var uri in Axiom_editor.allResourcesMap){
                   if(uri.endsWith(className)){
                       resource= Axiom_editor.allResourcesMap[uri]
                   }
               }
               if(!resource){
                   return alert(" resource not found "+className);
               }



                jstreeData.push({
                    id: className,
                    text:resource.label,
                    parent:"#"
                })
                for (var axiomType in subGraphsMap[ className]) {
                    if(!uniqueNodes[axiomType]){
                        jstreeData.push({
                            id:axiomType+"_"+ className,
                            text:axiomType,
                            parent: className
                        })
                    }

                    subGraphsMap[ className][axiomType].forEach(function(item,index){
                        jstreeData.push({
                            id:axiomType+"_"+ className+"_"+item.id,
                            text:"_"+index,
                            type:"axiom",
                            parent:axiomType+"_"+ className,
                            data:{
                                id:item.id,
                                label:index,
                                source:source,
                               resource:resource,
                                triples:item.triples


                            }
                        })
                    })
                }
                var options = {
                    selectTreeNodeFn: self.onConceptsJstreeSelectNode,

                };

                JstreeWidget.loadJsTree( "axiom_editor_conceptsJstreeDiv", jstreeData, options,);


            }

        });


    };

    self.onConceptsJstreeSelectNode=function(event,obj){

        var node=obj.node;

        if(node.data && node.data.triples){
            Axiom_editor.currentSource=node.data.source;
            Axiom_editor.currentNode=node.data.resource;
            Axioms_graph.drawNodeAxioms2(Axiom_editor.currentSource, Axiom_editor.currentNode.id, node.data.triples, "axiomGraphDiv", {}, function(err) {

            });
        }
    }

    self.saveAxiom = function() {


        Axiom_editor.generateTriples(function(err, rawAxioms) {


            //c lean raw axioms from jowl
            var str = JSON.stringify(rawAxioms).replace(/\[OntObject\]/g, "");
            var axioms = JSON.parse(str);

            axioms.forEach(function(item) {
                item.subject = "<" + item.subject + ">";
                item.predicate = "<" + item.predicate + ">";
                item.object = "<" + item.object + ">";

            });

            Axioms_manager.saveAxiom(Axiom_editor.currentSource, Axiom_editor.axiomType, Axiom_editor.currentNode.id, axioms, function(err, result) {
            });
        });
    };


    return self;


})();

export default Axiom_editorUI;
window.Axiom_editorUI = Axiom_editorUI;