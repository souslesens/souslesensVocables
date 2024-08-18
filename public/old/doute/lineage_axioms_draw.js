import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import VisjsUtil from "../../graph/visjsUtil.js";

import Lineage_whiteboard from "./lineage_whiteboard.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";


var Lineage_axioms_draw = (function () {
    var self = {};
    self.currentSource = null;
    self.defaultGraphDiv = "axiomsDrawGraphDiv";
    self.defaultNodeColor = "#ccc";
    self.defaultNodeSize = 7;
    self.currentSourcesAxioms = {};
    var props = [
        "<http://www.w3.org/2002/07/owl#complementOf>",
        "<http://www.w3.org/2002/07/owl#disjointWith>",
        "<http://www.w3.org/2002/07/owl#disjointUnionOf>",
        "<http://www.w3.org/2002/07/owl#hasKey>",
        "<http://www.w3.org/2002/07/owl#equivalentClass>",
        "<http://www.w3.org/2002/07/owl#unionOf>",
        "<http://www.w3.org/2002/07/owl#intersectionOf>",
        "<http://www.w3.org/2002/07/owl#oneOf>",
        "<http://www.w3.org/2000/01/rdf-schema#subClassOf>",
        "<http://www.w3.org/2002/07/owl#onProperty>",
        "<http://www.w3.org/2002/07/owl#allValuesFrom>",
        "<http://www.w3.org/2002/07/owl#hasValue>",
        "<http://www.w3.org/2002/07/owl#someValuesFrom>",
        "<http://www.w3.org/2002/07/owl#minCardinality>",
        "<http://www.w3.org/2002/07/owl#maxCardinality>",
        "<http://www.w3.org/2002/07/owl#cardinality>",
        "<http://www.w3.org/2002/07/owl#maxQualifiedCardinality>",
        "<http://www.w3.org/2002/07/owl#onDataRange>",
        "<http://www.w3.org/2002/07/owl#onProperties>",
        "<http://www.w3.org/2002/07/owl#onClass>",
        "<http://www.w3.org/2002/07/owl#qualifiedCardinality>",
        "<http://www.w3.org/2002/07/owl#hasSelf>",
        "<http://www.w3.org/2002/07/owl#minQualifiedCardinality>",
        "<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>",
        "<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>",
        "<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>",
        "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
        // "rdfs:member"
    ];
    var defaultDepth = 3;

    self.getNodeAxioms = function (sourceLabel, nodeId, depth, options, callback) {
        if (!options) {
            options = {};
        }
        if (self.currentSourcesAxioms[sourceLabel]) {
            return callback(null, self.currentSourcesAxioms[sourceLabel]);
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var filterObjTypeStr = "";
        var filterSubTypeStr = "";
        if (options.excludeRestrictions) {
            filterSubTypeStr = " filter (?sType != owl:Restriction) ";
            filterObjTypeStr = " filter (?oType != owl:Restriction) ";
        }

        var sources = [sourceLabel];

        if (Config.sources[sourceLabel] && Config.sources[sourceLabel].imports) {
            sources = sources.concat(Config.sources[sourceLabel].imports);
        }
        sources.forEach(function (source) {
            if (Config.sources[sourceLabel].graphUri) {
                sources.push(Config.sources[sourceLabel].graphUri);
            }
        });
        var graphUris = [];
        var filterGraphStr = Sparql_common.setFilter(("g", graphUris));

        var filterTypePropertyStr = ""; // " filter (?p !=rdf:type) ";
        if (options.includeTypeProperty) {
            filterTypePropertyStr = "  ";
        }

        var includeIncomingTriplesStr = "";
        if (options.includeIncomingTriples) {
            includeIncomingTriplesStr = "  UNION  {<" + nodeId + ">  ^(<>|!<>){1," + depth + "} ?o filter (isIri(?o) || isBlank(?o))} ";
        }

        var filterProps = Sparql_common.setFilter("p", props, null, { values: 1 });

        var filterProps = ""; //Sparql_common.setFilter("p",props)

        var graphUris = Object.keys(Sparql_common.getSourceGraphUrisMap(sourceLabel));
        var sFilterGraph = Sparql_common.setFilter("sGraph", graphUris);
        var oFilterGraph = Sparql_common.setFilter("oGraph", graphUris);

        var axiomPredicates =
            "<http://www.w3.org/2002/07/owl#complementOf>|" +
            "<http://www.w3.org/2002/07/owl#disjointWith>|" +
            "<http://www.w3.org/2002/07/owl#disjointUnionOf>|" +
            "<http://www.w3.org/2002/07/owl#hasKey>|" +
            "<http://www.w3.org/2002/07/owl#equivalentClass>|" +
            "<http://www.w3.org/2002/07/owl#unionOf>|" +
            "<http://www.w3.org/2002/07/owl#intersectionOf>|" +
            "<http://www.w3.org/2002/07/owl#oneOf>" +
            "|<http://www.w3.org/2000/01/rdf-schema#subClassOf>";

        axiomPredicates +=
            "|<http://www.w3.org/2002/07/owl#Restriction>|" +
            "<http://www.w3.org/2002/07/owl#onProperty>|" +
            "<http://www.w3.org/2002/07/owl#someValuesFrom>|" +
            "<http://www.w3.org/2002/07/owl#allValuesFrom>|" +
            "<http://www.w3.org/2002/07/owl#hasValue>|" +
            "<http://www.w3.org/2002/07/owl#minCardinality>|" +
            "<http://www.w3.org/2002/07/owl#maxCardinality>|" +
            "<http://www.w3.org/2002/07/owl#cardinality>|" +
            "<http://www.w3.org/2002/07/owl#maxQualifiedCardinalit>|" +
            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>|" +
            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>|" +
            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>";
        //   "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>"
        // "rdfs:member"

        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            " SELECT distinct ?sGraph ?oGraph" +
            " ?s ?p  ?o" +
            " ?sType ?oType  ?sLabel ?pLabel  ?oLabel" +
            " ?sIsBlank ?oIsBlank" +
            " " +
            fromStr +
            "          WHERE { " +
            //  "  {GRAPH ?sGraph{ ?s ?sx ?sy} " + sFilterGraph + "}\n" +
            //   "  {GRAPH ?oGraph{ ?o ?ox ?oy} " + oFilterGraph + "}\n" +
            "?s (" +
            axiomPredicates +
            "){1,1} ?o0. \n" +
            "          ?s ?p ?o." +
            "  optional{ ?s rdf:type ?sType.}\n" +
            "  optional{    ?o rdf:type ?oType.}\n" +
            "  optional{   ?s rdfs:label ?sLabel.}\n" +
            "  optional{   ?o rdfs:label ?oLabel.}\n" +
            "  optional{    ?p rdfs:label ?pLabel." +
            "}" +
            " \n" +
            "  filter ( ?p in (" +
            axiomPredicates.replace(/\|/g, ",") +
            "))\n" +
            "        {  SELECT distinct  ?s ?p0 ?o0    \n" +
            "          WHERE {?s (" +
            axiomPredicates +
            ") ?o0. \n" +
            "               \n" +
            "  }}\n" +
            "}\n" +
            "            limit 10000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            self.currentSourcesAxioms[sourceLabel] = result.results.bindings;
            return callback(null, result.results.bindings);
        });
    };

    self.firstOrderLogicAxioms = [
        "http://www.w3.org/2000/01/rdf-schema#subClassOf",
        "http://www.w3.org/2002/07/owl#equivalentClass",
        "http://www.w3.org/2002/07/owl#unionOf",
        "http://www.w3.org/2002/07/owl#intersectionOf",

        "http://www.w3.org/2002/07/owl#disjointWith",
        "http://www.w3.org/2002/07/owl#Restriction",
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
    ];

    self.drawNodeAxioms = function (sourceLabel, nodeId, divId, depth, options, callback) {
        if (!sourceLabel) {
            sourceLabel = Lineage_sources.activeSource;
        }

        if (!options) {
            options = {};
        }

        options.skipRestrictions = false;

        var allBasicAxioms = {};
        var nodeIdTree = {};
        var visjsData = { nodes: [], edges: [] };

        async.series(
            [
                //get all elementary axioms
                function (callbackSeries) {
                    self.getNodeAxioms(sourceLabel, nodeId, depth, options, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        var graphUrisMap = Sparql_common.getSourceGraphUrisMap(self.currentSource);
                        result.forEach(function (item) {
                            var sType = item.sType ? item.sType.value : null;
                            var oType = item.oType ? item.oType.value : null;
                            var sLabel = item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value);
                            var pLabel = item.pLabel ? item.pLabel.value : Sparql_common.getLabelFromURI(item.p.value);
                            var oLabel = item.oLabel ? item.oLabel.value : Sparql_common.getLabelFromURI(item.o.value);
                            var sIsBlank = item.s.type == "bnode";
                            var oIsBlank = item.o.type == "bnode";
                            var sSource = item.sGraph ? graphUrisMap[item.sGraph.value] : null;
                            var oSource = item.oGraph ? graphUrisMap[item.oGraph.value] : null;

                            if (!allBasicAxioms[item.s.value]) {
                                allBasicAxioms[item.s.value] = {
                                    s: item.s.value,
                                    sType: sType,
                                    sLabel: sLabel,
                                    sIsBlank: sIsBlank,
                                    sSource: sSource,
                                };
                                allBasicAxioms[item.s.value].objects = [];
                            }

                            if (!allBasicAxioms[item.o.value]) {
                                allBasicAxioms[item.o.value] = {
                                    s: item.o.value,
                                    sType: oType,
                                    sLabel: oLabel,
                                    sIsBlank: oIsBlank,
                                    sSource: oSource,
                                };
                                allBasicAxioms[item.o.value].objects = [];
                            }

                            allBasicAxioms[item.s.value].objects.push({
                                o: item.o.value,
                                oType: oType,
                                oLabel: oLabel,
                                oIsBlank: oIsBlank,
                                oSource: oSource,
                                p: item.p.value,
                                pLabel: pLabel,
                            });
                        });
                        return callbackSeries();
                    });
                },

                //get nodes Source
                function (callbackSeries) {
                    var ids = Object.keys(allBasicAxioms);
                    Sparql_OWL.getUrisNamedGraph(self.currentSource, ids, { onlySourceAndImports: 1 }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        result.forEach(function (item) {
                            allBasicAxioms[item.id.value].sSource = Sparql_common.getSourceFromGraphUri(item.g.value, self.currentSource);
                        });
                        for (var id in allBasicAxioms) {
                            allBasicAxioms[id].objects.forEach(function (object) {
                                object.oSource = allBasicAxioms[object.o].sSource;
                            });
                        }
                        callbackSeries();
                    });
                },

                //escape some blank nodes

                function (callbackSeries) {
                    //  return callbackSeries()
                    for (var key in allBasicAxioms) {
                        var subject = allBasicAxioms[key];
                        //  var escapeProperties = ["http://www.w3.org/1999/02/22-rdf-syntax-ns#first", "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"];
                        var escapeProperties = [
                            "http://www.w3.org/2002/07/owl#unionOf",
                            "http://www.w3.org/2002/07/owl#intersectionOf",
                            //  "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"
                        ];

                        subject.objects.forEach(function (object, index) {
                            escapeProperties.forEach(function (escapeProperty) {
                                if (object && object.p == escapeProperty) {
                                    var jumper = allBasicAxioms[object.o];
                                    if (jumper) {
                                        allBasicAxioms[key].objects = jumper.objects;
                                        allBasicAxioms[key].disjonction = escapeProperty;
                                    }
                                }
                            });
                        });
                    }

                    for (var key in allBasicAxioms) {
                        var subject = allBasicAxioms[key];
                        //  var escapeProperties = ["http://www.w3.org/1999/02/22-rdf-syntax-ns#first", "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"];
                        var escapeProperties = ["http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"];

                        subject.objects.forEach(function (object, index) {
                            escapeProperties.forEach(function (escapeProperty) {
                                if (object && object.p == escapeProperty) {
                                    var jumper = allBasicAxioms[object.o];
                                    if (jumper) {
                                        allBasicAxioms[key].objects[index] = jumper.objects[0];
                                    }
                                }
                            });
                        });
                    }

                    callbackSeries();
                },

                //recurse draw tree to visjsdata
                function (callbackSeries) {
                    var geNodeStyle = function (id, type, label, source) {
                        var obj = {
                            label: label,
                            color: "#00afef",
                            shape: "box",
                            edgeStyle: null,
                        };
                        if (!type || !label) {
                            return obj;
                        }

                        if (type.indexOf("roperty") > -1) {
                            obj.edgeStyle = "property";
                            obj.shape = "box";
                            obj.color = "#f5ef39";
                            obj.size = self.defaultNodeSize;
                        }

                        if (type.indexOf("List") > -1) {
                            //    options.edgeStyle  = "property";
                            obj.shape = "text";
                            obj.color = "#00efdb";
                            obj.label = "L"; //"∀";
                            obj.size = self.defaultNodeSize;
                        } else if (type.indexOf("Restriction") > -1) {
                            obj.edgeStyle = "restriction";
                            obj.shape = "box";
                            obj.label = "R"; //"∀";
                            obj.color = "#cb9801";
                            obj.size = self.defaultNodeSize;
                        } else if (type.indexOf("Individual") > -1) {
                            obj.edgeStyle = "individual";
                            obj.shape = "star";
                            // options.label = "R"; //"∀";
                            obj.color = "#blue";
                            obj.size = self.defaultNodeSize;
                        } else {
                            //  options.color = Lineage_whiteboard.getSourceColor(targetItem.g.value || self.defaultNodeColor);
                        }

                        return obj;
                    };

                    var existingNodes = {};
                    var stop = false;

                    function recurse(_nodeId, level, symbol) {
                        if (level > 1) {
                        } // return

                        if (stop) {
                            return;
                        }

                        var node = allBasicAxioms[_nodeId];
                        if (!node) {
                            return;
                        }

                        if (node.sType == "http://www.w3.org/2002/07/owl#Restriction") {
                            var x = 3;
                        }

                        if (node.s == "http://purl.obolibrary.org/obo/BFO_0000001") {
                            //  stop = true;
                        }
                        if (node.s == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        }

                        if (existingNodes[_nodeId]) {
                            visjsData.nodes.forEach(function (node, nodeIndex) {
                                if (node.id == _nodeId && node.level > level) {
                                    visjsData.nodes[nodeIndex].level = level;
                                }
                            });
                        } else {
                            var style = geNodeStyle(node.s, node.sType, node.sLabel);

                            if (node.disjonction) {
                                style.shape = "circle";
                                style.label = Config.Lineage.logicalOperatorsMap[node.disjonction];
                                style.color = "#70ac47";
                                symbol = null;
                            }

                            if (style.color == "#00afef" && node.sSource) {
                                style.color = common.getResourceColor("source", node.sSource);
                            }

                            existingNodes[node.s] = level;
                            //  var objectLevel = node.sType && node.sType.indexOf("roperty") > -1 ? level - 1 : level;

                            visjsData.nodes.push({
                                id: node.s,
                                label: symbol || style.label,
                                shape: symbol ? "circle" : style.shape,
                                color: symbol ? "#9db99d" : style.color,
                                size: 8,
                                level: level,
                                data: {
                                    id: node.s,
                                    label: node.sLabel,
                                    type: node.sType,
                                    source: node.sSource,
                                },
                            });
                        }

                        // children
                        if (node.objects) {
                            node.objects.forEach(function (object) {
                                if (false && object.oSource && object.oSource != sourceLabel) {
                                    return;
                                }

                                if (existingNodes[object.o] < level) {
                                    // dont draw backward edges
                                    return;
                                }

                                var edgeId = node.s + "_" + object.o;
                                var symbol = Config.Lineage.logicalOperatorsMap[object.p] || object.pLabel;

                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: node.s,
                                        to: object.o,
                                        // label: symbol,
                                        arrows: {
                                            to: {
                                                enabled: true,
                                                type: "solid",
                                                scaleFactor: 0.5,
                                            },
                                        },
                                        data: {
                                            id: edgeId,
                                            from: node.s,
                                            to: object.o,
                                            label: node.pLabel,
                                            type: node.sType,
                                        },
                                    });
                                    var symbol = null;
                                    if (object.oIsBlank && object.oType != "http://www.w3.org/2002/07/owl#Restriction") {
                                        symbol = Config.Lineage.logicalOperatorsMap[object.p] || null;
                                    }

                                    if (false && level == 0 && object.p != "http://www.w3.org/2002/07/owl#equivalentClass") {
                                        return;
                                    }

                                    if (false && object.oSource != self.currentSource) {
                                        return;
                                    }
                                    var objectLevel = level + 1;
                                    if (false && (object.p.indexOf("Value") > -1 || object.p.indexOf("onProperty") > -1)) {
                                        objectLevel = level;
                                    }

                                    // stop draw children when subClassof a class
                                    //   if ( level >0 && object.oType == "http://www.w3.org/2002/07/owl#Class" && object.p.indexOf("subClassOf")>-1) {
                                    if (false && object.oSource != sourceLabel) {
                                        return;
                                    }
                                    recurse(object.o, objectLevel, symbol);
                                }
                            });
                        }
                    }

                    var level = 0;

                    recurse(nodeId, level);
                    //   console.log(JSON.stringify(visjsData));
                    return callbackSeries();
                },

                //set hide nodes of level > maxLevels
                function (callbackSeries) {
                    var maxLevels = 10;
                    visjsData.nodes.forEach(function (node, nodeIndex) {
                        if (node.level > maxLevels) {
                            visjsData.nodes[nodeIndex].hidden = true;
                        }
                    });
                    callbackSeries();
                },

                // filter FOL nodes
                function (callbackSeries) {
                    return callbackSeries();

                    /*    var strFrom=Sparql_common.getFromStr(self.currentSource,false,true)
var query="SELECT distinct ?fol "+strFrom+" WHERE {\n" +
"<"+nodeId+">  <https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/firstOrderLogicDefinition> ?fol .}"



var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
if (err) {
return callback(err);
}

if(result.results.bindings.length==0)
return callbackSeries();
var fol=result.results.bindings[0].fol.value.toLowerCase()

var folNodes=[]
visjsData.nodes.forEach(function(node){
if(fol.indexOf(node.data.label.toLowerCase())>-1)
folNodes.push(node)
})
visjsData.nodes=folNodes

callbackSeries();
});*/
                },

                //draw graph

                function (callbackSeries) {
                    if (options.addToGraph && self.axiomsVisjsGraph) {
                        self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
                        self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        self.drawGraph(visjsData);
                        self.currentVisjsData = visjsData;
                    }
                    return callbackSeries();
                },
            ],

            function (err) {
                if (callback) {
                    return callback(err);
                }
            }
        );
    };

    self.drawGraph = function (visjsData) {
        var xOffset = 60;
        var yOffset = 130;
        xOffset = parseInt($("#axiomsDraw_xOffset").val());
        yOffset = parseInt($("#axiomsDraw_yOffset").val());
        var options = {
            keepNodePositionOnDrag: true,
            /* physics: {
enabled:true},*/

            layoutHierarchical: {
                direction: "LR",
                sortMethod: "hubsize",
                levelSeparation: xOffset,
                parentCentralization: true,
                shakeTowards: "roots",
                blockShifting: true,

                nodeSpacing: yOffset,
            },
            visjsOptions: {
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        // type: "diagonalCross",
                        forceDirection: "horizontal",

                        roundness: 0.4,
                    },
                },
            },
            onclickFn: Lineage_axioms_draw.onNodeClick,
            onRightClickFn: Lineage_axioms_draw.showGraphPopupMenu,
            onHoverNodeFn: Lineage_axioms_draw.selectNodesOnHover,
        };

        var graphDivContainer = "axiomsGraphDivContainer";
        $("#" + graphDivContainer).html(
            "<span style='font-size: 16px;color: blue; font-weight: bold'> WORK IN PROGRESS</span>" +
                '  <button onclick="AxiomEditor.init()">Edit Axiom</button>' +
                "<div id='axiomsGraphDiv2' style='width:100%;height:525px;' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>"
        );
        self.axiomsVisjsGraph = new VisjsGraphClass("axiomsGraphDiv2", visjsData, options);
        self.axiomsVisjsGraph.draw(function () {});
    };

    self.onNodeClick = function (node, point, nodeEvent) {
        self.currentGraphNode = node;
        if (nodeEvent.ctrlKey) {
            return self.expandNode(node);
        }
        self.showNodeInfos(node, point, nodeEvent);
        return;

        /*  self.currentGraphNode = node;
if (nodeEvent.ctrlKey && nodeEvent.shiftKey) {
var options = { addToGraph: 1, level: self.currentGraphNode.level };
return self.drawNodeAxioms(self.context.sourceLabel, self.currentGraphNode.data.id, self.context.divId, 2, options);
}

self.showNodeInfos(node, point, options);*/
    };

    self.expandNode = function (node) {
        var newNodes = [];
        self.currentVisjsData.edges.forEach(function (edge) {
            if (edge.from == node.id) {
                newNodes.push({ id: edge.to, hidden: false, level: node.level + 1 });
            }
        });
        self.axiomsVisjsGraph.data.nodes.update(newNodes);
    };

    self.showGraphPopupMenu = function (node, point, options) {
        if (node) {
            self.currentGraphNode = node;
        } else {
            return $("#axiomsDrawGraphDiv").html("no entity selected");
        }

        var html = '<div style="display: flex;flex-direction: column">';
        html += '  <span class="popupMenuItem" onclick="Lineage_axioms_draw.showNodeInfos ();"> Infos</span>';
        html += '  <span class="popupMenuItem" onclick="Lineage_axioms_draw.hideNode ();"> Hide</span>';

        html += ' <span class="popupMenuItem" onclick="Lineage_axioms_draw.drawAxiomsFromNode();"> Draw  from here</span>';
        //  html += ' <span class="popupMenuItem" onclick="Lineage_axioms_draw.showBranchOnly();"> ShowBranchOnly</span>'
        if (Lineage_sources.isSourceEditableForUser(self.currentGraphNode.data.source)) {
            html += '  <span class="popupMenuItem" onclick="Lineage_axioms_create.showAdAxiomDialog (\'axioms_dialogDiv\');"> <b>Add Axiom</b></span>';
            html += ' <span class="popupMenuItem" onclick="Lineage_axioms_create.deleteGraphSelectedAxiom();"> Delete </span>';
        }

        html += "</div>";

        // popupMenuWidget.showPopup(point, "axioms_popupMenuWidgetDiv");
        var popupDiv = "axioms_popupMenuWidgetDiv";

        $("#" + popupDiv).css("display", "flex");
        $("#" + popupDiv).css("left", point.x);
        $("#" + popupDiv).css("top", point.y);
        $("#" + popupDiv).html(html);
    };

    self.drawAxiomsFromNode = function () {
        var options = { addToGraph: 1, level: self.currentGraphNode.level };
        self.drawNodeAxioms(self.currentSource, self.currentGraphNode.data.id);
    };
    self.selectNodesOnHover = function (node, point, options) {};

    self.hideNode = function () {
        var id = self.currentGraphNode.id;
        if (!id) {
            return;
        }
        self.axiomsVisjsGraph.data.nodes.update({ id: id, hidden: true });
    };

    self.showNodeInfos = function (node, point, options) {
        if (!node) {
            node = self.currentGraphNode;
        }

        if (!node || !node.data) {
            return $("#nodeInfosWidget_HoverDiv").css("display", "none");
        } else {
            self.currentGraphNode = node;
        }
        //  $("#nodeInfosWidget_tabsDiv").tabs("option", "active", 0);
        var source = node.data.source || self.currentSource;
        //   NodeInfosWidget.showNodeInfos(source, node, "smallDialogDiv");
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").html("<div id='smallDialog_nodeInfos'></div>");
        NodeInfosWidget.drawCommonInfos(source, node.id, "smallDialog_nodeInfos", {});

        return;

        /*  NodeInfosWidget.showNodeInfos(self.currentSource, node,"smallDialogDiv")

return*/

        if (!point) {
            point = { x: 200, y: 200 };
        }
        if (!options) {
            options = {};
        }

        var html = "<table >";

        html += "<tr><td>uri</td><td>" + node.data.id + "</td></tr>";
        if (node.data.label) {
            html += "<tr><td>label</td><td>" + node.data.label + "</td></tr>";
        }
        if (node.data.type) {
            html += "<tr><td>type</td><td>" + node.data.type + "</td></tr>";
        }
        var infos = node.data.infos;
        if (infos) {
            html += "<tr style='border: #0e0e0e 1px solid'><td>children</td><td>";
            infos.children.forEach(function (item, index) {
                if (index > 0) {
                    html += "<br>";
                }
                html += item.pred + "<b>-></b>" + item.obj;
            });
            html += "</td</tr>";

            html += "<tr style='border: #0e0e0e 1px solid'><td>ancestors</td><td>";
            infos.parents.forEach(function (item, index) {
                if (index > 0) {
                    html += "<br>";
                }
                html += item;
            });
            html += "</td</tr>";
        }

        html += "</table>";

        html = JSON.stringify(
            node.data,
            function (key, value) {
                return value; //.replace(/"/g,"").replace(/,/g,"<br>")
            },
            2
        );

        $("#nodeInfosWidget_HoverDiv").css("top", point.y);
        $("#nodeInfosWidget_HoverDiv").css("left", point.x);
        $("#nodeInfosWidget_HoverDiv").html(html);
        $("#nodeInfosWidget_HoverDiv").css("display", "block");
    };

    self.changeDepth = function (depth) {
        self.drawNodeAxioms(self.context.sourceLabel, self.context.nodeId, self.context.divId, self.context.depth + depth);
    };

    self.drawNodeWithoutAxioms = function (sourceLabel, nodeId) {
        Sparql_OWL.getAllTriples(sourceLabel, "subject", [nodeId], {}, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var visjsData = { nodes: [], edges: [] };
            var nodeLabel = "";
            var nodeTypes = [];
            result.forEach(function (item) {
                if (item.predicate.value.indexOf("label") > -1) {
                    nodeLabel = item.object.value;
                }
                if (item.predicate.value.indexOf("type") > -1) {
                    nodeTypes.push(item.object.value);
                }
            });
            var options = {
                level: 1,
                type: nodeTypes,
            };
            var node = VisjsUtil.getVisjsNode(sourceLabel, nodeId, nodeLabel || Sparql_common.getLabelFromURI(nodeId), null, options);

            visjsData.nodes.push(node);

            self.drawGraph(visjsData);
        });
    };

    self.exportCSV = function () {
        Export.exportGraphToDataTable(self.axiomsVisjsGraph, "axioms_dialogDiv");
    };

    self.exportSVG = function () {
        self.axiomsVisjsGraph.toSVG();
    };

    self.graphToFOLdefinition = function (node) {};

    var edgeStyles = {
        property: {
            color: "#3a773a",
            dashes: [8, 2],
        },
        default: {
            color: "#888",
            dashes: false,
        },

        restriction: {
            color: "#cb6601",
            dashes: [2, 2],
        },
        individualX: {
            color: "blue",
            dashes: [2, 2],
        },
    };

    return self;
})();

export default Lineage_axioms_draw;
window.Lineage_axioms_draw = Lineage_axioms_draw;
