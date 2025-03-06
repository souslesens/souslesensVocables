import SQLquery_run from "./SQLquery_run.js";
import KGcreator from "../KGcreator/KGcreator.js";

/**
 * Module for managing SQL query filters and data source configurations.
 * Handles the creation and management of filters for SQL queries.
 * @module SQLquery_filters
 */
var SQLquery_filters = (function () {
    var self = {};

    /**
     * Displays the filters dialog for query sets.
     * Shows available filters based on data source configurations.
     * @function
     * @name showFiltersDialog
     * @memberof SQLquery_filters
     * @param {Object} querySets - The query sets to filter
     * @param {string} slsvSource - The source identifier
     * @returns {void}
     */
    self.showFiltersDialog = function (querySets, slsvSource) {
        self.querySets = querySets;
        var paths = [];
        var jstreeData = [];
        var dataSources = [];

        async.series(
            [
                function (callbackSeries) {
                    self.getSlsvSourcedataSourceConfigs(slsvSource, function (err, dataSourceConfigs) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        self.dataSourceConfigs = dataSourceConfigs;
                        for (var key in dataSourceConfigs) {
                            dataSources.push(key);
                            self.dataSourceConfigs[key].name = key;
                        }
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var dataSourceMappings = {};
                    async.eachSeries(
                        dataSources,
                        function (dataSource, callbackEach) {
                            self.getDataSourcejstreeData(querySets, slsvSource, dataSource, function (err, result) {
                                if (err) {
                                    console.log(err);
                                }
                                jstreeData = jstreeData.concat(result);
                                callbackEach();
                            });
                        },
                        function (err) {
                            callbackSeries(err);
                        }
                    );
                },
            ],
            function (err) {
                $("#mainDialogDiv").load("modules/tools/KGquery/html/SQLqueryFilterDialog.html", function () {
                    $("#mainDialogDiv").dialog("open");
                    var options = {};
                    JstreeWidget.loadJsTree("SQLqueryFilter_jstree", jstreeData, options);
                });
            }
        );
    };

    /**
     * Retrieves JSTree data for a specific data source.
     * @function
     * @name getDataSourcejstreeData
     * @memberof SQLquery_filters
     * @param {Object} querySets - The query sets to process
     * @param {string} slsvSource - The source identifier
     * @param {string} dataSource - The data source to get tree data for
     * @param {Function} callback - Callback function called with (error, jstreeData)
     * @returns {void}
     */
    self.getDataSourcejstreeData = function (querySets, slsvSource, dataSource, callback) {
        var jstreeData = [];
        var dataSourceMappings = {};
        var paths = [];
        async.series(
            [
                function (callbackSeries2) {
                    KGcreator.loadDataSourceMappings(slsvSource, dataSource, function (err, mappings) {
                        dataSourceMappings = mappings;
                        //  self.dataSourceConfigs[dataSource].mappings = mappings;
                        callbackSeries2();
                    });
                },
                function (callbackSeries2) {
                    self.getQuerySetsColumnAndTables(querySets, dataSource, dataSourceMappings, function (err, result) {
                        if (err) {
                            return callbackSeries2(err);
                        }
                        if (result.length == 0) return callback(null, []);
                        paths = result;
                        callbackSeries2();
                    });
                },

                function (callbackSeries2) {
                    var existingjstreeNode = {};

                    SQLquery_run.getDBmodel(self.dataSourceConfigs[dataSource], function (err, model) {
                        if (err) {
                            return callbackSeries2(err);
                        }
                        paths.forEach(function (path, pathIndex) {
                            if (path.fromDataSource != path.toDataSource) {
                                return callbackSeries2("nodes have to be in the same data source : " + path.fromDataSource + "->" + path.toDataSource);
                            }
                            if (!self.dataSourceConfigs[path.fromDataSource]) {
                                return callbackSeries2("datasource not described in source config :" + path.fromDataSource);
                            }
                            if ((path.dataSource = dataSource)) {
                                if (pathIndex == 0 && !existingjstreeNode[dataSource]) {
                                    jstreeData.push({
                                        id: path.dataSource,
                                        text: dataSource,
                                        parent: "#",
                                    });
                                }
                                var tableModel = model[path.fromTable];
                                if (!tableModel) {
                                    return callbackSeries2("table " + path.table + " not present in database source" + path.fromDataSource);
                                }
                                tableModel.sort();
                                if (!existingjstreeNode[path.fromTable]) {
                                    existingjstreeNode[path.fromTable] = 1;
                                    jstreeData.push({
                                        id: path.fromTable,
                                        text: path.fromTable,
                                        parent: dataSource,
                                    });
                                    tableModel.forEach(function (column) {
                                        jstreeData.push({
                                            id: column,
                                            text: column,
                                            parent: path.fromTable,
                                        });
                                    });
                                }
                                var tableModel = model[path.toTable];
                                if (!tableModel) {
                                    return callbackSeries2("table " + path.table + " not present in database source" + path.fromDataSource);
                                }
                                if (!existingjstreeNode[path.toTable]) {
                                    existingjstreeNode[path.toTable];
                                    jstreeData.push({
                                        id: path.toTable,
                                        text: path.toTable,
                                        parent: dataSource,
                                    });
                                    tableModel.forEach(function (column) {
                                        jstreeData.push({
                                            id: column,
                                            text: column,
                                            parent: path.toTable,
                                        });
                                    });
                                }
                            }
                        });
                        callbackSeries2();
                    });
                },
            ],
            function (err) {
                return callback(err, jstreeData);
            }
        );
    };

    /**
     * Gets data source configurations for a given source.
     * @function
     * @name getSlsvSourcedataSourceConfigs
     * @memberof SQLquery_filters
     * @param {string} slsvSource - The source identifier
     * @param {Function} callback - Callback function called with (error, configs)
     * @returns {void}
     */
    self.getSlsvSourcedataSourceConfigs = function (slsvSource, callback) {
        KGcreator.getSlsvSourceConfig(slsvSource, function (err, config) {
            if (err) {
                return callback(err);
            }
            self.sourceConfig = config;
            callback(null, config.databaseSources);
        });
    };

    /**
     * Gets columns and tables information from query sets.
     * @function
     * @name getQuerySetsColumnAndTables
     * @memberof SQLquery_filters
     * @param {Object} querySets - The query sets to process
     * @param {string} dataSource - The data source identifier
     * @param {Object} dataSourcemappings - Mappings for the data source
     * @param {Function} callback - Callback function called with (error, paths)
     * @returns {void}
     */
    self.getQuerySetsColumnAndTables = function (querySets, dataSource, dataSourcemappings, callback) {
        var paths = [];
        querySets.sets.forEach(function (querySet) {
            querySet.elements.forEach(function (queryElement, queryElementIndex) {
                var classUri = queryElement.fromNode.id;
                var matches = self.getClass2ColumnMapping(dataSourcemappings, dataSource, classUri);
                if (matches.length == 0) {
                    return callback("no match for class " + classUri);
                }
                if (matches.length > 1) {
                    return callback("multiple matches for class " + classUri + "  :  " + JSON.stringify(matches));
                }
                var match = matches[0];
                var obj = { fromClassUri: classUri, fromColumn: match.column, fromTable: match.table, fromDataSource: match.dataSource };

                var classUri = queryElement.toNode.id;
                var matches = self.getClass2ColumnMapping(dataSourcemappings, dataSource, classUri);

                if (matches.length == 0) {
                    return callback("no match for class " + classUri);
                }
                if (matches.length > 1) {
                    return callback("multiple matches for class " + classUri + "  :  " + JSON.stringify(matches));
                }
                var match = matches[0];
                obj.toClassUri = classUri;
                obj.toColumn = match.column;
                obj.toTable = match.table;
                obj.toDataSource = match.dataSource;

                paths.push(obj);
            });
        });
        callback(null, paths);
    };

    /**
     * Gets class to column mappings for a specific class URI.
     * @function
     * @name getClass2ColumnMapping
     * @memberof SQLquery_filters
     * @param {Object} mappings - The mappings object
     * @param {string} datasource - The data source identifier
     * @param {string} classUri - The class URI to find mappings for
     * @returns {Array} Array of matching mappings
     */
    self.getClass2ColumnMapping = function (mappings, datasource, classUri) {
        var matches = [];
        for (var table in mappings) {
            mappings[table].tripleModels.forEach(function (triple) {
                if (triple.p == "rdf:type" && triple.o == classUri) {
                    matches.push({
                        dataSource: datasource,
                        table: table,
                        column: triple.s.replace("_$", ""),
                    });
                }
            });
        }

        return matches;
    };

    /**
     * Executes the query with current filters.
     * @function
     * @name runQuery
     * @memberof SQLquery_filters
     * @returns {void}
     */
    self.runQuery = function () {
        return SQLquery_run.execPathQuery(self.querySets, self.currentSource, "lifex_dalia_db", {}, function (err, tableData) {
            if (err) {
                return alert(err);
            }
            self.showTableData(tableData);
        });
    };

    return self;
})();

export default SQLquery_filters;
window.SQLquery_filters = SQLquery_filters;
