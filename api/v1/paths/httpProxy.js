import { processResponse } from "./utils.js";
import httpProxy from "../../../bin/httpProxy.js";

export default function () {
    let operations = {
        POST,
        GET,
    };

    async function POST(req, res, next) {
        try {
            if (req.body.POST) {
                var body = JSON.parse(req.body.body);
                httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                    processResponse(res, err, result);
                });
            } else {
                var options = {};
                if (req.body.options) {
                    if (typeof req.body.options == "string") options = JSON.parse(req.body.options);
                    else options = req.body.options;
                }
                options.host = req.headers.host;
                httpProxy.get(req.body.url, options, function (err, result) {
                    processResponse(res, err, result);
                });
            }
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Generic HTTP proxy (POST)",
        description:
            "Generic CORS-bypass HTTP proxy. Unlike `/sparqlProxy`, this endpoint does **not** apply any SPARQL filtering — " +
            "use it for non-SPARQL upstream calls (REST APIs, web pages, raw HTTP). Set `body.POST=true` to forward as POST, " +
            "otherwise the call is forwarded as GET with `body.options` merged into the request options.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "httpProxyPost",
        parameters: [
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        POST: { type: "boolean", example: false },
                        url: { type: "string", example: "http://data.industryportal.enit.fr/ontologies?apikey=<token>" },
                        body: {
                            type: "string",
                            description: "JSON-encoded `{ headers, params }` for POST mode.",
                            example: '{"headers":{"Accept":"application/json"},"params":{}}',
                        },
                        options: {
                            type: "string",
                            description: "JSON-encoded request options for GET mode.",
                            example: '{"headers":{"Accept":"application/json"}}',
                        },
                    },
                    example: {
                        GET: true,
                        url: "http://data.industryportal.enit.fr/ontologies?apikey=<token>",
                    },
                },
            },
        ],
        responses: {
            default: { description: "Raw response from the upstream server." },
        },
        tags: ["Misc"],
    };

    /* Not used route with bug , I think deprecated by POST route that can handle both */
    function GET(req, res, next) {
        try {
            httpProxy.get(req.query, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            res.status(e.status || 500).json(e);
            next(e);
        }
    }
    GET.apiDoc = {
        summary: "Generic HTTP proxy (GET)",
        description: "GET variant of the generic HTTP proxy. Forwards `req.query` as the call options to the upstream server. " + "No SPARQL filtering — see `/sparqlProxy` for that.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "httpProxyGet",
        parameters: [{ name: "url", in: "query", type: "string", required: true, description: "Upstream URL." }],
        responses: {
            default: { description: "Raw response from the upstream server." },
        },
        tags: ["Misc"],
    };

    return operations;
}
