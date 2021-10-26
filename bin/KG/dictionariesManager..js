var SQLserverConnector = require("./SQLserverConnector.");
var ConfigManager = require("../configManager.");
var ElasticRestProxy = require("../elasticRestProxy.");
var async = require("async");
var util = require("../util.");
const request = require("request");
var DictionariesManager = {
    getOneModelSuperClasses: function (callback) {
        var column = "*";
        var table = "[onemodel].[dbo].[superClasses]";
        var sqlQuery = " select distinct " + column + " from " + table; //+ " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
        SQLserverConnector.getData(req.body.dataSource.dbName, req.body.sqlQuery, function (err, data) {
            if (err) {
                return callback(err.responseText);
            }
            callback(null, data);
        });
    },
    getReferenceDictionary: function (superClassId, sources, callback) {
        var sourceStr = "";
        if (sources) {
            if (!Array.isArray(sources)) sources = [sources];
            sources.forEach(function (source, index) {
                if (index > 0) sourceStr += ",";
                sourceStr += source;
            });
            sourceStr = " and source in ('" + sourceStr + "')";
        }

        var column = "*";
        var table = "[onemodel].[dbo].[reference_dictionary]";
        var where = " where superClassUri='" + superClassId + "'" + sourceStr;
        var sqlQuery = " select distinct " + column + " from " + table + where; //+ " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
        SQLserverConnector.getData(req.body.dataSource.dbName, req.body.sqlQuery, function (err, data) {
            if (err) {
                return callback(err.responseText);
            }

            var referenceDictionary = {};
            data.forEach(function (item, index) {
                if (item.term) {
                    if (!referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()]) referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()] = {};
                    if (!referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source])
                        referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source] = item;
                    // referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()]=item
                }
                if (item.type != "REFERENCE" && item.type != "CANDIDATE") {
                    referenceDictionary[item.superClassUri].noSubClasses = true;
                }
            });
            callback(referenceDictionary);
        });
    },

    listIndexes: function (callback) {
        ConfigManager.getGeneralConfig(function (err, config) {
            console.log("ee");
            if (err) return callback(err);
            elasticUrl = config.ElasticSearch.url;
            ElasticRestProxy.listIndexes(elasticUrl, function (err, indexes) {
                return callback(err, indexes);
            });
        });
    },

    indexSource: function (indexName, data, options, callback) {
        var elasticUrl;
        async.series(
            [
                //prepare payload
                function (callbackSeries) {
                    ConfigManager.getGeneralConfig(function (err, config) {
                        console.log("ee");
                        if (err) return callbackSeries(err);
                        elasticUrl = config.ElasticSearch.url;
                        callbackSeries();
                    });
                },

                //delete index
                function (callbackSeries) {
                    ElasticRestProxy.deleteIndex(elasticUrl, indexName, function (err, result) {
                        callbackSeries(err);
                    });
                },

                function (callbackSeries) {
                    var totalLines = 0;
                    var bulkStr = "";

                    data.forEach(function (item, indexedLine) {
                        var lineContent = "";
                        var id = "R" + util.getRandomHexaId(10);
                        bulkStr += JSON.stringify({ index: { _index: indexName, _type: indexName, _id: id } }) + "\r\n";
                        bulkStr += JSON.stringify(item) + "\r\n";
                    });

                    var options = {
                        method: "POST",
                        body: bulkStr,
                        encoding: null,
                        timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl + "_bulk?refresh=wait_for",
                    };
                    request(options, function (error, response, body) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        const elasticRestProxy = require("../elasticRestProxy..js");
                        elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                            if (err) return callbackSeries(err);
                            callbackSeries();
                        });
                    });
                },
            ],

            function (err) {
                if (err) return callback(err);
                callback(null, "done");
            }
        );
    },
};

module.exports = DictionariesManager;
