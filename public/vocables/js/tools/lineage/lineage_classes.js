/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Lineage_classes = (function () {

        var expandedLevels = {};
        var sourceColors = {}
        var propertyColors = {}


        var self = {}
        self.maxClusterOpeningLength = 200

        var graphContext = {}
        self.propertyColors = {}
        self.defaultShape = "dot";
        self.defaultShapeSize = 5;
        self.orphanShape = "square";
        self.objectPropertyColor = "red"
        self.defaultEdgeArrowType = "triangle"
        self.defaultEdgeColor = "#aaa"
        self.restrictionColor = "orange"
        self.maxChildrenDrawn = 30;
        self.soucesLevelMap={}

        self.onLoaded = function () {
            $("#sourceDivControlPanelDiv").html("")
            Lineage_common.currentSource = null;
            MainController.UI.message("");


            $("#accordion").accordion("option", {active: 2});
            MainController.UI.openRightPanel()
            $("#actionDivContolPanelDiv").load("snippets/lineage/lineage.html")
            //   MainController.UI.toogleRightPanel("open");
            $("#rightPanelDiv").load("snippets/lineage/lineageRightPanel.html")
            SourceBrowser.currentTargetDiv = "LineagejsTreeDiv"


            setTimeout(function () {
                var sourceLabels = []


                for (var key in Config.sources) {
                    if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[key].schemaType) > -1)
                        sourceLabels.push(key)
                }
                sourceLabels.sort()
                //  common.fillSelectOptions("Lineage_toSource", sourceLabels, true)
                $("#Lineage_Tabs").tabs({
                    activate: function (e, ui) {
                        self.currentOwlType = "Class"
                        var divId = ui.newPanel.selector;
                        if (divId == "#LineageTypesTab") {
                            self.currentOwlType = "Type"
                            Lineage_types.init()
                        } else if (divId == "#LineagePropertiesTab") {
                            self.currentOwlType = "ObjectProperty"
                            Lineage_properties.init()
                        }
                    }

                });
                $("#GenericTools_searchSchemaType").val("OWL")
                MainController.UI.showSources("Lineage_sources", false)
                /* if (sourceLabel) {
                     SourceBrowser.showThesaurusTopConcepts(sourceLabel, {targetDiv: "LineagejsTreeDiv"})
                     Lineage_classes.drawTopConcepts(sourceLabel)

                 }*/

            }, 200)

        }


        self.onSourceSelect = function (sourceLabel) {


            if (!sourceLabel)
                return
            MainController.currentSource = sourceLabel
            if (!Lineage_common.currentSource) {

                Lineage_classes.drawTopConcepts(sourceLabel)
            }
            $("#Lineage_sourceLabelDiv").html(sourceLabel)
            SourceBrowser.showThesaurusTopConcepts(sourceLabel, {targetDiv: "LineagejsTreeDiv"})
            if (Config.sources[sourceLabel].schemaType == "INDIVIDUAL") {
                $("#lineage_controlPanel0Div").css("display", "none")
                $("#lineage_controlPanel1Div").css("display", "block")
                self.initIndividualsPropertiesSelect(sourceLabel)
            } else {
                $("#lineage_controlPanel0Div").css("display", "block")
                $("#lineage_controlPanel1Div").css("display", "none")
            }


            propertyColors = {}

            Lineage_common.currentSource = sourceLabel;
            MainController.currentSource = sourceLabel;
            MainController.currentSource = sourceLabel
            $("#GenericTools_onSearchCurrentSourceInput").css("display", "block")


        }


        self.jstreeContextMenu = function () {
            var items = {}

            items.drawTopConcepts = {
                label: "draw taxonomy",
                action: function (e) {// pb avec source
                    $("#Lineage_topClassesRadio").prop("checked", true)
                    Lineage_classes.drawTopConcepts()
                    //   self.showThesaurusTopConcepts()
                    SourceBrowser.showThesaurusTopConcepts(Lineage_common.currentSource, {targetDiv: "LineagejsTreeDiv"})

                }
            }
            items.addSimilarlabels = {
                label: "add similars (label)",
                action: function (e) {
                    $("#Lineage_similarTypeRadio_Labels").prop("checked", true)
                    Lineage_classes.drawSimilarsNodes()

                }
            }
            items.addSameAs = {
                label: "add similars (sameAs)",
                action: function (e) {
                    $("#Lineage_similarTypeRadio_SameAs").prop("checked", true)
                    Lineage_classes.drawSimilarsNodes()

                }
            }


            return items;

        }


        self.selectTreeNodeFn = function (event, propertiesMap) {
            SourceBrowser.currentTreeNode = propertiesMap.node;
            self.currentTreeNode = propertiesMap.node;
            var data = propertiesMap.node.data;

            if (Config.sources[data.source].schemaType == "INDIVIDUAL") {
                return ADLquery.showJstreeNodeChildren(SourceBrowser.currentTargetDiv, propertiesMap.node)
            }
            if (propertiesMap.event.altKey)
                self.addArbitraryNodeToGraph(data)
            if (propertiesMap.event.ctrlKey)
                MainController.UI.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv")
            SourceBrowser.openTreeNode(SourceBrowser.currentTargetDiv, data.source, propertiesMap.node, {ctrlKey: propertiesMap.event.ctrlKey})
        }
        self.initUI = function () {
            MainController.UI.message("")
            visjsGraph.clearGraph()
            expandedLevels = {}
            //  Lineage_common.currentSource = null;
            $("#lineage_drawnSources").html("");
            // $("#Lineage_toSource").val("")
        }


        self.drawTopConcepts = function (source) {
            self.initUI();

            if (!source)
                source = MainController.currentSource
            if (!source)
                return;
            if (source == "QUANTUM_MODEL")
                self.QuantumModelMapping = true
            Lineage_common.currentSource = source;
            self.soucesLevelMap[source]={children:0}

            self.registerSource(source)


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
                if (!expandedLevels[source])
                    expandedLevels[source] = []
                expandedLevels[source].push(ids);
                $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length)
                var color = self.getSourceColor(source)
                var shape = Lineage_classes.defaultShape
                var visjsData = GraphController.toVisjsData(null, result, null, "topConcept", "#",
                    {
                        to: {
                            shape: "box",
                            color: color,
                            size: Lineage_classes.defaultShapeSize
                        },
                        from: {
                            shape: shape,
                            color: color,
                            size: Lineage_classes.defaultShapeSize
                        },
                        data: {source: MainController.currentSource},
                        rootLabel: source,
                        edgeColor: Lineage_classes.defaultEdgeColor,
                        arrows: {
                            to: {
                                enabled: true,
                                type: Lineage_classes.defaultEdgeArrowType,
                                scaleFactor: 0.5
                            },
                        },
                    },0)


                self.drawNewGraph(visjsData)


            })

        }
        self.drawNewGraph = function (visjsData) {
            graphContext = {}
            var options = {
                keepNodePositionOnDrag: true,
                onclickFn: Lineage_classes.graphActions.onNodeClick,
                onRightClickFn: Lineage_classes.graphActions.showGraphPopupMenu,
                "physics": {
                    "barnesHut": {
                        "springLength": 0,
                        "damping": 0.15
                    },
                    "minVelocity": 0.75,

                }
                //   layoutHierarchical: {direction: "LR", sortMethod: "directed"}

            }


            visjsGraph.draw("graphDiv", visjsData, options)
            $("#waitImg").css("display", "none");
        }


        self.getGraphIdsFromSource = function (source) {
            if (!visjsGraph.data || !visjsGraph.data.nodes)
                return null;
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
            var source = Lineage_common.currentSource;
            if (source == "")
                return alert("select a source");
            var sourceNodes = self.getGraphIdsFromSource(source)
            self.addChildrenToGraph(sourceNodes, source)

        }

        self.addChildrenToGraph = function (nodeIds, source) {
            var parentIds
            if (!source) {
                if (Lineage_common.currentSource)
                    source = Lineage_common.currentSource;
                else
                    return alert("select a source")
            }
            self.soucesLevelMap[source].children+=1
            if (nodeIds) {
                /// parentIds = nodeIds
                //    parentIds=common.getAllDescendants("",nodeIds)
                var parentIds = visjsGraph.getNodeDescendantIds(nodeIds, true)


            } else {
                var sourcesIdsMap = Lineage_classes.getGraphSourcesIdsMap(nodeIds)
                parentIds = sourcesIdsMap[source]
                if (!parentIds || parentIds.length == 0)
                    parentIds = expandedLevels[source][expandedLevels[source].length - 1];
            }
            if (parentIds.length == 0)
                return MainController.UI.message("no parent node selected")

            MainController.UI.message("")
            var options = {}
            if (self.currentOwlType == "ObjectProperty")
                options.owlType = "ObjectProperty"
            Sparql_generic.getNodeChildren(source, null, parentIds, 1, {skipRestrictions: 1}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var map = [];
                var ids = [];

                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }
                var color = self.getSourceColor(source)

                result.forEach(function (item) {

                    if (!map[item.concept.value])
                        map[item.concept.value] = []
                    map[item.concept.value].push(item)
                    ids.push(item.child1.value)


                    /*   if (self.QuantumModelMapping) {
                           var nodeSource = common.quantumModelmappingSources[item.child1.value]
                           if (nodeSource) {
                              color = self.getSourceColor(nodeSource)

                           }
                       }*/
                })


                var existingNodes = visjsGraph.getExistingIdsMap();
                var visjsData = {nodes: [], edges: []}

                var expandedLevel = []
                for (var key in map) {


                    if (map[key].length > Lineage_classes.maxChildrenDrawn) {
                        //on enleve les cluster du dernier bootomIds dsiono on cree des orphelins au niveau suivant

                        var nodeId = key + "_cluster"
                        if (!existingNodes[nodeId]) {
                            existingNodes[nodeId] = 1
                            visjsData.nodes.push({
                                id: key + "_cluster",
                                label: map[key].length + "children",
                                shape: "star",
                                size: Lineage_classes.defaultShapeSize,
                                value: map[key].length,
                                color: color,
                                data: {cluster: map[key],id: key + "_cluster",label:"CLUSTER : "+ map[key].length + "children", source: source, parent: key,varName:key + "_cluster",graphLevel:self.soucesLevelMap[source].children}
                            })
                        }
                        var edgeId = key + "_" + key + "_cluster"
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                to: key,
                                from: key + "_cluster",
                                color: Lineage_classes.defaultEdgeColor,
                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: Lineage_classes.defaultEdgeArrowType,
                                        scaleFactor: 0.5,

                                    },
                                },
                                data: {source: source}
                            })
                        }


                    } else {
                        var existingIds = visjsGraph.getExistingIdsMap()
                        var visjsData2 = {nodes: [], edges: []}
                        var varName="child"
                        map[key].forEach(function (item) {

                            var nodeSource = source;
                            var shape = Lineage_classes.defaultShape
                            var shapeSize = Lineage_classes.defaultShapeSize

                            if (self.QuantumModelMapping) {

                                var nodeSource2 = common.quantumModelmappingSources[item.child1.value]
                                if (nodeSource2) {
                                    nodeSource = nodeSource2
                                    color = self.getSourceColor(nodeSource2)
                                    shape = Lineage_classes.defaultEdgeArrowType
                                    shapeSize = 6
                                    self.registerSource(nodeSource)
                                } else {
                                    shape = "box"

                                }


                            }

                            var data = {id: item.child1.value, label: item.child1Label.value, source: nodeSource,varName:varName,graphLevel:self.soucesLevelMap[source].children}
                            expandedLevel.push(item.child1.value)


                            if (!existingIds[item.child1.value]) {
                                existingIds[item.child1.value] = 1;
                                visjsData2.nodes.push({
                                    id: item.child1.value,
                                    label: item.child1Label.value,
                                    shape: shape,
                                    size: shapeSize,
                                    color: self.getSourceColor(nodeSource),

                                    data: data
                                })
                            }
                            var edgeId = item.concept.value + "_" + item.child1.value
                            var inverseEdge = item.child1.value + "_" + item.concept.value
                            if (!existingIds[edgeId] && !existingIds[inverseEdge]) {
                                existingIds[edgeId] = 1
                                visjsData2.edges.push({
                                    id: edgeId,
                                    to: item.concept.value,
                                    from: item.child1.value,
                                    color: Lineage_classes.defaultEdgeColor,
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: Lineage_classes.defaultEdgeArrowType,
                                            scaleFactor: 0.5
                                        },
                                    },
                                    data: {source: nodeSource}
                                })

                            }

                        })


                        visjsData.nodes = visjsData.nodes.concat(visjsData2.nodes)
                        visjsData.edges = visjsData.edges.concat(visjsData2.edges)


                    }

                }
                if (!expandedLevels[source])
                    expandedLevels[source] = []
                expandedLevels[source].push(expandedLevel)
                visjsData.nodes = common.removeDuplicatesFromArray(visjsData.nodes, "id")
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                visjsGraph.network.fit()
                $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length)


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

        self.listClusterToClipboard = function (clusterNode) {
            var text = "";
            clusterNode.data.cluster.forEach(function (item, index) {
                text += item.child1.value + "," + item.child1Label.value + "\n"
            })

            common.copyTextToClipboard(text, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                MainController.UI.message(result);
            })
        }

        self.listClusterContent = function (clusterNode) {
            var text = "";
            var jstreeData = []
            clusterNode.data.cluster.forEach(function (item, index) {
                jstreeData.push({
                    id: item.child1.value, text: item.child1Label.value, parent: "#",
                    data: {source: clusterNode.data.source, id: item.child1.value, label: item.child1Label.value}
                })
            })

            var jstreeOptions = {
                openAll: true, selectTreeNodeFn: function (event, propertiesMap) {

                    return Lineage_classes.selectTreeNodeFn(event, propertiesMap);


                },
                contextMenu: SourceBrowser.getJstreeConceptsContextMenu()
            }

            common.jstree.loadJsTree(SourceBrowser.currentTargetDiv, jstreeData, jstreeOptions)
        }

        self.openCluster = function (clusterNode) {
            MainController.UI.message("")
            if (clusterNode.data.cluster.length > self.maxClusterOpeningLength) {
                self.listClusterToClipboard(clusterNode)
                return alert("cluster content copied to clipboard( too large to draw)")
            }

            var color = self.getSourceColor(clusterNode.data.source)
            var visjsData = GraphController.toVisjsData(null, clusterNode.data.cluster, clusterNode.data.parent, "concept", "child1", {
                from: {
                    shape: Lineage_classes.defaultShape,
                    size: Lineage_classes.defaultShapeSize,
                    color: color
                },
                to: {
                    shape: Lineage_classes.defaultShape,
                    size: Lineage_classes.defaultShapeSize,
                    color: color
                },
                data: {source: clusterNode.data.source}
            }
            ,clusterNode.data.graphLevel
            )

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)
            visjsGraph.network.fit()
            visjsGraph.data.nodes.remove(clusterNode.id)
            $("#waitImg").css("display", "none");
            MainController.UI.message("")


        }


        self.drawSimilarsNodes = function (node, sources, descendantsAlso) {
            MainController.UI.message("")
            //    $("#Lineage_toSource").val("")

            var similarType
            if ($("#Lineage_similarTypeRadio_Labels").prop("checked"))
                similarType = "labels";
            else if ($("#Lineage_similarTypeRadio_SameAs").prop("checked"))
                similarType = "sameAs";

            var similars = [];
            if (!sources)
                sources = Lineage_common.currentSource;// common.getAllsourcesWithType("OWL")
            if (!Array.isArray(sources))
                sources = [sources]

            var words = []
            var sourceItemsMap = {}
            var ids = [];
            var slices;
            async.series([
                function (callbackSeries) {
                    if (similarType != "labels")
                        return callbackSeries()
                    if (!node) {
                        if (!sources)
                            return callbackSeries("select a source")

                        var nodeObjs = visjsGraph.data.nodes.get()
                        nodeObjs.forEach(function (item) {
                            if (item.label && item.label.toLowerCase) {
                                words.push(item.label)
                                sourceItemsMap[item.label.toLowerCase()] = item.id
                            }
                        })
                    } else {
                        var nodes = []
                        if (descendantsAlso) {
                            var nodes = visjsGraph.jstree.getNodeDescendants(node.id, true)
                        } else {
                            nodes.push(node)
                        }
                        nodes.forEach(function (node) {
                            words.push(node.label)
                            sourceItemsMap[node.label.toLowerCase()] = node.id
                        })


                    }
                    slices = common.array.slice(words, Sparql_generic.slicesSize);

                    return callbackSeries()
                },

                function (callbackSeries) {
                    if (similarType != "sameAs")
                        return callbackSeries()
                    if (!node) {
                        if (!sources)
                            return alert("select a source")

                        ids = visjsGraph.data.nodes.getIds()


                    } else {

                    }

                    var idsSlices = common.array.slice(ids, Sparql_generic.slicesSize);
                    var similarIds = []
                    async.eachSeries(idsSlices, function (ids, callbackEachSlice) {
                        var filter = Sparql_common.setFilter("similar", ids, null)
                        /*  filter = " ?prop  rdfs:subClassOf* owl:sameAs.\n" +
                              "  ?concept ?prop ?similar " + filter*/

                        filter = "?concept <http://w3id.org/readi/z018-rdl/sameinPCA> ?similar. " + filter

                        var options = {filter: filter}
                        Sparql_generic.getItems("ISO_15926-PCA", options, function (err, result) {
                            if (err) {
                                return callbackEachSlice(err);
                            }

                            var ids = []

                            result.forEach(function (item) {
                                similarIds.push(item.similar.value)

                                sourceItemsMap[item.similar.value] = item.concept.value
                            })
                            return callbackEachSlice()

                        })
                    }, function (err) {

                        slices = common.array.slice(similarIds, Sparql_generic.slicesSize);
                        return callbackSeries(err);
                    })


                },
                function (callbackSeries) {


                    async.eachSeries(sources, function (source, callbackEachSource) {

                        async.eachSeries(slices, function (items, callbackEachSlice) {
                            if (items.length == 0) {
                                $("#waitImg").css("display", "none");
                                MainController.UI.message("No data found")
                                return callbackSeries()

                            }
                            var filter = ""
                            if (similarType == "labels") {
                                filter = Sparql_common.setFilter("concept", null, items, {exactMatch: true})
                            } else if (similarType == "sameAs") {
                                filter = Sparql_common.setFilter("concept", items, null)

                            }
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
                                        source: source,
                                        varName:"similar in "+source
                                    });
                                    ids.push(item.concept.value)
                                })

                                if (!expandedLevels[source]) {

                                    self.registerSource(source)


                                }
                                if (!expandedLevels[source])
                                    expandedLevels[source] = []
                                expandedLevels[source].push(ids)


                                callbackEachSlice();
                            })
                        }, function (err) {
                            callbackEachSource(err)
                        })
                    }, function (err) {
                        if (err)
                            return callbackSeries()
                        var visjsData = {nodes: [], edges: []}
                        var existingNodes = visjsGraph.getExistingIdsMap()
                        if (similars.length == 0) {
                            $("#waitImg").css("display", "none");
                            MainController.UI.message("No data found")
                            return callbackSeries()

                        }
                        var newEdges = []
                        if (true) {
                            similars.forEach(function (item) {

                                    if (!existingNodes[item.id]) {
                                        existingNodes[item.id] = 1
                                        var color = self.getSourceColor(item.source)
                                        visjsData.nodes.push({
                                            id: item.id,
                                            label: item.label,
                                            color: color,
                                            shape: "dot",
                                            size: Lineage_classes.defaultShapeSize,
                                            data: item
                                        })
                                    }


                                    var from;
                                    var width, arrows;
                                    if (similarType == "labels") {
                                        from = sourceItemsMap[item.label.toLowerCase()]
                                        width = 1
                                        arrows = {
                                            to: {
                                                enabled: true,
                                                type: "curve",
                                            },
                                        }
                                    } else if (similarType == "sameAs") {
                                        from = sourceItemsMap[item.id]
                                        width = 2
                                        arrows = null

                                    }
                                    if (from == item.id)
                                        return;
                                    var edgeId = from + "_" + item.id + "_" + item.source + "_" + similarType

                                    if (!existingNodes[edgeId]) {
                                        existingNodes[edgeId] = 1
                                        newEdges.push({id: edgeId, length: 45, color: "blue"})
                                        visjsData.edges.push({
                                            id: edgeId,
                                            from: from,
                                            to: item.id,
                                            color: color,
                                            width: width,
                                            //   label: item.source,
                                            arrows: arrows,
                                            data: {source: item.source},
                                            length: 30,
                                            //     physics:false
                                        })

                                    }
                                }
                            )
                        } else {


                        }


                        visjsGraph.data.nodes.add(visjsData.nodes)
                        visjsGraph.data.edges.add(visjsData.edges)
                        visjsGraph.network.fit()
                        /*   setTimeout(function() {
                               visjsGraph.data.edges.update(newEdges)
                           },1000)*/
                        $("#waitImg").css("display", "none");


                    })


                }


            ], function (err) {

            })
        }


        self.initIndividualsPropertiesSelect = function (sourceLabel) {
            var schemaType = Config.sources[sourceLabel].schemaType
            if (schemaType == "INDIVIDUAL") {

                var preferredProperties = Config.sources[sourceLabel].preferredProperties
                if (!preferredProperties)
                    return alert("no preferredProperties in source configuration")

                var jstreeData = [];
                var uriPrefixes = {}
                preferredProperties.forEach(function (item) {
                    var p
                    p = item.lastIndexOf("#")
                    if (p < 0)
                        p = item.lastIndexOf("/")
                    var graphPrefix = item.substring(0, p)
                    var propLabel = item.substring(p + 1)
                    if (!uriPrefixes[graphPrefix]) {
                        uriPrefixes[graphPrefix] = 1;
                        jstreeData.push(
                            {
                                id: graphPrefix,
                                text: graphPrefix,
                                parent: "#"
                            })
                    }
                    jstreeData.push(
                        {
                            id: item,
                            text: propLabel,
                            parent: graphPrefix
                        }
                    )

                })
                common.jstree.loadJsTree("lineage_individualsPropertiesTree", jstreeData, {openAll: true});

                if (false) {
                    Sparql_OWL.getIndividualProperties(sourceLabel, null, null, null, {distinct: "property"}, function (err, result) {
                        if (err)
                            return MainController.UI.message(err);
                        var uriPrefixes = {}
                        var jstreeData = [];
                        result.forEach(function (item) {
                            var p
                            p = item.property.value.lastIndexOf("/")
                            if (p < 0)
                                p = item.property.value.lastIndexOf("#")
                            var graphPrefix = item.property.value.substring(0, p)
                            if (!uriPrefixes[graphPrefix]) {
                                uriPrefixes[graphPrefix] = 1;
                                jstreeData.push(
                                    {
                                        id: graphPrefix,
                                        text: graphPrefix,
                                        parent: "#"
                                    })

                            }

                            jstreeData.push(
                                {
                                    id: item.property.value,
                                    text: item.property.value.substring(p + 1),
                                    parent: graphPrefix
                                }
                            )

                        })

                        common.jstree.loadJsTree("lineage_individualsPropertiesTree", jstreeData);
                    })
                }


            }

        }
        self.drawIndividualsProperties = function (propertyId, classIds, options) {
            if (!options) {
                options = {}
            }

            if (!propertyId) {
                //  propertyId = $("#lineage_individualsPropertiesSelect").val()
                propertyId = $("#lineage_individualsPropertiesTree").jstree(true).get_selected()
            }
            var source = Lineage_common.currentSource
            if (!source)
                return alert("select a source");
            var subjects = null
            var objects = null
            if (!classIds) {
                var filterType = $("#lineage_clearIndividualsPropertiesFilterSelect").val();
                if (filterType == "graph nodes")
                    classIds = self.getGraphIdsFromSource(source)
                else if (filterType == "graph nodes")
                    classIds = null;
                else if (filterType == "filter value") {
                    return alert("to be developped")
                }


            }
            if (options.inverse) {
                objects = classIds
            } else {
                subjects = classIds

            }
            MainController.UI.message("")
            Sparql_OWL.getIndividualProperties(source, subjects, [propertyId], objects, null, function (err, result) {
                if ($("#lineage_clearIndividualsPropertiesCBX").prop("checked")) {
                    var oldIds = Object.keys(self.currentIndividualsProperties);
                    visjsGraph.data.nodes.remove(oldIds)
                    visjsGraph.data.edges.remove(oldIds)
                }

                if (err)
                    return MainController.UI.message(err)
                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    Lineage_classes.drawRestrictions(classIds)
                    return MainController.UI.message("No data found")

                }
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                var color = self.getPropertyColor(propertyId)

                result.forEach(function (item) {
                    if (!item.subject) {
                        item.subject = {value: "?_" + item.property.value}
                    }
                    if (!item.subjectLabel) {
                        item.subjectLabel = {value: "?"}
                    }
                    if (!existingNodes[item.subject.value]) {
                        existingNodes[item.subject.value] = 1;
                        visjsData.nodes.push({
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            font: {color: color},
                            shape: "dot",
                            size: Lineage_classes.defaultShapeSize,
                            color: "#ddd",
                            data: {source: source}
                        })

                    }
                    if (!item.object) {
                        item.object = {value: "?_" + item.property.value}
                    }
                    if (!item.objectLabel) {
                        item.objectLabel = {value: "?"}
                    }
                    if (!existingNodes[item.object.value]) {
                        existingNodes[item.object.value] = 1;
                        visjsData.nodes.push({
                            id: item.object.value,
                            label: item.objectLabel.value,
                            font: {color: color},
                            shape: "dot",
                            size: Lineage_classes.defaultShapeSize,
                            color: "#ddd",
                            data: {source: source}
                        })

                    }
                    var edgeId = item.subject.value + "_" + item.object.value + "_" + item.property.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.subject.value,
                            to: item.object.value,
                            label: "<i>" + item.propertyLabel.value + "</i>",
                            data: {propertyId: item.property.value, source: source},
                            font: {multi: true, size: 10},

                            // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                            //   physics:false,
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "bar",
                                    scaleFactor: 0.5
                                },
                            },
                            //  dashes: true,
                            color: color

                        })
                    }

                })
                self.currentIndividualsProperties = existingNodes;
                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    self.drawNewGraph(visjsData)
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                }
                visjsGraph.network.fit()
                $("#waitImg").css("display", "none");

                //   $("#lineage_clearIndividualsPropertiesCBX").prop("checked",true)

            })

        }
        self.drawObjectProperties = function (classIds, descendantsAlso) {
            var source = Lineage_common.currentSource
            if (!source)
                return alert("select a source");
            if (!classIds) {
                classIds = self.getGraphIdsFromSource(source)
            } else {
                if (descendantsAlso)
                    classIds = visjsGraph.getNodeDescendantIds(classIds, true)
            }


            Sparql_OWL.getObjectProperties(source, classIds, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    if (Config.sources[source].schemaType != "INDIVIDUAL") {
                        Lineage_classes.drawRestrictions(classIds)
                    }
                    return MainController.UI.message("No data found")

                }
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                var color = self.getSourceColor(source)

                result.forEach(function (item) {

                    if (!item.range) {
                        item.range = {value: "?_" + item.prop.value}
                    }
                    if (!item.rangeLabel) {
                        item.rangeLabel = {value: "?"}
                    }
                    if (!existingNodes[item.range.value]) {
                        existingNodes[item.range.value] = 1;
                        visjsData.nodes.push({
                            id: item.range.value,
                            label: item.rangeLabel.value,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            data: {source: source}
                        })

                    }
                    var edgeId = item.domain.value + "_" + item.range.value + "_" + item.prop.value
                    var edgeIdInv = item.range.value + "_" + item.range.value + "_" + item.prop.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        if (!existingNodes[edgeIdInv]) {
                            existingNodes[edgeIdInv] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.domain.value,
                                to: item.range.value,
                                label: "<i>" + item.propLabel.value + "</i>",
                                data: {propertyId: item.prop.value, source: source},
                                font: {multi: true, size: 10},
                                // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                                //   physics:false,
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "bar",
                                        scaleFactor: 0.5
                                    },
                                },
                                dashes: true,
                                color: Lineage_classes.objectPropertyColor

                            })
                        }
                    }

                })

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                visjsGraph.network.fit()
                $("#waitImg").css("display", "none");

                if (Config.sources[source].schemaType != "INDIVIDUAL") {
                    Lineage_classes.drawRestrictions(classIds)
                }

            })

        }
        self.drawRestrictions = function (classIds) {
            var source = Lineage_common.currentSource
            if (!source)
                return alert("select a source");
            if (!classIds) {
                classIds = self.getGraphIdsFromSource(source)

            }
            MainController.UI.message("")

            Sparql_OWL.getObjectRestrictions(source, classIds, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                var color = self.getSourceColor(source)
                console.log(JSON.stringify(result, null, 2))
                result.forEach(function (item) {

                    if (!item.value) {
                        item.value = {value: "?_" + item.prop.value}
                        item.valueLabel = {value: "?"}
                    }
                    if (!item.valueLabel) {
                        item.valueLabel = {value: "?"}
                    }
                    if (!existingNodes[item.value.value]) {
                        existingNodes[item.value.value] = 1;
                        visjsData.nodes.push({
                            id: item.value.value,
                            label: item.valueLabel.value,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            data: {source: source}
                        })

                    }
                    var edgeId = item.concept.value + "_" + item.value.value + "_" + item.prop.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.concept.value,
                            to: item.value.value,
                            label: "<i>" + item.propLabel.value + "</i>",
                            data: {propertyId: item.prop.value, source: source},
                            font: {multi: true, size: 10},
                            // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                            //   physics:false,
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "bar",
                                    scaleFactor: 0.5
                                },
                            },
                            dashes: true,
                            color: Lineage_classes.restrictionColor

                        })
                    }

                })

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                visjsGraph.network.fit()
                $("#waitImg").css("display", "none");

            })

        }

        self.graphNodeNeighborhood = function (nodeData, propFilter) {
            /*    var sourceOptions=Config.sources[Lineage_common.currentSource].options;
                if(sourceOptions && sourceOptions.graphPropertiesFilterRegex)
                     var graphPropertiesFilterRegex =new RegExp(sourceOptions.graphPropertiesFilterRegex);*/


            if (propFilter == "ranges") {


                Sparql_OWL.getObjectProperties(Lineage_common.currentSource, [nodeData.id], {}, function (err, result) {
                    if (err) {
                        return MainController.UI.message(err);
                    }
                    if (result.length == 0) {
                        $("#waitImg").css('display', 'none')
                        return MainController.UI.message(" no  data found")
                    }
                    var visjsData = {nodes: [], edges: []}
                    var existingIds = visjsGraph.getExistingIdsMap()
                    var hasProperties = false
                    var labelStr = "<b>" + nodeData.label + "</b>\n"
                    result.forEach(function (item) {
                        hasProperties = true
                        var propLabel
                        if (item.propLabel)
                            propLabel = item.propLabel.value
                        else
                            propLabel = Sparql_common.getLabelFromId(item.prop.value)
                        var rangeLabel
                        if (item.rangeLabel)
                            rangeLabel = item.rangeLabel.value
                        else
                            rangeLabel = Sparql_common.getLabelFromId(item.range.value)
                        labelStr += "<i>" + propLabel + " : </i>" + rangeLabel + "\n"

                    })
                    var color = Lineage_classes.getSourceColor(Lineage_common.currentSource)
                    if (!existingIds[nodeData.id]) {
                        existingIds[nodeData.id] = 1
                        var node = {
                            id: nodeData.id,
                            label: nodeData.label,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            font: {multi: true, size: 10},
                            data: {
                                source: Lineage_common.currentSource,
                                id: nodeData.id,
                                label: nodeData.label,
                            }
                        }

                        visjsData.nodes.push(node)
                    }
                    var color = "#ddd"
                    var id = nodeData.id + "_range"
                    if (hasProperties && !existingIds[id]) {
                        existingIds[id] = 1
                        var node = {
                            id: id,
                            label: labelStr,
                            shape: "box",

                            color: color,
                            font: {multi: true, size: 10},
                            data: {
                                source: Lineage_common.currentSource,
                                id: nodeData.id,
                                label: nodeData.label,
                            }
                        }
                        visjsData.nodes.push(node)

                        visjsData.edges.push({
                            id: nodeData.id + "_" + id,
                            from: nodeData.id,
                            to: id,
                            width: 5


                        })
                    }
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)


                })


                return;


            }


            var graphPropertiesFilterRegex = null;

            var graphUri = Config.sources[Lineage_common.currentSource].graphUri;
            var sparql_url = Config.sources[Lineage_common.currentSource].sparql_server.url;
            var fromStr = Sparql_common.getFromStr(Lineage_common.currentSource)

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "select * " + fromStr + " where {";
            if (propFilter == "outcoming")
                query += "<" + nodeData.id + "> ?prop ?value.  ";
            else if (propFilter == "incoming")
                query += " ?value ?prop  <" + nodeData.id + ">.  ";

            query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} "
            query += "}"
            var url = sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: Lineage_common.currentSource}, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }

                var data = result.results.bindings
                if (data.length == 0) {
                    $("#waitImg").css('display', 'none')
                    return MainController.UI.message(" no  data found")
                }

                var color = Lineage_classes.getSourceColor(Lineage_common.currentSource)
                var visjsData = {nodes: [], edges: []}
                var existingIds = visjsGraph.getExistingIdsMap()
                if (!existingIds[nodeData.id]) {
                    existingIds[nodeData.id] = 1
                    var node = {
                        id: nodeData.id,
                        label: nodeData.label,
                        shape: Lineage_classes.defaultShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: color,
                        font: {multi: true, size: 10},
                        data: {
                            source: Lineage_common.currentSource,
                            id: nodeData.id,
                            label: nodeData.label,
                        }
                    }

                    visjsData.nodes.push(node)
                }
                var distinctProps = {}
                data.forEach(function (item) {
                    if (item.valueLabel) {
                        if (!distinctProps[item.prop.value])
                            distinctProps[item.prop.value] = 1
                        if (item.prop.value.indexOf("rdf") < 0 && item.prop.value.indexOf("owl") < 0) {
                            //  if(!graphPropertiesFilterRegex || item.prop.value.match(graphPropertiesFilterRegex)) {
                            if (!existingIds[item.value.value]) {
                                existingIds[item.value.value] = 1
                                var node = {
                                    id: item.value.value,
                                    label: item.valueLabel.value,
                                    shape: "square",
                                    color: color,
                                    size: Lineage_classes.defaultShapeSize,
                                    font: {multi: true, size: 10},
                                    data: {
                                        source: Lineage_common.currentSource,
                                        id: item.value.value,
                                        label: item.valueLabel.value,
                                    }
                                }
                                visjsData.nodes.push(node)
                            }
                            var propLabel
                            if (item.propLabel)
                                propLabel = item.propLabel.value
                            else
                                propLabel = Sparql_common.getLabelFromId(item.prop.value)
                            var edgeId = nodeData.id + "_" + item.value.value
                            var inverseEdgeId = item.value.value + "_" + nodeData.id
                            var arrows
                            if (propFilter == "outcoming")
                                arrows = {
                                    to: {
                                        enabled: true,
                                        type: Lineage_classes.defaultEdgeArrowType,
                                        scaleFactor: 0.5
                                    },
                                }
                            if (propFilter == "incoming")
                                arrows = {
                                    from: {
                                        enabled: true,
                                        type: Lineage_classes.defaultEdgeArrowType,
                                        scaleFactor: 0.5
                                    },
                                }

                            if (!existingIds[edgeId] && !existingIds[inverseEdgeId]) {
                                existingIds[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: nodeData.id,
                                    label: propLabel,
                                    font: {multi: true, size: 8},
                                    to: item.value.value,
                                    arrows: arrows
                                })
                            }

                        }
                    }

                })
                //console.log(JSON.stringify(distinctProps, null, 2))

                if (visjsGraph.data && visjsGraph.data.nodes) {
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                } else {
                    Lineage_classes.drawNewGraph(visjsData)
                }
            })

        }

        self.addParentsToGraph = function (nodeIds) {

            if (self.QuantumModelMapping) {
                var nodes = visjsGraph.data.nodes.getIds();
                var fixedNodes = []
                nodes.forEach(function (id) {
                    fixedNodes.push({id: id, fixed: true})
                })
                visjsGraph.data.nodes.update(fixedNodes);
            }

            MainController.UI.message("");

            var sourcesIdsMap = Lineage_classes.getGraphSourcesIdsMap(nodeIds)


            var sources = Object.keys(sourcesIdsMap)

            async.eachSeries(sources, function (source, callbackEach) {
                    if (false && source == MainController.currentSource)
                        return callbackEach();


                    Sparql_generic.getNodeParents(source, null, sourcesIdsMap[source], 2, {exactMatch: 1}, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        var map = [];
                        var ids = [];

                        if (result.length == 0) {

                            $("#waitImg").css("display", "none");
                            return MainController.UI.message("No data found")

                        }

                        var color = self.getSourceColor(source)
                        var visjsData = GraphController.toVisjsData(null, result, null, "concept", "broader1", {
                            from: {
                                shape: Lineage_classes.defaultShape,
                                size: Lineage_classes.defaultShapeSize,
                                color: color
                            },
                            to: {
                                shape: Lineage_classes.defaultShape,
                                size: Lineage_classes.defaultShapeSize,
                                color: color
                            },
                            data: {source: source},
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: Lineage_classes.defaultEdgeArrowType,
                                    scaleFactor: 0.5
                                },

                            },
                            edgeColor: Lineage_classes.defaultEdgeColor,

                        })


                        visjsGraph.data.nodes.add(visjsData.nodes)
                        visjsGraph.data.edges.add(visjsData.edges)

                        var existingNodes = visjsGraph.getExistingIdsMap();
                        var visjsData = {nodes: [], edges: []}
                        result.forEach(function (item) {
                            if (item.broader1 && !item.broader2) {
                                if (!existingNodes[source]) {
                                    existingNodes[source] = 1
                                    visjsData.nodes.push({
                                        id: source,
                                        label: source,
                                        data: {id:source,label:source,type:source,varName:"source "+source},
                                        shape: "box",
                                        color: self.getSourceColor(source)
                                    })
                                }


                                var edgeId = item.broader1.value + "_" + source

                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: item.broader1.value,
                                        to: source,
                                        arrows: "to"
                                    })
                                }
                            }
                        })
                        visjsGraph.data.nodes.add(visjsData.nodes)
                        visjsGraph.data.edges.add(visjsData.edges)
                        callbackEach();

                    })


                }, function (err) {
                    $("#waitImg").css("display", "none");
                    if (err)
                        return MainController.UI.message("No data found")
                    self.QuantumModelMapping = false;
                    visjsGraph.network.fit()
                    return MainController.UI.message("")
                }
            )

        }


        self.removeLastChildrenFromGraph = function (nodeId) {


            if (nodeId) {
                var children = visjsGraph.network.getConnectedNodes(nodeId, "to");
                visjsGraph.data.nodes.remove(children)


            } else {
                var source = Lineage_common.currentSource;
                if (expandedLevels[source].length > 0)
                    visjsGraph.data.nodes.remove(expandedLevels[source][expandedLevels[source].length - 1])
                expandedLevels[source].splice(expandedLevels[source].length - 1, 1)
                $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length)
            }

        }

        self.setGraphPopupMenus = function (node, event) {
            if (!node)
                return;
            graphContext.clickOptions = event
            var html = "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showNodeInfos();\">show node infos</span>" +
                "   <span  id='lineage_graphPopupMenuItem' class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawChildren();\"> draw children</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawParents();\"> draw parents</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawSimilars();\"> draw similars</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.hideChildren();\">hide children</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showObjectProperties();\">show ObjectProperties</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showRestrictions();\">show Restrictions</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.graphNodeNeighborhoodUI();\">graph node neighborhood</span>"


            if (node.id && node.id.indexOf("_cluster") > 0) {
                var html = ""
                if (node.data.cluster.length <= Lineage_classes.maxClusterOpeningLength)
                    html = "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.openCluster();\"> open cluster</span>"
                html += "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.listClusterContent();\"> list cluster content</span>"
                html += "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.listClusterToClipboard();\"> list to clipboard</span>"

            }

            if (Config.showAssetQueyMenu && node.data && node.data.source && Config.sources[node.data.source].ADLqueryController) {
                html += "    <span class=\"popupMenuItem\" onclick=\"ADLquery.showNodeProperties();\"> add to Asset Query</span>"
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
                //  if (!node.data.initialParams) {
                node.data.initialParams = {
                    shape: node.shape,
                    size: node.size,
                }
                //   }
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
            Sparql_generic.getNodeParents(nodeData.source, null, nodeData.id, ancestorsDepth, {skipRestrictions: 1}, function (err, result) {
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
                var upperNodeIds = [];
                var existingNodes = visjsGraph.getExistingIdsMap()
                result.forEach(function (item) {
                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1
                        visjsData.nodes.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            data: nodeData,
                            shape: Lineage_classes.defaultShape,
                            color: color,
                            size: Lineage_classes.defaultShapeSize
                        })
                    }
                    newNodeIds.push(item.concept.value)

                    var edgeId
                    for (var i = 1; i < ancestorsDepth; i++) {
                        if (item["broader" + i]) {
                            if (!existingNodes[item["broader" + i].value]) {
                                existingNodes[item["broader" + i].value] = 1
                                visjsData.nodes.push({
                                    id: item["broader" + i].value,
                                    label: item["broader" + i + "Label"].value,
                                    data: {
                                        source: nodeData.source,
                                        label: item["broader" + i + "Label"].value,
                                        id: item["broader" + i].value
                                    },
                                    shape: Lineage_classes.defaultShape,
                                    color: color,
                                    size: Lineage_classes.defaultShapeSize
                                })
                                newNodeIds.push(item["broader" + i].value)
                                var fromId;
                                if (i == 1)
                                    fromId = item.concept.value
                                else
                                    fromId = item["broader" + (i - 1)].value


                                edgeId = fromId + "_" + item["broader" + i].value;
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1

                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: item["broader" + i].value,
                                        to: fromId,
                                        data: {source: nodeData.source},
                                        color: Lineage_classes.defaultEdgeColor,
                                        arrows: {
                                            from: {
                                                enabled: true,
                                                type: Lineage_classes.defaultEdgeArrowType,
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
                                        color: Lineage_classes.defaultEdgeColor,
                                        arrows: {
                                            to: {
                                                enabled: true,
                                                type: Lineage_classes.defaultEdgeArrowType,
                                                scaleFactor: 0.5
                                            },
                                        },
                                    })
                                }
                                break;
                            }
                        } else {
                            /*    var id=item["broader" + (i-1)].value;
                                if(upperNodeIds.indexOf(id)<0) {
                                    upperNodeIds.push(id);

                                }*/
                        }
                    }
                })

                var existingNodes = visjsGraph.getExistingIdsMap()
                if (!existingNodes[nodeData.source]) {
                    visjsData.nodes.forEach(function (item) {

                    })

                }

                self.registerSource(nodeData.source)
                /*  expandedLevels[nodeData.source][expandedLevels[nodeData.source].length ].push(newNodeIds);*/

                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    self.drawNewGraph(visjsData)
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                }


                setTimeout(function () {
                    self.zoomGraphOnNode(nodeData.id)
                }, 500)
                $("#waitImg").css("display", "none");
                return MainController.UI.message("No data found")
            })
        }

        self.drawCfihosQuantumMapping = function (node, sources) {

            MainController.UI.message("")
            //   $("#Lineage_toSource").val("")

            var similars = [];
            if (!sources)
                sources = common.getAllsourcesWithType("OWL")
            if (!Array.isArray(sources))
                sources = [sources]


            var words = []
            var sourceItemsMap = {}
            var sourceIds = []
            if (!node) {


                var nodeObjs = visjsGraph.data.nodes.get()
                nodeObjs.forEach(function (item) {
                    sourceIds.push(item.id)//.replace("vocab#",""));
                    if (item.label && item.label.toLowerCase) {
                        words.push(item.label)
                        sourceItemsMap[item.label.toLowerCase()] = item.id

                    }
                })
            } else {
                words = [node.label]
                sourceIds.push(node.id)//.replace("vocab#",""));
            }

            var wordSlices = common.array.slice(words, Sparql_generic.slicesSize);

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
                            self.registerSource(source)


                        }
                        if (!expandedLevels[source])
                            expandedLevels[source] = []
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
                            size: Lineage_classes.defaultShapeSize,
                            data: item
                        })
                        visjsData.edges.push({
                            from: sourceItemsMap[item.label.toLowerCase()],
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
                visjsGraph.network.fit()
                $("#waitImg").css("display", "none");


            })


        }

        self.getGraphSourcesIdsMap = function (nodeIds) {
            if (!visjsGraph.data || !visjsGraph.data.nodes)
                return
            var nodes = visjsGraph.data.nodes.get();
            var sourcesIdsMap = {}
            nodes.forEach(function (node) {
                if (!nodeIds || nodeIds.indexOf(node.id)) {
                    if (self.QuantumModelMapping) {

                        var source = common.quantumModelmappingSources[node.id]
                        if (!source)
                            return;
                        if (!sourcesIdsMap[source]) {
                            sourcesIdsMap[source] = []
                        }
                        sourcesIdsMap[source].push(node.id)

                    } else if (node.data && node.data.source) {
                        var source = node.data.source
                        if (!source)
                            return;
                        if (!sourcesIdsMap[source]) {
                            sourcesIdsMap[source] = []
                        }
                        sourcesIdsMap[source].push(node.id)
                    } else {

                        ;//  console.log ("no source ")
                    }

                }

            })

            return sourcesIdsMap;

        }


        self.graphActions = {

            showGraphPopupMenu: function (node, point, event) {
                if (node.from) {
                    self.currentGraphEdge = node;
                    if (!self.currentGraphEdge.data.propertyId)
                        return;
                    MainController.UI.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge.data.propertyId, "mainDialogDiv")
                } else {
                    self.setGraphPopupMenus(node, event)
                    self.currentGraphNode = node;
                    MainController.UI.showPopup(point, "graphPopupDiv")
                }

            },

            onNodeClick: function (node, point, options) {
                if (!node)
                    return MainController.UI.hidePopup("graphPopupDiv")

                self.currentGraphNode = node;
                if (options.ctrlKey) {
                    MainController.UI.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv")
                }
                if (options.dbleClick) {
                    Lineage_classes.addChildrenToGraph([self.currentGraphNode.id], self.currentGraphNode.data.source)
                }


            },
            drawChildren: function () {

                Lineage_classes.addChildrenToGraph([self.currentGraphNode.id], self.currentGraphNode.data.source)
            },
            drawParents: function () {
                Lineage_classes.addParentsToGraph([self.currentGraphNode.id])
            },

            drawSimilars: function () {
                var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey
                Lineage_classes.drawSimilarsNodes(self.currentGraphNode, null, descendantsAlso)
            },
            hideChildren: function () {
                Lineage_classes.removeLastChildrenFromGraph(self.currentGraphNode.id)
            }
            , openCluster: function () {
                Lineage_classes.openCluster(self.currentGraphNode)

            },
            listClusterToClipboard: function () {
                Lineage_classes.listClusterToClipboard(self.currentGraphNode)

            },
            listClusterContent: function () {
                Lineage_classes.listClusterContent(self.currentGraphNode)

            },


            showNodeInfos: function () {
                MainController.UI.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv")
            },

            graphNodeNeighborhood: function (filter) {
                Lineage_classes.graphNodeNeighborhood(self.currentGraphNode.data, filter)
            },

            graphNodeNeighborhoodUI: function () {
                var html = " <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.graphNodeNeighborhood('incoming');\">incoming</span>"
                html += " <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.graphNodeNeighborhood('outcoming');\">outcoming</span>"
                html += " <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.graphNodeNeighborhood('ranges');\">ranges</span>"

                $("#graphPopupDiv").html(html)
                setTimeout(function () {
                    $("#graphPopupDiv").css("display", "flex")
                }, 100)

            },
            showObjectProperties: function () {
                var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey
                Lineage_classes.drawObjectProperties([self.currentGraphNode.id], descendantsAlso)
            },
            showRestrictions :function() {
                var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey
                Lineage_classes.drawRestrictions([self.currentGraphNode.id], descendantsAlso)
            }
        }

        self.getSourceColor = function (source, palette) {
            if (!palette)
                palette = "paletteIntense"
            if (!sourceColors[source])
                sourceColors[source] = common[palette][Object.keys(sourceColors).length]
            return sourceColors[source];
        }
        self.getPropertyColor = function (propertyName, palette) {
            if (!palette)
                palette = "paletteIntense"
            if (!propertyColors[propertyName])
                propertyColors[propertyName] = common[palette][Object.keys(propertyColors).length]
            return propertyColors[propertyName];
        }


        self.registerSource = function (source) {

            var id = "Lineage_source_" + encodeURIComponent(source)
            if (document.getElementById(id) !== null)
                return;

            expandedLevels[source] = []
            var html = "<div  id='" + id + "' style='color: " + self.getSourceColor(source) + "'" +
                " class='Lineage_sourceLabelDiv' " +
                "onclick='Lineage_classes.setCurrentSource(\"" + encodeURIComponent(source) + "\")'>" + source + "</div>"
            $("#lineage_drawnSources").append(html)
            //  self.setCurrentSource(encodeURIComponent(source))


        }
        self.setCurrentSource = function (sourceId) {

            $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv")
            $("#Lineage_source_" + sourceId).addClass("Lineage_selectedSourceDiv")
            Lineage_common.currentSource = encodeURIComponent(sourceId)


        }
        self.drawGraph = function (typeId) {


        }

        self.onPlusButton = function () {


        }

        return self;


    }
)
()

