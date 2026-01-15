import { processResponse } from '../utils.js';
import ConfigManager from '../../../../bin/configManager.js';
import GraphStore from '../../../../bin/graphStore.js';
import async2 from 'async';
import request from 'request';
import httpProxy from '../../../../bin/httpProxy.js';
import Util from '../../../../bin/util.js';
import { sourceModel } from '../../../../model/sources.js';

export default function () {
    let operations = {
        POST,
    };

    function transformToTriples(ontologyContentEncoded64, callback) {
        var jowlConfig = ConfigManager.config.jowlServer;
        if (!jowlConfig.url.endsWith("/")) {
            jowlConfig.url += "/";
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
                return callback(error);
            }
            if (!body) {
                return callback("Cannot import ontology file");
            }
            if (!Array.isArray(body)) {
                return callback(body);
            }
            var allTriples = body;
            if (allTriples.length == 0) {
                return callback("no triples generated for url " + body.rdfUrl);
            }

            callback(null, allTriples);
        });
    }

    function writeTriples(sparqlServerConnection, graphUri, allTriples, callback) {
        var slices = Util.sliceArray(allTriples, 200);
        var totalImportedTriples = -1;
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

                queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";

                var params = { query: queryGraph };

                if (ConfigManager.config) {
                    params.auth = sparqlServerConnection.auth;
                }

                const sparqlServerUrl = sparqlServerConnection.url;

                httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    totalImportedTriples += triples.length;

                    return callbackEach();
                });
            },
            function (err) {
                return callback(err, totalImportedTriples);
            },
        );
    }

    async function isUserAuthorizedToUpload(userInfo) {
        const ownedSources = await sourceModel.getOwnedSources(userInfo);
        const numberOfOwnedSources = Object.keys(ownedSources).length;

        if (userInfo.user.groups.includes("admin") && numberOfOwnedSources < userInfo.maxNumberCreatedSource && userInfo.allowSourceCreation) {
            return true;
        }
        return false;
    }

    async function POST(req, res, _next) {
        // upload from URL
        if (req.body.uploadUrl) {
            var graphUri = req.body.graphUri;
            var uploadUrl = req.body.uploadUrl;
            if (!graphUri) {
                return res.status(400).json({ error: "missing graphUri" });
            }
            if (!uploadUrl) {
                return res.status(400).json({ error: "missing uploadUrl" });
            }
            ConfigManager.getUser(req, res, function (err, userInfo) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                if (!isUserAuthorizedToUpload(userInfo)) {
                    return processResponse(res, err, { result: "not authorized" });
                }

                var sparqlServerConnection = { url: ConfigManager.config.sparql_server.url };
                if (ConfigManager.config.sparql_server.user) {
                    sparqlServerConnection.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                }
                var clearOldGraph = false;
                var graphExists = false;
                var allTriples = [];
                var totalImportedTriples = 0;
                var ontologyContentEncoded64 = null;
                async2.series(
                    [
                        // check if graphExists
                        function (callbackSeries) {
                            GraphStore.graphExists(sparqlServerConnection, graphUri, function (err, result) {
                                graphExists = result;
                                return callbackSeries(err);
                            });
                        },

                        //clear graph  if reload
                        function (callbackSeries) {
                            if (clearOldGraph !== "true") {
                                return callbackSeries();
                            }
                            if (!graphExists) {
                                return callbackSeries();
                            }

                            GraphStore.clearGraph(sparqlServerConnection, graphUri, function (err, _result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                graphExists = false;
                                return callbackSeries();
                            });
                        },
                        // get url content and encode it
                        function (callbackSeries) {
                            request(uploadUrl, {}, function (error, request, body) {
                                if (error) {
                                    return callbackSeries(error);
                                }
                                ontologyContentEncoded64 = Buffer.from(body).toString("base64");

                                callbackSeries();
                            });
                        },
                        // call jowl to transform data in triples
                        function (callbackSeries) {
                            transformToTriples(ontologyContentEncoded64, function (err, triples) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                allTriples = triples;
                                callbackSeries();
                            });
                        },

                        //writeTriples
                        function (callbackSeries) {
                            writeTriples(sparqlServerConnection, graphUri, allTriples, function (err, countTriples) {
                                totalImportedTriples = countTriples;
                                callbackSeries(err);
                            });
                        },
                    ],
                    function (err) {
                        processResponse(res, err, { result: totalImportedTriples });
                    },
                );
            });

            // upload from GRAPH
        } else if (req.files && req.files["importRDF"]) {
            var graphUri = req.body.graphUri;
            var data = "" + req.files["importRDF"].data;

            console.log("--------------1---------");

            ConfigManager.getUser(req, res, function (err, userInfo) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                console.log("--------------2---------");

                if (!isUserAuthorizedToUpload(userInfo)) {
                    return processResponse(res, err, { result: "not authorized" });
                }

                var sparqlServerConnection = { url: ConfigManager.config.sparql_server.url };
                if (ConfigManager.config.sparql_server.user) {
                    sparqlServerConnection.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                }
                var clearOldGraph = false;
                var graphExists = false;
                var allTriples = [];
                var totalImportedTriples = -1;
                var ontologyContentEncoded64 = null;
                async2.series(
                    [
                        // check if graphExists
                        function (callbackSeries) {
                            GraphStore.graphExists(sparqlServerConnection, graphUri, function (err, result) {
                                graphExists = result;
                                return callbackSeries(err);
                            });
                        },

                        //clear graph  if reload
                        function (callbackSeries) {
                            if (clearOldGraph !== "true") {
                                return callbackSeries();
                            }
                            if (!graphExists) {
                                return callbackSeries();
                            }

                            GraphStore.clearGraph(sparqlServerConnection, graphUri, function (err, _result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                graphExists = false;
                                return callbackSeries();
                            });
                        },

                        function (callbackSeries) {
                            ontologyContentEncoded64 = Buffer.from(data).toString("base64");
                            callbackSeries();
                        },

                        //get triples from jowl/jena/rdftriple
                        function (callbackSeries) {
                            if (graphExists) {
                                return callbackSeries();
                            }
                            // call jowl to transform data in triples
                            console.log("--------------4---------");
                            transformToTriples(ontologyContentEncoded64, function (err, triples) {
                                console.log("--------------5---------");
                                if (err) {
                                    return callbackSeries(err);
                                }
                                allTriples = triples;
                                callbackSeries();
                            });
                        },

                        //writeTriples
                        function (callbackSeries) {
                            if (graphExists) {
                                return callbackSeries();
                            }
                            console.log("--------------6---------");
                            writeTriples(sparqlServerConnection, graphUri, allTriples, function (err, countTriples) {
                                totalImportedTriples = countTriples;
                                console.log("--------------7---------");
                                callbackSeries(err);
                            });
                        },
                    ],
                    function (err) {
                        console.log("--------------8---------");
                        processResponse(res, err, { result: totalImportedTriples });
                    },
                );
            });
        }
    }

    POST.apiDoc = {
        summary: "Upload files",
        security: [{ restrictLoggedUser: [] }],
        operationId: "upload",
        parameters: [],
        responses: {
            200: {
                description: "Response",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            user: {
                                type: "string",
                            },
                            tool: {
                                type: "string",
                            },
                            timestamp: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
        tags: ["JOWL"],
    };

    return operations;
};
