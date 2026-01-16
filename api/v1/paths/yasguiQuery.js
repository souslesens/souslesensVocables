import { processResponse, responseSchema } from "./utils.js";
import httpProxy from "../../../bin/httpProxy.js";
import ConfigManager from "../../../bin/configManager.js";
import UserRequestFiltering from "../../../bin/userRequestFiltering.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            let query = req.body.query || req.body.update;
            const headers = {};
            if (req.query.graphUri) {
                query = query.replace(/where/gi, "from <" + req.query.graphUri + "> WHERE ");
            }

            if (req.query.method == "POST") {
                headers["Accept"] = "application/sparql-results+json";
                headers["Content-Type"] = "application/x-www-form-urlencoded";

                var params = { query: query };
                if (ConfigManager.config && req.query.url.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                    params.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                    ConfigManager.getUser(req, res, function (err, user) {
                        ConfigManager.getUserSources(req, res, function (err, userSources) {
                            if (err) {
                                return processResponse(res, err, userSources);
                            }

                            UserRequestFiltering.filterSparqlRequest(query, userSources, user, function (parsingError, _filteredQuery) {
                                if (parsingError) {
                                    return processResponse(res, parsingError, null);
                                }
                                httpProxy.post(req.query.url, headers, params, function (err, result) {
                                    processResponse(res, err, result);
                                });
                            });
                        });
                    });
                }
            } else if (req.query.method == "GET") {
                headers["Accept"] = "application/sparql-results+json";
                headers["Content-Type"] = "application/x-www-form-urlencoded";

                var query2 = encodeURIComponent(query);
                query2 = query2.replace(/%2B/g, "+").trim();
                var url = req.query.url + "?format=json&query=" + query2;
                httpProxy.get(url, headers, function (err, result) {
                    if (result && typeof result === "string") {
                        result = JSON.parse(result.trim());
                    }
                    processResponse(res, err, result);
                });
            }
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }

    POST.apiDoc = {
        summary: "Send a SPARQL query to a different domain",
        security: [{ restrictLoggedUser: [] }],
        operationId: "sparqlQuery",
        parameters: [
            {
                in: "query",
                name: "url",
                type: "string",
            },
            {
                in: "query",
                name: "graphUri",
                type: "string",
            },
            {
                in: "query",
                name: "method",
                type: "string",
            },
            {
                in: "query",
                name: "t",
                type: "integer",
            },
            {
                in: "body",
                name: "query",
                schema: {
                    type: "object",
                    properties: {
                        query: {
                            description: "SPARQL query to send to the server",
                            type: "string",
                        },
                    },
                    //required: ["query"],
                },
            },
        ],
        responses: responseSchema("SparqlQueryResponse", "POST"),
        tags: ["Sparql"],
    };

    return operations;
}
