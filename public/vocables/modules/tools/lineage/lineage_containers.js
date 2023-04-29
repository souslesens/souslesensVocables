import SourceBrowser from "../sourceBrowser.js";
import Lineage_classes from "./lineage_classes.js";
import Lineage_styles from "./lineage_styles.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import common from "../../shared/common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import visjsGraph from "../../graph/visjsGraph2.js";

var Lineage_containers = (function () {
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
                    Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { onlyOneLevel: true });
                } else {
                    Lineage_classes.drawNodesAndParents(self.currentContainer, 0);
                }
            },
        };
        items["Open node"] = {
            label: "Open node",
            action: function (_e) {
                // $("#lineage_containers_containersJstree").jstree().open_all(self.currentContainer.id);
                Lineage_containers.listContainerResources(Lineage_sources.activeSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
            },
        };
        items.copyNodes = {
            label: "Copy Node(s)",
            action: function (e) {
                // pb avec source
                SourceBrowser.copyNode(e);
                var selectedNodes = $("#lineage_containers_containersJstree").jstree().get_selected(true);
                Lineage_common.copyNodeToClipboard(selectedNodes);
            },
        };
        items["AddGraphNode"] = {
            label: "Add selected node to container",
            action: function (_e) {
                var graphNodeData = Lineage_classes.currentGraphNode.data;
                Lineage_containers.addResourcesToContainer(Lineage_sources.activeSource, self.currentContainer, graphNodeData);
            },
        };
        items["PasteNodesInContainer"] = {
            label: "Paste nodes in container",
            action: function (_e) {
                Lineage_containers.pasteNodesInContainer(Lineage_sources.activeSource, self.currentContainer);
            },
        };

        items["DeleteContainer"] = {
            label: "Delete container",
            action: function (_e) {
                Lineage_containers.deleteContainer(Lineage_sources.activeSource, self.currentContainer);
            },
        };

        items["GraphContainerDescendant"] = {
            label: "Graph  descendants",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { descendants: true });
            },
        };
        items["GraphContainerDescendantAndLeaves"] = {
            label: "Graph  descendants + leaves",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { leaves: true });
            },
        };

        /*  items["GraphContainerSetStyle"] = {
label: "Set Style",
action: function(_e) {
Lineage_styles.showDialog(self.currentContainer.data);
}
};*/

        return items;
    };
    self.search = function () {
        if ($("#lineage_containers_containersJstree").jstree) {
            $("#lineage_containers_containersJstree").empty();
        }

        self.currentContainer = null;
        var term = $("#Lineage_containers_searchInput").val();
        var searchWhat = $("#Lineage_containers_searchWhatInput").val();
        var source = Lineage_sources.activeSource;

        var filter = "";
        if (term) {
            filter = "FILTER (" + Sparql_common.setFilter("member", null, term) + ")";
        }
        var memberType;
        if (searchWhat == "bags") {
            memberType = " in (rdf:Bag,rdf:List)";
        }
        if (searchWhat == "classes") {
            memberType = "=owl:Class";
        }
        if (searchWhat == "individuals") {
            memberType = "=owl:NamedIndividual";
        } else if (searchWhat == "any") {
            memberType = " in (owl:Class,owl:NamedIndividual,rdf:Bag,rdf:List)";
        }

        if (searchWhat != "bags" && !term) {
            return alert("enter a term to search for");
        }
        /*  self.listContainerResources(source, null, { filter:filter })


      return;*/

        self.drawContainerJstree(source, filter, "lineage_containers_containersJstree", memberType, {}, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
        });
    };

    self.drawContainerJstree = function (source, filter, jstreeDiv, memberType, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source, null, true);
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct * " +
            fromStr +
            "where {?member rdfs:label ?memberLabel.?member rdf:type ?memberType  filter(?memberType" +
            memberType +
            ")" +
            " OPTIONAL {?member ^rdfs:member ?parentContainer.?parentContainer rdf:type ?type.filter (?type in (rdf:Bag,rdf:List)).?parentContainer rdfs:label ?parentContainerLabel}" +
            " " +
            filter +
            "}";
        var sparql_url = Config.sources[source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var nodesMap = {};

            result.results.bindings.forEach(function (item) {
                //  var nodeId=item.parent+"_"+item.member.value

                item.jstreeId = "_" + common.getRandomHexaId(5);
                nodesMap[item.member.value] = item;
            });

            var uniqueNodes = {};

            var jstreeData = [];

            for (var nodeId in nodesMap) {
                var item = nodesMap[nodeId];
                var parent = "#";

                var memberType = "container";

                parent = item.parentContainer && nodesMap[item.parentContainer.value] ? nodesMap[item.parentContainer.value].jstreeId : "#";
                if (!uniqueNodes[item.jstreeId]) {
                    uniqueNodes[item.jstreeId] = 1;
                    var node = {
                        id: item.jstreeId,
                        text: item.memberLabel.value,
                        parent: parent,
                        type: memberType,
                        data: {
                            type: memberType,
                            source: source,
                            id: item.member.value,
                            label: item.memberLabel.value,
                            currentParent: parent,
                            tabId: options.tabId,
                        },
                    };
                    jstreeData.push(node);
                }
            }

            var jstreeOptions;
            if (options.jstreeOptions) {
                jstreeOptions = options.jstreeOptions;
            } else {
                jstreeOptions = {
                    openAll: false,
                    contextMenu: Lineage_containers.getContextJstreeMenu(),
                    selectTreeNodeFn: Lineage_containers.onSelectedNodeTreeclick,
                    dnd: {
                        drag_stop: function (data, element, helper, event) {
                            self.onMoveContainer(data, element, helper, event);
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
                callback(null);
            });
        });
    };

    self.addContainer = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
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
                self.search(function (err, result) {
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
    self.addResourcesToContainer = function (source, container, nodesData, drawMembershipEdge, callback) {
        if (container.data.type != "container") {
            return alert("can only add resources to containers");
        }
        // self.currentContainer=null;
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
            MainController.UI.message("nodes added to container " + container.label);
            var jstreeData = [];
            nodesData.forEach(function (nodeData) {
                jstreeData.push({
                    id: nodeData.id + "_" + common.getRandomHexaId(5),
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
                JstreeWidget.addNodesToJstree("lineage_containers_containersJstree", container.id, jstreeData);
            }

            if (drawMembershipEdge) {
                var existingNodes = visjsGraph.getExistingIdsMap();
                var edges = [];
                nodesData.forEach(function (nodeData) {
                    var edgeId = container.id + "_" + "member" + "_" + nodeData.id;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        edges.push({
                            id: edgeId,
                            from: container.id,
                            to: nodeData.id,
                            arrows: " middle",

                            data: { propertyId: "http://www.w3.org/2000/01/rdf-schema#member", source: source },
                            font: { multi: true, size: 10 },

                            //  dashes: true,
                            color: "#8528c9",
                        });
                    }
                });

                visjsGraph.data.edges.add(edges);
            }
            if (callback) {
                return callback(null);
            }
        });
    };

    self.pasteNodesInContainer = function (source, container) {
        common.pasteTextFromClipboard(function (text) {
            // debugger
            if (!text) {
                return MainController.UI.message("no node copied");
            }
            try {
                var nodes = JSON.parse(text);
                var nodesData = [];
                nodes.forEach(function (node) {
                    if (node.data) {
                        nodesData.push(node.data);
                    }
                });

                self.addResourcesToContainer(source, container, nodesData);
            } catch (e) {
                console.log("wrong clipboard content");
            }
            return;
        });
    };

    self.deleteContainer = function (source, container) {
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
    /**
     *
     *
     *
     *
     * @param source
     * @param containerIds
     * @param options
     *  allDescendants
     *  nodes | containers
     *  descendants
     *
     * @param callback
     */
    /*  self.getContainerResources = function(source, containerIds, options, callback) {
      var containers;
      var firstContainer;
      if (!Array.isArray(containerIds)) {
        containers = [containerIds];
        firstContainer = containerIds;
      }
      else {
        containers = containerIds;
        firstContainer = containerIds[0];
      }

      if (options.allDescendants) {
        //  $("#lineage_containers_containersJstree").jstree().open_all()
        var descendantObjs = JstreeWidget.getNodeDescendants("lineage_containers_containersJstree", firstContainer, null);
        var descendantIds = [];
        descendantObjs.forEach(function(item) {
          if (item.data.type == "container") {
            descendantIds.push(item.data.id);
          }
        });
        var containerObj = $("#lineage_containers_containersJstree").jstree().get_node(firstContainer);
        containers = containers.concat(descendantIds);
      }

      var subjects = containers;
      var objects = null;
      var propFilter = "";
      var objectTypeFilter;
      if (options.nodes) {
        objectTypeFilter = "filter(?objectType not in (rdf:Bag,rdf:List))";
      }
      else if (options.containers) {
        objectTypeFilter = "filter(?objectType in (rdf:Bag,rdf:List))";
      }
      else {
        objectTypeFilter = "";
      }

      if (options.descendants) {
        propFilter = "http://www.w3.org/2000/01/rdf-schema#member";
      }
      else if (options.ancestors) {
        var subjects = null;
        var objects = containers;
      }
      else {
        propFilter = "";
      }

      if (false && !propFilter && !objectTypeFilter) {
        return alert("no filter set");
      }

      Sparql_OWL.getFilteredTriples(source, subjects, propFilter, objects, { filter: objectTypeFilter }, function(err, result) {
        return callback(err, result);
      });
    };*/
    self.listContainerResources = function (source, containerNode, options) {
        var existingChildren = [];

        if (containerNode.children.length > 0) return;

        self.sparql_queries.getContainerDescendants(source, containerNode ? containerNode.data.id : null, options, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var existingNodes = {};
            if (containerNode) {
                // existingNodes=$("#lineage_containers_containersJstree").jstree().get_node(containerNode.id).children;
                var jstreeChildren = JstreeWidget.getNodeDescendants("lineage_containers_containersJstree", containerNode.id, 2);
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
                    var type = "class";
                    if (item.memberTypes.value.indexOf("Bag") > -1 || item.memberTypes.value.indexOf("List") > -1) {
                        type = "container";
                    }
                    jstreeData.push({
                        id: item.jstreeId,
                        text: item.memberLabel.value,
                        parent: parent,
                        type: type,
                        data: {
                            type: type,
                            source: source,
                            id: item.member.value,
                            label: item.memberLabel.value,
                        },
                    });
                }
            }

            JstreeWidget.addNodesToJstree("lineage_containers_containersJstree", containerJstreeId, jstreeData);
        });
    };

    self.graphResources = function (source, containerData, options, callback) {
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
                    MainController.UI.message("searching...");
                    self.sparql_queries.getContainerDescendants(source, containerData.id, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = data.concat(result.results.bindings);
                        if (data.length > Lineage_classes.showLimit * 8) {
                            return callbackSeries({ responseText: "too many nodes " + data.length + " cannot draw" });
                        }
                        return callbackSeries();
                    });
                    MainController.UI.message("drawing graph...");
                },

                //get containersStyles
                function (callbackSeries) {
                    return callbackSeries();
                    data.forEach(function (item) {
                        if (item.containerStyle) {
                            if (!stylesMap[item.container.value]) {
                                stylesMap[item.container.value] = { styleId: item.containerStyle.value };
                            }
                        }
                    });
                    var ids = Object.keys(stylesMap);
                    if (ids.length == 0) {
                        return callbackSeries();
                    }
                    Lineage_styles.init();
                    Lineage_styles.listStyles(ids, function (err, styles) {
                        if (err) {
                            return alert(err);
                        }
                        for (var containerId in stylesMap) {
                            var styleId = stylesMap[containerId];
                            var styleObj = styles[styleId];
                            if (styleObj) {
                                styleObj.id = styleId;
                            }
                            stylesMap[containerId] = styleObj;
                        }
                        return callbackSeries();
                    });
                },

                //draw
                function (callbackSeries) {
                    var color = Lineage_classes.getSourceColor(source);
                    var opacity = 1.0;
                    var existingNodes = visjsGraph.getExistingIdsMap();
                    visjsData = { nodes: [], edges: [] };
                    var objectProperties = [];

                    var shape = "dot";
                    var color2 = common.colorToRgba(color, opacity * 0.7);
                    var memberEdgeColor = common.colorToRgba("#8528c9", opacity * 0.7);
                    var size = Lineage_classes.defaultShapeSize;

                    if (!existingNodes[containerData.id]) {
                        existingNodes[containerData.id] = 1;

                        var type = "container";
                        visjsData.nodes.push({
                            id: containerData.id,
                            label: containerData.label,
                            shadow: self.nodeShadow,
                            shape: "box",
                            size: size,
                            font: type == "container" ? { color: "#eee" } : null,
                            color: "#70309f",
                            data: {
                                type: type,
                                source: source,
                                id: containerData.id,
                                label: containerData.label,
                            },
                        });
                    }

                    data.forEach(function (item) {
                        var containerStyle = stylesMap[containerData.id];
                        if (containerStyle) {
                            shape = containerStyle.shape || shape;
                            color2 = containerStyle.color || color2;
                            size = containerStyle.size || colorsize2;
                        }

                        if (!existingNodes[item.parent.value]) {
                            var type = "container";
                            existingNodes[item.parent.value] = 1;
                            visjsData.nodes.push({
                                id: item.parent.value,
                                label: item.parentLabel.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? "box" : shape,
                                size: size,
                                font: type == "container" ? { color: "#eee", size: 10 } : null,
                                color: color2,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.parent.value,
                                    label: item.parentLabel.value,
                                },
                            });
                        }

                        if (!existingNodes[item.member.value]) {
                            var type = "container";
                            if (item.memberTypes.value.indexOf("Bag") < 0) {
                                type = "class";
                            }

                            existingNodes[item.member.value] = 1;
                            visjsData.nodes.push({
                                id: item.member.value,
                                label: item.memberLabel.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? "box" : shape,
                                size: size,
                                font: type == "container" ? { color: "#eee", size: 10 } : null,
                                color: color2,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.member.value,
                                    label: item.memberLabel.value,
                                },
                            });
                        }

                        var edgeId = containerData.id + "_" + "member" + "_" + item.parent.value;
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;

                            visjsData.edges.push({
                                id: edgeId,
                                from: containerData.id,
                                to: item.parent.value,
                                arrows: {
                                    middle: {
                                        enabled: true,
                                        type: Lineage_classes.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                },
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
                                    type: Lineage_classes.defaultEdgeArrowType,
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

                    if (!visjsGraph.isGraphNotEmpty()) {
                        Lineage_classes.drawNewGraph(visjsData);
                    } else {
                        visjsGraph.data.nodes.add(visjsData.nodes);
                        visjsGraph.data.edges.add(visjsData.edges);
                    }
                    visjsGraph.network.fit();
                    $("#waitImg").css("display", "none");
                    if (objectProperties.length > 0) {
                        source = Lineage_sources.activeSource;
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
                MainController.UI.message("", true);
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
            self.listContainerResources(Lineage_sources.activeSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
        }
    };

    self.onMoveContainer = function (data, element, helper, event) {
        var sourceNodeId = element.data.nodes[0];
        var oldParent = self.currenDraggingNodeSourceParent;
        var targetNodeAnchor = element.event.target.id;
        var newParent = targetNodeAnchor.substring(0, targetNodeAnchor.indexOf("_anchor"));

        var graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "with <" +
            graphUri +
            "> delete {<" +
            oldParent +
            "> rdfs:member <" +
            sourceNodeId +
            ">}" +
            "insert {<" +
            newParent +
            "> rdfs:member <" +
            sourceNodeId +
            ">}";

        var url = Config.sources[Lineage_sources.activeSource].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lineage_sources.activeSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
        });
    };

    self.sparql_queries = {
        getContainerDescendants: function (source, containerId, options, callback) {
            var fromStr = Sparql_common.getFromStr(source, false, false);
            var filterContainer0Str = "";
            if (containerId) {
                // needs options.useFilterKeyWord because VALUES dont work
                filterContainer0Str = Sparql_common.setFilter("parent0", containerId, null, { useFilterKeyWord: 1 });
            }

            //  var pathOperator = "+";
            var pathOperator = "+";
            if (options.onlyOneLevel) {
                pathOperator = "";
            }
            var query =
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "SELECT distinct ?member ?memberLabel ?parent ?parentLabel" +
                ' (GROUP_CONCAT( distinct ?memberType;separator=",") as ?memberTypes) ' +
                fromStr +
                " WHERE {\n" +
                "?parent0  rdfs:member" +
                pathOperator +
                " ?member. " +
                filterContainer0Str +
                "  ?member ^rdfs:member ?parent.\n" +
                "?parent0  rdfs:member* ?parent. \n" +
                "  ?member rdf:type ?memberType.\n" +
                "   ?member rdfs:label ?memberLabel.\n" +
                "   ?parent rdfs:label ?parentLabel.\n";
            if (!options.leaves) {
                query += " FILTER (?memberType in(rdf:Bag,rdf:List))";
            }

            if (options.filter) {
                query += options.filter;
            }
            query += "}  group by ?member ?memberLabel ?parent ?parentLabel";

            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
    };

    self.applyContainerstyle = function (containerUrl) {};

    self.graphWhiteboardNodesContainers = function (source, ids, callback) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        var fromStr = Sparql_common.getFromStr(source, false, true);
        if (!ids) {
            ids = visjsGraph.data.nodes.getIds();
        }
        var filter = Sparql_common.setFilter("node", ids);
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct *     " +
            fromStr +
            " WHERE {?container rdfs:member ?node.  ?container rdf:type ?type. filter (?type in(rdf:Bag,rdf:List)).  ?container rdfs:label ?containerLabel " +
            filter +
            "}";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return alert(err);
            }
            var existingNodes = visjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };

            result.results.bindings.forEach(function (item) {
                if (!existingNodes[item.container.value]) {
                    existingNodes[item.container.value] = 1;

                    var color2 = "#00afef";
                    visjsData.nodes.push({
                        id: item.container.value,
                        label: item.containerLabel.value,
                        shadow: self.nodeShadow,
                        shape: "box",
                        size: Lineage_classes.defaultShapeSize,
                        font: { color: "#eee" },
                        color: color2,
                        data: {
                            type: "container",
                            source: Lineage_sources.activeSource,
                            id: item.container.value,
                            label: item.containerLabel.value,
                        },
                    });
                }

                var edgeId = item.container.value + "_" + "member" + "_" + item.node.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.container.value,
                        to: item.node.value,
                        arrows: "middle",
                        data: { from: item.container.value, to: item.node.value, source: source },
                        font: { multi: true, size: 10 },

                        //  dashes: true,
                        color: "#8528c9",
                    });
                }
            });

            visjsGraph.data.nodes.add(visjsData.nodes);
            visjsGraph.data.edges.add(visjsData.edges);

            visjsGraph.network.fit();
            $("#waitImg").css("display", "none");
            if (callback) {
                return callback(null, visjsData);
            }
        });
    };

    return self;
})();

export default Lineage_containers;

window.Lineage_containers = Lineage_containers;
