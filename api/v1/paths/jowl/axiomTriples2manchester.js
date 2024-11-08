const {processResponse} = require("../utils");
const request = require("request");
const async = require("async");
const ConfigManager = require("../../../../bin/configManager.");

//https://jena.apache.org/documentation/inference/

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {


        var jowlConfigUrl = ConfigManager.config.jowlServer.url
        if (!jowlConfigUrl.endsWith("/")) {
            jowlConfigUrl += "/"
        }
        jowlConfigUrl += "axioms/triples2manchester";

        var payload = {
            "graphName": req.query.ontologyGraphUri,
            "triples": JSON.parse(req.query.axiomTriples)

        }
        var options = {
            method: "POST",
            json: payload,
            headers: {
                "content-type": "application/json",
            },
            url: jowlConfigUrl,
        };
        request(options, function (error, response, body) {
            return processResponse(res, error, body);
        });
    }


    GET.apiDoc = {
        security: [{restrictLoggedUser: []}],
        summary: "generates  manchester syntax from axioms triples",
        description: "generates  manchester syntax from axioms triples",
        operationId: "generates  manchester syntax from axioms triples",
        parameters: [
            {
                name: "ontologyGraphUri",
                description: "ontologyGraphUri",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "axiomTriples",
                description: "axiomTriples",
                in: "query",
                type: "string",
                required: true,
            }
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
