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
        var triples = [];

        KGbuilder_main.stopCreateTriples = false;
        if (options.clientSocketId) {
            SocketManager.clientSockets[options.clientSocketId].on("KGCreator", function (message) {
                if (message == "stopCreateTriples") {
                    KGbuilder_main.stopCreateTriples = true;
                }
            });
        }

        KGbuilder_main.initMappings(source, datasource, tables, options, function (err, tableMappingsToProcess) {
            if (err) {
                return callback(err);
            }

            if (tableMappingsToProcess.length == 0) {
                return callback(" no mappings to process");
            }

            async.eachSeries(
                tableMappingsToProcess,
                function (mappings, callbackEach) {
                    async.series(
                        [
                            //set dataSourceMappings config

                            // load Lookups
                            function (callbackSeries) {
                                if (!mappings.lookups || mappings.lookups.length == 0) {
                                    return callbackSeries();
                                }
                                // filePath for CSV lookups
                                var lookups = mappings.lookups;
                                if (Object.keys(lookups).length > 0) {
                                    Object.keys(lookups).forEach(function (key) {
                                        var lookup = lookups[key];
                                        if (lookup.fileName && lookup.type == "csvSource") {
                                            lookup.filePath = csvDir + lookup.fileName;
                                        }
                                    });
                                }

                                KGbuilder_triplesMaker.loadLookups(mappings, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    lookUpsMap = result;
                                    return callbackSeries();
                                });
                            },
                            // init functions
                            function (callbackSeries) {
                                function getFunction(argsArray, fnStr, callback) {
                                    try {
                                        fnStr = fnStr.replace(/[/r/n/t]gm/, "");
                                        var array = /\{(?<body>.*)\}/.exec(fnStr);
                                        if (!array) {
                                            return callbackSeries("cannot parse object function " + JSON.stringify(item) + " missing enclosing body into 'function{..}'");
                                        }
                                        var fnBody = array.groups["body"];
                                        fnBody = "try{" + fnBody + "}catch(e){\n\rreturn console.log(e)\n\r}";
                                        var fn = new Function(argsArray, fnBody);
                                        return callback(null, fn);
                                    } catch (err) {
                                        return callback("error in object function " + fnStr + "\n" + err);
                                    }
                                }

                                mappings.tripleModels.forEach(function (item) {
                                    if (item.s.indexOf("function{") > -1) {
                                        getFunction(["row", "mapping"], item.s, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(item));
                                            }
                                            item.s = fn;
                                        });
                                    }
                                    if (item.o.indexOf("function{") > -1) {
                                        getFunction(["row", "mapping"], item.o, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(item));
                                            }

                                            item.o = fn;
                                        });
                                    }

                                    if (item.p.indexOf("function{") > -1) {
                                        getFunction(["row", "mapping"], item.p, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(item));
                                            }

                                            item.p = fn;
                                        });
                                    }
                                });
                                for (var key in mappings.transform) {
                                    var fnStr = mappings.transform[key];
                                    if (fnStr.indexOf("function{") > -1) {
                                        getFunction(["value", "role", "prop", "row", "mapping"], fnStr, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(fnStr));
                                            }
                                            mappings.transform[key] = fn;
                                        });
                                    }
                                }
                                callbackSeries();
                            },

                            //load data
                            function (callbackSeries) {
                                KGbuilder_socket.message(options.clientSocketId, "creating triples for mappings " + mappings.table);
                                KGbuilder_triplesMaker.loadData(mappings, options, function (err, result) {
                                    if (err) {
                                        if (tableMappingsToProcess.length > 1) {
                                            KGbuilder_socket.message(options.clientSocketId, "cannot load data for table " + mappings.table, true);
                                            return callbackEach();
                                        }
                                        return callbackSeries(err);
                                    }
                                    KGbuilder_triplesMaker.allColumns = {};
                                    data = result;

                                    callbackSeries();
                                });
                            },

                            //build triples
                            function (callbackSeries) {
                                KGbuilder_triplesMaker.existingTriples = {};

                                //sample only
                                if (options.sampleSize) {
                                    options.customMetaData = { [KGbuilder_triplesMaker.mappingFilePredicate]: mappings.table };

                                    KGbuilder_triplesMaker.createTriples(mappings, data, options, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }

                                        output = result;
                                        return callback(null, output);
                                    });
                                } else {
                                    KGbuilder_main.createTriplesByBatch(data, mappings, options, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }
                                        totalTriples = result;
                                        callbackSeries();
                                    });
                                }
                            },
                        ],
                        function (err) {
                            if (err) {
                                return callbackEach(err);
                            }
                            output = "(created  triples for table " + mappings.table + " :" + totalTriples;
                            return callbackEach();
                        },
                    );
                },

                function (err) {
                    return callback(err, output);
                },
            );
        });
    },

    createTriplesByBatch: function (data, mappings, options, callback) {
        var sliceIndex = 0;
        var totalTriples = 0;
        var triples = [];
        var slices = util.sliceArray(data, 200);
        var uniqueSubjects = {};

        async.eachSeries(
            slices,
            function (dataSlice, callbackEach) {
                async.series(
                    [
                        // interruption
                        function (callbackSeries) {
                            if (KGbuilder_main.stopCreateTriples) {
                                var message = "mapping " + mappings.table + " : import interrupted by user";
                                KGbuilder_socket.message(options.clientSocketId, message);
                                return callbackSeries(message);
                            }
                            return callbackSeries();
                        },
                        //set triples
                        function (callbackSeries) {
                            options.customMetaData = { [KGbuilder_triplesMaker.mappingFilePredicate]: mappings.table };
                            KGbuilder_triplesMaker.createTriples(mappings, dataSlice, options, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                triples = result;

                                callbackSeries();
                            });
                        },

                        //add metadata
                        function (callbackSeries) {
                            triples.forEach(function (triple) {
                                if (!uniqueSubjects[triple.s]) {
                                    uniqueSubjects[triple.s] = 1;

                                    triples = triples.concat(KGbuilder_triplesMaker.getMetaDataTriples(triple.s, { mappingTable: mappings.table }));
                                }
                            });
                            callbackSeries();
                        },

                        //writeTriples
                        function (callbackSeries) {
                            // KGbuilder_socket.message(options.clientSocketId, "table " + mappings.table + " : writing triples:" + triples.length);

                            //return callbackSeries();
                            KGbuilder_triplesWriter.writeTriples(triples, mappings.graphUri, mappings.sparqlServerUrl, function (err, result) {
                                if (err) {
                                    var error = " slice " + sliceIndex + "/" + slices.length + "\n";
                                    KGbuilder_socket.message(options.clientSocketId, error);
                                    return callbackEach(err);
                                }
                                sliceIndex += 1;
                                totalTriples += result;
                                KGbuilder_socket.message(options.clientSocketId, "table " + mappings.table + " : writen triples:" + totalTriples);

                                callbackSeries();
                            });
                        },
                    ],
                    function (err) {
                        callbackEach(err);
                    },
                );
            },
            function (err) {
                return callback(err, totalTriples);
            },
        );
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
    initMappings: function (source, datasource, tables, options, callback) {
        var tableMappingsToProcess = [];
        var sourceMappingsDir = path.join(__dirname, "../../data/mappings/" + source + "/");
        var csvDir = path.join(__dirname, "../../data/CSV/" + source + "/");
        var sourceMainJson = {};
        var dataSourceConfig = {};
        var dataSourceMappings = {};

        async.series(
            [
                // read source main.json
                function (callbackSeries) {
                    KGbuilder_main.getSourceConfig(source, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sourceMainJson = result;
                        callbackSeries();
                    });
                },
                // read datasourceMappings
                function (callbackSeries) {
                    try {
                        var mappings;
                        if (options.mappingsFilter) {
                            //  mappings = JSON.parse(options.mappingsFilter);
                            mappings = options.mappingsFilter;
                        } else {
                            var dataSourceMappingsPath = sourceMappingsDir + datasource + ".json";
                            var dataSourceMappingsPath = sourceMappingsDir + datasource + ".json";
                            mappings = JSON.parse("" + fs.readFileSync(dataSourceMappingsPath));
                        }
                        dataSourceMappings.mappings = mappings;
                        dataSourceMappings.source = source;
                        dataSourceMappings.datasource = datasource;

                        if (sourceMainJson.databaseSources[datasource]) {
                            dataSourceMappings.type = "databaseSources";

                            dataSourceMappings.config = sourceMainJson.databaseSources[datasource];
                            dataSourceMappings.config.dbName = datasource;
                        }
                    } catch (e) {
                        return callbackSeries(e);
                    }
                    callbackSeries();
                },

                //select tableMappings
                function (callbackSeries) {
                    if (tables && !Array.isArray(tables)) {
                        tables = [tables];
                    }
                    for (var key in dataSourceMappings.mappings) {
                        if (!tables || tables.indexOf(key) > -1) {
                            var tablemappings = dataSourceMappings.mappings[key];

                            tablemappings.table = key;
                            if (dataSourceMappings.config) {
                                //database
                                tablemappings.datasourceConfig = dataSourceMappings.config;
                            } else {
                                //csvFile

                                tablemappings.csvDataFilePath = csvDir + key;
                            }
                            tablemappings.prefixes = sourceMainJson.prefixes;
                            tablemappings.graphUri = sourceMainJson.graphUri;
                            tablemappings.sparqlServerUrl = sourceMainJson.sparqlServerUrl;
                            if(tablemappings.sparqlServerUrl=='default'){
                             tablemappings.sparqlServerUrl =ConfigManager.config.sparql_server.url;
                            }

                            tableMappingsToProcess.push(tablemappings);
                        }
                    }
                    callbackSeries();
                },
            ],
            function (err) {
                return callback(err, tableMappingsToProcess);
            },
        );
    },
    /**
     *
     *
     *
     * @param source
     * @param datasource
     * @param tables list of table otherwise if null delete all KGcreator triples
     * @param options
     * @param callback
     */
    deleteKGcreatorTriples: function (source, tables, callback) {
        KGbuilder_main.getSourceConfig(source, function (err, sourceMainJson) {
            if (err) {
                return callbackSeries(err);
            }

            //delete allKGCreator triples
            if (!tables || tables.length == 0) {
                KGbuilder_triplesWriter.deleteKGcreatorTriples(sourceMainJson.sparqlServerUrl, sourceMainJson.graphUri, null, function (err, result) {
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
                        KGbuilder_triplesWriter.deleteKGcreatorTriples(sourceMainJson.sparqlServerUrl, sourceMainJson.graphUri, table, function (err, result) {
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
};

module.exports = KGbuilder_main;

if (false) {
    var options = {};
    KGbuilder_main.importTriplesFromCsvOrTable("LIFEX_DALIA", "lifex_dalia_db", "dbo.V_jobcard", options, function (err, result) {});
}
