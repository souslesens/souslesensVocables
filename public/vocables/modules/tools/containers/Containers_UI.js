import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import Lineage_styles from "../lineage/lineage_styles.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import common from "../../shared/common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";

self.lineageVisjsGraph;

var Containers_UI = (function () {
    var self = {};

    self.search = function (memberType, callback) {
        if (!callback) {
            callback = function () {};
        }

        var term = $("#Lineage_containers_searchInput").val();
        var source = Lineage_sources.activeSource;

        var filter = "";
        if (term) {
            filter = Sparql_common.setFilter("searchValue", null, term);
        } else {
            self.sparql_queries.getTopContainers(source, function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (!term && result.results.binding.length == 0) {
                    return callback("no root container found, cannot display containers hierarchy");
                }

                result.results.bindings.forEach(function (item) {
                    rootNodes.push({ id: item.member.value, label: item.memberLabel.value });
                });
                callbackSeries();
            });
        }

        if ($("#lineage_containers_containersJstree").jstree) {
            $("#lineage_containers_containersJstree").empty();
        }
        var options = {};
        options.depth = 1;
        if (self.flag_search == false) {
            if (term != "") {
                options.depth = 5;
            }
            self.drawContainerJstree(source, filter, "lineage_containers_containersJstree", search_on_container, memberType, options, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                callback();
            });
        } else {
            self.flag_search_launch_search = true;
        }
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
        if (!(container.data.type.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag") || container.data.type == "container")) {
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
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },

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

    self.bindMoveNode = function (jstreeDiv) {
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
            self.writeMovedNodeNewParent(movingInfos);
            // console.log(movingInfos)
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
                        if (data.length > Lineage_whiteboard.showLimit * 8) {
                            return callbackSeries({ responseText: "too many nodes " + data.length + " cannot draw" });
                        }
                        return callbackSeries();
                    });
                    MainController.UI.message("drawing graph...");
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
                            shape: Lineage_containers_UI.containerStyle.shape,
                            size: size,
                            font: type == "container" ? { color: "#70309f" } : null,
                            color: Lineage_containers_UI.containerStyle.color,
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
                                shape: type == "container" ? Lineage_containers_UI.containerStyle.shape : shape,
                                size: size,
                                font: type == "container" ? { color: color2, size: 10 } : null,
                                color: Lineage_containers_UI.containerStyle.color,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.parent.value,
                                    label: item.parentLabel.value,
                                },
                            });
                        }

                        if (!existingNodes[item.member.value]) {
                            var color = Lineage_containers_UI.containerStyle.color;
                            var shape = Lineage_containers_UI.containerStyle.shape;
                            var type = "container";
                            if (item.memberTypes.value.indexOf("Bag") < 0) {
                                color = Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource);
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
                                    arrows: {
                                        from: {
                                            enabled: true,
                                            type: Lineage_whiteboard.defaultEdgeArrowType,
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

    self.writeMovedNodeNewParent = function (movedNodeInfos) {
        var graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
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

        var url = Config.sources[Lineage_sources.activeSource].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lineage_sources.activeSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
        });
    };

    self.applyContainerstyle = function (containerUrl) {};

    self.graphWhiteboardNodesContainers = function (source, ids, options, callback) {
        if (!options) {
            options = {};
        }
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        var fromStr = Sparql_common.getFromStr(source, false, true);
        if (!ids) {
            ids = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
        }
        var filter = Sparql_common.setFilter("node", ids);

        if (options.filter) {
            filter += options.filter;
        }

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
            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };

            result.results.bindings.forEach(function (item) {
                if (!existingNodes[item.container.value]) {
                    existingNodes[item.container.value] = 1;

                    var color2 = "#00afef";
                    visjsData.nodes.push({
                        id: item.container.value,
                        label: item.containerLabel.value,
                        shadow: self.nodeShadow,
                        shape: Lineage_containers_UI.containerStyle.shape,
                        size: Lineage_whiteboard.defaultShapeSize,
                        font: { color: color2 },
                        color: Lineage_containers_UI.containerStyle.color,
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
                        /*  arrows: {
                            to: {
                                enabled: true,
                                type: Lineage_whiteboard.defaultEdgeArrowType,
                                scaleFactor: 0.5,
                            },
                        },*/

                        data: { from: item.container.value, to: item.node.value, source: source },
                        //  font: { multi: true, size: 10 },

                        //  dashes: true,
                        color: self.containerEdgeColor,
                    });
                }
            });

            Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);

            Lineage_whiteboard.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");
            if (callback) {
                return callback(null, visjsData);
            }
        });
    };

    self.getContainerTypes = function (source, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source, false, options.withoutImports);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?type ?typeLabel " +
            fromStr +
            "  WHERE {\n" +
            " ?sub rdf:type rdf:Bag  .\n" +
            "  ?sub rdf:type  ?type . filter (!regex(str(?type),'owl') && ?type!='rdf:Bag')\n" +
            "  optional {?type rdfs:label ?typeLabel}" +
            "  }";

        var sparql_url = Config.sources[source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var types = [];
            result.results.bindings.forEach(function (item) {
                var typeLabel = item.typeLabel ? item.typeLabel.value : Sparql_common.getLabelFromURI(item.type.value);
                types.push({ id: item.type.value, label: typeLabel });
            });
            return callback(null, types);
        });
    };
    return self;
})();

export default Containers_UI;

window.Containers_UI = Containers_UI;
