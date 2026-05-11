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
        elasticRestProxy.indexDocuments(req.body.rootDir, req.body.indexName, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
        return;

        async function isIndexPrivate(userInfo, indexName, callback) {
            const sources = await sourceModel.getAllSources();

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
                function (callbackSeries) {
                    ConfigManager.getUser(req, res, function (err, _userInfo) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        userInfo = _userInfo;
                        callbackSeries();
                    });
                },
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
                function (callbackSeries) {
                    if (!ConfigManager.config) {
                        return callbackSeries();
                    } else {
                        ConfigManager.getUserSources(req, res, function (err, userSources) {
                            UserRequestFiltering.validateElasticSearchIndices(null, [req.body.indexName], userSources, "w", function (_parsingError, _filteredQuery) {
                                if (_parsingError) {
                                    parsingError = _parsingError;
                                    return callbackSeries();
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
        summary: "Index files from a server directory into Elasticsearch",
        description:
            "Recursively walks `rootDir` on the server filesystem, filters by accepted extensions " +
            "(doc, docx, pdf, xls, xlsx, ppt, pptx, odt, ods, html, txt, csv) and maximum file size, " +
            "then indexes each file into `indexName` via the Elasticsearch attachment pipeline " +
            "(`/_doc/{id}?pipeline=pdf_attachment`). Returns the raw Elasticsearch response for the last " +
            "indexed document. Binary formats (PDF, Office) are base64-encoded before indexing.",
        operationId: "elasticsearchIndexDocuments",
        parameters: [
            {
                name: "body",
                description: "Indexing payload.",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["indexName", "rootDir"],
                    properties: {
                        indexName: {
                            type: "string",
                            description: "Elasticsearch index name (must have the attachment ingest pipeline configured). Example: `docs_iof`.",
                            example: "docs_iof",
                        },
                        rootDir: {
                            type: "string",
                            description: "Absolute server-side path of the directory to crawl recursively.",
                            example: "/app/data/documents/iof",
                        },
                    },
                    example: { indexName: "docs_iof", rootDir: "/app/data/documents/iof" },
                },
            },
        ],

        responses: {
            200: {
                description:
                    "Raw Elasticsearch `/_doc` response for the last indexed file. Shape depends on Elasticsearch " +
                    "version and pipeline — typically `{ _index, _id, _version, result, _shards, ... }`.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description: "Elasticsearch document-index response passthrough for the last processed file.",
                    example: {
                        _index: "docs_iof",
                        _id: "report_2024.pdf",
                        _version: 1,
                        result: "created",
                        _shards: { total: 2, successful: 1, failed: 0 },
                    },
                },
            },
            400: { description: "Directory not found or Elasticsearch pipeline error." },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
}
