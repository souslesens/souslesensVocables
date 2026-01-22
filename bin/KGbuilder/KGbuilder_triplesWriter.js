import ConfigManager from "../configManager.js";
import httpProxy from "../httpProxy.js";
import async from "async";
import util from "../util.js";
import KGbuilder_socket from "./KGbuilder_socket.js";
import * as modelUtils from "../../model/utils.js";
import TriplesMaker from "./triplesMaker.js";

const KGbuilder_triplesWriter = {
    sparqlPrefixes: {
        xs: "<http://www.w3.org/2001/XMLSchema#>",
        rdf: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
        rdfs: "<http://www.w3.org/2000/01/rdf-schema#>",
        owl: "<http://www.w3.org/2002/07/owl#>",
        skos: "<http://www.w3.org/2004/02/skos/core#>",
        iso14224: "<http://data.total.com/resource/tsf/iso_14224#>",
        req: "<https://w3id.org/requirement-ontology/rdl/>",
        part14: "<http://rds.posccaesar.org/ontology/lis14/rdl/>",
        iso81346: "<http://data.total.com/resource/tsf/IEC_ISO_81346/>",
        slsv: "<http://souslesens.org/resource/vocabulary/>",
        dcterms: "<http://purl.org/dc/terms/>",
    },

    /**
     * Write <triples> in <graphUri> at <sparqlServerUrl>
     *
     * @param {Array} triples - array of {s: ,p: ,o: }
     * @param {string} graphUri - URI to name the graph that will be written
     * @param {string} sparqlServerUrl - URL of the sparql endpoint where to write the graph
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    writeTriples: function (allTriples, graphUri, sparqlServerUrl, callback) {
        if (sparqlServerUrl == "_default") {
            sparqlServerUrl = ConfigManager.config.sparql_server.url;
        }

        var totalTriples = 0;

        var slices = util.sliceArray(allTriples, 200);

        async.eachSeries(
            slices,
            function (triples, callbackEach) {
                var insertTriplesStr = "";
                triples.forEach(function (triple) {
                    //   var str = triple.s + " " + triple.p + " " + triple.o + ". ";
                    var str = triple + ". ";
                    insertTriplesStr += str;
                });

                var queryGraph = KGbuilder_triplesWriter.getSparqlPrefixesStr();

                //  queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
                // insert data does not work with bNodes
                queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT " + "  {" + insertTriplesStr + "  }";

                var params = { query: queryGraph };

                if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
                    params.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                }

                httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                    if (err) {
                        var x = queryGraph;
                        return callback(err);
                    }
                    totalTriples += triples.length;
                    return callbackEach(null, totalTriples);
                });
            },
            function (err) {
                return callback(null, totalTriples);
            },
        );
    },
    writeTriplesAsync: async function (allTriples, graphUri, sparqlServerUrl, callback) {
        return new Promise((resolve, reject) => {
            KGbuilder_triplesWriter.writeTriples(allTriples, graphUri, sparqlServerUrl, function (err, writtenTriples) {
                if (err) return reject(err);

                resolve(writtenTriples);
            });
        });
    },

    /**
     * Delete graph named <graphUri> from sparql endpoint at <sparqlServerUrl>
     *
     * @param {string} graphUri - URI of the graph to delete
     * @param {string} sparqlServerUrl - URL of the sparql endpoint
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    clearGraph: function (graphUri, sparqlServerUrl, callback) {
        async.series(
            [
                function (callbackSeries) {
                    if (sparqlServerUrl) {
                        return callbackSeries();
                    }
                    ConfigManager.getGeneralConfig(function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var sparqlServerUrl = result.sparql_server.url;
                        callbackSeries();
                    });
                },
                function (_callbackSeries) {
                    var query = "clear graph   <" + graphUri + ">";
                    var params = { query: query };

                    if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
                        params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }

                    httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null);
                    });
                },
            ],
            function (err) {
                return callback(err, "graph cleared");
            },
        );
    },

    // deleteKGBuilderTriples: function (sparqlServerUrl, graphUri, table, options, callback) {
    //     const TriplesMaker = require("./triplesMaker.js");
    //     var message = {};
    //     var query = "";
    //     if (table) {
    //         query += "with  GRAPH <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> '" + table + "'}";
    //     } else {
    //         query += "with  <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> ?table }";
    //     }
    //     var tableTotalRecords;
    //     if (table) {
    //         tableTotalRecords =
    //             "SELECT (COUNT(*) AS ?count) FROM <" + graphUri + "> " +
    //             "WHERE { ?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> '" + table + "' }";
    //     } else {
    //         tableTotalRecords =
    //             "SELECT (COUNT(*) AS ?count) FROM <" + graphUri + "> " +
    //             "WHERE { ?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> ?table }";
    //     }
    //     message.tableTotalRecords=tableTotalRecords;
    //     message.operation="deleteTriples"
    //     var limit = 10000;
    //     var resultSize = 1;
    //     var totalSize = 0;

    //             async.whilst(
    //         function (callbackTest) {
    //             callbackTest(null, resultSize > 0);
    //         },

    //         function (callbackWhilst) {
    //             var queryOffest = query + " limit " + limit;
    //             var params = { query: queryOffest };
    //             if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
    //                 params.auth = {
    //                     user: ConfigManager.config.sparql_server.user,
    //                     pass: ConfigManager.config.sparql_server.password,
    //                     sendImmediately: false,
    //                 };
    //             }

    //             httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
    //                 if (err) {
    //                     var x = query;
    //                     return callbackWhilst(err);
    //                 }

    //                 //return callback(null, result.results.bindings[0]["callret-0"].value);

    //                 var result = result.results.bindings[0]["callret-0"].value;

    //                 try {
    //                     var regex = / (\d+)/;
    //                     resultSize = result.match(regex)[1];
    //                     if (resultSize) resultSize = parseInt(resultSize);
    //                 } catch (e) {
    //                     console.log(e);
    //                     resultSize = -1;
    //                 }

    //                 totalSize += resultSize;
    //                 message.totalSize=totalSize;

    //                 KGbuilder_socket.message(options.clientSocketId, message, false);
    //                 return callbackWhilst(err);
    //             });
    //         },
    //         function (err) {
    //             return callback(err, totalSize);
    //         },
    //     );
    // },

    deleteKGBuilderTriples: function (sparqlServerUrl, graphUri, table, options, callback) {
        var message = {};
        var query = "";
        if (table) {
            query += "with  GRAPH <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> '" + table + "'}";
        } else {
            query += "with  <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> ?table }";
        }

        var tableTotalRecords;
        if (table) {
            tableTotalRecords = "SELECT (COUNT (*) AS ?count) FROM <" + graphUri + "> " + "WHERE { ?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> '" + table + "' }";
        } else {
            tableTotalRecords = "SELECT (COUNT (*) AS ?count) FROM <" + graphUri + "> " + "WHERE { ?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> ?table }";
        }

        var paramsCount = { query: tableTotalRecords };
        if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
            paramsCount.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        httpProxy.post(sparqlServerUrl, null, paramsCount, function (err, countResult) {
            if (err) {
                return callback(err);
            }

            var totalRecords = 0;
            try {
                var binding = countResult.results.bindings[0];
                if (binding.count) {
                    totalRecords = parseInt(binding.count.value, 10);
                } else if (binding["callret-0"]) {
                    totalRecords = parseInt(binding["callret-0"].value, 10);
                }
            } catch (e) {
                console.log("error parsing countResult", e);
                totalRecords = 0;
            }

            message.tableTotalRecords = totalRecords;
            message.operation = "deleteTriples";

            var limit = 10000;
            var resultSize = 1;
            var totalSize = 0;

            async.whilst(
                function (callbackTest) {
                    callbackTest(null, resultSize > 0);
                },

                function (callbackWhilst) {
                    var queryOffest = query + " limit " + limit;
                    var params = { query: queryOffest };
                    if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
                        params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }

                    modelUtils.redoIfFailureCallback(
                        httpProxy.post,
                        10,
                        5,
                        null,
                        function (err, result) {
                            if (err) {
                                var x = query;
                                return callbackWhilst(err);
                            }

                            //return callback(null, result.results.bindings[0]["callret-0"].value);

                            var result = result.results.bindings[0]["callret-0"].value;

                            try {
                                var regex = / (\d+)/;
                                resultSize = result.match(regex)[1];
                                if (resultSize) resultSize = parseInt(resultSize);
                            } catch (e) {
                                console.log(e);
                                resultSize = -1;
                            }

                            totalSize += resultSize;
                            message.totalSize = totalSize;

                            KGbuilder_socket.message(options.clientSocketId, message, false);
                            return callbackWhilst(err);
                        },
                        sparqlServerUrl,
                        null,
                        params,
                    );
                },
                function (err) {
                    return callback(err, totalSize);
                },
            );
        });
    },

    deleteTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        var insertTriplesStr = "";
        var totalTriples = 0;
        triples.forEach(function (triple) {
            var str = triple.s + " " + triple.p + " " + triple.o + ". ";
            insertTriplesStr += str;
        });
        var query = KGbuilder_triplesWriter.getSparqlPrefixesStr();
        query += "DELETE DATA {  GRAPH <" + graphUri + "> {  " + insertTriplesStr + " }  } ";
        var params = { query: query };
        if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        modelUtils.redoIfFailureCallback(
            httpProxy.post,
            10,
            5,
            null,
            function (err, _result) {
                if (err) {
                    var x = query;
                    return callback(err);
                }
                totalTriples += triples.length;
                return callback(null, totalTriples);
            },
            sparqlServerUrl,
            null,
            params,
        );
    },

    getSparqlPrefixesStr: function () {
        var str = "";
        for (var key in KGbuilder_triplesWriter.sparqlPrefixes) {
            str += "PREFIX " + key + ": " + KGbuilder_triplesWriter.sparqlPrefixes[key] + " ";
        }
        return str;
    },

    formatSampleTriples: function (bindings, item) {
        var sampleTriples = [];

        var formatters = {
            Class: function () {
                bindings.forEach(function (binding) {
                    if (binding.instance && binding.p && binding.o) {
                        var subjectUri = "<" + binding.instance.value + ">";
                        var predicateUri = "<" + binding.p.value + ">";
                        var objectValue = binding.o.type === "uri" ? "<" + binding.o.value + ">" : '"' + binding.o.value + '"';
                        sampleTriples.push(subjectUri + " " + predicateUri + " " + objectValue);
                    }
                    if (binding.s && binding.p2 && binding.instance) {
                        var subjectUri = "<" + binding.s.value + ">";
                        var predicateUri = "<" + binding.p2.value + ">";
                        var objectUri = "<" + binding.instance.value + ">";
                        sampleTriples.push(subjectUri + " " + predicateUri + " " + objectUri);
                    }
                });
            },
            Relation: function () {
                bindings.forEach(function (binding) {
                    if (binding.sub && binding.obj) {
                        var subjectUri = "<" + binding.sub.value + ">";
                        var predicateUri = "<" + item.propertyUri + ">";
                        var objectUri = "<" + binding.obj.value + ">";
                        sampleTriples.push(subjectUri + " " + predicateUri + " " + objectUri);
                    }
                });
            },
            otherPredicate: function () {
                bindings.forEach(function (binding) {
                    var subjectUri = "<" + binding.s.value + ">";
                    // Si item.id ne commence pas par http, c'est un préfixe (rdfs:label) sans chevrons
                    var predicateUri = item.id.startsWith("http") ? "<" + item.id + ">" : item.id;
                    var objectUri = binding.value.value;
                    sampleTriples.push(subjectUri + " " + predicateUri + " " + objectUri);
                });
            },
        };

        var formatter = formatters[item.type] || formatters.otherPredicate;
        formatter();

        return sampleTriples;
    },

    /**
     * Generates SPARQL query patterns based on mapping type
     * @param {string} itemType - Mapping type (e.g., 'otherPredicate', 'Class', 'Relation')
     * @param {object} item - Mapping object containing necessary information
     * @param {string} graphUri - Graph URI
     * @param {number} batchSize - Batch size
     * @param {Function} callback - Node-style async Function called to process result or handle error
     */
    getDeleteQuery: function (itemType, item, graphUri, batchSize, callback) {
        var patternGenerators = {
            otherPredicate: function () {
                // For prefixed rdfs:label
                var formattedPredicate = item.id.startsWith("http") ? "<" + item.id + ">" : item.id;
                return {
                    selectVars: "?s ?value",
                    whereClause:
                        "WHERE { " +
                        "GRAPH <" +
                        graphUri +
                        "> { " +
                        "{ " +
                        "SELECT ?s ?value " +
                        "WHERE { " +
                        "?s rdf:type <" +
                        item.classUri +
                        "> . " +
                        "?s " +
                        formattedPredicate +
                        " ?value . " +
                        "} " +
                        "LIMIT " +
                        batchSize +
                        " " +
                        "} " +
                        "} " +
                        "}",
                    deleteClause: "DELETE { " + "GRAPH <" + graphUri + "> { " + "?s " + formattedPredicate + " ?value . " + "} " + "}",
                };
            },
            Class: function () {
                return {
                    selectVars: "?instance ?p ?o ?s ?p2",
                    whereClause:
                        "WHERE { " +
                        "GRAPH <" +
                        graphUri +
                        "> { " +
                        "{ " +
                        "SELECT DISTINCT ?instance " +
                        "WHERE { " +
                        "?instance rdf:type <" +
                        item.classUri +
                        "> . " +
                        "} " +
                        "LIMIT " +
                        batchSize +
                        " " +
                        "} " +
                        "{ ?instance ?p ?o . } " +
                        "UNION " +
                        "{ ?s ?p2 ?instance . } " +
                        "} " +
                        "}",
                    deleteClause: "DELETE { " + "GRAPH <" + graphUri + "> { " + "?instance ?p ?o . " + "?s ?p2 ?instance . " + "} " + "}",
                };
            },
            Relation: function () {
                return {
                    selectVars: "?sub ?obj",
                    whereClause:
                        "WHERE { " +
                        "GRAPH <" +
                        graphUri +
                        "> { " +
                        "{ " +
                        "SELECT ?sub ?obj " +
                        "WHERE { " +
                        "?sub <" +
                        item.propertyUri +
                        "> ?obj . " +
                        "?sub rdf:type <" +
                        item.startingClass +
                        "> . " +
                        "?obj rdf:type <" +
                        item.endingClass +
                        "> . " +
                        "} " +
                        "LIMIT " +
                        batchSize +
                        " " +
                        "} " +
                        "} " +
                        "}",
                    deleteClause: "DELETE { " + "GRAPH <" + graphUri + "> { " + "?sub <" + item.propertyUri + "> ?obj . " + "} " + "}",
                };
            },
        };

        var generator = patternGenerators[itemType];
        if (!generator) {
            return callback("Unsupported mapping type: " + itemType);
        }

        return callback(null, generator());
    },

    deleteSpecficMappings: function (isSample, graphUri, sparqlServerUrl, filterMappings, options, callback) {
        if (!filterMappings || filterMappings.length === 0) {
            return callback("no mappings selected");
        }

        var totalDeleted = 0;
        var sampleResults = [];

        async.eachSeries(
            filterMappings,
            function (item, callbackEach) {
                if (!item.type) {
                    return callbackEach("Missing type for mapping");
                }

                var resultSize = 1;
                var mappingTotal = 0;
                var iteration = 0;
                var batchSize = isSample ? 1000 : 10000;
                if (item.type == "Class") {
                    // limit number of items treated to each subject has all
                    // his triples treated at same time to avoid problems
                    batchSize = 100;
                }

                var message = {};
                message.operation = "deleteTriples";

                // Get total count before deletion (similar to deleteKGBuilderTriples)
                if (!isSample) {
                    KGbuilder_triplesWriter.getDeleteQuery(item.type, item, graphUri, batchSize, function (err, patterns) {
                        if (err) {
                            return callbackEach(err);
                        }

                        var countQuery = KGbuilder_triplesWriter.getSparqlPrefixesStr() + "SELECT (COUNT(*) AS ?count) " + patterns.whereClause;
                        var paramsCount = { query: countQuery };

                        if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
                            paramsCount.auth = {
                                user: ConfigManager.config.sparql_server.user,
                                pass: ConfigManager.config.sparql_server.password,
                                sendImmediately: false,
                            };
                        }

                        httpProxy.post(sparqlServerUrl, null, paramsCount, function (err, countResult) {
                            if (err) {
                                return callbackEach(err);
                            }

                            var totalRecords = 0;
                            try {
                                var binding = countResult.results.bindings[0];
                                if (binding.count) {
                                    totalRecords = parseInt(binding.count.value, 10);
                                } else if (binding["callret-0"]) {
                                    totalRecords = parseInt(binding["callret-0"].value, 10);
                                }
                            } catch (e) {
                                console.log("error parsing countResult", e);
                                totalRecords = 0;
                            }

                            message.tableTotalRecords = totalRecords;

                            // Send initial message with total records count
                            if (options && options.clientSocketId) {
                                KGbuilder_socket.message(options.clientSocketId, message, false);
                            }

                            executeWhilst();
                        });
                    });
                } else {
                    executeWhilst();
                }

                function executeWhilst() {
                    async.whilst(
                        function (callbackTest) {
                            if (isSample) {
                                callbackTest(null, iteration === 0);
                            } else {
                                callbackTest(null, resultSize > 0);
                            }
                        },
                        function (callbackWhilst) {
                            iteration++;

                            KGbuilder_triplesWriter.getDeleteQuery(item.type, item, graphUri, batchSize, function (err, patterns) {
                                if (err) {
                                    return callbackWhilst(err);
                                }

                                var query;
                                if (isSample) {
                                    query = KGbuilder_triplesWriter.getSparqlPrefixesStr() + "SELECT " + patterns.selectVars + " " + patterns.whereClause;
                                } else {
                                    query = KGbuilder_triplesWriter.getSparqlPrefixesStr() + patterns.deleteClause + " " + patterns.whereClause;
                                }

                                var params = { query: query };

                                if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
                                    params.auth = {
                                        user: ConfigManager.config.sparql_server.user,
                                        pass: ConfigManager.config.sparql_server.password,
                                        sendImmediately: false,
                                    };
                                }

                                modelUtils.redoIfFailureCallback(
                                    httpProxy.post,
                                    10,
                                    5,
                                    null,
                                    function (err, result) {
                                        if (err) {
                                            return callbackWhilst(err);
                                        }
                                        if (!result.results || !result.results.bindings) {
                                            return callbackWhilst(null, 0);
                                        }
                                        if (isSample) {
                                            var bindings = result.results.bindings;
                                            var sampleTriples = KGbuilder_triplesWriter.formatSampleTriples(bindings, item);

                                            var sampleResults = sampleTriples.concat(sampleResults);

                                            if (options && options.clientSocketId) {
                                                var identifier = item.classUri || item.propertyUri || item.type;
                                                KGbuilder_socket.message(options.clientSocketId, "Sample: " + sampleTriples.length + " triples found for " + identifier, false);
                                            }
                                        } else {
                                            var resultValue = "";
                                            if (result.results && result.results.bindings && result.results.bindings[0] && result.results.bindings[0]["callret-0"]) {
                                                resultValue = result.results.bindings[0]["callret-0"].value;
                                            }
                                            var regex = / (\d+)/;
                                            var match = resultValue.match(regex);
                                            var resultSize = match ? parseInt(match[1]) : 0;

                                            mappingTotal += resultSize;
                                            totalDeleted += resultSize;

                                            if (options && options.clientSocketId) {
                                                message.totalSize = mappingTotal;
                                                KGbuilder_socket.message(options.clientSocketId, message, false);
                                            }
                                        }

                                        return callbackWhilst();
                                    },
                                    sparqlServerUrl,
                                    null,
                                    params,
                                );
                            });
                        },
                        function (err) {
                            if (err) {
                                return callbackEach(err);
                            }
                            return callbackEach();
                        },
                    );
                }
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                var sampleResults = { sampleTriples: sampleResults, totalTriples: sampleResults.length };
                return callback(null, isSample ? sampleResults : { triplesDeleted: totalDeleted });
            },
        );
    },
};

export default KGbuilder_triplesWriter;
