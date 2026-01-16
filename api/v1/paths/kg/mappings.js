import path from 'path';import kGcontroller from "../../../../bin/KG/KGcontroller.js";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        kGcontroller.saveMappings(req.body.source, req.body.mappings, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Save a KG Mapping",
        description: "Save a KG Mapping",
        operationId: "Save a KG Mapping",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        source: {
                            type: "string",
                        },
                        mappings: {
                            type: "object",
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
        tags: ["KG"],
    };

    return operations;
};
