const { processResponse } = require("./utils");
const SourceIntegrator = require("../../../bin/sourceIntegrator.");

module.exports = function () {
    let operations = {
        POST,
    };
    async function POST(req, res, next) {
        const body = req.body;
        SourceIntegrator.importSourceFromTurtle(body.sourceUrl, body.sourceName, body.options, function (err, result) {
            processResponse(res, err, result);
        });
    }

    POST.apiDoc = {
        summary: "Import a source",
        security: [{ loginScheme: [] }],
        operationId: "getShortestPath",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        sourceUrl: {
                            type: "string",
                        },
                        sourceName: {
                            type: "string",
                        },
                        options: {
                            type: "object",
                        },
                    },
                },
            },
        ],
        responses: {
            default: {
                description: "Response…",
            },
        },
    };

    return operations;
};
