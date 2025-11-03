var JstreeWidget = (function () {
    var self = {};

    self.types = {
        Thesaurus: {
            icon: "../icons/thesaurus.png",
        },
        // Ontology
        Source: {
            icon: "./icons/CommonIcons/SourceIcon.png",
        },

        Class: {
            li_attr: { style: "color:black" },
            icon: "./icons/JstreeIcons/Classes.png",
        },

        Property: {
            li_attr: { style: "color:black" },
            icon: "./icons/JstreeIcons/Property.png",
        },
        Container: {
            icon: "./icons/JstreeIcons/Container.png",
        },
        Individual: {
            icon: "./icons/JstreeIcons/Individual.png",
        },
        /* KG creator */
        Table: {
            icon: "./icons/JstreeIcons/Table.png",
        },
        Column: {
            icon: "./icons/JstreeIcons/Columns.png",
        },
        databaseSources: {
            icon: "./icons/JstreeIcons/databaseSources.png",
        },
        DataSource: {
            icon: "./icons/JstreeIcons/DataSource.png",
        },
        CSV: {
            icon: "./icons/JstreeIcons/FileCSV.png",
        },
        CSVS: {
            icon: "./icons/JstreeIcons/CSVS.png",
        },

        // Classic items
        default: {
            icon: "./icons/JstreeIcons/Default.png",
        },

        Folder: {
            icon: "./icons/JstreeIcons/Folder.png",
        },

        /* To delete */
        //double
        class: {
            icon: "./icons/JstreeIcons/Classes.png",
        },
        //double
        "owl:ObjectProperty": {
            icon: "./icons/JstreeIcons/Property.png",
        },
        // Triple
        "owl:Class": {
            li_attr: { style: "color:black" },
            icon: "./icons/JstreeIcons/Classes.png",
        },
        // double
        "http://www.w3.org/2002/07/owl#NamedIndividual": {
            icon: "./icons/JstreeIcons/Individual.png",
        },
    };

    self.loadJsTree = function (jstreeDiv, jstreeData, options, callback) {
        if (!jstreeDiv) {
            self.jstreeDiv = "jstreeWidget_treeDiv";
            jstreeDiv = self.jstreeDiv;
            self.dialogDiv = "smallDialogDiv";

            $("#smallDialogDiv").load("modules/uiWidgets/html/jsTreeWidget.html", function () {
                UI.openDialog("smallDialogDiv", { title: "Select items" });
                if (options && options.additionalHTMLComponent) {
                    try {
                        $(options.additionalHTMLComponent).insertBefore("#jstreeWidget_okButton");
                    } catch (error) {
                        console.log("Error inserting additional HTML component: " + error);
                    }
                }
                self.loadJsTree("jstreeWidget_treeDiv", jstreeData, options, callback);
            });
            return;
        } else {
            self.jstreeDiv = jstreeDiv;
        }

        var jstreeData2 = [];
        jstreeData.forEach(function (item) {
            if (item.parent != item.id) {
                jstreeData2.push(item);
            }
        });
        jstreeData = jstreeData2;

        if (!options) {
            options = {};
        }
        self.options = options;
        var plugins = [];
        if (!options.cascade) {
            options.cascade = "xxx";
        }
        if (options.selectDescendants) {
            options.cascade = "down";
        }
        if (options.withCheckboxes) {
            plugins.push("checkbox");
        }
        if (options.searchPlugin) {
            plugins.push("search");
        }

        if (options.contextMenu) {
            // $(".jstree-contextmenu").css("z-index",100)
            plugins.push("contextmenu");
        }
        if (options.dnd) {
            plugins.push("dnd");
        }

        if (options.notTypes) {
            var icons = false;
        } else {
            var icons = true;
            plugins.push("types");
        }

        var check_callbackFn = function (op, node, parent, position, more) {
            if (op == "move_node" && options.dropAllowedFn) {
                return options.dropAllowedFn(op, node, parent, position, more);
            } else {
                return true;
            }
        };

        if ($("#" + jstreeDiv).jstree) {
            $("#" + jstreeDiv).jstree("destroy");
        }
        $("#" + jstreeDiv)
            .jstree({
                /* "checkbox": {
"keep_selected_style": false
},*/
                plugins: plugins,
                core: {
                    data: jstreeData,
                    check_callback: check_callbackFn,
                    themes: {
                        icons: icons,
                    },
                },
                dnd: options.dnd,
                search: options.searchPlugin,
                checkbox: {
                    tie_selection: options.tie_selection === true,
                    whole_node: false,
                },
                types: JstreeWidget.types,

                contextmenu: { items: options.contextMenu },
            })
            .on("loaded.jstree", function () {
                //  setTimeout(function () {
                if (options.openAll) {
                    $("#" + (jstreeDiv || self.jstreeDiv))
                        .jstree(true)
                        .open_all();
                }

                self.setTreeAppearance();
                if (!options.doNotAdjustDimensions) {
                    JstreeWidget.setTreeParentDivDimensions(jstreeDiv);
                }
                if (options.check_all) {
                    self.checkAll();
                }
                if (callback) {
                    if (jstreeData) {
                        callback(jstreeData);
                    } else {
                        callback();
                    }
                }
                //   }, 500)
            })
            .on("select_node.jstree", function (evt, obj) {
                if (options.selectTreeNodeFn) {
                    options.selectTreeNodeFn(evt, obj);
                }
            })
            .on("open_node.jstree", function (evt, obj) {
                self.setTreeAppearance();
                if (options.onOpenNodeFn) {
                    options.onOpenNodeFn(evt, obj);
                }
            })
            .on(" after_open.jstree", function (evt, obj) {
                self.setTreeAppearance();
                if (options.onAfterOpenNodeFn) {
                    options.onAfterOpenNodeFn(evt, obj);
                }
            })

            .on("enable_checkbox.jstree", function (evt, obj) {
                if (options.onCheckNodeFn) {
                    options.onCheckNodeFn(evt, obj);
                }
            })
            .on("check_node.jstree", function (evt, obj) {
                var tree = $("#" + jstreeDiv).jstree(true);
                if (obj?.node?.children_d && obj?.node?.children_d.length > 0) {
                    obj.node.children_d.forEach(function (childId) {
                        var child = tree.get_node(childId);
                        if (child?.state?.disabled) {
                            // Annule la coche sur les nœuds désactivés
                            tree.uncheck_node(child);
                        }
                    });
                }

                if (options.onCheckNodeFn) {
                    options.onCheckNodeFn(evt, obj);
                }
            })
            .on("uncheck_node.jstree", function (evt, obj) {
                if (options.onUncheckNodeFn) {
                    options.onUncheckNodeFn(evt, obj);
                }
            })
            .on("create_node.jstree", function (parent, node, position) {
                if (options.onCreateNodeFn) {
                    options.onCreateNodeFn(parent, node, position);
                    self.setTreeAppearance();
                }
            })
            .on("delete_node.jstree", function (node, parent) {
                if (options.deleteNodeFn) {
                    options.deleteNodeFn(node, parent);
                    self.setTreeAppearance();
                }
            })
            .on("move_node.jstree", function (node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance) {
                if (options.onMoveNodeFn) {
                    options.onMoveNodeFn(node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance);
                    self.setTreeAppearance();
                }
            })
            .on("show_contextmenu", function (node, x, y) {
                if (options.onShowContextMenu) {
                    options.onShowContextMenu(node, x, y);
                }
            });

        if (options.dnd) {
            if (options.dnd.drag_start) {
                $(document).on("dnd_start.vakata", function (data, element, helper, event) {
                    options.dnd.drag_start(data, element, helper, event);
                });
            }
            if (options.dnd.drag_move) {
                $(document).on("dnd_move.vakata Event", function (data, element, helper, event) {
                    options.dnd.drag_move(data, element, helper, event);
                });
            }
            if (options.dnd.drag_stop) {
                $(document).on("dnd_stop.vakata Event", function (data, element, helper, event) {
                    options.dnd.drag_stop(data, element, helper, event);
                });
            }
        }

        if (options.onHoverNode) {
            $("#" + (jstreeDiv || self.jstreeDiv)).on("hover_node.jstree", function (node) {
                options.onHoverNode(node);
            });
        }
    };

    self.clear = function (jstreeDiv) {
        $("#" + (jstreeDiv || self.jstreeDiv))
            .jstree("destroy")
            .empty();
    };
    self.empty = function (jstreeDiv) {
        try {
            $("#" + jstreeDiv)
                .jstree(true)
                .delete_node(
                    $("#" + jstreeDiv)
                        .jstree(true)
                        .get_node("#").children,
                );
        } catch (e) {
            console.log(e);
        }
    };
    self.addNodesToJstree = function (jstreeDiv, parentNodeId_, jstreeData, options, callback) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        if (!options) {
            options = {};
        }
        if (!callback) {
            callback = function () {};
        }
        var position = "first";
        if (options.positionLast) {
            position = "last";
        }
        self.orderJstreeDataForCreation(jstreeDiv, jstreeData);
        if (!Array.isArray(jstreeData)) {
            jstreeData = [jstreeData];
        }

        var parentNodeObj = $("#" + jstreeDiv)
            .jstree(true)
            .get_node(parentNodeId_);
        jstreeData.forEach(function (node) {
            var Jstree_id = $("#" + jstreeDiv)
                .jstree(true)
                .get_node(node.id);
            if (Jstree_id == false) {
                var parentNodeId = parentNodeId_;

                if (!parentNodeId_) {
                    parentNodeId = node.parent;
                }

                if (!parentNodeId) {
                    return;
                }

                if (parentNodeId == node.id) {
                    return console.error("  Error jstree parent == childNode : " + parentNodeId);
                }

                // parent exists and have children

                //Create node
                $("#" + (jstreeDiv || self.jstreeDiv))
                    .jstree(true)
                    .create_node(parentNodeId, node, position, function () {});
            }
        });
        self.setTreeAppearance();
        $("#" + (jstreeDiv || self.jstreeDiv))
            .jstree(true)
            .open_node(parentNodeId_, null, 500);
        if (callback) {
            callback(jstreeData);
        }
    };

    self.deleteNode = function (jstreeDiv, nodeId) {
        $("#" + (jstreeDiv || self.jstreeDiv))
            .jstree(true)
            .delete_node(nodeId);
        self.setTreeAppearance();
    };
    self.deleteBranch = function (jstreeDiv, nodeId, deleteNodeItself) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        var descendants = self.getNodeDescendants(jstreeDiv, nodeId, null, true);
        if (deleteNodeItself) {
            if (descendants.indexOf(nodeId) < 0) {
                descendants.push(nodeId);
            }
        } else {
            var index = descendants.indexOf(nodeId);
            if (index > -1) {
                descendants.splice(index, 1);
            }
        }
        /* descendants.forEach(function(item){
$("#" + jstreeDiv).jstree(true).delete_node(item)
})*/
        try {
            $("#" + (jstreeDiv || self.jstreeDiv))
                .jstree(true)
                .delete_node(descendants);
        } catch (e) {
            console.error(e);
        }
    };
    self.getjsTreeCheckedNodes = function (jstreeDiv) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        return $("#" + jstreeDiv)
            .jstree()
            .get_checked(true);
    };

    self.setjsTreeCheckedNodes = function (jstreeDiv, checkedNodes) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        return $("#" + jstreeDiv)
            .jstree()
            .check_node(checkedNodes);
    };

    self.getjsTreeNodes = function (jstreeDiv, IdsOnly, parentNodeId) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        if (!parentNodeId) {
            parentNodeId = "#";
        }
        var idList = [];
        var jsonNodes = $("#" + jstreeDiv)
            .jstree()
            .get_json(parentNodeId, { flat: true });

        if (IdsOnly) {
            jsonNodes.forEach(function (item) {
                idList.push(item.id);
            });
            return idList;
        } else {
            return jsonNodes;
        }
    };

    self.setSelectedNodeStyle = function (style, id) {
        var node = $(".jstree-clicked");
        for (var key in style) {
            node.css(key, style[key]);
        }
    };

    self.getjsTreeNodeObj = function (jstreeDiv, id) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        return $("#" + jstreeDiv)
            .jstree(true)
            .get_node(id);
    };
    // get node from node.data field
    self.getNodeByDataField = function (jstreeDiv, property, value) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        if (!$("#" + jstreeDiv).jstree(true)) {
            return null;
        }
        var jsonNodes = $("#" + jstreeDiv)
            .jstree(true)
            .get_json("#", { flat: true });
        var matchingNode = null;
        jsonNodes.forEach(function (node) {
            if (node.data && node.data[property] == value) {
                return (matchingNode = node);
            }
        });
        return matchingNode;
    };

    self.getNodeDescendants = function (jstreeDiv, parentNodeId, depth, onlyIds) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        var nodes = [];
        var nodeIdsMap = {};

        var recurse = function (nodeId, level) {
            if (depth && level > depth) {
                return;
            }

            var node = $("#" + jstreeDiv)
                .jstree(true)
                .get_node(nodeId);
            if (!nodeIdsMap[nodeId]) {
                nodeIdsMap[nodeId] = 1;
                if (nodeId != parentNodeId) {
                    if (onlyIds) {
                        nodes.push(node.id);
                    } else {
                        nodes.push(node);
                    }
                }
                // Attempt to traverse if the node has children
                if (node.children) {
                    node.children.forEach(function (child) {
                        recurse(child, level + 1);
                    });
                }
            }
        };
        recurse(parentNodeId, 0);

        return nodes;
    };
    self.openNodeDescendants = function (jstreeDiv, nodeId, depth) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        $("#" + (jstreeDiv || self.jstreeDiv))
            .jstree()
            .open_node(nodeId);
        var descendants = JstreeWidget.getNodeDescendants(jstreeDiv || self.jstreeDiv, nodeId, depth);
        $("#" + (jstreeDiv || self.jstreeDiv))
            .jstree()
            .open_node(descendants);
    };

    self.setTreeParentDivDimensions = function (jstreeDiv) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        var parentDiv = $("#" + jstreeDiv).parent();
        if (!parentDiv) {
            // || parentDiv.width)
            return;
        }

        var p = $("#" + jstreeDiv).offset();
        if (p.top > 200) {
            //in case jstreeDiv in inactive tab
            p.top = 200;
        }
        var h = $(window).height() - p.top - 50;
        var w;
        if (p.left < 600) {
            w = 380;
        } else {
            w = 340;
        }
        // parentDiv.width(w);

        if (jstreeDiv == "LineageNodesJsTreeDiv") {
            // cannot do it generic !!!!!
            parentDiv.height(h);
        }
        if (jstreeDiv == "Lineage_propertiesTree") {
            parentDiv.height(h);
        }
        if (jstreeDiv == "Blender_conceptTreeDiv") {
            parentDiv.height(h);
        }

        parentDiv.css("overflow", "auto");
        parentDiv.css("margin-top", "5px");
    };

    self.setTreeAppearance = function () {
        return;
    };
    self.onAllTreeCbxChange = function (allCBX, jstreeDiv) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        var checked = $(allCBX).prop("checked");
        if (checked) {
            $("#" + jstreeDiv)
                .jstree(true)
                .check_all();
        } else {
            $("#" + jstreeDiv)
                .jstree(true)
                .uncheck_all();
        }
    };
    self.checkAll = function (jstreeDiv) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        $("#" + jstreeDiv)
            .jstree()
            .check_all();
    };
    self.openNode = function (jstreeDiv, nodeId) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        $("#" + jstreeDiv)
            .jstree()
            .open_node(nodeId);
    };

    self.selectTypeForIconsJstree = function (types, callback) {
        var uri_class = "http://www.w3.org/2002/07/owl#Class";
        var uri_bag = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag";
        var uri_named = "http://www.w3.org/2002/07/owl#NamedIndividual";
        var uri_bag2 = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag";
        var type = null;

        if (!types) {
            return "default";
        } else {
            if (!Array.isArray(types)) {
                types = [types];
            }
            var types_without_basics = types.filter(function (item) {
                return item !== uri_class && item !== uri_bag && item !== uri_named && item !== uri_bag2;
            });
        }

        if (callback) {
            if (types_without_basics.length > 0) {
                var adding_type = null;
                adding_type = callback(types_without_basics);
                if (adding_type) {
                    type = adding_type;
                }
            }
        }
        if (!type) {
            if (types.includes(uri_bag)) {
                type = "Container";
            }
            if (types.includes(uri_named)) {
                type = "Individual";
            }
            if (types.includes(uri_class)) {
                type = "Class";
            }
        }

        if (!type) {
            // last which have icon available for multitypes objects
            var types_available = self.types;
            type = "default";
            types.forEach(function (item) {
                if (types_available[item]) {
                    type = item;
                }
            });
        }
        return type;
    };

    self.getNodeByURI = function (jstreeDiv, id) {
        var data = $("#" + jstreeDiv).jstree()._model.data;
        var node_finded = false;
        for (var key in data) {
            var node = data[key];
            if (key != "#") {
                if (node.data.id == id) {
                    node_finded = node;
                }
            }
        }
        return node_finded;
    };

    self.orderJstreeDataForCreation = function (jstreeDiv, JstreeData) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        var length = JstreeData.length;
        var n = 0;
        while (n < length) {
            var node = JstreeData[n];
            var parentNodeId = node.parent;
            var parentNodeObj = $("#" + jstreeDiv)
                .jstree(true)
                .get_node(parentNodeId);
            n++;
            // parent not exist in tree
            if (parentNodeObj == false) {
                var indexfinded = self.checkinJstreeData(JstreeData, parentNodeId);
                if (indexfinded > n - 1) {
                    //pass jstreeData[i] to jstreeData[0]
                    var node_finded = JstreeData[indexfinded];
                    JstreeData.splice(indexfinded, 1);
                    JstreeData.splice(0, 0, node_finded);

                    n = 0;
                }
            }
        }
    };

    self.checkinJstreeData = function (jstreeData, id) {
        var node_finded = null;
        var i = 0;
        var index_finded = null;

        jstreeData.forEach(function (node) {
            if (node.id == id) {
                node_finded = node;
                index_finded = i;
            }
            i++;
        });

        return index_finded;
    };

    self.validateSelfDialog = function () {
        var selected = $("#jstreeWidget_treeDiv").jstree().get_checked(true);
        if (selected.length == 0) {
            var selected = $("#jstreeWidget_treeDiv").jstree().get_selected(true);
        }
        $("#" + self.dialogDiv).dialog("close");
        if (self.options.validateFn) {
            self.options.validateFn(selected);
        }
    };

    self.closeDialog = function () {
        $("#smallDialogDiv").dialog("close");
    };

    self.searchValue = function (value) {
        if (event.keyCode != 13 && event.keyCode != 9) {
            return;
        }
        $("#" + self.jstreeDiv)
            .jstree(true)
            .search(value);
        $("#jstreeWidget_searchInput").val("");
    };
    self.updateJstree = function (divId, newData, options) {
        if (!Array.isArray(newData)) {
            return;
        }
        if (!options) options = {};
        var newData2 = JSON.parse(JSON.stringify(newData));
        var keyToKeep = ["data", "text", "id", "parent"];
        newData2.forEach(function (item) {
            for (let key in item) {
                if (!keyToKeep.includes(key)) {
                    delete item[key];
                }
            }
        });
        newData2 = newData2.filter(function (item) {
            return item.id != "#";
        });
        $("#" + divId).jstree(true).settings.core.data = newData2;
        // deselect nodes clicked to not trigger events with refresh
        $("#" + divId)
            .jstree(true)
            .deselect_all();
        if (options.openAll) {
            $("#" + divId).on("refresh.jstree", function () {
                $("#" + divId)
                    .jstree(true)
                    .open_all();
                $("#" + divId).off("refresh.jstree");
            });
        }
        $("#" + divId)
            .jstree(true)
            .refresh();
    };

    self.filterTree = function (input, jstreeDiv) {
        if (!jstreeDiv) {
            jstreeDiv = self.jstreeDiv;
        }
        var keyword = input.val();
        if (keyword != "" && keyword.length < 2) {
            return;
        }
        $("#" + jstreeDiv).jstree("search", keyword);
        //input.val("")
    };

    return self;
})();

export default JstreeWidget;
window.JstreeWidget = JstreeWidget;
