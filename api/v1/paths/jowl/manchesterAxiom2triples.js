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
        jowlConfigUrl += "axioms/manchester2triples";

        const payload = {
            input: req.query.manchesterContent,
            graphName: req.query.graphUri,
            classUri: req.query.classUri,
            axiomType: req.query.axiomType,
            saveTriples: req.query.saveTriples == "true" ? true : false,
            checkConsistency: req.query.checkConsistency == "true" ? true : false,
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
        summary: "Compile a Manchester-syntax axiom into RDF triples",
        description:
            "Calls `axioms/manchester2triples` on the JOWL server: parses `manchesterContent` (relative to `classUri` and " +
            "`axiomType`) and returns the resulting RDF triples. When `saveTriples=true` the JOWL server also persists " +
            "the triples in `graphUri`. When `checkConsistency=true`, a reasoner pass is run before saving.",
        operationId: "jowlManchesterToTriples",
        parameters: [
            { name: "manchesterContent", in: "query", type: "string", required: true, description: "Manchester-syntax axiom body. Example: `SubClassOf: BFO:0000001`." },
            { name: "graphUri", in: "query", type: "string", required: true, description: "Target ontology graph URI. Example: `https://www.industrialontologies.org/core/`." },
            { name: "classUri", in: "query", type: "string", required: false, description: "Subject class URI." },
            { name: "axiomType", in: "query", type: "string", required: false, description: "Axiom type (e.g. `SubClassOf`)." },
            { name: "saveTriples", in: "query", type: "string", required: false, description: 'If `"true"`, persist generated triples in `graphUri`.' },
            { name: "checkConsistency", in: "query", type: "string", required: false, description: 'If `"true"`, run a consistency check before saving.' },
        ],
        responses: {
            200: {
                description: "Generated triples (and consistency report when requested).",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description:
                        "JOWL `manchester2triples` payload. Carries the array of generated RDF triples (typically under " +
                        "`triples`) and, when `checkConsistency=true`, a reasoner consistency report.",
                },
            },
            500: { description: "JOWL server disabled or parse error." },
        },
        tags: ["JOWL"],
    };

    return operations;
}
