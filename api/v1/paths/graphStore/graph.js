import { processResponse } from '../utils.js';
import ConfigManager from '../../../../bin/configManager.js';
import GraphStore from '../../../../bin/graphStore.js';

export default function () {
    let operations = {
        GET,
        POST,
    };

    function GET(req, res, next) {
        if (ConfigManager.config) {
            var sparqlServerConnection = { url: ConfigManager.config.sparql_server.url };
            if (ConfigManager.config.sparql_server.user) {
                sparqlServerConnection.auth = {
                    user: ConfigManager.config.sparql_server.user,
                    pass: ConfigManager.config.sparql_server.password,
                    sendImmediately: false,
                };
            }

            GraphStore.exportGraph(sparqlServerConnection, req.query.graphUri, function (err, result) {
                if (err) {
                    res.status(err.status || 500).json(err);
                    next(err);
                } else {
                    return res.status(200).json(result);
                }
            });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "get turtle  from triples",
        description: "get turtle  from triples",
        operationId: "get turtle  from triples",
        parameters: [
            {
                name: "graphUri",
                description: "graph uri in SLSV graph store",
                type: "string",
                in: "query",
                required: true,
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
        tags: ["Graph"],
    };

    function POST(req, res, _next) {
        ConfigManager.getUser(req, res, function (err, userInfo) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            if (userInfo.user.groups.indexOf("admin") < 0) return res.status(403);
            if (ConfigManager.config) {
                var sparqlServerConnection = { url: ConfigManager.config.sparql_server.url };
                if (ConfigManager.config.sparql_server.user) {
                    sparqlServerConnection.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                }

                GraphStore.importGraphFromUrl(sparqlServerConnection, body.sourceUrl, body.graphUri, function (err, _result) {
                    processResponse(res, err, "DONE");
                });
            }
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Save rdf url to SLSV graph store",
        description: "Save rdf file or url to SLSV graph store",
        operationId: "Save rdf file or url to SLSV graph store",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                        },
                        graphUri: {
                            type: "string",
                        },
                    },
                },
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
        tags: ["Graph"],
    };

    return operations;
};
