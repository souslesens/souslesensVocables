import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axioms_editor from "./axioms_editor.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import common from "../../shared/common.js";
import Export from "../../shared/export.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";

var Axioms_graph = (function () {
    var self = {};

    self.manchesterriplestoSparqlBindings = function (source, manchesterTriples, callback) {
        var escapeMarkup = function (str) {
            var str2 = str.replace(/</g, "&lt;");
            var str2 = str2.replace(/>/g, "&gt;");
            return str2;
        };

        var triplesMap = {};
        manchesterTriples.forEach(function (item) {
            var uri = item.subject.replace("[OntObject]", "");
            triplesMap[uri] = { isBlank: !uri.startsWith("http") };

            var uri = item.object.replace("[OntObject]", "");
            triplesMap[uri] = { isBlank: !uri.startsWith("http") };
        });

        var resourceIds = [];
        for (var uri in triplesMap) {
            if (!triplesMap[uri].isBlank) resourceIds.push(uri);
        }
        var fromStr = Sparql_common.getFromStr(source, false, false);
        var filterStr = Sparql_common.setFilter("s", resourceIds);
        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
/*
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            " SELECT distinct ?sGraph ?oGraph ?s ?p  ?o ?sType ?oType  ?sLabel ?pLabel  ?oLabel ?sIsBlank ?oIsBlank " +
            fromStr +
            "      WHERE {   ?s ?p ?o." +
            "  optional{ ?s rdf:type ?sType.}\n" +
            "  optional{    ?o rdf:type ?oType.}\n" +
            "  optional{   ?s rdfs:label ?sLabel.}\n" +
            "  optional{   ?o rdfs:label ?oLabel.}\n" +
            "  optional{    ?p rdfs:label ?pLabel.} \n" +
            "  filter (?p in (rdf:type,rdfs:label))" +
            filterStr +
            "} limit 10000";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var bindings = [];
            var data = []; //result.results.bindings
            /*
 */
        var data = [];
        manchesterTriples.forEach(function (item) {
                var subjectUri = item.subject.replace("[OntObject]", "");
                var predicateUri = item.predicate.replace("[OntObject]", "");
                var objectUri = item.object.replace("[OntObject]", "");

                function getType(uri) {
                    if (uri.indexOf("http") > -1) return "uri";
                    return "bnode";
                }

                data.push({
                    s: {
                        type: getType(subjectUri),
                        value: subjectUri,
                    },
                    p: {
                        type: getType(predicateUri),
                        value: predicateUri,
                    },
                    o: {
                        type: getType(objectUri),
                        value: objectUri,
                    },
                });
            });

            return callback(null, data);
       // });
    };

    self.drawTriples = function (divId) {
        divId = "Axioms_editor_triplesDataTableDiv";
        self.currentSource = Axioms_editor.currentSource;
        self.graphDivContainer = divId;
        self.drawNodeAxioms(Axioms_editor.currentSource, Axioms_editor.currentNode.id, divId, {}, function (err, result) {
            //   self.manchesterriplestoSparqlBindings(Axioms_editor.currentSource,self.sampleTriples,null,{},function(err, result){
        });
    };

    self.showTriplesInDataTable = function (divId, data) {
        var escapeMarkup = function (str) {
            var str2 = str.replace(/</g, "&lt;");
            var str2 = str2.replace(/>/g, "&gt;");
            return str2;
        };

        var tableCols = [];
        var hearders = ["subject", "predicate", "object"];
        hearders.forEach(function (item) {
            tableCols.push({ title: item, defaultContent: "", width: "30%" });
        });

        var tableData = [];
        data.forEach(function (item, index) {
            tableData.push([escapeMarkup(item.subject), escapeMarkup(item.predicate), escapeMarkup(item.object)]);
        });

        var str = "<table><tr><td>subject</td><td>predicate</td><td>object</td></tr>";
        data.forEach(function (item, index) {
            str += "<tr><td>" + escapeMarkup(item.subject) + "</td><td>" + escapeMarkup(item.predicate) + "</td><td>" + escapeMarkup(item.object) + "</td></tr>";
        });
        str += "</table>";

        /*  $("#KGcreator_triplesDataTableDiv").html(str)
          return;*/
        Export.showDataTable(divId, tableCols, tableData, null, { paging: true }, function (err, datatable) {});
    };




    self.drawNodeAxioms = function (sourceLabel, nodeId, divId, options, callback) {
        if (!options) options = {};

        options.skipRestrictions = false;

        var allBasicAxioms = {};
        var nodeIdTree = {};
        var visjsData = { nodes: [], edges: [] };

        async.series(
            [
                //get all elementary axioms
                function (callbackSeries) {
                    self.manchesterriplestoSparqlBindings(Axioms_editor.currentSource, self.sampleTriples, function (err, result) {
                        //  self.getNodeAxioms(sourceLabel, nodeId, depth, options, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        var graphtriplesMap = {}; //Sparql_common.getSourceGraphtriplesMap(self.currentSource);
                        result.forEach(function (item) {
                            var sType = item.sType ? item.sType.value : null;
                            var oType = item.oType ? item.oType.value : null;
                            var sLabel = item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value);
                            var pLabel = item.pLabel ? item.pLabel.value : Sparql_common.getLabelFromURI(item.p.value);
                            var oLabel = item.oLabel ? item.oLabel.value : Sparql_common.getLabelFromURI(item.o.value);
                            var sIsBlank = item.s.type == "bnode";
                            var oIsBlank = item.o.type == "bnode";
                            var sSource = item.sGraph ? graphtriplesMap[item.sGraph.value] : null;
                            var oSource = item.oGraph ? graphtriplesMap[item.oGraph.value] : null;

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
                    return callbackSeries();

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
                    return callbackSeries();

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
                                if (!object || !object.o) return;

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

            layoutHierarchicalXX: {
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

        $("#" + self.graphDivContainer).html(
            "<span style='font-size: 16px;color: blue; font-weight: bold'> WORK IN PROGRESS</span>" +
                '  <button onclick="AxiomEditor.init()">Edit Axiom</button>' +
                "<div id='axiomsGraphDiv3' style='width:800px;height:525px;' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>"
        );
        self.axiomsVisjsGraph = new VisjsGraphClass("axiomsGraphDiv3", visjsData, options);
        self.axiomsVisjsGraph.draw(function () {});
    };

    self.onNodeClick = function (node, point, nodeEvent) {
        self.currentGraphNode = node;
        if (nodeEvent.ctrlKey) {
            return self.expandNode(node);
        }
        self.showNodeInfos(node, point, nodeEvent);
        return;
    };

    self.sampleTriplesOld = [
        {
            subject: "[OntObject]05a9d835-07a3-4b3e-b552-5d20a89c94b1",
            predicate: "http://www.w3.org/2002/07/owl#intersectionOf",
            object: "[OntObject]f73224b7-009f-492c-99b8-2b11c731df69",
        },
        {
            subject: "[OntObject]f73224b7-009f-492c-99b8-2b11c731df69",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/PlanSpecification",
        },
        {
            subject: "[OntObject]9af282e7-5a09-4766-8de8-e5a8ba1d1ee9",
            predicate: "http://www.w3.org/2002/07/owl#onProperty",
            object: "[OntObject]http://purl.obolibrary.org/obo/BFO_0000219",
        },
        {
            subject: "[OntObject]bc378237-cf88-473a-b0e3-b8dbdac21a13",
            predicate: "http://www.w3.org/2002/07/owl#onProperty",
            object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/prescribedBy",
        },
        {
            subject: "[OntObject]0ea67f4e-3cad-46a0-be67-d1d8ff3190b8",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            object: "[OntObject]http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
        },
        {
            subject: "[OntObject]a5720162-c324-4444-9b75-936c8f211eda",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            object: "[OntObject]d6c7cdb4-9e96-4369-9882-63691adc85f4",
        },
        {
            subject: "[OntObject]bc378237-cf88-473a-b0e3-b8dbdac21a13",
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: "[OntObject]05a9d835-07a3-4b3e-b552-5d20a89c94b1",
        },
        {
            subject: "[OntObject]0ea67f4e-3cad-46a0-be67-d1d8ff3190b8",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            object: "[OntObject]4c92b75c-0e0c-4be9-880d-d827a5a70402",
        },
        {
            subject: "[OntObject]4c92b75c-0e0c-4be9-880d-d827a5a70402",
            predicate: "http://www.w3.org/2002/07/owl#onProperty",
            object: "[OntObject]http://purl.obolibrary.org/obo/BFO_0000111",
        },
        {
            subject: "[OntObject]d6c7cdb4-9e96-4369-9882-63691adc85f4",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            object: "[OntObject]9af282e7-5a09-4766-8de8-e5a8ba1d1ee9",
        },
        {
            subject: "[OntObject]f73224b7-009f-492c-99b8-2b11c731df69",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            object: "[OntObject]0ea67f4e-3cad-46a0-be67-d1d8ff3190b8",
        },
        {
            subject: "[OntObject]a5720162-c324-4444-9b75-936c8f211eda",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/ObjectiveSpecification",
        },
        {
            subject: "[OntObject]d674942f-d3d6-4c9b-94dc-7c16086c020c",
            predicate: "http://www.w3.org/2002/07/owl#intersectionOf",
            object: "[OntObject]a5720162-c324-4444-9b75-936c8f211eda",
        },
        {
            subject: "[OntObject]9af282e7-5a09-4766-8de8-e5a8ba1d1ee9",
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessOrganization",
        },
        {
            subject: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess",
            predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
            object: "[OntObject]bc378237-cf88-473a-b0e3-b8dbdac21a13",
        },
        {
            subject: "[OntObject]4c92b75c-0e0c-4be9-880d-d827a5a70402",
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: "[OntObject]d674942f-d3d6-4c9b-94dc-7c16086c020c",
        },
        {
            subject: "[OntObject]d6c7cdb4-9e96-4369-9882-63691adc85f4",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            object: "[OntObject]http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
        },
    ];
    self.sampleTriples=[
        {
            "subject": "https://spec.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess",
            "predicate": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
            "object": "_cf23908b-4568-4f73-9c09-fbf688aaa92f"
        },
        {
            "subject": "https://spec.industrialontologies.org/ontology/core/Core/CommercialServiceAgreement",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://www.w3.org/2002/07/owl#Class"
        },
        {
            "subject": "_cf23908b-4568-4f73-9c09-fbf688aaa92f",
            "predicate": "http://www.w3.org/2002/07/owl#onProperty",
            "object": "http://purl.obolibrary.org/obo/BFO_0000167"
        },
        {
            "subject": "http://purl.obolibrary.org/obo/BFO_0000167",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://www.w3.org/2002/07/owl#ObjectProperty"
        },
        {
            "subject": "_c44c5bfa-6011-413e-8c2c-c4d08a7c24fa",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://www.w3.org/2002/07/owl#Ontology"
        },
        {
            "subject": "_2cba2cae-ed14-45ca-a705-193ae9d044b2",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            "object": "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
        },
        {
            "subject": "_cf23908b-4568-4f73-9c09-fbf688aaa92f",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://www.w3.org/2002/07/owl#Restriction"
        },
        {
            "subject": "_81b2dbe0-c5aa-4dd6-8f30-d98590de9af7",
            "predicate": "http://www.w3.org/2002/07/owl#unionOf",
            "object": "_db33cc04-5921-48cd-8171-c4d286549abd"
        },
        {
            "subject": "_db33cc04-5921-48cd-8171-c4d286549abd",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            "object": "_2cba2cae-ed14-45ca-a705-193ae9d044b2"
        },
        {
            "subject": "_81b2dbe0-c5aa-4dd6-8f30-d98590de9af7",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://www.w3.org/2002/07/owl#Class"
        },
        {
            "subject": "https://spec.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://www.w3.org/2002/07/owl#Class"
        },
        {
            "subject": "https://spec.industrialontologies.org/ontology/core/Core/MaterialProduct",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://www.w3.org/2002/07/owl#Class"
        },
        {
            "subject": "_cf23908b-4568-4f73-9c09-fbf688aaa92f",
            "predicate": "http://www.w3.org/2002/07/owl#someValuesFrom",
            "object": "_81b2dbe0-c5aa-4dd6-8f30-d98590de9af7"
        },
        {
            "subject": "_2cba2cae-ed14-45ca-a705-193ae9d044b2",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            "object": "https://spec.industrialontologies.org/ontology/core/Core/MaterialProduct"
        },
        {
            "subject": "_db33cc04-5921-48cd-8171-c4d286549abd",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            "object": "https://spec.industrialontologies.org/ontology/core/Core/CommercialServiceAgreement"
        }
    ]
    return self;
})();

export default Axioms_graph;
window.Axioms_graph = Axioms_graph;
