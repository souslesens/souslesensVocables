import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_classes from "./lineage_classes.js";

//@typescript-eslint/no-unused-vars
var Lineage_decoration = (function () {
    var self = {};

    self.topOntologiesClassesMap = {};
    self.legendMap = {};
    self.currentVisjGraphNodesMap = {};

    self.colorGraphNodesByType = function (visjsNodes) {
        if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
            return $("#lineage_legendWrapper").css("display", "none");
        }

        var nonTopLevelOntologynodeIds = [];
        var topLevelOntologynodeIds = [];
        var individualNodes = {};
        if (true || !visjsNodes) {
            visjsNodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
        }

        if (visjsNodes.length == 0) {
            return;
        }
        var nodeIds = [];
        visjsNodes.forEach(function (node) {
            nodeIds.push(node.id);
        });

        var hierarchies = {};
        var upperOntologiesHierarchy = {};
        var legendJsTreeData = [];
        var legendClassesMap = {};
        var newVisJsNodes = [];
        var uniqueLegendJsTreeDataNodes = {};

        function getPredefinedColor(classId) {
            var color = null;
            for (var key in Config.topLevelOntologyFixedlegendMap) {
                if (!color) {
                    if (!Config.topLevelOntologyFixedlegendMap[key]) {
                        return Lineage_classes.getSourceColor(key);
                    }
                    color = Config.topLevelOntologyFixedlegendMap[key][classId];
                }
            }
            return color;
        }

        function getNodeColorInLegend(ancestors) {
            function getColorFromParent(ancestorNode, parent) {
                var color = legendClassesMap[ancestorNode.superClass.value];
                if (!color) {
                    color = getPredefinedColor(ancestorNode.class.value);
                    if (!color) {
                        color = getPredefinedColor(ancestorNode.superClass.value);
                    }

                    if (color) {
                        legendClassesMap[ancestorNode.superClass.value] = color;
                        if (!uniqueLegendJsTreeDataNodes[ancestorNode.superClass.value]) {
                            uniqueLegendJsTreeDataNodes[ancestorNode.superClass.value] = 1;
                            var label = ancestorNode.superClassLabel ? ancestorNode.superClassLabel.value : Sparql_common.getLabelFromURI(ancestorNode.superClass.value);
                            legendJsTreeData.push({
                                id: ancestorNode.superClass.value,
                                text: "<span  style='font-size:10px;background-color:" + color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;" + label,
                                parent: parent,
                                color: color,
                            });
                        }
                    }
                }

                return color;
            }

            var color = null;
            for (var i = ancestors.length - 1; i > -1; i--) {
                var parent = "#";
                if (i != ancestors.length - 1) {
                    parent = ancestors[i + 1].class.value;
                }

                if (!color) {
                    color = getColorFromParent(ancestors[i]);
                    if (!color) {
                        if (i < ancestors.length - 1) {
                            color = getColorFromParent(ancestors[i + 1]);
                        }
                    }

                    /*   if( !color){
                 color=legendClassesMap[ancestors[i].superClass.value]

             }*/
                }
            }

            return color;
        }

        var nodeTypesMap = {};
        async.series(
            [
                // get nodes super Classes
                function (callbackSeries) {
                    var uniqueTypes = {};
                    var slices = common.array.slice(nodeIds, Config.slicedArrayLength);
                    async.eachSeries(
                        slices,
                        function (slice, callbackEach) {
                            Sparql_OWL.getNodesTypesMap(Lineage_sources.activeSource, slice, {}, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                for (var nodeId in result) {
                                    var obj = { allTypes: result[nodeId], class: "" };
                                    var types = result[nodeId].split(";");

                                    types.forEach(function (type) {
                                        if (!nodeTypesMap[nodeId] && type && type.indexOf("/owl") < 0 && type.indexOf("/rdf") < 0) {
                                            obj.class = type;
                                            if (slice.indexOf(type) < 0 && !uniqueTypes[type]) {
                                                uniqueTypes[type] = 1;
                                                slice.push(type);
                                            }
                                        }
                                        nodeTypesMap[nodeId] = obj;
                                    });
                                }

                                Sparql_OWL.getNodesAncestors(Lineage_sources.activeSource, slice, { excludeItself: 0 }, function (err, result) {
                                    if (err) {
                                        return callbackEach(err);
                                    }
                                    for (var key in result.hierarchies) {
                                        hierarchies[key] = result.hierarchies[key];
                                    }
                                    callbackEach();
                                });
                            });
                        },
                        function (err) {
                            callbackSeries();
                        }
                    );
                },
                //get each node color in legend

                function (callbackSeries) {
                    var uniqueNewVisJsNodes = {};
                    for (var nodeId in hierarchies) {
                        var ancestors = hierarchies[nodeId];
                        var color = null;

                        color = getNodeColorInLegend(ancestors);

                        if (!color) {
                            color = getPredefinedColor(nodeId);
                        }

                        var obj = { id: nodeId, color: color };

                        if (nodeTypesMap[nodeId] && nodeTypesMap[nodeId].allTypes.indexOf("Individual") > -1) {
                            obj.shape = "triangle";
                        }
                        if (nodeTypesMap[nodeId] && nodeTypesMap[nodeId].allTypes.indexOf("Bag") > -1) {
                            obj.shape = "box";
                        }
                        if (nodeIds.indexOf(nodeId) > -1) {
                            newVisJsNodes.push(obj);
                        } else {
                            legendClassesMap[nodeId] = color;
                        }
                    }

                    callbackSeries();
                },

                function (callbackSeries) {
                    for (var nodeId in hierarchies) {
                        //processing namedIndividuals
                        if (hierarchies[nodeId].length == 0 && nodeTypesMap[nodeId]) {
                            var color = legendClassesMap[nodeTypesMap[nodeId].class];
                            if (color) {
                                newVisJsNodes.push({ id: nodeId, color: color });
                            }
                        }
                    }
                    callbackSeries();
                },

                //change vijsNodes Color
                function (callbackSeries) {
                    Lineage_classes.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
                    callbackSeries();
                },

                //draw legend
                function (callbackSeries) {
                    self.drawLegend(legendJsTreeData);
                    callbackSeries();
                },
            ],
            function (err) {}
        );
    };

    self.setGraphPopupMenus = function () {
        var html =
            '    <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType(true);"> Hide Type</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType();"> Show Type</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType(null,true);"> Show Only</span>';
        $("#graphPopupDiv").html(html);
    };

    self.drawLegend = function (jstreeData) {
        if (!Config.currentTopLevelOntology) {
            $("#lineage_legendWrapper").css("display", "none");
            return;
        } else {
            $("#lineage_legendWrapper").css("display", "block");
        }

        var str = "<div  class='Lineage_legendTypeTopLevelOntologyDiv' style='display: flex;>";

        LegendWidget.drawLegend("Lineage_classes_graphDecoration_legendDiv", jstreeData);
    };

    return self;
})();

export default Lineage_decoration;

window.Lineage_decoration = Lineage_decoration;
