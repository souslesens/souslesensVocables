const path = require("path");
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
const ConfigManager = require("../../../../bin/configManager.");
const UserRequestFiltering = require("../../../../bin/userRequestFiltering.");
const { processResponse } = require("../utils");

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        if (ConfigManager.config) {
            ConfigManager.getUserSources(req, res, function (err, userSources) {
                UserRequestFiltering.validateElasticSearchIndices(null, req.body.indexes, userSources, "r", function (parsingError, _filteredQuery) {
                    if (parsingError) {
                        return processResponse(res, parsingError, null);
                    }

                    elasticRestProxy.executePostQuery(req.body.url, req.body.query, req.body.indexes, function (err, result) {
                        if (err) {
                            res.status(err.status || 500).json(err);
                            next(err);
                        } else {
                            return res.status(200).json(result);
                        }
                    });
                });
            });
        } else {
            elasticRestProxy.executePostQuery(req.body.url, req.body.query, req.body.indexes, function (err, result) {
                if (err) {
                    res.status(err.status || 500).json(err);
                    next(err);
                } else {
                    return res.status(200).json(result);
                }
            });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Elasticsearch query",
        description: "Elasticsearch query",
        operationId: "Elasticsearch query",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "object",
                        },
                        url: {
                            type: "string",
                        },
                        indexes: {
                            type: "array",
                            items: {
                                type: "string",
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
