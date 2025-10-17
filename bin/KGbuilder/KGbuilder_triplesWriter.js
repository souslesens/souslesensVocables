const ConfigManager = require("../configManager.");
const httpProxy = require("../httpProxy..js");
const async = require("async");
const util = require("../util.");
const KGbuilder_socket = require("./KGbuilder_socket.js");
/**
 * KGbuilder_triplesWriter module.
 * Executes SPARQL UPDATE operations for writing and deleting RDF triples in a named graph.
 * - Batches INSERTs (handles blank nodes) and parses endpoint-returned write counts.
 * - Clears an entire graph, defaulting to the configured SPARQL server when needed.
 * - Deletes KGcreator-scoped triples optionally filtered by a specific table/mapping
 *   (via `KGbuilder_triplesMaker.mappingFilePredicate`), looping in chunks for large datasets.
 * - Provides helpers to emit PREFIX blocks and to run `DELETE DATA` on explicit triple lists.
 * Emits progress messages through `KGbuilder_socket` when a client socket id is supplied.
 * @module KGbuilder_triplesWriter
 * @see [Tutorial: Overview]{@tutorial overview}
 */

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
        var countTriples = allTriples.length;
        //  console.log("all triples count "+countTriples)
        var slices = util.sliceArray(allTriples, 500);
        //  console.log("number of slices  "+slices.length)

        // var  slices=[allTriples]

        countTriples = 0;
        async.eachSeries(
            slices,
            function (triples, callbackEach) {
                var insertTriplesStr = "";
                triples.forEach(function (triple) {
                    var str = triple + ". ";
                    insertTriplesStr += str;
                    countTriples += 1;
                });

                // console.log("triples in slice "+triples.length)
                var queryGraph = KGbuilder_triplesWriter.getSparqlPrefixesStr();

                //  graphUri=graphUri+"test/"
                //  queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
                // insert data does not work with bNodes
                queryGraph += " WITH GRAPH  <" + graphUri + "" + ">  " + "INSERT " + "  {" + insertTriplesStr + "  }";

                var params = { query: queryGraph };

                if (ConfigManager.config && ConfigManager.config.sparql_server.user) {
                    params.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                }

                var regex = /([0-9]+)/;
                httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                    if (err) {
                        var x = queryGraph;
                        return callbackEach(err);
                    }

                    var array = regex.exec(result.results.bindings[0]["callret-0"].value);

                    if (array && array.length == 2) var triplesWritten = parseInt(array[1]);

                    if (triplesWritten < triples.length - 10) var x = 3;
                    totalTriples += triplesWritten;
                    //   console.log("triples writen "+totalTriples)
                    return callbackEach(null, totalTriples);
                });
            },
            function (err) {
                return callback(err, totalTriples);
            },
        );
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
                        sparqlServerUrl = result.sparql_server.url;
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

    deleteKGBuilderTriples: function (sparqlServerUrl, graphUri, table, options, callback) {
        const TriplesMaker = require("./KGbuilder_triplesMaker");
        var query = "";
        if (table) {
            query += "with  GRAPH <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> '" + table + "'}";
        } else {
            query += "with  <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + TriplesMaker.mappingFilePredicate + "> ?table }";
        }

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

                httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                    if (err) {
                        var x = query;
                        return callbackWhilst(err);
                    }

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

                    KGbuilder_socket.message(options.clientSocketId, "" + totalSize + " triples deleted from table " + table, false);
                    return callbackWhilst(err);
                });
            },
            function (err) {
                return callback(err, totalSize);
            },
        );
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

        httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
            if (err) {
                var x = query;
                return callback(err);
            }
            totalTriples += triples.length;
            return callback(null, totalTriples);
        });
    },

    getSparqlPrefixesStr: function () {
        var str = "";
        for (var key in KGbuilder_triplesWriter.sparqlPrefixes) {
            str += "PREFIX " + key + ": " + KGbuilder_triplesWriter.sparqlPrefixes[key] + " ";
        }
        return str;
    },
};

module.exports = KGbuilder_triplesWriter;
