
const { processResponse } = require("../utils");
const request = require("request");
const async = require("async");
const ConfigManager = require("../../../../bin/configManager.");

//https://jena.apache.org/documentation/inference/

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {


      var  jowlConfigUrl=ConfigManager.config.jowlServer.url
        if(!jowlConfigUrl.endsWith("/"))
            jowlConfigUrl+="/"
                jowlConfigUrl+="classes/listClassesWithAxioms";

        var payload={
            "graphName": req.query.graphName


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
        security: [{ restrictLoggedUser: [] }],
        summary: "get  classes with axioms from owl API",
        description:  "get  classes with axioms from owl API",
        operationId:  "get  classes with axioms from owl API",
        parameters: [
            {
                name: "graphName",
                description: "ontologyGraphUri",
                type: "string",
                in: "query",
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
