import path from 'path';
const annotatorLive = require(path.resolve("bin/annotatorLive.js"));

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res) {
        annotatorLive.annotate(req.body.text, req.body.sources, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Annotate",
        description: "Annotate",
        operationId: "Annotate",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        sources: {
                            type: "array",
                            items: {
                                $ref: "#/definitions/Source",
                            },
                        },
                        text: {
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
                    properties: {
                        entities: {
                            type: "object",
                        },
                        missingNouns: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
        tags: ["Annotate"],
    };

    return operations;
};
