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
        jowlConfigUrl += "axioms/getClassAxioms";

        const payload = {
            graphName: req.query.graphUri,
            classUri: req.query.classUri,
            tripleFormat: req.query.getTriples ? true : false,
            manchetserFormat: req.query.getManchesterExpression ? true : false,
        };

        if (req.query.axiomType) {
            payload.axiomType = req.query.axiomType;
        }
        if (req.query.getTriples) {
            payload.getTriples = true;
        }
        if (req.query.getManchesterExpression) {
            payload.manchetserFormat = true;
        }

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
        summary: "Fetch axioms attached to a class via the JOWL server",
        description:
            "Forwards a `getClassAxioms` call to the configured JOWL server (`mainConfig.jowlServer.url`). " +
            "Returns the OWL axioms attached to `classUri` in the named graph `graphUri`. " +
            "Set `getTriples=true` to include the underlying RDF triples and `getManchesterExpression=true` to include " +
            "the Manchester-syntax form. Filter on `axiomType` to limit the result (e.g. `SubClassOf`, `EquivalentClasses`). " +
            "Returns `500` if the JOWL server is disabled.",
        operationId: "jowlGetClassAxioms",
        parameters: [
            { name: "graphUri", in: "query", type: "string", required: true, description: "Named graph holding the ontology. Example: `http://purl.obolibrary.org/obo/bfo.owl`." },
            { name: "classUri", in: "query", type: "string", required: true, description: "Class URI to inspect. Example: `http://purl.obolibrary.org/obo/BFO_0000015`." },
            { name: "axiomType", in: "query", type: "string", required: false, description: "Restrict to a single axiom type." },
            { name: "getTriples", in: "query", type: "string", required: false, description: "If truthy, include underlying RDF triples." },
            { name: "getManchesterExpression", in: "query", type: "string", required: false, description: "If truthy, include Manchester-syntax forms." },
        ],
        responses: {
            200: {
                description: "Axioms (and optionally triples / Manchester strings).",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description:
                        "JOWL `getClassAxioms` payload. Keyed by axiom type (e.g. `SubClassOf`, `EquivalentClasses`, " +
                        "`DisjointClasses`). Each entry carries the axiom expression and — when requested — the underlying " +
                        "RDF triples (`triples`) and Manchester-syntax form (`manchester`).",
                },
            },
            500: { description: "JOWL server disabled or upstream error." },
        },
        tags: ["JOWL"],
    };

    return operations;
}
