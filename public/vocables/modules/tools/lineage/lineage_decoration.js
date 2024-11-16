import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_relations from "./lineage_relations.js";
import LegendWidget from "../../uiWidgets/legendWidget.js";
import Containers_graph from "../containers/containers_graph.js";

//@typescript-eslint/no-unused-vars
var Lineage_decoration = (function () {
    var self = {};
    self.legendColorsMap = {};

    self.initLegend = function () {
        $("#Lineage_classes_graphDecoration_legendDiv").html("");
        self.legendColorsMap = {};
    };
    self.topOntologiesClassesMap = {};
    self.legendMap = {};
    self.currentVisjGraphNodesMap = {};

    self.decorateNodeAndDrawLegend = function (visjsNodes, legendType) {
            self.decorateByUpperOntologyByClass(visjsNodes);

    };


    self.getPredefinedColor=function(classId) {
        var color = null;
        for (var key in Config.topLevelOntologyFixedlegendMap) {
            if (!color) {
              /*  if (!Config.topLevelOntologyFixedlegendMap[key]) {
                    return common.getSourceColor("class", key);
                }*/
                color = Config.topLevelOntologyFixedlegendMap[key][classId];
            }
        }
        return color;
    }



    self.decorateByUpperOntologyByClass = function (visjsNodes) {
        if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
            return $("#lineage_legendWrapperSection").css("display", "none");
        }

        if (!visjsNodes) {
            visjsNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        }

        if (visjsNodes.length == 0) {
            return;
        }

        var nodeIds = [];
        visjsNodes.forEach(function (node) {
            nodeIds.push(node.id);
        });

        var hierarchies = {};
        var legendJsTreeData = [];
        var legendClassesMap = {};
        var newVisJsNodes = [];
        var uniqueLegendJsTreeDataNodes = {};

        var distinctNodeClassesMap = {}


        async.series([
            //build distinctNodeClassesMap
            function (callbackSeries) {
                visjsNodes.forEach(function (node) {
                    if (!node.data)
                        return;
                    var classUri = node.data.id

                    if (!distinctNodeClassesMap[classUri])
                        distinctNodeClassesMap[classUri] = []
                    distinctNodeClassesMap[classUri].push(node)
                })
                callbackSeries()
            },

            // get nodeClassesAncestors and set classes colors
            function (callbackSeries) {
                var uniqueTypes = {};
                var classes = Object.keys(distinctNodeClassesMap)
                var slices = common.array.slice(classes, Config.slicedArrayLength);
                async.eachSeries(
                    slices,
                    function (slice, callbackEach) {

                        Sparql_OWL.getNodesAncestorsOrDescendants(Lineage_sources.activeSource, slice, {
                            excludeItself: 0,
                            withLabels: true
                        }, function (err, result) {
                            if (err) {
                                return callbackEach(err);
                            }
                            for (var key in result.hierarchies) {
                               var color=null;
                                result.hierarchies[key].forEach(function (item) {
                                    if(!item.superClass)
                                        return;
                                    var ancestor = item.superClass.value
                                    if(!color)
                                    color = self.getPredefinedColor(ancestor)

                                })
                                if(!color)
                                     color = "#ddd"
                                distinctNodeClassesMap[key].color = color
                            }
                            callbackEach();
                        });

                    },
                    function (err) {
                        callbackSeries();
                    }
                );


            },
  // set visjsNodesColor
            function (callbackSeries) {
                var newVisJsNodes = [];

                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
            for( var key in  distinctNodeClassesMap){
                distinctNodeClassesMap[key].forEach(function (node) {
                    newVisJsNodes.push({ id: node.id, color: distinctNodeClassesMap[key].color });
                });

            }
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
                callbackSeries();
            },
   ///draw Legend
            function (callbackSeries) {
                callbackSeries();
            }




        ], function (err) {


            var x =distinctNodeClassesMap

        })

    }







    self.drawLegend = function (jstreeData) {
        if (!Config.currentTopLevelOntology) {
            $("#lineage_legendWrapperSection").css("display", "none");
            return;
        } else {
            $("#lineage_legendWrapperSection").css("display", "block");
        }

        var str = "<div  class='Lineage_legendTypeTopLevelOntologyDiv' style='display: flex;>";

        LegendWidget.drawLegend("legendJstreeDivId", jstreeData);
    };

    return self;
})();

export default Lineage_decoration;

window.Lineage_decoration = Lineage_decoration;
