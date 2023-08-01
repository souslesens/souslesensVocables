import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_relationFilter from "./lineage_relationFilter.js";

import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Export from "../../shared/export.js";
import Lineage_classes from "./lineage_classes.js";
import Sparql_CRUD from "../../sparqlProxies/sparql_CRUD.js";
import MainController from "../../shared/mainController.js";
import Lineage_sources from "./lineage_sources.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_relationIndividualsFilter from "./lineage_relationIndividualsFilter.js";
import GraphDecorationWidget from "../../uiWidgets/graphDecorationWidget.js";

// eslint-disable-next-line no-global-assign
var Lineage_relations = (function () {
    var self = {};
    self.whiteboardSourcesFromStatus = false;
    self.showDrawRelationsDialog = function (caller) {
        MainController.UI.showHideRightPanel("hide");
        self.drawRelationCurrentCaller = caller;

        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").dialog("option", "title", "Query");
        $("#mainDialogDiv").load("snippets/lineage/relationsDialog.html", function () {
            $("#lineageRelations_tabs").tabs({
                activate: function (e, ui) {
                    var divId = ui.newPanel.selector;
                    if (divId == "#lineageRelations_resources2Tab") {
                        PredicatesSelectorWidget.load("lineage_relation_predicateSelectorDiv", Lineage_sources.activeSource);
                    }
                },
            });
            $("#lineageRelations_history_previousBtn").css("display", self.previousQuery ? "inline" : "none");
            $("#lineageRelations_history_deleteBtn").css("display", "none");
            $("#LineageRelations_searchJsTreeInput").focus();
            Lineage_relationFilter.showAddFilterDiv(true);

            //$("#lineageRelations_savedQueriesSelect").bind('click',null,Lineage_relations.onSelectSavedQuery)
            $("#LineageRelations_searchJsTreeInput").keypress(function (e) {
                if (e.which == 13 || e.which == 9) {
                    $("#lineageRelations_propertiesJstreeDiv").jstree(true).uncheck_all();
                    $("#lineageRelations_propertiesJstreeDiv").jstree(true).settings.checkbox.cascade = "";
                    var term = $("#LineageRelations_searchJsTreeInput").val();

                    $("#lineageRelations_propertiesJstreeDiv").jstree(true).search(term);
                    $("#LineageRelations_searchJsTreeInput").val("");
                }
            });

            common.fillSelectWithColorPalette("lineageRelations_colorsSelect");

            var cbxValue;
            if (caller == "Graph" || caller == "Tree") {
                cbxValue = "selected";
            } else {
                if (
                    !Lineage_classes.lineageVisjsGraph.data ||
                    !Lineage_classes.lineageVisjsGraph.data.nodes ||
                    !Lineage_classes.lineageVisjsGraph.data.nodes.get ||
                    Lineage_classes.lineageVisjsGraph.data.nodes.get().length == 0
                ) {
                    cbxValue = "all";
                } else {
                    cbxValue = "visible";
                }
            }

            $("input[name='lineageRelations_selection'][value=" + cbxValue + "]").prop("checked", true);

            var jstreeData = [];
            var uniqueNodes = {};

            var vocabulariesPropertiesMap = {};
            async.series(
                [
                    function (callbackSeries) {
                        var vocabularies = ["usual", Lineage_sources.activeSource];
                        if (Config.sources[Lineage_sources.activeSource].imports) {
                            vocabularies = vocabularies.concat(Config.sources[Lineage_sources.activeSource].imports);
                        }

                        vocabularies = vocabularies.concat(Object.keys(Config.ontologiesVocabularyModels));

                        async.eachSeries(
                            vocabularies,
                            function (vocabulary, callbackEach) {
                                if (vocabulary == "usual") {
                                    return callbackEach();
                                    var properties = [];
                                    KGcreator.usualProperties.forEach(function (item) {
                                        properties.push({ label: item, id: item });
                                    });

                                    vocabulariesPropertiesMap[vocabulary] = properties;
                                    return callbackEach();
                                } else if (Config.ontologiesVocabularyModels[vocabulary]) {
                                    properties = Config.ontologiesVocabularyModels[vocabulary].getPropertiesArray();
                                    vocabulariesPropertiesMap[vocabulary] = properties;
                                    return callbackEach();
                                } else {
                                    Sparql_OWL.getObjectProperties(vocabulary, { withoutImports: 1 }, function (err, result) {
                                        if (err) {
                                            callbackEach(err);
                                        }

                                        var properties = [];
                                        result.forEach(function (item) {
                                            properties.push({ label: item.propertyLabel.value, id: item.property.value });
                                        });
                                        vocabulariesPropertiesMap[vocabulary] = properties;
                                        return callbackEach();
                                    });
                                }
                            },
                            function (err) {
                                callbackSeries(err);
                            }
                        );
                    },

                    function (callbackSeries) {
                        for (var vocabulary in vocabulariesPropertiesMap) {
                            var properties = vocabulariesPropertiesMap[vocabulary];
                            if (!properties) {
                                return callbackSeries();
                            }
                            jstreeData.push({
                                id: vocabulary,
                                text: vocabulary,
                                parent: "#",
                            });
                            properties.forEach(function (item) {
                                jstreeData.push({
                                    id: vocabulary + "_" + item.id,
                                    text: item.label,
                                    parent: vocabulary,
                                    data: {
                                        id: item.id,
                                        label: item.label,
                                        source: vocabulary,
                                    },
                                });
                            });
                        }
                        callbackSeries();
                    },

                    function (callbackSeries) {
                        jstreeData.sort(function (a, b) {
                            if (a.text > b.text) {
                                return 1;
                            } else if (b.text > a.text) {
                                return -1;
                            }
                            return 0;
                        });
                        var options = {
                            contextMenu: Lineage_relations.getPropertiesJstreeMenu(),
                            selectTreeNodeFn: Lineage_relations.onSelectPropertyTreeNode,
                            onCheckNodeFn: Lineage_relations.onCheckNodePropertyTreeNode,
                            withCheckboxes: true,
                            searchPlugin: {
                                case_insensitive: true,
                                fuzzy: false,
                                show_only_matches: true,
                            },
                        };
                        JstreeWidget.loadJsTree("lineageRelations_propertiesJstreeDiv", jstreeData, options, function () {
                            //  $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(Lineage_sources.activeSource);
                            return callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        if (Config.UIprofile == "KG") {
                            Lineage_relations.showInferredProperties();
                        }
                        return callbackSeries();
                    },
                ],
                function (err) {
                    if (err) {
                        return alert(err.responseText);
                    }
                }
            );
        });
    };

    self.getPropertiesJstreeMenu = function () {
        var items = {};

        items.PropertyInfos = {
            label: "PropertyInfos",
            action: function (_e) {
                $("#LineagePopup").dialog("open");
                NodeInfosWidget.showNodeInfos(self.curentPropertiesJstreeNode.parent, self.curentPropertiesJstreeNode, "LineagePopup");
            },
        };
        return items;
    };

    self.onSelectPropertyTreeNode = function (event, object) {
        if (object.node.parent == "#") {
            return (self.currentProperty = null);
        }

        var vocabulary = object.node.parent;
        self.curentPropertiesJstreeNode = object.node;
        Lineage_relationFilter.currentProperty = { id: object.node.data.id, label: object.node.data.label, vocabulary: vocabulary };
        Lineage_relationFilter.showAddFilterDiv();
    };
    self.onFilterObjectTypeSelect = function (role, type) {
        var valueStr = "";
        if (type == "String") {
            valueStr =
                ' <div class="lineageQuery_objectTypeSelect" id="lineageQuery_literalValueDiv">\n' +
                '          <select id="lineageQuery_operator"> </select>\n' +
                '          <input id="lineageQuery_value" size="20" value="" />\n' +
                "        </div>";
        }
        domainValue = valueStr;
    };

    self.onshowDrawRelationsDialogValidate = function (action, _type) {
        if (action == "clear") {
            var properties = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
            var edges = Lineage_classes.lineageVisjsGraph.data.edges.get();
            var edgesToClear = [];
            edges.forEach(function (edge) {
                if (properties.length > 0) {
                    properties.forEach(function (property) {
                        if (property.text == edge.label) {
                            edgesToClear.push(edge.id);
                        }
                    });
                } else {
                    if (edge.label) {
                        edgesToClear.push(edge.id);
                    }
                }
            });

            Lineage_classes.lineageVisjsGraph.data.edges.remove(edgesToClear);
        } else {
            //draw
            self.whiteboardSourcesFromStatus = Lineage_sources.fromAllWhiteboardSources;
            var x = $("input[name='lineageRelations_selection']");
            x = x.filter(":checked").val();
            var direction = $("input[name='lineageRelations_relDirection']").filter(":checked").val();
            var type = $("input[name='lineageRelations_relType']").filter(":checked").val();
            var selection = $("input[name='lineageRelations_selection']").filter(":checked").val();
            var options = {};
            options.output = action;
            options.edgesColor = $("#lineageRelations_colorsSelect").val();

            var caller = self.drawRelationCurrentCaller;
            if (selection == "selected") {
                if (caller == "Graph") {
                    if (node.type && node.type == "literal") {
                        return alert(currentGraphNode.data.id);
                    }
                    options.data = Lineage_classes.currentGraphNode.data.id;
                } else if (caller == "Tree") {
                    options.data = Lineage_classes.currentTreeNode.data.id;
                }
            } else if (selection == "visible") {
                Lineage_sources.fromAllWhiteboardSources = true;
                if (!Lineage_classes.lineageVisjsGraph.isGraphNotEmpty()) {
                    options.data = null;
                } else {
                    var data = [];
                    var nodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
                    nodes.forEach(function (node) {
                        if (node.data && (!node.data.type || node.data.type != "literal")) {
                            data.push(node.id);
                        }
                    });
                    options.data = data;
                }
            } else if (selection == "all") {
                // Lineage_sources.fromAllWhiteboardSources = false;
                options.data = "allSourceNodes";
            }
            var propIds = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
            var properties = [];
            var propDomainFilter = [];
            var propRangeFilter = [];
            propIds.forEach(function (prop) {
                if (prop.parent != "#") {
                    properties.push(prop.data.id);
                    if (prop.data.constraints) {
                        propDomainFilter.push(prop.data.constraints.domain.id);
                        propRangeFilter.push(prop.data.constraints.range.id);
                    }
                }
            });

            options.filter = "";
            if (properties.length > 0) {
                // if active source selected take all properties( ==no filter on props)
                var filter = "";
                var filterProp = "";
                if (properties.indexOf(Config.sources[Lineage_sources.activeSource].graphUri) < 0) {
                    filterProp = Sparql_common.setFilter("prop", properties);
                }

                options.filter += filterProp;
            }

            var propFilter = $("#Lineage_relation_filterText2").val();
            if (propFilter) {
                options.filter += propFilter;
            }

            if (propDomainFilter.length > 0) {
                options.filter += Sparql_common.setFilter("subjectType", propDomainFilter, null, { useFilterKeyWord: 1 });
            }

            if (propRangeFilter.length > 0) {
                options.filter += Sparql_common.setFilter("objectType", propRangeFilter, null, { useFilterKeyWord: 1 });
            }

            options.filter += Lineage_relationIndividualsFilter.filter;

            if (type == "both") {
                type = null;
            }
            if (direction == "both") {
                direction = null;
            }
            if (_type) {
                type = _type;
            }

            self.previousQuery = {
                propIds: propIds,
                propFilter: propFilter,
            };

            if (options.output == "outline") {
                self.outlineWhiteboardNodes(options);
            } else {
                self.drawRelations(direction, type, caller, options);
            }
        }
        $("#mainDialogDiv").dialog("close");
    };

    self.outlineWhiteboardNodes = function (options) {
        var source = Lineage_sources.activeSource;
        var subjectIds = Lineage_classes.getGraphIdsFromSource(source);
        Sparql_OWL.getFilteredTriples(source, subjectIds, null, null, options, function (err, result) {
            if (err) {
                return callback(err);
            }

            var existingNodes = Lineage_classes.lineageVisjsGraph.getExistingIdsMap();
            var groups = {};

            if (result.length == 0) return MainController.UI.message("no data found", true);

            result.forEach(function (item) {
                var groupName = item.object.value;
                if (item.objectValue && item.objectValue.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") {
                    var date = new Date(item.objectValue.value);
                    var year = date.getFullYear();
                    var month = date.getMonth();
                    groupName = year + "-" + month;
                    if (!groups[groupName]) {
                        groups[groupName] = { id: groupName, label: groupName, nodeIds: [] };
                    }
                } else {
                    if (!groups[groupName]) {
                        groups[groupName] = { id: item.object.value, label: item.objectLabel.value, nodeIds: [] };
                    }
                }
                groups[groupName].nodeIds.push(item.subject.value);
            });

            GraphDecorationWidget.showOutlinedNodesAndLegend(groups);
        });
    };

    self.drawRelations = function (direction, type, caller, options) {
        if (!options) {
            options = {};
        }
        options.skipLiterals = true;
        var source = null;
        var data = null;
        var levelsMap = {};
        if (!options.data) {
            if (caller == "Graph") {
                data = Lineage_classes.currentGraphNode.data.id;
                levelsMap[Lineage_classes.currentGraphNode.data.id] = Lineage_classes.currentGraphNode.level;
            } else if (caller == "Tree") {
                data = Lineage_classes.currentTreeNode.data.id;
            } else if (caller == "both") {
                data = null;
            } else if (caller == "leftPanel" || type == "dictionary") {
                var nodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
                nodes.forEach(function (node) {
                    if (node.data && (!node.data.type || node.data.type != "literal")) {
                        data.push(node.id);
                        levelsMap[node.id] = node.level;
                    }
                });
            }
        } else if (options.data == "allSourceNodes") {
            data = null;
        } else {
            data = options.data;
        }
        // manage drawing at the end off all visjs query
        options.returnVisjsData = true;
        var existingNodes = {};
        if (options.output == "table") {
            existingNodes = {};
        } else if (Lineage_classes.lineageVisjsGraph && Lineage_classes.lineageVisjsGraph.getExistingIdsMap) {
            existingNodes = Lineage_classes.lineageVisjsGraph.getExistingIdsMap();
        }
        var allVisjsData = { nodes: [], edges: [] };

        function concatVisjsdata(visjsData) {
            if (!visjsData.nodes || !visjsData.edges) {
                return;
            }
            visjsData.nodes.forEach(function (item) {
                if (!existingNodes[item.id]) {
                    existingNodes[item.id] = 1;
                    allVisjsData.nodes.push(item);
                }
            });
            visjsData.edges.forEach(function (item) {
                if (!existingNodes[item.id]) {
                    existingNodes[item.id] = 1;
                    allVisjsData.edges.push(item);
                }
            });
        }

        var totalTriples = 0;
        async.series(
            [
                // draw equivClasses or sameLabel (coming from Config.dictionarySource)
                function (callbackSeries) {
                    if (type != "dictionary") {
                        return callbackSeries();
                    }
                    source = Config.dictionarySource;
                    options.includeSources = Config.dictionarySource;

                    data = Lineage_classes.lineageVisjsGraph.data.nodes.getIds();
                    options.filter = "FILTER (?prop in (owl:sameAs,owl:equivalentClass))";
                    Lineage_sources.registerSource(Config.dictionarySource);

                    type = null;
                    return callbackSeries();
                },

                // draw restrictions normal
                function (callbackSeries) {
                    if (type && type != "restrictions") {
                        return callbackSeries();
                    }
                    if (options.filter && options.filter.indexOf("^^") > -1) {
                        return callbackSeries();
                    }

                    if (!direction || direction == "direct") {
                        options.inverse = false;

                        MainController.UI.message("searching restrictions");

                        Lineage_classes.drawRestrictions(source, data, null, null, options, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            concatVisjsdata(result);
                            return callbackSeries();
                        });
                    } else {
                        return callbackSeries();
                    }
                },
                // draw restrictions inverse
                function (callbackSeries) {
                    if (type && type != "restrictions") {
                        return callbackSeries();
                    }
                    if (options.filter && options.filter.indexOf("^^") > -1) {
                        return callbackSeries();
                    }
                    if (!direction || direction == "inverse") {
                        options.inverse = true;
                        MainController.UI.message("searching inverse restrictions");

                        Lineage_classes.drawRestrictions(source, data, null, null, options, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            concatVisjsdata(result);
                            return callbackSeries();
                        });
                    } else {
                        return callbackSeries();
                    }
                },

                // draw objectProperties direct
                function (callbackSeries) {
                    if (type && type == "restrictions") {
                        return callbackSeries();
                    }

                    if (type != "dictionary") {
                        source = Lineage_sources.activeSource;
                    }

                    if (!data) {
                        if (options.data != "allSourceNodes") {
                            data = Lineage_classes.getGraphIdsFromSource(Lineage_sources.activeSource);
                        }
                    }
                    if (!direction || direction == "direct") {
                        MainController.UI.message("searching predicates");

                        Lineage_properties.drawPredicatesGraph(source, data, null, options, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            concatVisjsdata(result);
                            return callbackSeries(err);
                        });
                    } else {
                        return callbackSeries();
                    }
                },
                // draw objectProperties inverse
                function (callbackSeries) {
                    if (type && type == "restrictions") {
                        return callbackSeries();
                    }

                    if (type != "dictionary") {
                        source = Lineage_sources.activeSource;
                    }

                    if (!data) {
                        if (options.data != "allSourceNodes") {
                            data = Lineage_classes.getGraphIdsFromSource(Lineage_sources.activeSource);
                        }
                    }
                    if (!direction || direction == "inverse") {
                        options.inversePredicate = true;
                        MainController.UI.message("searching inverse predicates");

                        Lineage_properties.drawPredicatesGraph(source, data, null, options, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            concatVisjsdata(result);
                            return callbackSeries();
                        });
                    } else {
                        return callbackSeries();
                    }
                },
            ],

            function (err) {
                Lineage_sources.fromAllWhiteboardSources = self.whiteboardSourcesFromStatus;
                if (allVisjsData.nodes.length == 0 && allVisjsData.edges.length == 0) {
                    return MainController.UI.message("no data found", true);
                }
                if (!options.output || options.output == "graph") {
                    MainController.UI.message("drawing " + allVisjsData.nodes.length + "nodes and " + allVisjsData.edges.length + " edges...", true);
                    if (Lineage_classes.lineageVisjsGraph.isGraphNotEmpty()) {
                        Lineage_classes.lineageVisjsGraph.data.nodes.add(allVisjsData.nodes);
                        Lineage_classes.lineageVisjsGraph.data.edges.add(allVisjsData.edges);
                    } else {
                        Lineage_classes.drawNewGraph(allVisjsData);
                    }
                    if (err) {
                        return alert(err);
                    }
                } else if (options.output == "table") {
                    Export.exportGraphToDataTable(self.lineageVisjsGraph, null, allVisjsData.nodes, allVisjsData.edges);
                }
            }
        );
    };

    self.showInferredProperties = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        $("#lineageRelations_relType").prop("checked");
        $("input[name='lineageRelations_relType'][value=predicates]").prop("checked", true);
        $("input[name='lineageRelations_relDirection'][value=direct]").prop("checked", true);
        var options = {};
        var inferredProps = [];
        var distinctProps = {};
        async.series(
            [
                function (callbackSeries) {
                    var existingNodes = Lineage_classes.lineageVisjsGraph.getExistingIdsMap();
                    var nodes = Object.keys(existingNodes);
                    if (nodes.length == 0) {
                        return callbackSeries();
                    } else {
                        options.filter = Sparql_common.setFilter("s", nodes);
                        return callbackSeries();
                    }
                },
                //get effective distinct ObjectProperties
                function (callbackSeries) {
                    OntologyModels.getInferredModel(source, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        result.forEach(function (item) {
                            if (!distinctProps[item.prop.value]) {
                                distinctProps[item.prop.value] = [];

                                inferredProps.push({
                                    id: item.prop.value,
                                    label: item.propLabel.value,
                                });
                            }
                            distinctProps[item.prop.value].push({
                                domain: { id: item.sparent.value, label: item.sparentLabel.value },
                                range: { id: item.oparent.value, label: item.oparentLabel.value },
                            });
                        });
                        return callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var jstreeData = [
                        {
                            id: "proposed",
                            text: "proposed",
                            parent: "#",
                        },
                    ];
                    inferredProps.forEach(function (item) {
                        jstreeData.push({
                            id: item.id,
                            text: "<b>" + item.label + "<b>",
                            parent: "proposed",
                            data: {
                                id: item.id,
                                label: item.label,
                            },
                        });

                        distinctProps[item.id].forEach(function (item2) {
                            jstreeData.push({
                                id: item2.domain.id + "_" + item2.range.id,
                                text: "<i>" + item2.domain.label + "->" + item2.range.label + "<i>",
                                parent: item.id,
                                data: {
                                    id: item.id,
                                    constraints: item2,
                                },
                            });
                        });
                    });
                    JstreeWidget.addNodesToJstree("lineageRelations_propertiesJstreeDiv", null, jstreeData);
                    return callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    return alert(err);
                }
            }
        );
    };

    self.onCheckNodePropertyTreeNode = function (event, obj) {
        self.currentPropertyTreeNode = obj.node;
        if (obj.node.data && obj.node.data.constraints) {
            Lineage_relationIndividualsFilter.init();
        }
    };

    self.callPreviousQuery = function () {
        if (!self.previousQuery) {
            return;
        }
        $("#lineageRelations_propertiesJstreeDiv").jstree().uncheck_all();
        $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(self.previousQuery.propIds);
        $("#Lineage_relation_filterText2").css("display", "block");
        $("#lineageQuery_addFilterButton").removeProp("disabled");

        if (self.previousQuery.propFilter) {
            //  Lineage_relationFilter.showAddFilterDiv(true);
            $("#Lineage_relation_filterText2").css("display", "block");
            $("#Lineage_relation_filterText2").val(self.previousQuery.propFilter);
        }
    };
    self.loadUserQueries = function () {
        Sparql_CRUD.list("STORED_QUERIES", null, null, "lineageRelations_savedQueriesSelect");
    };
    self.onSelectSavedQuery = function (id) {
        $("#lineageRelations_history_deleteBtn").css("display", "inline");
        Sparql_CRUD.loadItem(id, {}, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            $("#lineageRelations_propertiesJstreeDiv").jstree().uncheck_all();
            $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(result.propIds);
            $("#Lineage_relation_filterText2").css("display", "block");
            $("#lineageQuery_addFilterButton").removeProp("disabled");

            if (result.propFilter) {
                //  Lineage_relationFilter.showAddFilterDiv(true);
                $("#Lineage_relation_filterText2").val(result.propFilter);
            }
        });
    };
    self.saveCurrentQuery = function () {
        var propIds = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
        var propFilter = $("#Lineage_relation_filterText2").val();

        var data = {
            propIds: propIds,
            propFilter: propFilter,
        };
        Sparql_CRUD.save("STORED_QUERIES", null, data, "private", function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            $("#lineageRelations_savedQueriesSelect").append("<option value='" + result.id + "'>" + result.label + "</option>");
        });
    };

    self.deleteSavedQuery = function (id) {
        if (confirm("delete query")) {
            Sparql_CRUD.delete("STORED_QUERIES", id, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                self.loadUserQueries();
                $("#lineageRelations_history_deleteBtn").css("display", "none");
            });
        }
    };

    return self;
})();

export default Lineage_relations;

window.Lineage_relations = Lineage_relations;
