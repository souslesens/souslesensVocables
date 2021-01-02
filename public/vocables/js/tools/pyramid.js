var Pyramid = (function () {
        var self = {}
        var expandedLevels = {};
        var sourceColors = {}
        var orphanShape = "square";
        var defaultShape = "dot";
        var defaultShapeSize = 7;


        var maxChildrenDrawn = 15
        self.currentSource;


        self.onSourceSelect = function (sourceLabel) {


            ThesaurusBrowser.showThesaurusTopConcepts(sourceLabel)
            $("#actionDivContolPanelDiv").load("snippets/pyramid.html")

            setTimeout(function () {
                var sourceLabels = Object.keys(Config.sources).sort();
                common.fillSelectOptions("Pyramid_toSource", sourceLabels, true)
                $("#Pyramid_toSource").val(sourceLabel)

                Pyramid.drawTopConcepts(sourceLabel)

                self.addSourceToList(sourceLabel)


            }, 200)

        }

        self.drawTopConcepts = function (source) {
            visjsGraph.clearGraph()
            if (!source)
                source = MainController.currentSource
            self.currentSource = source
            expandedLevels = {}
            expandedLevels[source] = [];
            $("#pyramid_drawnSources").html("");

            var depth = parseInt($("#Pyramid_topDepth").val())
            Sparql_generic.getTopConcepts(source, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                if (result.length == 0)
                    return MainController.UI.message("No data found")
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
                            shape: "ellipse",
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
                    })

                var options = {
                    /*   nodes: {
                           shape: "box",
                           color: "#ddd"
                       },*/
                    onclickFn: Pyramid.graphActions.onNodeClick,
                    onRightClickFn: Pyramid.graphActions.showGraphPopupMenu,
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

            Sparql_generic.getNodeChildren(source, null, parentIds, 1, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var map = [];
                var ids = [];

                if (result.length == 0)
                    return MainController.UI.message("No data found")

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
                {
                    var keys = Object.keys(map)
                    var orphans = []
                    parentIds.forEach(function (parentId) {
                        if (keys.indexOf(parentId) < 0)
                            orphans.push({id: parentId, size: 3})
                    })
                    visjsGraph.data.nodes.update(orphans)
                }


                $("#waitImg").css("display", "none");


            })
        }

        self.openCluster = function (cluster) {
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


        }

        self.drawSimilarsNodes = function (node, sources) {

            var sourceSchematype = Config.sources[MainController.currentSource].schemaType;
            var similars = [];
            /* if (!sources)
                 sources = Object.keys(Config.sources)*/


            var words = []
            var wordsMap = {}
            if (!node) {
                if (!sources)
                    return alert("select a source")
                sources
                var nodeObjs = visjsGraph.data.nodes.get()
                nodeObjs.forEach(function (item) {
                    words.push(item.label)
                    wordsMap[item.label.toLowerCase()] = item.id
                })
            } else {
                words = [node.label]
                sources = Object.keys(Config.sources)
            }

            var filter = Sparql_common.setFilter("concept", null, words, {exactMatch: true})
            var options = {filter: filter}

            //   var options = {filter: "filter (  regex(?conceptLabel,'^" + node.label + "$','i'))"}

            async.eachSeries(sources, function (source, callbackEach) {
                if (source == MainController.currentSource)
                    return callbackEach();
                if (sourceSchematype != Config.sources[source].schemaType)
                    return callbackEach();


                Sparql_generic.getItems(source, options, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    if (result.length == 0)
                        return MainController.UI.message("No data found")

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


                    callbackEach();
                })
            }, function (err) {
                if (err)
                    return MainController.UI.message(err);
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
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

        /*   self.drawAllsimilars = function () {
               var source = $("#Pyramid_toSource").val()
               if (source == "")
                   self.drawSimilarsNodes(null, null)
               else
                   self.drawSimilarsNodes(null, [source])
           }*/


        self.drawObjectProperties = function (classIds) {
            var source = self.currentSource
            if (!source)
                return alert("select a source");
            if (!classIds) {
                classIds = self.getGraphIdsFromSource(source)

            }

            OwlSchema.initSourceSchema(source, function (err, schema) {
                if (err)
                    return MainController.UI.message(err)
                Sparql_schema.getClassPropertiesAndRanges(schema, classIds, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                    if (result.length == 0)
                        return MainController.UI.message("No data found")
                    var visjsData = {nodes: [], edges: []}
                    var existingNodes = visjsGraph.getExistingIdsMap()
                    var color = self.getSourceColor(source)
                    result.forEach(function (item) {
                        if (!item.range) {
                            item.range = {value: Math.random()}
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
                        visjsData.edges.push({
                            from: item.classId.value,
                            to: item.range.value,
                            label: item.propertyLabel.value,
                            //   physics:false,
                            arrows: "to",
                            dashes: true

                        })

                    })

                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    $("#waitImg").css("display", "none");

                })
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

            var html = "    <span class=\"popupMenuItem\" onclick=\"Pyramid.graphActions.drawChildren();\"> draw children</span>\n" +
                "    <span class=\"popupMenuItem\" onclick=\"Pyramid.graphActions.drawSimilars();\"> draw similars</span>\n" +
                "    <span  class=\"popupMenuItem\"onclick=\"Pyramid.graphActions.hideChildren();\">hide children</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Pyramid.graphActions.showNodeInfos();\">show node infos</span>"


            if (node.id.indexOf("_cluster") > 0) {
                var html = "    <span class=\"popupMenuItem\" onclick=\"Pyramid.graphActions.openCluster();\"> open cluster</span>\n"
            }
            $("#graphPopupDiv").html(html);

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

                Pyramid.addChildrenToGraph([self.currentGraphNode.id], self.currentGraphNode.data.source)
            },

            drawSimilars: function () {
                Pyramid.drawSimilarsNodes(self.currentGraphNode)
            },
            hideChildren: function () {
                Pyramid.removeLastChildrenFromGraph(self.currentGraphNode.id)
            }
            , openCluster: function () {
                Pyramid.openCluster(self.currentGraphNode)

            },
            showNodeInfos: function () {
                MainController.UI.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv")
            }
        }

        self.getSourceColor = function (source) {
            if (!sourceColors[source])
                sourceColors[source] = common.paletteIntense[Object.keys(sourceColors).length]
            return sourceColors[source];
        }


        self.addSourceToList = function (source) {
            var id = "Pyramid_source_" + encodeURIComponent(source)
            var html = "<div  id='" + id + "' style='color: " + self.getSourceColor(source) + "'" +
                " class='Pyramid_sourceLabelDiv' " +
                "onclick='Pyramid.setCurrentSource(\"" + encodeURIComponent(source) + "\")'>" + source + "</div>"
            $("#pyramid_drawnSources").append(html)
            self.setCurrentSource(encodeURIComponent(source))

        }
        self.setCurrentSource = function (sourceId) {

            $(".Pyramid_sourceLabelDiv").removeClass("Pyramid_selectedSourceDiv")
            $("#Pyramid_source_" + sourceId).addClass("Pyramid_selectedSourceDiv")
            Pyramid.currentSource = encodeURIComponent(sourceId)


        }

        return self;


    }
)()
