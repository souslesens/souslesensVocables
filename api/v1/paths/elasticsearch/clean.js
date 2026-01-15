import { sourceModel } from '../../../../model/sources.js';
import { indexModel } from '../../../../model/index.js';

export default function () {
    let operations = {
        GET,
        POST,
    };

    async function getIndicesToDelete() {
        const sources = await sourceModel.getAllSources();
        const lowerSourceNames = Object.entries(sources).map(([name, _source]) => {
            return name.toLowerCase();
        });

        // get current indices
        const indices = await indexModel.getIndices();

        // compare
        const indicesToDelete = indices.filter((index) => {
            if (!lowerSourceNames.includes(index)) {
                return index;
            }
        });
        return indicesToDelete;
    }

    async function GET(_req, res, _next) {
        try {
            const indicesToDelete = await getIndicesToDelete();
            res.status(200).send({ toDelete: indicesToDelete });
        } catch (error) {
            res.status(500).send({ error: error });
            console.error(error);
        }
    }

    async function POST(_req, res, _next) {
        try {
            const indicesToDelete = await getIndicesToDelete();

            // delete
            if (indicesToDelete) {
                await indexModel.deleteIndices(indicesToDelete);
            }

            res.status(200).send({ deleted: indicesToDelete });
        } catch (error) {
            res.status(500).send({ error: error });
            console.error(error);
        }
    }

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Elasticsearch clean indices",
        description: "Return all indices not described in sources.json",
        operationId: "Elasticsearch clean indices",
        parameters: [],
        responses: {
            200: {
                description: "Indices to delete",
                schema: {
                    properties: {
                        toDelete: { type: "array", items: { type: "string" } },
                    },
                },
            },
            500: {
                description: "Server error",
                schema: {
                    properties: {
                        error: { type: "object" },
                    },
                },
            },
        },
        tags: ["ElasticSearch"],
    };

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Elasticsearch clean indices",
        description: "Delete all indices not described in sources.json",
        operationId: "Elasticsearch clean indices",
        parameters: [],
        responses: {
            200: {
                description: "Indices deleted",
                schema: {
                    properties: {
                        deleted: { type: "array", items: { type: "string" } },
                    },
                },
            },
            500: {
                description: "Server error",
                schema: {
                    properties: {
                        error: { type: "object" },
                    },
                },
            },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
};
