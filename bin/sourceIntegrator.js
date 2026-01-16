import async from "async";
import httpProxy from "./httpProxy.js";
import path from "path";
import jsonFileStorage from "./jsonFileStorage.js";
import request from "request";
import Util from "./util.js";
import ConfigManager from "./configManager.js";
import { exec } from "child_process";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var SourceIntegrator = {
    creatTriplesFromUrl: function (ontologyUrl, callback) {
        " curl " + "--digest" + " --user dba:dba" + " --verbose" + ' --url "http://example.com/sparql-graph-crud-auth?graph-uri=urn:graph:update:test:put" ' + "/ -T books.ttl";

        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }
    },
    jenaParse: function (filePath, options, callback) {
        var jenaPath = path.join(__dirname, "../java/jena/");
        var cmd;
        if (process.platform === "win32") {
            // my dev env
            cmd = "D: && cd " + jenaPath + ' && java -cp "./lib/*"  RDF2triples.java ' + '"' + filePath + '"';
        } else {
            cmd = "D: | cd " + jenaPath + ' | && java -cp "./lib/*"  RDF2triples.java ' + '"' + filePath + '"';
        }

        console.log("EXECUTING " + cmd);
        exec(cmd, { maxBuffer: 1024 * 30000 }, function (err, stdout, stderr) {
            if (err) {
                console.log(stderr);
                return callback(err);
            }

            // return callback(null, stdout);

            //    console.log(stdout);

            var triples = [];
            try {
                var json = JSON.parse(stdout);
            } catch (e) {
                console.log(stdout);
                var x = stdout;
                return callback(e);
            }

            json.forEach(function (line, index) {
                triples.push({
                    subject: line[0],
                    predicate: line[1],
                    object: line[2],
                });
            });

            if (options.extractUriRoots) {
                var uriRoots = SourceIntegrator.extractDistinctUriRoots(triples);
            }
            callback(null, { triples: triples, uriRoots: uriRoots });
        });
    },

    insertTriples: function (sparqlServerUrl, graphUri, triples, callback) {
        triples = triples.replace(/_:([^\s.]+)\s/g, function (a, b) {
            return "<" + b + ">";
        });
        triples = triples.replace(/\n/g, "");
        triples = triples.replace(/\\"/g, "");
        var strInsert = "with <" + graphUri + "> insert data{" + triples + "}";

        var headers = {};
        headers["Accept"] = "application/sparql-results+json";
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        var sparqlUrl = sparqlServerUrl + "?query=";

        var options = {
            query: strInsert,
        };

        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            options.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        httpProxy.post(sparqlUrl, headers, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback();
        });
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
            if (!triple.subject) return;
            var root = getUriRoot(triple.subject);
            if (root && distinctUriRoots.indexOf(root) < 0) {
                distinctUriRoots.push(root);
            }
        });
        return distinctUriRoots;
    },

    clearGraph: function (sparqlServerUrl, graphUri, callback) {
        var strClear = "CLEAR GRAPH <" + graphUri + "> ";

        var headers = {};
        headers["Accept"] = "application/sparql-results+json";
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        var sparqlUrl = sparqlServerUrl + "?query=";

        var options = { query: strClear };
        if (ConfigManager.config && sparqlUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            options.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        httpProxy.post(sparqlUrl, headers, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback();
        });
    },

    ontologyUrl2tripleStore: function (url, sparqlServerUrl, graphUri, format, options, callback) {
        var totalTriples = 0;
        var fechSize = 200;
        var fetchCount = 0;

        var tripleSlices = [];
        var tripleSlice = "";
        var imports = [];

        var uriRoots = [];

        function writeTriples(triplesArray) {
            if (!sparqlServerUrl) {
                return callback(null, { graphUri: graphUri, imports: imports, totalTriples: totalTriples });
            }

            totalTriples = triplesArray.length;
            if (totalTriples == 0) callback("no triples to import");

            triplesArray.forEach(function (item, index) {
                if (fetchCount++ < fechSize) {
                    tripleSlice += item.subject + " " + item.predicate + " " + item.object + ".\n";
                } else {
                    tripleSlices.push("" + tripleSlice);
                    tripleSlice = "";
                    fetchCount = 0;
                }
            });
            tripleSlices.push("" + tripleSlice);

            async.eachSeries(
                tripleSlices,
                function (triples, callbackEach) {
                    SourceIntegrator.insertTriples(sparqlServerUrl, graphUri, triples, function (err, result) {
                        return callbackEach(err);
                    });
                },
                function (err) {
                    return callback(err, { graphUri: graphUri, imports: imports, totalTriples: totalTriples });
                },
            );
        }

        function parseImports(quad) {
            if (quad.predicate.value.indexOf("owl#imports") > -1) {
                imports.push(quad.object.value);
            }

            for (var pattern in topOntologyPatternsMap) {
                var p = quad.predicate.value.indexOf(pattern);
                if (p > -1) {
                    if (imports.indexOf(topOntologyPatternsMap[pattern]) < 0) {
                        imports.push(topOntologyPatternsMap[pattern]);
                    }
                }

                if (quad.object.value.indexOf("http") == 0) {
                    var p = quad.object.value.indexOf(pattern);
                    if (p > -1) {
                        if (imports.indexOf(topOntologyPatternsMap[pattern]) < 0) {
                            imports.push(topOntologyPatternsMap[pattern]);
                        }
                    }
                }
            }
        }

        SourceIntegrator.jenaParse(url, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            uriRoots = result.uriRoots;
            writeTriples(result.triples);
        });
    },

    importSourceFromTurtle: function (ontologyUrl, sourceName, options, callback) {
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
        async.series(
            [
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
    getOntologyFormat: function (ontologyUrl, callback) {
        request(ontologyUrl, function (error, response, body) {
            if (error) {
                return callback(err);
            }
            if (body.indexOf("<?xml") == 0) {
                format = "rdf";
            } else {
                format = "ttl";
            }

            return callback(null, format);
        });
    },

    listPortalOntologies: function (apiKey, callback) {
        var url = "http://data.industryportal.enit.fr/ontologies?apikey=" + apiKey;
        request(url, function (error, response, body) {
            if (error) {
                return callback(error);
            }
            var jsonArray = JSON.parse(body);
            var ontologiesMap = {};

            jsonArray.forEach(function (item) {
                ontologiesMap[item.acronym] = {};
            });
            var x = ontologiesMap;
            return callback(null, ontologiesMap);
        });
    },
    getOntologyRootUris: function (ontologyUrl, options, callback) {
        SourceIntegrator.jenaParse(ontologyUrl, { extractUriRoots: 1 }, function (err, result) {
            if (err) return callback(err);
            result.triplesCount = result.triples.length;
            result.triples = [];
            callback(err, result);
        });
    },
};
export default SourceIntegrator;
if (false) {
    SourceIntegrator.jenaParse("https://rds.posccaesar.org/ontology/plm/ont/equipment/0.9.0/plm-equipment.rdf", { extractUriRoots: 1 }, function (err, result) {});
}
