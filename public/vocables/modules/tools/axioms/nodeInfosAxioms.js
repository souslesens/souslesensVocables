import Axioms_manager from "./axioms_manager.js";

import Axioms_graph from "./axioms_graph.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import axioms_graph from "./axioms_graph.js";
import Axiom_activeLegend from "./axiom_activeLegend.js";
import Axiom_UI from "./axiom_UI.js";

var NodeInfosAxioms = (function () {
    var self = {};

    self.init = function (source, resource, divId) {
        self.currentSource = source;
        self.currentResource = resource;
        self.currentResource.level = 0;
        self.allClassesMap = {};
        Axioms_manager.allResourcesMap = {};
        Axioms_manager.initResourcesMap(self.currentResource.data.source, function (err, result) {
            AxiomExtractor.getClassAxiomsTriples(self.currentResource.data.source, self.currentResource.data.id, function (err, triples) {


        $("#" + divId).load("modules/tools/axioms/html/nodeInfosAxioms.html", function () {
            if (divId && divId.indexOf("Dialog") > -1) {
                $("#" + divId).dialog("open");
            }
            Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv");
            Axiom_UI.setView("visualisation");
            if (!Lineage_sources.isSourceEditableForUser(self.currentSource)) {
                $("#nodeInfosAxioms_newAxiomBtn").css("display", "none");
            }



            var graphDivId = "nodeInfosAxioms_graphDiv";
                    var options = {};
                    Axioms_graph.drawNodeAxioms2(self.currentResource.data.source, self.currentResource.data.id, triples, graphDivId, options);
                });
            });


        });
    };
    self.initSourceClassesMap = function (source, callback) {
        self.allClassesMap = {};
        CommonBotFunctions.listSourceAllClasses(source, false, [], function (err, result) {
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
        $("#nodeInfosAxioms_infosDiv").html("Loading Axioms...");
        $("#waitImg").css("display", "block");

        self.getResourceAxioms(self.currentSource, self.currentResource.data.id, {}, function (err, result) {
            $("#waitImg").css("display", "none");
            if (err) {
                return MainController.errorAlert(err.responseText || err);
            }

            if (!result.manchester || result.manchester.length == 0) {
                $("#nodeInfosAxioms_infosDiv").html("no axioms found");
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

            jstreeData.push({
                id: "rootNode",
                text: self.currentResource.data.label,
                parent: "#",
            });

            /*   jstreeData.push({
                id: "newAxiom",
                text: "<span style='color:#278ecc'>new Axiom</span>",
                parent: "rootNode",
            });*/

            if (manchester) {
                manchester.forEach(function (item, index0) {
                    if (item.indexOf("DisjointClasses") == 0) {
                        jstreeData.push({
                            id: "DisjointClasses",
                            text: "DisjointClasses",
                            parent: "rootNode",
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
                                    parent: "rootNode",
                                });
                            }
                            if (index == 2) {
                                var id = common.getRandomHexaId(10);

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
            }

            var options = {
                selectTreeNodeFn: NodeInfosAxioms.onAxiomJstreeSelectNode,
                openAll: true,
                contextMenu: function (node) {
                    var items = {};

                    return items;
                },
            };
            JstreeWidget.loadJsTree("nodeInfosAxioms_axiomsJstreeDiv", jstreeData, options);
            $("#nodeInfosAxioms_infosDiv").html("");
        });
    };

    self.getResourceAxioms = function (source, resourceId, options, callback) {
        Axiom_manager.getClassAxioms(
            resourceId,
            {
                getManchesterExpression: true,
                getTriples: true,
            },
            function (err, result) {
                return callback(err, result);
            },
        );
    };

    self.onAxiomJstreeSelectNode = function (evt, obj) {
        var node = obj.node;
        self.currentJstreeNode = node;
        Axiom_UI.setView("visualisation");
        self.switchLeftPanelDisplay("show");
        Axioms_graph.clearGraph();
        Axiom_activeLegend.isLegendActive = false;
        if (Lineage_sources.isSourceEditableForUser(self.currentSource)) {
            Axiom_activeLegend.init("nodeInfosAxioms_activeLegendDiv", "nodeInfosAxioms_graphDiv", NodeInfosAxioms.currentSource, NodeInfosAxioms.currentResource, self.currentJstreeNode.data.id);
        }

        if (node.id == "newAxiom") {
            return NodeInfosAxioms.newAxiom(true);
        }

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

            Axioms_graph.drawNodeAxioms2(self.currentSource, self.currentResource.data.id, allTriples, "nodeInfosAxioms_graphDiv", options);
        } else if (node && node.data) {
            Axioms_graph.currentGraphNode = node;

            Axioms_graph.drawNodeAxioms2(self.currentSource, self.currentResource.data.id, node.data.triples, "nodeInfosAxioms_graphDiv", {
                onNodeClick: NodeInfosAxioms.onNodeGraphClick,
                axiomType: node.parent,
            });

            //  $("#nodeInfosAxioms_axiomText").html(node.data.manchester);
        }
    };
    self.onNodeGraphClick = function (node, point, nodeEvent) {
        if (node && node.id) {
            Axioms_graph.currentGraphNode = node;
            Axioms_graph.outlineNode(node.id);
        }
    };
    self.expandGraphFromNode = function () {
        var node = Axioms_graph.currentGraphNode;
        $("#nodeInfosAxioms_infosDiv").html("Loading Axioms for " + node.data.label);
        self.getResourceAxioms(self.currentSource, node.data.id, {}, function (err, result) {
            $("#waitImg").css("display", "none");
            if (err) {
                return MainController.errorAlert(err.responseText);
            }

            var allTriples = [];
            result.triples.forEach(function (item) {
                allTriples = allTriples.concat(item);
            });
            var options = { addToGraph: true, startLevel: node.level, axiomType: node.parent };
            Axioms_graph.drawNodeAxioms2(self.currentSource, node.data.id, allTriples, "nodeInfosAxioms_graphDiv", options);
        });
    };
    self.collapseGraphToNode = function () {
        var nodesToRemove = [];
        var level = Axioms_graph.currentGraphNode.level;
        Axioms_graph.axiomsVisjsGraph.data.nodes.get().forEach(function (node) {
            if (node.level > level) {
                nodesToRemove.push(node.id);
            }
        });
        Axioms_graph.axiomsVisjsGraph.data.nodes.remove(nodesToRemove);
    };
    self.startFromNode = function () {
        self.currentResource = Axioms_graph.currentGraphNode;
        Axioms_graph.clearGraph();
        NodeInfosAxioms.loadAxiomsJstree();
    };
    self.showNodeAxioms = function () {
        var node = Axioms_graph.currentGraphNode;
        if (!node || !node.data) {
            return;
        }
        var label = node.data.label || Sparql_common.getLabelFromURI(node.data.id);
        $("#smallDialogDiv").dialog("option", "title", "Axioms of " + label);
        var resource = { data: { id: node.data.id, source: self.currentSource, label: label } };
        self.init(self.currentSource, resource, "smallDialogDiv");
    };

    self.nodeInfos = function () {
        var node = Axioms_graph.currentGraphNode;
        if (node && node.data && !node.data.source) {
            node.data.source = self.currentSource;
        }
        $("#mainDialogDiv").parent().css("z-index", 10000);
        NodeInfosWidget.showNodeInfos(self.currentSource, node, "mainDialogDiv", null, function () {});
    };
    /*
    self.reduceNodeInfoAxioms = function () {
        $("#smallDialogDiv").find("#nodeInfosWidget_AxiomsTabDiv").remove();
        $("#smallDialogDiv").find("#nodeInfosWidget_metaDataTabDiv").remove();
        $($("#smallDialogDiv").find("#nodeInfosWidget_tabsDiv").children()[0]).remove();
        $("#smallDialogDiv").find("#nodeInfosWidget_InfosTabDiv").css("border-top-left-radius", "14px");
    };*/
    self.showResourceDescendantsAxioms = function (source, resource, descendants, divId) {
        self.currentSource = source;
        self.currentResource = resource;
        self.allClassesMap = {};
        $("#" + divId).load("modules/tools/axioms/html/nodeInfosAxioms.html", function () {
            Axiom_manager.initResourcesMap(self.currentSource, function (err, result) {
                // used do draw graph
                self.initSourceClassesMap(self.currentSource, function (err, result) {
                    //used to parse manchester
                    if (err) {
                        return MainController.errorAlert(err);
                    }

                    var addToGraph = false;
                    async.eachSeries(
                        descendants,
                        function (descendant, callbackEach) {
                            self.getResourceAxioms(self.currentSource, descendant.data.id, {}, function (err, result) {
                                $("#waitImg").css("display", "none");
                                if (err) {
                                    return callbackEach(err.responseText);
                                }

                                var allTriples = [];
                                result.triples.forEach(function (item) {
                                    allTriples = allTriples.concat(item);
                                });
                                var options = { addToGraph: addToGraph };
                                Axioms_graph.drawNodeAxioms2(self.currentSource, descendant.data.id, allTriples, "nodeInfosAxioms_graphDiv", options, function (err) {});
                                addToGraph = true;

                                callbackEach(null);
                            });
                        },
                        function (err) {},
                    );
                });
            });
        });
    };

    self.actions = {
        setLayout: function (layout) {
            if (layout == "randomlayout") {
                var visjsData = {
                    nodes: axioms_graph.axiomsVisjsGraph.data.nodes.get(),
                    edges: axioms_graph.axiomsVisjsGraph.data.edges.get(),
                };
                axioms_graph.drawGraph(visjsData, "axiomGraphDiv", { randomLayout: true });
            }
        },
        toSVG: function () {
            /*
                        var canvas=axioms_graph.axiomsVisjsGraph.network.canvas
                       var  ctx = canvas.getContext("2d");
                        var mySerializedSVG = ctx.getSerializedSvg();*/
            axioms_graph.axiomsVisjsGraph.toSVG();
        },
        toGraphMl: function () {
            axioms_graph.axiomsVisjsGraph.toGraphMl();
        },
        showTriples: function () {
            if (!self.currentJstreeNode) {
                return alert("No axiom Selected");
            }
            var str = "<ul>";
            self.currentJstreeNode.data.triples.forEach(function (triple) {
                str += "<li>" + triple.subject + " <b>" + triple.predicate + "</b> " + triple.object + "</li>";
            });
            str += "</ul>";

            $("#smallDialogDiv").html(str);
            $("#smallDialogDiv").dialog("open");
        },
    };

    self.newAxiom = function (clearAll) {
        if (clearAll) {
            self.isNewAxiom = true;
            Axiom_activeLegend.isLegendActive = false;
            Axioms_graph.clearGraph();
            $("#axiomsEditor_textDiv").html("");
        }

        if (Lineage_sources.isSourceEditableForUser(self.currentSource)) {
            Axiom_activeLegend.init(
                "nodeInfosAxioms_activeLegendDiv",
                "nodeInfosAxioms_graphDiv",
                NodeInfosAxioms.currentSource,
                NodeInfosAxioms.currentResource,
                self.currentJstreeNode ? self.currentJstreeNode.data.id : null,
            );
        }
        Axiom_UI.setView("newAxiom");
        self.switchLeftPanelDisplay("new");

        var options = Axiom_activeLegend.axiomtypes;
        common.fillSelectOptions("axioms_legend_suggestionsSelect", options, false);

    };

    self.switchLeftPanelDisplay = function (role) {
        if (role == "new") {
            $("#nodeInfosAxioms_newAxiomPanel").css("display", "flex");
            $("#nodeInfosAxioms_manchesterDiv").css("display", "flex");
            $("#nodeInfosAxioms_graphPanelDiv").css("display", "none");
            $("#nodeInfosAxioms_graphDiv").width("50vw");
        } else if (role == "show") {
            $("#nodeInfosAxioms_newAxiomPanel").css("display", "none");
            //   $("#nodeInfosAxioms_manchesterDiv").css("display", "none");
            $("#nodeInfosAxioms_graphPanelDiv").css("display", "flex");
            $("#nodeInfosAxioms_graphDiv").width("70vw");
        }
    };

    return self;
})();
export default NodeInfosAxioms;
window.NodeInfosAxioms = NodeInfosAxioms;
