import fs from 'fs';
import path from 'path';
import async from 'async';
import csvCrawler from '../_csvCrawler.js';
import util from '../util.js';
import httpProxy from '../httpProxy.js';
import ConfigManager from '../configManager.js';
import SocketManager from '../socketManager.js';
import KGbuilder_triplesWriter from './KGbuilder_triplesWriter';
import KGbuilder_socket from './KGbuilder_socket';
import dbConnector from '../KG/dbConnector';
import { databaseModel as DatabaseModel } from '../../model/databases';
import MappingsParser from './mappingsParser.js';
import TriplesMaker from './triplesMaker.js';
import TripleMaker from './triplesMaker.js';
import { databaseModel } from '../../model/databases.js';

var KGbuilder_main = {
    /**
     * Generate triples from a CSV file or database
     *
     * @param {string} user - a user
     * @param {string} source - slsv source
     * @param {string} datasource - datasource (database or csv file)
     * @param {array} tables - tables to import or null if import all tables
     * @param {Object} options -
     * @param {Function} options - Node-style async Function called to proccess result or handle error
     */
    importTriplesFromCsvOrTable: function (user, source, datasource, tables, options, callback) {
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
            var tableMappings = {};

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

                                    tableProcessingParams.allColumnsMappings = allColumnsMappings;

                                    for (var columnId in allColumnsMappings) {
                                        if (allColumnsMappings[columnId].dataTable == tables[0]) {
                                            tableMappings[columnId] = allColumnsMappings[columnId];
                                        }
                                    }
                                    tableProcessingParams.tableColumnsMappings = tableMappings;

                                    callbackSeries();
                                });
                            },

                            //set label and type for classes referenced by sevral columns
                            function (callbackSeries) {
                                MappingsParser.setAllColumnsLabelAndType(mappingData, tableProcessingParams.allColumnsMappings);

                                callbackSeries();
                            },
                            function (callbackSeries) {
                                MappingsParser.setTableColumnsOtherPredicates(tableMappings);

                                callbackSeries();
                            },

                            //getColumnToColumnMappings
                            function (callbackSeries) {
                                tableProcessingParams.columnToColumnEdgesMap = MappingsParser.getColumnToColumnMappings(
                                    mappingData,
                                    tables[0],
                                    options.filterMappingIds,
                                    tableProcessingParams.allColumnsMappings,
                                );
                                callbackSeries();
                            },

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
                                    if (tableProcessingParams.sourceInfos.csvSources[firstColumn.dataTable]) {
                                        var csvDir = path.join(__dirname, "../../data/CSV/" + source + "/");
                                        tableInfos.csvDataFilePath = csvDir + firstColumn.dataTable;
                                    } else {
                                        tableInfos.dbID = firstColumn.datasource;
                                    }
                                } else {
                                    //csv
                                    return callbackSeries("no datasource");
                                }
                                tableProcessingParams.tableInfos = tableInfos;

                                callbackSeries();
                            },
                            // countitems in table if database
                            function (callbackSeries) {
                                if (tableProcessingParams.tableInfos.csvDataFilePath) {
                                    return callbackSeries();
                                }

                                var sql = 'select count(*) as count from "' + table + '";';
                                try {
                                    databaseModel.getUserConnection(user, tableProcessingParams.tableInfos.dbID).then((connection) => {
                                        databaseModel.query(connection, sql).then((result) => {
                                            tableProcessingParams.tableInfos.tableTotalRecords = parseInt(result.rows[0].count);
                                            callbackSeries();
                                        });
                                    });
                                } catch (err) {
                                    callbackSeries(err);
                                }
                            },
                            // create the tripels for this table
                            function (callbackSeries) {
                                TriplesMaker.readAndProcessData(user, tableProcessingParams, options, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    if (options.sampleSize) {
                                        // dont write return triples sample
                                        sampleTriples = result.sampleTriples;
                                    } else {
                                        if (!totalTriplesCount[table]) totalTriplesCount[table] = 0;
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
                    return callback(err, { sampleTriples: sampleTriples, totalTriplesCount: totalTriplesCount });
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
        if (!options) {
            options = {};
        }

        KGbuilder_main.getSourceConfig(source, function (err, sourceMainJson) {
            if (err) {
                return callback(err);
            }
            if (options.filterMappingIds) {
                return KGbuilder_triplesWriter.deleteSpecficMappings(
                    options.isSample,
                    sourceMainJson.graphUri,
                    sourceMainJson.sparqlServerUrl,
                    options.filterMappingIds,
                    options,
                    function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, result);
                    },
                );
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
