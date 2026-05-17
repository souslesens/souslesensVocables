import { sourceModel } from "../../../../model/sources.js";
import { indexModel } from "../../../../model/index.js";

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
        summary: "Preview orphan Elasticsearch indices (dry-run)",
        description:
            "Returns the indices present in the Elasticsearch cluster whose names do not match any source declared " +
            "in `sources.json` (case-insensitive). Read-only — nothing is deleted. The admin UI calls this first to " +
            "show the user the deletion candidates before confirming.",
        operationId: "elasticsearchListOrphanIndices",
        parameters: [],
        responses: {
            200: {
                description: "Orphan indices that would be removed by `POST /elasticsearch/clean`.",
                schema: {
                    type: "object",
                    properties: {
                        toDelete: {
                            type: "array",
                            items: { type: "string" },
                            description: "Index names with no matching entry in `sources.json`.",
                        },
                    },
                    example: { toDelete: ["legacy_v1", "test_index"] },
                },
            },
            500: {
                description: "Failed to query Elasticsearch or load `sources.json`.",
                schema: {
                    type: "object",
                    properties: { error: { type: "object" } },
                },
            },
        },
        tags: ["ElasticSearch"],
    };

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Delete orphan Elasticsearch indices",
        description:
            "Deletes every index returned by the matching `GET /elasticsearch/clean` call (indices not declared in " +
            "`sources.json`). Destructive — admin-only. Used by the admin tool's *Clean indices* button after the " +
            "user confirms the dry-run list.",
        operationId: "elasticsearchDeleteOrphanIndices",
        parameters: [],
        responses: {
            200: {
                description: "Indices that were deleted.",
                schema: {
                    type: "object",
                    properties: {
                        deleted: {
                            type: "array",
                            items: { type: "string" },
                            description: "Index names removed from the Elasticsearch cluster.",
                        },
                    },
                    example: { deleted: ["legacy_v1", "test_index"] },
                },
            },
            500: {
                description: "Elasticsearch deletion failure.",
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
