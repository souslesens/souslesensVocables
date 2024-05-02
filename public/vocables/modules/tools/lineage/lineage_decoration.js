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
        return;
        if (!visjsNodes) visjsNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
        if (legendType == "individualClasses") {
            self.drawIndividualTypesLegend(visjsNodes, function () {});
        } else if (legendType == "queryInfos") {
            self.decorateByQueryInfos(visjsNodes, Lineage_relations.currentQueryInfos);
            Lineage_relations.currentQueryInfos = null;
        } else if (legendType) {
            self.decorateByUpperOntologyByClass(visjsNodes);
        }
    };

    self.decorateByQueryInfos = function (visjsNodes, queryInfos) {
        if (visjsNodes.length == 0) {
            return;
        }

        var index = Object.keys(LegendWidget.legendDivsStack).length;
        var color = common.getResourceColor("query", "query_" + index);
        var legendDivId = "legendDiv_" + index;
        LegendWidget.legendDivsStack[legendDivId] = { nodeIds: visjsNodes };
        var html =
            "<div  class='legend_itemDiv' id='" +
            legendDivId +
            "'>" +
            "<div class='legend_colorDiv' style='background-color:" +
            color +
            "'> </div>" +
            "<input type='image' src='./icons/oldIcons/caret-right.png'  style='opacity: 0.5; width: 20px;height: 20px;}' onclick='Lineage_decoration.showLegendDivPopupMenu(" +
            index +
            ")'/> " +
            (queryInfos.predicate || "") +
            "<br>" +
            (queryInfos.filter.classLabel || "") +
            (queryInfos.filter.value || "") +
            "</div>";
        $("#Lineage_classes_graphDecoration_legendDiv").append(html);

        var newVisJsNodes = [];
        visjsNodes.forEach(function (node) {
            newVisJsNodes.push({ id: node.id, color: color });
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
    };

    self.showLegendDivPopupMenu = function (legendIndex) {
        var html =
            /* '    <span  class="popupMenuItem" onclick="Lineage_decoration.popupActions(\"'+legendIndex+'\",\"hideNodes\");"> Hide nodes</span>' +
      '    <span  class="popupMenuItem" onclick="Lineage_whiteboard.popupActions(\"'+legendIndex+'\",\"showNodes\";">show nodes</span>'+*/
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.popupActions(\'' +
            legendIndex +
            "','hideNodes');\"> Hide nodes</span>" +
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.popupActions(\'' +
            legendIndex +
            "','showNodes');\">Show nodes</span>";

        PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv");
    };

    self.popupActions = function (legendIndex, action) {
        var visjsNodes = LegendWidget.legendDivsStack["legendDiv_" + legendIndex].nodeIds;
        if (action == "hideNodes") {
            var newVisJsNodes = [];
            visjsNodes.forEach(function (node) {
                newVisJsNodes.push({ id: node.id, hidden: true });
            });
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
        }
        if (action == "showNodes") {
            var newVisJsNodes = [];
            visjsNodes.forEach(function (node) {
                newVisJsNodes.push({ id: node.id, hidden: false });
            });
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
        }
    };

    self.drawIndividualTypesLegend = function (visjsNodes, callback) {
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

        var newNodes = [];
        var legendClassColorsMap = self.legendColorsMap;

        async.series(
            [
                // get node types
                function (callbackSeries) {
                    var slices = common.array.slice(nodeIds, Config.slicedArrayLength);
                    async.eachSeries(
                        slices,
                        function (slice, callbackEach) {
                            Sparql_OWL.getNodesTypesMap(Lineage_sources.activeSource, slice, {}, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                for (var nodeId in result) {
                                    var newNode = { id: nodeId };
                                    var types = result[nodeId].trim().split(";");

                                    types.forEach(function (type) {
                                        if (type && type.indexOf("/owl") < 0 && type.indexOf("/rdf") < 0) {
                                            if (!legendClassColorsMap[type]) {
                                                legendClassColorsMap[type] = common.getResourceColor("individualtypesLegend", type);
                                            }
                                            newNode.color = legendClassColorsMap[type];
                                        } else {
                                            if (type.indexOf("Individual") > -1) {
                                                newNode.shape = "triangle";
                                            } else if (type.indexOf("Bag") > -1) {
                                                newNode.shape = Containers_graph.containerStyle.shape;

                                                newNode.font = { color: Containers_graph.containerStyle.color };
                                            } else {
                                            }
                                        }
                                        newNodes.push(newNode);
                                    });
                                }

                                callbackEach();
                            });
                        },
                        function (err) {
                            callbackSeries();
                        }
                    );
                },
                function (callbackSeries) {
                    Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
                    callbackSeries();
                },
                function (callbackSeries) {
                    var jstreeData = [];
                    for (var classId in legendClassColorsMap) {
                        var label = Sparql_common.getLabelFromURI(classId);
                        var color = legendClassColorsMap[classId];
                        jstreeData.push({
                            id: classId,
                            text: "<span  style='font-size:10px;background-color:" + color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;" + label,
                            parent: "#",
                            color: color,
                        });
                    }
                    $("#Lineage_classes_graphDecoration_legendDiv").html(
                        "<div  class='jstreeContainer' style='height: 350px;width:90%;max-height:22dvh;'>" + "<div id='legendJstreeDivId' style='height: 25px;width:100%'></div></div>"
                    );
                    JstreeWidget.loadJsTree("legendJstreeDivId", jstreeData, {}, function () {});
                    callbackSeries();
                },
            ],
            function (err) {
                callback();
            }
        );
    };

    self.decorateByUpperOntologyByClass = function (visjsNodes) {
        if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
            return $("#lineage_legendWrapper").css("display", "none");
        }

        var nonTopLevelOntologynodeIds = [];
        var topLevelOntologynodeIds = [];
        var individualNodes = {};
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
                        return common.getSourceColor("class", key);
                    }
                    color = Config.topLevelOntologyFixedlegendMap[key][classId];
                }
            }
            return color;
        }

        function getNodeLegendAttrs(ancestors) {
            function getLegendTreeNode(ancestorNode, parent) {
                var treeObj = null;
                var color = legendClassesMap[ancestorNode.superClass.value];
                if (!color) {
                    color = getPredefinedColor(ancestorNode.class.value);
                    if (!color) {
                        color = getPredefinedColor(ancestorNode.superClass.value);
                    }

                    if (color) {
                        if (!uniqueLegendJsTreeDataNodes[ancestorNode.superClass.value]) {
                            legendClassesMap[ancestorNode.superClass.value] = { id: ancestorNode.superClass.value, color: color };
                            uniqueLegendJsTreeDataNodes[ancestorNode.superClass.value] = 1;
                            var label = ancestorNode.superClassLabel ? ancestorNode.superClassLabel.value : Sparql_common.getLabelFromURI(ancestorNode.superClass.value);
                            treeObj = {
                                id: ancestorNode.superClass.value,
                                text: "<span  style='font-size:10px;background-color:" + color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;" + label,
                                parent: "#",
                                color: color,
                            };
                            legendJsTreeData.push(treeObj);
                        }
                    }
                } else {
                }

                return legendClassesMap[ancestorNode.superClass.value];
            }

            var color = null;
            var legendTreeNode = null;
            for (var i = ancestors.length - 1; i > -1; i--) {
                var parent = "#";
                if (i != ancestors.length - 1) {
                    parent = ancestors[i + 1].class.value;
                }

                if (!color) {
                    legendTreeNode = getLegendTreeNode(ancestors[i]);
                    if (legendTreeNode) {
                        color = legendTreeNode.color;
                    } else {
                        if (i < ancestors.length - 1) {
                            legendTreeNode = getLegendTreeNode(ancestors[i + 1]);
                            if (legendTreeNode) {
                                color = legendTreeNode.color;
                            }
                        }
                    }

                    /*   if( !color){
  color=legendClassesMap[ancestors[i].superClass.value]

  }*/
                }
            }

            return legendTreeNode;
        }

        var nodeTypesMap = {};
        var nodeOwlTypesMap = {};
        var legendOwlTypeColorsMap = {};
        var legendTreeNode = {};
        var okNodeIds = [];
        async.series(
            [
                function (callbackSeries) {
                    nodeIds.forEach(function (item) {
                        if (item.startsWith("http")) {
                            okNodeIds.push(item);
                        }
                    });
                    callbackSeries();
                },
                // get nodes super Classes
                function (callbackSeries) {
                    var uniqueTypes = {};
                    var slices = common.array.slice(okNodeIds, Config.slicedArrayLength);
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
                                        } else {
                                            if (!legendOwlTypeColorsMap[type]) {
                                                legendOwlTypeColorsMap[type] = Lineage_whiteboard.getPropertyColor("individualtypesLegend");
                                            }
                                            nodeOwlTypesMap[nodeId] = type;
                                        }
                                        nodeTypesMap[nodeId] = obj;
                                    });
                                }

                                Sparql_OWL.getNodesAncestorsOrDescendants(Lineage_sources.activeSource, slice, { excludeItself: 0, withLabels: true }, function (err, result) {
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

                        legendTreeNode = getNodeLegendAttrs(ancestors);
                        if (legendTreeNode) {
                            color = legendTreeNode.color;
                        } else {
                            color = getPredefinedColor(nodeId);
                        }
                        if (!color) {
                            var x = 3;
                        }

                        // var obj = { id: nodeId, color: color,legendType: legendTreeNode.id  };
                        var obj = { id: nodeId, color: color };

                        if (nodeOwlTypesMap[nodeId] && nodeOwlTypesMap[nodeId].indexOf("Individual") > -1) {
                            obj.shape = "triangle";
                        }
                        if (nodeOwlTypesMap[nodeId] && nodeOwlTypesMap[nodeId].indexOf("Bag") > -1) {
                            obj.shape = Containers_graph.containerStyle.shape;
                            obj.color = Containers_graph.containerStyle.color;
                            obj.font = { color: color };
                        }
                        if (nodeIds.indexOf(nodeId) > -1) {
                            newVisJsNodes.push(obj);
                        } else {
                            legendClassesMap[nodeId] = legendTreeNode;
                        }
                    }

                    callbackSeries();
                },

                //set topClasses color
                function (callbackSeries) {
                    if (!legendTreeNode) {
                        legendTreeNode = {};
                    }
                    // return callbackSeries()
                    for (var nodeId in hierarchies) {
                        if (hierarchies[nodeId].length == 0 && nodeTypesMap[nodeId]) {
                            if (nodeTypesMap[nodeId].class && legendClassesMap[nodeTypesMap[nodeId].class]) {
                                var color = legendClassesMap[nodeTypesMap[nodeId].class].color;
                                if (color) {
                                    if (nodeTypesMap[nodeId] && nodeTypesMap[nodeId].allTypes.indexOf("Bag") > -1) {
                                        newVisJsNodes.push({ id: nodeId, font: { color: color }, color: "#ddd", legendType: legendTreeNode.id });
                                    } else {
                                        newVisJsNodes.push({ id: nodeId, color: color, legendType: legendTreeNode.id });
                                    }
                                }
                            }
                        }
                    }
                    callbackSeries();
                },

                function (callbackSeries) {
                    callbackSeries();
                },

                //draw legend
                function (callbackSeries) {
                    self.drawLegend(legendJsTreeData);
                    callbackSeries();
                },
            ],
            function (err) {
                //change vijsNodes Color
                setTimeout(function () {
                    Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
                }, 500);
            }
        );
    };

    self.drawLegend = function (jstreeData) {
        if (!Config.currentTopLevelOntology) {
            $("#lineage_legendWrapper").css("display", "none");
            return;
        } else {
            $("#lineage_legendWrapper").css("display", "block");
        }

        var str = "<div  class='Lineage_legendTypeTopLevelOntologyDiv' style='display: flex;>";

        LegendWidget.drawLegend("legendJstreeDivId", jstreeData);
    };

    return self;
})();

export default Lineage_decoration;

window.Lineage_decoration = Lineage_decoration;
