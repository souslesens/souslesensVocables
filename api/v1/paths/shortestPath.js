const { processResponse } = require("./utils");
const ExportGraph = require("../../../bin/exportGraph.");
const GraphTraversal = require("../../../bin/graphTraversal.");

module.exports = function () {
    let operations = {
        POST,
    };
    async function POST(req, res, next) {
        const body = req.body;
        if (body.numberOfPathes > 1) {
            GraphTraversal.getAllShortestPath(body.sparqlServerUrl, body.graphUri, body.fromNodeUri, body.toNodeUri, body.numberOfPathes, function (err, result) {
                processResponse(res, err, result);
            });
        } else {
            GraphTraversal.getShortestPath(body.sparqlServerUrl, body.graphUri, body.fromNodeUri, body.toNodeUri, function (err, result) {
                processResponse(res, err, result);
            });
        }
    }

    POST.apiDoc = {
        summary: "Get the shortest path between two node",
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
                        sparqlServerUrl: {
                            type: "string",
                        },
                        graphUri: {
                            type: "string",
                        },
                        fromNodeUri: {
                            type: "string",
                        },
                        toNodeUri: {
                            type: "string",
                        },
                        numberOfPathes: {
                            type: "number",
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
