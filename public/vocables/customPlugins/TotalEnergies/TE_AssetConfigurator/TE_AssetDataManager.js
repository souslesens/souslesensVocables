var TE_AssetDataManager = (function () {

    var self = {}
    var assetTreeDistinctNodes = {}
    var graphAssetNodes;
    self.loadAsset = function (asset) {
        if (asset == "")
            return;
        self.currenTable = asset;

        if (self.currenTable == "girassol") {
            self.currentTable_14224Field = "RDLRelation";
            self.workOrdersTable = "Wordorder_girassol"
            self.failuresTable = ""
            self.currentDbName = 'data14224'
            self.currentFLcolumn = 'functionalLocationDescription'

        } else if (self.currenTable == "absheron") {
            self.currentTable_14224Field = "RDLRelation"
            self.currentDbName = 'data14224'

        } else if (self.currenTable == "Moho_N") {
            self.currentTable_14224Field = "RDScode"
            self.currentDbName = 'evolen'
            self.currentOpenNodeQuery = ' select *  from Moho_N where  location2 ='
            self.currentFLcolumn = 'location3'
        } else {
            self.currentTable_14224Field = null
        }
        var allJstreeData = [

            {
                id: "Equipments",
                text: "Equipments",
                parent: "#"
            },
            {
                id: "Instruments",
                text: "Instruments",
                parent: "#"
            },
            {
                id: "Lines",
                text: "Lines",
                parent: "#"
            }


        ]
        async.series([
                function (callback) {
                    self.getEquipments("equipments", "Equipments", function (err, jstreeData) {
                        if (err)
                            return callback(err)
                        allJstreeData = allJstreeData.concat(jstreeData)
                        callback()
                    })
                },


                function (callback) {
                  return  callback()
                    self.getLines("lines", "Lines", function (err, jstreeData) {
                        if (err)
                            return callback(err)
                        allJstreeData = allJstreeData.concat(jstreeData)
                        callback()
                    })
                }
            ], function (err) {
                if (err)
                    return MainController.UI.message(err)
                var options = {
                    openAll: false,
                    selectTreeNodeFn: function (event, obj) {
                        self.currentTreeNode = obj.node
                        var level = self.currentTreeNode.parents.length + 1
                        self.openAssetTreeNode(self.currentTreeNode, level)
                    },

                    contextMenu: TE_AssetDataManager.getAssetJstreeContextMenu()
                }
                common.jstree.loadJsTree("TE_AssetConfigurator_assetPanelTreeDiv", allJstreeData, options);
            }
        )

    }


    self.getEquipments = function (table, parentNode, callback) {
        graphAssetNodes = TE_AssetConfigurator.asset.getLinkedAssetNodesMap()

        var limit = 100000

        var sqlQuery = " select distinct concat('',id) as id,location1,location2 from " + table +
            " where (location4 is null or location4='')"
        ""// " where (location3 is null or location3='') and (location2 is not null and location2 !='')";


        self.querySQLserver(sqlQuery, function (err, data) {
            if (err)
                return MainController.UI.message(err)
            var jstreeData = []
            assetTreeDistinctNodes = {}

            data.forEach(function (item) {

                if (!item.location1)
                    return
                if (!assetTreeDistinctNodes[item.location1]) {
                    var text = item.location1
                    if (graphAssetNodes && graphAssetNodes["A_" + item.id])
                        text = "<span class='RDSassetTreeNode'>" + text + " </span>"
                    assetTreeDistinctNodes[item.location1] = 1
                    jstreeData.push({
                        id: item.location1,
                        text: item.location1,
                        parent: parentNode,
                        data: {
                            FunctionalLocationCode: text,
                            id: item.location1,
                            label: item.location1,
                            type: "location",
                        }


                    })
                }
                if (!assetTreeDistinctNodes[item.location2]) {
                    assetTreeDistinctNodes[item.location2] = 1
                    if (item.id == "684")
                        var x = 3
                    var text = item.location2
                    if (graphAssetNodes && graphAssetNodes["A_" + item.id])
                        text = "<span class='RDSassetTreeNode'>" + text + " </span>"
                    jstreeData.push({
                        //  id: item.location1 + "/" + item.location2,
                        id: item.id,
                        text: text,
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

            return callback(null, jstreeData)
        })

    }
    self.getLines = function (table, parentNode, callback) {
        return
        graphAssetNodes = TE_AssetConfigurator.asset.getLinkedAssetNodesMap()

        var limit = 100000

        var sqlQuery = " select distinct LineId,Fluid from" + table +
            " where (location4 is null or location4='')"



        self.querySQLserver(sqlQuery, function (err, data) {
            if (err)
                return MainController.UI.message(err)
            var jstreeData = []
            assetTreeDistinctNodes = {}

            data.forEach(function (item) {

                if (!item.LineId)
                    return
                if (!assetTreeDistinctNodes[item.location1]) {
                    var text = item.location1
                    if (graphAssetNodes && graphAssetNodes["A_" + item.id])
                        text = "<span class='RDSassetTreeNode'>" + text + " </span>"
                    assetTreeDistinctNodes[item.location1] = 1
                    jstreeData.push({
                        id: item.location1,
                        text: item.location1,
                        parent: parentNode,
                        data: {
                            FunctionalLocationCode: text,
                            id: item.location1,
                            label: item.location1,
                            type: "location",
                        }


                    })
                }
                if (!assetTreeDistinctNodes[item.location2]) {
                    assetTreeDistinctNodes[item.location2] = 1
                    if (item.id == "684")
                        var x = 3
                    var text = item.location2
                    if (graphAssetNodes && graphAssetNodes["A_" + item.id])
                        text = "<span class='RDSassetTreeNode'>" + text + " </span>"
                    jstreeData.push({
                        //  id: item.location1 + "/" + item.location2,
                        id: item.id,
                        text: text,
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

            return callback(null, jstreeData)
        })

    }
    self.getAssetJstreeContextMenu = function () {

        var items = {}

        items.nodeInfos = {
            label: "Node infos",
            action: function (e) {// pb avec source
                TE_AssetDataManager.showAssetNodeInfos(self.currentTreeNode)
            }
        }

        items.associateToRDSnode = {
            label: "Associate to RDS node",
            action: function (e) {// pb avec source
                TE_AssetConfigurator.asset.associateAssetNode(self.currentTreeNode.data,)
            }
        }
        items.showOnGraph = {
            label: "ShowOnGraph",
            action: function (e) {// pb avec source
                TE_AssetConfigurator.asset.focus(self.currentTreeNode.data.id)
            }
        }
        items.addToPID = {
            label: "addToPID",
            action: function (e) {// pb avec source
                TE_AssetDataManager.addToPID(self.currentTreeNode.data.id)
            }
        }
        return items

    }
    self.getAssetNodeLabel = function (assetNode) {

        if (assetNode.FullTag)
            return assetNode.FullTag + " "
        if (assetNode.location3)
            return assetNode.location3 + " "
        if (assetNode.location2)
            return assetNode.location2 + " "
        if (assetNode.location1)
            return assetNode.location1 + " "
        else
            return assetNode.FunctionalLocationCode

        label = node.label = assetNode.location1 + "/" + assetNode.location2 + "/" + assetNode.location3
    }

    self.openAssetTreeNode = function (node, level, callback) {


        var limit = 100000
        var parentData = node.data;
        var sqlQuery
        if (self.currentOpenNodeQuery) {
            sqlQuery = self.currentOpenNodeQuery + "'" + node.data.label + "'"
        } else {

            sqlQuery = " select id," +
                "FunctionalLocationCode,functionalLocationDescription," +
                self.currentTable_14224Field + " as mapping_14224 " +
                " from " + TE_AssetDataManager.currenTable + " where  parentFunctionalLocation ='" + parentData.FunctionalLocationCode + "' order by className";
            //   var sqlQuery = " select distinct tag," + self.currentTable_14224Field + " as mapping_14224 from " + self.currenTable + " where  id='"+node.data.id+"' order by tag";
        }

        self.querySQLserver(sqlQuery, function (err, result) {
            if (err)
                return MainController.UI.message(err)
            if (callback)
                return callback(null, result)
            var jstreeData = []
            result.forEach(function (item) {
                if (item.id == node.id)
                    return;

                var data = item;
                data.level = level;
                //  var childId = nodeId + "/" + common.formatUriToJqueryId(item.functionalLocationDescription)
                if (!assetTreeDistinctNodes[item.id]) {
                    assetTreeDistinctNodes[item.id] = 1
                    if (item.id == "684")
                        var x = 3
                    var text = item[self.currentFLcolumn] + (item.FullTag || "")
                    if (graphAssetNodes && graphAssetNodes["A_" + item.id])
                        text = "<span class='RDSassetTreeNode'>" + text + " </span>"
                    jstreeData.push({
                        id: "" + item.id,
                        text: text,
                        parent: node.id,
                        type: "owl:Class",
                        data: data
                    })
                }
            })
            common.jstree.addNodesToJstree("TE_AssetConfigurator_assetPanelTreeDiv", node.id, jstreeData)
        })


    }
    self.querySQLserver = function (sqlQuery, callback) {
        var limit = 100000
        var dataSource = {
            "type": "sql.sqlserver",
            "connection": "_default",
            "dbName": self.currentDbName,
            "table_schema": "dbo"
        }

        console.log(sqlQuery)

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
    self.loadPIDgraph = function () {
        var options = {}
        options.onclickFn = function (node, point, options) {
            var nodes = visjsGraph.data.nodes.get()
            MainController.UI.hidePopup("graphPopupDiv")
            self.currentGraphNode = node
            MainController.UI.message(JSON.stringify(point))
        }
        options.onClusterClickFn = function (clusterId, point, options) {
            visjsGraph.network.openCluster(clusterId)
        }
        options.onHoverNodeFn = function (node, point, options) {

        }
        options.onRightClickFn = TE_AssetConfigurator.showGraphPopupMenus
        options.manipulation = {
            enabled: true
        }
        /* options.nodes = {
             fixed: {x: true, y: true}
         }*/
        options.interaction = {
            zoomView: false,
            dragNodes: true,
            dragView: false
        }
        // options.noFit=true
        /*   options.manipulation= {
               enabled: {edges: true}
           }*/

        /*{ addNode: function(nodeData,callback) {
   if(!TE_AssetDataManager.currentTreeNode)
       return select("an asset node first");

   nodeData.label = TE_AssetDataManager.getAssetNodeLabel(TE_AssetDataManager.currentTreeNode);
   nodeData.id ="A_"+TE_AssetDataManager.currentTreeNode.id;
   nodeData.shape="box"
   nodeData.color="#09a4f3";
   nodeData.data={id:TE_AssetDataManager.currentTreeNode.id}
   callback(nodeData);
}}
}
}*/
        var positionNode = {id: "PP", shape: "star", color: "red"}
        var visjsData = {nodes: [], edges: []}

        var assetDataLabel = $("#TE_AssetDataManager_assetDataSelect").val()
        if (!assetDataLabel) {
            visjsGraph.draw("graphDiv", visjsData, options, function () {
                setTimeout(function () {

                    $("div.vis-network").addClass("canvasBG")
                }, 5)
            })
        } else {

            visjsGraph.loadGraph("PID_" + assetDataLabel + ".json", false, function (err, visjsData) {
                visjsGraph.draw("graphDiv", visjsData, options, function () {
                    setTimeout(function () {
                        $("div.vis-network").addClass("canvasBG")
                        visjsGraph.network.focus("CenterNode")
                        //  visjsGraph.network.setScale(1)
                        /*  var p=visjsGraph.network.getViewPosition()
                          var scale=visjsGraph.network.getScale()
                      visjsGraph.network.moveTo(
                          {
                              offset: {x:-p.x, y:-p.y},
                              scale: 1,

                          })
                        //  visjsGraph.network.fit()
                     //var xx=visjsGraph.network.getViewPosition()
                       /*   var newNodes = []
                          visjsData.nodes.forEach(function (item) {
                              newNodes.push({
                                  id: item.id,
                                  x: item.x,
                                  y: item.y,
                                  fixed:{x:true,y:true}
                              })

                          })
                          visjsGraph.data.nodes.update(newNodes)*/


                    }, 50)
                })
            })
        }
    }

    self.addToPID = function (node) {
        //   var positions = visjsGraph.network.getPositions(["PP"])
        var visjsData = {nodes: [], edges: []}
        visjsData.nodes.push({

            label: TE_AssetDataManager.getAssetNodeLabel(TE_AssetDataManager.currentTreeNode.data),
            id: "A_" + TE_AssetDataManager.currentTreeNode.id,
            shape: "box",
            color: "#09a4f3",
            data: {id: TE_AssetDataManager.currentTreeNode.id},
            // fixed: {x: true, y: true},
            x: 0,
            y: 0,

        })

        visjsGraph.data.nodes.update(visjsData.nodes)

    }
    self.savePIDgraph = function (node) {
        if (!visjsGraph.data.nodes.get("CenterNode"))
            visjsGraph.data.nodes.add({
                id: "CenterNode",
                shape: "dot",
                size: "1px"
            })

        if (visjsGraph.isGraphNotEmpty()) {
            var assetDataLabel = $("#TE_AssetDataManager_assetDataSelect").val()

            if (assetDataLabel) {
                visjsGraph.saveGraph("PID_" + assetDataLabel, true)

            }

        }
    }

    return self;


})()