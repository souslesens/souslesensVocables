var Lineage_selection = (function () {
    var self = {};
    self.selectedNodes = [];

    self.addNodeToSelection = function (node) {
        Lineage_selection.selectedNodes.push(node);
        $("#Lineageclasses_selectedNodesCount").html(Lineage_selection.selectedNodes.length);
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update({ id: node.data.id, borderWidth: 6 });
        $("#Lineage_combine_mergeNodesDialogButton").css("display", "block");
    };

    self.clearNodesSelection = function (ids) {
        if (ids && !Array.isArray(ids)) {
            ids = [ids];
        }
        var newNodes = [];
        var newSelection = [];
        Lineage_selection.selectedNodes.forEach(function (node) {
            if (!ids || ids.indexOf(node.data.id) > -1) {
                newNodes.push({ id: node.data.id, borderWidth: 1 });
            }
            if (ids && ids.indexOf(node.data.id) < 0) {
                newSelection.push(node);
            }
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
        Lineage_selection.selectedNodes = newSelection;
        $("#Lineageclasses_selectedNodesCount").html(Lineage_selection.selectedNodes.length);
        $("#Lineage_combine_mergeNodesDialogButton").css("display", "none");
    };
    self.getSelectedNodesTree = function () {
        var jstreeData = [];
        var distinctNodes = {};
        Lineage_selection.selectedNodes.forEach(function (node) {
            if (!distinctNodes[node.data.id]) {
                distinctNodes[node.data.id] = 1;
                jstreeData.push({
                    id: node.data.id,
                    text: node.data.label,
                    parent: node.data.source,
                    data: node.data,
                });
                if (!distinctNodes[node.data.source]) {
                    distinctNodes[node.data.source] = 1;
                    jstreeData.push({
                        id: node.data.source,
                        text: node.data.source,
                        parent: "#",
                    });
                }
            }
        });
        return jstreeData;
    };

    self.showSelectionDialog = function (allGraphNodes) {
        if (allGraphNodes) {
            Lineage_selection.selectedNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        }
        if (MainController.currentTool == "lineage") {
            if (Lineage_selection.selectedNodes.length == 0) {
                Lineage_selection.selectedNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            }
        }
        if (MainController.currentTool == "KGquery") {
            if (Lineage_selection.selectedNodes.length == 0) {
                Lineage_selection.selectedNodes = KGquery_graph.KGqueryGraph.data.nodes.get();
            }
        }
        var jstreeData = Lineage_selection.getSelectedNodesTree();
        var options = {
            openAll: true,
            withCheckboxes: true,
            tie_selection: false,
            selectTreeNodeFn: Lineage_selection.onSelectedNodeTreeclick,
        };
        $("#smallDialogDiv").load("modules/tools/lineage/html/selection/lineageSelectionDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            try {
                JstreeWidget.loadJsTree("lineage_selection_selectedNodesTreeDiv", jstreeData, options, function (err, result) {
                    if (MainController.currentTool == "KGquery") {
                        $("#selectionActionsDiv").children(":not(#classDecorateButton)").hide();
                    }
                });
            } catch (e) {
                var x = e;
            }
        });
    };

    self.selectNodesOnHover = function (node, point, options) {
        if (options.ctrlKey && options.altKey) {
            Lineage_selection.addNodeToSelection(node);
        } else if (options.ctrlKey && options.shiftKey) {
            Lineage_selection.clearNodesSelection(node.data.id);
        }
    };

    self.onSelectedNodeTreeclick = function (event, obj) {
        var node = obj.node;
        if (node.parent == "#") {
            return;
        }
        NodeInfosWidget.showNodeInfos(node.data.source, node, "lineage_selection_rightPanel");
    };

    self.getSelectedNodes = function (onlyIds) {
        var selection = [];
        var nodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);
        nodes.forEach(function (node) {
            if (node.parent != "#") {
                if (onlyIds) {
                    selection.push(node.id);
                } else {
                    selection.push(node);
                }
            }
        });
        return selection;
    };
    self.onSelectionExecuteAction = function (action, checkSelected) {
        if (action == "filterBy") {
            self.filterBy.showDialog();
        }
        var jstreeNodes = self.getSelectedNodes(true);
        if (!checkSelected && jstreeNodes.length == 0) {
            return alert("check nodes to process");
        } else if (action == "decorate") {
            self.decorate.showDialog();
        } else if (action == "classDecorate") {
            self.classDecorate.showDialog();
        } else if (action == "modifyPredicates") {
            self.modifyPredicates.showDialog();
        } else if (action == "deleteSelection") {
            self.modifyPredicates.deleteSelection();
        } else if (action == "exportCsv") {
            alert("on construction");
        } else if (action == "sparqlFilter") {
            self.getSparqlFilter();
        } else if (action == "SelectRootNodes") {
            self.selectWhiteboardTopNodes();
        }
    };

    self.filterBy = {
        showDialog: function () {
            $("#lineage_selection_rightPanel").load("modules/tools/lineage/html/selection/lineage_selection_filterBy.html", function () {
                return;
                KGcreator.getSourcePropertiesAndObjectLists(Lineage_sources.activeSource, Config.currentTopLevelOntology, { withoutSourceObjects: 1 }, function (err, result) {
                    if (err) {
                        return alert(err.responseText);
                    }
                    common.fillSelectOptions("Lineage_filterBy_propertySelect", result.predicates, true, "label", "id");
                });
            });
        },
    };

    self.decorate = {
        showDialog: function () {
            $("#lineage_selection_rightPanel").load("modules/tools/lineage/html/selection/lineage_selection_decorateDialog.html", function () {
                $("#lineage_selection_decorate_applyButton").bind("click", Lineage_selection.decorate.execDecorate);

                common.fillSelectWithColorPalette("lineage_selection_decorate_colorSelect");

                var shapes = ["ellipse", " circle", " database", " box", " text", "diamond", " dot", " star", " triangle", " triangleDown", " hexagon", " square"];
                common.fillSelectOptions("lineage_selection_decorate_shapeSelect", shapes, true);
            });
        },

        execDecorate: function () {
            var jstreeNodes = self.getSelectedNodes();

            var newIds = [];

            var color = $("#lineage_selection_decorate_colorSelect").val();
            var shape = $("#lineage_selection_decorate_shapeSelect").val();
            var size = $("#lineage_selection_decorate_sizeInput").val();
            jstreeNodes.forEach(function (node) {
                if (!node.data) {
                    return;
                }
                if (node.from) {
                    return;
                }
                var obj = { id: node.id };
                if (color) {
                    obj.color = color;
                }
                if (shape) {
                    obj.shape = shape;
                }
                if (size) {
                    obj.size = size;
                }
                newIds.push(obj);
            });

            $("#smallDialogDiv").dialog("close");
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newIds);
        },
    };
    self.classDecorate = {
        showDialog: function () {
            $("#lineage_selection_rightPanel").load("modules/tools/lineage/html/selection/lineage_selection_decorateClassDialog.html", function () {
                $("#lineage_selection_decorate_applyButton").bind("click", Lineage_selection.classDecorate.execDecorate);
                $("#lineage_selection_decorate_deleteButton").bind("click", Lineage_selection.classDecorate.deleteDecorate);
                common.fillSelectWithColorPalette("lineage_selection_decorate_colorSelect");
                var shapes = ["ellipse", " circle", " database", " box", " text", "diamond", " dot", " star", " triangle", " triangleDown", " hexagon", " square"];
                common.fillSelectOptions("lineage_selection_decorate_shapeSelect", shapes, true);
            });
        },
        execDecorate: function () {
            var jstreeNodes = self.getSelectedNodes();

            var newIds = {};
            var decoration_data = {};
            var color = $("#lineage_selection_decorate_colorSelect").val();
            var shape = $("#lineage_selection_decorate_shapeSelect").val();
            var size = $("#lineage_selection_decorate_sizeInput").val();
            var file_icon = $("#lineage_selection_decorate_iconInput")[0].files[0];

            if (!file_icon) {
                return alert("missing icon file");
            }

            async.series(
                [
                    //File icon uploading
                    function (callbackSeries) {
                        if (file_icon) {
                            const reader = new FileReader();
                            reader.onload = function (e) {
                                var fileContent = e.target.result; // Stockage du contenu du fichier dans la variable
                                var base64Data = btoa(fileContent);
                                var payload = {
                                    dir: "classIcons/",
                                    fileName: $("#lineage_selection_decorate_iconInput")[0].files[0].name,
                                    data: JSON.stringify({ data: base64Data }),
                                };
                                $.ajax({
                                    type: "POST",
                                    url: `${Config.apiUrl}/data/file`,
                                    data: payload,
                                    dataType: "json",
                                    success: function (_result, _textStatus, _jqXHR) {
                                        UI.message("icon uploaded");
                                        callbackSeries();
                                    },
                                    error(err) {
                                        return callbackSeries(err);
                                    },
                                });
                            };
                            reader.readAsBinaryString(file_icon);
                        } else {
                            callbackSeries();
                        }
                    },

                    function (callbackSeries) {
                        jstreeNodes.forEach(function (node) {
                            if (!node.data) {
                                return;
                            }
                            var obj = { id: node.id };
                            if (color) {
                                obj.color = color;
                            }
                            if (shape) {
                                obj.shape = shape;
                            }
                            if (size) {
                                obj.size = size;
                            }
                            if (file_icon) {
                                obj.image = "classIcons/" + $("#lineage_selection_decorate_iconInput")[0].files[0].name;
                                obj.shape = "circularImage";
                            }
                            newIds[node.id] = obj;
                        });
                        var fileName = MainController.currentSource + "_decoration.json";
                        //Get current decoration file
                        var payload = {
                            dir: "graphs/",
                            fileName: fileName,
                        };

                        $.ajax({
                            type: "GET",
                            url: `${Config.apiUrl}/data/file`,
                            data: payload,
                            dataType: "json",
                            success: function (result, _textStatus, _jqXHR) {
                                var data = JSON.parse(result);
                                for (var key in newIds) {
                                    data[key] = newIds[key];
                                }
                                decoration_data = JSON.parse(JSON.stringify(data));
                                callbackSeries();
                            },
                            error(err) {
                                decoration_data = newIds;
                                return callbackSeries();
                            },
                        });
                    },
                    function (callbackSeries) {
                        var fileName = MainController.currentSource + "_decoration.json";
                        var payload = {
                            dir: "graphs/",
                            fileName: fileName,
                            data: JSON.stringify(decoration_data),
                        };
                        $.ajax({
                            type: "POST",
                            url: `${Config.apiUrl}/data/file`,
                            data: payload,
                            dataType: "json",
                            success: function (_result, _textStatus, _jqXHR) {
                                UI.message("Decoration saved");
                                callbackSeries();
                            },
                            error(err) {
                                return callbackSeries(err);
                            },
                        });
                    },
                ],
                function (err) {
                    if (err) {
                        return err;
                    }
                    if (MainController.currentTool == "KGquery") {
                        KGquery.clearAll();
                    }
                },
            );
        },
        deleteDecorate: function () {
            var jstreeNodes = self.getSelectedNodes();
            var fileName = MainController.currentSource + "_decoration.json";
            //Get decoration data
            var payload = {
                dir: "graphs/",
                fileName: fileName,
            };

            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/data/file`,
                data: payload,
                dataType: "json",
                success: function (result, _textStatus, _jqXHR) {
                    var data = JSON.parse(result);
                    for (var node in jstreeNodes) {
                        delete data[jstreeNodes[node].id];
                    }
                    var fileName = MainController.currentSource + "_decoration.json";
                    var payload = {
                        dir: "graphs/",
                        fileName: fileName,
                        data: JSON.stringify(data),
                    };
                    $.ajax({
                        type: "POST",
                        url: `${Config.apiUrl}/data/file`,
                        data: payload,
                        dataType: "json",
                        success: function (_result, _textStatus, _jqXHR) {
                            UI.message("Decoration deleted");
                        },
                        error(err) {
                            return alert(err);
                        },
                    });
                },
                error(err) {
                    return alert(err);
                },
            });
        },
    };

    self.container = {};

    self.modifyPredicates = {
        showDialog: function () {
            $("#lineage_selection_rightPanel").load("modules/tools/lineage/html/selection/lineage_selection_modifyPredicates.html", function () {
                return;
                KGcreator.getSourcePropertiesAndObjectLists(Lineage_sources.activeSource, Config.currentTopLevelOntology, { withoutSourceObjects: 1 }, function (err, result) {
                    if (err) {
                        return alert(err.responseText);
                    }

                    common.fillSelectOptions("lineage_selection_modifyPredicate_propertySelect", result.predicates, true, "label", "id");
                    common.fillSelectOptions("lineage_selection_modifyPredicate_objectSelect", result.objectClasses, true, "label", "id");
                });
            });
        },

        addPredicate: function () {
            var property = $("#lineage_selection_modifyPredicate_propertySelect").val();
            var object = $("#lineage_selection_modifyPredicate_objectValue").val();
            if (!property || !object) {
                return alert("enter predicate property and object");
            }

            var jstreeNodes = self.getSelectedNodes(true);
            var triples = [];
            var otherSourcesNodes = [];
            jstreeNodes.forEach(function (node) {
                if (!node.data) {
                    return;
                }
                if (node.data.source == Lineage_sources.activeSource) {
                    triples.push({
                        subject: "<" + node.data.id + ">",
                        predicate: "<" + property + ">",
                        object: object,
                    });
                } else {
                    otherSourcesNodes.push(node.data.id);
                }
            });

            var str = "";
            if (otherSourcesNodes.length != 0) {
                str = " ! otherSourcesNodes.length not belonging to active source will be ignored";
            }
            if (!confirm("create new predicate for selected nodes (" + jstreeNodes.length + ")" + str)) {
                return;
            }

            Sparql_generic.insertTriples(Lineage_sources.activeSource, triples, null, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                UI.message("predicate added to container " + containerName);
            });
        },
        deletePredicate: function () {
            var property = $("#lineage_selection_modifyPredicate_propertySelect").val();
            var object = $("#lineage_selection_modifyPredicate_objectValue").val();
            if (!property && !object) {
                return alert("enter predicate property and/or object");
            }

            var nodeIds = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked();
            if (!confirm("delete predicate on  selection")) {
                if (!confirm("Are you sure ?")) {
                    return;
                }
            }

            Sparql_generic.deleteTriples(Lineage_sources.activeSource, nodeIds, property, object, function (err, result) {
                return alert(err.responseText);
                UI.message(nodeIds.length + " nodes deleted  ");
            });
        },

        deleteSelection: function () {
            var nodeIds = self.getSelectedNodes(true);
            if (!confirm("delete node selection")) {
                if (!confirm("Are you sure you want to delete " + jstreeNodes.length + " nodes")) {
                    return;
                }
            }

            Sparql_generic.deleteTriples(Lineage_sources.activeSource, nodeIds, null, null, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                Sparql_generic.deleteTriples(Lineage_sources.activeSource, null, null, nodeIds, function (err, result) {
                    if (err) {
                        return alert(err.responseText);
                    }
                    UI.message(nodeIds.length + " nodes deleted  ");
                });
            });
        },
    };

    self.getSparqlFilter = function () {
        var nodeIds = self.getSelectedNodes(true);
        if (nodeIds.length == 0) {
            return alert("no node selected");
        }
        var filterStr = Sparql_common.setFilter("x", nodeIds);
        alert(filterStr);
    };

    self.selectWhiteboardTopNodes = function () {
        var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
        var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();

        var parentEdgesMap = {};
        edges.forEach(function (edge) {
            if (edge.data && edge.data.type == "parent") {
                parentEdgesMap[edge.from] = edge.to;
            }
        });
        var topNodes = [];
        for (var fromNode in parentEdgesMap) {
            var toNode = parentEdgesMap[fromNode];
            if (!parentEdgesMap[toNode]) {
                topNodes.push(toNode);
            }
        }

        $("#lineage_selection_selectedNodesTreeDiv").jstree(true).uncheck_all();

        $("#lineage_selection_selectedNodesTreeDiv").jstree(true).check_node(topNodes);
    };

    return self;
})();

export default Lineage_selection;

window.Lineage_selection = Lineage_selection;
