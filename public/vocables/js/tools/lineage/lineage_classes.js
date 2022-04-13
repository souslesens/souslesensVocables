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
        self.showLimit = 200

        var graphContext = {}
        self.propertyColors = {}
        self.defaultShape = "dot";
        self.defaultShapeSize = 5;
        self.orphanShape = "square";
        self.nodeShadow = true;
        self.objectPropertyColor = "red"
        self.defaultEdgeArrowType = "triangle"
        self.defaultEdgeColor = "#aaa"
        self.restrictionColor = "orange"
        self.namedIndividualShape = "triangle"
        self.namedIndividualColor = "blue"
        self.sourcesGraphUriMap = {}

        self.maxChildrenDrawn = 30;
        self.soucesLevelMap = {}
        self.mainSource = null;
        self.isLoaded = false
        self.currentExpandLevel = 1


        self.onLoaded = function (callback) {
            if (self.isLoaded)
                ; // return;
            self.isLoaded = true


            $("#sourceDivControlPanelDiv").html("")
            Lineage_common.currentSource = null;


            MainController.UI.openRightPanel()

            $("#actionDivContolPanelDiv").load("snippets/lineage/lineage.html", function () {
                $("#rightPanelDiv").load("snippets/lineage/lineageRightPanel.html", function () {

                    $("#GenericTools_searchSchemaType").val("OWL")

                    $("#lineage_controlPanel0Div").css("display", "block")
                    $("#lineage_controlPanel1Div").css("display", "none")
                    $("#GenericTools_onSearchCurrentSourceInput").css("display", "block")


                    var h1 = $("#sourceDivControlPanelDiv").height()
                    var h2 = $("#sourcesPanel").height()
                    //   $("#sourcesTreeDivContainer").height(h2 - h1)
                    var sourceLabels = []
                    SourceBrowser.currentTargetDiv = "LineagejsTreeDiv"
                    MainController.UI.showSources("sourcesTreeDiv", false)

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

                    for (var sourceLabel in Config.sources) {
                        var graphUri = Config.sources[sourceLabel].graphUri
                        if (graphUri && graphUri != "")
                            self.sourcesGraphUriMap[graphUri] = Config.sources[sourceLabel]
                    }
                    $("#GenericTools_searchSchemaType").val("OWL")


                    self.graphDecoration.init()
                    if (callback)
                        callback()

                })
            })

        }


        self.onSourceSelect = function (sourceLabel, event) {
            if (!sourceLabel)
                return

            if (event.button == 0)// except context menu
                self.initUI()
            // visjsGraph.clearGraph()

            self.mainSource = sourceLabel
            if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[self.mainSource].editable > -1) {
                $("#lineage_blendButtonsDiv").css("display", "block")
            } else {
                $("#lineage_blendButtonsDiv").css("display", "none")
            }
            $("#accordion").accordion("option", {active: 2});
            MainController.currentSource = sourceLabel
            if (!Lineage_common.currentSource) {

                Lineage_classes.drawTopConcepts(sourceLabel, function (err) {
                    if (err)
                        return MainController.UI.message(err)
                    SourceBrowser.showThesaurusTopConcepts(sourceLabel, {targetDiv: "LineagejsTreeDiv"})
                })
            }
            $("#Lineage_sourceLabelDiv").html(sourceLabel)


            var schemaType = Config.sources[sourceLabel].schemaType
            $("#GenericTools_searchSchemaType").val(schemaType)

            $("#lineage_sourceNodeDiv").html("")
            $("#lineage_targetNodeDiv").html("")
            //  self.registerSource(sourceLabel)
            propertyColors = {}

            Lineage_common.currentSource = sourceLabel;
            MainController.currentSource = sourceLabel

            setTimeout(function () {

                var wikiUrl = Config.wiki.url + "Source " + sourceLabel
                var str = "<a href='" + wikiUrl + "' target='_blank'>" + "Wiki page..." + "</a>"
                $("#lineage_sourceDescriptionDiv").html(str)
                self.registerSourceImports(sourceLabel)

                if (!self.mainSource) {
                    self.initUI();
                }

                Lineage_relations.init()


            })
        }


        self.onGraphOrTreeNodeClick = function (node, nodeEvent, options) {
            if (!Config.sources[node.data.source])
                return;
            if (!options)
                options = {}

            if (nodeEvent.ctrlKey && nodeEvent.shiftKey) {
                if (options.callee == "Graph")
                    Lineage_classes.graphActions.graphNodeNeighborhood("all")
                else if (options.callee == "Tree")
                    Lineage_classes.drawNodeAndParents(node.data)
            } else if (nodeEvent.ctrlKey && nodeEvent.altKey) {
                if (node.from) {//edge
                    Lineage_blend.deleteRestriction(node)
                } else {
                    Lineage_blend.addNodeToAssociationNode(node, "source", true)
                }
            } else if (nodeEvent.shiftKey && nodeEvent.altKey) {
                Lineage_blend.addNodeToAssociationNode(node, "target")

            } else if (nodeEvent.ctrlKey) {
                SourceBrowser.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv", {resetVisited: 1})
            } else if (nodeEvent.altKey && options.callee == "Tree") {
                SourceBrowser.openTreeNode(SourceBrowser.currentTargetDiv, node.data.source, node, {reopen: true})
            } else
                return nodeEvent;

            return null;


        }


        self.jstreeContextMenu = function () {
            var items = {}

            items.drawTopConcepts = {
                label: "draw taxonomy",
                action: function (e) {// pb avec source
                    $("#Lineage_topClassesRadio").prop("checked", true)
                    Lineage_classes.drawTopConcepts(null, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)
                        SourceBrowser.showThesaurusTopConcepts(Lineage_common.currentSource, {targetDiv: "LineagejsTreeDiv"})
                        //   self.showThesaurusTopConcepts()
                    })

                }
            }
            items.addSimilarlabels = {
                label: "add similars (label)",
                action: function (e) {
                    Lineage_classes.drawSimilarsNodes("sameLabel")

                }
            }
            /*   items.addSameAs = {
                   label: "add similars (sameAs)",
                   action: function (e) {
                       Lineage_classes.drawSimilarsNodes("sameAs")

                   }
               }*/
            items.wikiPage = {
                label: "Wiki page",
                action: function (e) {

                    SourceBrowser.showWikiPage(Lineage_common.currentSource)

                }
            }


            return items;

        }


        self.selectTreeNodeFn = function (event, propertiesMap) {
            SourceBrowser.currentTreeNode = propertiesMap.node;
            self.currentTreeNode = propertiesMap.node;
            var data = propertiesMap.node.data;
            if (event.which == 3)
                return;
            if (self.onGraphOrTreeNodeClick(self.currentTreeNode, propertiesMap.event, {callee: "Tree"}) != null) {
                if (Config.sources[data.source].schemaType == "INDIVIDUAL") {
                    return KGquery.showJstreeNodeChildren(SourceBrowser.currentTargetDiv, propertiesMap.node)
                } else
                    setTimeout(function () {
                        SourceBrowser.openTreeNode(SourceBrowser.currentTargetDiv, data.source, propertiesMap.node, {ctrlKey: propertiesMap.event.ctrlKey})
                    }, 200)
                // return SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv")
            }


        }
        self.initUI = function () {
            MainController.UI.message("")
            visjsGraph.clearGraph()
            expandedLevels = {}
            $("#lineage_drawnSources").html("");
            $("#LineagejsTreeDiv").empty()
            $("#Lineage_classes_graphDecoration_legendDiv").html("")
            if (self.mainSource) {
                self.registerSourceImports(self.mainSource)
                SourceBrowser.showThesaurusTopConcepts(self.mainSource)
            }


        }

        self.clearLastAddedNodes = function () {
            var nodes = visjsGraph.lastAddedNodes
            if (nodes && nodes.length > 0)
                visjsGraph.data.nodes.remove(nodes)
        }


        self.drawTopConcepts = function (source, callback) {
            self.currentExpandLevel = 1


            if (!source)
                source = Lineage_common.currentSource
            if (!source)
                source = self.mainSource
            if (!source)
                return;


            if (!Config.sources[source])
                return
            //  Lineage_common.currentSource = source;
            self.soucesLevelMap[source] = {visible: true, children: 0}

            var allSources = []


            //  self.registerSource(source)


            var visjsData = {nodes: [], edges: []}
            var existingNodes = visjsGraph.getExistingIdsMap();
            var imports = Config.sources[source].imports;
            var importGraphUrisMap = {}

            if (Config.Lineage.showSourceNodesInGraph) {
                if (!existingNodes[source]) {
                    existingNodes[source] = 1
                    var sourceNode = {
                        id: source,
                        label: source,
                        shadow: self.nodeShadow,
                        shape: "box",
                        size: Lineage_classes.defaultShapeSize,
                        color: self.getSourceColor(source),
                        data: {source: source},
                        level: 1,

                    }
                    visjsData.nodes.push(sourceNode)
                }
            }
            if (imports) {

                imports.forEach(function (importedSource) {
                    if (false)
                        allSources.push(importedSource)

                    self.soucesLevelMap[importedSource] = {visible: true, children: 0}
                    var graphUri = Config.sources[importedSource].graphUri
                    var color = self.getSourceColor(importedSource)
                    if (!graphUri)
                        return;
                    if (Config.Lineage.showSourceNodesInGraph) {
                        if (!existingNodes[importedSource]) {
                            existingNodes[importedSource] = 1
                            var importedSourceNode = {
                                id: importedSource,
                                label: importedSource,
                                shadow: self.nodeShadow,
                                shape: "box",
                                level: 1,
                                size: Lineage_classes.defaultShapeSize,
                                data: {source: importedSource},
                                color: color

                            }
                            importGraphUrisMap[graphUri] = importedSource

                            visjsData.nodes.push(importedSourceNode)
                        }


                        var edgeId = importedSource + "_" + source
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            var edge = {
                                id: edgeId,
                                from: importedSource,
                                to: source,
                                arrows: " middle",
                                color: color,
                                width: 6
                            }
                            visjsData.edges.push(edge)
                        }
                    }
                    //  self.registerSource(importedSource)
                })

            }

            self.currentExpandLevel += 1
            allSources.push(source)
            async.eachSeries(allSources, function (source, callbackEach) {
                var depth = parseInt($("#Lineage_topDepth").val())
                var sourceConfig = Config.sources[source]

                MainController.UI.message("loading source " + source)
                var options = {withoutImports: true}
                Sparql_generic.getTopConcepts(source, options, function (err, result) {
                    if (err)
                        return callbackEach(err)
                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");
                        return callbackEach()


                    }
                    if (result.length > self.showLimit) {
                        //   $("#graphDiv").html("<div style='margin:10px'><span style='font-weight: bold;color:saddlebrown'> too may nodes (" + result.length + ")  .Cannot display the graph, </span><i>select and graph a node or a property to start graph exploration</i></div>")
                        MainController.UI.message("too may nodes (" + result.length + ")  .Cannot display the graph, select and graph a node or a property ")

                        if (callback)
                            return callback("too may nodes")
                        return;
                    }
                    var ids = []
                    result.forEach(function (item) {
                        ids.push(item.topConcept.value)
                    })
                    if (!expandedLevels[source])
                        expandedLevels[source] = []
                    expandedLevels[source].push(ids);
                    $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length)

                    var shape = self.defaultShape;
                    result.forEach(function (item) {
                        if (!existingNodes[item.topConcept.value]) {
                            existingNodes[item.topConcept.value] = 1
                            var node = {
                                id: item.topConcept.value,
                                label: item.topConceptLabel.value,
                                shadow: self.nodeShadow,
                                shape: shape,
                                color: self.getSourceColor(source, item.topConcept.value),
                                size: Lineage_classes.defaultShapeSize,
                                level: self.currentExpandLevel,
                                data: {
                                    source: source,
                                    label: item.topConceptLabel.value,
                                    id: item.topConcept.value
                                },
                            }
                            visjsData.nodes.push(node)

                            //link node to source

                            if (Config.Lineage.showSourceNodesInGraph) {
                                var edgeId = item.topConcept.value + "_" + source
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1
                                    var edge = {
                                        id: edgeId,
                                        from: item.topConcept.value,
                                        to: source
                                    }
                                    visjsData.edges.push(edge)
                                }
                            }

                        }
                    })

                    callbackEach()


                })
            }, function (err, result) {
                if (err) {
                    if (callback)
                        return callback(err)
                    return alert(err);
                }
                //   MainController.UI.message("", true)
                //  self.drawNewGraph(visjsData);
                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    self.drawNewGraph(visjsData)
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    visjsGraph.network.fit()
                }
                $("#waitImg").css("display", "none");
                if (callback)
                    return callback()


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

                },
                onAddNodeToGraph: function (properties, senderId) {
                    self.graphDecoration.colorGraphNodesByType()
                }
                // onHoverNodeFn:Lineage_classes.graphActions.onHoverNodeFn
                //   layoutHierarchical: {direction: "LR", sortMethod: "directed"}

            }


            visjsGraph.draw("graphDiv", visjsData, options, function () {
                Lineage_classes.graphDecoration.colorGraphNodesByType()
            })

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
            self.addChildrenToGraph(source, sourceNodes)

        }


        self.listClusterToClipboard = function (clusterNode) {
            var text = "";
            clusterNode.data.cluster.forEach(function (item, index) {
                text += item.child + "," + item.childLabel + "\n"
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
                    id: item.child, text: item.childLabel, parent: "#",
                    data: {source: clusterNode.data.source, id: item.child, label: item.childLabel}
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
            if (clusterNode.data.cluster.length > self.showLimit) {
                self.listClusterToClipboard(clusterNode)
                return alert("cluster content copied to clipboard( too large to draw)")
            }

            var color = self.getSourceColor(clusterNode.data.source)
            var visjsData = {nodes: [], edges: []}
            var existingNodes = visjsGraph.getExistingIdsMap()
            clusterNode.data.cluster.forEach(function (item) {
                if (!existingNodes[item.child1]) {
                    existingNodes[item.child1] = 1
                    visjsData.nodes.push({
                        id: item.child1,
                        label: item.child1Label,
                        shadow: self.nodeShadow,
                        shape: Lineage_classes.defaultShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: color,
                        data: {
                            id: item.child1,
                            label: item.child1Label,
                            source: clusterNode.data.source
                        }
                    })

                    var edgeId = item.child1 + "_" + item.concept;
                    visjsData.edges.push({
                        id: edgeId,
                        from: item.child1,
                        to: item.concept
                    })

                }

            })


            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)
            visjsGraph.network.fit()
            visjsGraph.data.nodes.remove(clusterNode.id)
            $("#waitImg").css("display", "none");
            MainController.UI.message("")


        }


        self.drawSimilarsNodes = function (similarType, node, sources, descendantsAlso) {
            var fromSource = null;
            var toSources = Lineage_common.currentSource;
            var nodes = visjsGraph.data.nodes.get()
            var labels = [];
            var ids = null;
            var labelsMap = {}
            nodes.forEach(function (node) {
                if (node.data && node.data.label)
                    labels.push(node.data.label)
                labelsMap[node.data.label] = node
            })

            SearchUtil.getSimilarLabelsInSources(fromSource, toSources, labels, ids, "exactMatch", null, function (err, result) {
                if (err)
                    return alert(err);


                var existingNodes = visjsGraph.getExistingIdsMap()
                var visjsData = {nodes: [], edges: []}
                result.forEach(function (item) {
                    var sourceNode = labelsMap[item.label]
                    for (var source in item.matches) {

                        item.matches[source].forEach(function (match) {


                            if (match.id == sourceNode.id)
                                return;
                            if (!existingNodes[match.id]) {
                                existingNodes[match.id] = 1
                                var color = self.getSourceColor(source)
                                visjsData.nodes.push({
                                    id: match.id,
                                    label: match.label,
                                    color: color,
                                    shadow: self.nodeShadow,
                                    shape: "dot",
                                    size: Lineage_classes.defaultShapeSize,
                                    data: {
                                        id: match.id,
                                        label: match.label,
                                        source: source
                                    }
                                })
                            }

                            var edgeId = match.id + "_" + sourceNode.id + "_sameLabel";
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: match.id,
                                    to: sourceNode.data.id,
                                    color: "green",
                                    width: 3,
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: "curve",
                                        },
                                        from: {
                                            enabled: true,
                                            type: "curve",
                                        },
                                        length: 30,

                                    },
                                    data: {
                                        type: "sameLabel",
                                        from: match.id,
                                        to: sourceNode.id,
                                        fromSource: source,
                                        toSource: sourceNode.data.source,
                                    }

                                })


                            }

                        })
                    }
                })
                if (visjsData.edges.length > 0) {
                    $("#transformSameLabelsEdgesIntoSameAsRelationsButton").css("display", "block")
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                }
            })
            MainController.UI.message("", true)


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
                            propLabel = Sparql_common.getLabelFromURI(item.prop.value)
                        var rangeLabel
                        if (item.rangeLabel)
                            rangeLabel = item.rangeLabel.value
                        else
                            rangeLabel = Sparql_common.getLabelFromURI(item.range.value)
                        labelStr += "<i>" + propLabel + " : </i>" + rangeLabel + "\n"

                    })
                    var color = Lineage_classes.getSourceColor(Lineage_common.currentSource)
                    if (!existingIds[nodeData.id]) {
                        existingIds[nodeData.id] = 1
                        var node = {
                            id: nodeData.id,
                            label: nodeData.label,
                            shadow: self.nodeShadow,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: Lineage_classes.getSourceColor(Lineage_common.currentSource, nodeData.id),
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
                            shadow: self.nodeShadow,
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

            if (propFilter == "outcoming" || propFilter == "all")
                query += "?ids ?prop ?value.  ";
            // query += "<" + nodeData.id + "> ?prop ?value.  ";
            else if (propFilter == "incoming")
                query += " ?value ?prop ?ids.  ";
            var ids = [nodeData.id]

            //   ids= visjsGraph.getNodeDescendantIds(nodeData.id, true)
            var filter = Sparql_common.setFilter("ids", ids)
            query += filter

            query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} "
            query += "}"
            var url = sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: Lineage_common.currentSource}, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "value"])
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
                        shadow: self.nodeShadow,
                        shape: Lineage_classes.defaultShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: Lineage_classes.getSourceColor(Lineage_common.currentSource, nodeData.id),
                        font: {multi: true, size: 10},
                        level: 5,
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
                    if (true) {
                        if (!distinctProps[item.prop.value])
                            distinctProps[item.prop.value] = 1
                        if (!item.prop.value.match(/rdf|owl|skos/) || item.prop.value.indexOf("sameAs") > -1 || item.prop.value.indexOf("partOf") > -1) {
                            // if (item.prop.value.indexOf("rdf") < 0 && item.prop.value.indexOf("owl") < 0) {
                            //  if(!graphPropertiesFilterRegex || item.prop.value.match(graphPropertiesFilterRegex)) {
                            if (!existingIds[item.value.value]) {
                                existingIds[item.value.value] = 1
                                var node = {
                                    id: item.value.value,
                                    label: item.valueLabel.value,
                                    shadow: self.nodeShadow,
                                    shape: "square",
                                    color: Lineage_classes.getSourceColor(Lineage_common.currentSource, item.value.value),
                                    size: Lineage_classes.defaultShapeSize,
                                    font: {multi: true, size: 10},
                                    level: 5,
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
                                propLabel = Sparql_common.getLabelFromURI(item.prop.value)
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
                                    to: {
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

                if (visjsGraph.isGraphNotEmpty()) {
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                } else {
                    Lineage_classes.drawNewGraph(visjsData)
                }
                if (propFilter == "all") {
                    self.graphNodeNeighborhood(nodeData, "incoming")
                    self.drawRestrictions(Lineage_common.currentSource, ids, true)

                }
            })

        }

        self.addParentsToGraph = function (source, nodeIds, callback) {

            if (!nodeIds) {
                if (!source)
                    source = Lineage_common.currentSource
                if (!source)
                    return alert("select a source");
                nodeIds = self.getGraphIdsFromSource(source)

            }
            MainController.UI.message("");

            var sources = [source]

            var slices = common.array.slice(nodeIds, 100)

            async.eachSeries(slices, function (slice, callbackEach) {
                    Sparql_generic.getNodeParents(source, null, slice, 2, {exactMatch: 1}, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        var map = [];
                        var ids = [];

                        if (result.length == 0) {

                            $("#waitImg").css("display", "none");
                            return MainController.UI.message("No data found")

                        }

                        var color = self.getSourceColor(source)

                        var existingNodes = visjsGraph.getExistingIdsMap()
                        var visjsData = {nodes: [], edges: []}
                        var shape = self.defaultShape
                        result.forEach(function (item) {
                            if (item.broader1) {
                                if (!existingNodes[item.broader1.value]) {
                                    existingNodes[item.broader1.value] = 1
                                    var node = {
                                        id: item.broader1.value,
                                        label: item.broader1Label.value,
                                        shadow: self.nodeShadow,
                                        shape: shape,
                                        color: self.getSourceColor(source, item.broader1.value),
                                        size: Lineage_classes.defaultShapeSize,
                                        data: {
                                            source: source,
                                            label: item.broader1Label.value,
                                            id: item.broader1.value
                                        },
                                    }

                                    visjsData.nodes.push(node)
                                }
                                //link node to source

                                if (item.broader1.value != source) {
                                    var edgeId = item.concept.value + "_" + item.broader1.value
                                    if (!existingNodes[edgeId]) {
                                        existingNodes[edgeId] = 1
                                        var edge = {
                                            id: edgeId,
                                            from: item.concept.value,
                                            to: item.broader1.value
                                        }
                                        visjsData.edges.push(edge)
                                    }
                                }
                            }


                        })

                        if (visjsGraph.isGraphNotEmpty()) {
                            visjsGraph.data.nodes.add(visjsData.nodes)
                            visjsGraph.data.edges.add(visjsData.edges)
                        } else {
                            Lineage_classes.drawNewGraph(visjsData)
                        }
                        callbackEach()
                    })


                }, function (err) {
                    $("#waitImg").css("display", "none");
                    if (err) {
                        if (callback)
                            return callback(err)
                        return MainController.UI.message("No data found")

                    }
                    visjsGraph.network.fit()
                    if (callback)
                        callback()
                    return MainController.UI.message("", true)
                }
            )


        }
        self.addChildrenToGraph = function (source, nodeIds, options) {
            self.showHideCurrentSourceNodes(true)
            var parentIds
            if (!source) {

                if (Lineage_common.currentSource)
                    source = Lineage_common.currentSource;
                else
                    return alert("select a source")
            }

            if (nodeIds) {

                var parentIds = nodeIds;// visjsGraph.getNodeDescendantIds(nodeIds, true)


            } else {


                var parentIds = []
                var nodes = visjsGraph.data.nodes.get();
                nodes.forEach(function (node) {
                    if ((source == Lineage_common.currentSource || node.data && node.data.source == source) && node.data.id && node.data.id != source) {
                        parentIds.push(node.data.id)
                    }
                })

            }
            if (parentIds.length == 0)
                return MainController.UI.message("no parent node selected")

            MainController.UI.message("")
            if (!options)
                options = {}
            if (self.currentOwlType == "ObjectProperty")
                options.owlType = "ObjectProperty"
            var depth = 1;
            if (options.depth)
                depth = options.depth
            Sparql_generic.getNodeChildren(source, null, parentIds, depth, {skipRestrictions: 1}, function (err, result) {
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
                    map[item.concept.value].push({
                        concept: item.concept.value,
                        conceptLabel: item.conceptLabel.value,
                        child1: item.child1.value,
                        child1Label: item.child1Label.value,
                        child2: item.child2 ? item.child2.value : null,
                        child2Label: item.child2Label ? item.child2Label.value : null,

                        child3: item.child3 ? item.child3.value : null,
                        child3Label: item.child3Label ? item.child3Label.value : null,
                    })
                    ids.push(item.child1.value)


                })


                var existingNodes = visjsGraph.getExistingIdsMap(true);
                var visjsData = {nodes: [], edges: []}
                self.currentExpandLevel += 1
                var expandedLevel = []
                for (var key in map) {

                    //check if cluster is already open
                    var cancelCluster = true
                    map[key].forEach(function (item) {
                        if (existingNodes[item.child1])
                            cancelCluster = true
                    })


                    if (!cancelCluster && map[key].length > Lineage_classes.maxChildrenDrawn && !options.dontClusterNodes) {
                        //on enleve les cluster du dernier bootomIds dsiono on cree des orphelins au niveau suivant


                        var nodeId = key + "_cluster"
                        if (!existingNodes[nodeId]) {
                            existingNodes[nodeId] = 1
                            visjsData.nodes.push({
                                id: key + "_cluster",
                                label: map[key].length + "children",
                                shadow: self.nodeShadow,
                                shape: "star",
                                size: Lineage_classes.defaultShapeSize,
                                value: map[key].length,
                                color: color,
                                level: self.currentExpandLevel,
                                data: {
                                    cluster: map[key],
                                    id: key + "_cluster",
                                    label: "CLUSTER : " + map[key].length + "children",
                                    source: source,
                                    parent: key,
                                    varName: key + "_cluster"
                                }//graphLevel:self.soucesLevelMap[source].children}
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
                        var varName = "child"
                        map[key].forEach(function (item) {

                            var nodeSource = source;
                            var shape = Lineage_classes.defaultShape
                            var shapeSize = Lineage_classes.defaultShapeSize


                            expandedLevel.push(item.id)

                            for (var i = 1; i < 4; i++) {
                                if (item["child" + i]) {
                                    if (!existingIds[item["child" + i]]) {
                                        existingIds[item["child" + i]] = 1;
                                        visjsData2.nodes.push({
                                            id: item["child" + i],
                                            label: item["child" + i + "Label"],
                                            shadow: self.nodeShadow,
                                            shape: shape,
                                            size: shapeSize,
                                            level: self.currentExpandLevel,
                                            color: self.getSourceColor(nodeSource, item.id),

                                            data: {
                                                id: item["child" + i],
                                                label: item["child" + i + "Label"],
                                                source: nodeSource,
                                            }
                                        })
                                    }
                                    var parent
                                    if (i == 1)
                                        parent = item.concept;
                                    else
                                        parent = item["child" + (i - 1)]
                                    var edgeId = item["child" + i] + "_" + parent
                                    var inverseEdge = parent + "_" + item["child" + i]
                                    if (!existingIds[edgeId] && !existingIds[inverseEdge]) {
                                        existingIds[edgeId] = 1
                                        visjsData2.edges.push({
                                            id: edgeId,
                                            to: parent,
                                            from: item["child" + i],
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
                                }
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


                $("#waitImg").css("display", "none");


            })
        }
        self.drawIndividualsProperties = function (propertyId, classIds, options) {
            if (!options) {
                options = {}
            }
            self.currentExpandLevel += 1
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
                            shadow: self.nodeShadow,
                            shape: "dot",
                            level: self.currentExpandLevel,
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
                            shadow: self.nodeShadow,
                            shape: "dot",
                            level: self.currentExpandLevel,
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

        self.drawObjectProperties = function (source, classIds, descendantsAlso) {
            if (!classIds) {
                if (!source)
                    source = Lineage_common.currentSource
                if (!source)
                    return alert("select a source");
                classIds = self.getGraphIdsFromSource(source)

            }
            if (classIds == "all")
                classIds = null


            Sparql_OWL.getObjectProperties(source, classIds, {
                withoutImports: 1,
                addInverseRestrictions: 1
            }, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                if (result.length == 0) {
                    $("#waitImg").css("display", "none");

                    return MainController.UI.message("No data found")

                }
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                var color = self.getSourceColor(source)
                self.currentExpandLevel += 1
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
                            shadow: self.nodeShadow,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: self.getSourceColor(source, item.range.value),
                            level: self.currentExpandLevel,
                            data: {
                                source: source,
                                id: item.range.value,
                                label: item.rangeLabel.value,
                                varName: "range"
                            }
                        })

                    }
                    if (!item.domain) {
                        item.domain = {value: "?"}
                    }
                    if (!item.range) {
                        item.range = {range: "?"}
                    }

                    var edgeId = item.domain.value + "_" + item.range.value + "_" + item.prop.value
                    var edgeIdInv = item.range.value + "_" + item.range.value + "_" + item.prop.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        if (!existingNodes[edgeIdInv]) {
                            existingNodes[edgeIdInv] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.range.value,
                                to: item.domain.value,
                                label: "<i>" + item.propLabel.value + "</i>",
                                data: {propertyId: item.prop.value, source: source},
                                font: {multi: true, size: 10},
                                // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                                //   physics:false,
                                arrows: {
                                    from: {
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
                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    self.drawNewGraph(visjsData)
                }
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                visjsGraph.network.fit()
                $("#waitImg").css("display", "none");


            })

        }


        self.drawRestrictions = function (source, classIds, descendants, withoutImports, options) {
            if (!options)
                options = {}
            if (!classIds) {
                if (!source)
                    source = Lineage_common.currentSource
                if (!source)
                    return alert("select a source");
                classIds = self.getGraphIdsFromSource(source)

            }
            if (classIds == "all")
                classIds = null

            MainController.UI.message("")

            Sparql_OWL.getObjectRestrictions(source, classIds, {
                withoutImports: withoutImports || self.withoutImports,
                addInverseRestrictions: 1
            }, function (err, result) {

                if (err)
                    return MainController.UI.message(err)


                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                var isNewGraph = false;
                if (Object.keys(existingNodes).length > 0)
                    isNewGraph = true
                var color = self.getSourceColor(source)
                //  console.log(JSON.stringify(result, null, 2))
                self.currentExpandLevel += 1

                var shape = Lineage_classes.defaultShape;
                var size = Lineage_classes.defaultShapeSize
                result.forEach(function (item) {


                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1;
                        var color = self.getSourceColor(source)

                        var size = Lineage_classes.defaultShapeSize
                        visjsData.nodes.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            shadow: self.nodeShadow,
                            shape: shape,
                            size: size,

                            color: color,
                            level: self.currentExpandLevel,
                            data: {
                                source: source,
                                id: item.concept.value,
                                label: item.conceptLabel.value,
                                varName: "value",

                            }
                        })

                    }


                    var color
                    var size = self.defaultShapeSize
                    if (!item.value) {
                        color = "#ddd"
                        item.value = {value: "?_" + item.prop.value}
                        item.valueLabel = {value: "any"}
                        shape = "text"
                        size = 3
                    } else {
                        color = self.getSourceColor(source, item.value.value);
                    }
                    if (!item.valueLabel) {
                        item.valueLabel = {value: ""}
                        size = 3
                    }
                    if (!existingNodes[item.value.value]) {
                        existingNodes[item.value.value] = 1;
                        visjsData.nodes.push({
                            id: item.value.value,
                            label: item.valueLabel.value,
                            shadow: self.nodeShadow,
                            shape: shape,
                            size: size,

                            color: color,
                            level: self.currentExpandLevel,
                            data: {
                                source: source,
                                id: item.value.value,
                                label: item.valueLabel.value,
                                varName: "value",

                            }
                        })

                    }
                    var edgeId = item.value.value + "_" + item.concept.value + "_" + item.prop.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.value.value,
                            to: item.concept.value,
                            label: "<i>" + item.propLabel.value + "</i>",
                            data: {propertyId: item.prop.value, bNodeId: item.node.value, source: source},
                            font: {multi: true, size: 10},
                            // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                            //   physics:false,
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: "solid",
                                    scaleFactor: 0.5
                                },
                            },
                            dashes: true,
                            color: Lineage_classes.restrictionColor

                        })
                    }

                })

                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    self.drawNewGraph(visjsData)
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    visjsGraph.network.fit()
                }
                CustomPluginController.setGraphNodesIcons()
                $("#waitImg").css("display", "none");


                if (options.processorFn) {
                    options.processorFn(result)
                }
            })


        }

        self.drawDictionarySameAs = function () {

            function processMetadata(restrictionNodes) {
                var restrictionIds = [];
                restrictionNodes.forEach(function (bNode) {
                    restrictionIds.push(bNode.node.id)
                })
                var options = {
                    includeBlankNodes: 1,
                    filter: ""
                }


            }


            var existingNodes = visjsGraph.data.nodes.getIds();
            var options = {
                processorFn: processMetadata,
                filter: " FILTER (?prop in <http://www.w3.org/2002/07/owl#sameAs>) "
            };
            self.drawRestrictions(Config.dictionarySource, existingNodes, false, false, options)


        }


        self.drawNamedIndividuals = function (classIds) {
            var source = Lineage_common.currentSource
            if (!source)
                return alert("select a source");
            if (!classIds) {
                classIds = self.getGraphIdsFromSource(source)

            }
            MainController.UI.message("")

            Sparql_OWL.getNamedIndividuals(source, classIds, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found")

                }
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                var color = self.getSourceColor(source)
                //  console.log(JSON.stringify(result, null, 2))


                if (!Array.isArray(classIds))
                    classIds = [classIds]
                result.forEach(function (item) {


                    if (!existingNodes[item.node.value]) {
                        existingNodes[item.node.value] = 1;
                        visjsData.nodes.push({
                            id: item.node.value,
                            label: item.nodeLabel.value,
                            shadow: self.nodeShadow,
                            shape: Lineage_classes.namedIndividualShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            data: {
                                source: source,
                                id: item.node.value,
                                label: item.nodeLabel.value,
                                varName: "class"
                            }
                        })


                    }

                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1;
                        visjsData.nodes.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            shadow: self.nodeShadow,
                            shape: Lineage_classes.namedIndividualShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            data: {
                                source: source,
                                id: item.concept.value,
                                label: item.conceptLabel.value,
                                varName: "value"
                            }
                        })

                    }
                    var edgeId = item.concept.value + "_" + item.node.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.concept.value,
                            to: item.node.value,
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "solid",
                                    scaleFactor: 0.5
                                },
                            },
                            color: Lineage_classes.namedIndividualColor

                        })
                    }

                })


                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                visjsGraph.network.fit()
                $("#waitImg").css("display", "none");

            })
        }

        self.collapseNode = function (nodeId) {


            if (nodeId) {
                var children = visjsGraph.network.getConnectedNodes(nodeId, "from");
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
            var html = "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showNodeInfos();\"> Node infos</span>" +
                "   <span  id='lineage_graphPopupMenuItem' class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.expand();\"> Expand</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawParents();\"> Parents</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawSimilars();\"> Similars</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.collapse();\">Collapse</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showObjectProperties();\">ObjectProperties</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showRestrictions();\">Restrictions</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showIndividuals();\">Individuals</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.graphNodeNeighborhoodUI();\">Neighborhood</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.removeFromGraph();\">Remove from graph</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.removeOthersFromGraph();\">Remove others</span>"


            if (node.id && node.id.indexOf("_cluster") > 0) {
                var html = ""
                if (node.data.cluster.length <= Lineage_classes.showLimit)
                    html = "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.openCluster();\"> Open cluster</span>"
                html += "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.listClusterContent();\"> list cluster content</span>"
                html += "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.listClusterToClipboard();\"> list to clipboard</span>"

            }

            /*  if (Config.showAssetQueyMenu && node.data && node.data.source && Config.sources[node.data.source].KGqueryController) {
                  html += "    <span class=\"popupMenuItem\" onclick=\"KGquery.showNodeProperties();\"> add to Asset Query</span>"
              }*/
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
                    shadow: self.nodeShadow,
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
                newNodes.push({id: node.id, size: size, shadow: self.nodeShadow, shape: shape, font: font})
                //  newNodes.push({id: id, opacity:opacity})
            })
            visjsGraph.data.nodes.update(newNodes)
        }

        self.drawNodeAndParents = function (nodeData, callback) {


            function drawNodeAndparent(result) {
                var visjsData = {nodes: [], edges: []}
                var color = self.getSourceColor(nodeData.source)
                var nodesToDraw = []
                var newNodeIds = []
                var upperNodeIds = [];
                if (!nodeData.label && nodeData.text)
                    nodeData.label = nodeData.text
                var existingNodes = visjsGraph.getExistingIdsMap()
                result.forEach(function (item) {
                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1
                        visjsData.nodes.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            data: nodeData,
                            shadow: self.nodeShadow,
                            level: ancestorsDepth,
                            shape: Lineage_classes.defaultShape,
                            color: self.getSourceColor(nodeData.source, item.concept.value),
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
                                    shadow: self.nodeShadow,
                                    shape: Lineage_classes.defaultShape,
                                    color: color,
                                    level: ancestorsDepth - i,
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
                if (callback)
                    return callback(null, visjsData)

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
            }


            var existingNodes = visjsGraph.getExistingIdsMap()
            if (existingNodes[nodeData.id])
                return self.zoomGraphOnNode(nodeData.id)

            MainController.UI.message("")
            var schemaType = Config.sources[nodeData.source].schemaType
            if (schemaType == "OWL" || schemaType == "SKOS") {
                var ancestorsDepth = 7
                Sparql_generic.getNodeParents(nodeData.source, null, nodeData.id, ancestorsDepth, {skipRestrictions: 1}, function (err, result) {
                    if (err) {
                        if (callback)
                            return callback(err)
                        return MainController.UI.message(err);
                    }

                    if (result.length == 0) {
                        if (callback)
                            return callback("No data found")
                        $("#waitImg").css("display", "none");
                        return MainController.UI.message("No data found")
                    }
                    return drawNodeAndparent(result)

                })
            } else if (schemaType == "KNOWLEDGE_GRAPH") {
                var data = [{
                    concept: {
                        value: nodeData.id
                    },
                    conceptLabel: {
                        value: nodeData.label
                    },
                }]
                return drawNodeAndparent(data)

            }

        }


        self.graphActions = {

            showGraphPopupMenu: function (node, point, event) {

                if (node.from) {
                    self.currentGraphEdge = node;
                    if (!self.currentGraphEdge.data || !self.currentGraphEdge.data.propertyId)
                        return;
                    SourceBrowser.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge.data.propertyId, "mainDialogDiv", {resetVisited: 1})
                } else {
                    self.setGraphPopupMenus(node, event)
                    self.currentGraphNode = node;
                    MainController.UI.showPopup(point, "graphPopupDiv")
                }

            },

            onNodeClick: function (node, point, options) {
                if (!node) {
                    MainController.UI.hidePopup("graphPopupDiv")
                    Lineage_blend.clearAssociationNodes()
                    return
                }

                self.currentGraphNode = node;

                self.onGraphOrTreeNodeClick(node, options, {callee: "Graph"})


                if (options.dbleClick) {
                    if (node.data.cluster) {
                        Lineage_classes.openCluster(self.currentGraphNode)

                    } else {
                        Lineage_classes.addChildrenToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id],)
                    }
                }


            },

            expand: function () {
                var dontClusterNodes = false
                var depth = 1;
                if (graphContext.clickOptions.ctrlKey) {
                    depth = 2
                    dontClusterNodes = true
                }
                if (graphContext.clickOptions.ctrlKey && graphContext.clickOptions.altKey)
                    depth = 3

                Lineage_classes.addChildrenToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id], {
                    depth: depth,
                    dontClusterNodes: dontClusterNodes
                })
            },
            drawParents: function () {
                Lineage_classes.addParentsToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id])
            },

            drawSimilars: function () {
                var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey
                Lineage_classes.drawSimilarsNodes("label", self.currentGraphNode.data.source, self.currentGraphNode.id, descendantsAlso)
            },
            collapse: function () {
                Lineage_classes.collapseNode(self.currentGraphNode.id)
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
                SourceBrowser.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv")
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
            removeFromGraph: function () {
                visjsGraph.removeNodes("id", Lineage_classes.currentGraphNode.id, true)
            },

            removeOthersFromGraph: function () {
                if (!Lineage_classes.currentGraphNode.id)
                    return;
                visjsGraph.removeOtherNodesFromGraph(Lineage_classes.currentGraphNode.id)

            },


            showObjectProperties: function () {
                var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey
                Lineage_classes.drawObjectProperties(self.currentGraphNode.data.source, [self.currentGraphNode.id], descendantsAlso)
            },
            showRestrictions: function () {
                var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey
                Lineage_classes.drawRestrictions(self.currentGraphNode.data.source, self.currentGraphNode.data.id, descendantsAlso)
            },

            showIndividuals: function () {

                Lineage_classes.drawNamedIndividuals([self.currentGraphNode.id])
            }
        }

        self.getSourceColor = function (source, nodeId, palette) {

            if (!palette)
                palette = "paletteIntense"

            if (nodeId) {
                if (nodeId == "http://www.semanticweb.org/maintenance_wg_ontology#Downtime")
                    var x = 3
                for (var graphUri in self.sourcesGraphUriMap) {
                    if (nodeId.indexOf(graphUri) == 0) {
                        var color = self.getSourceColor(self.sourcesGraphUriMap[graphUri].name)
                        return color
                    } else {
                        ;
                    }
                }
            }

            if (source && !sourceColors[source]) {
                sourceColors[source] = common[palette][Object.keys(sourceColors).length]
                self.registerSource(source)
            }
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
            if (expandedLevels[source])
                return;
            var id = "Lineage_source_" + encodeURIComponent(source)
            if (document.getElementById(id) !== null)
                return;
            if (!self.soucesLevelMap[source])
                self.soucesLevelMap[source] = {}
            expandedLevels[source] = []
            var html = "<div  id='" + id + "' style='color: " + self.getSourceColor(source) + "'" +
                " class='Lineage_sourceLabelDiv' " +
                "onclick='Lineage_classes.setCurrentSource(\"" + encodeURIComponent(source) + "\")'>" + source + "</div>"


            $("#lineage_drawnSources").append(html)
            //  self.setCurrentSource(encodeURIComponent(source))


        }

        self.registerSourceImports = function (sourceLabel) {
            self.registerSource(sourceLabel)
            var imports = Config.sources[sourceLabel].imports
            if (!imports)
                imports = []


            imports.forEach(function (source) {
                self.registerSource(source)
            })

        }


        self.setCurrentSource = function (sourceId) {

            $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv")
            $("#Lineage_source_" + sourceId).addClass("Lineage_selectedSourceDiv")
            Lineage_common.currentSource = encodeURIComponent(sourceId)
            if (!self.soucesLevelMap[sourceId].topDone) {
                self.soucesLevelMap[sourceId].topDone = 1
                self.drawTopConcepts(sourceId)
            }


        }
        self.showHideCurrentSourceNodes = function (show) {
            if (Lineage_common.currentSource == Lineage_classes.mainSource)
                return;
            var visible
            if (show)// force passage à visible
                visible = false;
            else
                visible = self.soucesLevelMap[Lineage_common.currentSource].visible
            if (visible)
                self.soucesLevelMap[Lineage_common.currentSource].visible = false
            else
                self.soucesLevelMap[Lineage_common.currentSource].visible = true

            var allNodes = visjsGraph.data.nodes.get();
            var newNodes = []
            allNodes.forEach(function (node) {
                if (node && node.data && node.data.source == Lineage_common.currentSource)
                    newNodes.push({id: node.id, hidden: visible})

            })
            visjsGraph.data.nodes.update(newNodes)

            if (visible)
                $("#Lineage_source_" + Lineage_common.currentSource).addClass("lineage_hiddenSource")
            else
                $("#Lineage_source_" + Lineage_common.currentSource).removeClass("lineage_hiddenSource")


            if (!show)//
                Lineage_classes.setCurrentSource(Lineage_classes.mainSource);


        }


        self.showHideHelp = function () {
            var display = $("#lineage_actionDiv_Keyslegend").css("display")
            if (display == "none")
                display = "block"
            else
                display = "none"
            $("#lineage_actionDiv_Keyslegend").css("display", display)
        }


        self.graphDecoration = {

            init: function () {

                self.graphDecoration.operationsMap = {
                    "colorNodesByType": Lineage_classes.graphDecoration.colorGraphNodesByType,
                    "colorNodesByPart14TopType": Lineage_classes.graphDecoration.colorNodesByPart14TopType
                }
                var operations = Object.keys(self.graphDecoration.operationsMap)
                common.fillSelectOptions("Lineage_classes_graphDecoration_operationSelect", operations, true)

            },
            run: function (operation) {
                $("#Lineage_classes_graphDecoration_operationSelect").val("")
                self.graphDecoration.operationsMap[operation]()

            },


            showGraphDecorationDialog: function () {
                $("#mainDialogDiv").load("snippets/lineage/graphDecoration.html", function () {
                    $("#mainDialogDiv").dialog("open")
                })

            },
            listGraphNodeTypes: function (ids, part14TopTypes, callback) {
                if (!ids || ids.length == 0)
                    return;
                var sourceLabel = Lineage_classes.mainSource


                var strFrom = Sparql_common.getFromStr(sourceLabel, null, true, true)
                var query =
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>"+
                    "SELECT distinct ?x ?type  " + strFrom + "  WHERE {\n"
                if (part14TopTypes) {
                    query += "  ?x rdfs:subClassOf|rdf:type ?type.\n" +
                        "  filter (regex(str(?type),\"part14\") && ?type !=  <http://standards.iso.org/iso/15926/part14/Thing>)\n"
                } else {
                    query += "  ?x rdfs:subClassOf|rdf:type ?type.?type rdf:type ?typeType filter (?typeType not in (owl:Restriction)) " // filter (?type not in ( <http://souslesens.org/resource/vocabulary/TopConcept>,<http://www.w3.org/2002/07/owl#Class>))"
                }
                query += Sparql_common.setFilter("x", ids)


                query += "}"

                var sparql_url = Config.sources[sourceLabel].sparql_server.url;
                var url = sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                    if (err) {
                        return callback(err)
                    }

                    return callback(null, result.results.bindings)


                })

            }
            , colorNodesByPart14TopType: function () {
                self.graphDecoration.colorGraphNodesByType(true)
            }
            , colorGraphNodesByType: function (part14TopTypes) {

                var existingNodes = visjsGraph.getExistingIdsMap(true)
                var ids = Object.keys(existingNodes);
                self.graphDecoration.listGraphNodeTypes(ids, part14TopTypes, function (err, result) {
                    if (err)
                        return alert(err)
                    var nodesTypesMap = {}
                    var colorsMap = {}
                    var excludedTypes = ["TopConcept", "Class", "Restriction"]
                    result.forEach(function (item) {
                        var ok = true
                        excludedTypes.forEach(function (type) {

                            if (item.type.value.indexOf(type) > -1)
                                return ok = false;
                        })

                        if (ok) {

                            if (!colorsMap[item.type.value]) {
                                colorsMap[item.type.value] = common.paletteIntense[Object.keys(colorsMap).length]
                            }
                            nodesTypesMap[item.x.value] = {type: item.type.value, color: colorsMap[item.type.value]}
                        }
                    })
                   // console.log(JSON.stringify(nodesTypesMap, null, 2))
                    var newNodes = []
                    var neutralColor = "#ccc"
                    var legendNodes = []
                    for (var nodeId in existingNodes) {
                        if (nodeId.indexOf("legend_") == 0)
                            legendNodes.push(nodeId)
                        else {
                            var color = neutralColor;
                            if (nodesTypesMap[nodeId])
                                color = nodesTypesMap[nodeId].color
                            else
                                console.log(nodeId)

                            newNodes.push({id: nodeId, color: color})

                        }
                    }

                    visjsGraph.data.nodes.remove(legendNodes)
                    visjsGraph.data.nodes.update(newNodes)


                    var legendNodes = []
                    var str = ""
                    for (var type in colorsMap) {
                        str += "<div class='Lineage_sourceLabelDiv' style='background-color:" + colorsMap[type] + "'>" + Sparql_common.getLabelFromURI(type) + "</div>"

                    }
                    $("#Lineage_classes_graphDecoration_legendDiv").html(str)
                    //  visjsGraph.data.nodes.add(legendNodes)
                })


            },


        }

        return self;


    }
)
()

