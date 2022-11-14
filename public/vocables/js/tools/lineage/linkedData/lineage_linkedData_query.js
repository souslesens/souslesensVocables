var Lineage_linkedData_query = (function () {
    var self = {};
    self.databasesMap = {};
    self.relationObj = {};
    self.sqlContext = {};
    self.sqlContexts = [];

    self.init = function () {
        $("#LineageLinkedDataRelationsDiv").load("snippets/lineage/linkedData/lineage_linkedData_relations.html", function () {
            Lineage_linkedData_mappings.getSourceJoinsMappings(Lineage_sources.activeSource, {}, function (err, joinsMap) {
                if (err) return alert(err.responseText);
                var joins = [];
                self.joinsMap = joinsMap;
                for (var join in joinsMap) {
                    var joinObj = joinsMap[join];
                    joins.push({
                        id: join,
                        label: joinObj.from.classLabel + "-" + joinObj.propLabel + "->" + joinObj.to.classLabel,
                    });
                }

                common.fillSelectOptions("lineage_linkedata_queryRelations_relationsSelect", joins, null, "label", "id");
            });
        });
    };

    self.showRelationFilterDialog = function (relationId) {
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/lineage/linkedData/lineage_linkedData_queryDialog.html", function () {
            self.relationObj = self.joinsMap[relationId];
            self.databasesMap = self.joinsMap[relationId].databases;

            common.fillSelectOptions("LineageLinkedDataQueryParams_database", Object.keys(self.databasesMap));
        });
    };
    self.onDatabaseChange = function (database) {
        self.sqlContext = { tables: {} };
        self.currentDatabase = database;
        self.sqlContext.currentDataSource = { type: "sql.sqlserver", dbName: self.currentDatabase };
        var classes = [
            { label: self.relationObj.from.classLabel + "->" + self.databasesMap[self.currentDatabase].from.table, id: "from" },
            { label: self.relationObj.to.classLabel + "->" + self.databasesMap[self.currentDatabase].to.table, id: "to" },
        ];
        $("#LineageLinkedDataQueryParams_createFilterDiv").css("display", "none");
        common.fillSelectOptions("LineageLinkedDataQueryParams_classes", classes, null, "label", "id");

        if (!self.databasesMap[database].model) {
            KGcreator.listTables(self.currentDatabase, function (err, model) {
                if (err) return alert(err.responseText);
                self.databasesMap[database].model = model;
            });
        }
    };
    self.onClassChange = function (classRole) {
        if (self.currentTable) {
            if (!self.sqlContext.tables[self.currentTable]) self.sqlContext.tables[self.currentTable] = {};
            var columns = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_checked();
            self.sqlContext.tables[self.currentTable].selectColumns = columns;
        }

        var currentsqlObj = self.databasesMap[self.currentDatabase][classRole];
        self.currentTable = currentsqlObj.table;
        var columns = self.databasesMap[self.currentDatabase].model[self.currentTable];

        $("#LineageLinkedDataQueryParams_currentTable").val(self.currentTable);
        var jstreeData = [];
        jstreeData.push({
            id: self.currentTable,
            text: self.currentTable,
            parent: "#",
        });
        columns.forEach(function (item) {
            jstreeData.push({
                id: item,
                text: item,
                parent: self.currentTable,
            });
        });
        var options = {
            withCheckboxes: true,
            tie_selection: false,
            selectTreeNodeFn: Lineage_linkedData_query.onColumnSelect,
            openAll: true,
        };
        common.jstree.loadJsTree("LineageLinkedDataQueryParams_SQL_columnsTree", jstreeData, options);
    };

    self.onColumnSelect = function () {
        var column = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_selected()[0];
        self.currentColumn = column;
        $("#LineageLinkedDataQueryParams_createFilterDiv").css("display", "block");
        $("#LineageLinkedDataQueryParams_ExecuteDiv").css("display", "block");

        $("#LineageLinkedDataQueryParams_filteringColumn").html(column);
    };

    self.fillColumnValuesSelect = function () {
        self.getColumnValues(self.currentTable, self.currentColumn, function (err, data) {
            if (data.size >= self.dataSizeLimit) return alert("too many values");

            common.fillSelectOptions("LineageLinkedDataQueryParams_valuesSelect", data, true, self.currentColumn, self.currentColumn);
            $("#LineageLinkedDataQueryParams_operator").val("=");
        });
    };

    self.getColumnValues = function (table, column, callback) {
        self.dataSizeLimit = 1000;
        var sqlQuery = " select distinct column from " + table + " limit " + self.dataSizeLimit;
        if (self.sqlContext.currentDataSource.type == "sql.sqlserver") sqlQuery = " select distinct  " + column + " from " + table;

        const params = new URLSearchParams({
            type: self.sqlContext.currentDataSource.type,
            dbName: self.sqlContext.currentDataSource.dbName,
            sqlQuery: sqlQuery,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (callback) return callback(null, data);
            },
            error(err) {
                if (callback) return callback(null);
            },
        });
    };

    self.addFilter = function () {
        var filterId = "filter_" + common.getRandomHexaId(5);
        var table = self.currentTable;
        var column = self.currentColumn;
        var operator = $("#LineageLinkedDataQueryParams_operator").val();
        var value = $("#LineageLinkedDataQueryParams_value").val();
        $("#LineageLinkedDataQueryParams_value").val("");
        var html = "<div class='LineageLinkedDataQueryParams_QueryElt' id='" + filterId + "'> ";
        var obj = {
            table: table,
        };

        //   html += classLabel + "&nbsp;";

        if (value) {
            obj.table = self.currentTable;
            obj.column = column;
            obj.operator = operator;
            obj.value = value;
            html += table + "." + column + " " + operator + "&nbsp;" + value + "&nbsp;";
        } else {
            html += "ALL &nbsp;";
            obj.column = column;
        }
        if (!self.sqlContext.tables[self.currentTable]) self.sqlContext.tables[self.currentTable] = { filters: {} };
        self.sqlContext.tables[self.currentTable].filters[filterId] = obj;

        html += "<button style='size: 10px' onclick='Lineage_linkedData_query.removeQueryElement(\"" + self.currentTable + '","' + filterId + "\")'>X</button></div>";
        $("#LineageLinkedDataQueryParams_Filters").append(html);
        $("#LineageLinkedDataQueryParams_createFilterDiv").css("display", "none");
        return obj;
    };

    self.removeQueryElement = function (table, filterId) {
        delete self.sqlContext.tables[table].filters[filterId];
        $("#" + filterId).remove();
    };

    self.executeQuery = function (output) {
        var columns = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_checked();
        if (!self.sqlContext.tables[self.currentTable]) self.sqlContext.tables[self.currentTable] = {};
        self.sqlContext.tables[self.currentTable].selectColumns = columns;

        if (!output) output = "table";
        var selectStr = "";
        var fromStr = "";
        var whereStr = "";
        var joinStr = "";
        var allSelectColumns = [];

        for (var table in self.sqlContext.tables) {
            if (fromStr != "") fromStr += ",";
            fromStr += table;

            if (self.sqlContext.tables[table].selectColumns) {
                self.sqlContext.tables[table].selectColumns.forEach(function (column) {
                    if (column != table && allSelectColumns.indexOf(column) < 0) {
                        allSelectColumns.push(column);
                        if (selectStr != "") selectStr += ",";
                        selectStr += "'" + table + "." + column + "'";
                    }
                });
            }

            for (var filterId in self.sqlContext.tables[table].filters) {
                var filter = self.sqlContext.tables[table].filters[filterId];
                var filterStr = "";
                if (filter.operator == "contains") {
                    filterStr = table + "." + filter.column + " like ('%" + filter.value + "')";
                } else if (filter.operator == "not contains") {
                    filterStr = table + "." + filter.column + " not like ('%" + filter.value + "')";
                } else if (common.isNumber(filter.value)) {
                    filterStr = table + "." + filter.column + " " + filter.operator + " " + filter.value;
                } else filterStr = table + "." + filter.column + " " + filter.operator + " '" + filter.value + "'";

                if (whereStr != "") whereStr += " AND ";
                whereStr += filterStr;
            }
        }
        if (selectStr == "") return alert("you must select columns");

        var joinObj = self.databasesMap[self.currentDatabase];

        joinStr = joinObj.from.column.replace("_", ".") + "=" + joinObj.to.column.replace("_", ".") + " ";
        if (fromStr.indexOf(joinObj.from.table) < 0) fromStr += "," + joinObj.from.table;
        if (fromStr.indexOf(joinObj.to.table) < 0) fromStr += "," + joinObj.to.table;

        if (whereStr != "") whereStr += " AND ";
        whereStr += joinStr;

        var sqlQuery = "SELECT " + selectStr + " FROM " + fromStr + " WHERE " + whereStr;

        $("#LineageLinkedDataQueryParams_SqlDiv").html(sqlQuery);

        const params = new URLSearchParams({
            type: self.sqlContext.currentDataSource.type,
            dbName: self.sqlContext.currentDataSource.dbName,
            sqlQuery: sqlQuery,
        });
        MainController.UI.message("Running Query");
        $("#waitImg").css("display", "block");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                $("#waitImg").css("display", "none");
                if (data.size >= self.dataSizeLimit) return alert("too many values");
                if (output == "table") {
                    var dataSet = [];
                    var cols = [];
                    allSelectColumns.forEach(function (column) {
                        cols.push({ title: column, defaultContent: "" });
                    });

                    data.forEach(function (item) {
                        var line = [];
                        allSelectColumns.forEach(function (column) {
                            line.push(item[column] || "");
                        });
                        dataSet.push(line);
                    });
                    $("#LineageLinkedDataQuery_tabs").tabs("option", { active: 1 });
                    Export.showDataTable("LineageLinkedDataQuery_tableResult", cols, dataSet, null);
                }
            },
            error(err) {
                $("#waitImg").css("display", "none");
                return alert(err.responseText);
            },
        });
    };

    self.stackContext = function () {
        self.sqlContexts.push(self.sqlContext);
    };

    return self;
})();
