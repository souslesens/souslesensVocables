var TE_AssetDataManager = (function () {

    var self = {}

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
        self.getFunctionalLocations(asset)
    }

    self.getFunctionalLocations = function (table) {


        var limit = 100000

        var sqlQuery = " select distinct concat('A_',id) as id,location1,location2 from " + table +
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

                contextMenu: TE_AssetDataManager.getAssetJstreeContextMenu()
            }
            common.jstree.loadJsTree("TE_AssetConfigurator_assetPanelTreeDiv", jstreeData, options);
        })

    }
    self.getAssetJstreeContextMenu = function () {

        var items = {}

        items.nodeInfos = {
            label: "Node infos",
            action: function (e) {// pb avec source
                TE_AssetDataManager.self.showAssetNodeInfos(self.currentTreeNode)
            }
        }

        items.associateToRDSnode = {
            label: "Associate to RDS node",
            action: function (e) {// pb avec source
                TE_AssetConfigurator.asset.associateAssetNode(self.currentTreeNode.data,)
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
                    jstreeData.push({
                        id: "A_" + item.id,
                        text: item[self.currentFLcolumn],
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


    return self;


})()