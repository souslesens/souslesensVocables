const { processResponse } = require("../utils");
const SourceIntegrator = require("../../../../bin/sourceIntegrator.");
const ConfigManager = require("../../../../bin/configManager.");
const GraphStore = require("../../../../bin/graphStore.");
const async2 = require("async");
const request = require("request");
const httpProxy = require("../../../../bin/httpProxy.");
const Util = require("../../../../bin/util.");

module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        const body = req.body.body;
        var jowlConfig = ConfigManager.config.jowlServer;
        ConfigManager.getUser(req, res, function (err, userInfo) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            if (userInfo.user.groups.indexOf("admin") < 0) {
                return res.status(403);
            }
            var sparqlServerConnection = { url: ConfigManager.config.sparql_server.url };
            if (ConfigManager.config.sparql_server.user) {
                sparqlServerConnection.auth = {
                    user: ConfigManager.config.sparql_server.user,
                    pass: ConfigManager.config.sparql_server.password,
                    sendImmediately: false,
                };
            }

            var graphExists = false;
            var allTriples = [];
            var totalImportedTriples = -1;
            var ontologyContentEncoded64 = null;
            async2.series(
                [
                    // check if source name
                    function (callbackSeries) {
                        GraphStore.insertSourceInConfig(body.sourceName, body.graphUri, ConfigManager.config.sparql_server.url, body.options, function (err, result) {
                            return callbackSeries(err);
                        });
                    },

                    // check if graphExists
                    function (callbackSeries) {
                        GraphStore.graphExists(sparqlServerConnection, body.graphUri, function (err, result) {
                            graphExists = result;
                            return callbackSeries(err);
                        });
                    },

                    //clear graph  if reload
                    function (callbackSeries) {
                        if (body.options.reload !== "true") {
                            return callbackSeries();
                        }
                        if (!graphExists) {
                            return callbackSeries();
                        }

                        GraphStore.clearGraph(sparqlServerConnection, body.graphUri, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }

                            graphExists = false;
                            return callbackSeries();
                        });
                    },

                    function (callbackSeries) {
                        request(body.rdfUrl, {}, function (error, request, body) {
                            if (error) return callbackSeries();
                            ontologyContentEncoded64 = Buffer.from(body).toString("base64");

                            callbackSeries();
                        });
                    },

                    //get triples from jowl/jena/rdftriple
                    function (callbackSeries) {
                        if (graphExists) {
                            return callbackSeries();
                        }

                        var payload = {
                            ontologyContentEncoded64: ontologyContentEncoded64,
                        };

                        var options = {
                            method: "POST",
                            json: payload,
                            headers: {
                                "content-type": "application/json",
                            },
                            url: jowlConfig.url + "jena/rdftriple",
                        };
                        request(options, function (error, response, body) {
                            if (error) {
                                return callbackSeries(error);
                            }
                            if (!body) {
                                return callbackSeries("Cannot import ontology file");
                            }
                            if (!Array.isArray(body)) {
                                return callbackSeries(body);
                            }
                            allTriples = body;
                            if (allTriples.length == 0) {
                                return callbackSeries("no triples generated for url " + body.rdfUrl);
                            }
                            callbackSeries();
                        });
                    },

                    //writeTriples
                    function (callbackSeries) {
                        if (graphExists) {
                            return callbackSeries();
                        }

                        var slices = Util.sliceArray(allTriples, 200);
                        totalImportedTriples = -1;
                        async2.eachSeries(
                            slices,
                            function (triples, callbackEach) {
                                var insertTriplesStr = "";

                                triples.forEach(function (triple) {
                                    var p = triple.object.indexOf("@");
                                    if (p > -1) {
                                        triple.object = triple.object.replace(/(.*)(@[a-z]{2})'/, function (a, b, c) {
                                            return b + "'" + c;
                                        });
                                    }
                                    var str = triple.subject + " " + triple.predicate + " " + triple.object + ". ";
                                    insertTriplesStr += str;
                                });

                                var queryGraph = ""; //KGtripleBuilder.getSparqlPrefixesStr();

                                queryGraph += " WITH GRAPH  <" + body.graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
                                // console.log(query)

                                //  queryGraph=Buffer.from(queryGraph, 'utf-8').toString();

                                var params = { query: queryGraph };

                                if (ConfigManager.config) {
                                    params.auth = sparqlServerConnection.auth;
                                }

                                sparqlServerUrl = sparqlServerConnection.url;

                                httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                                    if (err) {
                                        var x = queryGraph;
                                        return callbackEach(err);
                                    }
                                    totalImportedTriples += triples.length;

                                    return callbackEach();
                                });
                            },
                            function (err) {
                                return callbackSeries(err);
                            },
                        );
                    },
                ],
                function (err) {
                    processResponse(res, err, { result: totalImportedTriples });
                },
            );
        });
    }

    POST.apiDoc = {
        summary: "Access to Graph Store",
        security: [{ restrictLoggedUser: [] }],
        operationId: "GraphStore",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        sourceUrl: {
                            type: "string",
                        },
                        sourceName: {
                            type: "string",
                        },
                        graphUri: {
                            type: "string",
                        },
                        options: {
                            type: "object",
                        },
                    },
                },
            },
        ],
        responses: {
            default: {
                description: "Response…",
            },
        },
    };

    return operations;
};
