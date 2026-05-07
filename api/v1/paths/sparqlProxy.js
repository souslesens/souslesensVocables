import { processResponse } from "./utils.js";
import httpProxy from "../../../bin/httpProxy.js";
import ConfigManager from "../../../bin/configManager.js";
import UserRequestFiltering from "../../../bin/userRequestFiltering.js";
import Parliament from "../../../bin/parliamentProxy.js";

export default function () {
    let operations = {
        POST,
        GET,
    };

    async function POST(req, res, next) {
        try {
            if (req.body.POST) {
                var body = JSON.parse(req.body.body);
                var query = body.params.query;
                if (false && (query.indexOf("http://purl.obolibrary.org/obo/vo.owl") > -1 || query.indexOf("http://purl.obolibrary.org/obo") > -1)) {
                    try {
                        Parliament.execPostQuery(query, function (err, result) {
                            processResponse(res, err, result);
                        });
                    } catch (e) {
                        next(e);
                    }
                    return;
                }

                if (ConfigManager.config && req.body.url.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                    if (ConfigManager.config.sparql_server.user) {
                        body.params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }
                    ConfigManager.getUser(req, res, function (err, user) {
                        ConfigManager.getUserSources(req, res, function (err, userSources) {
                            if (err) {
                                return processResponse(res, err, userSources);
                            }
                            UserRequestFiltering.filterSparqlRequest(body.params.query, userSources, user, function (parsingError, filteredQuery) {
                                if (parsingError) {
                                    return processResponse(res, parsingError, null);
                                }
                                body.params.query = filteredQuery;

                                httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                                    processResponse(res, err, result);
                                });
                            });

                            return;
                        });
                    });
                } else {
                    httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                        processResponse(res, err, result);
                    });
                }
            } else {
                var options = {};
                if (req.body.options) {
                    if (typeof req.body.options == "string") {
                        options = JSON.parse(req.body.options);
                    } else {
                        options = req.body.options;
                    }
                }
                options.host = req.headers.host;
                httpProxy.get(req.body.url, options, function (err, result) {
                    processResponse(res, err, result);
                });
            }
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }

    POST.apiDoc = {
        summary: "Proxy a SPARQL request to a remote endpoint",
        description:
            "Central SPARQL proxy used by every frontend tool (Lineage, KGquery, MappingModeler, ...). " +
            "Forwards the SPARQL query carried in `body.body.params.query` to `body.url`. " +
            "When `body.POST` is truthy, the request is sent as POST and goes through `UserRequestFiltering.filterSparqlRequest` " +
            "which read `FROM` clauses to restrict the query to graphs the current user is allowed to read. " ,
           
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        operationId: "sparqlProxyPost",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    description:
                        "Form-encoded fields. `body` is a JSON-stringified payload of shape " +
                        "`{ params: { query, useProxy, ... }, headers: {...}, user: {...} }` " +
                        "where `params.query` is the SPARQL text and `headers` carries `Accept` / `Content-Type` " +
                        "for the upstream endpoint.",
                    properties: {
                        POST: {
                            type: "string",
                            description: "Truthy string (e.g. `\"true\"`) to send as POST and apply user-graph access filtering via `UserRequestFiltering.filterSparqlRequest`. Form-encoded → arrives as string.",
                            example: "true",
                        },
                        url: {
                            type: "string",
                            description: "Target SPARQL endpoint URL.",
                            example: "http://virtuoso.local:8890/sparql",
                        },
                        body: {
                            type: "string",
                            description:
                                "JSON-stringified `{ params: { query, useProxy }, headers, user }` payload forwarded to endpoint. " +
                                "`params.query` = SPARQL query text. `headers` = HTTP headers for the upstream call. " +
                                "`user` = current session user (identifiant, login, groupes).",
                            example:
                                '{"params":{"query":"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX owl: <http://www.w3.org/2002/07/owl#> SELECT distinct ?prop ?propLabel ?propDomain ?propRange FROM <http://data.example.com/resource/ontology/business-objects/> WHERE { ?prop rdf:type ?type. FILTER (?type IN (rdf:Property, owl:AnnotationProperty, owl:DatatypeProperty)) OPTIONAL { ?prop rdfs:label|<http://www.w3.org/2004/02/skos/core#prefLabel> ?propLabel. FILTER(regex(lang(?propLabel),\'en\') || !lang(?propLabel)) } OPTIONAL { ?prop rdfs:domain ?propDomain } OPTIONAL { ?prop rdfs:range ?propRange } } LIMIT 10000","useProxy":true},"headers":{"Accept":"application/sparql-results+json","Content-Type":"application/x-www-form-urlencoded"},"user":{"identifiant":"admin","login":"admin","groupes":["admin"]}}',
                        },
                        options: {
                            type: "string",
                            description: "JSON-stringified options for GET forward (when POST=false). Holds `auth`, headers, etc.",
                            example: '{"headers":{"Accept":"application/sparql-results+json"}}',
                        },
                    },
                    example: {
                        POST: "true",
                        url: "http://virtuoso.local:8890/sparql",
                        body: '{"params":{"query":"SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10","useProxy":true},"headers":{"Accept":"application/sparql-results+json","Content-Type":"application/x-www-form-urlencoded"},"user":{"identifiant":"admin","login":"admin","groupes":["admin"]}}',
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Raw response from the remote SPARQL endpoint (typically a SPARQL JSON results document).",
                schema: { $ref: "#/definitions/SparqlQueryResponse" },
            },
            500: {
                description: "Proxy failure or upstream SPARQL error.",
                schema: { properties: { ERROR: { type: "string" } } },
            },
        },
        tags: ["Sparql"],
    };

    function GET(req, res, next) {
        var options = JSON.parse(req.query.options);

        if (ConfigManager.config && req.query.url.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            if (ConfigManager.config.sparql_server.user) {
                options.auth = {
                    user: ConfigManager.config.sparql_server.user,
                    pass: ConfigManager.config.sparql_server.password,
                    sendImmediately: false,
                };
            }
            ConfigManager.getUser(req, res, function (err, user) {
                ConfigManager.getUserSources(req, res, function (err, userSources) {
                    if (err) {
                        return processResponse(res, err, userSources);
                    }
                    UserRequestFiltering.filterSparqlRequest(req.query.url, userSources, user, function (parsingError, filteredQuery) {
                        if (parsingError) {
                            return processResponse(res, parsingError, null);
                        }
                        req.query.url = filteredQuery;

                        try {
                            httpProxy.get(req.query.url, options, function (err, result) {
                                processResponse(res, err, result);
                            });
                        } catch (e) {
                            res.status(err.status || 500).json(e);
                            next(e);
                        }
                    });
                });
            });
        }
    }

    GET.apiDoc = {
        summary: "Forward a GET request to a remote SPARQL endpoint",
        description:
            "GET variant of the SPARQL proxy: forwards `query.url` with `query.options` to the target SPARQL server. " +
            "Same access-control filtering as the POST variant when the target matches the configured main `sparql_server.url`.",
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        operationId: "sparqlProxyGet",
        parameters: [
            {
                name: "url",
                in: "query",
                required: false,
                type: "string",
                description:
                    "Target SPARQL endpoint URL (with `?format=json&query=...` already appended by callers when applicable). " +
                    "Example: `http://virtuoso.local:8890/sparql?format=json&query=SELECT%20%3Fs%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20LIMIT%2010`.",
            },
            {
                name: "options",
                in: "query",
                required: false,
                type: "string",
                description:
                    "JSON-stringified options forwarded to endpoint (headers, auth, etc.). " +
                    "Example: `{\"headers\":{\"Accept\":\"application/sparql-results+json\"}}`.",
            },
        ],
        responses: {
            200: {
                description: "Raw response from the remote SPARQL endpoint.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description:
                        "Body returned by the upstream endpoint, forwarded as-is. For SELECT queries with `Accept: application/sparql-results+json`, " +
                        "the payload follows the SPARQL 1.1 JSON Results shape `{ head: { vars: [...] }, results: { bindings: [...] } }`. " +
                        "For ASK / CONSTRUCT / DESCRIBE queries the shape depends on the endpoint and requested format.",
                },
            },
            500: { description: "Proxy failure or upstream error." },
        },
        tags: ["Sparql"],
    };

    return operations;
}
