import Sparql_common from "../sparqlProxies/sparql_common.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions_class from "./_commonBotFunctions_class.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import KGquery_graph from "../tools/KGquery/KGquery_graph.js";
import common from "../shared/common.js";

var KGquery_HyperGraphMaker_bot = (function () {
    var self = {};
    self.title = "HyperGraphMaker";
    self.myBotEngine = new BotEngineClass();
    self.params={
        source:"",
        
    }
  
    self.start = function (workflow, _params, callbackFn) {
        var startParams = self.myBotEngine.fillStartParams(arguments);
        
        self.myBotEngine.init(KGquery_HyperGraphMaker_bot, self.workflow_HyperGraphMaker, null, function () {
            
            self.myBotEngine.startParams = startParams;
            self.myBotEngine.currentBot.params.source=_params.source;
           
            self.myBotEngine.nextStep();
        });
    };
    self.workflow_HyperGraphMaker = {
        
            listImportsSourcesFn: {
                downloadSelectedGraphFn: {

                    drawHyperGraphFn:{
                        chooseSourceCommonClassKeyFn: {
                            chooseTargetCommonClassKeyFn: {
                                chooseCommonClassMainFn:{
                                    
                                    drawCommonClassJoinFn: {
                                        loopChoiceFn: {},
                                    },
                                    
                                },
                                     
                                
                                
                                
                            },
                        },
                    },
                },
            },
        
    };
    self.loopChoice = {
        "_OR": {
        "Choose another source": self.workflow_HyperGraphMaker ,
        "SaveGraph": { saveVisjsModelGraphFn: {} },
        "End": { },
        }
    };
    self.functionTitles = {
        choosePropertyVocabFn: "Choose a source for linkingproperty",
        choosePropertySourceFn: "Choose a linking property",
        choosePropertyFn: "Choose a property",
        drawHyperGraphFn: "drawHyperGraph",
        chooseTargetCommonClassKeyFn: "choose a target common Class to joins graphs",
        listImportsSourcesFn: "Choose a source KGquery Graph to import on the hypergraph",
        downloadSelectedGraphFn: "Download selected graph",
        chooseSourceCommonClassKeyFn: "Choose a source common class key to joins graphs",
        drawCommonClassJoinFn: "Draw common class join",
        chooseCommonClassMainFn: "choose wich class will be kept in the hypergraph",
        };
    self.functions = {
        drawHyperGraphFn: function () {
            if(!self.myBotEngine.currentBot.params.selectedGraph){
                alert("Please select a graph");
                return self.myBotEngine.previousStep();
            }
            if(self.myBotEngine.currentBot.params.visjsData && self.myBotEngine.currentBot.params.visjsData.nodes.length>0){
                
                KGquery_graph.visjsData.nodes=self.myBotEngine.currentBot.params.visjsData.nodes.concat(self.myBotEngine.currentBot.params.selectedGraph.nodes);
                KGquery_graph.visjsData.edges=self.myBotEngine.currentBot.params.visjsData.edges.concat(self.myBotEngine.currentBot.params.selectedGraph.edges);
                return KGquery_graph.drawModel(false,function(){
                    self.myBotEngine.nextStep();
                });
            }else{
                KGquery_graph.visjsData=self.myBotEngine.currentBot.params.selectedGraph;
                return KGquery_graph.drawModel(false,function(){
                    self.myBotEngine.nextStep();
                });
            }
        },
        chooseSourceCommonClassKeyFn: function () {
            self.myBotEngine.currentBot.params.classMap = {};
            if(!self.myBotEngine.currentBot.params.visjsData){
                self.myBotEngine.currentObj = self.loopChoice;
                self.myBotEngine.nextStep(self.loopChoice);
                return;
            }
            var sourceNodesIds= self.myBotEngine.currentBot.params.visjsData.nodes.map(function(node){
                return node.id;
            });
            var prefixedSourcesNodesIds=[];
            sourceNodesIds.forEach(function(id){
                var prefixedLabel=Sparql_common.getPrefixedLabelFromURI(id);
                 self.myBotEngine.currentBot.params.classMap[prefixedLabel]=id;
                 prefixedSourcesNodesIds.push(prefixedLabel);
             });
            self.myBotEngine.showList(prefixedSourcesNodesIds,"sourceCommonClass");
            
        },
        chooseTargetCommonClassKeyFn: function () {
            if(!self.myBotEngine.currentBot.params.selectedGraph){
                self.myBotEngine.currentObj = self.loopChoice;
                self.myBotEngine.nextStep(self.loopChoice);
                return;
            }
            var hyperGraphNodesIds= self.myBotEngine.currentBot.params.selectedGraph.nodes.map(function(node){
                return node.id;
            });
            var prefixedHyperGraphNodesIds=[];
            hyperGraphNodesIds.forEach(function(id){
                var prefixedLabel=Sparql_common.getPrefixedLabelFromURI(id);
                 self.myBotEngine.currentBot.params.classMap[prefixedLabel]=id;
                 prefixedHyperGraphNodesIds.push(prefixedLabel);
             });
            self.myBotEngine.showList(prefixedHyperGraphNodesIds,"targetCommonClass");
            
        },
        listImportsSourcesFn: function () {
            var source=self.myBotEngine.currentBot.params.source;
            if(!source){
                alert("Please select a source");
                return self.myBotEngine.end();
            }
            var imports=Config.sources[source].imports;
            if(imports.length==0){
                alert("No imports found");
                return self.myBotEngine.end();
            }
            
            self.myBotEngine.showList(imports,"selectedSource");
        },
        downloadSelectedGraphFn: function () {
            if(!self.myBotEngine.currentBot.params.selectedSource){
                alert("Please select a source");
                return self.myBotEngine.previousStep();
            }
            self.myBotEngine.currentBot.params.visjsData=JSON.parse(JSON.stringify(KGquery_graph.visjsData));
            KGquery_graph.visjsData=null;
            KGquery_graph.downloadVisjsGraph(self.myBotEngine.currentBot.params.selectedSource,function(err,result){
                if(err){
                    alert("Error downloading graph");
                    return self.myBotEngine.previousStep();
                }
                self.myBotEngine.currentBot.params.selectedGraph=JSON.parse(JSON.stringify(result));
                self.myBotEngine.nextStep();
            });
            
            
        },
        chooseCommonClassMainFn: function () {
            var nodesIds=[self.myBotEngine.currentBot.params.sourceCommonClass,self.myBotEngine.currentBot.params.targetCommonClass];
            self.myBotEngine.showList(nodesIds,"mainCommonClass");
        },
        drawCommonClassJoinFn: function () {
            if(!self.myBotEngine.currentBot.params.sourceCommonClass || !self.myBotEngine.currentBot.params.targetCommonClass || !self.myBotEngine.currentBot.params.mainCommonClass){
                self.myBotEngine.currentObj = self.loopChoice;
                self.myBotEngine.nextStep(self.loopChoice);
                return;
            }
            var joinClassesIds=[self.myBotEngine.currentBot.params.sourceCommonClass,self.myBotEngine.currentBot.params.targetCommonClass];
            joinClassesIds=joinClassesIds.map(function(id){
                return self.myBotEngine.currentBot.params.classMap[id];
            });
            var mainCommonClassId=self.myBotEngine.currentBot.params.classMap[self.myBotEngine.currentBot.params.mainCommonClass];
            // remove nodes that are join class but not the main common class
            KGquery_graph.visjsData.nodes = KGquery_graph.visjsData.nodes.filter(function(node) {
                if ( joinClassesIds.includes(node.id)) {
                    return node.id == mainCommonClassId; 
                }
                return true; 
            });
            // replace join class targets with main common class
            KGquery_graph.visjsData.edges.forEach(function(edge) {
                if ( joinClassesIds.includes(edge.from) ) {
                     edge.from = mainCommonClassId;
                }
                if ( joinClassesIds.includes(edge.to) ) {
                     edge.to = mainCommonClassId;
                }
                
            });
            KGquery_graph.drawModel(false,function(){
                self.myBotEngine.nextStep();
            });
        },
        saveVisjsModelGraphFn: function () {
            KGquery_graph.saveVisjsModelGraph(function(){
                self.myBotEngine.nextStep();
            });
           
        },
        loopChoiceFn: function () {
            self.myBotEngine.currentObj = self.loopChoice;
            self.myBotEngine.nextStep(self.loopChoice);
        },
    };
    return self;
})();
export default KGquery_HyperGraphMaker_bot;
window.KGquery_HyperGraphMaker_bot = KGquery_HyperGraphMaker_bot;