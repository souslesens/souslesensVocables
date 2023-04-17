import Sparql_generic from "./../sparqlProxies/sparql_generic.js"
import visjsGraph from "./../graph/visjsGraph2.js"



/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var ChildHood = (function () {
    var self = { context: {} };

    var colorsMap = {};
    var sourceLabels = [];

    self.onSourceSelect = function () {
        var html = "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='ChildHood.showActionPanel()'>OK</button>";
        $("#sourceDivControlPanelDiv").html(html);
    };

    self.showActionPanel = function () {
        self.initsourceLabels();
        $("#actionDivContolPanelDiv").html("");
        $("#actionDiv").load("snippets/childHood.html");
        $("#accordion").accordion("option", { active: 2 });
    };

    self.initsourceLabels = function () {
        var jsTreesourceLabels = $("#sourcesTreeDiv").jstree(true).get_checked();
        sourceLabels = [];
        jsTreesourceLabels.forEach(function (sourceId) {
            if (!Config.sources[sourceId].color) Config.sources[sourceId].color = common.palette[Object.keys(sourceLabels).length];
            sourceLabels.push(sourceId);
        });
    };

    self.displayGraph = function (_direction) {
        var depth = parseInt($("#ChildHood_depth").val());
        self.initsourceLabels();

        var allNodes = {};
        async.eachSeries(
            sourceLabels,
            function (sourceLabel, callbackEach) {
                var sourceNodes = [];
                allNodes[sourceLabel] = sourceNodes;
                async.series(
                    [
                        //get TopConcepts
                        function (callbackSeries) {
                            Sparql_generic.getTopConcepts(sourceLabel, null, function (err, result) {
                                if (err) return callbackSeries(err);
                                result.forEach(function (item) {
                                    sourceNodes.push({
                                        id: item.topConcept.value,
                                        label: item.topConceptLabel.value,
                                        level: 0,
                                        parent: sourceLabel,
                                    });
                                });
                                callbackSeries();
                            });
                        },

                        //get TopConcepts
                        function (callbackSeries) {
                            var ids = [];
                            sourceNodes.forEach(function (item) {
                                ids.push(item.id);
                            });
                            Sparql_generic.getNodeChildren(sourceLabel, null, ids, depth, null, function (err, result) {
                                if (err) return callbackSeries(err);
                                result.forEach(function (item) {
                                    for (var i = 1; i <= depth; i++) {
                                        if (item["child" + i]) {
                                            var parent;
                                            if (i == 1) parent = item.subject.value;
                                            else parent = item["child" + (i - 1)].value;

                                            sourceNodes.push({
                                                id: item["child" + i].value,
                                                label: item["child" + i + "Label"].value,
                                                level: i,
                                                parent: parent,
                                            });
                                        }
                                    }
                                });
                                callbackSeries();
                            });
                        },
                    ],
                    function (err) {
                        callbackEach(err);
                    }
                );
            },
            function (err) {
                if (err) return MainController.UI.message(err);
                self.drawGraph(allNodes);
            }
        );
    };

    self.drawGraph = function (allNodesMap) {
        var visjsData = { nodes: [], edges: [] };
        var allIds = {};

        for (var source in allNodesMap) {
            var color = colorsMap[source];
            visjsData.nodes.push({
                id: source,
                label: source,
                shape: "box",
                color: color,
            });
            allNodesMap[source].forEach(function (item) {
                var label = null;
                if (item.level < 2) label = item.label;
                if (!allIds[item.id]) {
                    allIds[item.id] = 1;
                    visjsData.nodes.push({
                        id: item.id,
                        label: label,
                        color: common.palette[10 + item.level],
                    });
                }
                var edgeId = item.id + "_" + item.parent;
                if (!allIds[edgeId]) {
                    allIds[edgeId] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        from: item.id,
                        to: item.parent,
                    });
                }
            });
        }

        visjsGraph.draw("graphDiv", visjsData);
    };

    return self;
})();



export default ChildHood
