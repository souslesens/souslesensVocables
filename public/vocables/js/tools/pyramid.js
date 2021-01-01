var Pyramid = (function () {
        var self = {}
        var bottomIds = [];
        var sourceColors = {}
        var orphanShape = "dot";
        var defaultShape = "dot";
        var defaultShapeSize = 10;


        var maxChildrenDrawn = 15


        self.onSourceSelect = function (thesaurusLabel) {


            ThesaurusBrowser.showThesaurusTopConcepts(thesaurusLabel)
            $("#actionDivContolPanelDiv").load("snippets/pyramid.html")

            setTimeout(function () {
                var sourceLabels = Object.keys(Config.sources).sort();
                common.fillSelectOptions("Pyramid_toSource", sourceLabels, true)


            }, 200)

        }

        self.drawTopConcepts = function () {
            bottomIds = [];
            var source = MainController.currentSource
            var depth = parseInt($("#Pyramid_topDepth").val())
            Sparql_generic.getTopConcepts(source, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var ids = []
                result.forEach(function (item) {
                    ids.push(item.topConcept.value)
                })
                bottomIds.push(ids);
                var color = self.getSourceColor(source)
                var shape = defaultShape
                var visjsData = GraphController.toVisjsData(null, result, null, "#", "topConcept",
                    {
                        from: {
                            shape: "hexagon",
                            color: color,
                            size: defaultShapeSize
                        },
                        to: {
                            shape: shape,
                            color: color,
                            size: defaultShapeSize
                        },
                        data: {source: MainController.currentSource},
                        rootLabel:source,
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


            })

        }


        self.getGraphIdsFromSource=function(source){

            var existingNodes = visjsGraph.data.nodes.get();
            var sourceNodes = []
            existingNodes.forEach(function (item) {
                if ( item.id!="#" && item.data && item.data.source == source) {
                    sourceNodes.push(item.data.id || item.id)
                }
            })
            return sourceNodes;
        }


        self.addSourceChildrenToGraph = function () {
            var toSource = $("#Pyramid_toSource").val()
            if (toSource == "")
                return alert("select a source");
           var  sourceNodes= self.getGraphIdsFromSource(toSource)
            self.addChildrenToGraph(sourceNodes, toSource)

        }

        self.addChildrenToGraph = function (nodeIds, source) {
            var parentIds
            if (nodeIds) {
                parentIds = nodeIds
            } else {
                parentIds = bottomIds[bottomIds.length - 1];
            }
            if (!source) {

                source = MainController.currentSource;

            }
            Sparql_generic.getNodeChildren(source, null, parentIds, 1, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var map = [];
                var ids = []


                result.forEach(function (item) {
                    if (!map[item.concept.value])
                        map[item.concept.value] = []
                    map[item.concept.value].push(item)
                    ids.push(item.child1.value)
                })
                if (!nodeIds && result.length > 0)// si on est dans touts les cousins et non pas sur un noeud particulier
                    bottomIds.push(ids);

                var color = self.getSourceColor(source)

                var visjsData={nodes:[],edges:[]}
                for (var key in map) {

                    if (map[key].length > maxChildrenDrawn) {
                        visjsData.nodes.push({
                            id: key + "_cluster",
                            label: map[key].length + "children",
                            shape: "star",

                            value: map[key].length,
                            color: color,
                            data: {cluster: map[key], source: source, parent: key}
                        })
                        visjsData.edges.push({
                            from: key,
                            to: key + "_cluster",
                        })



                    } else {


                         var visjsData2 = GraphController.toVisjsData(null, map[key], key, "concept", "child1", {
                            from: {
                                shape: defaultShape,
                                color: color
                            },
                            to: {
                                shape: defaultShape,
                                color: color
                            },
                            data: {source: MainController.currentSource}
                        })

                        visjsData.nodes= visjsData.nodes.concat( visjsData2.nodes)
                        visjsData.edges= visjsData.edges.concat( visjsData2.edges)


                    }

                }
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)

                var keys = Object.keys(map)
                var orphans = []
                /*     parentIds.forEach(function (id) {
                         if (keys.indexOf(id) < 0) {
                             orphans.push({id: id, shape: orphanShape})
                         }
                     })
                     visjsGraph.data.nodes.update(orphans)*/


            })
        }

        self.openCluster = function (cluster) {
            var color = self.getSourceColor(cluster.data.source)
            var visjsData = GraphController.toVisjsData(null, cluster.data.cluster, cluster.data.parent, "concept", "child1", {
                from: {
                    shape: defaultShape,
                    color: color
                },
                to: {
                    shape: defaultShape,
                    color: color
                },
                data: {source: cluster.data.source}
            })

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)
            visjsGraph.data.nodes.remove(cluster.id)


        }

        self.drawSimilarsNodes = function (node, sources) {
            var sourceSchematype = Config.sources[MainController.currentSource].schemaType;
            var similars = [];
            if (!sources)
                sources = Object.keys(Config.sources)
            var words = []
            var wordsMap = {}
            if (!node) {
                var nodeObjs = visjsGraph.data.nodes.get()
                nodeObjs.forEach(function (item) {
                    words.push(item.label)
                    wordsMap[item.label.toLowerCase()] = item.id
                })
            } else {
                words = [node.label]
            }

            var filter = Sparql_generic.setFilter("concept", null, words, {exactMatch: true})
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
                    result.forEach(function (item) {
                        similars.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            source: source
                        });
                    })

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
                            label: item.source,
                            color: color,
                            shape: "hexagon",
                            data: item
                        })
                        visjsData.edges.push({
                            from: wordsMap[item.label.toLowerCase()],
                            to: item.id
                        })
                    }
                })

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)

            })


        }

        self.drawAllsimilars = function () {
            var source = $("#Pyramid_toSource").val()
            if (source == "")
                self.drawSimilarsNodes(null, null)
            else
                self.drawSimilarsNodes(null, [source])
        }




        self.drawObjectProperties = function (classIds) {
            var source = $("#Pyramid_toSource").val()
            if (source == "")
                return alert("select a source");
            if(!classIds){
                classIds=self.getGraphIdsFromSource(source)

            }

            OwlSchema.initSourceSchema(source, function (err, schema) {
                if(err)
                    return MainController.UI.message(err)
                Sparql_schema.getClassPropertiesAndRanges(schema, classIds, function (err, result) {
                    if(err)
                        return MainController.UI.message(err)
                    var visjsData={nodes:[],edges:[]}
                    var existingNodes=visjsGraph.getExistingIdsMap()
                    var color = self.getSourceColor(source)
                    result.forEach(function(item) {
                        if(! item.range){
                            item.range={value:Math.random()}
                            item.rangeLabel={value :"?"}
                        }
                        if (!existingNodes[item.range.value]) {
                            existingNodes[item.range.value] = 1;
                            visjsData.nodes.push({
                                id: item.range.value,
                                label: item.rangeLabel.value,
                                shape: defaultShape,
                                size: defaultShapeSize,
                                color: color,
                                data:{source:source}
                            })

                        }
                        visjsData.edges.push({
                            from:item.classId.value,
                            to:item.range.value,
                            label:item.propertyLabel.value,
                         //   physics:false,
                            arrows:"to",
                            dashes:true

                        })

                    })

                    visjsGraph.data.nodes.add( visjsData.nodes)
                    visjsGraph.data.edges.add( visjsData.edges)

                })
            })
        }


        self.removeLastChildrenFromGraph = function (nodeId) {

            if (nodeId) {
                var children = visjsGraph.network.getConnectedNodes(nodeId, "to");
                visjsGraph.data.nodes.remove(children)


            } else {
                if (bottomIds.length > 0)
                    visjsGraph.data.nodes.remove(bottomIds[bottomIds.length - 1])
                bottomIds.splice(bottomIds.length - 1, 1)
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
                sourceColors[source] = common.palette[Object.keys(sourceColors).length]
            return sourceColors[source];
        }


        return self;


    }
)()
