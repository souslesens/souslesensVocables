var fs = require("fs");
var path = require("path");
var async = require("async");

var csvCrawler = require("../_csvCrawler.");
var util = require("../util.");
var httpProxy = require("../httpProxy.");
const ConfigManager = require("../configManager.");

const SocketManager = require("../socketManager.");
const KGbuilder_triplesMaker = require("./KGbuilder_triplesMaker");
const KGbuilder_triplesWriter = require("./KGbuilder_triplesWriter");
const KGbuilder_socket = require("./KGbuilder_socket");
const dbConnector = require("../KG/dbConnector");
const DatabaseModel = require("../../model/databases").databaseModel;

const MappingsParser = require("./mappingsParser.js");
const TriplesMaker = require("./triplesMaker.js");

const TripleMaker = require("./triplesMaker.js");
const {databaseModel} = require("../../model/databases.js");

var KGbuilder_main = {
    /**
     * Generate triples from a CSV file or database
     *
     * @param {string} source - slsv source
     * @param {string} datasource - datasource (database or csv file)
     * @param {array} tables - tables to import or null if import all tables
     * @param {Object} options -
     * @param {Function} options - Node-style async Function called to proccess result or handle error
     */
    importTriplesFromCsvOrTable: function (source, datasource, tables, options, callback) {
        //  var sparqlServerUrl;
        var output = "";
        var clientSocketId = options.clientSocketId;
        var tableMappingsToProcess = [];
        var sourceMappingsDir = path.join(__dirname, "../../data/mappings/" + source + "/");

        var csvDir = path.join(__dirname, "../../data/CSV/" + source + "/");
        var sourceMainJson = {};
        var dataSourceConfig = {};
        var dataSourceMappings = {};
        var data = [];

        KGbuilder_main.stopCreateTriples = false;
        if (options.clientSocketId) {
            SocketManager.clientSockets[options.clientSocketId].on("KGbuilder", function (message) {
                if (message == "stopCreateTriples") {
                    KGbuilder_main.stopCreateTriples = true;
                }
            });
        }

        if (!Array.isArray(tables)) {
            tables = [tables];
        }

        var mappingData = {};
        var sourceConfig = null;
        var tableProcessingParams = {
            columnsMappings: {},
            jsFunctionsMap: {},
            tableInfos: {},
            sourceInfos: {},
            uniqueTriplesMap: {},
        };

        // load visj mapping file
        MappingsParser.getMappingsData(source, function (err, _mappingData) {
            if (err) {
                return callback(err);
            }

            mappingData = _mappingData;
            tableProcessingParams.sourceInfos = mappingData.options.config;

            tableProcessingParams.uniqueTriplesMap = {};
            var sampleTriples = [];
            var totalTriplesCount = {};

            /**
             * for each table get columnsMappingMap and create tripels
             *
             */
            async.eachSeries(
                tables,
                function (table, callbackEach) {
                    async.series(
                        [
                            //getColumnsMap
                            function (callbackSeries) {
                                MappingsParser.getColumnsMap(mappingData, tables[0], function (err, allColumnsMappings) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }

                                    tableProcessingParams.allColumnsMappings= allColumnsMappings;

                                   var tableMappings={}
                                    for(var columnId in allColumnsMappings){
                                        if(allColumnsMappings[columnId].dataTable==tables[0]){
                                            tableMappings[columnId]=allColumnsMappings[columnId]

                                        }
                                    }
                                    tableProcessingParams.tableColumnsMappings=tableMappings



                                    callbackSeries();
                                });
                            },

                            //getColumnToColumnMappings
                            function (callbackSeries) {
                                tableProcessingParams.columnToColumnEdgesMap = MappingsParser.getColumnToColumnMappings(mappingData,tables[0],options.filterMappingIds);
                                callbackSeries();
                            }
                            ,

                            // init functions and transform map
                            function (callbackSeries) {
                                MappingsParser.getJsFunctionsMap(tableProcessingParams.allColumnsMappings, function (err, jsFunctionsMap) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    tableProcessingParams.jsFunctionsMap = jsFunctionsMap;
                                    callbackSeries();
                                });
                            },

                            // init globalParams
                            function (callbackSeries) {
                                var firstColumn = null;
                                for (const colId in tableProcessingParams.tableColumnsMappings) {
                                    firstColumn = tableProcessingParams.tableColumnsMappings[colId];
                                    break;
                                }
                                if (!firstColumn) {
                                    return callbackSeries("no column in mappings");
                                }
                                var tableInfos = {
                                    table: firstColumn.dataTable,
                                };
                                if (firstColumn.datasource) {
                                    // database
                                    tableInfos.dbID = firstColumn.datasource;
                                } else {
                                    //csv
                                    var csvDir = path.join(__dirname, "../../data/CSV/" + source + "/");
                                    tableInfos.csvDataFilePath = csvDir + firstColumn.dataTable;
                                }
                                tableProcessingParams.tableInfos = tableInfos;

                                callbackSeries();
                            },
                            // countitems in table
                            function (callbackSeries) {
                             var sql="select count(*) as count from \""+table+"\";"
                                try {
                                    databaseModel.query(tableProcessingParams.tableInfos.dbID, sql)
                                        .then((result) => {
                                            tableProcessingParams.tableInfos.tableTotalRecords = parseInt(result.rows[0].count)
                                            callbackSeries();
                                        })
                                }catch(eee){
                                    callbackSeries(err);
                                }
                            },
                            // create the tripels for this table
                            function (callbackSeries) {

                                TriplesMaker.readAndProcessData(tableProcessingParams, options, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    if (options.sampleSize) {
                                        // dont write return triples sample
                                        sampleTriples = result.sampleTriples;
                                    } else {
                                        totalTriplesCount[table] += result.totalTriplesCount;
                                    }
                                    callbackSeries();
                                });
                            },
                        ],
                        function (err) {
                            // after all tables
                            callbackEach(err);
                        },
                    );
                },

                function (err) {
                    return callback(err, {sampleTriples: sampleTriples, totalTriplesCount: totalTriplesCount});
                },
            );

            return;
        });
    } /**
     *
     *
     *
     * @param source
     * @param datasource
     * @param tables list of table otherwise if null delete all  triples
     * @param options
     * @param callback
     */,
    deleteKGBuilderTriples: function (source, tables, options, callback) {
        KGbuilder_main.getSourceConfig(source, function (err, sourceMainJson) {
            if (err) {
                return callback(err);
            }

            //delete allKGbuilderC triples
            if (!tables || tables.length == 0) {
                KGbuilder_triplesWriter.deleteKGBuilderTriples(sourceMainJson.sparqlServerUrl, sourceMainJson.graphUri, null, options, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, "deleted all triples :" + result + " in source :" + source);
                });
            } // delete specifc triples with predicate
            else {
                if (!Array.isArray(tables)) {
                    tables = [tables];
                }
                var totalTriples = 0;
                async.eachSeries(
                    tables,
                    function (table, callbackEach) {
                        KGbuilder_triplesWriter.deleteKGBuilderTriples(sourceMainJson.sparqlServerUrl, sourceMainJson.graphUri, table, options, function (err, result) {
                            if (err) {
                                return callbackEach(err);
                            }
                            //   KGbuilder_socket.message(options.clientSocketId, "deleted triples :" + result + " in table " + mappings.table)
                            totalTriples += result;
                            return callbackEach(err);
                        });
                    },
                    function (err) {
                        return callback(null, "deleted triples  in tables " + tables.toString() + " : " + totalTriples);
                    },
                );
            }
        });
    },
    getSourceConfig: function (source, callback) {
        // var sourceMappingsDir = path.join(__dirname, "../../data/mappings/" + source + "/");

        try {
            // var mainJsonPath = sourceMappingsDir + "main.json";
            var mainJsonPath = path.join(__dirname, "../../data/graphs/mappings_" + source + "_ALL" + ".json");
            var visjsMappingsJson = JSON.parse("" + fs.readFileSync(mainJsonPath));
            var sourceMainJson = visjsMappingsJson.options.config;
            if (sourceMainJson.sparqlServerUrl == "_default") {
                sourceMainJson.sparqlServerUrl = ConfigManager.config.sparql_server.url;
            }
        } catch (e) {
            return callback(e);
        }
        callback(null, sourceMainJson);
    },
};

module.exports = KGbuilder_main;

if (false) {
    KGbuilder_main.importTriplesFromCsvOrTable("PAZFLOR_ABOX", "01K1TNFHADVTT7PHJF0AJ4GFRX", "subpackage", options, function (err, result) {
        console.log(err);
        console.log(result);
    });
}
