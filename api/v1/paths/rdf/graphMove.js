import { rdfDataModel } from "../../../../model/rdfData.js";
import { sourceModel } from "../../../../model/sources.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const { sourceGraphUri, targetGraphUri, sourceName, rewriteResourceUris } = req.body;

        if (!sourceGraphUri || !targetGraphUri) {
            return res.status(400).json({ error: "sourceGraphUri and targetGraphUri are required" });
        }

        try {
            let updatedSource = null;
            if (sourceName) {
                const sources = await sourceModel.getAllSources();
                const source = sources[sourceName];
                if (!source) {
                    return res.status(400).json({ error: `source ${sourceName} does not exist` });
                }
                if (source.graphUri !== sourceGraphUri) {
                    return res.status(400).json({ error: `source ${sourceName} graphUri is ${source.graphUri}, not ${sourceGraphUri}` });
                }
                updatedSource = { ...source, graphUri: targetGraphUri };
                if (!updatedSource.baseUri || updatedSource.baseUri === sourceGraphUri || updatedSource.baseUri === ensureTrailingSlash(sourceGraphUri)) {
                    updatedSource.baseUri = ensureTrailingSlash(targetGraphUri);
                }
            }

            await rdfDataModel.moveGraph(sourceGraphUri, targetGraphUri);
            if (rewriteResourceUris) {
                await rdfDataModel.rewriteGraphResourceUris(targetGraphUri, sourceGraphUri, targetGraphUri);
            }
            if (updatedSource) {
                await sourceModel.updateSource(updatedSource);
            }
            res.status(200).send({ message: "Graph moved successfully", source: updatedSource });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }

    function ensureTrailingSlash(uri) {
        if (uri.endsWith("/") || uri.endsWith("#")) {
            return uri;
        }
        return `${uri}/`;
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Move all triples from one named graph to another",
        description:
            "Moves all triples from `sourceGraphUri` to `targetGraphUri`, batch by batch (implemented by `rdfDataModel.moveGraph`), " +
            "so large graphs don't time out in a single SPARQL Update statement. When `rewriteResourceUris` is true, " +
            "IRI subjects, predicates, and objects starting from the old graph URI/base URI are rewritten to the target URI. " +
            "When `sourceName` is provided, that source descriptor's `graphUri` is updated after a successful move.",
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
                        sourceName: { type: "string", description: "Optional source name whose graphUri must be updated.", example: "my_new_ontology" },
                        rewriteResourceUris: { type: "boolean", description: "Rewrite internal resource IRIs from the source graph URI/base URI to the target URI.", example: true },
                    },
                    example: {
                        sourceGraphUri: "http://example.org/temporary/my_new_ontology",
                        targetGraphUri: "http://example.org/ontologies/my_new_ontology",
                        sourceName: "my_new_ontology",
                        rewriteResourceUris: true,
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
