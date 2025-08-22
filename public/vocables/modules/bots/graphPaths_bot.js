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
                shortestPathBetweenNodes: {promptEndNodeLabelFn: {chooseEndNodesFn: {chooseOuputFn: {executePathFn: {}}}}},
                _DEFAULT: {
                    chooseOuputFn: {executePathFn: {}}
                },
            },


        },
    };


    self.functionTitles = {
        choosePathFn: "Choose Path type",
        promptEndNodeLabelFn: "promptEndNodeLabel",
        chooseEndNodesFn: "chooseEndNode ",
        promptIndividualsLabelFn: "Enter a label ",
        listIndividualsFn: "Choose a label ",
    };

    self.functions = {
        choosePathFn: function () {
            var choices = [
                {id: "pathsFromNode", label: "All paths FROM selected node"},
                {id: "pathsToNode", label: "All paths TO selected node"},
                {id: "pathsBetweenNodes", label: "All paths BETWEEN nodes"},
                {id: "shortestPathBetweenNodes", label: "SHORTEST path BETWEEN nodes"},


            ]
            self.myBotEngine.showList(choices, "pathType")
        },
        promptEndNodeLabelFn: function () {
            self.myBotEngine.promptValue("End node contains...", "endNodeStr")
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
                {id: "text", label: "text"},
                {id: "listEdges", label: "highlight On Graph"},
                {id: "table", label: "table"},


            ]
            self.myBotEngine.showList(choices, "outputType")
        }
        , executePathFn: function () {
            var pathType = self.params.pathType;
            var outputType = self.params.outputType;
            var color="#ef4270"
            var result = null;
            if (pathType == "pathsFromNode") {
                result = Lineage_graphPaths.getAllpathsFromNode(self.params.visjsData, self.params.startNode, outputType)
            } else if (pathType == "pathsToNode") {
                result = Lineage_graphPaths.getAllpathsToNode(self.params.visjsData, self.params.startNode, outputType)
                color="#096eac"
            } else if (pathType == "pathsBetweenNodes") {
                result = Lineage_graphPaths.getAllpathsBetweenNodes(self.params.visjsData, self.params.startNode, self.params.endNode, outputType)
            } else if (pathType == "shortestPathBetweenNodes") {
                result = Lineage_graphPaths.getAllpathsBetweenNodes(self.params.visjsData, self.params.startNode, outputType)
                if(result.length>0) {
                    result.sort(function (a, b) {
                        return b.length - a.length
                    })
                    result=[result[0]]
                }


            }

            if(result.length==0)
                return alert("no path found")
            if (outputType == "text") {

                common.copyTextToClipboard(result)
            } else if (outputType == "listEdges") {
                var newEdgesMap = {}
                result.forEach(function (path) {
                    path.forEach(function (edge) {
                        if (!newEdgesMap[edge.id]) {
                            newEdgesMap[edge.id] = {id: edge.id, color:color, width: 2}
                        }
                        if(newEdgesMap[edge.id].width<10)
                        newEdgesMap[edge.id].width += 1
                    })
                })
                var newEdges = []
                for (var id in newEdgesMap) {
                    newEdges.push(newEdgesMap[id])
                }

                Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges)
            }
            self.myBotEngine.end()


        }


    }; //SparqlQuery_bot.functions;


    return self;
})();

export default GraphPaths_bot;
window.GraphPaths_bot = GraphPaths_bot;
