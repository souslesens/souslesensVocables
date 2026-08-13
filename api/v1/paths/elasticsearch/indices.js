import { indexModel } from "../../../../model/index.js";
import ConfigManager from "../../../../bin/configManager.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const indices = await indexModel.getIndices();
            if (req.query.accessibleOnly !== "true") {
                return res.status(200).send(indices);
            }

            // Same intersection the search UI does client-side in SearchUtil.initSourcesIndexesList:
            // an index the caller has no source for is rejected by validateElasticSearchIndices, and
            // that rejection fails the *whole* multi-index query, not just the offending index.
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
            "Returns every index name reported by `indexModel.getIndices` (lowercase, as Elasticsearch stores them). " +
            "The search UI uses this list to detect which sources have a full-text index available and to populate " +
            "the multi-source search picker. The full list includes indices the caller cannot query — orphan indices " +
            "of deleted sources, whiteboard indices, sources outside the caller's profile — which is what the admin " +
            "screens need; pass `accessibleOnly=true` to get only the indices the caller may actually search.",
        operationId: "getElasticsearchIndices",
        // `accessibleOnly` is frozen for the agent: an index it has no rights on is not merely
        // skipped by /elasticsearch/query, it makes the entire multi-index search return 403.
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
                    query: { accessibleOnly: "true" },
                },
            ],
        },
        parameters: [
            {
                name: "accessibleOnly",
                in: "query",
                type: "string",
                required: false,
                enum: ["true"],
                description: "Keep only the indices matching a source the caller can read. Without it, every index of the cluster is returned.",
            },
        ],

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
