import { indexModel } from '../../../../model/index.js';

module.exports = function () {
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
        security: [{ restrictLoggedUser: [] }],
        summary: "Elasticsearch search query",
        description: "Elasticsearch search query",
        operationId: "elasticsearch-search-query",
        parameters: [
            {
                name: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        indices: { type: "array", items: { type: "string" } },
                        uris: { type: "array", items: { type: "string" } },
                    },
                },
            },
        ],
        responses: { 200: { description: "results", schema: { type: "object" } } },
        tags: ["ElasticSearch"],
    };
    return operations;
};
