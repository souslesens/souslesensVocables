import HttpProxy from "../../../../bin/httpProxy.js";
import ConfigManager from "../../../../bin/configManager.js";
import { processResponse } from "../utils.js";
import request from "request";
import async from "async";
import httpProxy from "../../../../bin/httpProxy.js";

//https://jena.apache.org/documentation/inference/

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        if (req.query.options) {
            var options = JSON.parse(req.query.options);
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
                res.status(err.status || 500).json(err);
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Run a reasoner operation on the JOWL server",
        description:
            "Forwards `operation` (e.g. `classify`, `consistency`, `unsatisfiable`, `inferences`) to JOWL " +
            "(`reasoner/<operation>`). The body sent upstream is `{ graphName, operation, predicates }`. " +
            "`predicates` is a JSON-encoded array of property URIs the reasoner should focus on.",
        operationId: "jowlReasoner",
        parameters: [
            { name: "operation", in: "query", type: "string", required: true, description: "Reasoner operation (`classify`, `consistency`, `unsatisfiable`, ...)." },
            { name: "graphName", in: "query", type: "string", required: false, description: "Named graph URI to reason over. Example: `http://purl.obolibrary.org/obo/bfo.owl`." },
            { name: "url", in: "query", type: "string", required: false, description: "External ontology URL (alternative to `graphName`)." },
            { name: "predicates", in: "query", type: "string", required: false, description: "JSON-encoded predicate URI array." },
            { name: "options", in: "query", type: "string", required: false, description: "JSON-encoded options forwarded to the reasoner." },
        ],
        responses: {
            200: { description: "Reasoner output (depends on `operation`).", schema: { type: "object" } },
            500: { description: "JOWL server error." },
        },
        tags: ["JOWL"],
    };

    return operations;
}
