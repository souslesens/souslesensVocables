import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import Lineage_styles from "../lineage/lineage_styles.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Containers_query from "./containers_query.js";

var Containers_tree = (function() {
    var self = {};
    self.jstreeDivId = "lineage_containers_containersJstree";




    self.search = function(jstreeDivId,options, callback) {
        if(jstreeDivId)
            self.jstreeDivId=jstreeDivId
        if(!options){
            options={}
        }
        if (!callback) {
            callback = function() {
            };
        }

        var term = $("#Lineage_containers_searchInput").val();
        var source = Lineage_sources.activeSource;

        var filter = "";
        if (term) {
            Containers_tree.drawContainerAndAncestorsJsTree(source, term, {}, function(err, result) {
                if (err) {
                    return alert(err.responseText);
                }

            });
        } else {
            Containers_query.getTopContainer(source, options,function(err, result) {

                self.drawTree(self.jstreeDivId, source, "#", result.results.bindings, options);
            });
        }
    };

    self.drawTree = function(jstreeDiv, source, rootNode, data, options, callback) {
        var jstreeData = [];
        self.idsMap = {};
        var existingNodes = {};

        // set rootnodes
        data.forEach(function(item) {
            var id = item.member.value;
            var label = item.memberLabel ? item.memberLabel.value : Sparql_common.getLabelFromURI(item.member.value);
            var jstreeId = "_" + common.getRandomHexaId(5);

            var parent;
            if (rootNode) {
                parent = rootNode;
            } else {
                parent = item.parent.value;

            }
            if (!self.idsMap[id]) {
                self.idsMap[id] = jstreeId;
            }

            if (!existingNodes[jstreeId]) {
                existingNodes[jstreeId] = 1;
            }
            var node = {
                id: self.idsMap[id],
                text: label,
                parent: parent,
                type: "Container",
                data: {
                    type: "Container",
                    source: source,
                    id: id,
                    label: label,
                    parent: parent
                    //tabId: options.tabId,
                }
            };

            jstreeData.push(node);
        });

        var jstreeOptions;
        if (options.jstreeOptions) {
            jstreeOptions = options.jstreeOptions;
        } else {
            jstreeOptions = {
                openAll: false,
                contextMenu: Containers_tree.getContextJstreeMenu(),
                selectTreeNodeFn: Containers_tree.onSelectedNodeTreeclick

            };
        }
        JstreeWidget.loadJsTree(jstreeDiv, jstreeData, jstreeOptions, function() {
            $("#" + jstreeDiv)
                .jstree()
                .open_node("#");
            //  self.bindMoveNode(jstreeDiv);
        });
    };


    self.listContainerResources = function(container) {

        var source = container.data.source;
        Containers_query.getContainerDescendants(source, container.data.id, {}, function(err, result) {
            if (err) {
                return alert(err.responsetext);
            }

            var jstreeData = [];

            var existingNodes = {};
            result.results.bindings.forEach(function(item) {
                var id = item.descendant.value;
                var label = item.descendantLabel ? item.descendantLabel.value : Sparql_common.getLabelFromURI(item.descendant.value);
                var jstreeId = "_" + common.getRandomHexaId(5);

                var parent = self.idsMap[item.descendantParent.value];


                if (!self.idsMap[id]) {
                    self.idsMap[id] = jstreeId;
                }

                if (!existingNodes[jstreeId]) {
                    existingNodes[jstreeId] = 1;
                }
                var node = {
                    id: self.idsMap[id],
                    text: label,
                    parent: parent,
                    type: "Container",
                    data: {
                        type: "Container",
                        source: source,
                        id: id,
                        label: label,
                        parent: parent
                        //tabId: options.tabId,
                    }
                };
                jstreeData.push(node);
            });
            var parent = self.idsMap[container.data.id];
            JstreeWidget.addNodesToJstree(self.jstreeDivId, parent, jstreeData);

        });

    };


    self.drawContainerAndAncestorsJsTree = function(source, term, options, callback) {

        if (!options) {
            options={}
        }
        var filter = Sparql_common.setFilter("child", null, term);
        options.filter= filter ;
        Containers_query.getContainerLabelAscendants(source, null, options, function(err, result) {
            if (err) {
                return callback(err);
            }


            //identify top Node
            var childrenMap = {};
            result.results.bindings.forEach(function(item) {
                childrenMap[item.ancestorChild.value] = item.ancestor.value;
            });
            var rootNode=null;
            result.results.bindings.forEach(function(item) {
                if(!childrenMap[item.ancestor.value])
                    rootNode= {
                        "ancestor": {
                            "type": "uri",
                            "value": null
                        },
                        "ancestorChild": {
                            "type": "uri",
                            "value": item.ancestor.value
                        }

                    }

            })
            result.results.bindings.push(rootNode)



            var jstreeData = [];
            result.results.bindings.forEach(function(item) {
                var jstreeData = [];

                var existingNodes = {};

                result.results.bindings.forEach(function(item) {
                    var id = item.ancestorChild.value;
                    var label = item.ancestorChildLabel ? item.ancestorChildLabel.value : Sparql_common.getLabelFromURI(item.ancestorChild.value);
                    var jstreeId = "_" + common.getRandomHexaId(5);

                    var parent
                  /*  if(item.ancestor.value ==rootNode)
                        parent="#"
                    else*/
                        parent=self.idsMap[item.ancestor.value] || "#"


                    if (!self.idsMap[id]) {
                        self.idsMap[id] = jstreeId;
                    }

                    if (!existingNodes[jstreeId]) {
                        existingNodes[jstreeId] = 1;
                    }
                    var node = {
                        id: self.idsMap[id],
                        text: label,
                        parent: parent,
                        type: "Container",
                        data: {
                            type: "Container",
                            source: source,
                            id: id,
                            label: label,
                            parent: parent
                            //tabId: options.tabId,
                        }
                    };
                    jstreeData.push(node);
                });
                var jstreeOptions;
                if (options.jstreeOptions) {
                    jstreeOptions = options.jstreeOptions;
                } else {
                    jstreeOptions = {
                        openAll: false,
                        contextMenu: Containers_tree.getContextJstreeMenu(),
                        selectTreeNodeFn: Containers_tree.onSelectedNodeTreeclick

                    };
                }
                JstreeWidget.loadJsTree(self.jstreeDivId, jstreeData, jstreeOptions, function() {
                    $("#" + self.jstreeDivId)
                        .jstree()
                        .open_all();
                    //  self.bindMoveNode(jstreeDiv);
                });
            });


        });

    };

    self.onSelectedNodeTreeclick = function(event, obj) {
        self.currentContainer = obj.node;

        if (obj.event.button != 2) {
            self.listContainerResources(self.currentContainer, { onlyOneLevel: true, leaves: true });
        }
    };


    self.getContextJstreeMenu = function() {
        var items = {};
        items["NodeInfos"] = {
            label: "Node infos",
            action: function(_e) {
                NodeInfosWidget.showNodeInfos(Lineage_sources.activeSource, self.currentContainer, "mainDialogDiv");
            }
        };
        items["GraphNode"] = {
            label: "Graph node",
            action: function(_e) {
                if (self.currentContainer.data.type == "container") {
                    Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { onlyOneLevel: true });
                } else {
                    Lineage_whiteboard.drawNodesAndParents(self.currentContainer, 0);
                }
            }
        };
        items["Open node"] = {
            label: "Open node",
            action: function(_e) {
                // $("#lineage_containers_containersJstree").jstree().open_all(self.currentContainer.id);
                Lineage_containers.listContainerResources(Lineage_sources.activeSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
            }
        };
        items.copyNodes = {
            label: "Copy Node(s)",
            action: function(e) {
                // pb avec source
                Lineage_whiteboard.copyNode(e);
                var selectedNodes = $("#lineage_containers_containersJstree").jstree().get_selected(true);
                Lineage_common.copyNodeToClipboard(selectedNodes);
            }
        };
        items["AddGraphNode"] = {
            label: "Add selected node to container",
            action: function(_e) {
                var graphNodeData = Lineage_whiteboard.currentGraphNode.data;
                Lineage_containers.addResourcesToContainer(Lineage_sources.activeSource, self.currentContainer, graphNodeData);
            }
        };
        items["PasteNodesInContainer"] = {
            label: "Paste nodes in container",
            action: function(_e) {
                Lineage_containers.pasteNodesInContainer(Lineage_sources.activeSource, self.currentContainer);
            }
        };

        items["DeleteContainer"] = {
            label: "Delete container",
            action: function(_e) {
                Lineage_containers.deleteContainer(Lineage_sources.activeSource, self.currentContainer);
            }
        };

        items["GraphContainerDescendant"] = {
            label: "Graph  descendants",
            action: function(_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { descendants: true });
            }
        };
        items["GraphContainerDescendantAndLeaves"] = {
            label: "Graph  descendants + leaves",
            action: function(_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { leaves: true });
            },
        };

        return items;
    };

    return self;
})();

export default Containers_tree;

window.Containers_tree = Containers_tree;
