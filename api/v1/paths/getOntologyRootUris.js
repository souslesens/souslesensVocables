import { processResponse } from "./utils.js";
import SourceIntegrator from "../../../bin/sourceIntegrator.js";

export default function () {
    let operations = {
        POST,
    };
    async function POST(req, res, _next) {
        const body = req.body.body;
        SourceIntegrator.getOntologyRootUris(body.sourceUrl, body.options, function (err, result) {
            processResponse(res, err, result);
        });
    }

    POST.apiDoc = {
        summary: "Detect candidate root URIs in an ontology before import",
        description:
            "Inspects the RDF file at `sourceUrl` (`SourceIntegrator.getOntologyRootUris`) and returns the set of " +
            "common URI prefixes found inside it. Used by the source-creation wizard to pre-fill `baseUri` / `graphUri` " +
            "fields when adding a new ontology source.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getOntologyRootUris",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        sourceUrl: {
                            type: "string",
                            description: "Public URL of the RDF file to inspect.",
                            example: "https://raw.githubusercontent.com/iofoundry/ontology/refs/heads/master/core/Core.rdf",
                        },
                        options: {
                            type: "object",
                            description: "Optional scan parameters (sample size, prefix length, ...).",
                            example: {},
                        },
                    },
                    example: {
                        sourceUrl: "https://raw.githubusercontent.com/iofoundry/ontology/refs/heads/master/core/Core.rdf",
                        options: {},
                    },
                },
                "x-examples": {
                    "Inspect IOF_core RDF": {
                        sourceUrl: "https://raw.githubusercontent.com/iofoundry/ontology/refs/heads/master/core/Core.rdf",
                        options: {},
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Candidate root URIs and statistics.",
                schema: {
                    type: "object",
                    properties: {
                        uriRoots: {
                            type: "array",
                            items: { type: "string" },
                            description: "Distinct URI prefixes (`http://...` minus trailing `/` or `#` segment) found among subjects.",
                        },
                        triples: {
                            type: "array",
                            items: { type: "object", additionalProperties: true },
                            description: "Always empty in the response — cleared after counting to keep the payload small.",
                        },
                        triplesCount: { type: "integer", description: "Total number of triples parsed from `sourceUrl`." },
                    },
                    example: {
                        uriRoots: ["https://www.industrialontologies.org/core/", "http://purl.obolibrary.org/obo"],
                        triples: [],
                        triplesCount: 12345,
                    },
                },
            },
            500: { description: "Fetch or parse error." },
        },
        tags: ["Ontology"],
    };

    return operations;
}
