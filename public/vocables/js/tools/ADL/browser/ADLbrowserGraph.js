var ADLbrowserGraph = (function () {


    var self = {}
    self.defaultNodeSize = 10;
    self.clusterSizeLimit = 500
    self.clusteclusterShape = "box"
    self.edgeColor = "#aaa";
    self.setGraphPopupMenus = function (node, event) {

        if (!node)
            return;

        var html =
            "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.showGraphNodeInfos();\"> node infos</span>" +
            "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.selectNode()\">selectNode</span>" +
            "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowserGraph.collapseNode();\">collapse </span>"
        $("#graphPopupDiv").html(html)
    },

        self.showGraphNodeInfos = function () {
            ADLbrowser.showNodeInfos(self.currentGraphNode)
        }
    self.clearGraph = function () {
        ADLbrowser.jstree.load.loadAdl();
        visjsGraph.clearGraph()
        ADLbrowser.queryTypesArray = []
    },
        self.collapseNode = function () {
            visjsGraph.collapseNode(ADLbrowser.currentJstreeNode.id)

        },
        self.selectNode = function () {
            ADLbrowser.currentGraphNodeSelection = self.currentGraphNode
            $("#ADLbrowser_selectionDiv").html(self.currentGraphNode.data.label)
            //    ADLbrowser.query.showQueryParamsDialog(ADLbrowserGraph.lastRightClickPosition,self.currentGraphNode);

        },
        self.cancelGraphNodeSelection = function () {
            ADLbrowser.currentGraphNodeSelection = null
            $("#ADLbrowser_selectionDiv").html("ALL NODES")
            //   ADLbrowser.jstree.load.loadAdl();
        }
        ,

        self.addCountNodesToGraph = function (node, data, options, callback) {


            var count = data.data[0].count.value


            var visjsData = {nodes: [], edges: []}


            var nodeId = options.varName.substring(1) + "_filter"
            var color = Lineage_classes.getPropertyColor(ADLbrowserQuery.currentNode.id)
            visjsGraph.data.nodes.remove(nodeId)
            var nodeData = {
                type: "count",
                class: node.id,
                count: count,
                filter: options.filter,
                filterStr: options.filterStr,
                varName: options.varName,
                color: color,
                id: nodeId

            }
            //   var color = "#ffe0aa"


            visjsData.nodes.push({
                id: nodeId,
                label: count,
                shape: "circle",
                font: "14 arial black",
                color: color,
                data: nodeData,
                //   fixed:{y:true},
                //   y:-300

            })
            var edgeId = node.id + "_countEdge"
            visjsGraph.data.edges.remove(edgeId)
            visjsData.edges.push({
                id: edgeId,
                from: node.id,
                to: nodeId,
                label: options.filterLabel,
                font: {color: color},
                length: 5


            })

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)

            ADLbrowserQuery.queryFilterNodes.splice(0, 0, nodeData);


            visjsGraph.data.nodes.update({
                id: ADLbrowserQuery.currentNode.id,
                color: color
            })

            return callback(null, nodeData)

        }


    self.drawGraph = function (node, options, callback) {
        if (!options)
            options = {}

        if (!ADLbrowser.currentSource)
            return alert("select a source")
        var totalNodes = 0
        var graphNodeFilterStr = ""
        var slicedGraphNodes = [];
        var existingNodes2 = []

        //  if (options.logicalMode!="union" && visjsGraph.data && visjsGraph.data.nodes) {
        if (visjsGraph.data && visjsGraph.data.nodes) {
            var existingNodes
            if (ADLbrowser.currentGraphNodeSelection) {
                existingNodes = visjsGraph.getNodeDescendants(ADLbrowser.currentGraphNodeSelection.id, true)

            } else {
                existingNodes = visjsGraph.data.nodes.get();
            }

            existingNodes.forEach(function (node) {
                if (node.id.indexOf("cluster_") == 0) {
                    existingNodes2 = existingNodes2.concat(node.data.clusterContent)
                } else {
                    existingNodes2.push(node.id)
                }
            })

        }

        if (options.logicalMode != "union") {
            slicedGraphNodes = common.sliceArray(existingNodes2, 1000)
        } else {
            slicedGraphNodes.push([]);
        }
        var allData = []
        async.eachSeries(slicedGraphNodes, function (slice, callbackEach) {
            var graphNodesRole = "sub"
            if (node.data.role == "sub" || node.data.role == "subType")
                graphNodesRole = "obj"
            if (node.data.role == "obj" || node.data.role == "objType")
                graphNodesRole = "sub"

            /*    if(options.logicalMode = "union")
                    graphNodesRole = "sub"
                else
                    graphNodesRole = "obj"*/


            //else
            graphNodeFilterStr = Sparql_common.setFilter(graphNodesRole, slice)
            self.queryGraph(node, graphNodeFilterStr, options, function (err, data) {
                if (err)
                    return callbackEach(err)
                totalNodes += data.length
                allData = allData.concat(data)
                return callbackEach()
            })

        }, function (err) {
            if (allData.length == 0) {
                return callback(null, 0)
            }
            // ADLbrowserGraph.cancelGraphNodeSelection();
            ADLbrowser.queryTypesArray.push(node.data.id)
            totalNodes += allData.length
            self.executeDrawGraph(node, allData, options, function (err, result) {
                return callback(err, totalNodes)
            })

        })


    }
    self.queryGraph = function (node, graphNodeFilterStr, options, callback) {
        var filterStr = "";
        if (options.filter)
            filterStr = options.filter
        if (!filterStr)
            filterStr = "";
        var source = ADLbrowser.currentSource
        var query

        var fromStr = Sparql_common.getFromStr(source)
        query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * " +
            fromStr +
            "WHERE {"
        if (ADLbrowser.queryTypesArray.length == 0 || options.logicalMode == "union") {
            query += "    ?sub rdf:type ?subType. optional {?sub rdfs:label ?subLabel} "
            query += "filter(   ?subType =<" + node.data.id + "> )"
        } else {
            if (node.data.property) {
                query += "?sub <" + node.data.property + ">|^<" + node.data.property + "> ?obj.   "
                // query += "?sub <" + node.data.property + "> ?obj.   "
            }
            query += "?sub rdf:type ?subType. ?obj rdf:type ?objType. optional {?sub rdfs:label ?subLabel} optional {?obj rdfs:label ?objLabel} "
            //  query += "?sub <" + node.data.property +"> ?obj.  ?sub rdf:type ?subType. ?obj rdf:type ?objType. optional {?sub rdfs:label ?subLabel} optional {?obj rdfs:label ?objLabel} "

            node.data.property
            query += "filter(   ?objType =<" + node.data.id + "> )"
        }


        query += filterStr + graphNodeFilterStr


        query += " }  limit 20000"


        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
        MainController.UI.message("searching...")
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
            // $("#waitImg").css("display", "none");
            if (err) {
                return MainController.UI.message(err)
            }
            var data = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "obj"])
            return callback(null, data)

        })
    }
    self.executeDrawGraph = function (node, data, options, callback) {


        var source = ADLbrowser.currentSource

        var existingNodes = visjsGraph.getExistingIdsMap()
        MainController.UI.message("drawing " + data.length + "nodes...")
        var visjsData = {nodes: [], edges: []}
        var isNewGraph = true
        if (existingNodes && Object.keys(existingNodes).length > 0)
            isNewGraph = false;


        var subShape = "square"
        if (true || isNewGraph) {
            subShape = "dot"
        }

        var unclusteredNodesMap = {}
        var existingNodesArray = []
        if (visjsGraph.data && visjsGraph.data.nodes) {
            existingNodesArray = visjsGraph.data.nodes.get();
            existingNodesArray.forEach(function (node) {

                if (node.id.indexOf("cluster_") == 0) {
                    node.data.clusterContent.forEach(function (id) {
                        unclusteredNodesMap[id] = node.id
                    })

                }
            })
        }


        var clusterContent = [];
        data.forEach(function (item) {
            var id;
            if (item.obj)
                id = item.obj.value
            else
                id = item.sub.value
            if (clusterContent.indexOf(id) < 0)
                clusterContent.push(id)
        })

        //cluster
        if (clusterContent.length > self.clusterSizeLimit) {
            subShape = "dot"

            var label
            var color = "#ddd"
            var type
            var item0 = data[0]
            if (true || item0.obj) {
                label = ADLbrowser.currentJstreeNode.data.label
                color = self.buildClasses[ADLbrowser.currentJstreeNode.id]
                //  color = ADLbrowser.getPropertyColor(ADLbrowser.currentJstreeNode.id)
                type = ADLbrowser.currentJstreeNode.id
            } else {
                label = ADLbrowser.currentJstreeNode.data.label
                color = self.buildClasses[ADLbrowser.currentJstreeNode.id]
                // color = ADLbrowser.getPropertyColor(item0.subType.value)
                type = item0.subType.value
            }

            var clusterId = "cluster_" + common.getRandomHexaId(10)
            visjsData.nodes.push({
                id: clusterId,
                label: label + "_" + clusterContent.length,
                shape: self.clusteclusterShape,
                color: color,
                data: {
                    sourceType: node.data.sourceType,
                    clusterContent: clusterContent,
                    role: "cluster",
                    source: ADLbrowser.currentSource,
                    type: type,
                    id: clusterId,
                    label: label + "_" + clusterContent.length
                }

            })


            var culteredEdges = {}
            data.forEach(function (item) {
                var p;
                if (unclusteredNodesMap[item.sub.value]) {
                    var edgeId = unclusteredNodesMap[item.sub.value] + "_" + clusterId;
                    if (!culteredEdges[edgeId]) {
                        culteredEdges[edgeId] = {
                            id: edgeId,
                            to: clusterId,
                            from: unclusteredNodesMap[item.sub.value],
                            color: self.edgeColor,
                            value: 1

                        }

                    } else {

                        culteredEdges[edgeId].value += 1
                        culteredEdges[edgeId].label = culteredEdges[edgeId].value
                    }
                } else {
                    if (existingNodes[item.sub.value]) {
                        var edgeId = item.sub.value + "_" + clusterId;
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                to: clusterId,
                                from: item.sub.value,
                                color: self.edgeColor,
                                value: 1

                            })
                        }
                    }
                }
            })

            for (var edgeId in culteredEdges) {
                visjsData.edges.push(culteredEdges[edgeId])
            }


        } else {

            var clusteredEdges = {}
            data.forEach(function (item) {
                if (unclusteredNodesMap[item.sub.value]) {
                    var edgeId = unclusteredNodesMap[item.sub.value] + "_" + item.obj.value
                    if (!clusteredEdges[edgeId])
                        clusteredEdges[edgeId] = 0
                    clusteredEdges[edgeId] += 1

                }
            })
            data.forEach(function (item) {
                if (node.data.role.indexOf("sub") == 0) {

                    if (!unclusteredNodesMap[item.sub.value]) {


                        if (!existingNodes[item.sub.value]) {
                            existingNodes[item.sub.value] = 1
                            var color = "#ddd"
                            if (item.subType)
                                color = ADLbrowser.getPropertyColor(item.subType.value)
                            visjsData.nodes.push({
                                id: item.sub.value,
                                label: item.subLabel.value,
                                shape: ADLbrowser.getSourceShape(ADLbrowser.currentSource),
                                color: color,
                                size: self.defaultNodeSize,
                                data: {
                                    sourceType: node.data.sourceType,
                                    role: "sub",
                                    source: ADLbrowser.currentSource,
                                    type: item.subType.value,
                                    id: item.sub.value,
                                    label: item.subLabel.value
                                }

                            })
                        }
                    }
                }
                if (options.logicalMode != "union" && (!isNewGraph || node.data.role.indexOf("obj") == 0)) {
                    if (!existingNodes[item.obj.value]) {
                        existingNodes[item.obj.value] = 1
                        var color = "#ddd"
                        if (item.objType)
                            // color = ADLbrowser.getPropertyColor(item.objType.value)
                            color = ADLbrowser.getPropertyColor(node.data.property + "_" + node.data.id);
                        visjsData.nodes.push({
                            id: item.obj.value,
                            label: item.objLabel.value,
                            shape: ADLbrowser.getSourceShape(ADLbrowser.currentSource),
                            color: color,
                            size: self.defaultNodeSize,
                            data: {
                                sourceType: "adl",
                                role: "sub",
                                source: ADLbrowser.currentSource,
                                type: item.objType.value,
                                id: item.obj.value,
                                label: item.objLabel.value
                            }

                        })
                    }
                }
                if (item.obj) {
                    if (unclusteredNodesMap[item.sub.value]) {


                        var edgeId = unclusteredNodesMap[item.sub.value] + "_" + item.obj.value
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                to: item.obj.value,
                                from: unclusteredNodesMap[item.sub.value],
                                //   value:clusteredEdges[edgeId],
                                label: "" + clusteredEdges[edgeId],
                                font: "12px arial blue",
                                font: {background: "#ddd", strokeWidth: 2},
                                color: self.edgeColor

                            })
                        }

                    } else {
                        var edgeId = item.sub.value + "_" + item.obj.value;
                        var inverseEdgeId = item.obj.value + "_" + item.obj.value;
                        if (!existingNodes[edgeId] && !existingNodes[inverseEdgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.sub.value,
                                to: item.obj.value,
                                color: self.edgeColor

                            })
                        }
                    }
                }


            })
        }

        MainController.UI.message("drawing...")

        if (!visjsGraph.data || !visjsGraph.data.nodes) {
            var visjsOptions = {
                onclickFn: function (node, point, event) {
                    ADLbrowser.currentJstreeNode = node
                    if (event.ctrlKey)
                        ;


                },
                onRightClickFn: function (node, point, event) {
                    if (!node || node.length == 0)
                        return;
                    ADLbrowser.currentJstreeNode = node

                    MainController.UI.showPopup(point, "graphPopupDiv")
                    self.currentGraphNode = node;
                    self.setGraphPopupMenus(node, event)
                    point.x += leftPanelWidth
                    ADLbrowserGraph.lastRightClickPosition = point


                }

            }
            visjsGraph.draw("graphDiv", visjsData, visjsOptions)
        } else {

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)
            visjsGraph.redraw()
            visjsGraph.network.fit()
        }
        callback()
    }


    return self;


}())
