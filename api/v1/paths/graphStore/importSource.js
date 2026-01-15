import { processResponse } from '../utils.js';
import ConfigManager from '../../../../bin/configManager.js';
import GraphStore from '../../../../bin/graphStore.js';
import async2 from 'async';

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const body = req.body.body;

        ConfigManager.getUser(req, res, function (err, userInfo) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            if (userInfo.user.groups.indexOf("admin") < 0) {
                return res.status(403);
            }

            if (ConfigManager.config) {
                var sparqlServerConnection = { url: ConfigManager.config.sparql_server.url };
                if (ConfigManager.config.sparql_server.user) {
                    sparqlServerConnection.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                }
                var graphExists = false;
                async2.series(
                    [
                        // check if source name
                        function (callbackSeries) {
                            GraphStore.insertSourceInConfig(body.sourceName, body.graphUri, ConfigManager.config.sparql_server.url, body.options, function (err, _result) {
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
                                if (err) return callbackSeries(err);

                                graphExists = false;
                                return callbackSeries();
                            });
                        },
                        //import data into tripleStore
                        function (callbackSeries) {
                            if (graphExists) {
                                return callbackSeries();
                            }

                            GraphStore.importGraphFromUrl(sparqlServerConnection, body.rdfUrl, body.graphUri, function (err, result) {
                                return callbackSeries();
                            });
                        },
                    ],
                    function (err) {
                        processResponse(res, err, "DONE");
                    },
                );
            } else {
                return res.status(403);
            }
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
        tags: ["Graph"],
    };

    return operations;
};
