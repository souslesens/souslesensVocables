const HttpProxy = require("../../../../bin/httpProxy.");
const ConfigManager = require("../../../../bin/configManager.");
const GraphStore = require("../../../../bin/graphStore.");
const Util = require("../../../../bin/util.");
const fs = require("fs");
const { processResponse } = require("../utils");
const request = require("request");
const async = require("async");

//https://jena.apache.org/documentation/inference/

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        let options = null;
        if (req.query.options) {
            options = JSON.parse(req.query.options);
        }

        var jowlConfig = ConfigManager.config.jowlServer;

        if (req.query.type == "externalUrl") {
            var url = jowlConfig.url + "SWRL/" + req.query.operation + "?filePath=" + req.query.url;
            HttpProxy.post(jowlConfig.url, {}, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    return processResponse(res, err, JSON.parse(result));
                }
            });
        } else if (req.query.type == "internalGraphUri" && ConfigManager.config) {
            var query = req.query.describeQuery;
            var url = ConfigManager.config.sparql_server.url + "?query=";

            var requestOptions = {
                method: "POST",
                url: url,
                auth: {
                    user: ConfigManager.config.sparql_server.user,
                    pass: ConfigManager.config.sparql_server.password,
                    sendImmediately: false,
                },
                headers: {
                    Accept: "text/turtle",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                form: {
                    query: query,

                    auth: {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    },
                },
                rejectUnauthorized: false,
            };

            var resultSize = 1001;
            var offset = 0;
            var size = 1000;
            var str = "";

            async.whilst(
                function (callbackTest) {
                    callbackTest(null, resultSize > 16);
                },

                function (callbackWhilst) {
                    var query2 = query + " offset " + offset + " limit " + size + "";
                    requestOptions.form.query = query2;

                    request(requestOptions, function (error, response, body) {
                        if (error) {
                            console.log(error);
                            return callbackWhilst(error);
                        }
                        resultSize = body.length;
                        offset += size;
                        str += body;
                        return callbackWhilst();
                    });
                },
                function (err) {
                    if (err) return processResponse(res, err, null);

                    var ontologyContentEncoded64 = Buffer.from(str).toString("base64");

                    var payload = JSON.parse(req.query.payload);
                    payload.ontologyContentEncoded64 = ontologyContentEncoded64;

                    var options = {
                        method: "POST",
                        json: payload,
                        headers: {
                            "content-type": "application/json",
                        },
                        url: jowlConfig.url + "swrl/" + req.query.operation,
                    };
                    request(options, function (error, response, body) {
                        return processResponse(res, error, body);
                    });
                },
            );
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Query Jowl server rules",
        description: "Query Jowl server  rules",
        operationId: "Query Jowl server  rules",
        parameters: [
            {
                name: "operation",
                description: "operation",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "type",
                description: "externalUrl/ internalGraphUri",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "url",
                description: "source graphUri or url",
                in: "query",
                type: "string",
                required: false,
            },

            {
                name: "payload",
                description: "payload",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "describeQuery",
                description: "describeQuery ",
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
        tags: ["JOWL"],
    };

    return operations;
};
