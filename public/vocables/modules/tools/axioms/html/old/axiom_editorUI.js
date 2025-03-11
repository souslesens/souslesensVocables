import Axiom_editor from "../../axiom_editor.js";
import Axioms_manager from "../../axioms_manager.js";
import Axioms_graph from "../../axioms_graph.js";
import Sparql_OWL from "../../../../sparqlProxies/sparql_OWL.js";
import Axiom_activeLegend from "../../axiom_activeLegend.js";

var Axiom_editorUI = (function () {
    var self = {};

    self.initUI = function () {
        $("#graphDiv").load("modules/tools/axioms/html/mainPanel2.html", function (x, y) {
            $("#axiomsEditor_input").on("keyup", Axiom_editor.onAxiomIntputKey);
            $("#axiomsEditor_input").on("keydown", Axiom_editor.onAxiomIntputKey);
            $("#axiomsEditor_input").trigger("focus");

            $("#axiom_triplesTab").tabs();

            $("#lateralPanelDiv").load("modules/tools/axioms/html/leftPanel.html", function (x, y) {
                self.loadConceptTree(Axiom_editor.currentSource);
            });
        });
    };
    self.onNewAxiomClick = function () {
        $("#smallDialogDiv").dialog("option", "title", "New Axiom");
        $("#smallDialogDiv").load("modules/tools/axioms/html/newAxiomDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            Axiom_activeLegend.drawLegend();
            Axiom_editor.getAllClasses(null, function (err, classes) {
                common.fillSelectOptions("axiomsEditor_allClasses", classes, true, "label", "id");
            });
            Axiom_editor.getAllProperties(function (err, properties) {
                common.fillSelectOptions("axiomsEditor_allProperties", properties, true, "label", "id");
            });
        });
    };

    self.setCurrentResource = function (node, isProperty) {
        if (!node) {
            return alert("select a class or a property");
        }
        $("#smallDialogDiv").dialog("close");
        var resourceNode;
        if (isProperty) {
            resourceNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "ObjectProperty",
            };
        } else {
            resourceNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "Class",
            };
        }
        Axiom_editor.setCurrentResource(resourceNode, isProperty);

        Axiom_editor.axiomType = $("#Axioms_editor_axiomTypeSelect").val();
        var cssClass;
        if (isProperty) {
            cssClass = "axiom_Property";
        } else {
            cssClass = "axiom_Class";
        }
        var html =
            "<span class='" + cssClass + "'><b>" + resourceNode.resourceType + " " + resourceNode.label + "  </b></span><span class='axiom_keyword'><b>" + Axiom_editor.axiomType + "</b></span>";
        $("#axiomsEditor_input_currentClassDiv").html(html);
        Axiom_editor.getAllClasses();
        Axiom_activeLegend.init("axioms_legend_div", "axiomGraphDiv", Axiom_editor.currentSource, Axiom_editor.currentNode);
        Axiom_activeLegend.drawNewAxiom(resourceNode);

        Axiom_activeLegend.hideForbiddenResources("add_Class");
    };

    self.loadConceptTree = function (source) {
        Axioms_manager.loadAxiomsSubgraphsMap(source, function (err, subGraphsMap) {
            if (err) {
                return alert(err);
            }
            var jstreeData = [];
            var uniqueNodes = {};
            for (var className in subGraphsMap) {
                var resource = Axiom_editor.allResourcesMap[className];

                for (var uri in Axiom_editor.allResourcesMap) {
                    if (uri.endsWith(className)) {
                        resource = Axiom_editor.allResourcesMap[uri];
                    }
                }
                if (!resource) {
                    return alert(" resource not found " + className);
                }

                jstreeData.push({
                    id: className,
                    text: resource.label,
                    parent: "#",
                    data: { type: "resource" },
                });
                for (var axiomType in subGraphsMap[className]) {
                    if (!uniqueNodes[axiomType]) {
                        jstreeData.push({
                            id: axiomType + "_" + className,
                            text: axiomType,
                            parent: className,
                            data: { type: "axiomType" },
                        });
                    }
                    var graphUri = subGraphsMap[className].graphUri;
                    subGraphsMap[className][axiomType].forEach(function (item, index) {
                        jstreeData.push({
                            id: axiomType + "_" + className + "_" + item.id,
                            text: "_" + index,
                            type: "axiom",
                            parent: axiomType + "_" + className,
                            data: {
                                id: item.id,
                                label: index,
                                graphUri: item.graphUri,
                                source: source,
                                type: "axiom",
                                resource: resource,
                                triples: item.triples,
                            },
                        });
                    });
                }
                var options = {
                    selectTreeNodeFn: self.onConceptsJstreeSelectNode,

                    contextMenu: function (node) {
                        var items = {};

                        if (node.data.type == "axiom")
                            items.delete = {
                                label: "delete",
                                action: function (/** @type {any} */ _e) {
                                    if (confirm("delete axiom")) {
                                        Sparql_OWL.clearGraph(node.data.graphUri, function (err, result) {
                                            if (err) {
                                                return alert(err);
                                            }
                                            JstreeWidget.deleteNode("axiom_editor_conceptsJstreeDiv", self.currentAxiomsTreeNode.id);
                                        });
                                    }
                                },
                            };
                        return items;
                    },
                };
                JstreeWidget.loadJsTree("axiom_editor_conceptsJstreeDiv", jstreeData, options);
            }
        });
    };

    self.onConceptsJstreeSelectNode = function (event, obj) {
        var node = obj.node;
        self.currentAxiomsTreeNode = node;
        if (node.data && node.data.triples) {
            Axiom_editor.currentSource = node.data.source;
            Axiom_editor.currentNode = node.data.resource;
            Axioms_manager.getHtmlManchesterAxiomsFromTriples(Axiom_editor.currentSource, node.data.triples, function (err, result) {
                if (err) return alert(err);
                $("#axiomsEditor_textDiv").html(result);
            });
            Axioms_graph.drawNodeAxioms2(Axiom_editor.currentSource, Axiom_editor.currentNode.id, node.data.triples, "axiomGraphDiv", {}, function (err) {});
        }
    };

    self.saveAxiom = function () {
        Axioms_manager.generateTriples(function (err, rawAxioms) {
            //c lean raw axioms from jowl
            var str = JSON.stringify(rawAxioms).replace(/\[OntObject\]/g, "");
            var axioms = JSON.parse(str);

            axioms.forEach(function (item) {
                item.subject = "<" + item.subject + ">";
                item.predicate = "<" + item.predicate + ">";
                item.object = "<" + item.object + ">";
            });

            Axioms_manager.saveAxiom(Axiom_editor.currentSource, Axiom_editor.axiomType, Axiom_editor.currentNode.id, axioms, function (err, result) {});
        });
    };

    self.showNodeInfos = function (id) {
        var node = { data: { id: id } };
        NodeInfosWidget.showNodeInfos(Axiom_editor.currentSource, node, "mainDialogDiv");
    };
    return self;
})();

export default Axiom_editorUI;
window.Axiom_editorUI = Axiom_editorUI;
