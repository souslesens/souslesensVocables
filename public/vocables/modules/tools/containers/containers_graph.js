import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_decoration from "../lineage/lineage_decoration.js";

var Containers_graph = (function () {
    var self = {};
    self.parentContainersColors = [];
    self.containerStyle = {
        shape: "square",
        color: "#fdac00",
        size: 5,
        edgeColor: "#e7a1be",
        parentContainerColor: "#778dd7",
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
            //  " ?sub rdf:type rdf:Bag  .\n" +
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

    self.graphParentContainers = function (source, ids, options, callback) {
        if (!options) {
            options = {};
        }
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        var fromStr = Sparql_common.getFromStr(source, false, true);

        if (!options.filter) {
            options.filter = "";
        }
        if (!ids && Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            ids = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
            options.filter += Sparql_common.setFilter("child", ids);
        }

        options.depth = 1;
        options.keepChild = true;
        var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        var visjsData = { nodes: [], edges: [] };
        Containers_query.getContainersAscendants(source, ids, options, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var color = common.palette[self.parentContainersColors.length + 3];
            self.parentContainersColors.push(color);

            result.forEach(function (item) {
                if (item.ancestor) {
                    if (!existingNodes[item.ancestor.value]) {
                        existingNodes[item.ancestor.value] = 1;

                        var label = item.ancestorLabel ? item.ancestorLabel.value : Sparql_common.getLabelFromURI(item.ancestor.value);

                        visjsData.nodes.push({
                            id: item.ancestor.value,
                            label: label,
                            shadow: self.nodeShadow,
                            shape: Containers_graph.containerStyle.shape,
                            size: Containers_graph.containerStyle.size,
                            // font: { color: self.containerStyle.color },
                            color: color,
                            data: {
                                type: "Container",
                                source: Lineage_sources.activeSource,
                                id: item.ancestor.value,
                                label: label,
                            },
                        });
                    }
                }
                if (!existingNodes[item.ancestorParent.value]) {
                    existingNodes[item.ancestorParent.value] = 1;

                    var label = item.ancestorParentLabel ? item.ancestorParentLabel.value : Sparql_common.getLabelFromURI(item.ancestorParent.value);

                    visjsData.nodes.push({
                        id: item.ancestorParent.value,
                        label: label,
                        shadow: self.nodeShadow,
                        shape: Containers_graph.containerStyle.shape,
                        size: Containers_graph.containerStyle.size,
                        //  font: { color: self.containerStyle.color },
                        color: color,
                        data: {
                            type: "Container",
                            source: Lineage_sources.activeSource,
                            id: item.ancestorParent.value,
                            label: label,
                        },
                    });
                }
                if (item.ancestor) {
                    var edgeId = item.ancestor.value + "_" + "member" + "_" + item.ancestorParent.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.ancestor.value,
                            to: item.ancestorParent.value,
                            arrows: "to",

                            data: { from: item.ancestor.value, to: item.ancestorParent.value, source: source },
                            font: { multi: true, size: 10 },

                            //  dashes: true,
                            color: Containers_graph.containerStyle.edgeColor,
                        });
                    }
                }
                if (item.child) {
                    var edgeId = item.ancestorParent.value + "_" + "member" + "_" + item.child.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.ancestorParent.value,
                            to: item.child.value,
                            arrows: "to",

                            data: { from: item.ancestorParent.value, to: item.child.value, source: source },
                            font: { multi: true, size: 10 },

                            //  dashes: true,
                            color: Containers_graph.containerStyle.edgeColor,
                        });
                    }
                }
            });

            if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                Lineage_whiteboard.drawNewGraph(visjsData);
            }

            Lineage_whiteboard.addVisDataToGraph(visjsData);

            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");
            if (callback) {
                return callback(null, visjsData);
            }
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
                            font: type == "container" ? { color: "#70309f" } : { color: "black" },
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
                        if (!existingNodes[item.member.value]) {
                            var color = Containers_graph.containerStyle.color;
                            var shape = Containers_graph.containerStyle.shape;
                            var type = "container";
                            if (!item.subMember) {
                                //when it is a leaf
                                color = Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource);
                                if (item.memberTypes.value.indexOf("Individual") > -1) {
                                    type = "individual";
                                    shape = "triangle";
                                }
                                if (item.memberTypes.value.indexOf("Class") > -1) {
                                    type = "Class";
                                    shape = Lineage_whiteboard.defaultShape;
                                    shape = "dot";
                                }
                            }

                            var label = item.memberLabel ? item.memberLabel.value : Sparql_common.getLabelFromURI(item.member);
                            existingNodes[item.member.value] = 1;
                            visjsData.nodes.push({
                                id: item.member.value,
                                label: label,
                                shadow: self.nodeShadow,
                                shape: shape,
                                size: size,
                                font: type == "container" ? { color: "#70309f" } : null,
                                color: color,

                                data: {
                                    type: type,
                                    source: source,
                                    id: item.member.value,
                                    // label: item.memberLabel.value,
                                    label: label,
                                },
                            });
                        }

                        if (item.member.value != item.parent.value) {
                            var edgeId = item.parent.value + "_" + "member" + "_" + item.member.value;

                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;
                                var type = "container";
                                if (!item.subMember) {
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
                                    color: self.containerStyle.edgeColor,
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

                    //    setNodesLevel(visjsData);

                    if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        Lineage_whiteboard.drawNewGraph(visjsData, null, { noDecorations: 0 });
                        //Lineage_whiteboard.drawNewGraph(visjsData, null);
                    } else {
                        Lineage_whiteboard.addVisDataToGraph(visjsData);

                        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
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
                // Apply decoration by upper class
                function (callbackSeries) {
                    if (visjsData.nodes.length > 0) {
                        Lineage_decoration.decorateByUpperOntologyByClass(visjsData.nodes);
                        callbackSeries();
                    } else {
                        callbackSeries();
                    }
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
            },
        );
    };

    return self;
})();

export default Containers_graph;
window.Container_graph = Containers_graph;
