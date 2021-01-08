var Lineage_classes = (function () {
        var self = {}
        var expandedLevels = {};
        var sourceColors = {}
        var orphanShape = "square";
        var defaultShape = "dot";
        var defaultShapeSize = 5;
        var objectPropertyColor = "#aaa"


        var maxChildrenDrawn = 15
        self.currentSource;


        self.onSourceSelect = function (sourceLabel) {
            MainController.UI.message("");
            $("#accordion").accordion("option", {active: 2});

            ThesaurusBrowser.showThesaurusTopConcepts(sourceLabel)
            $("#actionDivContolPanelDiv").load("snippets/lineage.html")

            setTimeout(function () {
                var sourceLabels = Object.keys(Config.sources).sort();
                common.fillSelectOptions("Lineage_toSource", sourceLabels, true)
                $("#Lineage_Tabs").tabs({
                    activate: function (e, ui) {
                        var divId = ui.newPanel.selector;
                        if (divId == "#LineageTypesTab") {
                            Lineage_types.init()
                        } else if (divId == "#LineagePropertiesTab") {
                            Lineage_properties.init()
                        }
                    }

                });

                Lineage_classes.drawTopConcepts(sourceLabel)


            }, 200)

        }

        self.selectNodeFn = function (event, propertiesMap) {
            var data = propertiesMap.node.data;
            self.addArbitraryNodeToGraph(data)
        }

        self.drawTopConcepts = function (source) {
            MainController.UI.message("")
            visjsGraph.clearGraph()
            if (!source)
                source = MainController.currentSource
            self.currentSource = source
            expandedLevels = {}
            expandedLevels[source] = [];
            $("#lineage_drawnSources").html("");
            self.addSourceToList(source)

            $("#Lineage_toSource").val("")

            var depth = parseInt($("#Lineage_topDepth").val())
            Sparql_generic.getTopConcepts(source, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }
                var ids = []
                result.forEach(function (item) {
                    ids.push(item.topConcept.value)
                })
                expandedLevels[source].push(ids);
                var color = self.getSourceColor(source)
                var shape = defaultShape
                var visjsData = GraphController.toVisjsData(null, result, null, "#", "topConcept",
                    {
                        from: {
                            shape: "box",
                            color: color,
                            size: defaultShapeSize
                        },
                        to: {
                            shape: shape,
                            color: color,
                            size: defaultShapeSize
                        },
                        data: {source: MainController.currentSource},
                        rootLabel: source,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "arrow",
                                scaleFactor: 0.5
                            },
                        },
                    })

                var options = {
                    /*   nodes: {
                           shape: "box",
                           color: "#ddd"
                       },*/
                    onclickFn: Lineage_classes.graphActions.onNodeClick,
                    onRightClickFn: Lineage_classes.graphActions.showGraphPopupMenu,
                    "physics": {
                        "barnesHut": {
                            "springLength": 0,
                            "damping": 0.15
                        },
                        "minVelocity": 0.75
                    }
                    //   layoutHierarchical: {direction: "LR", sortMethod: "directed"}

                }


                visjsGraph.draw("graphDiv", visjsData, options)
                $("#waitImg").css("display", "none");


            })

        }


        self.getGraphIdsFromSource = function (source) {

            var existingNodes = visjsGraph.data.nodes.get();
            var sourceNodes = []
            existingNodes.forEach(function (item) {
                if (item.id != "#" && item.data && item.data.source == source) {
                    sourceNodes.push(item.data.id || item.id)
                }
            })
            return sourceNodes;
        }


        self.addSourceChildrenToGraph = function () {
            var source = self.currentSource;
            if (source == "")
                return alert("select a source");
            var sourceNodes = self.getGraphIdsFromSource(source)
            self.addChildrenToGraph(sourceNodes, source)

        }

        self.addChildrenToGraph = function (nodeIds, source) {
            var parentIds
            if (!source) {
                source = self.currentSource;
            }
            if (nodeIds) {
                parentIds = nodeIds
            } else {
                parentIds = expandedLevels[source][expandedLevels[source].length - 1];
            }
            MainController.UI.message("")
            Sparql_generic.getNodeChildren(source, null, parentIds, 1, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var map = [];
                var ids = [];

                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }

                result.forEach(function (item) {
                    if (!map[item.concept.value])
                        map[item.concept.value] = []
                    map[item.concept.value].push(item)
                    ids.push(item.child1.value)
                })


                var color = self.getSourceColor(source)
                var existingNodes = visjsGraph.getExistingIdsMap();
                var visjsData = {nodes: [], edges: []}

                var expandedLevel = []
                for (var key in map) {


                    if (map[key].length > maxChildrenDrawn) {
                        //on enleve les cluster du dernier bootomIds dsiono on cree des orphelins au niveau suivant

                        var nodeId = key + "_cluster"
                        if (!existingNodes[nodeId]) {
                            existingNodes[nodeId] = 1
                            visjsData.nodes.push({
                                id: key + "_cluster",
                                label: map[key].length + "children",
                                shape: "star",
                                size: defaultShapeSize,
                                value: map[key].length,
                                color: color,
                                data: {cluster: map[key], source: source, parent: key}
                            })
                        }
                        var edgeId = key + "_" + key + "_cluster"
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: key,
                                to: key + "_cluster",
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "arrow",
                                        scaleFactor: 0.5
                                    },
                                },
                            })
                        }


                    } else {
                        map[key].forEach(function (item) {
                            expandedLevel.push(item.child1.value)
                        })

                        var visjsData2 = GraphController.toVisjsData(null, map[key], key, "concept", "child1", {
                            from: {
                                shape: defaultShape,
                                size: defaultShapeSize,
                                color: color
                            },
                            to: {
                                shape: defaultShape,
                                size: defaultShapeSize,
                                color: color
                            },
                            data: {source: MainController.currentSource},
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "arrow",
                                    scaleFactor: 0.5
                                },
                            },

                        })


                        visjsData.nodes = visjsData.nodes.concat(visjsData2.nodes)
                        visjsData.edges = visjsData.edges.concat(visjsData2.edges)


                    }

                }

                expandedLevels[source].push(expandedLevel)
                visjsData.nodes = common.removeDuplicatesFromArray(visjsData.nodes, "id")
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)


// on cherche les parents qui n'ont pas trouvé d'enfant (I.E concept de SPARQL.getChildren
                if (false) {
                    var keys = Object.keys(map)
                    var orphans = []
                    parentIds.forEach(function (parentId) {
                        if (keys.indexOf(parentId) < 0)
                            orphans.push({id: parentId, shape: "text"})
                    })
                    visjsGraph.data.nodes.update(orphans)
                }


                $("#waitImg").css("display", "none");


            })
        }

        self.openCluster = function (cluster) {
            MainController.UI.message("")
            var color = self.getSourceColor(cluster.data.source)
            var visjsData = GraphController.toVisjsData(null, cluster.data.cluster, cluster.data.parent, "concept", "child1", {
                from: {
                    shape: defaultShape,
                    size: defaultShapeSize,
                    color: color
                },
                to: {
                    shape: defaultShape,
                    size: defaultShapeSize,
                    color: color
                },
                data: {source: cluster.data.source}
            })

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)
            visjsGraph.data.nodes.remove(cluster.id)
            $("#waitImg").css("display", "none");
            MainController.UI.message("")


        }

        self.drawSimilarsNodes = function (node, sources) {
            MainController.UI.message("")
            $("#Lineage_toSource").val("")

            var similars = [];
            if (!sources)
                sources = common.getAllsourcesWithType("OWL")
            if (!Array.isArray(sources))
                sources = [sources]

            var words = []
            var wordsMap = {}
            if (!node) {
                if (!sources)
                    return alert("select a source")

                var nodeObjs = visjsGraph.data.nodes.get()
                nodeObjs.forEach(function (item) {
                    if (item.label && item.label.toLowerCase) {
                        words.push(item.label)
                        wordsMap[item.label.toLowerCase()] = item.id
                    }
                })
            } else {
                words = [node.label]

            }

            var wordSlices = common.sliceArray(words, Sparql_generic.slicesSize);

            async.eachSeries(sources, function (source, callbackEachSource) {

                async.eachSeries(wordSlices, function (words, callbackEachSlice) {
                    var filter = Sparql_common.setFilter("concept", null, words, {exactMatch: true})
                    var options = {filter: filter}
                    Sparql_generic.getItems(source, options, function (err, result) {
                        if (err) {
                            return callbackEachSlice(err);
                        }

                        var ids = []
                        result.forEach(function (item) {
                            similars.push({
                                id: item.concept.value,
                                label: item.conceptLabel.value,
                                source: source
                            });
                            ids.push(item.concept.value)
                        })

                        if (!expandedLevels[source]) {
                            expandedLevels[source] = []
                            self.addSourceToList(source)


                        }
                        expandedLevels[source].push(ids)


                        callbackEachSlice();
                    })
                }, function (err) {
                    callbackEachSource(err)
                })
            }, function (err) {
                if (err)
                    return MainController.UI.message(err);
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                if (similars.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }
                similars.forEach(function (item) {
                    if (!existingNodes[item.id]) {
                        existingNodes[item.id] = 1
                        var color = self.getSourceColor(item.source)
                        visjsData.nodes.push({
                            id: item.id,
                            label: item.label,
                            color: color,
                            shape: "dot",
                            size: defaultShapeSize,
                            data: item
                        })
                        visjsData.edges.push({
                            from: wordsMap[item.label.toLowerCase()],
                            to: item.id,
                            color: color,
                            //   label: item.source,
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "curve",
                                },
                            },
                        })
                    }
                })


                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                $("#waitImg").css("display", "none");


            })


        }


        self.drawObjectProperties = function (classIds) {
            var source = self.currentSource
            if (!source)
                return alert("select a source");
            if (!classIds) {
                classIds = self.getGraphIdsFromSource(source)

            }
            MainController.UI.message("")
            OwlSchema.initSourceSchema(source, function (err, schema) {
                if (err)
                    return MainController.UI.message(err)
                Sparql_schema.getClassPropertiesAndRanges(schema, classIds, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");
                        return MainController.UI.message("No data found")

                    }
                    var visjsData = {nodes: [], edges: []}
                    var existingNodes = visjsGraph.getExistingIdsMap()
                    var color = self.getSourceColor(source)
                    result.forEach(function (item) {
                        if (false && classIds.indexOf(item.classId.value) < 0)
                            return;
                        if (!item.range) {
                            item.range = {value: "?_" + item.property.value}
                            item.rangeLabel = {value: "?"}
                        }
                        if (!existingNodes[item.range.value]) {
                            existingNodes[item.range.value] = 1;
                            visjsData.nodes.push({
                                id: item.range.value,
                                label: item.rangeLabel.value,
                                shape: defaultShape,
                                size: defaultShapeSize,
                                color: color,
                                data: {source: source}
                            })

                        }
                        var edgeId = item.classId.value + "_" + item.range.value
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1

                            visjsData.edges.push({
                                id: edgeId,
                                from: item.classId.value,
                                to: item.range.value,
                                label: "<i>" + item.propertyLabel.value + "</i>",
                                data: {propertyId: item.property.value},
                                font: {multi: true, size: 10},
                                // font: {align: "middle", ital: {color:objectPropertyColor, mod: "italic", size: 10}},
                                //   physics:false,
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "bar",
                                        scaleFactor: 0.5
                                    },
                                },
                                dashes: true,
                                color: objectPropertyColor

                            })
                        }

                    })

                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    $("#waitImg").css("display", "none");

                })
            })
        }

        self.addParentsToGraph = function (nodeIds) {

            var source = self.currentSource;

            var chilIds;
            if (nodeIds) {
                chilIds = nodeIds
            } else {
                chilIds = expandedLevels[source][0];
            }
            MainController.UI.message("")
            Sparql_generic.getNodeParents(source, null, chilIds, 1, {exactMatch: 1}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var map = [];
                var ids = [];

                if (result.length == 0) {


                    /*     var existingNodes=visjsGraph.getExistingIdsMap()
                         var visjsData={nodes:[],edges:[]}

                         if(!existingNodes[source]) {
                             existingNodes[source]=1

                             var color = self.getSourceColor(source)
                             visjsData.nodes.push({
                                 id: source,
                                 label: source,
                                 shape: "box",
                                 color: color,
                                 size: defaultShapeSize
                             })
                         }
                         chilIds.forEach(function(childId) {
                             var edgeId = childId + "_" + source;
                             if (!existingNodes[edgeId]) {
                                 existingNodes[edgeId] = 1
                                 visjsData.edges.push({
                                     id: edgeId,
                                     from: childId,
                                     to: source,

                                     data: {source: MainController.currentSource},

                                     arrows: {
                                         from: {
                                             enabled: true,
                                             type: "arrow",
                                             scaleFactor: 0.5
                                         },
                                     },
                                 })
                             }
                         })


                         visjsGraph.data.nodes.add(visjsData.nodes)
                         visjsGraph.data.edges.add(visjsData.edges)*/
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }

                var color = self.getSourceColor(source)
                var visjsData = GraphController.toVisjsData(null, result, null, "concept", "broader1", {
                    from: {
                        shape: defaultShape,
                        size: defaultShapeSize,
                        color: color
                    },
                    to: {
                        shape: defaultShape,
                        size: defaultShapeSize,
                        color: color
                    },
                    data: {source: MainController.currentSource},
                    arrows: {
                        from: {
                            enabled: true,
                            type: "arrow",
                            scaleFactor: 0.5
                        },
                    },

                })


                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)

            })

        }


        self.removeLastChildrenFromGraph = function (nodeId) {


            if (nodeId) {
                var children = visjsGraph.network.getConnectedNodes(nodeId, "to");
                visjsGraph.data.nodes.remove(children)


            } else {
                var source = self.currentSource;
                if (expandedLevels[source].length > 0)
                    visjsGraph.data.nodes.remove(expandedLevels[source][expandedLevels[source].length - 1])
                expandedLevels[source].splice(expandedLevels[source].length - 1, 1)
            }

        }

        self.setGraphPopupMenus = function (node) {
            if (!node)
                return;

            var html = "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawChildren();\"> draw children</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawSimilars();\"> draw similars</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.hideChildren();\">hide children</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showNodeInfos();\">show node infos</span>"


            if (node.id.indexOf("_cluster") > 0) {
                var html = "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.openCluster();\"> open cluster</span>"
            }
            $("#graphPopupDiv").html(html);

        }
        self.zoomGraphOnNode = function (nodeId) {


            var nodes = visjsGraph.data.nodes.getIds();
            if (nodes.indexOf(nodeId) < 0)
                return;
            visjsGraph.network.focus(nodeId, {
                scale: 1,
                locked: false,
                animation: true
            })


            var newNodes = []
            var nodes = visjsGraph.data.nodes.get();
            nodes.forEach(function (node) {
                if (!node.data)
                    return;
                if (!node.data.initialParams) {
                    node.data.initialParams = {
                        shape: node.shape,
                        size: node.size,
                    }
                }
                var size, shape;
                var font = {color: "black"}
                if (node.id == nodeId) {
                    size = node.data.initialParams.size * 2
                    shape = "hexagon"
                    font = {color: "red"}
                } else {
                    size = node.data.initialParams.size;
                    shape = node.data.initialParams.shape;
                }
                newNodes.push({id: node.id, size: size, shape: shape, font: font})
                //  newNodes.push({id: id, opacity:opacity})
            })
            visjsGraph.data.nodes.update(newNodes)
        }

        self.addArbitraryNodeToGraph = function (nodeData) {
            var existingNodes = visjsGraph.getExistingIdsMap()
            if (existingNodes[nodeData.id])
                return self.zoomGraphOnNode(nodeData.id)

            MainController.UI.message("")
            var ancestorsDepth = 7
            Sparql_generic.getNodeParents(nodeData.source, null, nodeData.id, ancestorsDepth, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var map = [];
                var ids = [];

                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")
                }


                var visjsData = {nodes: [], edges: []}
                var color = self.getSourceColor(nodeData.source)
                var nodesToDraw = []
                var newNodeIds = []
                result.forEach(function (item) {
                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1
                        visjsData.nodes.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            data: nodeData,
                            shape: defaultShape,
                            color: color,
                            size: defaultShapeSize
                        })
                    }
                    newNodeIds.push(item.concept.value)

                    var edgeId
                    for (var i = 1; i < ancestorsDepth; i++) {
                        if (!existingNodes[item["broader" + i].value]) {
                            existingNodes[item["broader" + i].value] = 1
                            visjsData.nodes.push({
                                id: item["broader" + i].value,
                                label: item["broader" + i + "Label"].value,
                                data: {source: nodeData.source, label: item["broader" + i + "Label"].value, id: item["broader" + i].value},
                                shape: defaultShape,
                                color: color,
                                size: defaultShapeSize
                            })
                            newNodeIds.push(item["broader" + i].value)
                            var fromId;
                            if (i == i)
                                fromId = item.concept.value
                            else
                                fromId = item["broader" + (i - 1)].value

                            edgeId = fromId + "_" + item["broader" + i].value;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: fromId,
                                    to: item["broader" + i].value,
                                    data: {source: nodeData.source},
                                    arrows: {
                                        from: {
                                            enabled: true,
                                            type: "arrow",
                                            scaleFactor: 0.5
                                        },
                                    },
                                })
                            }
                        } else {  //join an existing node
                            if (i == 1)
                                fromId = item.concept.value
                            else
                                fromId = item["broader" + (i - 1)].value

                            edgeId = fromId + "_" + item["broader" + i].value
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: fromId,
                                    to: item["broader" + i].value,
                                    data: {source: nodeData.source},
                                    arrows: {
                                        from: {
                                            enabled: true,
                                            type: "arrow",
                                            scaleFactor: 0.5
                                        },
                                    },
                                })
                            }
                            break;
                        }
                    }
                })


                expandedLevels[nodeData.source][expandedLevels[nodeData.source].length - 1].push(newNodeIds);

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                setTimeout(function () {
                    self.zoomGraphOnNode(nodeData.id)
                }, 500)
                $("#waitImg").css("display", "none");
                return MainController.UI.message("No data found")
            })
        }

        self.drawCfihosQuantumMapping = function (node, sources) {

            MainController.UI.message("")
            $("#Lineage_toSource").val("")

            var similars = [];
            if (!sources)
                sources = common.getAllsourcesWithType("OWL")
            if (!Array.isArray(sources))
                sources = [sources]


            var words = []
            var wordsMap = {}
            var sourceIds = []
            if (!node) {


                var nodeObjs = visjsGraph.data.nodes.get()
                nodeObjs.forEach(function (item) {
                    sourceIds.push(item.id)//.replace("vocab#",""));
                    if (item.label && item.label.toLowerCase) {
                        words.push(item.label)
                        wordsMap[item.label.toLowerCase()] = item.id

                    }
                })
            } else {
                words = [node.label]
                sourceIds.push(node.id)//.replace("vocab#",""));
            }

            var wordSlices = common.sliceArray(words, Sparql_generic.slicesSize);

            async.eachSeries(sources, function (source, callbackEachSource) {

                async.eachSeries(wordSlices, function (words, callbackEachSlice) {
                    var filter = Sparql_common.setFilter("concept", null, words, {exactMatch: true})
                    var options = {filter: filter, graphUri: ["http://data.total.com/resource/quantum/mappings/"]}
                    Sparql_generic.getItems(source, options, function (err, result) {
                        if (err) {
                            return callbackEachSlice(err);
                        }

                        var ids = []
                        result.forEach(function (item) {
                            similars.push({
                                id: item.concept.value,
                                label: item.conceptLabel.value,
                                source: source
                            });
                            ids.push(item.concept.value)
                        })

                        if (!expandedLevels[source]) {
                            expandedLevels[source] = []
                            self.addSourceToList(source)


                        }
                        expandedLevels[source].push(ids)


                        callbackEachSlice();
                    })
                }, function (err) {
                    callbackEachSource(err)
                })
            }, function (err) {
                if (err)
                    return MainController.UI.message(err);
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                if (similars.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }
                similars.forEach(function (item) {
                    if (!existingNodes[item.id]) {
                        existingNodes[item.id] = 1
                        var color = self.getSourceColor(item.source)
                        visjsData.nodes.push({
                            id: item.id,
                            label: item.label,
                            color: color,
                            shape: "dot",
                            size: defaultShapeSize,
                            data: item
                        })
                        visjsData.edges.push({
                            from: wordsMap[item.label.toLowerCase()],
                            to: item.id,
                            color: color,
                            width: 3,
                            //   label: item.source,
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "curve",
                                },
                            },
                        })
                    }
                })


                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                $("#waitImg").css("display", "none");


            })


        }


        self.graphActions = {

            showGraphPopupMenu: function (node, point, event) {
                self.setGraphPopupMenus(node)
                self.currentGraphNode = node;
                MainController.UI.showPopup(point, "graphPopupDiv")

            },

            onNodeClick: function (node, point, options) {
                return MainController.UI.hidePopup("graphPopupDiv")

            },
            drawChildren: function () {

                Lineage_classes.addChildrenToGraph([self.currentGraphNode.id], self.currentGraphNode.data.source)
            },

            drawSimilars: function () {
                Lineage_classes.drawSimilarsNodes(self.currentGraphNode)
            },
            hideChildren: function () {
                Lineage_classes.removeLastChildrenFromGraph(self.currentGraphNode.id)
            }
            , openCluster: function () {
                Lineage_classes.openCluster(self.currentGraphNode)

            },
            showNodeInfos: function () {
                MainController.UI.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv")
            }
        }

        self.getSourceColor = function (source,palette) {
            if(!palette)
                palette="paletteIntense"
            if (!sourceColors[source])
                sourceColors[source] = common[palette][Object.keys(sourceColors).length]
            return sourceColors[source];
        }


        self.addSourceToList = function (source) {
            var id = "Lineage_source_" + encodeURIComponent(source)
            var html = "<div  id='" + id + "' style='color: " + self.getSourceColor(source) + "'" +
                " class='Lineage_sourceLabelDiv' " +
                "onclick='Lineage_classes.setCurrentSource(\"" + encodeURIComponent(source) + "\")'>" + source + "</div>"
            $("#lineage_drawnSources").append(html)
            self.setCurrentSource(encodeURIComponent(source))

        }
        self.setCurrentSource = function (sourceId) {

            $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv")
            $("#Lineage_source_" + sourceId).addClass("Lineage_selectedSourceDiv")
            Lineage_classes.currentSource = encodeURIComponent(sourceId)


        }
        self.drawGraph = function (typeId) {


        }

        return self;


    }
)()

Lineage_properties = (function () {
    var self = {}
    sourceColors={}
    self.propertyDefaultShape = "box";
    self.classDefaultShape = "ellipse";
    self.init = function () {
        self.graphInited = false
        self.currentSource = MainController.currentSource
        OwlSchema.initSourceSchema(self.currentSource, function (err, schema) {
            if (err)
                return MainController.UI.message(err);
            Sparql_schema.getPropertiesRangeAndDomain(schema, null, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var propertiesTypes = {
                    orphans: [],
                    rangeOnly: [],
                    domainOnly: [],
                    rangeAndDomain: [],
                }
                self.properties = {};

                result.forEach(function (item) {
                    if (!self.properties[item.property.value]) {
                        var obj = {
                            id: item.property.value,
                            label: item.propertyLabel.value,
                            subProperties: []

                        }
                        if (item.range) {
                            obj.range = item.range.value
                            obj.rangeLabel = item.rangeLabel.value
                        }
                        if (item.label) {
                            obj.label = item.label.value
                            obj.labelLabel = item.labelLabel.value
                        }
                        self.properties[item.property.value] = obj
                    }
                    if (item.subProperty) {
                        self.properties[item.property.value].subProperties.push({id: item.subProperty.value, label: item.subPropertyLabel.value})
                    }


                })

                var jsTreeData = []
                for (var key in self.properties) {
                    jsTreeData.push({
                        parent: "#",
                        id: key,
                        text: self.properties[key].label,
                        data: self.properties[key]
                    })
                    self.properties[key].subProperties.forEach(function (item) {
                        jsTreeData.push({
                            parent: key,
                            id: item.id,
                            text: item.label,
                            data: self.properties[key]
                        })
                    })

                }

                var options = {selectNodeFn: Lineage_properties.onTreeNodeClick}
                common.loadJsTree("Lineage_propertiesTree", jsTreeData, options);


                // common.fillSelectOptions("LineageProperties_properties_Select", propertiesTypes.rangeAndDomain, true, "propertyLabel", "property")


            })
        })
        self.showPropInfos = function (event, obj) {
            var id = obj.node.id
            var html = JSON.stringify(self.properties[id])
            $("#graphDiv").html(html)
        }
    }

    self.onTreeNodeClick=function(event,obj){
        self.drawGraph(obj.node.id)
    }

    self.drawGraph = function (propertyId) {

        OwlSchema.initSourceSchema(self.currentSource, function (err, schema) {
            if (err)
                return MainController.UI.message(err);
            //  var options={filter:"Filter (NOT EXISTS{?property rdfs:subPropertyOf ?x})"}
            var options = {}

            Sparql_schema.getPropertiesRangeAndDomain(schema, propertyId, options, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var visjsData = {nodes: [], edges: []}
                var existingNodes = {}
                if (self.graphInited)
                    existingNodes = visjsGraph.getExistingIdsMap()
                var color = Lineage_classes.getSourceColor(self.currentSource,"palette")

                result.forEach(function (item) {


                    if (!existingNodes[item.property.value]) {
                        existingNodes[item.property.value] = 1
                        visjsData.nodes.push({
                            id: item.property.value,
                            label: item.propertyLabel.value,
                            data:  {
                                id: item.property.value,
                                label: item.propertyLabel.value,
                                subProperties: [],
                                source:self.currentSource

                            },
                            color: color,
                            shape: self.propertyDefaultShape
                        })
                    }
                    if (item.range) {
                        if (!existingNodes[item.range.value]) {
                            var shape = "text"
                            if (item.rangeType) {
                                if (item.rangeType.value.indexOf("Class") > -1)
                                    shape = self.classDefaultShape
                                if (item.rangeType.value.indexOf("property") > -1)
                                    shape = self.propertyDefaultShape
                            }
                            existingNodes[item.range.value] = 1

                            visjsData.nodes.push({
                                id: item.range.value,
                                label: item.rangeLabel.value,
                                data:   {
                                    id: item.range.value,
                                    label: item.rangeLabel.value,
                                    source:self.currentSource

                                },
                                color: color,
                                shape: shape
                            })
                        }
                        var edgeId = item.property.value + "_" + item.range.value
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.property.value,
                                to: item.range.value,
                                label: "range"
                            })
                        }

                    }
                    if (item.domain) {
                        if (!existingNodes[item.domain.value]) {
                            existingNodes[item.domain.value] = 1
                            var shape = "text"
                            if (item.domainType) {
                                if (item.domainType.value.indexOf("Class") > -1)
                                    shape = self.classDefaultShape
                                if (item.domainType.value.indexOf("property") > -1)
                                    shape = self.propertyDefaultShape
                            }

                            visjsData.nodes.push({
                                id: item.domain.value,
                                label: item.domain.value,
                                data:   {
                                    id: item.domain.value,
                                    label: item.domain.value,
                                    source:self.currentSource

                                },
                                color: color,
                                shape: shape
                            })
                        }
                        var edgeId = item.property.value + "_" + item.domain.value
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.domain.value,
                                to: item.domain.value,
                                label: "domain"
                            })
                        }

                    }
                    if (item.range) {
                        if (!existingNodes[item.range.value]) {
                            var shape = "text"
                            if (item.rangeType) {
                                if (item.rangeType.value.indexOf("Class") > -1)
                                    shape = self.classDefaultShape
                                if (item.rangeType.value.indexOf("property") > -1)
                                    shape = self.propertiesDefaultShape
                            }
                            existingNodes[item.range.value] = 1

                            visjsData.nodes.push({
                                id: item.range.value,
                                label: item.rangeLabel.value,
                                data:   {
                                    id: item.range.value,
                                    label: item.rangeLabel.value,
                                    source:self.currentSource

                                },
                                color: color,
                                shape: shape
                            })
                        }
                        var edgeId = item.property.value + "_" + item.range.value
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.property.value,
                                to: item.range.value,
                                label: "range"
                            })
                        }

                    }



                })

                result.forEach(function (item) {
                    if (item.subProperty) {
                        if (!existingNodes[item.subProperty.value]) {

                            existingNodes[item.subProperty.value] = 1

                            visjsData.nodes.push({
                                id: item.subProperty.value,
                                label: item.subPropertyLabel.value,
                                data: {
                                    id: item.subProperty.value,
                                    label: item.subProperty.value,
                                    source: self.currentSource

                                },
                                color: color,
                                shape: "star"
                            })
                        }
                        var edgeId = item.property.value + "_" + item.subProperty.value
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.property.value,
                                to: item.subProperty.value,
                                label: "subProperty"
                            })
                        }
                    }
                })

                if (!self.graphInited) {
                    var options = {
                      onclickFn: Lineage_properties.graphActions.onNodeClick,
                        onRightClickFn: Lineage_properties.graphActions.showGraphPopupMenu,
                    }
                    visjsGraph.draw("graphDiv", visjsData,options)
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                }

                self.graphInited
                /*  var html = JSON.stringify(self.properties[propertyId], null, 2)
                  $("#LineageProperties_propertyInfosDiv").html(html);*/
            })
        })
    }
    self.graphActions = {

        showGraphPopupMenu: function (node, point, event) {

            self.setGraphPopupMenus(node)
            self.currentGraphNode = node;
            MainController.UI.showPopup(point, "graphPopupDiv")

        },
        onNodeClick: function (node, point, event) {
            self.currentGraphNode=node
        },
        showNodeInfos: function () {
            MainController.UI.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv")
        }

    }
    self.setGraphPopupMenus = function (node) {
        if (!node)
            return;

        var html =   "    <span  class=\"popupMenuItem\"onclick=\"Lineage_properties.graphActions.showNodeInfos();\">show node infos</span>"

        $("#graphPopupDiv").html(html);

    }


    return self;

})()


Lineage_types = (function () {
    var self = {}

    self.init = function () {
        self.currentSource = MainController.currentSource
        Sparql_schema.getAllTypes(self.currentSource, function (err, result) {
            if (err)
                return MainController.UI.message(err)

            common.fillSelectOptions("LineageTypes_typesSelect", result, true, "typeLabel", "type")

        })

    }


    return self;

})()
