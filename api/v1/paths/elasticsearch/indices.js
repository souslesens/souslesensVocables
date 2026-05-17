import { indexModel } from "../../../../model/index.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(_req, res, _next) {
        const indices = await indexModel.getIndices();
        try {
            await indexModel.getIndices();
            res.status(200).send(indices);
        } catch (error) {
            res.status(500).send({ error: error });
            console.error(error);
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "List Elasticsearch indices known to the configured cluster",
        description:
            "Returns every index name reported by `indexModel.getIndices` (lowercase, as Elasticsearch stores them). " +
            "The search UI uses this list to detect which sources have a full-text index available and to populate " +
            "the multi-source search picker.",
        operationId: "getElasticsearchIndices",

        responses: {
            200: {
                description: "Index names from the Elasticsearch cluster.",
                schema: {
                    type: "array",
                    items: { type: "string" },
                    example: ["iof_core", "gemet", "ecosystem-ontology"],
                },
            },
            500: {
                description: "Elasticsearch unreachable or returned an error.",
                schema: {
                    type: "object",
                    properties: { error: { type: "object" } },
                },
            },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
}
