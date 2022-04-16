const path = require("path");
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        elasticRestProxy.executePostQuery(req.body.url, req.body.query, req.body.indexes, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
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
    };

    return operations;
};
