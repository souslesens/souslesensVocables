import { processResponse } from "../utils.js";
import request from "request";
import ConfigManager from "../../../../bin/configManager.js";

//https://jena.apache.org/documentation/inference/

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const jowlServerConfig = ConfigManager.config.jowlServer;
        if (!jowlServerConfig.enabled) {
            res.status(500).json({ message: "Jowl Server is disable" });
        }

        let jowlConfigUrl = jowlServerConfig.url;
        if (!jowlConfigUrl.endsWith("/")) {
            jowlConfigUrl += "/";
        }
        jowlConfigUrl += "axioms/triples2manchester";

        const payload = {
            graphName: req.query.ontologyGraphUri,
            triples: JSON.parse(req.query.axiomTriples),
        };
        const options = {
            method: "POST",
            json: payload,
            headers: {
                "content-type": "application/json",
            },
            url: jowlConfigUrl,
        };
        request(options, function (error, _response, body) {
            return processResponse(res, error, body);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Render axiom triples as a Manchester-syntax expression",
        description:
            "Reverse of `manchesterAxiom2triples`. Sends `axiomTriples` (a JSON-encoded array of triples) and " +
            "`ontologyGraphUri` to JOWL's `axioms/triples2manchester` and returns the human-readable Manchester string.",
        operationId: "jowlTriplesToManchester",
        parameters: [
            { name: "ontologyGraphUri", in: "query", type: "string", required: true, description: "Target ontology graph URI." },
            { name: "axiomTriples", in: "query", type: "string", required: true, description: "JSON-encoded array of triples to convert." },
        ],
        responses: {
            200: { description: "Manchester-syntax string.", schema: { type: "object" } },
            500: { description: "JOWL server disabled or parse error." },
        },
        tags: ["JOWL"],
    };

    return operations;
}
