const ConfigManager = require("../../../../bin/configManager.");
const { processResponse } = require("../utils");
const request = require("request");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(_req, res, _next) {
        var jowlConfig = ConfigManager.config.jowlServer;
        var options = {
            method: "GET",
            headers: {
                "content-type": "application/json",
            },
            url: jowlConfig.url + "reasoner/parametres",
        };
        request(options, function (error, response, body) {
            if (error) return processResponse(res, error, body);
            var json = JSON.parse(body);

            return processResponse(res, error, json);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Query Jowl server to get inference parameters",
        description: "Query Jowl server to get inference parameters",
        operationId: "reasonerListInferenceParams",
        parameters: [],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
        tags: ["JOWL"],
    };

    return operations;
};
