const { processResponse } = require("./utils");
const GraphTraversal = require("../../../bin/graphTraversal.");
const ConfigManager = require("../../../bin/configManager.");
const UserRequestFiltering = require("../../../bin/userRequestFiltering.");

module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const body = req.body.body;
        var auth = null;

        if (body.vicinityArray) {
            GraphTraversal.getSortestPathFromVicinityArray(body.vicinityArray, body.fromNodeUri, body.toNodeUri, {}, function (err, result) {
                processResponse(res, err, result);
            });
        } else {
            if (ConfigManager.config && body.sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                auth = {
                    user: ConfigManager.config.sparql_server.user,
                    pass: ConfigManager.config.sparql_server.password,
                    sendImmediately: false,
                };

                ConfigManager.getUserSources(req, res, function (err, userSources) {
                    if (err) {
                        return processResponse(res, err, userSources);
                    }

                    var userGraphUrisMap = UserRequestFiltering.getUserGraphUrisMap(userSources);
                    if (!userGraphUrisMap[body.graphUri]) {
                        return processResponse(res, "DATA PROTECTION : graphUri no tallowed for user", null);
                    }

                    if (body.numberOfPathes > 1) {
                        GraphTraversal.getAllShortestPath(body.sparqlServerUrl, body.graphUri, body.fromNodeUri, body.toNodeUri, body.numberOfPathes, { auth: auth }, function (err, result) {
                            processResponse(res, err, result);
                        });
                    } else {
                        GraphTraversal.getShortestPath(body.sparqlServerUrl, body.graphUri, body.fromNodeUri, body.toNodeUri, { auth: auth }, function (err, result) {
                            processResponse(res, err, result);
                        });
                    }
                });
            }
        }
    }

    POST.apiDoc = {
        summary: "Get the shortest path between two node",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getShortestPath",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    /*   properties: {
                 sparqlServerUrl: {
                     type: "string",
                     required: false
                 },
                 graphUri: {
                     type: "string",
                     required: false
                 },
                 fromNodeUri: {
                     type: "string",
                     required: false
                 },
                 toNodeUri: {
                     type: "string",
                 },
                 numberOfPathes: {
                     type: "number",
                     required: false
                 },
                 viscinityArray: {
                     type: "object",
                     required: false
                 },
             },*/
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
