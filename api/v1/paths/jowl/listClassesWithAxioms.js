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

        jowlConfigUrl = "http://localhost:9170/";
        jowlConfigUrl += "axioms/listClassesWithAxioms";

        const payload = {
            graphName: req.query.graphName,
        };

        const options = {
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
        summary: "List classes that carry at least one OWL axiom",
        description:
            "Forwards `axioms/listClassesWithAxioms` to the JOWL server. Used by the UI to highlight axiomatised " +
            "classes (those carrying restrictions, equivalent classes, disjointness, etc.) in the lineage tree.",
        operationId: "jowlListClassesWithAxioms",
        parameters: [{ name: "graphName", in: "query", type: "string", required: true, description: "Ontology graph URI. Example: `http://purl.obolibrary.org/obo/bfo.owl`." }],
        responses: {
            200: {
                description: "Array of class URIs holding axioms.",
                schema: {
                    type: "array",
                    items: { type: "string", description: "Class URI." },
                    example: ["http://purl.obolibrary.org/obo/BFO_0000001", "http://purl.obolibrary.org/obo/BFO_0000015"],
                },
            },
            500: { description: "JOWL server error." },
        },
        tags: ["JOWL"],
    };

    return operations;
}
