import { processResponse } from "../utils.js";
import ConfigManager from "../../../../bin/configManager.js";
import GraphStore from "../../../../bin/graphStore.js";
import async2 from "async";

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
        summary: "Register a new source and import its graph (admin only)",
        description:
            "Admin-only orchestration: " +
            "(1) inserts a `sourceName → graphUri` entry in the source registry via `GraphStore.insertSourceInConfig`, " +
            "(2) checks if the graph already exists, " +
            "(3) optionally clears it when `options.reload === \"true\"`, " +
            "(4) loads triples from `rdfUrl` via `GraphStore.importGraphFromUrl`. " +
            "Skips reload if the graph already exists and `options.reload` is not `true`.",
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        operationId: "graphStoreImportSource",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        sourceName: { type: "string", description: "New source key (must not collide with an existing source).", example: "IOF_core" },
                        graphUri: { type: "string", description: "Named graph URI to fill.", example: "https://www.industrialontologies.org/core/" },
                        rdfUrl: { type: "string", description: "Public RDF file URL to import.", example: "https://raw.githubusercontent.com/iofoundry/ontology/refs/heads/master/core/Core.rdf" },
                        options: {
                            type: "object",
                            properties: {
                                reload: { type: "string", description: "Set to the string `\"true\"` to drop the graph before re-loading.", example: "false" },
                            },
                            example: { reload: "false" },
                        },
                    },
                    example: {
                        sourceName: "IOF_core",
                        graphUri: "https://www.industrialontologies.org/core/",
                        rdfUrl: "https://raw.githubusercontent.com/iofoundry/ontology/refs/heads/master/core/Core.rdf",
                        options: { reload: "false" },
                    },
                },
                "x-examples": {
                    "Initial import of IOF_core": {
                        sourceName: "IOF_core",
                        graphUri: "https://www.industrialontologies.org/core/",
                        rdfUrl: "https://raw.githubusercontent.com/iofoundry/ontology/refs/heads/master/core/Core.rdf",
                        options: { reload: "false" },
                    },
                },
            },
        ],
        responses: {
            200: { description: "Done.", schema: { properties: { result: { type: "string", example: "DONE" } } } },
            400: { description: "User context missing." },
            403: { description: "Caller is not an admin." },
        },
        tags: ["Graph"],
    };

    return operations;
}
