import { indexModel } from "../../../../model/index.js";

export default function () {
    const operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const indices = req.body.indices;
        const uris = req.body.uris;

        try {
            const hits = await indexModel.searchTerm(indices, uris);
            res.status(200).send({ hits: hits });
        } catch (e) {
            console.error(e);
            res.status(500).send({ message: "Internal server error" });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Look up documents in Elasticsearch by URI",
        description:
            "Searches the given `indices` for documents whose `id.keyword` field matches any of the provided `uris`. " +
            "Internally uses `indexModel.searchTerm`, which batches indices to stay within Elasticsearch limits. " +
            "Used by the search UI to resolve ontology-node URIs to their indexed labels and metadata.",
        operationId: "elasticsearchSearchByUri",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    properties: {
                        indices: {
                            type: "array",
                            items: { type: "string" },
                            description: 'Index names to search (lowercase source names). Example: `["iof_core", "gemet"]`.',
                            example: ["iof_core", "gemet"],
                        },
                        uris: {
                            type: "array",
                            items: { type: "string" },
                            description: "URIs to match against the `id.keyword` field.",
                            example: ["http://www.industrialontologies.org/core/Asset"],
                        },
                    },
                    example: {
                        indices: ["iof_core"],
                        uris: ["http://www.industrialontologies.org/core/Asset"],
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Elasticsearch hits for the matched URIs (up to 1 000 per index chunk).",
                schema: {
                    type: "object",
                    properties: {
                        hits: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    _index: { type: "string", description: "Index the document was found in." },
                                    _id: { type: "string" },
                                    _score: { type: "number" },
                                    _source: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string", description: "Ontology URI." },
                                            label: { type: "string" },
                                            type: { type: "string" },
                                        },
                                        additionalProperties: true,
                                    },
                                },
                            },
                        },
                    },
                    example: {
                        hits: [
                            {
                                _index: "iof_core",
                                _id: "http://www.industrialontologies.org/core/Asset",
                                _score: 1.0,
                                _source: { id: "http://www.industrialontologies.org/core/Asset", label: "Asset", type: "owl:Class" },
                            },
                        ],
                    },
                },
            },
            500: { description: "Elasticsearch unreachable or query error." },
        },
        tags: ["ElasticSearch"],
    };
    return operations;
}
