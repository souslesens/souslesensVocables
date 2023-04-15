import Lineage_linkedData_query from "./lineage_linkedData_query.js"



var Lineage_linkedData_query = (function () {
    var self = {};
    self.databasesMap = {};
    self.relationObj = {};
    self.sqlContext = {};
    self.sqlContexts = [];

    self.showLinkedDataDialog = function () {
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/lineage/linkedData/lineage_linkedData_queryDialog.html", function () {
            Lineage_linkedData_mappings.getSourceJoinsMappings(Lineage_sources.activeSource, {}, function (err, joinsMap) {
                if (err) return alert(err.responseText);
                if (Object.keys(joinsMap).length == 0) return $("#Lineage_linkedData_query_relations").html("No linked Data declared  for source " + Lineage_sources.activeSource);

                self.joinsMap = joinsMap;
                var html = "";
                $("#Lineage_linkedData_query_relations").html("");
                for (var joinId in joinsMap) {
                    var joinObj = joinsMap[joinId];
                    html += "<div class='lineage_linkedDataQuery_relation' id='" + joinId + "' onClick='Lineage_linkedData_query.onSelectRelation(\"" + joinId + "\")' >";
                    html += "<div class=lineage_linkedDataQuery_subject>" + joinObj.from.classLabel + "</div>";
                    html += "<div class=lineage_linkedDataQuery_predicate>" + joinObj.propLabel + "</div>";
                    html += "<div class=lineage_linkedDataQuery_object>" + joinObj.to.classLabel + "</div>";
                    html += "</div>";
                }
                $("#Lineage_linkedData_query_relations").append(html);
            });
        });
    };

    self.onSelectRelation = function (relationId) {
        $("#LineageLinkedDataQuery_tabs").tabs("option", { active: 1 });
        self.relationObj = self.joinsMap[relationId];
        self.databasesMap = self.joinsMap[relationId].databases;
        common.fillSelectOptions("LineageLinkedDataQueryParams_database", Object.keys(self.databasesMap));
    };

    self.onDatabaseChange = function (database) {
        self.sqlContext = { tables: {} };
        self.currentDatabase = database;
        self.sqlContext.currentDataSource = { type: "sql.sqlserver", dbName: self.currentDatabase };
        var classes = [
            {
                label: self.relationObj.from.classLabel + "->" + self.databasesMap[self.currentDatabase].from.table,
                id: "from," + self.databasesMap[self.currentDatabase].from.table,
            },
            { label: self.relationObj.to.classLabel + "->" + self.databasesMap[self.currentDatabase].to.table, id: "to," + self.databasesMap[self.currentDatabase].to.table },
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
    self.onClassChange = function (classRoleandId) {
        var array = classRoleandId.split(",");
        var classRole = array[0];
        self.currentTable = array[1];
        if (self.currentTable) {
            var currentClass = self.relationObj[classRole];

            if (!self.sqlContext.tables[self.currentTable])
                self.sqlContext.tables[self.currentTable] = {
                    filters: {},
                    selectColumns: [],
                    classObj: currentClass,
                };
            if ($("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree && $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_checked) {
                var columns = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_checked();
                self.sqlContext.tables[self.currentTable].selectColumns = columns;
            }
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
    self.onColumnValuesSelect = function () {
        var value = $("#LineageLinkedDataQueryParams_valuesSelect").val();
        $("#LineageLinkedDataQueryParams_value").val(value);
        $("#LineageLinkedDataQueryParams_operator").val("=");
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
        html += "<button style='size: 10px' onclick='Lineage_linkedData_query.removeQueryElement(\"" + self.currentTable + '","' + filterId + "\")'>X</button>";

        var obj = {
            table: table,
        };

        //   html += classLabel + "&nbsp;";

        if (value) {
            obj.table = self.currentTable;
            obj.column = column;
            obj.operator = operator;
            obj.value = value;
            html += "&nbsp;" + table + "." + column + " " + operator + "&nbsp;" + value + "&nbsp;";
        } else {
            html += "ALL &nbsp;";
            obj.column = column;
        }
        html += "</div>";
        if (!self.sqlContext.tables[self.currentTable]) self.sqlContext.tables[self.currentTable] = { filters: {} };
        if (!self.sqlContext.tables[self.currentTable].filters) self.sqlContext.tables[self.currentTable].filters = {};
        self.sqlContext.tables[self.currentTable].filters[filterId] = obj;

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
        var selectAllColumns = $("#LineageLinkedDataQueryParams_allColumnsCBX").prop("checked");
        if (!self.sqlContext.tables[self.currentTable]) self.sqlContext.tables[self.currentTable] = {};
        self.sqlContext.tables[self.currentTable].selectColumns = columns;

        if (!output) output = "table";
        var selectStr = "";
        var fromStr = "";
        var whereStr = "";
        var joinStr = "";
        var allSelectColumns = [];
        var hasFilter = false;

        for (var table in self.sqlContext.tables) {
            if (fromStr != "") fromStr += ",";
            fromStr += table;

            if (false && selectAllColumns) {
                if (selectStr != "") selectStr += ",";
                selectStr += "" + table + ".*";
            } else if (self.sqlContext.tables[table].selectColumns) {
                self.sqlContext.tables[table].selectColumns.forEach(function (column) {
                    if (column != table && allSelectColumns.indexOf(column) < 0) {
                        allSelectColumns.push(column);
                        if (selectStr != "") selectStr += ",";
                        selectStr += "" + table + ".[" + column + "]" + " as " + self.sqlContext.tables[table].classObj.classLabel + "_[" + column + "]";
                    }
                });
            } else {
                return alert("select some columns");
            }

            for (var filterId in self.sqlContext.tables[table].filters) {
                hasFilter = true;
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

        var joinStr = "";
        if (joinObj.joinTable) {
            joinStr = joinObj.joinWhere;
            fromStr += "," + joinObj.joinTable;
        } else {
            joinStr = joinObj.from.column + "=" + joinObj.to.column + " ";
            if (fromStr.indexOf(joinObj.from.table) < 0) fromStr += "," + joinObj.from.table;
            if (fromStr.indexOf(joinObj.to.table) < 0) fromStr += "," + joinObj.to.table;
        }
        if (whereStr != "") whereStr += " AND ";
        whereStr += joinStr;

        var sqlQuery = "SELECT " + selectStr + " FROM " + fromStr + " WHERE " + whereStr;

        $("#LineageLinkedDataQueryParams_SqlDiv").html(sqlQuery);

        if (!hasFilter) return alert("You must set at least one filter  to avoid too many data");
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
                if (data.size >= self.dataSizeLimit) return alert("too many lines " + data.size + " limit " + self.dataSizeLimit);
                if (data.size == 0) return alert("too many values");
                if (output == "table") {
                    var dataSet = [];
                    var cols = [];

                    if (false) {
                        allSelectColumns = [];
                        for (var column in data[0]) {
                            if (allSelectColumns.indexOf(column) < 0) allSelectColumns.push(column);
                        }

                        data.forEach(function (item) {
                            var line = [];
                            allSelectColumns.forEach(function (column) {
                                line.push(item[column] || "");
                            });
                            dataSet.push(line);
                        });
                    } else {
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
                    }

                    $("#LineageLinkedDataQuery_tabs").tabs("option", { active: 2 });
                    Export.showDataTable("LineageLinkedDataQuery_tableResult", cols, dataSet, null);
                }
            },
            error(err) {
                $("#waitImg").css("display", "none");
                return alert(err.responseText);
            },
        });
    };

    self.copySqlToClipboard = function () {
        var sql = $("#LineageLinkedDataQueryParams_SqlDiv").html();
        common.copyTextToClipboard(sql);
    };
    self.stackContext = function () {
        self.sqlContexts.push(self.sqlContext);
    };

    self.clearQuery = function () {
        self.sqlContexts = {};
        $("#LineageLinkedDataQueryParams_SqlDiv").html("");
        $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().uncheck_all();
    };

    self.viewSQL = function () {
        $("#LineageLinkedDataQueryParams_SqlDivWrapper").css("display", "block");
    };

    return self;
})();



export default Lineage_linkedData_query
