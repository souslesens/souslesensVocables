import SQLquery_run from "./SQLquery_run.js";

var SQLquery_filters = (function () {
    var self = {};

    self.showFiltersDialog = function (querySets, slsvSource) {
        self.querySets = querySets;
        var paths = [];
        async.series(
            [
                function (callbackSeries) {
                    SQLquery_run.getQuerySetsColumnAndTables(querySets, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        paths = result;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    SQLquery_run.getSlsvSourceDataBaseSourceConfigs(slsvSource, function (err, dataSourceConfig) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        self.dataBaseSourceConfigs = dataSourceConfig;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var databaseSources = [];
                    for (var key in self.dataBaseSourceConfigs) {
                        databaseSources.push(key);
                    }
                    async.eachSeries(databaseSources, function (databaseSource, callbackEach) {
                        SQLquery_run.getDBmodel(databaseSource, function (err, model) {
                            if (err) {
                                return alert(err.responsetext);
                            }

                            if (model) {
                                callbackSeries();
                            }
                        });
                    });
                },
            ],

            function (err) {}
        );
    };

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
