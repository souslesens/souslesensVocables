const path = require("path");

const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        elasticRestProxy.listIndexes(function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Get ElasticSearch indices",
        description: "Get ElasticSearch indices",
        operationId: "Get ElasticSearch indices",
        parameters: [],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
            },
        },
    };

    return operations;
};
