var TE_14224_browser = (function () {

        var self = {}
        var source
        var graphUri
        var assetTreeDistinctNodes = {}


        self.currentTable_14224Field;

        //self.graphUri = Config.sources[self.referenceOntologySource]
        self.onSourceSelect = function () {

        }
        self.onLoaded = function () {

            $("#actionDiv").html("")
            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/snippets/leftPanel.html")
            MainController.UI.toogleRightPanel(true)
            $("#rightPanelDiv").html("")
            $("#rightPanelDiv").load("customPlugins/TotalEnergies/snippets/rightPanel.html", function () {
                self.loadOntologytree()
            })


            $("#graphDiv").html("")
            // $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
            $("#accordion").accordion("option", {active: 2});


            $("#sourcesTreeDiv").html("");
            source = "TSF_GS_EP-EXP_207_11"
            source = "TSF_maintenance_ROMAIN_14224"
            self.referenceOntologySource = source
            graphUri = Config.sources[source].graphUri
            Lineage_classes.mainSource = source
            Lineage_common.currentSource = source


        }

        self.loadAsset = function (asset) {
            if (asset == "")
                return;
            self.currenTable = asset

            if (self.currenTable == "girassol") {
                self.currentTable_14224Field = "className"

            } else if (self.currenTable == "absheron") {
                self.currentTable_14224Field = "RDLRelation"
            } else {
                self.currentTable_14224Field = null
            }

            visjsGraph.clearGraph()
            $("#graphDiv").html("")
            self.getFunctionalLocations(asset)
        }


        self.clearGraph = function () {
            visjsGraph.clearGraph()
            $("#graphDiv").html("")
        }

        self.getFunctionalLocations = function (table) {


            var limit = 100000

            var sqlQuery = " select distinct concat('A_',id) as id,location1,location2 from " + table + " where (location3 is null or location3='') and (location2 is not null and location2 !='')";


            self.querySQLserver(sqlQuery, function (err, data) {
                if (err)
                    return MainController.UI.message(err)
                var jstreeData = []
                assetTreeDistinctNodes = {}
                data.forEach(function (item) {


                    if (!assetTreeDistinctNodes[item.location1]) {
                        assetTreeDistinctNodes[item.location1] = 1
                        jstreeData.push({
                            id: item.location1,
                            text: item.location1,
                            parent: "#",
                            data: {
                                FunctionalLocationCode: item.location1,
                                id: item.location1,
                                label: item.location1,
                                type: "location",
                            }


                        })
                    }
                    if (!assetTreeDistinctNodes[item.location2]) {
                        assetTreeDistinctNodes[item.location2] = 1


                        jstreeData.push({
                            //  id: item.location1 + "/" + item.location2,
                            id: item.id,
                            text: item.location2,
                            parent: item.location1,
                            data: {
                                FunctionalLocationCode: item.location1 + "/" + item.location2,
                                // id: item.location1 + "/" + item.location2,
                                id: item.id,
                                label: item.location2,
                                type: "location",
                            }


                        })
                    }


                })

                var options = {
                    openAll: true,
                    selectTreeNodeFn: function (event, obj) {
                        self.currentTreeNode = obj.node
                        var level = self.currentTreeNode.parents.length + 1
                        self.openAssetTreeNode(self.currentTreeNode, level)
                    },
                    selectTreeNodeFnXXX: function (event, obj) {
                        self.currentTreeNode = obj.node
                        var level = self.currentTreeNode.parents.length + 1
                        if (level > 4) {
                            if (self.currentTreeNode.data.type == "location")
                                self.openClassTreeNode(self.currentTreeNode.data.id, level)
                            else if (self.currentTreeNode.data.type == "class")
                                self.openTagTreeNode(self.currentTreeNode)
                            else if (self.currentTreeNode.data.type == "tag")
                                ;//  self.showAssetNodeInfos(self.currentTreeNode)
                        } else {
                            self.openFunctionalLocationTreeNode(self.currentTreeNode.data, level)
                        }

                    }
                    ,
                    contextMenu: TE_14224_browser.getAssetJstreeContextMenu()
                }
                common.jstree.loadJsTree("TE_114224_browser_assetPanelTreeDiv", jstreeData, options);
            })

        }


        self.openAssetTreeNode = function (node, level, callback) {
            var limit = 100000
            var parentData = node.data;
            var sqlQuery = " select id," +
                "FunctionalLocationCode,functionalLocationDescription," +
                self.currentTable_14224Field + " as mapping_14224 " +
                " from " + self.currenTable + " where  parentFunctionalLocation ='" + parentData.FunctionalLocationCode + "' order by className";
            //   var sqlQuery = " select distinct tag," + self.currentTable_14224Field + " as mapping_14224 from " + self.currenTable + " where  id='"+node.data.id+"' order by tag";


            self.querySQLserver(sqlQuery, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                if (callback)
                    return callback(null, result)
                var jstreeData = []
                result.forEach(function (item) {
                    var data = item;
                    data.level = level;
                    //  var childId = nodeId + "/" + common.formatUriToJqueryId(item.functionalLocationDescription)
                    if (!assetTreeDistinctNodes[item.id]) {
                        assetTreeDistinctNodes[item.id] = 1
                        jstreeData.push({
                            id: "A_" + item.id,
                            text: item.functionalLocationDescription,
                            parent: node.id,
                            type: "owl:Class",
                            data: data
                        })
                    }
                })
                common.jstree.addNodesToJstree("TE_114224_browser_assetPanelTreeDiv", "A_" + node.id, jstreeData)
            })


        }

        self.querySQLserver = function (sqlQuery, callback) {
            var limit = 100000
            var dataSource = {
                "type": "sql.sqlserver",
                "connection": "_default",
                "dbName": "data14224",
                "table_schema": "dbo"
            }


            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {
                    KGquery: 1,
                    getData: 1,
                    dataSource: JSON.stringify(dataSource),
                    sqlQuery: sqlQuery
                },
                dataType: "json",

                success: function (data, textStatus, jqXHR) {
                    callback(null, data)
                },
                error(err) {
                    return callback(err)
                }
            })
        }


        self.showAssetNodeInfos = function (node, callee) {
            if (!node) {
                if (callee == "Graph")
                    node = self.currentGraphNode
                else
                    node = self.currentTreeNode;
            }
            if (!node)
                return;


            var sqlQuery = " select distinct * from " + self.currenTable + " where  id=" + node.data.id


            self.querySQLserver(sqlQuery, function (err, data) {
                if (err)
                    return MainController.UI.message(err)
                var jstreeData = []
                var nodeId = node.id
                if (data.length == 0)
                    return
                var headers = Object.keys(data[0])

                var nodeId = data[0].tag
                var str = "<div style='max-height:800px;overflow: auto'>" +
                    "<table class='infosTable'>"
                str += "<tr><td class='detailsCellName'>UUID</td><td><a target='_blank' href='" + nodeId + "'>" + nodeId + "</a></td></tr>"
                str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>"

                data.forEach(function (item) {


                    headers.forEach(function (key) {


                        str += "<tr class='infos_table'>"

                        str += "<td class='detailsCellName'>" + key + "</td>"

                        str += "<td class='detailsCellValue'>" + item[key] + "</td>"
                        str += "</tr>"
                    })
                    str += "</table>"

                })
                $("#mainDialogDiv").html(str);
                $("#mainDialogDiv").dialog("open")
            })


        }


        self.mapClassesTo14224 = function (node) {


            var childrenMap = {}
            //   childrenMap[node.data.id] = node.data
            var visjsData = {nodes: [], edges: []}
            var nodeData14224;
            var allGraphIds = {}
            var Iso14224AssetMap = {}
            var iso14224CodeIdMap = {}
            async.series([

                    function (callbackSeries) {
                        MainController.UI.message("looking for " + node.label + " children")
                        var sqlQuery = " select distinct id,location1,location2,location3,location4,functionalLocationDescription as className," +
                            "FunctionalLocationCode, parentFunctionalLocation, " +
                            "" + self.currentTable_14224Field + " as mapping_14224  from " + self.currenTable + "" +
                            " where  FunctionalLocationCode like'" + node.data.FunctionalLocationCode + "%' order by className";

                        self.querySQLserver(sqlQuery, function (err, data) {
                            if (err)
                                return callbackSeries(err)
                            data.forEach(function (item) {
                                childrenMap[item.id] = item


                                var childId = item.id

                                if (!Iso14224AssetMap[item.mapping_14224])
                                    Iso14224AssetMap[item.mapping_14224] = []
                                Iso14224AssetMap[item.mapping_14224].push(item)


                            })
                            callbackSeries()
                        })

                    },


                    function (callbackSeries) {
                        var words = []
                        for (var key in childrenMap) {
                            var word = childrenMap[key].mapping_14224;
                            var word2 = word// word.replace(/[0-9]/g, "")
                            if (word2 && words.indexOf(word2) < 0)
                                words.push(word2)
                        }
                        if (words.length == 0) {
                            MainController.UI.message("No matching ISO_14424 classes", true)
                            return callbackSeries("No matching ISO_14424 classes")
                        }


                        MainController.UI.message("looking for ISO_14424 classes")
                        SearchUtil.getSimilarLabelsInSources(null, self.referenceOntologySource.toLowerCase(), words, null, "exactMatch", {parentlabels: true}, function (err, result) {

                            if (err)
                                return alert(err)

                            var ids = []
                            result.forEach(function (item) {
                                for (var source in item.matches) {
                                    item.matches[source].forEach(function (match) {
                                        ids.push(match.id)

                                        iso14224CodeIdMap[item.id] = match.id
                                        var assetObjs = Iso14224AssetMap[item.id]
                                        assetObjs.forEach(function (assetObj) {
                                            var edgeId = assetObj.id + "_" + match.id

                                            var edge = {
                                                id: edgeId,
                                                from: "A_" + assetObj.id,
                                                to: match.id
                                            }
                                            edge.color = "blue"


                                            visjsData.edges.push(edge);

                                        })
                                    })
                                }
                            })

                            MainController.UI.message("drawing ISO_14424 classes")
                            async.eachSeries(ids, function (id, callbackEach) {
                                if (allGraphIds[id])
                                    return callbackEach();
                                allGraphIds[id] = 1
                                nodeData14224 = {
                                    id: id,
                                    source: self.referenceOntologySource
                                }
                                Lineage_classes.drawNodeAndParents(nodeData14224, function (err, result) {
                                    if (err)
                                        return callbackSeries(err)


                                    visjsData.nodes = common.concatArraysWithoutDuplicate(visjsData.nodes, result.nodes, "id")
                                    visjsData.edges = common.concatArraysWithoutDuplicate(visjsData.edges, result.edges, "id")

                                    callbackEach()
                                })
                            }, function (err) {
                                callbackSeries()
                            })
                        })
                    },

                    function (callbackSeries) {
                        //   return   callbackSeries();
                        var assetObjs = []

                        for (var key in Iso14224AssetMap) {
                            var objs = Iso14224AssetMap[key]
                            objs.forEach(function (assetObj) {
                                if (!allGraphIds[assetObj.id]) {
                                    allGraphIds[assetObj.id] = 1

                                    assetObjs.push(assetObj)
                                }
                            })
                        }

                        MainController.UI.message("drawing asset nodes ")
                        self.graphAssetNodeAndParents(assetObjs, {withoutParents: true}, function (err, result) {
                            if (err)
                                return callbackSeries(err)


                            visjsData.nodes = common.concatArraysWithoutDuplicate(visjsData.nodes, result.nodes, "id")
                            visjsData.edges = common.concatArraysWithoutDuplicate(visjsData.edges, result.edges, "id")


                            callbackSeries()
                        })
                    },


                    // make edges with fuzz matches assetNodes and iso14224
                    function (callbackSeries) {
                        return callbackSeries()
                        for (var keyAsset in Iso14224AssetMap) {
                            for (var keyIso in iso14224CodeIdMap) {
                                if (keyAsset != keyIso && keyAsset.indexOf(keyIso) == 0) {
                                    Iso14224AssetMap[keyAsset].forEach(function (itemAsset) {
                                        var from = "A_" + itemAsset.id;
                                        var to = iso14224CodeIdMap[keyIso]
                                        var edgeId = from + "_" + to
                                        var edge = {
                                            id: edgeId,
                                            from: from,
                                            to: to
                                        }
                                        edge.color = "green"


                                        visjsData.edges.push(edge);
                                    })
                                }


                            }
                        }
                        callbackSeries()

                    }


                ]

                , function (err) {
                    if (err)
                        alert(err)
                    visjsData.nodes = common.unduplicateArray(visjsData.nodes, "id")
                    visjsData.edges = common.unduplicateArray(visjsData.edges, "id")


                    if (visjsGraph.data && visjsGraph.data.nodes) {
                        visjsGraph.data.nodes.add(visjsData.nodes)
                        visjsGraph.data.edges.add(visjsData.edges)
                    } else {
                        self.drawNewGraph(visjsData,)
                    }

                })


        }


        self.graphAssetNodeAndParents = function (nodes, options, callback) {
            if (!options)
                options = {}
            var startLevel = 8

            if (!Array.isArray(nodes)) {
                nodes = [nodes]
            }
            var visjsData = {nodes: [], edges: []}
            var visjsExistingNodes = visjsGraph.getExistingIdsMap();

            nodes.forEach(function (item) {
                var data = item;
                data.source = "TE_14224_browser";
                data.level = i;
                data.type = "assetNode";
                if (!visjsExistingNodes[item.id]) {
                    visjsExistingNodes[item.id] = 1
                    var node = {
                        id: "A_" + item.id,
                        label: item.className,

                        size: Lineage_classes.defaultShapeSize,
                        shape: "square",
                        size: Lineage_classes.defaultShapeSize,
                        color: Lineage_classes.getSourceColor(self.currenTable),
                        data: data,
                        level: startLevel + 5 - i,

                    }
                    visjsData.nodes.push(node)


                }

                if (!options.withoutParents) {
                    var previousId = "A_" + item.id
                    for (var i = 5; i > 0; i--) {


                        if (item["location" + i]) {
                            var id = item["location" + i]


                            if (!visjsExistingNodes[id]) {
                                visjsExistingNodes[id] = 1
                                var node = {
                                    id: id,
                                    label: id,

                                    size: Lineage_classes.defaultShapeSize,
                                    shape: "square",
                                    size: Lineage_classes.defaultShapeSize,
                                    color: Lineage_classes.getSourceColor(self.currenTable),
                                    data: {
                                        source: "TE_14224_browser",
                                        level: i,
                                        type: "assetNode",
                                        id: id,
                                        label: id,

                                    },
                                    level: startLevel + 5 - i,

                                }
                                visjsData.nodes.push(node)

                            }


                            var edgeId = previousId + "_" + id
                            if (!visjsExistingNodes[edgeId]) {
                                visjsExistingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: previousId,
                                    to: id

                                })


                            }
                            previousId = id

                        }
                    }
                }
            })

            if (callback)
                return callback(null, visjsData)

            if (visjsGraph.data && visjsGraph.data.nodes) {
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
            } else {
                self.drawNewGraph(visjsData,)
            }


        }


        self.showAssetData = function (node) {

            var parent = node.data.path


        }


        /**********************************************************************************************************************************/


        self.drawNewGraph = function (visjsData, layout) {

            var options = {
                keepNodePositionOnDrag: true,
                onclickFn: self.graphActions.onNodeClick,
                onRightClickFn: self.graphActions.showGraphPopupMenu,
                "physics": {
                    "barnesHut": {
                        "springLength": 0,
                        "damping": 0.15
                    },
                    "minVelocity": 0.75,

                },


            }
            if (layout == "hierarchical") {
                // onHoverNodeFn:Lineage_classes.graphActions.onHoverNodeFn
                options.layoutHierarchical = {direction: "TD", sortMethod: "directed", levelSeparation: 50}

            }
            visjsGraph.draw("graphDiv", visjsData, options)
            $("#waitImg").css("display", "none");
        }

        self.getAssetJstreeContextMenu = function () {
            var items = {}

            items.nodeInfos = {
                label: "Node Infos",
                action: function (e) {// pb avec source
                    //  if (self.currentTreeNode.data.type == "tag")
                    self.showAssetNodeInfos(self.currentTreeNode, "tree")


                }
            }
            items.graphAssetNodeAndParents = {
                label: "Graph Node",
                action: function (e) {// pb avec source
                    TE_14224_browser.graphAssetNodeAndParents(self.currentTreeNode.data)

                }
            }
            items.mapClassesTo14224 = {
                label: "mapClassesTo14224",
                action: function (e) {// pb avec source
                    TE_14224_browser.mapClassesTo14224(self.currentTreeNode)

                }
            }

            return items;
        }

        self.getOntologyJstreeContextMenu = function () {
            var items = {}

            items.nodeInfos = {
                label: "Node Infos",
                action: function (e) {
                    var x = self.currentGraphNode

                    SourceBrowser.showNodeInfos(self.referenceOntologySource, self.currentOntologyTreeNode.id, "mainDialogDiv")


                }
            }
            items.ShowAssetData = {
                label: "Show Asset Data",
                action: function (e) {
                    TE_14224_browser.showAssetData(self.currentOntologyTreeNode)

                }
            }


            return items;
        }


        self.graphActions = {
            onNodeClick: function (node, point, options) {

                if (!node)
                    return;
                self.currentGraphNode = node
                return;
                if (node.data.type == "assetNode") {

                    self.showAssetNodeInfos(self.currentGraphNode)
                } else {
                    Lineage_classes.currentGraphNode = node
                    Lineage_classes.onGraphOrTreeNodeClick(node, options, {callee: "Graph"})
                }

            }
            , showGraphPopupMenu: function (node, point, options) {

                if (node.data.type == "assetNode") {
                    if (!node)
                        return;

                    var html = "    <span  class=\"popupMenuItem\"onclick=\"TE_14224_browser.showAssetNodeInfos(null,'Graph');\"> Node infos</span>"
                    html += "    <span  class=\"popupMenuItem\"onclick=\"TE_14224_browser.graphActions.showNodeChildren();\"> show tags</span>"

                    $("#graphPopupDiv").html(html);
                    self.currentGraphNode = node;
                    MainController.UI.showPopup(point, "graphPopupDiv")

                } else {
                    Lineage_classes.graphActions.showGraphPopupMenu(node, point, options)
                }


            }

            , showNodeChildren: function () {
                var node = self.currentGraphNode;

                self.openAssetTreeNode(self.currentGraphNode, null, function (err, result) {
                    if (err)
                        return;
                    var visjsData = {nodes: [], edges: []}
                    result.forEach(function (item) {
                        var data = item;
                        data.type = "assetNode"
                        var existingNodes = visjsGraph.getExistingIdsMap()
                        if (!existingNodes[item.id]) {
                            existingNodes[item.id] = 1
                            visjsData.nodes.push({

                                id: "A_" + item.id,
                                label: item.functionalLocationDescription,
                                type: "owl:Class",
                                data: data,
                                size: Lineage_classes.defaultShapeSize,
                                shape: "square",
                                color: Lineage_classes.getSourceColor(self.currenTable),
                                level: self.currentGraphNode.level + 1
                            })

                            var edgeId = item.id + "_" + self.currentGraphNode.id
                            var edge = {
                                id: edgeId,
                                from: "A_" + item.id,
                                to: self.currentGraphNode.id
                            }
                            edge.color = "green"


                            visjsData.edges.push(edge);
                        }
                    })
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                })

            }, drawAssetNodesParents: function () {

                var nodes = visjsGraph.data.nodes.get();

                var assetNodesIds = [];

                var level = 10
                nodes.forEach(function (node) {
                    if (node.data.type == "assetNode")
                        if (assetNodesIds.indexOf(node.data.parentFunctionalLocation) < 0)
                            assetNodesIds.push(node.data.parentFunctionalLocation)

                })

                var filterStr = JSON.stringify(assetNodesIds).replace(/[\[\]]/g, "").replace(/"/g, "'")
                /* var sqlQuery = " select distinct id,location1,location2,location3,location4,functionalLocationDescription as className,FunctionalLocationCode," + self.currentTable_14224Field + " as mapping_14224  from " + self.currenTable + "" +
                     " where  FunctionalLocationCode in (" + filterStr + ") ";*/

                var sqlQuery = " select distinct parentTable.id,parentTable.location1,parentTable.location2,parentTable.location3,parentTable.location4,parentTable.functionalLocationDescription \n" +
                    " as className,parentTable.FunctionalLocationCode,parentTable.RDLRelation as mapping_14224 ,\n" +
                    " childTable.id as childId\n" +
                    " \n" +
                    " from " + self.currenTable + " as parentTable , " + self.currenTable + " as childTable where  childTable.parentFunctionalLocation in ('ABS/CCR/CRS/CONT/50-MS-001','ABS/CCR/CRS/CONT/50-SC-001') \n" +
                    "\n" +
                    " and childTable.parentFunctionalLocation=parentTable.functionalLocationCode"

                var startLevel = 10;
                self.querySQLserver(sqlQuery, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    var visjsData = {nodes: [], edges: []}
                    var visjsExistingNodes = visjsGraph.getExistingIdsMap()
                    result.forEach(function (item) {

                        var data = item;
                        data.type = "assetNode"
                        var id = item.id

                        if (!visjsExistingNodes[id]) {
                            visjsExistingNodes[id] = 1
                            var node = {
                                id: "A_" + id,
                                label: item.className,

                                size: Lineage_classes.defaultShapeSize,
                                shape: "square",
                                size: Lineage_classes.defaultShapeSize,
                                color: Lineage_classes.getSourceColor(self.currenTable),
                                data: data,
                                level: level,

                            }
                            visjsData.nodes.push(node)

                        }


                        var edgeId = "A_" + item.childId + "_" + "A_" + id;
                        if (!visjsExistingNodes[edgeId]) {
                            visjsExistingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: "A_" + item.childId,
                                to: "A_" + id,

                            })


                        }

                    })


                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                })


            }
        }


        self.loadOntologytree = function () {

            //   var source = "TSF_GS_EP-EXP_207_11"
            var topClasses = [{
                id: "http://data.total.com/resource/tsf/maintenance/romain_14224/bad731c1e7",
                label: "Failure"
            },
                {id: "http://data.total.com/resource/tsf/maintenance/romain_14224/6fcb03c2dd", label: "maintenance"},
                {id: "http://data.total.com/resource/tsf/maintenance/romain_14224/08e53090d3", label: "O&G systems"}]

            var jstreeData = []
            var existingNodes = {}

            async.eachSeries(topClasses, function (topClass, callbackEach) {
                    jstreeData.push({
                        id: topClass.id,
                        text: topClass.label,
                        parent: "#"

                    })

                    Sparql_OWL.getNodeChildren(source, null, topClass.id, 2, null, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        result.forEach(function (item) {
                            if (!existingNodes[item.concept.value]) {
                                existingNodes[item.concept.value] = 1
                                jstreeData.push({
                                    id: item.concept.value,
                                    text: item.conceptLabel.value,
                                    parent: topClass.id,
                                    data: {
                                        id: item.concept.value,
                                        label: item.conceptLabel.value,
                                        type: "ontology"
                                    }

                                })
                            }
                            if (!existingNodes[item.child1.value]) {
                                existingNodes[item.child1.value] = 1
                                jstreeData.push({
                                    id: item.child1.value,
                                    text: item.child1Label.value,
                                    parent: item.concept.value,
                                    data: {
                                        id: item.child1.value,
                                        label: item.child1Label.value,
                                        path: item.child1.value + "/",
                                        type: "ontology"
                                    }

                                })
                            }
                            if (item.child2 && !existingNodes[item.child2.value]) {
                                existingNodes[item.child2.value] = 1
                                jstreeData.push({
                                    id: item.child2.value,
                                    text: item.child2Label.value,
                                    parent: item.child1.value,
                                    data: {
                                        id: item.child2.value,
                                        label: item.child2Label.value,
                                        path: item.child2.value + "/" + item.child2.value,
                                        type: "ontology"
                                    }

                                })
                            }


                        })
                        callbackEach()
                    })


                }
                , function (err) {
                    if (err)
                        return MainController.UI.message(err)
                    var options = {
                        selectTreeNodeFn: function (event, obj) {
                            self.currentOntologyTreeNode = obj.node
                        }
                        ,
                        contextMenu: TE_14224_browser.getOntologyJstreeContextMenu()
                    }
                    common.jstree.loadJsTree("TE_14224_browser_ontologyPanelDiv", jstreeData, options)

                })
        }


        return self;

    }
)
()