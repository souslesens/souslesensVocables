import path from "path";
import elasticRestProxy from "../../../../bin/elasticRestProxy.js";
import ConfigManager from "../../../../bin/configManager.js";
import UserRequestFiltering from "../../../../bin/userRequestFiltering.js";
import { processResponse } from "../utils.js";
import { sourceModel } from "../../../../model/sources.js";
import async from "async";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        async function isIndexPrivate(userInfo, indexName, callback) {
            const sources = await sourceModel.getAllSources();

            // ajout provisoire CF
            if (indexName.startsWith("whiteboard_")) {
                return callback(null, true);
            }
            var sourceObj = null;
            for (var key in sources) {
                if (indexName == key.toLowerCase()) {
                    sourceObj = sources[key];
                }
            }
            if (!sourceObj) {
                return callback("source not exists ");
            }
            callback(null, userInfo.user.login == sourceObj.owner);
        }

        var parsingError = null;
        var result = null;
        var userInfo = null;
        async.series(
            [
                //get UserInfo
                function (callbackSeries) {
                    ConfigManager.getUser(req, res, function (err, _userInfo) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        userInfo = _userInfo;
                        callbackSeries();
                    });
                },
                // is source private
                function (callbackSeries) {
                    isIndexPrivate(userInfo, req.body.indexName, function (err, isPrivate) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        if (isPrivate) {
                            elasticRestProxy.indexSource(req.body.indexName, req.body.data, req.body.options, function (err, _result) {
                                callbackSeries(err);
                            });
                        } else {
                            callbackSeries();
                        }
                    });
                },
                //normal source and ConfigManager
                function (callbackSeries) {
                    if (!ConfigManager.config) {
                        return callbackSeries();
                    } else {
                        ConfigManager.getUserSources(req, res, function (err, userSources) {
                            UserRequestFiltering.validateElasticSearchIndices(null, [req.body.indexName], userSources, "w", function (_parsingError, _filteredQuery) {
                                if (_parsingError) {
                                    parsingError = _parsingError;
                                    return callbackSeries();
                                    // return processResponse(res, parsingError, null);
                                }

                                elasticRestProxy.indexSource(req.body.indexName, req.body.data, req.body.options, function (err, _result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    result = _result;
                                });
                            });
                        });
                    }
                },

                function (callbackSeries) {
                    if (!ConfigManager.config) {
                        return callbackSeries();
                    } else {
                        elasticRestProxy.indexSource(req.body.indexName, req.body.data, req.body.options, function (err, result) {
                            if (err) {
                                return res.status(400).json({ error: err });
                            }
                            return res.status(200).json(result);
                        });
                    }
                },
            ],

            function (err) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                if (parsingError) {
                    return processResponse(res, parsingError, null);
                }
                if (result) {
                    return res.status(200).json(result);
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
            "`elasticRestProxy.indexSource`. Before indexing, checks whether the index belongs to a private source " +
            "(owner-only) or a shared source (validated against the caller's write-scope via " +
            "`UserRequestFiltering.validateElasticSearchIndices`). Used by the admin tool and MappingModeler to " +
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
                                replaceIndex: { type: "boolean", description: "When `true`, deletes the existing index before bulk load.", example: false },
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
            403: { description: "Caller has no write access to the target index." },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
}
