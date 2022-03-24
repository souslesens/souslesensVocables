const path = require("path");
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        elasticRestProxy.analyzeSentence(req.body.analyzeSentence, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Elasticsearch analyse sentence",
        description: "Elasticsearch analyse sentence",
        operationId: "Elasticsearch analyse sentence",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        analyzeSentence: {
                            type: "string",
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
