import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_relations from "./lineage_relations.js";
import LegendWidget from "../../uiWidgets/legendWidget.js";
import Containers_graph from "../containers/containers_graph.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";

//@typescript-eslint/no-unused-vars
var Lineage_decoration = (function () {
    var self = {};
    self.legendColorsMap = {};

    self.initLegend = function () {
        $("#Lineage_classes_graphDecoration_legendDiv").html("");
        self.currentLegendData=null;
        self.legendColorsMap = {};
    };
    self.topOntologiesClassesMap = {};
    self.legendMap = {};
    self.currentVisjGraphNodesMap = {};

    self.decorateNodeAndDrawLegend = function (visjsNodes, legendType) {
        self.decorateByUpperOntologyByClass(visjsNodes);
    };

    self.getPredefinedColor = function (classId, source) {
        var color = null;
        for (var key in Config.topLevelOntologyFixedlegendMap) {
            if (!source || key == source) {
                if (!color) {
                    /*  if (!Config.topLevelOntologyFixedlegendMap[key]) {
                          return common.getSourceColor("class", key);
                      }*/
                    color = Config.topLevelOntologyFixedlegendMap[key][classId];
                }
            }
        }
        return color;
    };

    self.decorateByUpperOntologyByClass = function (visjsNodes) {
        if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
            return $("#lineage_legendWrapperSection").css("display", "none");
        }

        if (!visjsNodes) {
            visjsNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            var notVisJsNodes=true;
        }

        if (visjsNodes.length == 0) {
            return;
        }

        var nodeIds = [];
        visjsNodes.forEach(function (node) {
            nodeIds.push(node.id);
        });

        /*  var hierarchies = {};
          var legendJsTreeData = [];
          var legendClassesMap = {};
          var newVisJsNodes = [];*/

        var distinctNodeClassesMap = {};
        var legendColorsMap = {};

        async.series(
            [
                //build distinctNodeClassesMap
                function (callbackSeries) {
                    visjsNodes.forEach(function (node) {
                        if (!node.data) {
                            return;
                        }
                        var classUri = node.data.id;

                        if (!distinctNodeClassesMap[classUri]) {
                            distinctNodeClassesMap[classUri] = [];
                        }
                        distinctNodeClassesMap[classUri].push(node);
                    });
                    callbackSeries();
                },
                // named Individuals parentClass
                function (callbackSeries) {
                    var namedIndividualNodes = [];
                    for (var classUri in distinctNodeClassesMap) {
                        if (distinctNodeClassesMap[classUri][0].data.rdfType == "NamedIndividual") {
                            namedIndividualNodes.push(classUri);
                        }
                    }
                    if (namedIndividualNodes.length == 0) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getNodeParents(Lineage_sources.activeSource, null, namedIndividualNodes, 1, {}, function (err, result) {
                        result.forEach(function (parent) {
                            if (namedIndividualNodes.includes(parent.subject.value)) {
                                var allTypes = parent.subjectTypes.value.split(",");
                                var nodeType;
                                for (var type in allTypes) {
                                    if (allTypes[type] != "http://www.w3.org/2002/07/owl#NamedIndividual") {
                                        nodeType = allTypes[type];
                                    }
                                }
                                if (nodeType) {
                                    distinctNodeClassesMap[parent.subject.value][0].data.parentClass = nodeType;
                                }
                            }
                        });
                        callbackSeries();
                    });
                    /*async.eachSeries(
                        namedIndividualNodes,
                        function (item, callbackEach) {
                            Sparql_OWL.getNodeParents()
                        },
                        function (err) {

                        }
                    )*/
                },
                // get nodeClassesAncestors and set classes colors
                function (callbackSeries) {
                    var uniqueTypes = {};
                    var classes = Object.keys(distinctNodeClassesMap);

                    for (var classUri in distinctNodeClassesMap) {
                        var ancestors = OntologyModels.getClassHierarchyTreeData(Lineage_sources.activeSource, classUri, "ancestors");
                        if (distinctNodeClassesMap[classUri][0].data.rdfType == "NamedIndividual") {
                            ancestors = OntologyModels.getClassHierarchyTreeData(Lineage_sources.activeSource, distinctNodeClassesMap[classUri][0].data.parentClass, "ancestors");
                        }
                        if (!ancestors) {
                            var x = 3;
                        } else {
                            var color = null;
                            ancestors.forEach(function (ancestor) {
                                if (!color) {
                                    color = self.getPredefinedColor(ancestor.id, Config.currentTopLevelOntology);
                                    if (color) {
                                        ancestor.color = color;
                                        legendColorsMap[ancestor.id] = ancestor;
                                    }
                                }
                            });
                            if (!color) {
                                color = "#ddd";
                            }
                            distinctNodeClassesMap[classUri].color = color;
                        }
                    }

                    callbackSeries();
                },
                // build legend
                function (callbackSeries) {
                    var legendJsTreeData = [];
                    legendJsTreeData.push({
                        id: Config.currentTopLevelOntology,
                        text: Config.currentTopLevelOntology,
                        parent: "#",
                    });
                    for (var legendClassUri in legendColorsMap) {
                        var color = legendColorsMap[legendClassUri].color;
                        var label = legendColorsMap[legendClassUri].label;
                        var treeObj = {
                            id: legendClassUri,
                            text: "<span  style='font-size:10px;background-color:" + color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;" + label,
                            parent: Config.currentTopLevelOntology,
                            color: color,
                        };
                        legendJsTreeData.push(treeObj);
                    }
                    //Combine new legend with already drawed
                    
                    if(self.currentLegendData && !notVisJsNodes){
                        legendJsTreeData=  legendJsTreeData.concat(self.currentLegendData);
                        legendJsTreeData=common.array.unduplicateArray(legendJsTreeData,'id');
                    }
                    


                    self.currentLegendData = legendJsTreeData;
                    self.drawLegend(legendJsTreeData);
                    callbackSeries();
                },
                // set visjsNodesColor
                function (callbackSeries) {
                    var newVisJsNodes = [];
                    // get source decoration data

                    Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
                    for (var key in distinctNodeClassesMap) {
                        distinctNodeClassesMap[key].forEach(function (node) {
                            var newNode = { id: node.id, color: distinctNodeClassesMap[key].color };
                            // blank nodes
                            if (newNode.id.startsWith("_:b")) {
                                newNode.shape = "hexagon";
                            }
                            // class with icons
                            if (Lineage_whiteboard.decorationData[Lineage_sources.activeSource] && Lineage_whiteboard.decorationData[Lineage_sources.activeSource][node.id]?.image) {
                                node.image = Lineage_whiteboard.decorationData[Lineage_sources.activeSource][node.id].image;
                                node.shape = "circularImage";
                            }

                            newVisJsNodes.push(newNode);
                        });
                    }
                    Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
                    callbackSeries();
                },
                ///draw Legend
                function (callbackSeries) {
                    callbackSeries();
                },
            ],

            function (err) {
                var x = distinctNodeClassesMap;
            }
        );
    };

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
