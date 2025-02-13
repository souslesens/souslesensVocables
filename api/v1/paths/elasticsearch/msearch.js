const path = require("path");
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
const ConfigManager = require("../../../../bin/configManager.");
const UserRequestFiltering = require("../../../../bin/userRequestFiltering.");
const { processResponse } = require("../utils");

module.exports = function () {
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
        security: [{ restrictLoggedUser: [] }],
        summary: "Elasticsearch msearch",
        description: "Elasticsearch msearch",
        operationId: "Elasticsearch msearch",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        ndjson: {
                            type: "string",
                        },
                        indexes: {
                            type: "array",
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
