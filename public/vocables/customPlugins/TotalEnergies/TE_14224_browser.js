var TE_14224_browser = (function () {

        var self = {}
        var source
        var graphUri
        var assetTreeDistinctNodes = {}
        self.mainSource = "TSF_ISO_14224"

        //self.graphUri = Config.sources[self.mainSource]
        self.onSourceSelect = function () {

        }
        self.onLoaded = function () {

            $("#actionDiv").html("")
            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/snippets/leftPanel.html")
            MainController.UI.toogleRightPanel(true)
            $("#rightPanelDiv").html("")
            $("#rightPanelDiv").load("customPlugins/TotalEnergies/snippets/rightPanel.html")


            $("#graphDiv").html("")
            // $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
            $("#accordion").accordion("option", {active: 2});


            $("#sourcesTreeDiv").html("");
            source = "TSF_GS_EP-EXP_207_11"
            graphUri = Config.sources[source].graphUri
            Lineage_classes.mainSource = source
            Lineage_common.currentSource = source

            setTimeout(function () {
                self.loadOntologytree()
            }, 200)

        }

        self.loadAsset = function (asset) {
            if (asset == "")
                return;
            self.currenTable = asset
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

            var sqlQuery = " select distinct location1,location2 from " + table;


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
                                location: item.location1,
                                id: item.location1,
                                label: item.location1,
                                type: "location",
                            }


                        })
                    }
                    if (!assetTreeDistinctNodes[item.location2]) {
                        assetTreeDistinctNodes[item.location2] = 1
                        jstreeData.push({
                            id: item.location1 + "/" + item.location2,
                            text: item.location2,
                            parent: item.location1,
                            data: {
                                location: item.location1 + "/" + item.location2,
                                id: item.location1 + "/" + item.location2,
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
                        if (level > 4) {
                            if (self.currentTreeNode.data.type == "location")
                                self.openClassTreeNode(self.currentTreeNode.data.id, level)
                            else if (self.currentTreeNode.data.type == "class")
                                self.openTagTreeNode(self.currentTreeNode)
                            else if (self.currentTreeNode.data.type == "tag")
                                self.showTagInfos(self.currentTreeNode)
                        } else {
                            self.openFunctionalLocationTreeNode(self.currentTreeNode.data.id, level)
                        }

                    }
                    ,
                    contextMenu: TE_14224_browser.getAssetJstreeContextMenu()
                }
                common.jstree.loadJsTree("TE_114224_browser_assetPanelTreeDiv", jstreeData, options);
            })

        }

        self.openFunctionalLocationTreeNode = function (nodeId, level) {


            var limit = 100000

            var sqlQuery = " select distinct location" + level + " from " + self.currenTable + " where  parentFunctionalLocation='" + nodeId + "'";


            self.querySQLserver(sqlQuery, function (err, data) {
                if (err)
                    return MainController.UI.message(err)
                var jstreeData = []
                data.forEach(function (item) {

                    var childId = item["location" + level]
                    if (!assetTreeDistinctNodes[childId]) {
                        assetTreeDistinctNodes[childId] = 1
                        jstreeData.push({
                            id: nodeId + "/" + childId,
                            text: childId,
                            parent: nodeId,
                            data: {
                                type: "location",
                                id: nodeId + "/" + childId,
                                location: nodeId + "/" + childId,

                                text: childId,

                            }
                        })
                    }
                })
                common.jstree.addNodesToJstree("TE_114224_browser_assetPanelTreeDiv", nodeId, jstreeData)
            })
        }
        self.openClassTreeNode = function (nodeId, level) {


            var limit = 100000

            var sqlQuery = " select distinct className from " + self.currenTable + " where  FunctionalLocationCode like'" + nodeId + "%' order by className";


            self.querySQLserver(sqlQuery, function (err, data) {
                if (err)
                    return MainController.UI.message(err)
                var jstreeData = []
                data.forEach(function (item) {

                    var childId = item.className
                    if (!assetTreeDistinctNodes[childId]) {
                        assetTreeDistinctNodes[childId] = 1
                        jstreeData.push({
                            id: nodeId + "/" + childId,
                            text: childId,
                            parent: nodeId,
                            type: "owl:Class",
                            data: {
                                type: "class",
                                id: nodeId + "/" + childId,
                                location: nodeId,
                                className: childId,

                                text: childId,

                            }
                        })
                    }
                })
                common.jstree.addNodesToJstree("TE_114224_browser_assetPanelTreeDiv", nodeId, jstreeData)
            })
        }

        self.openTagTreeNode = function (node) {

            var limit = 100000

            var sqlQuery = " select distinct tag from " + self.currenTable + " where  className ='" + node.data.className + "' and   FunctionalLocationCode like'" + node.data.location + "%' order by tag";


            self.querySQLserver(sqlQuery, function (err, data) {
                if (err)
                    return MainController.UI.message(err)
                var jstreeData = []
                var nodeId = node.id
                data.forEach(function (item) {

                    var childId = item.tag
                    if (!assetTreeDistinctNodes[childId]) {
                        assetTreeDistinctNodes[childId] = 1
                        jstreeData.push({
                            id: nodeId + "/" + childId,
                            text: childId,
                            parent: nodeId,
                            type: "owl:table",
                            data: {
                                type: "tag",
                                id: nodeId + "/" + childId,
                                className: node.data.className,
                                location: node.data.location,
                                tag: childId,
                                text: childId,

                            }
                        })
                    }
                })
                common.jstree.addNodesToJstree("TE_114224_browser_assetPanelTreeDiv", nodeId, jstreeData)
            })


        }


        self.xxx = function () {
            setTimeout(function () {
                    var levels = [

                        "Country",
                        "3-Installation",
                        "4-Plant/Unit",
                        "5-System",
                        "6-Equipment unit/Package",
                        "7-SubUnit/Class",
                        "8-Component",
                        "9-part"

                    ]
                    //  common.fillSelectOptions("TE_114224_browser_levelsSelect", levels)


                    var superClasses = [
                        {uri: "http://w3id.org/readi/z018-rdl/prod_SYS", label: "SYSTEM"},
                        {uri: "http://standards.iso.org/iso/15926/part14/FunctionalObject", label: "FUNCTION"},
                        {uri: "http://w3id.org/readi/rdl/CFIHOS-30000311", label: "ARTEFACT"},
                        {uri: "http://w3id.org/readi/rdl/CFIHOS-30000311", label: "COMPONENT"},
                        {uri: "https://w3id.org/requirement-ontology/rdl/REQ_0007", label: "ADVICE"},
                        {uri: "https://w3id.org/requirement-ontology/rdl/REQ_0010", label: "RECOMMENDATION"},
                        {uri: "https://w3id.org/requirement-ontology/rdl/REQ_0011", label: "REQUIREMENT"},


                    ]
                    var index = 0
                    var htmlTotal = ""
                    var treesData = {}
                    async.eachSeries(superClasses, function (superClass, callbackEach) {

                        Sparql_OWL.getNodeChildren(self.mainSource, null, [superClass.uri], 1, null, function (err, result) {
                            if (err)
                                return callbackEach()

                            var html = "<div class='TE_114224_browser_leftPanelClassDiv'>"
                            html += "<div  class='TE_114224_browser_title'>" + superClass.label + "</div>"
                            html += "<div class='TE_114224_browser_leftPanelTreeContainer'>"
                            html += "<div id='TE_114224_browser_tree_" + superClass.label + "'>"
                            html += "</div>"
                            html += "</div>"
                            html += "</div>"
                            htmlTotal += html;

                            result.forEach(function (item) {
                                jstreeData.push({
                                    id: item.child1.value,
                                    text: item.child1Label.value,
                                    parent: "#",
                                    data: {
                                        id: item.child1.value,
                                        label: item.child1Label.value,
                                    }
                                })

                            })

                            treesData["TE_114224_browser_tree_" + superClass.label] = jstreeData


                            if (++index > 5)
                                return callbackEach("stop")
                            callbackEach()
                        })
                    }, function (err) {
                        if (err)
                            ;//  return alert(err)
                        $("#TE_114224_browser_filtersContainerDiv").html(htmlTotal)
                        setTimeout(function () {

                            var options = {withCheckboxes: 1}
                            for (var key in treesData) {
                                common.jstree.loadJsTree(key, treesData[key], options)

                            }

                        }, 200)

                    })


                }
                , 200)

        }

        self.querySQLserver = function (sqlQuery, callback) {
            var limit = 100000
            var dataSource = {
                "type": "sql.sqlserver",
                "connection": "_default",
                "dbName": "data14224",
                "table_schema": "dbo"
            }


            const params = new URLSearchParams({
                dbName: dataSource.dbName,
                type: dataSource.type,
                sqlQuery: sqlQuery
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "?" + params.toString(),
                dataType: "json",

                success: function (data, textStatus, jqXHR) {
                    callback(null, data)
                },
                error(err) {
                    return callback(err)
                }
            })
        }

        self.showTagInfos = function (node) {
            var sqlQuery = " select * from " + self.currenTable + " where  className ='" + node.data.className + "' " +
                "and   FunctionalLocationCode like'" + node.data.location + "%'" +
                " and tag='" + node.data.tag + "' order by tag";


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
            var visjsData = {nodes: [], edges: []}
            var assetNodeIds = []

            async.series([

                function (callbackSeries) {
var assetClassColumn=""
                    var samAs207Column = ""
                    if (self.currenTable == "girassol") {
                        samAs207Column = "className"
                        assetClassColumn="description"
                    }
                    else if (self.currenTable == "absheron") {
                        samAs207Column = "RDLRelation"
                        assetClassColumn="functionalLocationDescription"
                    }

                    var sqlQuery = "select distinct location1,location2,location3,location4," + samAs207Column +","+assetClassColumn+ " from " + self.currenTable;
                    //  var sqlQuery = " select distinct '" + node.data.id + "' as id ," + samAs207Column + " from " + self.currenTable;
                    if (node.data.type == "location") {
                        //    sqlQuery += " where parentFunctionalLocation = '" + node.id + "'"
                        sqlQuery += " where   FunctionalLocationCode like'" + node.data.location + "%' ";

                    } else if (node.data.type == "class") {
                        sqlQuery += " where  className ='" + node.data.className + "' and   FunctionalLocationCode like'" + node.data.location + "%' ";

                    } else if (node.data.type == "tag") {
                        sqlQuery += " where  className ='" + node.data.className + "' " +
                            "and   FunctionalLocationCode like'" + node.data.location + "%'" +
                            " and tag='" + node.data.tag + "' ";


                    }
                    self.querySQLserver(sqlQuery, function (err, data) {


                        if (err)
                            return MainController.UI.message(err)

                        var standardType = "http://w3id.org/readi/rdl/CFIHOS-30000311"

                        var visjsExistingNodes = visjsGraph.getExistingIdsMap();

                        if (data.length > 0) {
                            data.forEach(function (item) {
                                if (item[samAs207Column] == '')
                                    return;
                                var uri = graphUri + item[samAs207Column].replace(/-/g, "_")
                                var id = item.location1 + "/" + item.location2 + "/" + item.location3 + "/" + item.location4 + "/" + item[assetClassColumn]
                                id = id.replace(/\/\//g, "")
                                assetNodeIds.push({id: id})

                                if (!visjsExistingNodes[uri]) {
                                    visjsExistingNodes[uri] = 1
                                    var node = {
                                        id: uri,
                                        label: item[assetClassColumn],

                                        size: Lineage_classes.defaultShapeSize,
                                        //  image: CustomPluginController.path + CustomPluginController.typeUrisIcons[standardType],
                                        //   shape: "circularImage",
                                        shape: "dot",
                                        size: 5,
                                        borderWidth: 4,
                                        shadow:true,
                                        color: Lineage_classes.getSourceColor(self.currenTable),
                                        data: {source: source, id: uri, label: item[assetClassColumn]},
                                        level: 6,

                                    }
                                    visjsData.nodes.push(node)
                                }

                                var edgeId = uri + "_" + id
                                if (!visjsExistingNodes[edgeId]) {
                                    visjsExistingNodes[edgeId] = 1
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: uri,
                                        to: id,
                                        //   label: "has14224Class"
                                        dashes: true,
                                        color: "red"


                                    })


                                }


                                var array = id.split("/");
                            //    array.push(item[assetClassColumn])

                                var currentId = ""
                                for (var i = 0; i < array.length; i++) {
                                    var item = array[i];
                                    var parent = null

                                    if (i > 0) {
                                        parent = currentId
                                        currentId += "/"
                                    }
                                    currentId += item
                                    var standardType
                                    if (i < 4)
                                        standardType = "http://standards.iso.org/iso/15926/part14/Location"
                                    if (i == 4) {
                                        standardType = "http://w3id.org/readi/rdl/CFIHOS-30000311"
                                    }
                                    if (i == 5) {
                                        standardType = "http://w3id.org/readi/rdl/D101001495"
                                    }


                                    if (!visjsExistingNodes[currentId]) {
                                        visjsExistingNodes[currentId] = 1
                                        var node = {
                                            id: currentId,
                                            label: item,

                                            size: Lineage_classes.defaultShapeSize,
                                            //   image: CustomPluginController.path + CustomPluginController.typeUrisIcons[standardType],
                                            //   shape: "circularImage",
                                            shape: "square",
                                            size: 5,
                                            borderWidth: 4,
                                            color: Lineage_classes.getSourceColor(self.currenTable),
                                            data: {
                                                source: "TE_14224_browser",
                                                id: currentId,
                                                label: item,
                                                type: "assetNode"
                                            },
                                            level: i,

                                        }
                                        visjsData.nodes.push(node)

                                    }
                                    if (parent) {
                                        var edgeId = currentId + "_" + parent
                                        if (!visjsExistingNodes[edgeId]) {
                                            visjsExistingNodes[edgeId] = 1
                                            visjsData.edges.push({
                                                id: edgeId,
                                                from: currentId,
                                                to: parent

                                            })


                                        }
                                    }
                                }


                            })

                            callbackSeries();
                            //   Lineage_classes.addParentsToGraph(source, ids)

                        }

                    })

                },
                function (callbackSeries) {
                    return callbackSeries()
                    self.graphNodeAndparents(assetNodeIds, function (err, result) {
                        if (err)
                            return callbackSeries()
                        visjsData.nodes = visjsData.nodes.concat(result.nodes)
                        visjsData.edges = visjsData.edges.concat(result.nodes)
                        callbackSeries()
                    })

                },
            ], function (err) {
                if (visjsGraph.data && visjsGraph.data.nodes) {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                } else {
                    self.drawNewGraph(visjsData)
                }

            })
        }


        self.graphNodeAndparents = function (nodes, callback) {


            if (!Array.isArray(nodes)) {
                nodes = [nodes]
            }
            var visjsData = {nodes: [], edges: []}
            var visjsExistingNodes = visjsGraph.getExistingIdsMap();

            nodes.forEach(function (nodeobj) {

                var array = nodeobj.id.split("/");

                var currentId = ""
                for (var i = 0; i < array.length; i++) {
                    var item = array[i];
                    var parent = null

                    if (i > 0) {
                        parent = currentId
                        currentId += "/"
                    }
                    currentId += item
                    var standardType
                    if (i < 4)
                        standardType = "http://standards.iso.org/iso/15926/part14/Location"
                    if (i == 4) {
                        standardType = "http://w3id.org/readi/rdl/CFIHOS-30000311"
                    }
                    if (i == 5) {
                        standardType = "http://w3id.org/readi/rdl/D101001495"
                    }


                    if (!visjsExistingNodes[currentId]) {
                        visjsExistingNodes[currentId] = 1
                        var node = {
                            id: currentId,
                            label: item,

                            size: Lineage_classes.defaultShapeSize,
                            //   image: CustomPluginController.path + CustomPluginController.typeUrisIcons[standardType],
                            //   shape: "circularImage",
                            shape: "square",
                            size: 5,
                            borderWidth: 4,
                            color: Lineage_classes.getSourceColor(self.currenTable),
                            data: {source: "TE_14224_browser", id: currentId, label: item, type: "assetNode"},
                            level: i,

                        }
                        visjsData.nodes.push(node)

                    }
                    if (parent) {
                        var edgeId = currentId + "_" + parent
                        if (!visjsExistingNodes[edgeId]) {
                            visjsExistingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: currentId,
                                to: parent

                            })


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
                self.drawNewGraph(visjsData, "hierarchical")
            }


        }


        self.showAssetData=function(node){

            var parent=node.data.path


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
                options.layoutHierarchical = {direction: "LR", sortMethod: "directed", levelSeparation: 100}

            }
            visjsGraph.draw("graphDiv", visjsData, options)
            $("#waitImg").css("display", "none");
        }

        self.getAssetJstreeContextMenu = function () {
            var items = {}

            items.nodeInfos = {
                label: "Node Infos",
                action: function (e) {// pb avec source
               if (self.currentTreeNode.data.type == "tag")
                        self.showTagInfos(self.currentTreeNode)


                }
            }
            items.graphNodeAndparents = {
                label: "Graph Node",
                action: function (e) {// pb avec source
                    TE_14224_browser.graphNodeAndparents(self.currentTreeNode)

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

                        SourceBrowser.showNodeInfos( self.mainSource,self.currentOntologyTreeNode.id,"mainDialogDiv")


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
                if (node.data.type == "assetNode") {

                } else {
                    Lineage_classes.currentGraphNode = node
                    Lineage_classes.onGraphOrTreeNodeClick(node, options, {callee: "Graph"})
                }

            }
            , showGraphPopupMenu: function (node, point, options) {

                if (node.data.type == "assetNode") {
                    if (!node)
                        return;

                    var html = "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.showNodeInfos();\"> Node infos</span>"

                    $("#graphPopupDiv").html(html);
                    self.currentGraphNode = node;
                    MainController.UI.showPopup(point, "graphPopupDiv")

                } else {
                    Lineage_classes.graphActions.showGraphPopupMenu(node, point, options)
                }


            }
        }


        self.loadOntologytree = function () {

            var source = "TSF_GS_EP-EXP_207_11"
            var topClasses = [{id:"http://w3id.org/readi/z018-rdl/prod_SYS",label:"SYSTEM"}]

            var jstreeData = []
            var existingNodes={}

           async.eachSeries(topClasses,function (topClass,callbackEach) {
                   jstreeData.push({
                       id: topClass.id,
                       text: topClass.label,
                       parent: "#"

                   })

               Sparql_OWL.getNodeChildren(source, null, topClass.id, 2, null, function (err, result) {
                   if (err)
                       return callbackEach(err)
                   result.forEach(function (item) {
                       if(!existingNodes[item.concept.value]) {
                           existingNodes[item.concept.value] = 1
                           jstreeData.push({
                               id: item.concept.value,
                               text: item.conceptLabel.value,
                               parent: topClass.id,
                               data:{ id: item.concept.value,
                                   label: item.conceptLabel.value,
                                   type: "ontology"}

                           })
                       }
                       if(!existingNodes[item.child1.value]) {
                           existingNodes[item.child1.value] = 1
                           jstreeData.push({
                               id: item.child1.value,
                               text: item.child1Label.value,
                               parent: item.concept.value,
                           data:{ id: item.child1.value,
                               label: item.child1Label.value,
                               path:item.child1.value+"/",
                               type: "ontology"}

                           })
                       }
                       if(item.child2 && !existingNodes[item.child2.value]) {
                           existingNodes[item.child2.value] = 1
                           jstreeData.push({
                               id: item.child2.value,
                               text: item.child2Label.value,
                               parent: item.child1.value,
                               data:{ id: item.child2.value,
                                   label: item.child2Label.value,
                                   path:item.child2.value+"/"+item.child2.value,
                                   type: "ontology"}

                           })
                       }


                   })
                   callbackEach()
               })



                   }
                   , function (err) {
                       if (err)
                           return MainController.UI.message(err)
                   var options= {
                       selectTreeNodeFn: function (event, obj) {
                           self.currentOntologyTreeNode = obj.node
                       }
                       ,
                       contextMenu: TE_14224_browser.getOntologyJstreeContextMenu()
                   }
                       common.jstree.loadJsTree("TE_114224_browser_ontologyPanelDiv", jstreeData,options)

           })
        }



        return self;

    }
)
()
