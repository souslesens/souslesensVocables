var fs = require("fs");
var path = require("path");
var csvCrawler = require("../_csvCrawler.");
var async = require("async");
var util = require("../util.");
var httpProxy = require("../httpProxy.");
//var sqlServerProxy = require("../KG/SQLserverConnector.");

//var ConfigManager = require("../configManager.");

const KGbuilder_triplesMaker = require("./KGbuilder_triplesMaker");
var KGbuilder_triplesWriter=require('./KGbuilder_triplesWriter');





var KGbuilder_main = {





  /**
   * Generate triples from a CSV file or database
   *
   * @param {string} dirName - the subdirectory of <src-dir>/data where to look for <mappingFileName>
   * @param {string} mappingFileName - name of the csv file to generate triples from (optional if null create triples from all mappings)
   * @param {Object} options - keys: sparqlServerUrl, deleteOldGraph, graphUri
   * @param {Function} callback - Node-style async Function called to proccess result or handle error
   */
  createTriplesFromCsvOrTable: function(source, datasource, tables, options, callback) {

    //  var sparqlServerUrl;
    var output = "";
    var clientSocketId = options.clientSocketId;
    var tableMappingsToProcess = [];
    var sourceMappingsDir = path.join(__dirname, "../../data/mappings/" + source + "/");
    var sourceMainJson = {};
    var dataSourceConfig = {};
    var dataSourceMappings = {};
    var data=[]

    KGbuilder_main.stopCreateTriples = false;
    if (options.clientSocketId) {
      SocketManager.clientSockets[options.clientSocketId].on("KGCreator", function(message) {
        if (message == "stopCreateTriples") {
          KGtripleBuilder.stopCreateTriples = true;
        }
      });
    }


    KGbuilder_main.initMappings(source, datasource, tables, options, function(err, tableMappingsToProcess) {
      if (err) {
        return callback(err);
      }


      async.eachSeries(tableMappingsToProcess, function(mappings, callbackEach) {
        async.series([


            //set dataSourceMappings config


            // load Lookups
            function(callbackSeries) {
              if (mappings.lookups.length == 0) {
                return callbackSeries();
              }
              KGbuilder_triplesMaker.loadLookups(mappings, function(err, result) {
                if (err) {
                  return callbackSeries(err);
                }
                lookUpsMap = result;
                return callbackSeries();
              });
            }
            ,




          // init functions
            function(callbackSeries) {
              function getFunction(argsArray, fnStr, callback) {
                try {
                  fnStr = fnStr.replace(/[/r/n/t]gm/, "");
                  var array = /\{(?<body>.*)\}/.exec(fnStr);
                  if (!array) {
                    return callbackSeries("cannot parse object function " + JSON.stringify(item) + " missing enclosing body into 'function{..}'");
                  }
                  var fnBody = array.groups["body"];
                  fnBody = "try{" + fnBody + "}catch(e){\rreturn console.log(e)\r}";
                  var fn = new Function(argsArray, fnBody);
                  return callback(null, fn);
                } catch (err) {
                  return callback("error in object function " + fnStr + "\n" + err);
                }
              }

              mappings.tripleModels.forEach(function(item) {
                if (item.s.indexOf("function{") > -1) {
                  getFunction(["row", "mapping"], item.s, function(err, fn) {
                    if (err) {
                      return callbackSeries(err + " in mapping" + JSON.stringify(item));
                    }
                    item.s = fn;
                  });
                }
                if (item.o.indexOf("function{") > -1) {
                  getFunction(["row", "mapping"], item.o, function(err, fn) {
                    if (err) {
                      return callbackSeries(err + " in mapping" + JSON.stringify(item));
                    }

                    item.o = fn;
                  });
                }

                if (item.p.indexOf("function{") > -1) {
                  getFunction(["row", "mapping"], item.p, function(err, fn) {
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
                  getFunction(["value", "role", "prop", "row", "mapping"], fnStr, function(err, fn) {
                    if (err) {
                      return callbackSeries(err + " in mapping" + JSON.stringify(fnStr));
                    }
                    mappings.transform[key] = fn;

                  });
                }
              }
              callbackSeries()
            },


            //delete deleteMappingFileTriples
            function(callbackSeries) {
              if (!options.deleteTriples) {
                return callbackSeries();
              }

                KGbuilder_triplesWriter.deleteMappingFileTriples(mappings, function(err, result) {
                  if (err) {
                    return callbackSeries(err);
                  }
                  output = result;
                  return callbackSeries(null, "DELETE Mapping File triples  : " + mappings.fileName + "  " + result);
                });
              }
            ,


            // delete all  graph (optional)
            function(callbackSeries) {
              if (!options.deleteOldGraph) {
                return callbackSeries();
              }

              KGtripleBuilder.clearGraph(sourceMainJson.graphUri,mappings.sparqlServerUrl, function(err, _result) {
                if (err) {
                  return callbackSeries(err);
                }
               KGbuilder_socket.message(options.clientSocketId, "graph deleted");

                callbackSeries();
              });
            },




            //load data
            function(callbackSeries) {
              KGbuilder_triplesMaker.loadData(mappings, options,function(err, result) {
                if (err) {
                  return callbackSeries(err);
                }
                data = result;
                callbackSeries();
              });

            }

            ,

            //build triples
            function(callbackSeries) {

              options.customMetaData = { [KGbuilder_triplesMaker.mappingFilePredicate]: mappings.fileName };
              KGbuilder_triplesMaker.createTriples(mappings,data, options, function(err, result) {
               KGbuilder_socket.message(options.clientSocketId, "creating triples for mapping " + mappings.fileName);
                if (err) {
                  return callbackSeries(err);
                }
                if (options.sampleSize) {
                  output = result;
                  return callbackEach(err, output);
                }
                else {
                  output = { countCreatedTriples: result };
                }
                callbackEach();
              });
            }

            ,

            function(callbackSeries) {

              if (options.sampleSize) {
                var sampleTriples = triples.slice(0, options.sampleSize);
                return callback(null, sampleTriples);
              }
            }

            ,

            //add metadata
            function(callbackSeries) {
              var uniqueSubjects = {};
              var metaDataTriples = [];
              triples.forEach(function(triple) {
                if (!uniqueSubjects[triple.s]) {
                  uniqueSubjects[triple.s] = 1;

                  metaDataTriples = metaDataTriples.concat(KGtripleBuilder.getMetaDataTriples(triple.s, { mappingFileName: tableMappings.fileName }));
                }
              });
            }

            ,

            //writeTriples
            function(callbackSeries) {
              triples = triples.concat(metaDataTriples);

             KGbuilder_socket.message(options.clientSocketId, "mapping " + tableMappings.fileName + " : writing triples:" + triples.length);

              var slices = util.sliceArray(triples, 200);
              triples = [];
              var sliceIndex = 0;
              async.eachSeries(
                slices,
                function(slice, callbackEach) {
                  if (KGtripleBuilder.stopCreateTriples) {
                    var message = "mapping " + tableMappings.fileName + " : import interrupted by user";
                    //KGbuilder_socket.message(options.clientSocketId,message)
                    return callbackEach(message);
                  }

                  KGtripleBuilder.writeTriples(slice, graphUri, sparqlServerUrl, function(err, result) {
                    if (err) {
                      errors += err + " slice " + sliceIndex + "\n";
                      return callbackEach(err);
                    }
                    sliceIndex += 1;
                    totalTriples += result;
                   KGbuilder_socket.message(options.clientSocketId, "mapping " + tableMappings.fileName + " : writen triples:" + totalTriples);

                    callbackEach();
                  });

                });
            }


          ],

          function(err) {
            if (err == "sample") {
              err = null;
            }
            return callback(err, output);
          }
        )
          , function(err) {
        };
      });

    });
  }


  , initMappings: function(source, datasource, tables, options, callback) {

    var tableMappingsToProcess = [];
    var sourceMappingsDir = path.join(__dirname, "../../data/mappings/" + source + "/");
    var csvDir = path.join(__dirname, "../../data/CSV/" + source + "/");
    var sourceMainJson = {};
    var dataSourceConfig = {};
    var dataSourceMappings = {};

    async.series([

      // read source main.json
      function(callbackSeries) {
        try {
          var mainJsonPath = sourceMappingsDir + "main.json";
          sourceMainJson = JSON.parse("" + fs.readFileSync(mainJsonPath));
        } catch (e) {
          return callbackSeries(e);
        }
        callbackSeries();
      },
      // read datasourceMappings
      function(callbackSeries) {
        try {
          var dataSourceMappingsPath = sourceMappingsDir + datasource + ".json";
          var mappings = JSON.parse("" + fs.readFileSync(dataSourceMappingsPath));
          dataSourceMappings.mappings = mappings;
          dataSourceMappings.source = source;
          dataSourceMappings.datasource = datasource;


          if (sourceMainJson.databaseSources[datasource]) {
            dataSourceMappings.type = "databaseSources";

            dataSourceMappings.config = sourceMainJson.databaseSources[datasource];
            dataSourceMappings.config.dbName=datasource
          }


        } catch (e) {
          return callbackSeries(e);
        }
        callbackSeries();
      },

      //select tableMappings
      function(callbackSeries) {
        if (tables && !Array.isArray(tables)) {
          tables = [tables];
        }
        for (var key in dataSourceMappings.mappings) {

          if (!tables || tables.indexOf(key) > -1) {
            var tablemappings = dataSourceMappings.mappings[key];

            tablemappings.table = key;
            if (dataSourceMappings.config) {//database
              tablemappings.datasourceConfig = dataSourceMappings.config;
            }else{//csvFile
              tablemappings.csvDataFilePath=csvDir+key+".json"

            }
            tablemappings.prefixes=sourceMainJson.prefixes
            tablemappings.graphUri=sourceMainJson.graphUri;
            tablemappings.sparqlServerUrl=sourceMainJson.sparqlServerUrl;

            tableMappingsToProcess.push(tablemappings);
          }
        }
        callbackSeries();
      }
    ], function(err) {
      return callback(null, tableMappingsToProcess);
    });
  }


};

module.exports = KGbuilder_main;

if (true) {
  var options = {};
  KGbuilder_main.createTriplesFromCsvOrTable("LIFEX_DALIA",
    "lifex_dalia_db",
    "dbo.V_jobcard",
    options,
    function(err, result) {

    }
  );

}

