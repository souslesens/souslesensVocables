import Axioms_manager from "./axioms_manager.js";



var NodeInfosAxioms=(function(){

    var self={}



    self.init=function(source,resource){
self.currentSource=source;
self.currentResource=resource
        $("#nodeInfosWidget_AxiomsTabDiv").load("modules/tools/axioms/html/nodeInfosAxioms.html", function () {
            self.loadAxiomsJstree()
        })
    }



    self.loadAxiomsJstree=function(){

        self.getResourceAxioms({},function(err, result){

        })

    }

    self.getResourceAxioms=function(options,callback){
        Axiom_manager.getClassAxioms(self.currentSource, self.currentResource.id,
            { getManchesterExpression: true, getTriples: true },
            function (err, result) {


            });
    }




    return self;


})()
export default NodeInfosAxioms;
window.NodeInfosAxioms=NodeInfosAxioms