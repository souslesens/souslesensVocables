import Axiom_editor from "./axiom_editor.js";


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

            $("#lateralPanelDiv").load("modules/tools/axioms/html/leftPanel.html", function(x, y) {


            });
        });


    };
self.onNewAxiomClick=function(){

$("#smallDialogDiv").dialog("open")
    $("#smallDialogDiv").dialog("option","title","New Axiom")
    $("#smallDialogDiv").load("modules/tools/axioms/html/newAxiomDialog.html",function(){
        Axiom_editor.getAllClasses(function(err, classes) {

            common.fillSelectOptions("axiomsEditor_allClasses", classes, true, "label", "id");
        });
        Axiom_editor.getAllProperties(function(err, properties) {
            common.fillSelectOptions("axiomsEditor_allProperties", properties, true, "label", "id");
        });

    })

}


    self.setCurrentResource = function(node, isProperty) {
    if(!node)

        return alert ("select a class or a property")
        $("#smallDialogDiv").dialog("close")
var resourceNode
        if (isProperty) {
            resourceNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "ObjectProperty"
            };
        } else {
            resourceNode= {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "Class"
            };
        }

        $("#axiomsEditor_input_currentClassDiv").html("")
        Axiom_editor.axiomType = $("#Axioms_editor_axiomTypeSelect")
        Axiom_editor.setCurrentResource(resourceNode, isProperty)
    }


    self.loadConceptList = function() {

        axiom_editor_conceptsJstreeDiv;


    };


    return self;


})();

export default Axiom_editorUI;
window.Axiom_editorUI = Axiom_editorUI;