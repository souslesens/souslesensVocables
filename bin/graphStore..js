var async = require("async");
var httpProxy = require("./httpProxy.");

const path = require("path");
const jsonFileStorage = require("./jsonFileStorage");

const request = require("request");
const Util = require("./util.");
const fs = require("fs");
const { processResponse } = require("../api/v1/paths/utils");
const ConfigManager = require("./configManager.");
var exec = require("child_process").exec;

var GraphStore = {
    exportGraph: function (sparqlServerConnection, graphUri, callback) {
        //curl --verbose --url "http://example.com/sparql-graph-crud?graph-uri=urn:graph:update:test:get"

        var url = sparqlServerConnection.url + "-graph-crud?";
        var authStr = "";
        if (sparqlServerConnection.auth) {
            authStr = " --digest " + "--user " + sparqlServerConnection.auth.user + ":" + sparqlServerConnection.auth.pass;
        }
        //  var cmd = "curl " + authStr + " --verbose" + ' --url "' + url + "graph-uri=" + graphUri + '"' ;
        var cmd = "curl " + authStr + ' --url "' + url + "graph-uri=" + graphUri + '"';

        exec(cmd, { maxBuffer: 1024 * 30000 }, function (err, stdout, stderr) {
            if (err) {
                console.log(err);
                return callback(err);
            }
            if (stdout) {
                //  console.log(stdout);
                return callback(null, stdout);
            }
            if (stderr) {
                console.log(stderr);
                return callback(stderr);
            }
        });
        return;
    },

    importGraphFromFile: function (sparqlServerConnection, graphUri, filePath, callback) {
        //curl --digest --user dba:SlSv@51 --verbose --url "http://51.178.139.80:8890/sparql-graph-crud-auth?graph-uri=urn:graph:update:test:post" -X POST -T /tmp/bfo.owl

        var url = sparqlServerConnection.url + "-graph-crud?";
        var authStr = "";
        if (sparqlServerConnection.auth) {
            authStr = " --digest " + "--user " + sparqlServerConnection.auth.user + ":" + sparqlServerConnection.auth.pass;
        }

        var cmd = "curl " + authStr + " --verbose" + ' --url "' + url + "graph-uri=" + graphUri + '"' + " -X POST" + " -T " + filePath;

        exec(cmd, { maxBuffer: 1024 * 30000 }, function (err, stdout, stderr) {
            if (err) {
                console.log(err);
                return callback(err);
            }
            if (stdout) {
                // console.log(stdout);
                return callback(null);
            }
            if (stderr) {
                console.log(stderr);
                return callback(null);
            }
        });
        return;

        /*    var Curl = require('node-libcurl').Curl;
       var curl = new Curl();

       var x=Curl.option




      virtuosoUrl
       var curl = new Curl(),
         url = virtuosoUrl



       fs.open( fileName, 'r+', function( err, fd ) {

         //enabling VERBOSE mode so we can get more details on what is going on.
         curl.setOpt( Curl.option.VERBOSE, 1 );
         //set UPLOAD to a truthy value to enable PUT upload.
         curl.setOpt( Curl.option.UPLOAD, 1 );
         //pass the file descriptor to the READDATA option
         // passing one invalid value here will cause an aborted by callback error.
         curl.setOpt( Curl.option.READDATA, fd );

         curl.setOpt( Curl.option.URL, url );

         curl.on( 'end', function( statusCode, body ) {

           console.log( body );

           //remember to always close the file descriptor!
           fs.closeSync( fd );

           fs.unlinkSync( fileName );

           //the same for the curl instance, always close it when you don't need it anymore.
           this.close();
         });

         curl.on( 'error', function( err ) {

           console.log( err );

           fs.closeSync( fd );
           fs.unlinkSync( fileName );
           this.close();
         });

         curl.perform();
       });


    curl.setOpt("URL", "www.yandex.ru");
    curl.setOpt("FOLLOWLOCATION", true);
    curl.on("end", function(status) {
      if (status === 200) {
        console.log("ok");
      }
      this.close(); // eslint-disable-line no-invalid-this
    });
    curl.perform();
*/
    },
    importGraphFromUrl: function (sparqlServerConnection, rdfUrl, graphUri, callback) {
        var filePath;
        var id = Util.getRandomHexaId(10);
        if (path.sep == "/") {
            filePath = "/tmp/" + id + ".rdf";
        } else {
            filePath = "C:\\temp\\" + id + ".rdf";
        }

        let fileStream = fs.createWriteStream(filePath);
        fileStream
            .on("error", function (err) {
                return callback(err);
            })
            .on("close", function (err) {
                GraphStore.importGraphFromFile(sparqlServerConnection, graphUri, filePath, function (err, data) {
                    // fs.rmSync(filePath)
                    callback(err, "done");
                });
            });

        request(rdfUrl)
            .on("error", function (err) {
                return callback(err);
            })
            .pipe(fileStream);
    },

    extractDistinctUriRoots: function (triples) {
        function getUriRoot(uri) {
            if (uri.indexOf("http") != 1) {
                return null;
            }
            var p = "" + uri.lastIndexOf("#");
            if (p < 0) {
                p = "" + uri.lastIndexOf("/");
            }
            if (p > -1) {
                return uri.substring(0, p);
            }
            return null;
        }

        var distinctUriRoots = [];
        triples.forEach(function (triple) {
            if (!triple.subject) {
                return;
            }
            var root = getUriRoot(triple.subject);
            if (root && distinctUriRoots.indexOf(root) < 0) {
                distinctUriRoots.push(root);
            }
        });
        return distinctUriRoots;
    },

    clearGraph: function (sparqlServerConnection, graphUri, callback) {
        var strClear = "CLEAR GRAPH <" + graphUri + "> ";

        var headers = {};
        headers["Accept"] = "application/sparql-results+json";
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        var sparqlUrl = sparqlServerConnection.url + "?query=";

        var options = { query: strClear };
        options.auth = sparqlServerConnection.auth;

        httpProxy.post(sparqlUrl, headers, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback();
        });
    },
    graphExists: function (sparqlServerConnection, graphUri, callback) {
        var query = " Select * from <" + graphUri + "> where {?s ?p ?o} limit 10";

        var headers = {};
        headers["Accept"] = "application/sparql-results+json";
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        var sparqlUrl = sparqlServerConnection.url + "?query=";

        var options = { query: query };
        options.auth = sparqlServerConnection.auth;

        httpProxy.post(sparqlUrl, headers, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings.length > 0);
        });
    },
    insertSourceInConfig: function (sourceName, graphUri, sparqlServerUrl, options, callback) {
        var sourcesPath = path.join(__dirname, "../" + "config/" + options.sourcesJsonFile);
        jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, sources) {
            if (err) {
                return callback(err);
            }
            if (options.reload !== "true" && sources[sourceName]) {
                return callback();
            }

            var id = Util.getRandomHexaId(10);
            var newSource = {
                name: sourceName,
                _type: "source",
                id: id,
                type: "",
                graphUri: graphUri,
                sparql_server: {
                    url: sparqlServerUrl,
                    method: "Post",
                    headers: {},
                },
                editable: options.editable === "true",
                controller: "Sparql_OWL",
                topClassFilter: "?topConcept rdf:type owl:Class .?topConcept rdfs:label|skos:prefLabel ?XX.",
                schemaType: "OWL",
                allowIndividuals: options.allowIndividuals,
                predicates: {
                    broaderPredicate: "",
                    lang: "",
                },
                group: options.group,
                imports: options.imports || [],
                taxonomyPredicates: ["rdfs:subClassOf", "rdf:type"],
            };

            sources[sourceName] = newSource;
            jsonFileStorage.store(path.resolve(sourcesPath), sources, function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback();
            });
        });
    },

    importSourceFromUrl: function (ontologyUrl, sourceName, options, callback) {
        var Config;
        var documentStr = "";
        var graphUri = null;
        var sparqlInsertStr = null;
        var sources = null;
        var Config = null;
        var sourceStatus = {};
        var sparqlServerUrl = null;
        var importUris = [];
        var importsSources = [];
        var format = null;
        var journal = "";
        var allSources = options.allSources;
        async.series(
            [
                //init connection
                function (callbackSeries) {
                    GraphStore.connection = {
                        sparqlServerUrl: options.sparql_serverUrl,
                        auth: options.auth,
                    };
                    callbackSeries();
                },

                //check if source exists if not create it
                function (callbackSeries) {
                    if (allSources[sourceName]) {
                        return callbackSeries();
                    }

                    var imports = [];
                    graphStore.insertSourceInConfig(sourceName, graphUri, connection.sparqlServerUrl, imports, function (err, result) {
                        return callbackSeries(err);
                    });
                },

                //getConfig
                function (callbackSeries) {
                    if (options.graphUri) {
                        graphUri = options.graphUri;
                    } else {
                        graphUri = "http://industryportal.enit.fr/ontologies/" + sourceName + "#";
                    }
                    configPath = path.join(__dirname, "../" + "config" + "/mainConfig.json");
                    jsonFileStorage.retrieve(path.resolve(configPath), function (err, _config) {
                        Config = _config;
                        sparqlServerUrl = options.sparqlServerUrl || Config.sparql_server.url;
                        return callbackSeries();
                    });
                },

                //get sources
                function (callbackSeries) {
                    if (options.sources) {
                        sources = options.sources;
                        return callbackSeries();
                    }
                    var sourcesPath = path.join(__dirname, "../" + "config/" + options.sourcesJsonFile);
                    jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, _sources) {
                        sources = _sources;
                        return callbackSeries();
                    });
                },

                //if (options.reload) clear graph
                function (callbackSeries) {
                    if (options.reload != "true") {
                        return callbackSeries();
                    }
                    SourceIntegrator.clearGraph(sparqlServerUrl, graphUri, function (err, result) {
                        return callbackSeries(err);
                    });
                },

                //clear graph (if exists and reload)
                /*  function (callbackSeries) {
            if (!options.clear) {
                return callbackSeries();
            }
            SourceIntegrator.clearGraph(sparqlServerUrl, graphUri, function (err, result) {
                return callback(err);
            });
        },*/

                //check if ontology already exist (with graphUri)
                function (callbackSeries) {
                    var sourcesArray = Object.keys(sources);
                    if (sourcesArray.indexOf(sourceName) > -1) {
                        sourceStatus.exists = true;
                        return callbackSeries();
                    }

                    for (var source in sources) {
                        if (sources[source].graphUri == graphUri) {
                            sourceStatus.exists = source;
                        } else {
                            sourceStatus.exists = false;
                        }
                    }
                    return callbackSeries();
                },

                //parse and write triples
                function (callbackSeries) {
                    if (sourceStatus.exists && options.reload != "true") {
                        return callbackSeries();
                    }
                    console.log("----------importing " + sourceName);
                    SourceIntegrator.ontologyUrl2tripleStore(ontologyUrl, sparqlServerUrl, graphUri, format, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        graphUri = result.graphUri;
                        sparqlInsertStr = result.sparqlInsertStr;
                        importUris = result.imports;
                        journal += "     " + result.totalTriples + "triples  imported  in graph " + graphUri + "\n";
                        return callbackSeries();
                    });
                },

                // get imports sources
                function (callbackSeries) {
                    if (!importUris || importUris.length == 0) {
                        return callbackSeries();
                    }

                    importUris.forEach(function (importUri) {
                        if (importsSourcesMap[importUri]) {
                            importsSources.push(importsSourcesMap[importUri]);
                        } else {
                            console.log(importUri);
                        }
                    });

                    return callbackSeries();
                },

                //manage Imports : create a source and create triples  if not exist for each import
                function (callbackSeries) {
                    return callbackSeries();

                    if (options.reload && options.metadata && options.metadata.imports && options.metadata.imports.length > 0) {
                        importsSources = [];
                        async.eachSeries(
                            options.metadata.imports,
                            function (importUri, callbackEach) {
                                var p = importUri.lastIndexOf("/");
                                if ((p = importUri.length - 1)) {
                                    p = importUri.substring(0, p).lastIndexOf("/");
                                }
                                if (p < 0) {
                                    journal += "wrong importUri" + importUri;
                                    return callbackEach();
                                }
                                var sourceLabel = importUri.substring(p + 1);

                                console.log("create import source " + sourceLabel + " from uri" + importUri);

                                SourceIntegrator.importSourceFromTurtle(importUri, sourceLabel, { graphUri: importUri, sources: sources }, function (err, result) {
                                    if (err) {
                                        journal += "******************error in import " + importUri + " " + result + "\n";
                                    } else {
                                        importsSources.push(sourceLabel);
                                    }

                                    return callbackEach();
                                });
                            },
                            function (err) {
                                return callbackSeries(err);
                            },
                        );
                    } else {
                        return callbackSeries();
                    }
                },

                //register source if not exists
                function (callbackSeries) {
                    if (sourceStatus.exists) {
                        return callbackSeries();
                    }

                    var id = Util.getRandomHexaId(10);
                    var newSource = {
                        name: sourceName,
                        _type: "source",
                        id: id,
                        type: "",
                        graphUri: graphUri,
                        sparql_server: {
                            url: sparqlServerUrl,
                            method: "Post",
                            headers: [],
                        },
                        editable: options.editable,
                        controller: "Sparql_OWL",
                        topClassFilter: "?topConcept rdf:type owl:Class .?topConcept rdfs:label|skos:prefLabel ?XX.",
                        schemaType: "OWL",
                        allowIndividuals: options.allowIndividuals,
                        predicates: {
                            broaderPredicate: "",
                            lang: "",
                        },
                        group: "ONTOCOMMONS",
                        imports: importsSources,
                        taxonomyPredicates: ["rdfs:subClassOf", "rdf:type"],
                    };

                    sources[sourceName] = newSource;
                    var sourcesPath = path.join(__dirname, "../" + "config/" + options.sourcesJsonFile);
                    jsonFileStorage.store(path.resolve(sourcesPath), sources, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sourceStatus.exists = true;
                        return callbackSeries();
                    });
                },
            ],

            function (err) {
                journal += "DONE";

                console.log(journal);
                return callback(err, journal);
            },
        );
    },
};

module.exports = GraphStore;
