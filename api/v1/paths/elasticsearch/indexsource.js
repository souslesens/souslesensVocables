const path = require("path");
const dictionariesManager = require(path.resolve("bin/KG/dictionariesManager."));

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        console.log("REGARDE", req.body);
        dictionariesManager.indexSource(req.body.indexName, req.body.data, req.body.options, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
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
