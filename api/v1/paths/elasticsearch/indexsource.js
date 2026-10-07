import path from "path";
import elasticRestProxy from "../../../../bin/elasticRestProxy.js";
import ConfigManager from "../../../../bin/configManager.js";
import UserRequestFiltering from "../../../../bin/userRequestFiltering.js";
import { processResponse } from "../utils.js";
import async from "async";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        var parsingError = null;
        var result = null;
        async.series(
            [
                // ownership included: getUserSources grants readwrite on an owned source, outside of any profile acl
                function (callbackSeries) {
                    if (!ConfigManager.config) {
                        return callbackSeries();
                    }
                    ConfigManager.getUserSources(req, res, function (_err, userSources) {
                        UserRequestFiltering.validateElasticSearchIndices(null, [req.body.indexName], userSources, "w", function (_parsingError, _filteredQuery) {
                            parsingError = _parsingError;
                            return callbackSeries();
                        });
                    });
                },

                function (callbackSeries) {
                    if (!ConfigManager.config || parsingError) {
                        return callbackSeries();
                    }
                    elasticRestProxy.indexSource(req.body.indexName, req.body.data, req.body.options, function (err, _result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        result = _result;
                        return callbackSeries();
                    });
                },
            ],

            function (err) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                if (parsingError) {
                    return processResponse(res, parsingError, null);
                }
                return res.status(200).json(result);
            },
        );
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Index ontology nodes from a source into Elasticsearch",
        description:
            "Bulk-indexes an array of ontology node descriptors into Elasticsearch under `indexName` via " +
            "`elasticRestProxy.indexSource`. The index must be in the caller's write scope, checked with " +
            "`UserRequestFiltering.validateElasticSearchIndices`. Used by the admin tool and MappingModeler to " +
            "make source content searchable. `options.replaceIndex: true` drops and recreates the index before bulk load.",
        operationId: "elasticsearchIndexSource",
        parameters: [
            {
                name: "body",
                description: "Indexing payload.",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["indexName", "data"],
                    properties: {
                        indexName: {
                            type: "string",
                            description: "Elasticsearch index name (lowercase source name). Example: `iof_core`.",
                            example: "iof_core",
                        },
                        data: {
                            type: "array",
                            description: "Ontology nodes to index.",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string", description: "Node URI.", example: "http://www.industrialontologies.org/core/Asset" },
                                    label: { type: "string", example: "Asset" },
                                    type: { type: "string", description: "OWL type (e.g. `owl:Class`, `owl:ObjectProperty`).", example: "owl:Class" },
                                    parents: { type: "array", items: { type: "string" }, description: "Parent URIs.", example: [] },
                                    skosLabel: { type: "array", items: { type: "string" }, description: "SKOS alt-labels.", example: [] },
                                },
                            },
                            example: [{ id: "http://www.industrialontologies.org/core/Asset", label: "Asset", type: "owl:Class", parents: [], skosLabel: [] }],
                        },
                        options: {
                            type: "object",
                            properties: {
                                owlType: { type: "string", description: "OWL schema type filter applied during indexing.", example: "owl:Class" },
                                replaceIndex: {
                                    type: "boolean",
                                    description: "When `true`, deletes the existing index before bulk load. With an empty `data`, only recreates the index, empty.",
                                    example: false,
                                },
                            },
                            example: { owlType: "owl:Class", replaceIndex: false },
                        },
                    },
                    example: {
                        indexName: "iof_core",
                        data: [{ id: "http://www.industrialontologies.org/core/Asset", label: "Asset", type: "owl:Class", parents: [], skosLabel: [] }],
                        options: { replaceIndex: false },
                    },
                },
            },
        ],

        responses: {
            200: {
                description: "Indexing completed successfully.",
                schema: {
                    type: "string",
                    description: "Confirmation string returned by `elasticRestProxy.indexSource`.",
                    example: "done",
                },
            },
            400: { description: "Elasticsearch rejected the indexing request." },
            500: { description: "Caller has no write access to the target index, sent by `processResponse` as `{ ERROR }`." },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
}
