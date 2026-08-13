import { indexModel } from "../../../../model/index.js";
import ConfigManager from "../../../../bin/configManager.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const indices = await indexModel.getIndices();

            // The list exists to be fed back to the search routes, and an index the caller has no
            // source for is not skipped there: it makes validateElasticSearchIndices reject the
            // *whole* multi-index query. This is the same intersection the search UI already does
            // client-side in SearchUtil.initSourcesIndexesList.
            ConfigManager.getUserSources(req, res, function (accessError, userSources) {
                if (accessError) {
                    return;
                }
                const accessibleIndexNames = {};
                for (const sourceName in userSources) {
                    accessibleIndexNames[sourceName.toLowerCase()] = true;
                }
                const accessibleIndices = indices.filter((indexName) => accessibleIndexNames[indexName]);
                res.status(200).send(accessibleIndices);
            });
        } catch (error) {
            res.status(500).send({ error: error });
            console.error(error);
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "List Elasticsearch indices known to the configured cluster",
        description:
            "Returns the index names reported by `indexModel.getIndices` (lowercase, as Elasticsearch stores them) " +
            "that match a source the caller can read. The search UI uses this list to detect which sources have a " +
            "full-text index available and to populate the multi-source search picker. Indices matching no readable " +
            "source — orphans of deleted sources, whiteboard indices, sources outside the caller's profile — are left " +
            "out: passing one to the search routes fails the whole query.",
        operationId: "getElasticsearchIndices",
        "x-mcp": {
            tools: [
                {
                    name: "sls_list_indexes",
                    access: "read",
                    description:
                        "Index names you may search with sls_search_labels, one per source that has a full-text index. " +
                        "They are lowercase and do not always match the SLS source name, so read this list rather than guessing. " +
                        "sls_search_labels takes several of them in one call, so this is also how you search the whole platform at once.",
                    params: {},
                },
            ],
        },

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
