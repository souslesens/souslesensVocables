var JstreeWidget = (function () {
    var self = {};

    self.types = {
        tool: {
            icon: "../icons/tool.png",
        },
        SKOS: {
            icon: "../icons/thesaurus.png",
        },
        OWL: {
            icon: "../icons/ontology.png",
        },

        class: {
            icon: "../icons/class.png",
        },
        concept: {
            icon: "../icons/concept.png",
        },
        collection: {
            icon: "../icons/collection.png",
        },
        default: {
            icon: "../icons/default.png",
        },
        "owl:Class": {
            li_attr: { style: "color:black" },
            icon: "../icons/class.png",
        },
        "owl:ObjectProperty": {
            icon: "../icons/property.png",
        },
        "owl:Restriction": {
            icon: "../icons/restriction.png",
        },
        "owl:table": {
            icon: "../icons/table.png",
        },
        importedClass: {
            li_attr: { style: "color:#ccc" },
            icon: "../icons/externalObject.png",
        },
        importedProperty: {
            li_attr: { style: "color:#ccc" },
            icon: "../icons/externalObject.png",
        },
        importedRestriction: {
            li_attr: { style: "color:#ccc" },
            icon: "../icons/externalObject.png",
        },
        Class: {
            li_attr: { style: "color:black" },
            icon: "../icons/class.png",
        },
        Property: {
            li_attr: { style: "color:black" },
            icon: "../icons/property.png",
        },

        // @ts-ignore
        container: {
            icon: "../icons/containers.png",
        },

        individual: {
            icon: "../icons/individual.png",
        },
        "http://www.w3.org/2002/07/owl#NamedIndividual": {
            icon: "../icons/individual.png",
        },
    };

    self.loadJsTree = function (jstreeDiv, jstreeData, options, callback) {
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
        plugins.push("types");

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
                    $("#" + jstreeDiv)
                        .jstree(true)
                        .open_all();
                }

                self.setTreeAppearance();
                if (!options.doNotAdjustDimensions) {
                    JstreeWidget.setTreeParentDivDimensions(jstreeDiv);
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
            $("#" + jstreeDiv).on("hover_node.jstree", function (node) {
                options.onHoverNode(node);
            });
        }
    };

    self.clear = function (jstreeDiv) {
        $("#" + jstreeDiv)
            .jstree("destroy")
            .empty();
    };

    self.addNodesToJstree = function (jstreeDiv, parentNodeId_, jstreeData, options, callback) {
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

                var parentNodeObj = $("#" + jstreeDiv)
                    .jstree(true)
                    .get_node(parentNodeId);

                // parent exists and have children

                //Create node
                $("#" + jstreeDiv)
                    .jstree(true)
                    .create_node(parentNodeId, node, position, function () {
                        self.setTreeAppearance();
                        $("#" + jstreeDiv)
                            .jstree(true)
                            .open_node(parentNodeId, null, 500);
                    });
            }
        });
        if (callback) {
            callback(jstreeData);
        }
    };

    self.deleteNode = function (jstreeDiv, nodeId) {
        $("#" + jstreeDiv)
            .jstree(true)
            .delete_node(nodeId);
        self.setTreeAppearance();
    };
    self.deleteBranch = function (jstreeDiv, nodeId, deleteNodeItself) {
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
            $("#" + jstreeDiv)
                .jstree(true)
                .delete_node(descendants);
        } catch (e) {
            console.error(e);
        }
    };
    self.getjsTreeNodes = function (jstreeDiv, IdsOnly, parentNodeId) {
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

    self.getjsTreeNodeObj = function (jstreeDiv, id) {
        return $("#" + jstreeDiv)
            .jstree(true)
            .get_node(id);
    };
    // get node from node.data field
    self.getNodeByDataField = function (jstreeDiv, property, value) {
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

    self.getNodeDescendants = function (jstreeDiv, nodeId, depth, onlyIds) {
        var nodes = [];
        var nodeIdsMap = {};
        var currentLevel = 0;
        var recurse = function (nodeId) {
            if (depth && currentLevel++ > depth) {
                return;
            }

            var node = $("#" + jstreeDiv)
                .jstree(true)
                .get_node(nodeId);
            if (!nodeIdsMap[nodeId]) {
                nodeIdsMap[nodeId] = 1;
                if (onlyIds) {
                    nodes.push(node.id);
                } else {
                    nodes.push(node);
                }

                // Attempt to traverse if the node has children
                if (node.children) {
                    node.children.forEach(function (child) {
                        recurse(child);
                    });
                }
            }
        };
        recurse(nodeId);

        return nodes;
    };
    self.openNodeDescendants = function (jstreeDiv, nodeId, depth) {
        var descendants = JstreeWidget.getNodeDescendants(jstreeDiv, nodeId, depth);
        $("#" + jstreeDiv)
            .jstree()
            .open_node(descendants);
    };

    self.setTreeParentDivDimensions = function (jstreeDiv) {
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
        $("#" + jstreeDiv)
            .jstree()
            .check_all();
    };
    self.openNode = function (jstreeDiv, nodeId) {
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
        //if un truck différent des 3 prendre ca
        //else
        //Bag>Class
        //Bag>namedindividual
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
                type = "container";
            } else {
                if (types.includes(uri_named)) {
                    type = "individual";
                }
                if (types.includes(uri_class)) {
                    type = "class";
                }
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

    return self;
})();

export default JstreeWidget;
window.JstreeWidget = JstreeWidget;
