import { indexModel } from '../../../../model/index.js';

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
        security: [{ restrictLoggedUser: [] }],
        summary: "Get ElasticSearch indices",
        description: "Get ElasticSearch indices",
        operationId: "Get ElasticSearch indices",

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
            },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
};
