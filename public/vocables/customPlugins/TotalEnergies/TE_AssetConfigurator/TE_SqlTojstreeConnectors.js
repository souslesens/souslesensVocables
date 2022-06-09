// eslint-disable-next-line @typescript-eslint/no-unused-vars
var TE_SqlTojstreeConnectors = (function () {
    var self = {};

    self.getJsTreeData_moho_equipments = function (parentNode, coloredNodes, callback) {
        var sqlQuery = " select distinct  id,location1,location2 from equipments";
        var dbName = "evolen";
        self.querySQLserver(dbName, sqlQuery, function (err, data) {
            if (err) return MainController.UI.message(err);
            var jstreeData = [];
            var assetTreeDistinctNodes = {};

            data.forEach(function (item) {
                if (!item.location1) return;
                if (!assetTreeDistinctNodes[item.location1]) {
                    var text = item.location1;
                    if (coloredNodes && coloredNodes["A_" + item.id]) text = "<span class='RDSassetTreeNode'>" + text + " </span>";
                    assetTreeDistinctNodes[item.location1] = 1;
                    jstreeData.push({
                        id: item.location1,
                        text: item.location1,
                        parent: parentNode,
                        data: {
                            FunctionalLocationCode: text,
                            id: item.location1,
                            label: item.location1,
                            type: "equipments",
                        },
                    });
                }
                if (!assetTreeDistinctNodes[item.location2]) {
                    assetTreeDistinctNodes[item.location2] = 1;
                    text = item.location2;
                    if (coloredNodes && coloredNodes["A_" + item.id]) text = "<span class='RDSassetTreeNode'>" + text + " </span>";
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
                            type: "equipments",
                        },
                    });
                }
            });
            return callback(null, jstreeData);
        });
    };
    self.getJsTreeData_moho_lines = function (parentNode, coloredNodes, callback) {
        var sqlQuery = " select distinct LineId,Fluid from lines ";
        var dbName = "evolen";
        self.querySQLserver(dbName, sqlQuery, function (err, data) {
            if (err) return MainController.UI.message(err);
            var jstreeData = [];
            var assetTreeDistinctNodes = {};

            data.forEach(function (item) {
                if (!item.LineId) return;
                if (!assetTreeDistinctNodes[item.LineId]) {
                    assetTreeDistinctNodes[item.LineId] = 1;
                    var text = item.LineId;
                    if (coloredNodes && coloredNodes["A_" + item.id]) text = "<span class='RDSassetTreeNode'>" + text + " </span>";

                    jstreeData.push({
                        id: item.LineId,
                        text: item.LineId + " " + item.Fluid,
                        parent: parentNode,
                        data: {
                            FunctionalLocationCode: text,
                            id: item.LineId,
                            label: item.LineId + " " + item.Fluid,
                            type: "location",
                        },
                    });
                }
            });

            return callback(null, jstreeData);
        });
    };
    self.getJsTreeData_moho_instruments = function (parentNode, coloredNodes, callback) {
        var sqlQuery = " select distinct id,TagNumber,INSTRUMENTTYPEDESCRIPTION from instruments ";
        var dbName = "evolen";
        self.querySQLserver(dbName, sqlQuery, function (err, data) {
            if (err) return MainController.UI.message(err);
            var jstreeData = [];
            var assetTreeDistinctNodes = {};

            data.forEach(function (item) {
                if (!item.id) return;
                if (!assetTreeDistinctNodes[item.id]) {
                    assetTreeDistinctNodes[item.LineId] = 1;
                    var text = item.TagNumber + " " + item.INSTRUMENTTYPEDESCRIPTION;
                    if (coloredNodes && coloredNodes["A_" + item.id]) text = "<span class='RDSassetTreeNode'>" + text + " </span>";

                    jstreeData.push({
                        id: item.id,
                        text: text,
                        parent: parentNode,
                        data: {
                            FunctionalLocationCode: text,
                            id: item.id,
                            label: text,
                            type: "location",
                        },
                    });
                }
            });
            return callback(null, jstreeData);
        });
    };

    self.showAssetNodeInfos = function (dbName, node, _callee) {
        var sqlQuery = " select distinct * from " + node.data.type + " where  id=" + node.data.id;

        self.querySQLserver(dbName, sqlQuery, function (err, data) {
            if (err) return MainController.UI.message(err);
            var nodeId = node.id;
            if (data.length == 0) return;
            var headers = Object.keys(data[0]);

            nodeId = data[0].tag;
            var str = "<div style='max-height:800px;overflow: auto'>" + "<table class='infosTable'>";
            str += "<tr><td class='detailsCellName'>UUID</td><td><a target='_blank' href='" + nodeId + "'>" + nodeId + "</a></td></tr>";
            str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";

            data.forEach(function (item) {
                headers.forEach(function (key) {
                    str += "<tr class='infos_table'>";

                    str += "<td class='detailsCellName'>" + key + "</td>";

                    str += "<td class='detailsCellValue'>" + item[key] + "</td>";
                    str += "</tr>";
                });
                str += "</table>";
            });
            $("#mainDialogDiv").html(str);
            $("#mainDialogDiv").dialog("open");
        });
    };

    self.getChildrenNodesJsTreeData = function (dbName, node, coloredNodes, callback) {
        if (node.data.type == "equipments") {
            var sqlQuery = "  select *  from equipments where  location2 ='" + node.data.label + "'";
            self.querySQLserver(dbName, sqlQuery, function (err, result) {
                if (err) return callback(null, result);

                var jstreeData = [];
                var assetTreeDistinctNodes = {};
                result.forEach(function (item) {
                    if (item.id == node.id) return;

                    var data = item;
                    //  var childId = nodeId + "/" + common.formatUriToJqueryId(item.functionalLocationDescription)
                    if (!assetTreeDistinctNodes[item.id]) {
                        assetTreeDistinctNodes[item.id] = 1;

                        var text = (item.FullTag || "") + " " + item["location3"];
                        if (coloredNodes && coloredNodes["A_" + item.id]) text = "<span class='RDSassetTreeNode'>" + text + " </span>";
                        jstreeData.push({
                            id: "" + item.id,
                            text: text,
                            parent: node.id,
                            type: "owl:Class",
                            data: data,
                        });
                    }
                });
                return callback(null, jstreeData);
            });
        }
        return [];
    };

    self.querySQLserver = function (dbName, sqlQuery, callback) {
        const params = new URLSearchParams({
            type: "sql.sqlserver",
            dbName: dbName,
            sqlQuery: sqlQuery,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                return callback(err);
            },
        });
    };

    return self;
})();
