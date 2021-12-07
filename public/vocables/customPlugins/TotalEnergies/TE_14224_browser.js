var TE_14224_browser = (function () {

        var self = {}

        var assetTreeDistinctNodes = {}
        self.mainSource = "TSF_ISO_14224"

        //self.graphUri = Config.sources[self.mainSource]
        self.onSourceSelect = function () {

        }
        self.onLoaded = function () {

            $("#actionDiv").html("")
            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/snippets/leftPanel.html")
            MainController.UI.toogleRightPanel(true)
            $("#assetPanelDiv").html("")
            $("#assetPanelDiv").load("customPlugins/TotalEnergies/snippets/assetPanel.html")


            $("#graphDiv").html("")
            // $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
            $("#accordion").accordion("option", {active: 2});


            $("#sourcesTreeDiv").html("");


        }

        self.loadAsset = function (asset) {
            if (asset == "")
                return;
            self.currenTable = asset
            self.getFunctionalLocations(asset)
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
                                id: item.location1,
                                label: item.location1,
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
                                id: item.location1 + "/" + item.location2,
                                label: item.location2,
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
                    contextMenu: TE_14224_browser.getJstreeContextMenu()
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
        self.getJstreeContextMenu = function () {
            var items = {}

            items.graphNode = {
                label: "Graph Node",
                action: function (e) {// pb avec source
                    TE_14224_browser.graphNode(self.currentTreeNode)

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


        self.mapClassesTo14224 = function (node) {
            var samAs207Column = ""
            if (self.currenTable == "girassol")
                samAs207Column = "className"
            else if (self.currenTable == "absheron")
                samAs207Column = "RDLRelation"


            var sqlQuery = " select distinct "+node.data.id+"az id ," + samAs207Column + " from " + self.currenTable;
            if (node.data.type == "location") {
                sqlQuery += " where parentFunctionalLocation = '" + node.id + "'"

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
                var ids = []
                var source = "TSF_GS_EP-EXP_207_11"
                var graphUri = Config.sources[source].graphUri
                Lineage_common.mainSource = source
                Lineage_common.currentSource=source
                var standardType = "http://w3id.org/readi/rdl/CFIHOS-30000311"

                var visjsExistingNodes = visjsGraph.getExistingIdsMap();
                var visjsData = {nodes: [], edges: []}
                if (data.length > 0) {
                    data.forEach(function (item) {
                        if (item == '')
                            return;
                        var uri = graphUri + item[samAs207Column].replace(/-/g, "_")


                        if (!visjsExistingNodes[uri]) {
                            visjsExistingNodes[uri] = 1
                            var node = {
                                id: uri,
                                label: item[samAs207Column],

                                size: Lineage_classes.defaultShapeSize,
                                image: CustomPluginController.path + CustomPluginController.typeUrisIcons[standardType],
                                shape: "circularImage",
                                size: 10,
                                borderWidth: 4,
                                color: Lineage_classes.getSourceColor(self.currenTable),
                                data: {source: source},
                                level: i,

                            }
                            visjsData.nodes.push(node)
                        }

                        var edgeId = uri + "_" + item.id
                        if (!visjsExistingNodes[edgeId]) {
                            visjsExistingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: uri,
                                to: item.id,
                                label: "has14224Class"


                            })


                        }
                    })
                    if (visjsGraph.data && visjsGraph.data.nodes) {
                        visjsGraph.data.nodes.add(visjsData.nodes)
                        visjsGraph.data.edges.add(visjsData.edges)
                    } else {
                        Lineage_classes.drawNewGraph(visjsData)
                    }

                  //  Lineage_classes.addParentsToGraph(source, ids)

                }

            })

        }
        self.graphNode = function (node) {
            var array = node.id.split("/");

            var visjsData = {nodes: [], edges: []}
            var visjsExistingNodes = visjsGraph.getExistingIdsMap();

           /* if (!existingNodes[self.currenTable]) {
                existingNodes[self.currenTable] = 1
                var sourceNode = {
                    id: self.currenTable,
                    label: self.currenTable,
                    shape: "box",
                    size: Lineage_classes.defaultShapeSize,
                    color: Lineage_classes.getSourceColor(self.currenTable),
                    data: {source: self.currenTable},
                    level: 1,

                }
                visjsData.nodes.push(sourceNode)
            }*/

            for (var i = 0; i < array.length; i++) {
                var item = array[i];
                var parent=null

                if(i>0)
                    parent = array[i - 1]
                var standardType
                if (i < 5)
                    standardType = "http://standards.iso.org/iso/15926/part14/Location"
                if (i == 5) {
                    standardType = "http://w3id.org/readi/rdl/CFIHOS-30000311"
                }
                if (i == 6) {
                    standardType = "http://w3id.org/readi/rdl/D101001495"
                }


                if (!visjsExistingNodes[item]) {
                    visjsExistingNodes[item] = 1
                    var node = {
                        id: item,
                        label: item,

                        size: Lineage_classes.defaultShapeSize,
                        image: CustomPluginController.path + CustomPluginController.typeUrisIcons[standardType],
                        shape: "circularImage",
                        size: 10,
                        borderWidth: 4,
                        color: Lineage_classes.getSourceColor(self.currenTable),
                        data: {source: "SQL:" + self.currenTable},
                        level: i,

                    }
                    visjsData.nodes.push(node)

                }
                if(parent) {
                    var edgeId = item + "_" + parent
                    if (!visjsExistingNodes[edgeId]) {
                        visjsExistingNodes[edgeId] = 1
                        visjsData.edges.push({
                            id: edgeId,
                            from: item,
                            to: parent

                        })


                    }
                }
            }

            if (visjsGraph.data && visjsGraph.data.nodes) {
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
            } else {
                Lineage_classes.drawNewGraph(visjsData)
            }


        }


        return self;

    }
)
()