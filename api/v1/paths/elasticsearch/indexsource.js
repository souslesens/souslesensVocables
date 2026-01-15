import path from 'path';
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
import ConfigManager from '../../../../bin/configManager.js';
import UserRequestFiltering from '../../../../bin/userRequestFiltering.js';
import { processResponse } from '../utils.js';
import { sourceModel } from '../../../../model/sources.js';
import async from 'async';

module.exports = function () {
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
        security: [{ restrictLoggedUser: [] }],
        summary: "Elasticsearch index source",
        description: "Elasticsearch index source",
        operationId: "Elasticsearch index source",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        indexName: {
                            type: "string",
                        },
                        data: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    label: { type: "string" },
                                    type: { type: "string" },
                                    parents: { type: "array", items: { type: "string" } },
                                    skosLabel: { type: "array", items: { type: "string" } },
                                },
                            },
                        },
                        options: {
                            type: "object",
                            properties: {
                                owlType: { type: "string" },
                                replaceIndex: { type: "boolean" },
                            },
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
        tags: ["ElasticSearch"],
    };

    return operations;
};
