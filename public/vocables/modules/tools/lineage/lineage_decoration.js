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

    /**
     * Initializes the legend by clearing the existing legend data and resetting the color map.
     * @function
     * @name initLegend
     * @memberof Lineage_decoration
     * @returns {void}
     */
    self.initLegend = function () {
        $("#Lineage_classes_graphDecoration_legendDiv").html("");
        self.currentLegendData = null;
        self.legendColorsMap = {};
    };
    self.topOntologiesClassesMap = {};
    self.legendMap = {};
    self.currentVisjGraphNodesMap = {};

    /**
     * Decorates nodes in the visualization and updates the legend accordingly.
     * @function
     * @name decorateNodeAndDrawLegend
     * @memberof Lineage_decoration
     * @param {Array<Object>} visjsNodes - Array of nodes in the visualization.
     * @param {string} legendType - The type of legend to be applied.
     * @returns {void}
     */
    self.decorateNodeAndDrawLegend = function (visjsNodes, legendType) {
        self.decorateByUpperOntologyByClass(visjsNodes);
    };

    /**
     * Retrieves a predefined color for a given class in a specific ontology source.
     * @function
     * @name getPredefinedColor
     * @memberof Lineage_decoration
     * @param {string} classId - The class identifier.
     * @param {string} source - The ontology source.
     * @returns {string|null} The predefined color if found, otherwise null.
     */
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
    /**
     * Decorates nodes based on their upper ontology classification.
     * Assigns colors and builds a legend.
     * @function
     * @name decorateByUpperOntologyByClass
     * @memberof Lineage_decoration
     * @param {Array<Object>} visjsNodes - Array of nodes to decorate.
     * @returns {void}
     */
    self.decorateByUpperOntologyByClass = function (visjsNodes) {
        if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
            return $("#lineage_legendWrapperSection").css("display", "none");
        }

        if (!visjsNodes) {
            visjsNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            var notVisJsNodes = true;
        }

        if (visjsNodes.length == 0) {
            return;
        }

        var nodeIds = [];
        visjsNodes.forEach(function (node) {
            nodeIds.push(node.id);
        });

        var distinctNodeClassesMap = {};
        var legendColorsMap = {};
        var ancestorsSourcemap={}
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

                                distinctNodeClassesMap[parent.subject.value][0].shape = "triangle";
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

                },
                // get nodeClassesAncestors and set classes colors
                function (callbackSeries) {
                 /*   var uniqueTypes = {};
                    var classes = Object.keys(distinctNodeClassesMap);*/

                    for (var classUri in distinctNodeClassesMap) {

                        var ancestors = OntologyModels.getClassHierarchyTreeData(Lineage_sources.activeSource, classUri, "ancestors");

                        if (distinctNodeClassesMap[classUri][0].data.rdfType == "NamedIndividual") {
                            ancestors = OntologyModels.getClassHierarchyTreeData(Lineage_sources.activeSource, distinctNodeClassesMap[classUri][0].data.parentClass, "ancestors");
                        }
                        if (ancestors) {

                            var color = null;
                            ancestors.forEach(function (ancestor) {
                                ancestorsSourcemap[ancestor.id]=ancestor.source
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

                    if (self.currentLegendData && !notVisJsNodes) {
                        legendJsTreeData = legendJsTreeData.concat(self.currentLegendData);
                        legendJsTreeData = common.array.unduplicateArray(legendJsTreeData, "id");
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
                            if (node.shape != "dot") {
                                return;
                            }

                            var data = node.data
                            if (data && ancestorsSourcemap[node.id]) {
                                data.source = ancestorsSourcemap[node.id]
                            }
                            var newNode = {id: node.id, color: distinctNodeClassesMap[key].color, data: data};
                            // blank nodes
                            if (newNode.id.startsWith("_:b")) {
                                newNode.shape = "hexagon";
                            }

                            // class with icons
                            if (Lineage_whiteboard.decorationData[Lineage_sources.activeSource] && Lineage_whiteboard.decorationData[Lineage_sources.activeSource][node.id]?.image) {
                                node.image = Lineage_whiteboard.decorationData[Lineage_sources.activeSource][node.id].image;
                                node.shape = "circularImage";
                            }
                            // shape previously attribute
                            if (node.shape && node.shape != "circularImage") {
                                newNode.shape = node.shape;
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
            },
        );
    };

    /**
     * Draws the legend using the provided hierarchical tree data.
     * @function
     * @name drawLegend
     * @memberof Lineage_decoration
     * @param {Array<Object>} jstreeData - The data structure for rendering the legend.
     * @returns {void}
     */
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
