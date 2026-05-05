import { rdfDataModel } from "../../../../model/rdfData.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const { sourceGraphUri, targetGraphUri } = req.body;

        if (!sourceGraphUri || !targetGraphUri) {
            return res.status(400).json({ error: "sourceGraphUri and targetGraphUri are required" });
        }

        try {
            await rdfDataModel.moveGraph(sourceGraphUri, targetGraphUri);
            res.status(200).send({ message: "Graph moved successfully" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Move all triples from one named graph to another",
        description:
            "Atomically copies all triples from `sourceGraphUri` to `targetGraphUri` and clears the source graph " +
            "(implemented by `rdfDataModel.moveGraph`, which usually wraps a SPARQL `MOVE` or `ADD` + `DROP`). " +
            "Used to rename a source's `graphUri` without losing data.",
        operationId: "rdfMoveGraph",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        sourceGraphUri: { type: "string", description: "URI of the existing graph.", example: "http://example.org/temporary/my_new_ontology" },
                        targetGraphUri: { type: "string", description: "Destination URI.", example: "http://example.org/ontologies/my_new_ontology" },
                    },
                    example: {
                        sourceGraphUri: "http://example.org/temporary/my_new_ontology",
                        targetGraphUri: "http://example.org/ontologies/my_new_ontology",
                    },
                },
                "x-examples": {
                    "Rename BFO graph": {
                        sourceGraphUri: "http://purl.obolibrary.org/obo/bfo.owl",
                        targetGraphUri: "http://purl.obolibrary.org/obo/bfo-2020.owl",
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Move succeeded.",
                schema: { properties: { message: { type: "string" } } },
                examples: { "application/json": { message: "Graph moved successfully" } },
            },
            400: { description: "Missing `sourceGraphUri` or `targetGraphUri`." },
            500: { description: "Triplestore error." },
        },
        tags: ["RDF"],
    };

    return operations;
}
