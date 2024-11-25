import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Containers_query from "./containers_query.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Containers_graph from "./containers_graph.js";

var Containers_tree = (function () {
    var self = {};
    self.jstreeDivId = "lineage_containers_containersJstree";

    self.search = function (jstreeDivId, source, options, callback) {
        if (jstreeDivId) {
            self.jstreeDivId = jstreeDivId;
        }

        if (!options) {
            options = {};
        }
        if (!callback) {
            callback = function () {};
        }

        var term = $("#Lineage_containers_searchInput").val();
        if (source) self.currentSource = source;
        else {
            self.currentSource = Lineage_sources.activeSource;
        }

        var filter = "";
        if (term) {
            Containers_tree.drawContainerAndAncestorsJsTree(self.currentSource, term, {}, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
            });
        } else {
            Containers_query.getTopContainer(self.currentSource, options, function (err, result) {
                self.clickedContainers = {};
                self.drawTree(self.jstreeDivId, self.currentSource, "#", result.results.bindings, options);
            });
        }
    };

    self.drawTree = function (jstreeDiv, source, rootNode, data, options, callback) {
        var jstreeData = [];
        self.idsMap = {};
        var existingNodes = {};

        // set rootnodes
        data.forEach(function (item) {
            var id = item.member.value;
            var jstreeId = common.getRandomHexaId(5);
            var label = item.memberLabel ? item.memberLabel.value : Sparql_common.getLabelFromURI(item.member.value);
            var jstreeId = "_" + common.getRandomHexaId(8);

            var parent;
            if (rootNode) {
                parent = rootNode;
            } else {
                if (self.idsMap[item.parent.value]) parent = self.idsMap[item.parent.value];
                else {
                    parent = "_" + common.getRandomHexaId(8);
                    self.idsMap[item.parent.value] = parent;
                }
                // parent = item.parent.value;
            }
            if (!self.idsMap[id]) {
                self.idsMap[id] = jstreeId;
            }

            if (!existingNodes[jstreeId]) {
                existingNodes[jstreeId] = 1;
            }
            var node = {
                id: jstreeId,
                text: label,
                parent: parent,
                type: "Container",
                data: {
                    type: "Container",
                    source: source,
                    id: id,
                    label: label,
                    parent: parent,
                    //tabId: options.tabId,
                },
            };

            jstreeData.push(node);
        });

        jstreeData.sort(function (a, b) {
            if (a.text > b.text) {
                return 1;
            }
            if (a.text < b.text) {
                return -1;
            }
            return 0;
        });

        var jstreeOptions;
        if (options.jstreeOptions) {
            jstreeOptions = options.jstreeOptions;
        } else {
            jstreeOptions = {
                openAll: false,
                contextMenu: Containers_tree.getContextJstreeMenu(),
                selectTreeNodeFn: Containers_tree.onSelectedNodeTreeclick,
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
            $("#" + jstreeDiv)
                .jstree()
                .open_node("#");
            self.menuActions.bindMoveNode(jstreeDiv);
        });
    };

    self.graphResourcesXXXX = function (source, containerData, options, callback) {
        if (!options) {
            options = {};
        }

        var data = [];
        var descendants = [];
        var stylesMap = {};
        var visjsData;
        async.series(
            [
                //getContainers descendants type container
                function (callbackSeries) {
                    //  options.descendants = true;
                    // options.leaves = true;
                    UI.message("searching...");
                    Containers_query.getContainerDescendants(source, containerData.id, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = data.concat(result.results.bindings);
                        if (data.length > Lineage_whiteboard.showLimit * 8) {
                            return callbackSeries({ responseText: "too many nodes " + data.length + " cannot draw" });
                        }
                        return callbackSeries();
                    });
                    UI.message("drawing graph...");
                },

                //get containersStyles
                function (callbackSeries) {
                    return callbackSeries();
                },

                //draw
                function (callbackSeries) {
                    var color = Lineage_whiteboard.getSourceColor(source);
                    var opacity = 1.0;
                    var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                    visjsData = { nodes: [], edges: [] };
                    var objectProperties = [];

                    var shape = "dot";
                    var color2 = common.colorToRgba(color, opacity * 0.7);
                    var memberEdgeColor = common.colorToRgba(self.containerEdgeColor, opacity * 0.7);
                    var size = Lineage_whiteboard.defaultShapeSize;

                    if (!existingNodes[containerData.id]) {
                        existingNodes[containerData.id] = 1;

                        var type = "container";
                        visjsData.nodes.push({
                            id: containerData.id,
                            label: containerData.label,
                            shadow: self.nodeShadow,
                            shape: Containers_graph.containerStyle.shape,
                            size: size,
                            font: type == "container" ? { color: "#70309f" } : null,
                            color: Containers_graph.containerStyle.color,
                            data: {
                                type: type,
                                source: source,
                                id: containerData.id,
                                label: containerData.label,
                            },
                        });
                    }

                    data.forEach(function (item) {
                        if (!existingNodes[item.parent.value]) {
                            var type = "container";
                            existingNodes[item.parent.value] = 1;
                            visjsData.nodes.push({
                                id: item.parent.value,
                                label: item.parentLabel.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? Containers_graph.containerStyle.shape : shape,
                                size: size,
                                font: type == "container" ? { color: color2, size: 10 } : null,
                                color: Containers_graph.containerStyle.color,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.parent.value,
                                    label: item.parentLabel.value,
                                },
                            });
                        }

                        if (!existingNodes[item.member.value]) {
                            var color = Containers_graph.containerStyle.color;
                            var shape = Containers_graph.containerStyle.shape;
                            var type = "container";
                            if (item.memberTypes.value.indexOf("Bag") < 0) {
                                color = Lineage_whiteboard.getSourceColor(self.currentSource);
                                if (item.memberTypes.value.indexOf("Individual") > -1) {
                                    type = "individual";
                                    shape = "triangle";
                                } else {
                                    type = "class";
                                    shape = Lineage_whiteboard.defaultShape;
                                    shape = "dot";
                                }
                            }

                            existingNodes[item.member.value] = 1;
                            visjsData.nodes.push({
                                id: item.member.value,
                                label: item.memberLabel.value,
                                shadow: self.nodeShadow,
                                shape: shape,
                                size: size,
                                font: type == "container" ? { color: color2, size: 10 } : null,
                                color: color,

                                data: {
                                    type: type,
                                    source: source,
                                    id: item.member.value,
                                    label: item.memberLabel.value,
                                },
                            });
                        }

                        if (false && containerData.id != item.parent.value) {
                            var edgeId = containerData.id + "_" + "member" + "_" + item.parent.value;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: containerData.id,
                                    to: item.parent.value,
                                    /*  arrows: {
                                        middle: {
                                            enabled: true,
                                            type: Lineage_whiteboard.defaultEdgeArrowType,
                                            scaleFactor: 0.5
                                        }
                                    },*/
                                    data: {
                                        from: containerData.id,
                                        to: item.parent.value,
                                        source: source,
                                    },
                                    //  dashes: true,
                                    width: 0.5,
                                    color: memberEdgeColor,
                                });
                            }
                        }
                        if (item.member.value != item.parent.value) {
                            var edgeId = item.parent.value + "_" + "member" + "_" + item.member.value;

                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;
                                var type = "container";
                                if (item.memberTypes.value.indexOf("Bag") < 0) {
                                    type = "class";
                                }
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.parent.value,
                                    to: item.member.value,
                                    arrows: {
                                        enabled: true,
                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                    data: {
                                        from: item.parent.value,
                                        to: item.member.value,
                                        source: source,
                                    },
                                    //  dashes: true,
                                    width: type == "container" ? 1 : 0.5,
                                    color: memberEdgeColor,
                                });
                            }
                        }
                    });

                    function setNodesLevel(visjsData) {
                        var nodelevels = {};

                        function recurse(from, level) {
                            visjsData.edges.forEach(function (edge) {
                                if (edge.from == edge.to) {
                                    return;
                                }
                                if (edge.from == from) {
                                    if (!nodelevels[edge.to]) {
                                        nodelevels[edge.to] = level + 1;
                                        recurse(edge.to, level + 1);
                                    }
                                }
                            });
                        }

                        recurse(containerData.id, 1);
                        var maxLevel = 0;
                        visjsData.nodes.forEach(function (node, index) {
                            var level = (nodelevels[node.id] || 0) - 1;
                            if (node.id == containerData.id) {
                                level = 0;
                            }

                            maxLevel = Math.max(maxLevel, level);
                            visjsData.nodes[index].level = level;
                        });

                        visjsData.nodes.forEach(function (node, index) {
                            if (node.level == -1) {
                                node.level = maxLevel;
                            } else {
                                node.level = node.level;
                            }
                        });
                    }

                    setNodesLevel(visjsData);

                    if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        Lineage_whiteboard.drawNewGraph(visjsData);
                    } else {
                        Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                        Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
                    }
                    Lineage_whiteboard.lineageVisjsGraph.network.fit();
                    $("#waitImg").css("display", "none");
                    if (objectProperties.length > 0) {
                        source = self.currentSource;
                        var options = {
                            filter: Sparql_common.setFilter("prop", objectProperties),
                        };
                        options.allNodes = false;
                        Lineage_relations.drawRelations(null, null, "Properties", options);
                    }
                    return callbackSeries();
                },
            ],
            function (err) {
                UI.message("", true);
                if (err) {
                    return alert(err.responseText);
                    if (callback) {
                        return callback(err);
                    }
                }
                if (callback) {
                    return callback(null, visjsData);
                }
                return;
            }
        );
    };

    self.onSelectedNodeTreeclick = function (event, obj) {
        self.currentContainer = obj.node;

        if (obj.event.button != 2) {
            self.listContainerResources(self.currentContainer);
        }
        if (obj.event.ctrlKey) {
            NodeInfosWidget.showNodeInfos(self.currentContainer.data.source, self.currentContainer.data.source, "mainDialogDiv");
        }
    };

    self.menuActions = {};

    self.listContainerResources = function (container) {
        var source = container.data.source;
        // if container clicked don't click again on because no restrictions on container and class URIs (same class can be drawed n times in arborescence) anymore
        if (self.clickedContainers[container.id]) {
            return;
        }
        self.clickedContainers[container.id] = 1;

        Containers_query.getContainerDescendants(source, container.data.id, { depth: 1, leaves: true }, function (err, result) {
            if (err) {
                return alert(err.responsetext);
            }

            if (result.length == 0) {
                return UI.message("no result", true);
            }
            var jstreeData = [];

            var existingNodes = {};
            var descendantsURI = {};
            var parent = container.id;
            result.results.bindings.forEach(function (item) {
                var id = item.member.value;
                if (descendantsURI[id]) {
                    return;
                } else {
                    descendantsURI[id] = 1;
                }
                var label = item.memberLabel ? item.memberLabel.value : Sparql_common.getLabelFromURI(item.member.value);
                var jstreeId = "_" + common.getRandomHexaId(5);

                //var parent = self.idsMap[item.parent.value];

                var type = "Container";
                if (item.memberTypes.value == "http://www.w3.org/2002/07/owl#Class") {
                    type = "Class";
                }
                if (!self.idsMap[id]) {
                    self.idsMap[id] = jstreeId;
                }

                if (!existingNodes[jstreeId]) {
                    existingNodes[jstreeId] = 1;
                }
                var node = {
                    id: jstreeId,
                    text: label,
                    parent: parent,
                    type: type,
                    data: {
                        type: type,
                        source: source,
                        id: id,
                        label: label,
                        parent: parent,
                        //tabId: options.tabId,
                    },
                };
                jstreeData.push(node);
            });
            //var parent = self.idsMap[container.data.id];
            JstreeWidget.addNodesToJstree(self.jstreeDivId, parent, jstreeData);
        });
    };

    self.drawContainerAndAncestorsJsTree = function (source, term, options, callback) {
        if (!options) {
            options = {};
        }
        var filter = Sparql_common.setFilter("child", null, term);
        options.filter = filter;
        Containers_query.getContainersAscendants(source, null, options, function (err, result) {
            if (err) {
                return callback(err);
            }

            if (result.length == 0) {
                return UI.message("no result", true);
            }
            //identify top Node
            var childrenMap = {};
            result.forEach(function (item) {
                childrenMap[item.ancestorChild.value] = item.ancestor.value;
            });
            var rootNode = null;
            result.forEach(function (item) {
                if (!childrenMap[item.ancestor.value]) {
                    rootNode = {
                        ancestor: {
                            type: "uri",
                            value: null,
                        },
                        ancestorChild: {
                            type: "uri",
                            value: item.ancestor.value,
                        },
                    };
                }
            });
            result.push(rootNode);

            var jstreeData = [];
            var existingNodes = {};

            result.forEach(function (item) {
                var id = item.ancestorChild.value;
                var label = item.ancestorChildLabel ? item.ancestorChildLabel.value : Sparql_common.getLabelFromURI(item.ancestorChild.value);
                var jstreeId = "_" + common.getRandomHexaId(5);

                var parent;
                /*  if(item.ancestor.value ==rootNode)
                    parent="#"
                else*/
                parent = self.idsMap[item.ancestor.value] || "#";

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
                        parent: parent,
                        //tabId: options.tabId,
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
                    contextMenu: Containers_tree.getContextJstreeMenu(),
                    selectTreeNodeFn: Containers_tree.onSelectedNodeTreeclick,
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
            JstreeWidget.loadJsTree(self.jstreeDivId, jstreeData, jstreeOptions, function () {
                $("#" + self.jstreeDivId)
                    .jstree()
                    .open_all();
                self.menuActions.bindMoveNode(self.jstreeDivId);
            });
        });
    };

    self.menuActions.bindMoveNode = function (jstreeDiv) {
        $("#" + jstreeDiv).bind("move_node.jstree", function (e, data) {
            function getjstreeIdUri(id) {
                var node = $("#lineage_containers_containersJstree").jstree().get_node(id);
                var uri = node && node.data ? node.data.id : "x";
                return uri;
            }

            var movingInfos = {
                nodeId: getjstreeIdUri(data.node.id),
                newParent: getjstreeIdUri(data.parent),
                oldParent: getjstreeIdUri(data.old_parent),
                position: getjstreeIdUri(data.position),
            };
            Containers_query.writeMovedNodeNewParent(movingInfos);
            // console.log(movingInfos)
        });
    };

    self.getContextJstreeMenu = function () {
        var items = {};
        items["NodeInfos"] = {
            label: "Node infos",
            action: function (_e) {
                NodeInfosWidget.showNodeInfos(self.currentSource, self.currentContainer, "mainDialogDiv");
            },
        };
        items["GraphNode"] = {
            label: "Graph node",
            action: function (_e) {
                if (self.currentContainer.data.type == "container") {
                    Containers_graph.graphResources(self.currentSource, self.currentContainer.data, { onlyOneLevel: true });
                } else {
                    Lineage_whiteboard.drawNodesAndParents(self.currentContainer, 0);
                }
            },
        };
        items["Open node"] = {
            label: "Open node",
            action: function (_e) {
                // $("#lineage_containers_containersJstree").jstree().open_all(self.currentContainer.id);
                Containers_tree.menuActions.listContainerResources(self.currentSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
            },
        };
        items.copyNodes = {
            label: "Copy Node(s)",
            action: function (e) {
                // pb avec source
                Lineage_whiteboard.copyNode(e);
                var selectedNodes = $("#lineage_containers_containersJstree").jstree().get_selected(true);
                // Containers_tree.menuActions.copyNodeToClipboard(selectedNodes);
                Lineage_common.copyNodeToClipboard(selectedNodes);
            },
        };
        items["AddGraphNode"] = {
            label: "Add selected node to container",
            action: function (_e) {
                var graphNodeData = Lineage_whiteboard.currentGraphNode.data;
                Containers_tree.menuActions.addResourcesToContainer(self.currentSource, self.currentContainer, graphNodeData);
            },
        };
        items["PasteNodesInContainer"] = {
            label: "Paste nodes in container",
            action: function (_e) {
                Containers_tree.menuActions.pasteNodesInContainer(self.currentSource, self.currentContainer);
            },
        };

        items["DeleteContainer"] = {
            label: "Delete container",
            action: function (_e) {
                Containers_tree.menuActions.deleteContainer(self.currentSource, self.currentContainer);
            },
        };

        items["GraphContainerDescendant"] = {
            label: "Graph  descendants",
            action: function (_e) {
                Containers_graph.graphResources(self.currentSource, self.currentContainer.data, { descendants: true });
            },
        };
        items["GraphContainerDescendantAndLeaves"] = {
            label: "Graph  descendants + leaves",
            action: function (_e) {
                Containers_graph.graphResources(self.currentSource, self.currentContainer.data, { leaves: true });
            },
        };

        return items;
    };

    self.menuActions.addContainer = function (source) {
        if (!source) {
            source = self.currentSource;
        }

        var newContainerLabel = prompt("enter new container label)");
        if (!newContainerLabel) {
            return;
        }

        var containerUri = Config.sources[source].graphUri + "bag/" + common.formatStringForTriple(newContainerLabel, true);

        var triples = [];

        if (self.currentContainer && self.currentContainer.id != containerUri) {
            triples.push({
                subject: "<" + self.currentContainer.data.id + ">",
                predicate: " rdfs:member",
                object: "<" + containerUri + ">",
            });
        }

        triples.push({
            subject: "<" + containerUri + ">",
            predicate: " rdf:type",
            object: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag>",
        });
        triples.push({
            subject: containerUri,
            predicate: " rdfs:label",
            object: newContainerLabel,
        });
        Sparql_generic.insertTriples(source, triples, null, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var parent = self.currentContainer || "#";
            var newNode = {
                id: containerUri,
                text: newContainerLabel,
                parent: parent,
                data: {
                    type: "container",
                    source: source,
                    id: containerUri,
                    label: newContainerLabel,
                },
            };

            if (!$("#lineage_containers_containersJstree").jstree) {
                // initialize jstree
                self.search(self.jstreeDivId, self.currentSource, null, function (err, result) {
                    $("#lineage_containers_containersJstree")
                        .jstree()
                        .create_node(parent, newNode, "first", function (err, result) {
                            $("#lineage_containers_containersJstree").jstree().open_node(parent);
                        });
                });
            } else {
                $("#lineage_containers_containersJstree")
                    .jstree()
                    .create_node(parent, newNode, "first", function (err, result) {
                        $("#lineage_containers_containersJstree").jstree().open_node(parent);
                    });
            }

            self.currentContainer = null;
        });
    };

    /**
     *
     * add nodes to a container(owl:bag)
     *
     *
     * @param source
     * @param container
     * @param nodesData
     * @param drawMembershipEdge add the edge (and the node) on the vizGraph
     */
    self.menuActions.addResourcesToContainer = function (source, container, nodesData, drawMembershipEdge, callback) {
        // can also copy nodes coming from copy container
        if (false && !(container.data.type.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag") || container.data.type == "container")) {
            return alert("can only add resources to containers");
        }

        if (!Array.isArray(nodesData)) {
            nodesData = [nodesData];
        }

        var otherSourcesNodes = [];
        var triples = [];
        nodesData.forEach(function (nodeData) {
            if (container.id == nodeData.id) {
                return alert("a  node cannot be member of itself");
            }

            if (!nodeData.source) {
                return console.log(" node without source");
            }
            if (true || nodeData.source == source) {
                triples.push({
                    subject: "<" + container.data.id + ">",
                    predicate: "<http://www.w3.org/2000/01/rdf-schema#member>",
                    object: "<" + nodeData.id + ">",
                });
            } else {
                otherSourcesNodes.push(node.id);
            }
        });

        Sparql_generic.insertTriples(source, triples, null, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return alert(err.responseText);
            }
            UI.message("nodes added to container " + container.label);
            var jstreeData = [];
            nodesData.forEach(function (nodeData) {
                jstreeData.push({
                    id: nodeData.id + "_" + common.getRandomHexaId(8),
                    text: nodeData.label,
                    parent: container.id,
                    type: "class",
                    data: {
                        type: nodesData.type || "resource",
                        source: source,
                        id: nodeData.id,
                        label: nodeData.label,
                    },
                });
            });
            if ($("#lineage_containers_containersJstree").jstree) {
                if (callback) {
                    JstreeWidget.addNodesToJstree("lineage_containers_containersJstree", container.id, jstreeData, null, callback);
                } else {
                    JstreeWidget.addNodesToJstree("lineage_containers_containersJstree", container.id, jstreeData);
                }
            }

            if (drawMembershipEdge) {
                var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                var edges = [];
                nodesData.forEach(function (nodeData) {
                    var edgeId = container.id + "_" + "member" + "_" + nodeData.id;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        edges.push({
                            id: edgeId,
                            from: container.id,
                            to: nodeData.id,
                            // arrows: " middle",

                            data: { propertyId: "http://www.w3.org/2000/01/rdf-schema#member", source: source },
                            font: { multi: true, size: 10 },

                            //  dashes: true,
                            color: self.containerEdgeColor,
                        });
                    }
                });

                Lineage_whiteboard.lineageVisjsGraph.data.edges.add(edges);
            }
            if (callback) {
                return callback(null);
                if (jstreeData) {
                    callback(jstreeData);
                }
            }
        });
    };

    self.menuActions.pasteNodesInContainer = function (source, container) {
        common.pasteTextFromClipboard(function (text) {
            // debugger
            if (!text) {
                return UI.message("no node copied");
            }
            try {
                var nodes = JSON.parse(text);
                var nodesData = [];
                nodes.forEach(function (node) {
                    if (node.data) {
                        nodesData.push(node.data);
                    }
                });

                self.menuActions.addResourcesToContainer(source, container, nodesData);
            } catch (e) {
                console.log("wrong clipboard content");
            }
            return;
        });
    };

    self.menuActions.deleteContainer = function (source, container) {
        if (!confirm("delete container)")) {
            return;
        }
        self.currentContainer = null;
        Sparql_generic.deleteTriples(source, container.data.id, null, null, function (err) {
            if (err) {
                return alert(err.responseText);
            }

            Sparql_generic.deleteTriples(source, null, null, container.data.id, function (err) {
                var node = $("#lineage_containers_containersJstree").jstree().get_node(container.id);
                if (node.children.length > 0) {
                    $("#lineage_containers_containersJstree").jstree().move_node(node.children, "#");
                }
                $("#lineage_containers_containersJstree").jstree().delete_node(container.id);
            });
        });
    };

    self.menuActions.writeMovedNodeNewParent = function (movedNodeInfos) {
        var graphUri = Config.sources[self.currentSource].graphUri;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "with <" +
            graphUri +
            "> delete {<" +
            movedNodeInfos.oldParent +
            "> rdfs:member <" +
            movedNodeInfos.nodeId +
            ">}" +
            "insert {<" +
            movedNodeInfos.newParent +
            "> rdfs:member <" +
            movedNodeInfos.nodeId +
            ">}";

        var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.currentSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
        });
    };
    self.pasteNodeIntoContainer = function (source, container) {
        try {
            common.pasteTextFromClipboard(function (str) {
                if (!str) throw "xx";
                var obj = JSON.parse(str);
                self.menuActions.addResourcesToContainer(source, container, obj.data, true, function (er, result) {});
            });
        } catch (e) {
            alert("invalid clipboard content");
        }
    };

    return self;
})();

export default Containers_tree;

window.Containers_tree = Containers_tree;
