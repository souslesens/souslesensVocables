import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

//@typescript-eslint/no-unused-vars
var Lineage_decoration = (function () {
    var self = {};

    self.topOntologiesClassesMap = {};
    self.legendMap = {};
    self.currentVisjGraphNodesMap = {};
    self.currentLegendDJstreedata = {};

    /*  self.init = function () {

      self.operationsMap = {
          colorNodesByType: self.colorGraphNodesByType,
          colorNodesByTopLevelOntologyTopType: self.colorNodesByTopLevelOntologyTopType,
      };
      var operations = Object.keys(self.operationsMap);

      common.fillSelectOptions("Lineage_classes_graphDecoration_operationSelect", operations, true);
      self.currentVisjGraphNodesMap = {};
      self.legendMap = {};
      self.currentLegendDJstreedata = {};
  };*/
    self.run = function (operation) {
        $("#Lineage_classes_graphDecoration_operationSelect").val("");
        self.operationsMap[operation]();
    };

    self.showGraphDecorationDialog = function () {
        $("#mainDialogDiv").load("snippets/lineage/graphDecoration.html", function () {
            $("#mainDialogDiv").dialog("open");
        });
    };

    /**
     * set the upper ontology classes map
     * @param callback
     * @returns {*}
     */
    self.setTopLevelOntologyClassesMap = function (callback) {
        if (!Config.currentTopLevelOntology) {
            return callback(null, null);
        }
        self.topLevelOntologyPredifinedLegendMap = JSON.parse(JSON.stringify(Config.topLevelOntologyFixedlegendMap));
        if (self.topOntologiesClassesMap[Config.currentTopLevelOntology]) {
            self.currentTopOntologyClassesMap = self.topOntologiesClassesMap[Config.currentTopLevelOntology];
            return callback(null, self.currentTopOntologyClassesMap);
        }
        self.currentTopOntologyClassesMap = {};
        Sparql_generic.getSourceTaxonomy(Config.currentTopLevelOntology, { lang: Config.default_lang, skipCurrentQuery: true }, function (err, result) {
            if (err) {
                return callback(null, {});
            }

            self.currentTopOntologyClassesMap = result.classesMap;
            var countColors = 0;
            for (var topClass in self.currentTopOntologyClassesMap) {
                if (!self.topLevelOntologyPredifinedLegendMap[Config.currentTopLevelOntology]) {
                    return callback(null, []);
                }
                var color = null;
                if (self.topLevelOntologyPredifinedLegendMap[Config.currentTopLevelOntology][topClass]) {
                    //predifined color
                    color = self.topLevelOntologyPredifinedLegendMap[Config.currentTopLevelOntology][topClass];
                } else {
                    //look for a predifined parent class
                    self.currentTopOntologyClassesMap[topClass].parents.forEach(function (parent) {
                        if (self.topLevelOntologyPredifinedLegendMap[Config.currentTopLevelOntology][parent]) {
                            //predifined color
                            color = self.topLevelOntologyPredifinedLegendMap[Config.currentTopLevelOntology][parent];
                        }
                    });
                }
                if (!color) {
                    //calculated color in palette
                    color = common.paletteIntense[countColors % Object.keys(common.paletteIntense).length];
                }
                self.currentTopOntologyClassesMap[topClass].color = color;
                countColors++;
            }
            return callback(null, self.currentTopOntologyClassesMap);
        });
    };

    /**
   search for each node in visjs graph correpsonding nodes in upper ontology (if any)
   an set the lowest upper ontology class thanks to the self.currentTopOntologyClassesMap[topclass].parents nodes length

   */

    self.getVisjsClassNodesTopLevelOntologyClass = function (ids, callback) {
        if (!ids || ids.length == 0) {
            return callback(null, []);
        }

        var sourceLabel = Lineage_sources.activeSource;

        var strFrom = Sparql_common.getFromStr(sourceLabel, null, true, true);
        var sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        var slices = common.array.slice(ids, 50);
        var uriPattern = Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern;
        var data = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                if (!slice) {
                    return callback(null, []);
                }
                var filter = Sparql_common.setFilter("x", slice);
                if (filter.indexOf("?x in( )") > -1) {
                    return callbackEach();
                }

                var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource);

                var query =
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>  SELECT distinct ?type ?sLabel ?x " +
                    fromStr +
                    "  WHERE {\n" +
                    "GRAPH <" +
                    Config.sources[Config.currentTopLevelOntology].graphUri +
                    ">{\n" +
                    "  ?s rdfs:label|skos:prefLabel ?sLabel. bind(?s as ?type)\n" +
                    "}\n" +
                    "  {GRAPH <" +
                    Config.sources[sourceLabel].graphUri +
                    ">{  \n" +
                    "      ?x rdfs:subClassOf|rdf:type* ?s. ?x ?ww ?xx}\n" +
                    filter +
                    "    }} LIMIT 10000";

                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel, skipCurrentQuery: true }, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    data = data.concat(result.results.bindings);
                    //  if (data.length > 100) ; // console.error(query);
                    return callbackEach();
                });
            },
            function (err) {
                return callback(err, data);
            }
        );
    };

    self.getVisjsNamedIndividualNodesClass = function (ids, callback) {
        if (!ids || ids.length == 0) {
            return callback(null, []);
        }

        var sourceLabel = Lineage_sources.activeSource;

        var strFrom = Sparql_common.getFromStr(sourceLabel, null, true, true);
        var sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        var slices = common.array.slice(ids, 50);
        //  var uriPattern = Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern;
        var data = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var query =
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

                query +=
                    "  SELECT distinct ?x ?class ?g ?label" +
                    strFrom +
                    "WHERE {GRAPH ?g{" +
                    "    ?x  rdf:type owl:NamedIndividual. " +
                    "OPTIONAL {?x rdfs:label ?label}" +
                    "  ?x   rdf:type+ ?class.  ?class rdf:type owl:Class ";

                var filter = Sparql_common.setFilter("x", slice);
                if (filter.indexOf("?x in( )") > -1) {
                    return callbackEach();
                }

                query += filter + "}}";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    data = data.concat(result.results.bindings);
                    //  if (data.length > 100) ; // console.error(query);
                    return callbackEach();
                });
            },
            function (err) {
                return callback(err, data);
            }
        );
    };

    self.colorGraphNodesByType = function (visjsNodes) {
        self.incomingQuery = Sparql_proxy.currentQuery;
        if (!Lineage_sources.activeSource) {
            return;
        }
        Lineage_sources.setTopLevelOntologyFromImports(Lineage_sources.activeSource);

        if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
            return;
        }

        self.currentVisjGraphNodesMap = {};
        if (false && self.currentTopOntologyClassesMap && Object.keys(self.currentTopOntologyClassesMap).length > 0) {
            return self.colorNodesByTopLevelOntologyTopType(visjsNodes);
        }

        self.setTopLevelOntologyClassesMap(function (err, result) {
            if (Config.topLevelOntologies[Config.currentTopLevelOntology]) {
                // self.legendMap = {};
                self.uriPattern = Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern;
                self.colorNodesByTopLevelOntologyTopType(visjsNodes);
            } else {
                return;
            }
        });
    };
    self.clearLegend = function () {
        $("#Lineage_classes_graphDecoration_legendDiv").html("");
        self.legendMap = {};
    };

    self.colorNodesByTopLevelOntologyTopType = function (visjsNodes) {
        if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
            return;
        }

        var nonTopLevelOntologynodeIds = [];
        var topLevelOntologynodeIds = [];
        var individualNodes = {};
        if (!visjsNodes) {
            visjsNodes = visjsGraph.data.nodes.get();
        }

        if (visjsNodes.length == 0) {
            return;
        }

        async.series(
            [
                // split nodes by type
                function (callbackSeries) {
                    visjsNodes.forEach(function (node) {
                        if (node.data && node.data.rdfType == "NamedIndividual") {
                            individualNodes[node.id] = {};
                        } else if (true || node.id.indexOf(self.uriPattern) < 0) {
                            nonTopLevelOntologynodeIds.push(node.id);
                        } else {
                            if (self.currentTopOntologyClassesMap[node.id]) {
                                topLevelOntologynodeIds.push({
                                    id: node.id,
                                    color: self.currentTopOntologyClassesMap[node.id].color,
                                });
                            }
                        }
                    });
                    visjsGraph.data.nodes.update(topLevelOntologynodeIds);
                    callbackSeries();
                },
                //get individuals class and add it to nonTopLevelOntologynodeIds
                function (callbackSeries) {
                    self.getVisjsNamedIndividualNodesClass(Object.keys(individualNodes), function (err, result) {
                        if (err) {
                            return;
                        }
                        result.forEach(function (item) {
                            individualNodes[item.x.value] = item.class.value;
                            if (nonTopLevelOntologynodeIds.indexOf(item.class.value) < 0) {
                                nonTopLevelOntologynodeIds.push(item.class.value);
                            }
                        });
                        callbackSeries();
                    });
                },

                // set nodes topClasses
                function (callbackSeries) {
                    self.getVisjsClassNodesTopLevelOntologyClass(nonTopLevelOntologynodeIds, function (err, result) {
                        if (err) {
                            return;
                        }
                        var excludedTypes = ["TopConcept", "Class", "Restriction"];

                        var maxNumberOfParents = 0;

                        result.forEach(function (item) {
                            if (!self.currentVisjGraphNodesMap[item.x.value]) {
                                self.currentVisjGraphNodesMap[item.x.value] = {
                                    type: item.type.value,
                                    // graphUri: item.g.value,
                                    label: item.label ? item.label.value : Sparql_common.getLabelFromURI(item.x.value),
                                    topLevelOntologyClass: null,
                                    topLevelOntologyNumberOfParents: 0,
                                    color: null,
                                };
                            }
                            if (self.currentTopOntologyClassesMap[item.x.value]) {
                                self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyClass = item.x.value;
                                self.currentVisjGraphNodesMap[item.x.value].color = self.currentTopOntologyClassesMap[item.x.value].color;
                                self.currentVisjGraphNodesMap[item.x.value].type = item.x.value;
                                self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyNumberOfParents = self.currentTopOntologyClassesMap[item.type.value].parents.length;
                            } else if (self.currentTopOntologyClassesMap[item.type.value]) {
                                // select the deepest upper ontology class  among all retrieved
                                if (self.currentTopOntologyClassesMap[item.type.value].parents.length > self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyNumberOfParents) {
                                    self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyClass = item.type.value;
                                    self.currentVisjGraphNodesMap[item.x.value].color = self.currentTopOntologyClassesMap[item.type.value].color;
                                    self.currentVisjGraphNodesMap[item.x.value].type = item.type.value;
                                    self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyNumberOfParents = self.currentTopOntologyClassesMap[item.type.value].parents.length;
                                }
                            }
                        });
                        callbackSeries();
                    });
                },
                // prepare legend
                function (callbackSeries) {
                    for (var nodeId in self.currentVisjGraphNodesMap) {
                        var node = self.currentVisjGraphNodesMap[nodeId];
                        if (!self.legendMap[node.topLevelOntologyClass]) {
                            var topClass = self.currentTopOntologyClassesMap[node.topLevelOntologyClass];
                            if (topClass) {
                                self.legendMap[node.topLevelOntologyClass] = {
                                    id: node.topLevelOntologyClass,
                                    label: topClass.label,
                                    color: topClass.color,
                                    parents: topClass.parents,
                                };
                            }
                        }
                    }
                    callbackSeries();
                },

                // update nodes color
                function (callbackSeries) {
                    // modify nodes color according to toOntolog superClass
                    var neutralColor = null; //"#ccc";

                    var newNodes = [];
                    for (var nodeId in self.currentVisjGraphNodesMap) {
                        var obj = self.currentVisjGraphNodesMap[nodeId];
                        if (obj) {
                            newNodes.push({ id: nodeId, color: obj.color, legendType: obj.type });
                        }
                    }

                    for (var individualId in individualNodes) {
                        var classId = individualNodes[individualId];
                        var obj = self.currentVisjGraphNodesMap[classId];
                        if (obj) {
                            newNodes.push({ id: individualId, color: obj.color, legendType: obj.type });
                        }
                    }

                    if (visjsGraph.data && visjsGraph.data.nodes) {
                        visjsGraph.data.nodes.update(newNodes);
                    }

                    callbackSeries();
                },
                function (callbackSeries) {
                    self.drawLegend();
                    Sparql_proxy.currentQuery = self.incomingQuery;
                    callbackSeries();
                },
            ],
            function (err) {}
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

        if (!jstreeData) {
            var jstreeData = [];
            var uniqueIds = {};
            for (var topClassId in self.legendMap) {
                var topClass = self.legendMap[topClassId];
                topClass.parents.push(topClassId);
                topClass.parents.forEach(function (id, index) {
                    var parent;
                    var color = null,
                        label = "-";
                    if (index == 0) {
                        label = topClass.parents[index];
                        parent = "#";
                    } else {
                        parent = topClass.parents[index - 1];

                        if (self.currentTopOntologyClassesMap[id]) {
                            color = self.currentTopOntologyClassesMap[id].color;
                            label = self.currentTopOntologyClassesMap[id].label;
                        }
                    }
                    if (!uniqueIds[id]) {
                        uniqueIds[id] = 1;
                        jstreeData.push({
                            id: id,
                            text: "<span  style='font-size:10px;background-color:" + color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;" + label,
                            parent: parent,
                        });
                    }
                });
            }
        }
        self.currentLegendDJstreedata[Lineage_sources.activeSource] = jstreeData;
        var options = {
            openAll: true,
            withCheckboxes: true,
            onCheckNodeFn: Lineage_decoration.onLegendCheckBoxes,
            onUncheckNodeFn: Lineage_decoration.onLegendCheckBoxes,
            tie_selection: false,
        };
        $("#Lineage_classes_graphDecoration_legendDiv").jstree("destroy").empty();
        $("#Lineage_classes_graphDecoration_legendDiv").html("<div  class='jstreeContainer' style='height: 350px;width:90%'><div id='Lineage_classes_graphDecoration_legendTreeDiv'></div></div>");
        common.jstree.loadJsTree("Lineage_classes_graphDecoration_legendTreeDiv", jstreeData, options, function () {
            $("#Lineage_classes_graphDecoration_legendTreeDiv").jstree(true).check_all();
        });
    };

    self.onLegendCheckBoxes = function () {
        var checkdeTopClassesIds = $("#Lineage_classes_graphDecoration_legendTreeDiv").jstree(true).get_checked();

        var allNodes = visjsGraph.data.nodes.get();
        var newNodes = [];
        allNodes.forEach(function (node) {
            var hidden = true;
            if (node && checkdeTopClassesIds.indexOf(node.legendType) > -1) {
                hidden = false;
            }

            newNodes.push({
                id: node.id,
                hidden: hidden,
            });
        });
        visjsGraph.data.nodes.update(newNodes);
    };

    self.onlegendTypeDivClick = function (div, type) {
        self.currentLegendObject = { type: type, div: div };
        self.setGraphPopupMenus();
        var point = div.position();
        point.x = point.left;
        point.y = point.top;
        MainController.UI.showPopup(point, "graphPopupDiv", true);
    };

    self.setGraphPopupMenus = function () {
        var html =
            '    <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType(true);"> Hide Type</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType();"> Show Type</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType(null,true);"> Show Only</span>';
        $("#graphPopupDiv").html(html);
    };
    self.hideShowLegendType = function (hide, only) {
        if (hide) {
            self.currentLegendObject.div.addClass("Lineage_legendTypeDivHidden");
        } else {
            self.currentLegendObject.div.removeClass("Lineage_legendTypeDivHidden");
        }
        var allNodes = visjsGraph.data.nodes.get();
        var newNodes = [];
        var hidden = hide ? true : false;
        allNodes.forEach(function (node) {
            if (only) {
                if (only == "all" || (node && node.legendType == self.currentLegendObject.type)) {
                    newNodes.push({
                        id: node.id,
                        hidden: false,
                    });
                } else {
                    newNodes.push({ id: node.id, hidden: true });
                }
            } else {
                if (node && node.legendType == self.currentLegendObject.type) {
                    newNodes.push({
                        id: node.id,
                        hidden: hidden,
                    });
                }
            }
        });
        visjsGraph.data.nodes.update(newNodes);
    };

    self.refreshLegend = function (source) {
        var newJstreeData = [
            {
                id: source,
                text: source,
                parent: "#",
            },
        ];
        if (self.currentLegendDJstreedata[source]) {
            newJstreeData = self.currentLegendDJstreedata[source];
        }

        self.drawLegend(newJstreeData);
    };

    (self.showDecorateDialog = function () {
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").load("snippets/lineage/lineage_decorateDialog.html", function () {
            $("#lineage_decorate_applyButton").bind("click", Lineage_decoration.decorateNodes);
            common.fillSelectWithColorPalette("lineage_decorate_colorSelect");
            var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
            common.fillSelectOptions("lineage_decorate_shapeSelect", shapes, true);
        });
    }),
        (self.decorateNodes = function () {
            var selection = $("#lineage_decorate_selectionSelect").val();
            var nodes;
            if (selection == "Last added nodes") nodes = visjsGraph.lastAddedNodes;
            else if (selection == "All nodes") nodes = visjsGraph.lastAddedNodes;
            else if (selection == "Selected nodes") nodes = Lineage_selection.selectedNodes;

            $("#smallDialogDiv").dialog("close");
            var newIds = [];

            var color = $("#lineage_decorate_colorSelect").val();
            var shape = $("#lineage_decorate_shapeSelect").val();
            var size = $("#lineage_decorate_sizeInput").val();
            nodes.forEach(function (node) {
                if (!node.data) return;
                var obj = { id: node.id };
                if (color) obj.color = color;
                if (shape) obj.shape = shape;
                if (size) obj.size = parseInt(size);
                newIds.push(obj);
            });

            visjsGraph.data.nodes.update(newIds);
        });

    return self;
})();

export default Lineage_decoration;

window.Lineage_decoration = Lineage_decoration;
