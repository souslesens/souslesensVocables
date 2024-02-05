const path = require("path");
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
const ConfigManager = require("../../../../bin/configManager.");
const UserRequestFiltering = require("../../../../bin/userRequestFiltering.");
const { processResponse } = require("../utils");
const userManager = require("../../../../bin/user..js");

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        // to be fixed PB with PRIVATE sources
        if (ConfigManager.config && ConfigManager.config.ElasticSearch.user) {
            ConfigManager.getUserSources(req, res, function (err, userSources) {
                ConfigManager.getUser(req, res, function (err, userInfo) {
                    if (err) {
                        return res.status(400).json({ error: err });
                    }

                    UserRequestFiltering.validateElasticSearchIndices(userInfo, [req.body.indexName], userSources, "w", function (parsingError, filteredQuery) {
                        if (parsingError) {
                            return processResponse(res, parsingError, null);
                        }

                        elasticRestProxy.indexSource(req.body.indexName, req.body.data, req.body.options, function (err, result) {
                            if (err) {
                                return res.status(400).json({ error: err });
                            }
                            return res.status(200).json(result);
                        });
                    });
                });
            });
        } else {
            elasticRestProxy.indexSource(req.body.indexName, req.body.data, req.body.options, function (err, result) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                return res.status(200).json(result);
            });
        }
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
    };

    return operations;
};
