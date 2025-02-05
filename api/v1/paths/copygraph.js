const { processResponse } = require("./utils");
const ExportGraph = require("../../../bin/exportGraph.");

module.exports = function () {
    let operations = {
        POST,
    };
    async function POST(req, res, next) {
        const body = req.body;
        ExportGraph.copyGraphToEndPoint(body.source, body.toEndPointConfig, body.options, function (err, result) {
            processResponse(res, err, result);
        });
    }

    POST.apiDoc = {
        summary: "Copy a graph from a endpoint to another",
        security: [{ restrictAdmin: [] }],
        operationId: "copygraph",
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
                        toEndPointConfig: {
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
        tags: ["Graph"],
    };

    return operations;
};
