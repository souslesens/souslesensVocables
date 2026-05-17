import { processResponse } from "../utils.js";
import ConfigManager from "../../../../bin/configManager.js";
import GraphStore from "../../../../bin/graphStore.js";

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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Export a named graph as Turtle from the configured triplestore",
        description:
            "Calls `GraphStore.exportGraph` against the main triplestore (URL + credentials taken from `mainConfig.sparql_server`) " +
            "and returns the serialised Turtle of the named graph identified by `graphUri`.",
        operationId: "graphStoreExportGraph",
        parameters: [{ name: "graphUri", in: "query", type: "string", required: true, description: "URI of the named graph to export. Example: `http://purl.obolibrary.org/obo/bfo.owl`." }],
        responses: {
            200: {
                description: "Turtle serialisation of the graph.",
                schema: { type: "string" },
            },
            500: { description: "Triplestore export failure." },
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Import an RDF file from a URL into a named graph (admin only)",
        description:
            "Admin-only. Loads the RDF file located at `sourceUrl` into the named graph `graphUri` of the configured triplestore " +
            "via `GraphStore.importGraphFromUrl`. Returns `403` if the caller is not in the `admin` group.",
        operationId: "graphStoreImportGraph",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        sourceUrl: {
                            type: "string",
                            description: "Public URL of the RDF file.",
                            example: "https://raw.githubusercontent.com/BFO-ontology/BFO-2020/refs/heads/master/21838-2/owl/bfo-core.ttl",
                        },
                        graphUri: { type: "string", description: "Target named graph URI.", example: "http://purl.obolibrary.org/obo/bfo.owl" },
                    },
                    example: {
                        sourceUrl: "https://raw.githubusercontent.com/BFO-ontology/BFO-2020/refs/heads/master/21838-2/owl/bfo-core.ttl",
                        graphUri: "http://purl.obolibrary.org/obo/bfo.owl",
                    },
                },
                "x-examples": {
                    "Import BFO TTL": {
                        sourceUrl: "https://raw.githubusercontent.com/BFO-ontology/BFO-2020/refs/heads/master/21838-2/owl/bfo-core.ttl",
                        graphUri: "http://purl.obolibrary.org/obo/bfo.owl",
                    },
                },
            },
        ],
        responses: {
            200: { description: "Import completed." },
            400: { description: "User context missing." },
            403: { description: "Caller is not an admin." },
        },
        tags: ["Graph"],
    };

    return operations;
}
