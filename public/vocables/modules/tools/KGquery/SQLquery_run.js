import KGcreator from "../KGcreator/KGcreator.js";
import common from "../../shared/common.js";

/**
 * Module for executing SQL queries and processing results.
 * Handles SQL query generation, execution, and result formatting.
 * @module SQLquery_run
 */
var SQLquery_run = (function () {
    var self = {};

    /**
     * Executes a path query against a data source.
     * @function
     * @name execPathQuery
     * @memberof SQLquery_run
     * @param {Object} querySets - The query sets to execute
     * @param {string} slsvSource - The source identifier
     * @param {string} dataSource - The data source to query
     * @param {Object} options - Query execution options
     * @param {Function} callback - Callback function called with (error, result)
     * @returns {void}
     */
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
                    self.getSlsvSourceDataBaseSourceConfigs(slsvSource, function (err, dataSourceConfig) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        self.dataSourceConfig = dataSourceConfig[dataSourceConfig];
                        if (!self.dataSourceConfig) {
                            return callbackSeries("no matching database source");
                        }
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    KGcreator.loadDataSourceMappings(slsvSource, dataSource, function (err, mappings) {
                        self.dataSourcemappings = mappings;
                        callbackSeries();
                    });
                },

                //get columns and tables from predicates
                function (callbackSeries) {
                    self.getQuerySetsColumnAndTables(querySets, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        paths = result;
                        callbackSeries();
                    });
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
                // execute sql
                function (callbackSeries) {
                    self.execSql(sqlQuery, dataSourceConfig.type, dataSource, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = result;
                        callbackSeries();
                    });
                },
                //format results
                function (callbackSeries) {
                    var tableData = self.queryResultToTable(data);
                    callbackSeries();
                },
            ],

            function (err) {
                return callback(err, data);
            },
        );
    };

    /**
     * Gets the database model for a data source configuration.
     * @function
     * @name getDBmodel
     * @memberof SQLquery_run
     * @param {Object} dataSourceConfig - The data source configuration
     * @param {Function} callback - Callback function called with (error, model)
     * @returns {void}
     */
    self.getDBmodel = function (dataSourceConfig, callback) {
        const params = new URLSearchParams({
            name: dataSourceConfig.name,
            type: dataSourceConfig.sqlType || dataSourceConfig.type,
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

    /**
     * Generates the FROM clause of an SQL query.
     * @function
     * @name getFromSql
     * @memberof SQLquery_run
     * @param {Object} joinObj - The join configuration object
     * @param {boolean} isOuterJoin - Whether to use outer joins
     * @returns {string} The generated FROM clause
     */
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

    /**
     * Executes an SQL query against a database.
     * @function
     * @name execSql
     * @memberof SQLquery_run
     * @param {string} sqlQuery - The SQL query to execute
     * @param {string} dataSourceType - The type of data source
     * @param {string} dbName - The database name
     * @param {Function} callback - Callback function called with (error, result)
     * @returns {void}
     */
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

    /**
     * Converts query results to a table format.
     * @function
     * @name queryResultToTable
     * @memberof SQLquery_run
     * @param {Array} data - The query result data
     * @returns {Array} The formatted table data
     */
    self.queryResultToTable = function (data) {
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
        return data;
    };

    return self;
})();

export default SQLquery_run;

window.SQLquery_run = SQLquery_run;
