import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import Lineage_styles from "../lineage/lineage_styles.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import common from "../../shared/common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";

self.lineageVisjsGraph;

var Containers_tree = (function () {
    var self = {};

    self.getContextJstreeMenu = function () {
        var items = {};
        items["NodeInfos"] = {
            label: "Node infos",
            action: function (_e) {
                NodeInfosWidget.showNodeInfos(Lineage_sources.activeSource, self.currentContainer, "mainDialogDiv");
            },
        };
        items["GraphNode"] = {
            label: "Graph node",
            action: function (_e) {
                if (self.currentContainer.data.type == "container") {
                    Lineage_containers_UI.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { onlyOneLevel: true });
                } else {
                    Lineage_whiteboard.drawNodesAndParents(self.currentContainer, 0);
                }
            },
        };
        items["Open node"] = {
            label: "Open node",
            action: function (_e) {
                // $("#lineage_containers_containersJstree").jstree().open_all(self.currentContainer.id);
                Lineage_containers_UI.listContainerResources(Lineage_sources.activeSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
            },
        };
        items.copyNodes = {
            label: "Copy Node(s)",
            action: function (e) {
                // pb avec source
                Lineage_whiteboard.copyNode(e);
                var selectedNodes = $("#lineage_containers_containersJstree").jstree().get_selected(true);
                Lineage_common.copyNodeToClipboard(selectedNodes);
            },
        };
        items["AddGraphNode"] = {
            label: "Add selected node to container",
            action: function (_e) {
                var graphNodeData = Lineage_whiteboard.currentGraphNode.data;
                Lineage_containers_UI.addResourcesToContainer(Lineage_sources.activeSource, self.currentContainer, graphNodeData);
            },
        };
        items["PasteNodesInContainer"] = {
            label: "Paste nodes in container",
            action: function (_e) {
                Lineage_containers_UI.pasteNodesInContainer(Lineage_sources.activeSource, self.currentContainer);
            },
        };

        items["DeleteContainer"] = {
            label: "Delete container",
            action: function (_e) {
                Lineage_containers_UI.deleteContainer(Lineage_sources.activeSource, self.currentContainer);
            },
        };

        items["GraphContainerDescendant"] = {
            label: "Graph  descendants",
            action: function (_e) {
                Lineage_containers_UI.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { descendants: true });
            },
        };
        items["GraphContainerDescendantAndLeaves"] = {
            label: "Graph  descendants + leaves",
            action: function (_e) {
                Lineage_containers_UI.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { leaves: true });
            },
        };

        return items;
    };

    self.drawContainerJstree = function (jstreeDiv, data, options, callback) {
        if (!options) {
            options = {};
        }

        var jstreeData = [];
        var existingIds = {};
        var existingNodes = {};

        // set rootnodes
        data.forEach(function (item) {
            var id = item.id;
            var jstreeId = "_" + common.getRandomHexaId(5);
            if (!existingIds[id]) {
                existingIds[id] = jstreeId;
            }

            if (!existingNodes[jstreeId]) {
                existingNodes[jstreeId] = 1;
            }
            var node = {
                id: existingIds[id],
                text: item.label,
                parent: "#",
                type: "Container",
                data: {
                    type: "Container",
                    source: source,
                    id: id,
                    label: item.label,
                    parent: "#",
                    //tabId: options.tabId,
                },
            };

            jstreeData.push(node);
        });

        data.forEach(function (item) {
            var parentId = item.parent.value;
            var types = item.memberTypes.value.split(",");

            var type = JstreeWidget.selectTypeForIconsJstree(types);

            var id = item.member.value;
            var jstreeId = "_" + common.getRandomHexaId(5);
            if (!existingIds[id]) {
                existingIds[id] = jstreeId;
            }
            var parentJstreeId = "_" + common.getRandomHexaId(5);
            if (!existingIds[parentId]) {
                existingIds[parentId] = parentJstreeId;
            }

            var node = {
                id: existingIds[id],
                text: item.memberLabel.value,
                parent: existingIds[parentId],
                type: type,
                data: {
                    type: type,
                    source: source,
                    id: id,
                    label: item.memberLabel.value,
                    currentParent: existingIds[parentId],
                    tabId: options.tabId,
                },
            };

            jstreeData.push(node);
        });

        var jstreeOptions;
        if (options.jstreeOptions) {
            jstreeOptions = options.jstreeOptions;
        } else {
            jstreeOptions = {
                openAll: false,
                contextMenu: Lineage_containers_UI.getContextJstreeMenu(),
                selectTreeNodeFn: Lineage_containers_UI.onSelectedNodeTreeclick,
                dnd: {
                    drag_stop: function (data, element, helper, event) {
                        //  self.onMoveContainer(data, element, helper, event);
                    },
                    drag_start: function (data, element, helper, event) {
                        var sourceNodeId = element.data.nodes[0];
                        self.currenDraggingNodeSourceParent = $("#lineage_containers_containersJstree").jstree().get_node(sourceNodeId).parent;
                    },
                },
            };
        }

        JstreeWidget.loadJsTree(jstreeDiv, jstreeData, jstreeOptions, function () {
            if (options.filter) {
                $("#" + jstreeDiv).jstree("open_all");
            } else {
                $("#" + jstreeDiv)
                    .jstree()
                    .open_node("#");
            }

            self.bindMoveNode(jstreeDiv);
        });
    };

    self.drawContainerJstreeXXX = function (source, filter, jstreeDiv, search_on_container, memberType, options, callback) {
        if (!options) {
            options = {};
        }
        if (!options.depth) {
            options.depth = 1;
        }
        if (!options.filter) {
            options.filter = "";
        }
        options.filter += filter || "";

        var data = [];
        var rootNodes = [];
        async.series(
            [
                function (callbackSeries) {
                    if (search_on_container) {
                        if (!Array.isArray(search_on_container)) {
                            search_on_container = [search_on_container];
                        }
                        return callbackSeries();
                    }
                    // determine top container with members if no search_on_container
                    self.sparql_queries.getTopContainers(source, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        if (result.results.binding.length == 0) {
                            return callback("no ");
                        }
                        search_on_container = [];

                        result.results.bindings.forEach(function (item) {
                            search_on_container.push(item.member.value);
                            rootNodes.push({ id: item.member.value, label: item.memberLabel.value });
                        });
                        callbackSeries();
                    });
                },
                // determine top container without  members if no search_on_container and no  container with members
                function (callbackSeries) {
                    callbackSeries();
                },
                //prepare parents and members
                function (callbackSeries) {
                    self.sparql_queries.getContainerDescendants(source, search_on_container, options, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        data = result.results.bindings;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var jstreeData = [];
                    var existingIds = {};
                    var existingNodes = {};

                    // set rootnodes
                    rootNodes.forEach(function (item) {
                        var id = item.id;
                        var jstreeId = "_" + common.getRandomHexaId(5);
                        if (!existingIds[id]) {
                            existingIds[id] = jstreeId;
                        }

                        //existingIds[id].push(jstreeId);

                        if (!existingNodes[jstreeId]) {
                            existingNodes[jstreeId] = 1;
                        }
                        var node = {
                            id: existingIds[id],
                            text: item.label,
                            parent: "#",
                            type: "Container",
                            data: {
                                type: "Container",
                                source: source,
                                id: id,
                                label: item.label,
                                parent: "#",
                                //tabId: options.tabId,
                            },
                        };

                        jstreeData.push(node);
                    });

                    data.forEach(function (item) {
                        var parentId = item.parent.value;
                        var types = item.memberTypes.value.split(",");

                        var type = JstreeWidget.selectTypeForIconsJstree(types);

                        var id = item.member.value;
                        var jstreeId = "_" + common.getRandomHexaId(5);
                        if (!existingIds[id]) {
                            existingIds[id] = jstreeId;
                        }
                        var parentJstreeId = "_" + common.getRandomHexaId(5);
                        if (!existingIds[parentId]) {
                            existingIds[parentId] = parentJstreeId;
                        }

                        var node = {
                            id: existingIds[id],
                            text: item.memberLabel.value,
                            parent: existingIds[parentId],
                            type: type,
                            data: {
                                type: type,
                                source: source,
                                id: id,
                                label: item.memberLabel.value,
                                currentParent: existingIds[parentId],
                                tabId: options.tabId,
                            },
                        };

                        jstreeData.push(node);
                    });

                    var jstreeOptions;
                    if (options.jstreeOptions) {
                        jstreeOptions = options.jstreeOptions;
                    } else {
                        jstreeOptions = {
                            openAll: false,
                            contextMenu: Lineage_containers_UI.getContextJstreeMenu(),
                            selectTreeNodeFn: Lineage_containers_UI.onSelectedNodeTreeclick,
                            dnd: {
                                drag_stop: function (data, element, helper, event) {
                                    //  self.onMoveContainer(data, element, helper, event);
                                },
                                drag_start: function (data, element, helper, event) {
                                    var sourceNodeId = element.data.nodes[0];
                                    self.currenDraggingNodeSourceParent = $("#lineage_containers_containersJstree").jstree().get_node(sourceNodeId).parent;
                                },
                            },
                        };
                    }

                    JstreeWidget.loadJsTree(jstreeDiv, jstreeData, jstreeOptions, function () {
                        if (options.filter) {
                            $("#" + jstreeDiv).jstree("open_all");
                        } else {
                            $("#" + jstreeDiv)
                                .jstree()
                                .open_node("#");
                        }

                        self.bindMoveNode(jstreeDiv);
                    });

                    callbackSeries();
                },
            ],
            function (err) {}
        );
    };

    self.listContainerResources = function (source, containerNode, options, callback, JstreeDiv) {
        var existingChildren = [];
        if (!JstreeDiv) {
            var JstreeDiv = "lineage_containers_containersJstree";
        }

        //Do not execute the descendants request if he already has children?
        if (containerNode.children.length > 1) {
            return;
        }

        self.sparql_queries.getContainerDescendants(source, containerNode ? containerNode.data.id : null, options, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var existingNodes = {};
            if (containerNode) {
                // existingNodes=$("#lineage_containers_containersJstree").jstree().get_node(containerNode.id).children;
                var jstreeChildren = JstreeWidget.getNodeDescendants(JstreeDiv, containerNode.id, 2);
                jstreeChildren.forEach(function (item) {
                    existingNodes[item.data.id] = 1;
                });
            }

            var jstreeData = [];
            var nodesMap = {};

            result.results.bindings.forEach(function (item) {
                //  var nodeId=item.parent+"_"+item.member.value
                item.jstreeId = "_" + common.getRandomHexaId(5);
                nodesMap[item.member.value] = item;
            });

            for (var key in nodesMap) {
                var item = nodesMap[key];

                var containerJstreeId = "#";
                var continerDataId = null;
                if (containerNode) {
                    containerJstreeId = containerNode.id;
                    continerDataId = containerNode.data.id;
                }

                var parent = item.parent.value == continerDataId ? containerJstreeId : nodesMap[item.parent.value] ? nodesMap[item.parent.value].jstreeId : "#";
                if (!existingNodes[item.member.value]) {
                    existingNodes[item.member.value] = 1;

                    var types = item.memberTypes.value.split(",");
                    var type_icon = JstreeWidget.selectTypeForIconsJstree(types, self.add_supplementary_layer_for_types_icon);

                    jstreeData.push({
                        id: item.jstreeId,
                        text: item.memberLabel.value,
                        parent: parent,
                        type: type_icon,
                        data: {
                            type: types,
                            source: source,
                            id: item.member.value,
                            label: item.memberLabel.value,
                        },
                    });
                }
            }
            if (jstreeData.length > 0) {
                JstreeWidget.addNodesToJstree(JstreeDiv, containerJstreeId, jstreeData);
                if (callback) {
                    callback(jstreeData);
                }
            }
        });
    };

    self.onSelectedNodeTreeclick = function (event, obj) {
        self.currentContainer = obj.node;

        if (obj.event.button != 2) {
            self.listContainerResources(Lineage_sources.activeSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
        }
    };

    return self;
})();

export default Containers_tree;

window.Containers_tree = Containers_tree;
