import Lineage_linkedData_mappings from "./lineage_linkedData_mappings.js";
import common from "../../../shared/common.js";
import KGcreator from "../../KGcreator/KGcreator.js";
import Export from "../../../shared/export.js";

import Lineage_whiteboard from "../lineage_whiteboard.js";

var Lineage_linkedData_query = (function () {
    var self = {};
    self.databasesMap = {};
    self.relationObj = {};
    self.currentRelation = null;
    self.sqlContext = {};
    self.sqlContexts = [];
    self.existingTables = {};
    self.isLoaded = false;

    self.showLinkedDataDialog = function () {
        $("#mainDialogDiv").dialog("open");
        if (self.isLoaded) return;
        $("#mainDialogDiv").load("modules/tools/lineage/lineage/linkedData/lineage_linkedData_queryDialog.html", function () {
            self.isLoaded = true;
            Lineage_linkedData_mappings.getSourceJoinsMappings(Lineage_sources.activeSource, {}, function (err, joinsMap) {
                if (err) {
                    return alert(err.responseText);
                }
                if (Object.keys(joinsMap).length == 0) {
                    return $("#Lineage_linkedData_query_relations").html("No linked Data declared  for source " + Lineage_sources.activeSource);
                }

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
        self.currentRelation = relationId;
        $("#LineageLinkedDataQuery_tabs").tabs("option", { active: 1 });
        self.relationObj = self.joinsMap[relationId];
        self.databasesMap = self.joinsMap[relationId].databases;
        for (var database in self.databasesMap) {
            self.databasesMap[database].fromClass = self.joinsMap[relationId].from;
            self.databasesMap[database].toClass = self.joinsMap[relationId].to;
        }
        common.fillSelectOptions("LineageLinkedDataQueryParams_database", Object.keys(self.databasesMap));
    };

    self.onDatabaseChange = function (database) {
        self.sqlContext = { tables: {} };
        self.currentDatabase = database;
        self.sqlContext.currentDataSource = { type: "sql.sqlserver", dbName: self.currentDatabase };

        if (!self.databasesMap[database].model) {
            KGcreator.listTables(self.currentDatabase, function (err, model) {
                if (err) {
                    return alert(err.responseText);
                }
                self.databasesMap[database].model = model;

                var jstreeData = [];

                var model = self.databasesMap[database].model;
                var fromTable = self.databasesMap[database].from.table;
                var toTable = self.databasesMap[database].to.table;

                jstreeData.push({
                    id: fromTable,
                    text: fromTable,
                    parent: "#",
                });
                jstreeData.push({
                    id: toTable,
                    text: toTable,
                    parent: "#",
                });

                if (!self.sqlContext.tables[fromTable]) {
                    self.sqlContext.tables[fromTable] = {
                        filters: {},
                        selectColumns: [],
                        classObj: self.databasesMap[database].fromClass,
                    };
                }
                var fromColumns = model[fromTable];
                fromColumns.forEach(function (item) {
                    jstreeData.push({
                        id: fromTable + "_" + item,
                        text: item,
                        data: { table: fromTable, column: item },
                        parent: fromTable,
                    });
                });

                if (!self.sqlContext.tables[toTable]) {
                    self.sqlContext.tables[toTable] = {
                        filters: {},
                        selectColumns: [],
                        classObj: self.databasesMap[database].toClass,
                    };
                }
                var toColumns = model[toTable];
                toColumns.forEach(function (item) {
                    jstreeData.push({
                        id: toTable + "_" + item,
                        text: item,
                        data: { table: toTable, column: item },
                        parent: toTable,
                    });
                });

                var options = {
                    withCheckboxes: true,
                    tie_selection: false,
                    selectTreeNodeFn: Lineage_linkedData_query.onColumnSelect,
                    openAll: false,
                };
                JstreeWidget.loadJsTree("LineageLinkedDataQueryParams_SQL_columnsTree", jstreeData, options);
            });
        }

        var classes = [
            {
                label: self.relationObj.from.classLabel + "->" + self.databasesMap[self.currentDatabase].from.table,
                id: "from," + self.databasesMap[self.currentDatabase].from.table,
            },
            { label: self.relationObj.to.classLabel + "->" + self.databasesMap[self.currentDatabase].to.table, id: "to," + self.databasesMap[self.currentDatabase].to.table },
        ];
        $("#LineageLinkedDataQueryParams_createFilterDiv").css("display", "none");
        common.fillSelectOptions("LineageLinkedDataQueryParams_classes", classes, null, "label", "id");
    };

    self.onColumnSelect = function () {
        var node = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_selected(true)[0];
        self.currentColumn = node.data.column;
        self.currentTable = node.data.table;
        $("#LineageLinkedDataQueryParams_createFilterDiv").css("display", "block");
        $("#LineageLinkedDataQueryParams_ExecuteDiv").css("display", "block");

        $("#LineageLinkedDataQueryParams_filteringColumn").html(self.currentColumn);
    };

    self.fillColumnValuesSelect = function () {
        if (self.currentTable == "#") {
            return;
        }
        self.getColumnValues(self.currentTable, self.currentColumn, function (err, data) {
            if (data.size >= self.dataSizeLimit) {
                return alert("too many values");
            }

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
        if (self.sqlContext.currentDataSource.type == "sql.sqlserver") {
            sqlQuery = " select distinct  " + column + " from " + table;
        }

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
                if (callback) {
                    return callback(null, data);
                }
            },
            error(err) {
                if (callback) {
                    return callback(null);
                }
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
        if (!self.sqlContext.tables[self.currentTable]) {
            self.sqlContext.tables[self.currentTable] = { filters: {} };
        }
        if (!self.sqlContext.tables[self.currentTable].filters) {
            self.sqlContext.tables[self.currentTable].filters = {};
        }
        self.sqlContext.tables[self.currentTable].filters[filterId] = obj;

        $("#LineageLinkedDataQueryParams_Filters").append(html);
        $("#LineageLinkedDataQueryParams_createFilterDiv").css("display", "none");
        return obj;
    };

    self.removeQueryElement = function (table, filterId) {
        delete self.sqlContext.tables[table].filters[filterId];
        $("#" + filterId).remove();
    };

    self.executeQuery = function (display) {
        var columns = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_checked(true);
        var selectAllColumns = $("#LineageLinkedDataQueryParams_allColumnsCBX").prop("checked");

        for (var table in self.sqlContext.tables) {
            self.sqlContext.tables[table].selectColumns = [];
        }

        columns.forEach(function (columnObj) {
            if (columnObj.data && columnObj.data.column) {
                self.sqlContext.tables[columnObj.data.table].selectColumns.push(columnObj.data.column);
            }
        });
        if (!display) {
            display = $("#LineageLinkedDataQueryParams_queryDisplaySelect").val();
        }
        if (!display) {
            display = "table";
        }
        var selectStr = "";
        var fromStr = "";
        var whereStr = "";
        var joinStr = "";
        var allSelectColumns = [];
        var hasFilter = false;

        var fromObj = self.databasesMap[self.currentDatabase].from;
        var toObj = self.databasesMap[self.currentDatabase].to;

        selectStr += fromObj.column + " as [" + self.sqlContext.tables[fromObj.table].classObj.classLabel + "," + fromObj.column + ",PK]";
        selectStr += "," + toObj.column + " as [" + self.sqlContext.tables[toObj.table].classObj.classLabel + "," + toObj.column + ",PK]";

        for (var table in self.sqlContext.tables) {
            if (fromStr != "") {
                fromStr += ",";
            }
            fromStr += table;

            if (self.sqlContext.tables[table].selectColumns) {
                self.sqlContext.tables[table].selectColumns.forEach(function (column) {
                    if (column != table && fromObj.column != table + "." + column && toObj.column != table + "." + column) {
                        if (selectStr != "") {
                            selectStr += ",";
                        }

                        selectStr += "" + table + ".[" + column + "]" + " as [" + self.sqlContext.tables[table].classObj.classLabel + "." + column + "]";
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
                } else {
                    filterStr = table + "." + filter.column + " " + filter.operator + " '" + filter.value + "'";
                }

                if (whereStr != "") {
                    whereStr += " AND ";
                }
                whereStr += filterStr;
            }
        }
        if (selectStr == "") {
            return alert("you must select columns");
        }

        var joinObj = self.databasesMap[self.currentDatabase];

        var joinStr = "";
        if (joinObj.joinTable) {
            joinStr = joinObj.joinWhere;
            fromStr += "," + joinObj.joinTable;
        } else {
            joinStr = joinObj.from.column + "=" + joinObj.to.column + " ";
            if (fromStr.indexOf(joinObj.from.table) < 0) {
                fromStr += "," + joinObj.from.table;
            }
            if (fromStr.indexOf(joinObj.to.table) < 0) {
                fromStr += "," + joinObj.to.table;
            }
        }
        if (whereStr != "") {
            whereStr += " AND ";
        }
        whereStr += joinStr;

        var sqlQuery = "SELECT " + selectStr + " FROM " + fromStr + " WHERE " + whereStr;

        $("#LineageLinkedDataQueryParams_SqlDiv").html(sqlQuery);

        if (!hasFilter) {
            return alert("You must set at least one filter  to avoid too many data");
        }
        const params = new URLSearchParams({
            type: self.sqlContext.currentDataSource.type,
            dbName: self.sqlContext.currentDataSource.dbName,
            sqlQuery: sqlQuery,
        });
        UI.message("Running Query");
        $("#waitImg").css("display", "block");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                $("#waitImg").css("display", "none");
                if (data.size >= self.dataSizeLimit) {
                    return alert("too many lines " + data.size + " limit " + self.dataSizeLimit);
                } else if (data.size == 0) {
                    return alert("too many values");
                } else if (display == "table") {
                    self.displayResultToTable(data);
                } else if (display == "graph") {
                    self.displayResultToVisjsGraph(data);
                }
            },
            error(err) {
                $("#waitImg").css("display", "none");
                return alert(err.responseText);
            },
        });
    };

    self.displayResultToTable = function (data) {
        var dataSet = [];
        var cols = [];

        if (true) {
            var allSelectColumns = [];
            for (var column in data[0]) {
                if (allSelectColumns.indexOf(column) < 0) {
                    cols.push({ title: column, defaultContent: "" });
                    allSelectColumns.push(column);
                }
            }

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
    };

    self.displayResultToVisjsGraph = function (data) {
        var currentDatabase = self.currentDatabase;
        var fromClass = self.databasesMap[currentDatabase].fromClass;
        var toClass = self.databasesMap[currentDatabase].toClass;

        var visjsData = { nodes: [], edges: [] };
        var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        if (!existingNodes[fromClass.classId]) {
            existingNodes[fromClass.classId] = 1;
            visjsData.nodes.push({
                id: fromClass.classId,
                label: fromClass.classLabel,
                shape: Lineage_whiteboard.defaultShape,
                color: Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource),
                data: {
                    id: fromClass.classId,
                    label: fromClass.label,
                    source: Lineage_sources.activeSource,
                    type: "class",
                },
            });
        }
        if (!existingNodes[toClass.classId]) {
            existingNodes[toClass.classId] = 1;
            visjsData.nodes.push({
                id: toClass.classId,
                label: toClass.classLabel,
                shape: Lineage_whiteboard.defaultShape,
                color: Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource),
                data: {
                    id: toClass.classId,
                    label: toClass.label,
                    source: Lineage_sources.activeSource,
                    type: "class",
                },
            });
        }
        var primaryKeyFromColumn = null;
        var primaryKeyToColumn = null;
        for (var columnAlias in data[0]) {
            var array = columnAlias.split(",");
            if (array.length == 3) {
                if (array[0] == fromClass.classLabel) {
                    primaryKeyFromColumn = columnAlias;
                } else if (array[0] == toClass.classLabel) {
                    primaryKeyToColumn = columnAlias;
                }
            }
        }
        data.forEach(function (item) {
            var idFrom = item[primaryKeyFromColumn];
            var idTo = item[primaryKeyToColumn];

            if (!existingNodes[idFrom]) {
                existingNodes[idFrom] = 1;
                visjsData.nodes.push({
                    id: idFrom,
                    label: idFrom,
                    shape: "square",
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: "brown",
                    data: {
                        id: idFrom,
                        label: idFrom,
                        source: self.currentDatabase,
                        type: "linkedSQLdata",
                    },
                });
            }

            if (!existingNodes[idTo]) {
                existingNodes[idTo] = 1;
                visjsData.nodes.push({
                    id: idTo,
                    label: idTo,
                    shape: "square",
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: "grey",
                    data: {
                        id: idTo,
                        label: idTo,
                        source: self.currentDatabase,
                        type: "linkedSQLdata",
                    },
                });
            }
            var edgeId = idFrom + "_" + fromClass.classId;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: idFrom,
                    to: fromClass.classId,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                    color: Lineage_whiteboard.defaultEdgeColor,
                });
            }
            var edgeId = idTo + "_" + toClass.classId;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: idTo,
                    to: toClass.classId,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                    color: Lineage_whiteboard.defaultEdgeColor,
                });
            }
            var edgeId = idFrom + "_" + idTo;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: idFrom,
                    to: idTo,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                    dashes: true,
                    color: "blue",
                    data: {
                        id: edgeId,
                        source: self.currentDatabase,
                        type: "linkedSQLdataEdge",
                    },
                });
            }
        });

        if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            self.drawNewGraph(visjsData);
        }
        Lineage_whiteboard.addVisDataToGraph(visjsData);

        Lineage_whiteboard.lineageVisjsGraph.network.fit();
        $("#waitImg").css("display", "none");
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
        self.onSelectRelation(self.currentRelation);
    };

    self.viewSQL = function () {
        $("#LineageLinkedDataQueryParams_SqlDivWrapper").css("display", "block");
    };

    return self;
})();

export default Lineage_linkedData_query;

window.Lineage_linkedData_query = Lineage_linkedData_query;
