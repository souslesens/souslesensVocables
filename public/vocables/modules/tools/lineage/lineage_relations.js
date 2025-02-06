import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_relationFilter from "./lineage_relationFilter.js";

import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Export from "../../shared/export.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import MainController from "../../shared/mainController.js";
import Lineage_sources from "./lineage_sources.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_relationIndividualsFilter from "./lineage_relationIndividualsFilter.js";
import GraphDecorationWidget from "../../uiWidgets/graphDecorationWidget.js";

// eslint-disable-next-line no-global-assign
var Lineage_relations = (function () {
    var self = {};
    self.currentQueryInfos = {};
    self.whiteboardSourcesFromStatus = false;

    self.showDrawRelationsDialog = function (caller) {
        UI.showHideRightPanel("hide");
        self.drawRelationCurrentCaller = caller;
        self.currentQueryInfos = { predicate: "", filter: {} };

        $("#mainDialogDiv").dialog("option", "title", "Query");
        $("#mainDialogDiv").load("modules/tools/lineage/html/relationsDialog.html", function () {
            $("#mainDialogDiv").dialog("open");

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
                    !Lineage_whiteboard.lineageVisjsGraph.data ||
                    !Lineage_whiteboard.lineageVisjsGraph.data.nodes ||
                    !Lineage_whiteboard.lineageVisjsGraph.data.nodes.get ||
                    Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length == 0
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
                        if (Config.UIprofile == "KG") {
                            Lineage_relations.getInferredProperties(Lineage_sources.activeSource, function (err, result) {
                                jstreeData = result;
                                return callbackSeries();
                            });
                        }
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
                ],
                function (err) {
                    if (err) {
                        return alert(err.responseText);
                    }
                },
            );
        });
    };

    self.getPropertiesJstreeMenu = function () {
        var items = {};

        items.PropertyInfos = {
            label: "PropertyInfos",
            action: function (_e) {
                // $("#LineagePopup").dialog("open");
                NodeInfosWidget.showNodeInfos(self.curentPropertiesJstreeNode.parent, self.curentPropertiesJstreeNode, "LineagePopup");
            },
        };
        return items;
    };

    self.onSelectPropertyTreeNode = function (event, object) {
        if (object.node.parent == "#") {
            return (self.currentProperty = null);
        }

        self.currentQueryInfos.predicate = object.node.data.label;
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
        var domainValue = valueStr;
    };

    self.onshowDrawRelationsDialogValidate = function (action, _type) {
        if (action == "clear") {
            var properties = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
            var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
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

            Lineage_whiteboard.lineageVisjsGraph.data.edges.remove(edgesToClear);
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
                    options.data = Lineage_whiteboard.currentGraphNode.data.id;
                } else if (caller == "Tree") {
                    options.data = Lineage_whiteboard.currentTreeNode.data.id;
                }
            } else if (selection == "visible") {
                Lineage_sources.fromAllWhiteboardSources = true;
                if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    options.data = null;
                } else {
                    var data = [];
                    var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
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
            options.filter = "";
            propIds.forEach(function (prop) {
                if (prop.parent != "#") {
                    properties.push(prop.data.id);
                    if (prop.data && prop.data.constraints) {
                        propDomainFilter.push(prop.data.constraints.domain.id);
                        propRangeFilter.push(prop.data.constraints.range.id);
                    } else {
                    }
                } else {
                    if ((prop.id = "any")) {
                    }
                }
            });
            if (properties.length > 0) {
                options.filter += Sparql_common.setFilter("prop", properties);
            }

            if (propDomainFilter.length > 0) {
                options.filter += Sparql_common.setFilter("subjectType", propDomainFilter, null, { useFilterKeyWord: 1 });
            }

            if (propRangeFilter.length > 0) {
                options.filter += Sparql_common.setFilter("objectType", propRangeFilter, null, { useFilterKeyWord: 1 });
            }

            options.filter += Lineage_relationIndividualsFilter.filter;
            // options.currentQueryInfos = self.currentQueryInfos;
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
                // propFilter: propFilter
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
        var subjectIds = Lineage_whiteboard.getGraphIdsFromSource(source);
        Sparql_OWL.getFilteredTriples(source, subjectIds, null, null, options, function (err, result) {
            if (err) {
                return callback(err);
            }

            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var groups = {};

            if (result.length == 0) {
                return UI.message("no data found", true);
            }

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

    self.drawRelations = function (direction, type, caller, options, graphDiv) {
        if (!options) {
            options = {};
        }
        options.skipLiterals = true;
        var source = null;
        if (options.source) source = options.source;
        var data = null;
        var levelsMap = {};
        if (!options.data) {
            if (caller == "Graph") {
                data = Lineage_whiteboard.currentGraphNode.data.id;
                levelsMap[Lineage_whiteboard.currentGraphNode.data.id] = Lineage_whiteboard.currentGraphNode.level;
            } else if (caller == "Tree") {
                data = Lineage_whiteboard.currentTreeNode.data.id;
            } else if (caller == "both") {
                data = null;
            } else if (caller == "leftPanel" || type == "dictionary") {
                var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
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
        } else if (Lineage_whiteboard.lineageVisjsGraph && Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap) {
            existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
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

                    data = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
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
                    Lineage_whiteboard.queriesStack.push({
                        origin: "drawRestrictions",
                        filter: options.filter,
                    });
                    if (options.filter && options.filter.indexOf("^^") > -1) {
                        return callbackSeries();
                    }

                    if (!direction || direction == "direct") {
                        options.inverse = false;

                        UI.message("searching restrictions");

                        Lineage_whiteboard.drawRestrictions(source, data, null, null, options, function (err, result) {
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
                        UI.message("searching inverse restrictions");

                        Lineage_whiteboard.drawRestrictions(source, data, null, null, options, function (err, result) {
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
                            data = Lineage_whiteboard.getGraphIdsFromSource(Lineage_sources.activeSource);
                        }
                    }
                    Lineage_whiteboard.queriesStack.push({
                        origin: "drawPredicatesGraph",
                        filter: options.filter,
                    });
                    if (!direction || direction == "direct") {
                        UI.message("searching predicates");

                        Lineage_whiteboard.drawPredicatesGraph(source, data, null, options, function (err, result) {
                            if (err) {
                                if (err == "no data found") {
                                    return callbackSeries();
                                }
                                return callbackSeries(err);
                            }
                            concatVisjsdata(result);
                            return callbackSeries();
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
                            data = Lineage_whiteboard.getGraphIdsFromSource(Lineage_sources.activeSource);
                        }
                    }
                    if (!direction || direction == "inverse") {
                        options.inversePredicate = true;
                        UI.message("searching inverse predicates");

                        Lineage_whiteboard.drawPredicatesGraph(source, data, null, options, function (err, result) {
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
                // reflexive edges treatement
                function (callbackSeries) {
                    var reflexiveEdgesSizes = {};
                    var reflexiveEdges = allVisjsData.edges.filter(function (edge) {
                        if (edge.to == edge.from) {
                            return edge;
                        }
                    });
                    /*reflexiveEdges.forEach(function(edge){
                        if(!reflexiveEdgesSizes[edge.to]){
                            reflexiveEdgesSizes[edge.to]=5;
                        } 
                        else{
                            reflexiveEdgesSizes[edge.to]+=15;
                        }
                    });*/
                    var reflexiveEdgesIds = reflexiveEdges.map(function (edge) {
                        return edge.id;
                    });
                    allVisjsData.edges.forEach(function (edge) {
                        if (reflexiveEdgesIds.includes(edge.id)) {
                            if (!reflexiveEdgesSizes[edge.to]) {
                                reflexiveEdgesSizes[edge.to] = 15;
                            }
                            edge.selfReference = { size: reflexiveEdgesSizes[edge.to] };
                            reflexiveEdgesSizes[edge.to] += 15;
                        }
                    });
                    callbackSeries();
                },
            ],

            function (err) {
                Lineage_sources.fromAllWhiteboardSources = self.whiteboardSourcesFromStatus;
                if (allVisjsData.nodes.length == 0 && allVisjsData.edges.length == 0) {
                    return UI.message("no data found", true);
                }
                if (!options.output || options.output == "graph") {
                    UI.message("drawing " + allVisjsData.nodes.length + "nodes and " + allVisjsData.edges.length + " edges...", true);
                    if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(allVisjsData.nodes);
                        Lineage_whiteboard.lineageVisjsGraph.data.edges.add(allVisjsData.edges);
                    } else {
                        Lineage_whiteboard.drawNewGraph(allVisjsData, graphDiv);
                    }
                    if (err) {
                        return err;
                    }
                } else if (options.output == "table") {
                    Export.exportGraphToDataTable(self.lineageVisjsGraph, null, allVisjsData.nodes, allVisjsData.edges);
                }
            },
        );
    };

    self.getInferredProperties = function (source, callback) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        $("#lineageRelations_relType").prop("checked");
        $("input[name='lineageRelations_relType'][value=predicates]").prop("checked", true);
        //  $("input[name='lineageRelations_relDirection'][value=direct]").prop("checked", true);
        var options = {};
        var inferredProps = [];
        var distinctProps = {};
        var jstreeData = [];
        async.series(
            [
                function (callbackSeries) {
                    var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                    var nodes = Object.keys(existingNodes);
                    if (true || nodes.length == 0) {
                        return callbackSeries();
                    } else {
                        options.filter = Sparql_common.setFilter(["s", "o"], nodes, null, { useFilterKeyWord: 1 });
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
                                domain: { id: item.sClass.value, label: item.sClassLabel.value },
                                range: { id: item.oClass.value, label: item.oClassLabel.value },
                            });
                        });
                        return callbackSeries();
                    });
                },

                function (callbackSeries) {
                    jstreeData = [
                        {
                            id: "proposed",
                            text: "Proposed",
                            parent: "#",
                        },
                        {
                            id: "_anyProperty",
                            text: "Any Property",
                            parent: "#",
                            data: { id: "anyProperty", label: "Any Property" },
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
                                    label: item2.domain.label + "-" + item.label + "->" + item2.range.label,
                                },
                            });
                        });
                    });
                    // JstreeWidget.addNodesToJstree("lineageRelations_propertiesJstreeDiv", null, jstreeData);
                    return callbackSeries();
                },
            ],
            function (err) {
                return callback(err, jstreeData);
            },
        );
    };

    self.onCheckNodePropertyTreeNode = function (event, obj) {
        self.currentPropertyTreeNode = obj.node;
        if (true || (obj.node.data && obj.node.data.constraints)) {
            self.currentQueryInfos.predicate = obj.node.data.label;
            Lineage_relationIndividualsFilter.init(obj.node);
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
        //   Sparql_CRUD.list("STORED_QUERIES", null, null, "lineageRelations_savedQueriesSelect");
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

    self.drawEquivalentClasses = function (source, data, callback) {
        var filter = " Filter (?prop= <http://www.w3.org/2002/07/owl#equivalentClass>)";
        Sparql_OWL.getFilteredTriples(source, data, null, null, { filter: filter }, function (err, result) {
            if (err) {
                return callback(err);
            }
        });
    };

    return self;
})();

export default Lineage_relations;

window.Lineage_relations = Lineage_relations;
