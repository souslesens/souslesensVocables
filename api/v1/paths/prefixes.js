import prefixes from "../../../model/prefixes.json" with { type: "json" };

export default function () {
    async function GET(req, res, next) {
        return res.status(200).json(prefixes);
    }

    GET.apiDoc = {
        operationId: "getPrefixes",
        summary: "Return the bundled prefix.cc namespace catalog",
        description: "Returns `model/prefixes.json` (a snapshot of prefix.cc) used by the SPARQL editor and the URI " + "shorteners across the UI. Map shape: `{ <prefix>: <namespace URI> }`.",
        parameters: [],
        responses: {
            200: {
                description: "Prefix → namespace map.",
                schema: {
                    type: "object",
                    additionalProperties: { type: "string" },
                },
                examples: {
                    "application/json": {
                        owl: "http://www.w3.org/2002/07/owl#",
                        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
                        bfo: "http://purl.obolibrary.org/obo/bfo.owl#",
                        iof: "https://www.industrialontologies.org/core/",
                    },
                },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Misc"],
    };

    return { GET };
}
