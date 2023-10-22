import R2Gmappings from "./R2Gmappings.js";
import common from "./common.js";

var VirtualKGquery = (function () {
    var self = {};

    self.execPathQuery = function (querySets, slsvSource, dataSource, options, callback) {
        if (!options) {
            options = {};
        }
        var isOuterJoin = false;
        var paths = [];
        var joins = [];
        var sqlQuery = "";
        var data = [];

        var dataSourceConfig = {};

        async.series(
            [
                function (callbackSeries) {
                    R2Gmappings.getSlsvSourceConfig(slsvSource, function (err, config) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        self.sourceConfig = config;
                        dataSourceConfig = config.databaseSources[dataSource];
                        if (!dataSourceConfig) {
                            return callback("no database source declared");
                        }

                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    R2Gmappings.loadSourceMappings(slsvSource, dataSource, function (err, mappings) {
                        self.dataSourcemappings = mappings;
                        callbackSeries();
                    });
                },

                //get columns and tables from predicates
                function (callbackSeries) {
                    var pathsMap = {};
                    querySets.sets.forEach(function (querySet) {
                        querySet.elements.forEach(function (queryElement, queryElementIndex) {
                            var classUri = queryElement.fromNode.id;
                            var matches = R2Gmappings.getClass2ColumnMapping(self.dataSourcemappings, classUri);
                            if (matches.length == 0) {
                                return callbackSeries("no match for class " + classUri);
                            }
                            if (matches.length > 1) {
                                return callbackSeries("multiple matches for class " + classUri + "  :  " + JSON.stringify(matches));
                            }
                            var match = matches[0];
                            var obj = { fromClassUri: classUri, fromColumn: match.column, fromTable: match.table };

                            var classUri = queryElement.toNode.id;
                            var matches = R2Gmappings.getClass2ColumnMapping(self.dataSourcemappings, classUri);

                            if (matches.length == 0) {
                                return callbackSeries("no match for class " + classUri);
                            }
                            if (matches.length > 1) {
                                return callbackSeries("multiple matches for class " + classUri + "  :  " + JSON.stringify(matches));
                            }
                            var match = matches[0];
                            obj.toClassUri = classUri;
                            obj.toColumn = match.column;
                            obj.toTable = match.table;

                            paths.push(obj);
                        });
                    });

                    callbackSeries();
                },

                //set joins
                function (callbackSeries) {
                    var tableJoins = self.sourceConfig.databaseSources[dataSource].tableJoins;
                    var error = null;
                    var existsJoin = false;
                    paths.forEach(function (path) {
                        if (path.fromTable == path.toTable) {
                            return;
                        } else {
                            tableJoins.forEach(function (join) {
                                if ((path.fromTable == join.fromTable && path.toTable == join.toTable) || (path.fromTable == join.toTable && path.toTable == join.fromTable)) {
                                    if (!join.id) {
                                        join.id = common.getRandomHexaId(3);
                                    }
                                    path.tableJoin = join;
                                    existsJoin = true;
                                }
                            });
                            if (!existsJoin) {
                                callbackSeries("no join defined between  tables :" + JSON.stringify(path));
                            }
                        }
                    });

                    callbackSeries();
                },

                //build SQL
                function (callbackSeries) {
                    var sqlSelect = " SELECT * ";
                    var sqlFrom = "  ";
                    var sqlWhere = " WHERE * ";
                    var distinctFromTables = {};
                    var distinctJoins = {};
                    var fromIndex = 0;
                    paths.forEach(function (path, index) {
                        if (index > 0) {
                            sqlFrom += ",";
                        }
                        sqlFrom += self.getFromSql(path, isOuterJoin);
                    });

                    sqlQuery = sqlSelect + " " + sqlFrom;
                    callbackSeries();
                },

                function (callbackSeries) {
                    self.execSql(sqlQuery, dataSourceConfig.type, dataSource, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = result;
                    });
                },
            ],
            function (err) {
                return callback(err, data);
            }
        );
    };

    self.getDBmodel = function (dataSourceConfig, callback) {
        const params = new URLSearchParams({
            name: dataSourceConfig.dbName,
            type: dataSourceConfig.type,
        });
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/model?" + params.toString(),
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
                }
                alert(err.responseText);
            },
        });
    };

    self.getFromSql = function (joinObj, isOuterJoin) {
        var sql = "FROM "; //SELECT top 10 * from ";

        var outerStr = "";
        if (isOuterJoin) {
            outerStr = "OUTER";
        }
        if (joinObj.fromTable == joinObj.toTable) {
            return sql + joinObj.fromTable;
        }

        sql += joinObj.fromTable + " ";

        if (joinObj.joinTable) {
            sql += " LEFT " + outerStr + " JOIN " + joinObj.joinTable + " ON " + joinObj.fromTable + "." + joinObj.fromColumn + "=" + joinObj.joinTable + "." + joinObj.joinFromColumn;
            sql += " LEFT " + outerStr + " JOIN " + joinObj.toTable + " ON " + joinObj.joinTable + "." + joinObj.joinFromColumn + "=" + joinObj.toTable + "." + joinObj.toColumn;
        } else {
            sql += " LEFT " + outerStr + " JOIN " + joinObj.toTable + " ON " + joinObj.fromTable + "." + joinObj.fromColumn + "=" + joinObj.toTable + "." + joinObj.toColumn;
        }
        return sql;
    };

    self.execSql = function (sqlQuery, dataSourceType, dbName, callback) {
        const params = new URLSearchParams({
            type: dataSourceType,
            dbName: dbName,
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

    self.resultToDataTable = function (data) {
        data.forEach(function (item) {
            if (varName.length < 3) {
                return;
            }
            if (nonNullCols[varName]) {
                return;
            }
            if (item[varName]) {
                if (item[varName].type != "uri") {
                    nonNullCols[varName] = item[varName].type;
                }
            }
        });

        var tableCols = [];
        var colNames = [];
        tableCols.push({ title: "rowIndex", visible: false, defaultContent: "", width: "15%" });
        // colNames.push("rowIndex");
        for (var varName in nonNullCols) {
            tableCols.push({ title: varName, defaultContent: "", width: "15%" });
            colNames.push(varName);
        }

        var tableData = [];
        self.currentData = data;
        self.tableCols = tableCols;
        data.forEach(function (item, index) {
            var line = [index];
            colNames.forEach(function (col) {
                line.push(item[col] ? item[col].value : null);
            });
            tableData.push(line);
        });
    };

    return self;
})();

export default VirtualKGquery;

window.VirtualKGquery = VirtualKGquery;
