import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axiom_editor from "./axiom_editor.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import common from "../../shared/common.js";
import Export from "../../shared/export.js";


var Axioms_graph = (function() {
    var self = {};

    self.manchesterriplestoSparqlBindings = function(source, manchesterTriples, callback) {
        var escapeMarkup = function(str) {
            var str2 = str.replace(/</g, "&lt;");
            var str2 = str2.replace(/>/g, "&gt;");
            return str2;
        };

        var triplesMap = {};
        manchesterTriples.forEach(function(item) {
            var uri = item.subject.replace("[OntObject]", "");
            triplesMap[uri] = { isBlank: !uri.startsWith("http") };

            var uri = item.object.replace("[OntObject]", "");
            triplesMap[uri] = { isBlank: !uri.startsWith("http") };
        });

        var resourceIds = [];
        for (var uri in triplesMap) {
            if (!triplesMap[uri].isBlank) {
                resourceIds.push(uri);
            }
        }

        var data = [];
        manchesterTriples.forEach(function(item) {
            var subjectUri = item.subject.replace("[OntObject]", "");
            var predicateUri = item.predicate.replace("[OntObject]", "");
            var objectUri = item.object.replace("[OntObject]", "");

            function getType(uri) {
                if (uri.indexOf("http") > -1) {
                    return "uri";
                }
                return "bnode";
            }

            data.push({
                s: {
                    type: getType(subjectUri),
                    value: subjectUri
                },
                p: {
                    type: getType(predicateUri),
                    value: predicateUri
                },
                o: {
                    type: getType(objectUri),
                    value: objectUri
                }
            });
        });

        return callback(null, data);

    };

    self.geNodeStyle = function(node) {
        var id = node.s;
        var type = node.sType;
        var label = node.slabel;


        var obj = {
            label: label,
            color: "#00afef",
            shape: "box",
            edgeStyle: null
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

        if (node.disjonction) {
            style.shape = "circle";
            style.label = Config.Lineage.logicalOperatorsMap[node.disjonction];
            style.color = "#70ac47";
            style.symbol = null;
        }


        if (style.color == "#00afef" && node.sSource) {
            style.color = common.getResourceColor("source", node.sSource);
        }
        return obj;
    };


    self.getVisjsNode = function(node) {
        var style = self.geNodeStyle(node);
        var visjsNode = {
            id: node.s,
            label: node.symbol || style.label,
            shape: node.symbol ? "circle" : style.shape,
            color: node.symbol ? "#9db99d" : style.color,
            size: 8,
            level: level,
            data: {
                id: node.s,
                label: node.sLabel,
                type: node.sType,
                source: node.sSource
            }
        };

    };


    self.drawNodeAxioms2 = function(sourceLabel, nodeId, manchesterTriples, divId, options, callback) {
        var nodesMap = {};
        var triples = [];
        async.series([


                //format mancheseter triples
                function(callbackSeries) {


                    var data = [];
                    manchesterTriples.forEach(function(triple) {
                        var s = triple.subject.replace("[OntObject]", "");
                        var p = triple.predicate.replace("[OntObject]", "");
                        var o = triple.object.replace("[OntObject]", "");

                        function getType(uri) {
                            if (uri.indexOf("http") > -1) {
                                return "uri";
                            }
                            return "bnode";
                        }

                        if (!nodesMap[s]) {
                            nodesMap[s] = {};
                            if(s.indexOf("http")==0){
                                var obj=Axiom_editor.allResourcesMap[s]
                                nodesMap[s].label=obj?obj.label:null
                            }
                        }


                        if (p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {

                            nodesMap[s].owlType = o;

                        } else if (p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest" && o == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        }else{
                            if(! nodesMap[s].predicates)
                                nodesMap[s].predicates=[]
                            var obj=Axiom_editor.allResourcesMap[p]
                            nodesMap[s].predicates.push({p:p,o:o,pLabel:obj?obj.label:null})

                        }


                    });

var x=nodesMap
                    callbackSeries()
                },


                //get nodesMap with children
                function(callbackSeries) {

                    callbackSeries()
                },

                //recurse nodes from nodeId
                function(callbackSeries) {

                    var existingNodes = {};
                    var stop = false;
                    var visjsData = { nodes: [], edges: [] };

                    function recurse(_nodeId, level, symbol) {


                        if (stop) {
                            return;
                        }

                        var node = nodesMap[_nodeId];
                        if (!node) {
                            return;
                        }


                        if (node.s == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        }


                        //if a node is present several times we take the maximum level
                        if (existingNodes[_nodeId]) {
                            visjsData.nodes.forEach(function(node, nodeIndex) {
                                if (node.id == _nodeId && node.level > level) {
                                    visjsData.nodes[nodeIndex].level = level;
                                }
                            });
                        } else {
                            node.symbol = symbol;
                            existingNodes[node.s] = level;
                            var visjsNode = self.getVisjsNode(node);

                            visjsData.nodes.push(visjsNode);
                        }


                        // children
                        if (node.children) {
                            node.children.forEach(function(childId) {
                                var childNode = nodesMap[childId];
                                if (!childNode) {
                                    return;
                                }


                                if (existingNodes[childId] < level) {
                                    // dont draw backward edges
                                    return;
                                }

                                var visjsNode = self.getVisjsNode(childNode);
                                visjsData.nodes.push(visjsNode);


                                var edgeId = node.s + "_" + childId;
                                //   var symbol = Config.Lineage.logicalOperatorsMap[object.p] || object.pLabel;

                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: node.s,
                                        to: childId,
                                        // label: symbol,
                                        arrows: {
                                            to: {
                                                enabled: true,
                                                type: "solid",
                                                scaleFactor: 0.5
                                            }
                                        },
                                        data: {
                                            id: edgeId,
                                            from: node.s,
                                            to: childId
                                            // label: node.pLabel,
                                            // type: node.sType
                                        }
                                    });
                                }
                            });
                        }
                    }


                    var level = 0;
                    recurse(nodeId, level);
                    //   console.log(JSON.stringify(visjsData));
                    return callbackSeries();


                }
                ,

                //draw graph
                function(callbackSeries) {
                    if (options.addToGraph && self.axiomsVisjsGraph) {
                        self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
                        self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        self.drawGraph(visjsData);
                        self.currentVisjsData = visjsData;
                    }
                    return callbackSeries();
                }

            ],

            function(err) {
                if (callback) {
                    return callback(err);
                }
            }
        );
    };


    self.drawNodeAxioms = function(sourceLabel, nodeId, manchesterTiples, divId, options, callback) {
        if (!options) {
            options = {};
        }
        self.graphDivContainer = divId;
        options.skipRestrictions = false;

        var allBasicAxioms = {};
        var nodeIdTree = {};
        var visjsData = { nodes: [], edges: [] };
        if (!manchesterTiples) {
            manchesterTiples = self.sampleTriples;
        }

        var nodeStyles = {};

        async.series(
            [
                //get all elementary axioms
                function(callbackSeries) {
                    self.manchesterriplestoSparqlBindings(Axiom_editor.currentSource, manchesterTiples, function(err, result) {
                        //  self.getNodeAxioms(sourceLabel, nodeId, depth, options, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        var graphtriplesMap = {}; //Sparql_common.getSourceGraphtriplesMap(self.currentSource);
                        result.forEach(function(item) {
                            var sType = item.sType ? item.sType.value : null;
                            var oType = item.oType ? item.oType.value : null;
                            var sLabel = item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value);
                            var pLabel = item.pLabel ? item.pLabel.value : Sparql_common.getLabelFromURI(item.p.value);
                            var oLabel = item.oLabel ? item.oLabel.value : Sparql_common.getLabelFromURI(item.o.value);
                            if (Axiom_editor.allResourcesMap[item.p.value]) {
                                sLabel = item.sLabel ? item.sLabel.value : Axiom_editor.allResourcesMap[item.s.value].label;
                            }
                            if (Axiom_editor.allResourcesMap[item.p.value]) {
                                pLabel = item.pLabel ? item.pLabel.value : Axiom_editor.allResourcesMap[item.p.value].label;
                            }
                            if (Axiom_editor.allResourcesMap[item.o.value]) {
                                oLabel = item.oLabel ? item.oLabel.value : Axiom_editor.allResourcesMap[item.o.value].label;
                            }


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
                                    sSource: sSource
                                };
                                allBasicAxioms[item.s.value].objects = [];
                            }

                            if (!allBasicAxioms[item.o.value]) {
                                allBasicAxioms[item.o.value] = {
                                    s: item.o.value,
                                    sType: oType,
                                    sLabel: oLabel,
                                    sIsBlank: oIsBlank,
                                    sSource: oSource
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
                                pLabel: pLabel
                            });
                        });
                        return callbackSeries();
                    });
                },

                //get nodes Source
                function(callbackSeries) {
                    return callbackSeries();

                    var ids = Object.keys(allBasicAxioms);
                    Sparql_OWL.getUrisNamedGraph(self.currentSource, ids, { onlySourceAndImports: 1 }, function(err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        result.forEach(function(item) {
                            allBasicAxioms[item.id.value].sSource = Sparql_common.getSourceFromGraphUri(item.g.value, self.currentSource);
                        });
                        for (var id in allBasicAxioms) {
                            allBasicAxioms[id].objects.forEach(function(object) {
                                object.oSource = allBasicAxioms[object.o].sSource;
                            });
                        }
                        callbackSeries();
                    });
                },

                //escape some blank nodes

                function(callbackSeries) {
                    return callbackSeries();

                    for (var key in allBasicAxioms) {
                        var subject = allBasicAxioms[key];
                        //  var escapeProperties = ["http://www.w3.org/1999/02/22-rdf-syntax-ns#first", "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"];
                        var escapeProperties = [
                            "http://www.w3.org/2002/07/owl#unionOf",
                            "http://www.w3.org/2002/07/owl#intersectionOf"
                            //  "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"
                        ];

                        subject.objects.forEach(function(object, index) {
                            escapeProperties.forEach(function(escapeProperty) {
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

                        subject.objects.forEach(function(object, index) {
                            escapeProperties.forEach(function(escapeProperty) {
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
                function(callbackSeries) {
                    var geNodeStyle = function(id, type, label, source) {
                        var obj = {
                            label: label,
                            color: "#00afef",
                            shape: "box",
                            edgeStyle: null
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


                        if (stop) {
                            return;
                        }

                        var node = allBasicAxioms[_nodeId];
                        if (!node) {
                            return;
                        }


                        if (node.s == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        }

                        if (existingNodes[_nodeId]) {
                            visjsData.nodes.forEach(function(node, nodeIndex) {
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
                                    source: node.sSource
                                }
                            });
                        }

                        // children
                        if (node.objects) {
                            node.objects.forEach(function(object) {
                                if (false && object.oSource && object.oSource != sourceLabel) {
                                    return;
                                }
                                if (!object || !object.o) {
                                    return;
                                }

                                if (existingNodes[object.o] < level) {
                                    // dont draw backward edges
                                    return;
                                }

                                var edgeId = node.s + "_" + object.o;
                                var symbol = Config.Lineage.logicalOperatorsMap[object.p] || object.pLabel;


                                if (object.o == "http://www.w3.org/2002/07/owl#Class") {
                                    nodeStyles[node.s] = "owl:Class";
                                    return;
                                }


                                if (object.o == "http://www.w3.org/2002/07/owl#ObjectProperty") {
                                    nodeStyles[node.s] = "owl:ObjectProperty";
                                    return;
                                }
                                if (object.o == "http://www.w3.org/2002/07/owl#Restriction") {
                                    nodeStyles[node.s] = "owl:Restriction";
                                    return;
                                }


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
                                                scaleFactor: 0.5
                                            }
                                        },
                                        data: {
                                            id: edgeId,
                                            from: node.s,
                                            to: object.o,
                                            label: node.pLabel,
                                            type: node.sType
                                        }
                                    });


                                    visjsData.nodes.forEach(function(node) {
                                        var style = nodeStyles[node.id];
                                        if (style == "owl:Class") {
                                            node.color = "#00afef";
                                            node.shape = "box";
                                            node.data.type = "Class";

                                        } else if (style == "owl:ObjectProperty") {
                                            node.color = "#f5ef39";
                                            node.shape = "box";
                                            node.data.type = "ObjectProperty";

                                        } else if (style == "owl:Restriction") {
                                            node.color = "#cb9801";
                                            node.label = "some";
                                            node.shape = "box";


                                        } else if (node.label == "r") {
                                            node.color = "#9db99d";
                                            node.label = "";
                                            node.shape = "dot";
                                            node.size = 2;
                                        } else if (node.label == "f") {
                                            node.color = "#9db99d";
                                            node.label = "";
                                            node.shape = "dot";
                                            node.size = 2;
                                        } else if (node.label == "∃") {
                                            node.color = "#9db99d";
                                            node.label = "";
                                            node.shape = "dot";
                                            node.size = 2;
                                        }

                                    });


                                    var symbol = null;
                                    if (object.oIsBlank && object.oType != "http://www.w3.org/2002/07/owl#Restriction") {
                                        symbol = Config.Lineage.logicalOperatorsMap[object.p] || null;
                                    }


                                    var objectLevel = level + 1;

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
                function(callbackSeries) {
                    var maxLevels = 15;
                    visjsData.nodes.forEach(function(node, nodeIndex) {
                        if (node.level > maxLevels) {
                            visjsData.nodes[nodeIndex].hidden = true;
                        }
                    });
                    callbackSeries();
                },

                // filter rest nodes
                function(callbackSeries) {

                    return callbackSeries();
                    var restNodes = [];
                    visjsData.nodes.forEach(function(node) {
                        if (node.label == "r") {
                            restNodes.push(node.id);
                        }
                    });
                    var filteredNodes = [];
                    visjsData.nodes.forEach(function(node) {
                        if (restNodes.indexOf(node.id) < 0) {
                            filteredNodes.push(node);
                        }
                    });
                    visjsData.nodes = filteredNodes;

                    var edgesToskip = {};
                    var existingEdges = {};
                    var filteredEdges = [];
                    visjsData.edges.forEach(function(edge) {
                        if (restNodes.indexOf(edge.to) > -1) {
                            edgesToskip[edge.from] = edge.to;
                        } else {
                            ;// filteredEdges.push(edge);
                        }
                    });

                    function recurseGetEdgeTo(edgeTo) {

                        var nextEdgeTo = edgesToskip[edgeTo];
                        if (nextEdgeTo && nextEdgeTo != "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            console.log("recurse " + nextEdgeTo);
                            return recurseGetEdgeTo(nextEdgeTo);

                        } else {

                            return edgeTo;
                        }


                    }

                    visjsData.edges.forEach(function(edge) {
                        if (!existingEdges[edge.id]) {
                            existingEdges[edge.id] = 1;
                            if (edgesToskip[edge.to]) {
                                edge.to = recurseGetEdgeTo(edge.to);
                            }
                            filteredEdges.push(edge);

                        }
                        visjsData.edges = filteredEdges;


                    });
                    callbackSeries();
                },

                //draw graph

                function(callbackSeries) {
                    if (options.addToGraph && self.axiomsVisjsGraph) {
                        self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
                        self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        self.drawGraph(visjsData);
                        self.currentVisjsData = visjsData;
                    }
                    return callbackSeries();
                }
            ],

            function(err) {
                if (callback) {
                    return callback(err);
                }
            }
        );
    };

    self.drawGraph = function(visjsData) {
        var xOffset = 90;
        var yOffset = 100;
        //    xOffset = parseInt($("#axiomsDraw_xOffset").val());
        //   yOffset = parseInt($("#axiomsDraw_yOffset").val());
        var options = {
            keepNodePositionOnDrag: true,
            /* physics: {
enabled:true},*/

            layoutHierarchical: {
                direction: "LR",
                sortMethod: "hubsize",
                levelSeparation: xOffset,
                parentCentralization: false,
                shakeTowards: "roots",
                blockShifting: true,

                nodeSpacing: yOffset
            },
            visjsOptions: {
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        // type: "diagonalCross",
                        forceDirection: "horizontal",

                        roundness: 0.4
                    }
                }


            },
            onclickFn: Axioms_graph.onNodeClick,
            onRightClickFn: Axioms_graph.showGraphPopupMenu

        };

        /*   $("#" + self.graphDivContainer).html(
               "<span style='font-size: 16px;color: blue; font-weight: bold'> WORK IN PROGRESS</span>" +
               "  <button onclick=\"AxiomEditor.init()\">Edit Axiom</button>" +
               "<div id='axiomsGraphDiv3' style='width:800px;height:525px;' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>"
           );*/
        self.axiomsVisjsGraph = new VisjsGraphClass(self.graphDivContainer, visjsData, options);
        self.axiomsVisjsGraph.draw(function() {
        });
    };

    self.onNodeClick = function(node, point, nodeEvent) {


        return;
    };
    self.showGraphPopupMenu = function() {

    };


    self.sampleTriples = [
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
    ];
    return self;
})();

export default Axioms_graph;
window.Axioms_graph = Axioms_graph;
