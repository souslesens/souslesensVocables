import Sparql_common from "../sparqlProxies/sparql_common.js";

import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions_class from "./_commonBotFunctions_class.js";
import Lineage_graphPaths from "../tools/lineage/lineage_graphPaths.js";

var GraphPaths_bot = (function () {
    var self = {};
    self.title = "Filter Class";
    self.myBotEngine = new BotEngineClass();
    self.params = {}
    self.start = function (visjsData, startNode, currentSource, validateFn) {
        var startParams = self.myBotEngine.fillStartParams(arguments);


        var workflow = self.workflow;
        self.params = {}
        self.params.visjsData = visjsData;
        self.params.startNode = startNode
        self.myBotEngine.init(GraphPaths_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;
            self.validateFn = validateFn;
            self.callbackFn = function () {
                var filterLabel = self.myBotEngine.getQueryText();

                return;
                return self.validateFn(null, {
                    filter: self.filter,
                    filterLabel: filterLabel,
                    filterParams: self.filterParams
                });
            };


            self.myBotEngine.nextStep();
        });
    };

    self.workflow = {
        choosePathFn: {

            _OR: {
                pathsBetweenNodes: {promptEndNodeLabelFn: {chooseEndNodesFn: {chooseOuputFn: {executePathFn: {}}}}},
                shortestPathBetweenNodes: {promptEndNodeLabelFn: {chooseEndNodesFn: {chooseOuputFn :{executePathFn: {}}}}},
                _DEFAULT: {
                    chooseOuputFn: {executePathFn: {}}
                },
            },


        },
    };


    self.functionTitles = {
        choosePathFn: "Choose Path type",
        promptEndNodeLabelFn: "Click on node or End node contains...",
        chooseEndNodesFn: "choose End Node ",
        chooseDirectedGraphFn:"graph type",
        chooseOuputFn: "choose output type ",

    };

    self.functions = {
        choosePathFn: function () {
            var choices = [

                {id: "pathsFromNode", label: "All paths FROM selected node"},
                {id: "pathsToNode", label: "All paths TO selected node"},
                {id: "pathsBetweenNodes", label: "All paths BETWEEN nodes"},
                //  {id: "shortestPathBetweenNodes", label: "SHORTEST path BETWEEN nodes"},


            ]
            self.myBotEngine.showList(choices, "pathType")
        },
        promptEndNodeLabelFn: function () {
            self.isWaitingForEndNodeClick=true
            self.myBotEngine.promptValue("Click on node or End node contains...", "endNodeStr")
        }
        ,
        chooseEndNodesFn: function () {
            var choices = []

            self.params.visjsData.nodes.forEach(function (node) {
                var label = node.label.toLowerCase()

                if (label.indexOf(self.params.endNodeStr) > -1) {
                    choices.push(node)
                }
                self.myBotEngine.showList(choices, "endNode", null, true)
            })
        }
        , chooseOuputFn: function () {
            var choices = [
                {id: "html", label: "text"},
                {id: "listEdges", label: "highlight On Graph"},
                {id: "csv", label: "csv"},


            ]
            self.myBotEngine.showList(choices, "outputType")
        }
      /*  ,chooseDirectedGraphFn:function(){
            var choices = [
                {id: "undirected", label: "Undirected"},
                {id: "directed", label: "Directed"},

            ]
            self.myBotEngine.showList(choices, "graphType")
        }*/
        , executePathFn: function () {
            var pathType = self.params.pathType;
            var outputType = self.params.outputType;
           // var graphType=self.params.graphType
            var color = "#ef4270"
            var result = null;
            var options = {removeDuplicates: true}


            if (pathType == "pathsFromNode") {
                result = Lineage_graphPaths.getAllpathsFromNode(self.params.visjsData, self.params.startNode, outputType, options)
            } else if (pathType == "pathsToNode") {
                result = Lineage_graphPaths.getAllpathsToNode(self.params.visjsData, self.params.startNode, outputType, options)
                color = "#096eac"
            } else if (pathType == "pathsBetweenNodes") {
                color = "#07b611"
                options.inverse = false;
                result = Lineage_graphPaths.getAllpathsBetweenNodes(self.params.visjsData, self.params.startNode, self.params.endNode, outputType, options)
            } else if (pathType == "shortestPathBetweenNodes") {
                result = Lineage_graphPaths.getAllpathsBetweenNodes(self.params.visjsData, self.params.startNode, outputType, options)
                if (result.length > 0) {
                    result.sort(function (a, b) {
                        return b.length - a.length
                    })
                    result = [result[0]]
                }

            }
            if (result.length == 0 && pathType == "pathsBetweenNodes") {
                if(confirm(  "no path found, try undirected graph algorithm ?")) {
                    options.inverse = true;
                    result = Lineage_graphPaths.getAllpathsBetweenNodes(self.params.visjsData, self.params.startNode, self.params.endNode, outputType, options)
                }

            }
            Lineage_graphPaths.drawPaths(result,outputType,color)
            self.myBotEngine.end()

        }
    }

    self.setEndNode=function(visjsNode){
        var choices=[visjsNode]
        self.myBotEngine.nextStep()
        self.myBotEngine.showList(choices, "endNode", null, true)
    }



    return self;
})();

export default GraphPaths_bot;
window.GraphPaths_bot = GraphPaths_bot;
