const HttpProxy = require("../../../../bin/httpProxy.");
const ConfigManager = require("../../../../bin/configManager.");
const GraphStore = require("../../../../bin/graphStore.");
const Util = require("../../../../bin/util.");
const fs = require("fs");
const { processResponse } = require("../utils");
const request = require("request");
const async = require("async");
const httpProxy = require("../../../../bin/httpProxy..js");

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

        var payload = {
            graphName: req.query.graphName,
            operation: req.query.operation,
            predicates: JSON.parse(req.query.predicates),
        };

        var headers = {
            "Content-Type": "application/json",
        };
        var jowlConfig = ConfigManager.config.jowlServer;
        var url = jowlConfig.url + "reasoner/" + req.query.operation;
        httpProxy.post(url, headers, payload, function (err, result) {
            //    HttpProxy.post(jowlConfig.url, {}, function (err, result) {
            if (err) {
                next(err);
            } else {
                return processResponse(res, err, result);
            }
        });
        return;

        if (req.query.graphName) {
            var url = jowlConfig.url + "reasoner/" + req.query.operation + "?graphName=" + encodeURIComponent(req.query.graphName);
            console.log(url);
            req.query.url;
            HttpProxy.get(url, {}, function (err, result) {
                // var url = jowlConfig.url + "reasoner/" + req.query.operation + "?filePath=" + req.query.url;
                //    HttpProxy.post(jowlConfig.url, {}, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    return processResponse(res, err, JSON.parse(result));
                }
            });
        } else if (req.query.type == "externalUrl") {
            var url = jowlConfig.url + "hermit/" + req.query.operation + "?url=" + req.query.url;
            req.query.url;
            HttpProxy.get(url, {}, function (err, result) {
                // var url = jowlConfig.url + "reasoner/" + req.query.operation + "?filePath=" + req.query.url;
                //    HttpProxy.post(jowlConfig.url, {}, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    return processResponse(res, err, JSON.parse(result));
                }
            });
        } else if (req.query.type == "internalGraphUri" && ConfigManager.config) {
            var query = req.query.describeSparqlQuery;
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
                    if (err) {
                        return processResponse(res, err, null);
                    }

                    var ontologyContentEncoded64 = Buffer.from(str).toString("base64");

                    var payload = {
                        ontologyContentEncoded64: ontologyContentEncoded64,
                    };
                    if (req.query.predicates) {
                        payload.predicates = JSON.parse(req.query.predicates);
                    }
                    var options = {
                        method: "POST",
                        json: payload,
                        headers: {
                            "content-type": "application/json",
                        },
                        url: jowlConfig.url + "hermit/" + req.query.operation,
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
        summary: "Query Jowl server",
        description: "Query Jowl server",
        operationId: "Query Jowl server",
        parameters: [
            {
                name: "operation",
                description: "operation",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "graphName",
                description: "graphName",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "url",
                description: "source graphUri or url",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "predicates",
                description: "predicates array ",
                in: "query",
                type: "string",
                required: false,
            },

            {
                name: "options",
                description: "JSON ",
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
    };

    return operations;
};
