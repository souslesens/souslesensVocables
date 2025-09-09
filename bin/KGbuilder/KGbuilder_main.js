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


const MappingsParser = require("./mappingsParser.js")
const TriplesMaker = require("./triplesMaker.js")


const TripleMaker = require("./triplesMaker.js")

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
            SocketManager.clientSockets[options.clientSocketId].on("KGCreator", function (message) {
                if (message == "stopCreateTriples") {
                    KGbuilder_main.stopCreateTriples = true;
                }
            });
        }


        if (!Array.isArray(tables)) {
            tables = [tables]
        }


        var mappingData = {}
        var sourceConfig = null
        var tableProcessingParams = {
            columnsMappings: {},
            jsFunctionsMap: {},
            tableInfos: {},
            sourceInfos: {},
            uniqueTriplesMap:{}


        }



        // load visj mapping file
        MappingsParser.getMappingsData(source, function (err, _mappingData) {
            if (err) {
                return callback(err)
            }


            mappingData = _mappingData
            tableProcessingParams.sourceInfos = mappingData.options.config
            tableProcessingParams.uniqueTriplesMap={}
            var sampleTriples=[];
            var totalTriplesCount={}

            /**
             * for each table get columnsMappingMap and create tripels
             *
             */
            async.eachSeries(
                tables,
                function (table, callbackEach) {
                    async.series([
                        function (callbackSeries) {

                            MappingsParser.getColumnsMap(mappingData, tables[0], function (err, columnsMappings) {
                                if (err) {
                                    return callbackSeries(err)
                                }
                                tableProcessingParams.columnsMappings = columnsMappings
                                callbackSeries()
                            })
                        },

                        function (callbackSeries) {// init functions and transform map
                            MappingsParser.getJsFunctionsMap(tableProcessingParams.columnsMappings, function (err, jsFunctionsMap) {
                                if (err) {
                                    return callbackSeries(err)
                                }
                                tableProcessingParams.jsFunctionsMap = jsFunctionsMap
                                callbackSeries()

                            })

                        },
                        function (callbackSeries) {// init globalParams
                            var firstColumn = null;
                            for (const colId in tableProcessingParams.columnsMappings) {
                                firstColumn = tableProcessingParams.columnsMappings[colId]
                                break;
                            }
                            if (!firstColumn) {
                                return callbackSeries("no column in mappings")
                            }
                            var tableInfos = {
                                table: firstColumn.dataTable,
                            }
                            if (firstColumn.datasource) {// database
                                tableInfos.dbID = firstColumn.datasource
                            } else {//csv
                                var csvDir = path.join(__dirname, "../../data/CSV/" + source + "/");
                                tableInfos.csvDataFilePath = csvDir + firstColumn.dataTable
                            }
                            tableProcessingParams.tableInfos = tableInfos;

                            /*  globalParamsMap = MappingsParser.getGlobalParamsMap(tableProcessingParams.columnsMappings)
                              globalParamsMap.graphUri = sourceConfig.graphUri

                              tableProcessingParams.globalParamsMap =globalParamsMap*/
                            callbackSeries();

                        }, function (callbackSeries) {// create the tripels or thois table
                            TriplesMaker.readAndProcessData(tableProcessingParams, options, function (err, result) {
                                if (err) {
                                    return callbackSeries(err)
                                }
                                if(options.sampleSize){// dont write return triples sample
                                    sampleTriples=result.sampleTriples
                                }else {
                                    totalTriplesCount[table] += result.totalTriplesCount
                                }
                                callbackSeries()
                            })
                        }
                    ], function (err) {// after all tables
                        callbackEach(err)
                    })

                },

                function (err) {
                    return callback(err, {sampleTriples:sampleTriples,totalTriplesCount:totalTriplesCount})

                }
            )


            return;
        })
    }
}


module.exports=KGbuilder_main;

  if(false) {
      KGbuilder_main.importTriplesFromCsvOrTable("PAZFLOR_ABOX", "01K1TNFHADVTT7PHJF0AJ4GFRX", "subpackage", options, function (err, result) {
          console.log(err);
          console.log(result)

      });
  }

