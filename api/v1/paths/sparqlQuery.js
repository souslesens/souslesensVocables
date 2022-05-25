const { processResponse, responseSchema } = require("./utils");
const httpProxy = require("../../../bin/httpProxy.");

module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            let query = req.body.query;
            const headers = {};
            if (req.query.graphUri) query = query.replace(/where/gi, "from <" + req.query.graphUri + "> WHERE ");

            if (req.query.method == "POST") {
                headers["Accept"] = "application/sparql-results+json";
                headers["Content-Type"] = "application/x-www-form-urlencoded";
                httpProxy.post(req.query.url, headers, { query: query }, function (err, result) {
                    processResponse(res, err, result);
                });
            } else if (req.query.method == "GET") {
                headers["Accept"] = "application/sparql-results+json";
                headers["Content-Type"] = "application/x-www-form-urlencoded";

                var query2 = encodeURIComponent(query);
                query2 = query2.replace(/%2B/g, "+").trim();
                var url = req.query.url + "?format=json&query=" + query2;
                httpProxy.get(url, headers, function (err, result) {
                    if (result && typeof result === "string") result = JSON.parse(result.trim());
                    processResponse(res, err, result);
                });
            }
        } catch (err) {
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Send a SPARQL query to a different domain",
        security: [{ loginScheme: [] }],
        operationId: "sparqlQuery",
        parameters: [
            {
                in: "query",
                name: "url",
                type: "string",
            },
            {
                in: "query",
                name: "graphUri",
                type: "string",
            },
            {
                in: "query",
                name: "method",
                type: "string",
            },
            {
                in: "query",
                name: "t",
                type: "integer",
            },
            {
                in: "body",
                name: "query",
                schema: {
                    type: "object",
                    properties: {
                        query: {
                            description: "SPARQL query to send to the server",
                            type: "string",
                        },
                    },
                    required: ["query"],
                },
            },
        ],
        responses: responseSchema("SparqlQueryResponse", "POST"),
    };

    return operations;
};
