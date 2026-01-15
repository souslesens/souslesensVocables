import path from 'path';
const dirContentAnnotator = require(path.resolve("bin/annotator/dirContentAnnotator.js"));

export default function () {
    let operations = {
        GET,
        POST,
    };

    function GET(req, res, _next) {
        const group = req.query.group ? req.query.group : "all";

        dirContentAnnotator.getAnnotatedCorpusList(group, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    function POST(req, res, _next) {
        dirContentAnnotator.annotateAndStoreCorpus(req.body.corpusPath, req.body.sources, req.body.corpusName, req.body.options, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrive annotate corpus list",
        description: "Retrive annotate corpus list",
        operationId: "Retrive annotate corpus list",
        parameters: [
            {
                name: "group",
                description: "group",
                in: "query",
                type: "string",
                required: false,
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
        tags: ["Annotate"],
    };

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
                        corpusPath: {
                            type: "string",
                        },
                        corpusName: {
                            type: "string",
                        },
                        options: {
                            type: "object",
                            properties: {
                                exactMatch: {
                                    type: "boolean",
                                },
                            },
                        },
                        sources: {
                            type: "array",
                            items: {
                                $ref: "#/definitions/Source",
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
