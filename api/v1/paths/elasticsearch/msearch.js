import path from "path";
import elasticRestProxy from "../../../../bin/elasticRestProxy.js";
import ConfigManager from "../../../../bin/configManager.js";
import UserRequestFiltering from "../../../../bin/userRequestFiltering.js";
import { processResponse } from "../utils.js";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        if (ConfigManager.config) {
            ConfigManager.getUserSources(req, res, function (err, userSources) {
                if (err) {
                    return res.status(400).json({ error: "error 1 " + err });
                }

                UserRequestFiltering.validateElasticSearchIndices(null, req.body.indexes, userSources, "r", function (parsingError, _filteredQuery) {
                    if (parsingError) {
                        console.log("validateElasticSearchIndicesError");
                        return processResponse(res, "error 2 " + parsingError, null);
                    }
                    console.log("validateElasticSearchIndicesOK");
                    elasticRestProxy.executeMsearch(req.body.ndjson, function (err, result) {
                        if (err) {
                            return res.status(400).json({ error: "error 3 " + err });
                        }
                        return res.status(200).json(result);
                    });
                });
            });
        } else {
            elasticRestProxy.executeMsearch(req.body.ndjson, function (err, result) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                return res.status(200).json(result);
            });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Execute a multi-search (msearch) request via Elasticsearch",
        description:
            "Forwards an NDJSON-encoded multi-search payload to the Elasticsearch `/_msearch` endpoint via " +
            "`elasticRestProxy.executeMsearch`. When `ConfigManager.config` is loaded, `indexes` are first " +
            "validated against the caller's accessible sources (read scope). Returns the raw `responses` array " +
            "from the Elasticsearch msearch result — one entry per query header in the NDJSON.",
        operationId: "elasticsearchMsearch",
        parameters: [
            {
                name: "body",
                description: "Multi-search payload.",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["ndjson", "indexes"],
                    properties: {
                        ndjson: {
                            type: "string",
                            description: "Newline-delimited JSON for Elasticsearch `/_msearch`: alternating header lines " + '(`{"index":"<name>"}`) and query body lines.',
                            example: '{"index":"iof_core"}\n{"query":{"match":{"label":"asset"}},"size":5}\n',
                        },
                        indexes: {
                            type: "array",
                            items: { type: "string" },
                            description: "Index names used for access-control validation.",
                            example: ["iof_core"],
                        },
                    },
                    example: {
                        indexes: ["iof_core"],
                        ndjson: '{"index":"iof_core"}\n{"query":{"match":{"label":"asset"}},"size":5}\n',
                    },
                },
            },
        ],

        responses: {
            200: {
                description: "Elasticsearch `responses` array — one entry per query in the NDJSON, each shaped as a " + "standard Elasticsearch search response (`{ hits, took, timed_out, ... }`).",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: true,
                        description: "Single msearch response entry from Elasticsearch.",
                    },
                    example: [
                        {
                            took: 3,
                            timed_out: false,
                            hits: { total: { value: 1, relation: "eq" }, hits: [{ _index: "iof_core", _id: "abc", _source: { label: "Asset" } }] },
                        },
                    ],
                },
            },
            400: { description: "Elasticsearch rejected the request or access-control validation failed." },
            403: { description: "Caller has no read access to one of the requested `indexes`." },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
}
