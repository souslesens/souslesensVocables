import Axioms_manager from "./axioms_manager.js";
import Axiom_editor from "./axiom_editor.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Axioms_graph from "./axioms_graph.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

var NodeInfosAxioms = (function () {
    var self = {};

    self.init = function (source, resource,divId) {
        self.currentSource = source;
        self.currentResource = resource;
        self.allClassesMap = {};
        $("#"+divId).load("modules/tools/axioms/html/nodeInfosAxioms.html", function () {
            Axiom_editor.initResourcesMap(self.currentSource, function (err, result) {
                // used do draw graph
                self.initSourceClassesMap(self.currentSource, function (err, result) {
                    //used to parse manchester
                    if (err) {
                        return alert(err);
                    }
                    self.loadAxiomsJstree();
                });
            });
        });
    };
    self.initSourceClassesMap = function (source, callback) {
        self.allClassesMap = {};
        CommonBotFunctions.listSourceAllClasses(source, null, false, [], function (err, result) {
            if (err) {
                return callback(err.responseText);
            }
            self.allClasses = [];
            var uniqueIds = {};
            result.forEach(function (item) {
                if (!uniqueIds[item.id]) {
                    uniqueIds[item.id] = 1;
                    item.resourceType = "Class";
                    self.allClassesMap[item.id] = item;
                }
            });

            return callback(null, self.allClassesMap);
        });
    };

    self.loadAxiomsJstree = function () {
        $("#nodeInfosAxioms_infosDiv").html("Loading Axioms");
        $("#waitImg").css("display", "block");
        self.getResourceAxioms(self.currentResource.data.id,{}, function (err, result) {
            $("#waitImg").css("display", "none");
            if (err) {
                return alert(err.responseText);
            }
            if (result.manchester.length == 0) {
             return   $("#nodeInfosAxioms_infosDiv").html("no axioms found");
            }



            /* var manchester = [
                 " DisjointClasses: EngineeredSystem, MaterialArtifact, Organization",
                 "MaterialArtifact SubClassOf BFO_0000030",
                 "MaterialArtifact EquivalentTo BFO_0000030 and (BFO_0000196 some DesignedFunction)"
             ];*/

            var manchester = result.manchester;
            var triples = result.triples;

            var jstreeData = [];
            var uniqueNodes = {};
            var currentAxiomtype = null;
            manchester.forEach(function (item, index0) {
                if (item.indexOf("DisjointClasses") == 0) {
                    jstreeData.push({
                        id: "DisjointClasses",
                        text: "DisjointClasses",
                        parent: "",
                    });

                    item.substring(item.indexOf(":") + 1)
                        .split(",")
                        .forEach(function (superClass) {
                            jstreeData.push({
                                id: "superClass",
                                text: "superClass",
                                parent: "DisjointClasses",
                            });
                        });
                } else {
                    item.split(" ").forEach(function (word, index) {
                        if (index == 1 && !uniqueNodes[word]) {
                            uniqueNodes[word] = 1;
                            currentAxiomtype = word;
                            jstreeData.push({
                                id: word,
                                text: word,
                                parent: "#",
                            });
                        }
                        if (index == 2) {
                            var id =common.getRandomHexaId(5);
                            /*  for (var key in Axiom_editor.allClassesMap) {
                                  if (self.allClassesMap[key].label.indexOf(word) > -1) {
                                      id = key;
                                  }
                              }*/

                            jstreeData.push({
                                id: id,
                                text: item,
                                parent: currentAxiomtype,
                                data: {
                                    id: word,
                                    label: word,
                                    triples: triples[index0],
                                    manchester: item,
                                },
                            });
                        } else {
                            return;
                        }
                    });
                }
            });

            var options = {
                selectTreeNodeFn: NodeInfosAxioms.onAxiomJstreeSelectNode,
                openAll: true,
                contextMenu: function (node) {
                    var items = {};

                    return items;
                },
            };
            JstreeWidget.loadJsTree("nodeInfosAxioms_axiomsJstreeDiv", jstreeData, options);
        });
    };

    self.getResourceAxioms = function (resourceId,options, callback) {
        Axiom_manager.getClassAxioms(self.currentSource, resourceId, { getManchesterExpression: true, getTriples: true }, function (err, result) {
            return callback(err, result);
        });
    };


    self.onAxiomJstreeSelectNode = function (evt, obj) {
        var node = obj.node;

        if (node.parent == "#") {
            // draw   all axioms of class
            var options = { onNodeClick: NodeInfosAxioms.onNodeGraphClick };
            var nodes = JstreeWidget.getNodeDescendants("nodeInfosAxioms_axiomsJstreeDiv", "#", 3);
            var allTriples = [];
            nodes.forEach(function (node, index) {
                if (node.data && node.data.triples) {
                    allTriples = allTriples.concat(node.data.triples);
                }
            });

            Axioms_graph.drawNodeAxioms2(self.currentSource, self.currentResource.data.id, allTriples, "nodeInfosAxioms_graphDiv", options, function (err) {});
        } else if (node && node.data) {
            self.currentGraphNode = node;

            Axioms_graph.drawNodeAxioms2(
                self.currentSource,
                self.currentResource.data.id,
                node.data.triples,
                "nodeInfosAxioms_graphDiv",
                { onNodeClick: NodeInfosAxioms.onNodeGraphClick },
                function (err) {}
            );

            //  $("#nodeInfosAxioms_axiomText").html(node.data.manchester);
        }
    };
    self.onNodeGraphClick = function (node, point, nodeEvent) {
        self.getResourceAxioms(node.data.id, {}, function (err, result) {
            $("#waitImg").css("display", "none");
            if (err) {
                return alert(err.responseText);
            }


            var allTriples = []
            result.triples.forEach(function(item) {
                allTriples = allTriples.concat(item);
            })
            var options={addToGraph:true,startLevel:node.level}
            Axioms_graph.drawNodeAxioms2(self.currentSource, node.data.id, allTriples, "nodeInfosAxioms_graphDiv", options, function (err) {});


        })



    };






    self.showResourceDescendantsAxioms = function (source, resource,descendants,divId) {
        self.currentSource = source;
        self.currentResource=resource;
        self.allClassesMap = {};
        $("#"+divId).load("modules/tools/axioms/html/nodeInfosAxioms.html", function () {
            Axiom_editor.initResourcesMap(self.currentSource, function (err, result) {
                // used do draw graph
                self.initSourceClassesMap(self.currentSource, function (err, result) {
                    //used to parse manchester
                    if (err) {
                        return alert(err);
                    }

                var addToGraph=false;
                    async.eachSeries(descendants, function (descendant, callbackEach) {

                        self.getResourceAxioms(descendant.data.id, {}, function (err, result) {
                            $("#waitImg").css("display", "none");
                            if (err) {
                                return callbackEach(err.responseText);
                            }


                            var allTriples = []
                            result.triples.forEach(function(item) {
                                allTriples = allTriples.concat(item);
                            })
                            var options={addToGraph:addToGraph}
                            Axioms_graph.drawNodeAxioms2(self.currentSource, descendant.data.id, allTriples, "nodeInfosAxioms_graphDiv", options, function (err) {});
                            addToGraph=true

                            callbackEach(null)
                        })


                    }, function (err) {


                    });
                })
            })
        });
    };

    return self;
})();
export default NodeInfosAxioms;
window.NodeInfosAxioms = NodeInfosAxioms;
