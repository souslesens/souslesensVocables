import path from 'path';import dirContentAnnotator from "../../../../bin/annotator/dirContentAnnotator.js";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        dirContentAnnotator.SpacyExtract(req.body.text, req.body.types, req.body.options, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Annotate corpus",
        description: "Annotate corpus",
        operationId: "Annotate corpus",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        types: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        text: {
                            type: "string",
                        },
                        options: {
                            type: "object",
                            properties: {
                                composedWords_2: {
                                    type: "boolean",
                                },
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
                    type: "string",
                },
            },
        },
        tags: ["Annotate"],
    };

    return operations;
};
