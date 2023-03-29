// eslint-disable-next-line no-global-assign
Lineage_relations = (function () {
    var self = {};
    self.showDrawRelationsDialog = function (caller) {
        self.drawRelationCurrentCaller = caller;

        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/lineage/relationsDialog.html", function () {
            $("#lineageRelations_history_previousBtn").css("display", self.previousQuery ? "inline" : "none");
            $("#lineageRelations_history_deleteBtn").css("display", "none");
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
                if (!visjsGraph.data || visjsGraph.data.nodes.get().length == 0) {
                    cbxValue = "all";
                } else {
                    cbxValue = "visible";
                }
            }

            $("input[name='lineageRelations_selection'][value=" + cbxValue + "]").prop("checked", true);

            var jstreeData = [];
            var uniqueNodes = {};

            var vocabulariesPropertiesMap = {};
            async.series([
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
                                properties = Config.ontologiesVocabularyModels[vocabulary].properties;
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
                        withCheckboxes: true,
                        searchPlugin: {
                            case_insensitive: true,
                            fuzzy: false,
                            show_only_matches: true,
                        },
                    };
                    common.jstree.loadJsTree("lineageRelations_propertiesJstreeDiv", jstreeData, options, function () {
                        //  $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(Lineage_sources.activeSource);
                    });
                },
            ]);
        });
    };

    self.getPropertiesJstreeMenu = function () {
        var items = {};

        items.PropertyInfos = {
            label: "PropertyInfos",
            action: function (_e) {
                $("#LineagePopup").dialog("open");
                SourceBrowser.showNodeInfos(self.curentPropertiesJstreeNode.parent, self.curentPropertiesJstreeNode, "LineagePopup");
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

    self.onshowDrawRelationsDialogValidate = function (action) {
        if (action == "clear") {
            var properties = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
            var edges = visjsGraph.data.edges.get();
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

            visjsGraph.data.edges.remove(edgesToClear);
        } else {
            //draw
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
                if (!visjsGraph.isGraphNotEmpty()) {
                    options.data = null;
                } else {
                    var data = [];
                    var nodes = visjsGraph.data.nodes.get();
                    nodes.forEach(function (node) {
                        if (node.data && (!node.data.type || node.data.type != "literal")) {
                            data.push(node.id);
                        }
                    });
                    options.data = data;
                }
            } else if (selection == "all") {
                options.data = "allSourceNodes";
            }

            var propIds = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
            var properties = [];
            propIds.forEach(function (prop) {
                if (prop.parent != "#") {
                    properties.push(prop.data.id);
                }
            });
            options.filter = "";
            if (properties.length > 0) {
                // if active source selected take all properties( ==no filter on props)
                var filter = "";
                if (properties.indexOf(Config.sources[Lineage_sources.activeSource].graphUri) < 0) {
                    filterProp = Sparql_common.setFilter("prop", properties);
                }

                options.filter += filterProp;
            }

            var propFilter = $("#Lineage_relation_filterText").val();
            if (propFilter) {
                options.filter += propFilter;
            }
            if (type == "both") {
                type = null;
            }
            if (direction == "both") {
                direction = null;
            }

            self.previousQuery = {
                propIds: propIds,
                propFilter: propFilter,
            };
            self.drawRelations(direction, type, caller, options);
        }
        $("#mainDialogDiv").dialog("close");
    };

    self.drawRelations = function (direction, type, caller, options) {
        if (!options) {
            options = {};
        }
        options.skipLiterals = true;
        var source = null;
        var data = null;
        if (!options.data) {
            if (caller == "Graph") {
                data = Lineage_classes.currentGraphNode.data.id;
            } else if (caller == "Tree") {
                data = Lineage_classes.currentTreeNode.data.id;
            } else if (caller == "both") {
                data = null;
            } else if (caller == "leftPanel" || type == "dictionary") {
                var nodes = visjsGraph.data.nodes.get();
                nodes.forEach(function (node) {
                    if (node.data && (!node.data.type || node.data.type != "literal")) {
                        data.push(node.id);
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
        var existingNodes = options.output == "table" ? {} : visjsGraph.getExistingIdsMap();
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

                    data = visjsGraph.data.nodes.getIds();
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
                if (allVisjsData.nodes.length == 0 && allVisjsData.edges.length == 0) {
                    return MainController.UI.message("no data found", true);
                }
                if (!options.output || options.output == "graph") {
                    MainController.UI.message("drawing " + allVisjsData.nodes.length + "nodes and " + allVisjsData.edges.length + " edges...", true);
                    if (visjsGraph.isGraphNotEmpty()) {
                        visjsGraph.data.nodes.add(allVisjsData.nodes);
                        visjsGraph.data.edges.add(allVisjsData.edges);
                    } else {
                        Lineage_classes.drawNewGraph(allVisjsData);
                    }
                    if (err) {
                        return alert(err);
                    }
                } else if (options.output == "table") {
                    Export.exportGraphToDataTable(allVisjsData.nodes, allVisjsData.edges);
                }
            }
        );
    };

    self.callPreviousQuery = function () {
        if (!self.previousQuery) {
            return;
        }
        $("#lineageRelations_propertiesJstreeDiv").jstree().uncheck_all();
        $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(self.previousQuery.propIds);

        if (self.previousQuery.propFilter) {
            Lineage_relationFilter.showAddFilterDiv(true);
            $("#Lineage_relation_filterText").css("display", "block");
            $("#Lineage_relation_filterText").val(self.previousQuery.propFilter);
        }
    };
    self.loadUserQueries = function () {
        Sparql_CRUD.list("STORED_QUERIES", null, null, "lineageRelations_savedQueriesSelect");
    };
    self.onSelectSavedQuery = function (id) {
        $("#lineageRelations_history_deleteBtn").css("display", "inline");
        Sparql_CRUD.loadItem(id, {}, function (err, result) {
            if (err) return alert(err.responseText);
            $("#lineageRelations_propertiesJstreeDiv").jstree().uncheck_all();
            $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(result.propIds);

            if (result.propFilter) {
                Lineage_relationFilter.showAddFilterDiv(true);
                $("#Lineage_relation_filterText").val(result.propFilter);
            }
        });
    };
    self.saveCurrentQuery = function () {
        var propIds = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
        var propFilter = $("#Lineage_relation_filterText").val();

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
                if (err) return alert(err.responseText);
                self.loadUserQueries();
                $("#lineageRelations_history_deleteBtn").css("display", "none");
            });
        }
    };

    return self;
})();
