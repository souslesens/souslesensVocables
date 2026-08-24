import path from "path";
import elasticRestProxy from "../../../../bin/elasticRestProxy.js";
import ConfigManager from "../../../../bin/configManager.js";
import UserRequestFiltering from "../../../../bin/userRequestFiltering.js";
import { processResponse } from "../utils.js";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        if (ConfigManager.config) {
            ConfigManager.getUserSources(req, res, function (err, userSources) {
                UserRequestFiltering.validateElasticSearchIndices(null, req.body.indexes, userSources, "r", function (parsingError, _filteredQuery) {
                    if (parsingError) {
                        return processResponse(res, parsingError, null);
                    }

                    elasticRestProxy.executePostQuery(req.body.url, req.body.query, req.body.indexes, function (err, result) {
                        if (err) {
                            res.status(err.status || 500).json(err);
                            next(err);
                        } else {
                            return res.status(200).json(result);
                        }
                    });
                });
            });
        } else {
            elasticRestProxy.executePostQuery(req.body.url, req.body.query, req.body.indexes, function (err, result) {
                if (err) {
                    res.status(err.status || 500).json(err);
                    next(err);
                } else {
                    return res.status(200).json(result);
                }
            });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Execute an Elasticsearch query through the server proxy",
        description:
            "Forwards `query` to the configured Elasticsearch endpoint via `elasticRestProxy.executePostQuery`. " +
            "When the platform config is loaded, `indexes` are first checked against the caller's accessible " +
            "sources via `UserRequestFiltering.validateElasticSearchIndices` (read scope) — requests targeting " +
            "indices outside that scope are rejected. Used by the search UI (`_search`) and by the source-cleanup " +
            "flow (`_delete_by_query`).",
        operationId: "elasticsearchQuery",
        // The agent never composes Elasticsearch DSL: the tool below freezes the whole query shape
        // and only interpolates its declared parameters, so `_delete_by_query` and any other
        // operation of this route stay out of reach.
        "x-mcp": {
            tools: [
                {
                    name: "sls_search_labels",
                    access: "read",
                    description:
                        "Turns a natural-language phrase into concrete ontology node URIs, scored and typo-tolerant, across one or more Elasticsearch indices. " +
                        "Recommended FIRST call for any domain term: every node tool needs a URI, and this is what produces one from a user's words. " +
                        "Returns ranked hits with score, index, id, label, type and parents. " +
                        'The ranking is global across the indices searched, not per index, so this answers "where is the best match" and never "which sources contain the term" — ' +
                        "a single index whose label is exactly the searched word takes every slot. Use sls_count_labels_by_source for that second question, then come back here per index.",
                    params: {
                        text: { type: "string", required: true, description: "Phrase to search for." },
                        indexes: {
                            type: "string[]",
                            required: true,
                            description:
                                "Index names to search, from sls_list_indexes. One call over ten indices costs the same as one call over one, so pass every plausible index " +
                                "when you are looking for the best match. To cover a specific source, pass that index alone: in a wide search its hits are ranked against " +
                                "everything else and can fall below the cut with no trace.",
                        },
                        size: { type: "number", description: "Maximum number of hits, counted across all indices together, not per index.", default: 10 },
                        fuzziness: { type: "string", description: 'Edit distance tolerated: "AUTO", "0" for exact matching, "1" or "2".', default: "AUTO" },
                    },
                    body: { url: "_search", indexes: "{indexes}", query: { size: "{size}", query: { match: { label: { query: "{text}", fuzziness: "{fuzziness}" } } } } },
                    resultShape: "elasticHits",
                    // `size` hits back means the ranking was cut there, and the hits below the cut are
                    // the ones a caller searching a specific source most often wanted.
                    rowCeiling: { param: "size", escalation: "elastic" },
                    statusHints: { 500: "Elasticsearch is unreachable or the index does not exist. Check the index name with sls_list_indexes." },
                },
                {
                    name: "sls_count_labels_by_source",
                    access: "read",
                    description:
                        "Counts how many labels match a phrase in each index, exhaustively, in one call. " +
                        'This is the tool for "which sources talk about X": it returns every index holding a match with its count, where a ranked search returns only a global top-K ' +
                        "and silently drops the sources that rank lower. Returns no URI — follow up with sls_search_labels on the indices worth reading. " +
                        'A multi-word phrase counts labels containing every word, not any of them, so "centrifugal pump" is not a synonym of "pump" here — unlike in sls_search_labels, ' +
                        "which ranks partial matches instead of dropping them.",
                    params: {
                        text: { type: "string", required: true, description: "Phrase to count matches for." },
                        indexes: { type: "string[]", required: true, description: "Index names to cover, from sls_list_indexes. Pass all of them: the cost does not grow with the count." },
                        fuzziness: { type: "string", description: 'Edit distance tolerated: "AUTO", "0" for exact matching, "1" or "2".', default: "AUTO" },
                    },
                    // size 0 asks Elasticsearch for the aggregation without any document, and the
                    // terms size caps the number of indices reported — well above the cluster's count.
                    //
                    // operator "and" because Elasticsearch defaults a match query to OR: counting
                    // "centrifugal pump" would then count every label holding either word, which on
                    // this instance returned exactly the figures of "pump" alone — 22 sources and
                    // 5 488 matches in the largest, against 14 and 120 once both words are required.
                    // A one-word phrase is unaffected.
                    body: {
                        url: "_search",
                        indexes: "{indexes}",
                        query: {
                            size: 0,
                            query: { match: { label: { query: "{text}", fuzziness: "{fuzziness}", operator: "and" } } },
                            aggs: { sources: { terms: { field: "_index", size: 1000 } } },
                        },
                    },
                    resultShape: "elasticIndexCounts",
                    statusHints: { 500: "Elasticsearch is unreachable or one of the indices does not exist. Check the names with sls_list_indexes." },
                },
            ],
        },
        parameters: [
            {
                name: "body",
                description: "Elasticsearch operation payload.",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["url", "query", "indexes"],
                    properties: {
                        url: {
                            type: "string",
                            description: "Elasticsearch endpoint suffix appended to the indices, e.g. `_search` or `_delete_by_query`.",
                            example: "_search",
                        },
                        query: {
                            type: "object",
                            description: "Raw Elasticsearch query DSL body forwarded as-is.",
                            example: { query: { match: { label: "asset" } }, size: 10 },
                        },
                        indexes: {
                            type: "array",
                            items: { type: "string" },
                            description: "Indices to target (lowercase source names). Filtered by user access.",
                            example: ["iof_core"],
                        },
                    },
                    example: {
                        url: "_search",
                        indexes: ["iof_core"],
                        query: { query: { match: { label: "asset" } }, size: 10 },
                    },
                },
            },
        ],

        responses: {
            200: {
                description: "Raw Elasticsearch response body (passes through `hits`, `aggregations`, `deleted`, etc.).",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    example: {
                        took: 4,
                        timed_out: false,
                        hits: {
                            total: { value: 1, relation: "eq" },
                            hits: [
                                {
                                    _index: "iof_core",
                                    _id: "abc123",
                                    _score: 1.0,
                                    _source: { id: "http://example.org/Asset", label: "Asset" },
                                },
                            ],
                        },
                    },
                },
            },
            403: {
                description: "Caller has no read access to one of the requested `indexes`.",
            },
            500: {
                description: "Elasticsearch error or proxy failure.",
            },
        },
        tags: ["ElasticSearch"],
    };

    return operations;
}
