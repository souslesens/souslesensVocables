/**
 * Executes one MCP tool call by translating it into an SLS API request.
 *
 * Nothing here re-implements an access control: bin/sparqlQueriesRunner.js already checks that the
 * function is exposed, that the required parameters are present and that every source-shaped
 * parameter belongs to the caller's allowed sources, before handing over to RemoteCodeRunner.
 * This module only carries format conversion — templates in, SLS request out, flattened rows back —
 * plus the one policy this server owns: V1 is read-only.
 */

import { mcpConfig } from "./config.js";
import { slsRequest } from "./slsClient.js";
import { readPage } from "./resultStore.js";

const wholePlaceholderRegex = /^\{(\w+)\}$/;
const templatePlaceholderRegex = /\{(\w+)\}/g;

// A missing value means "this optional parameter was not supplied", which must remove the key
// rather than send the literal placeholder to SLS.
const unresolved = Symbol("unresolved");

/**
 * Resolve one template value against the agent's arguments.
 *
 * A string that is exactly one placeholder yields the raw value, so an array parameter stays an
 * array; a string that merely contains placeholders is interpolated. Objects and arrays recurse,
 * anything else is a frozen literal.
 * @param {*} templateValue
 * @param {object} toolArguments
 * @returns {*} The resolved value, or the `unresolved` symbol when a placeholder has no value
 */
function resolveTemplate(templateValue, toolArguments) {
    if (typeof templateValue === "string") {
        const wholeMatch = templateValue.match(wholePlaceholderRegex);
        if (wholeMatch) {
            const rawValue = toolArguments[wholeMatch[1]];
            return rawValue === undefined || rawValue === null ? unresolved : rawValue;
        }
        let sawMissingPlaceholder = false;
        const interpolated = templateValue.replace(templatePlaceholderRegex, function (_wholeMatch, parameterName) {
            const rawValue = toolArguments[parameterName];
            if (rawValue === undefined || rawValue === null || rawValue === "") {
                sawMissingPlaceholder = true;
                return "";
            }
            return String(rawValue);
        });
        return sawMissingPlaceholder ? unresolved : interpolated;
    }

    if (Array.isArray(templateValue)) {
        const resolvedItems = [];
        for (const item of templateValue) {
            const resolvedItem = resolveTemplate(item, toolArguments);
            if (resolvedItem !== unresolved) {
                resolvedItems.push(resolvedItem);
            }
        }
        return resolvedItems;
    }

    if (templateValue && typeof templateValue === "object") {
        return resolveTemplateObject(templateValue, toolArguments);
    }

    return templateValue;
}

function resolveTemplateObject(templateObject, toolArguments) {
    const resolvedObject = {};
    for (const [key, templateValue] of Object.entries(templateObject)) {
        const resolvedValue = resolveTemplate(templateValue, toolArguments);
        if (resolvedValue !== unresolved) {
            resolvedObject[key] = resolvedValue;
        }
    }
    return resolvedObject;
}

// ---------------------------------------------------------------------------
// Result flattening
// ---------------------------------------------------------------------------

// Everything a binding cell may carry besides its value. Recognising the cell by "value plus only
// these" rather than by the presence of `type` also catches the bare `{value}` cells that
// Sparql_generic.setBindingsOptionalProperties synthesises for optional variables.
const bindingCellMetadataKeys = ["type", "datatype", "xml:lang", "lang"];

/**
 * A SPARQL binding cell is `{value, type?, "xml:lang"?, datatype?}`. Only the value carries meaning
 * for an agent, and keeping the wrapper multiplies the payload size for nothing.
 * @param {*} candidate
 * @returns {boolean}
 */
function isBindingCell(candidate) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) || !("value" in candidate)) {
        return false;
    }
    const otherKeys = Object.keys(candidate).filter((key) => key !== "value");
    return otherKeys.every((key) => bindingCellMetadataKeys.includes(key));
}

// Virtuoso does not answer `type: "bnode"` reliably and hands blank nodes back as `nodeID://…`
// IRIs, so the value has to be tested too. `_:` covers the stores that do it the standard way.
const blankNodeValueRegex = /^(nodeID:\/\/|_:)/;

/**
 * Flatten one row of bindings, keeping the metadata that would otherwise be lost as sibling keys.
 *
 * A cell's value is all an agent normally needs, but three things it carries do change an answer:
 * the language of a label, the datatype of a literal, and whether an identifier is a blank node,
 * which decides whether the agent can query it directly or must reach it through an inverse
 * lookup. Each is emitted only when present, so the common cell still costs one key.
 * @param {object} row
 * @returns {object|null} Null when the row held no binding cell at all
 */
function flattenBindingRow(row) {
    const flatRow = {};
    let sawCell = false;
    for (const [variableName, cell] of Object.entries(row)) {
        if (!isBindingCell(cell)) {
            flatRow[variableName] = cell;
            continue;
        }
        sawCell = true;
        flatRow[variableName] = cell.value;

        const languageTag = cell["xml:lang"] || cell.lang;
        if (languageTag) {
            flatRow[`${variableName}Lang`] = languageTag;
        }
        if (cell.datatype) {
            flatRow[`${variableName}Datatype`] = cell.datatype;
        }
        if (cell.type === "bnode" || (typeof cell.value === "string" && blankNodeValueRegex.test(cell.value))) {
            flatRow[`${variableName}IsBlankNode`] = true;
        }
    }
    return sawCell ? flatRow : null;
}

/**
 * Reduce SPARQL bindings to plain `{variable: value}` rows, wherever they appear in the payload.
 * Recognises the two shapes SLS actually returns: a bare array of bindings, and the full
 * `{head, results: {bindings}}` envelope.
 * @param {*} payload
 * @returns {*} The payload with its bindings flattened, unchanged when it holds none
 */
export function flattenSparqlResult(payload) {
    if (Array.isArray(payload)) {
        const flatRows = [];
        let flattenedAny = false;
        for (const row of payload) {
            if (row && typeof row === "object" && !Array.isArray(row)) {
                const flatRow = flattenBindingRow(row);
                if (flatRow) {
                    flatRows.push(flatRow);
                    flattenedAny = true;
                    continue;
                }
            }
            flatRows.push(row);
        }
        return flattenedAny ? flatRows : payload;
    }

    if (!payload || typeof payload !== "object") {
        return payload;
    }

    if (payload.results && Array.isArray(payload.results.bindings)) {
        return { ...payload, results: { ...payload.results, bindings: flattenSparqlResult(payload.results.bindings) } };
    }
    return payload;
}

/**
 * Reduce an Elasticsearch response to the ranked hits an agent can act on.
 * Declared by a route through `x-mcp.resultShape: "elasticHits"`.
 * @param {*} elasticResponse
 * @returns {object}
 */
function shapeElasticHits(elasticResponse) {
    const hitsEnvelope = elasticResponse && elasticResponse.hits;
    const rawHits = hitsEnvelope && Array.isArray(hitsEnvelope.hits) ? hitsEnvelope.hits : [];

    const flatHits = [];
    for (const hit of rawHits) {
        const hitSource = hit._source || {};
        flatHits.push({ score: hit._score, index: hit._index, id: hitSource.id, label: hitSource.label, type: hitSource.type, parents: hitSource.parents });
    }

    return { ...describeElasticTotal(hitsEnvelope), hits: flatHits };
}

/**
 * Read an Elasticsearch hit total, saying so when the figure is only a floor.
 *
 * Elasticsearch stops counting at 10 000 and reports `{value: 10000, relation: "gte"}`. Returning
 * the bare value invites an agent to state "10 000 labels match" as a fact — a fabricated figure
 * built out of a real one, which is the failure mode `instructions.md` opens with.
 * @param {*} hitsEnvelope - the `hits` object of an Elasticsearch response
 * @returns {{totalMatches: number, totalMatchesIsLowerBound?: boolean}}
 */
function describeElasticTotal(hitsEnvelope) {
    const totalEnvelope = hitsEnvelope && hitsEnvelope.total;
    if (!totalEnvelope || typeof totalEnvelope !== "object") {
        return { totalMatches: totalEnvelope };
    }
    const total = { totalMatches: totalEnvelope.value };
    if (totalEnvelope.relation === "gte") {
        total.totalMatchesIsLowerBound = true;
    }
    return total;
}

/**
 * Reduce the source registry to what an agent needs to pick a source and query it correctly.
 *
 * Declared by a route through `x-mcp.resultShape: "sourceCards"`. Drops the operational fields
 * (`color`, `owner`, `published`, `prefix`, `sparql_server`) that carry nothing for an agent and,
 * across the whole accessible list, cost more than everything else combined.
 * @param {*} sourcesResponse - `{resources: {name: sourceEntry}}`
 * @returns {object[]}
 */
function shapeSourceCards(sourcesResponse) {
    const sourceEntries = sourcesResponse && sourcesResponse.resources ? sourcesResponse.resources : {};

    const cards = [];
    for (const [sourceName, sourceEntry] of Object.entries(sourceEntries)) {
        const card = { name: sourceName, schemaType: sourceEntry.schemaType, controller: sourceEntry.controller, graphUri: sourceEntry.graphUri };
        if (sourceEntry.imports && sourceEntry.imports.length > 0) {
            card.imports = sourceEntry.imports;
        }
        // The language a source labels its concepts in, and the predicate it uses for the
        // hierarchy: the two things that change how an answer about it must be read. Both are
        // routinely left empty in sources.json, and an empty string tells an agent nothing.
        if (sourceEntry.predicates) {
            if (sourceEntry.predicates.lang) {
                card.lang = sourceEntry.predicates.lang;
            }
            if (sourceEntry.predicates.broaderPredicate) {
                card.broaderPredicate = sourceEntry.predicates.broaderPredicate;
            }
        }
        cards.push(card);
    }
    cards.sort((firstCard, secondCard) => firstCard.name.localeCompare(secondCard.name));
    return cards;
}

/**
 * Reduce an Elasticsearch `_index` terms aggregation to one row per source.
 *
 * Declared by a route through `x-mcp.resultShape: "elasticIndexCounts"`. A ranked multi-index
 * search answers "does this term exist", never "which sources hold it": it returns a single global
 * top-K, and one index whose label is exactly the searched word takes every slot. The aggregation
 * is the answer to the second question, and it costs one call.
 * @param {*} elasticResponse - `{hits: {total}, aggregations: {sources: {buckets}}}`
 * @returns {{totalMatches: number, sources: object[]}}
 */
function shapeElasticIndexCounts(elasticResponse) {
    const aggregations = elasticResponse && elasticResponse.aggregations;
    const sourcesAggregation = aggregations && aggregations.sources;
    const buckets = sourcesAggregation && Array.isArray(sourcesAggregation.buckets) ? sourcesAggregation.buckets : [];

    const countedSources = [];
    for (const bucket of buckets) {
        countedSources.push({ index: bucket.key, matches: bucket.doc_count });
    }

    // The per-source counts are exact whatever the total says: only the grand total stops at 10 000.
    return { ...describeElasticTotal(elasticResponse && elasticResponse.hits), sources: countedSources };
}

/**
 * Reduce a raw `readdir` of a mapping directory to the names sls_mapping_get accepts.
 *
 * Declared by a route through `x-mcp.resultShape: "mappingFileNames"`. `dataController.getFilesList`
 * returns every entry of the directory as it stands on disk, and those directories hold editor
 * backups (`lifex_dalia_db.json-19-12`) beside the mappings. Listing them hands an agent names that
 * sls_mapping_get answers 404 on, since it reads `{dataSource}.json`: the two tools must agree on
 * one vocabulary, which is the mapping name without its extension.
 * @param {*} fileNames - directory entries as returned by readdir
 * @returns {string[]}
 */
function shapeMappingFileNames(fileNames) {
    const jsonExtension = ".json";
    const entries = Array.isArray(fileNames) ? fileNames : [];

    const mappingNames = [];
    for (const fileName of entries) {
        if (typeof fileName !== "string" || !fileName.endsWith(jsonExtension)) {
            continue;
        }
        const mappingName = fileName.slice(0, -jsonExtension.length);
        if (mappingName.length > 0) {
            mappingNames.push(mappingName);
        }
    }
    mappingNames.sort((firstName, secondName) => firstName.localeCompare(secondName));
    return mappingNames;
}

const resultShapers = { elasticHits: shapeElasticHits, elasticIndexCounts: shapeElasticIndexCounts, mappingFileNames: shapeMappingFileNames, sourceCards: shapeSourceCards };

// Exported so catalog.js can reject an `x-mcp` asking for a shape nobody implements, at boot rather
// than on the first call.
export const resultShapeNames = Object.keys(resultShapers);

// ---------------------------------------------------------------------------
// SPARQL family
// ---------------------------------------------------------------------------

/**
 * Whether a registry function accepts `options.limit`, which is where the default row cap goes.
 * @param {object} registryEntry
 * @returns {boolean}
 */
function acceptsLimitOption(registryEntry) {
    const optionsParam = registryEntry.params.find((param) => param.name === "options");
    return Boolean(optionsParam && optionsParam.properties && optionsParam.properties.some((optionProperty) => optionProperty.name === "limit"));
}

/**
 * Maps every top-level key of a payload that carries rows to how many it carries.
 *
 * An array counts itself, and an object whose own values are arrays counts the sum of those
 * (`{hierarchies: {id: [...]}}`). An object with no arrays inside falls back to its own key count, but
 * only once there are two or more such fallback candidates to set side by side, as in
 * `{classesMap: {...2834 entries}, labels: {}}`: a lone one is indistinguishable from a single
 * document's own fields (`{someDocument: {key: "value"}}`) and is left out rather than guessed at.
 * @param {*} payload
 * @returns {Object<string, number>} One entry per row-bearing key, empty when the payload has none
 */
function rowCountsByKey(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return {};
    }
    const strictCounts = {};
    const fallbackCounts = {};
    for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value)) {
            strictCounts[key] = value.length;
            continue;
        }
        if (value && typeof value === "object") {
            const nestedArrays = Object.values(value).filter(Array.isArray);
            if (nestedArrays.length > 0) {
                strictCounts[key] = nestedArrays.reduce((total, array) => total + array.length, 0);
            } else {
                fallbackCounts[key] = Object.keys(value).length;
            }
        }
    }
    if (Object.keys(fallbackCounts).length < 2 && Object.keys(strictCounts).length === 0) {
        return {};
    }
    return { ...strictCounts, ...fallbackCounts };
}

/**
 * A single figure for comparing a count against a limit, valid only when the payload resolves to
 * exactly one row-bearing shape. Two distinct ones at once (say a results array and a separate
 * warnings array) are not summed together: nothing here knows whether they count the same kind of
 * thing, so `rowCeilingNotice` falls back to reporting the breakdown from `rowCountsByKey` instead.
 * @param {*} payload - Flattened tool payload, in any of the shapes the SPARQL layer returns
 * @returns {number|null} Row count, or null when it is zero or ambiguous
 */
function countPayloadRows(payload) {
    if (Array.isArray(payload)) {
        return payload.length;
    }
    const counts = rowCountsByKey(payload);
    const countedKeys = Object.keys(counts);
    if (countedKeys.length === 1) {
        return counts[countedKeys[0]];
    }
    if (countedKeys.length === 0 && payload && typeof payload === "object") {
        // Nothing countable one level in: the payload may itself be a flat map of rows (getLabelsMap's
        // {uri: label, ...}), but a single key here is a document's own field, not a row, same as above.
        const ownKeyCount = Object.keys(payload).length;
        return ownKeyCount >= 2 ? ownKeyCount : null;
    }
    return null;
}

// Above this many rows, an answer is large enough that mistaking a prefix for the whole set changes a
// conclusion, so an unprovable claim of completeness is worth stating. Below it, saying so on every
// call would be noise. Same threshold as /sparql/select, for the same reason.
const rowCountWorthDoubting = 1000;

// What to do about a cut, per family of tool. A hint that names the wrong next tool is worse than no
// hint: it sends the agent to an endpoint that cannot answer the question it was told to ask.
const escalationForSparql =
    `Establish the real total with sls_sparql_select and SELECT (COUNT(*) AS ?total) on the same pattern before quoting a figure, ` +
    `then either raise options.limit to cover it, narrow the question, or hand the same pattern to sls_sparql_select with collect true, which walks the whole set against the endpoint. ` +
    `That answer can still be too large for one response: if so, its own truncation notice names sls_result_page, which searches it without reading it all.`;
const escalationForElastic =
    `Hits are returned best-scoring first, so what is missing is the weaker matches, not a random remainder. ` +
    `Raise size to see further down the ranking, or get exact per-index totals with sls_count_labels_by_source, which counts rather than lists.`;

/**
 * Say what this answer does and does not prove about its own completeness.
 *
 * A tool that answers with rows and nothing else is the failure this exists to prevent: no total, no
 * flag, no sign of what ended the list. An agent that asked for 10000 and received exactly 10000
 * cannot tell a complete answer from the first page of half a million, and reports the prefix as the
 * set. Measured case: 10000 notifications announced as the whole list, against 100741 in the graph.
 *
 * Three ceilings can cut an answer and the caller sees none of them: the limit this server injects,
 * the one a catalog function carries in its own query text, and the endpoint's `ResultSetMaxRows`,
 * which Virtuoso applies while announcing nothing. So `/sparqlQueries/run` measures the first two on
 * the queries it actually sent and discovers the third, and reports all three in a header. With them,
 * `complete` is a real answer. Without them the notice still goes out, saying "unknown" rather than
 * nothing at all: silence is what an agent reads as completeness.
 *
 * @param {*} payload - Flattened tool payload, in any of the shapes the SPARQL layer returns
 * @param {object} ceilingContext
 * @param {number|undefined} ceilingContext.appliedRowLimit - Ceiling this server asked for, when it asked for one
 * @param {object|null} [ceilingContext.sparqlExecution] - Facts reported by the route about the queries it ran
 * @param {string} ceilingContext.escalation - What the agent should do next about a cut
 * @returns {object|null} Notice for the response envelope; `returnedRows` when the payload resolves to
 *   one row-bearing shape, `rowCountsByKey` instead when it has none or several and the queries this
 *   call ran are still known; null when neither the payload nor the queries have anything to report
 */
export function rowCeilingNotice(payload, ceilingContext) {
    const returnedRows = countPayloadRows(payload);
    const { appliedRowLimit, sparqlExecution, escalation } = ceilingContext;

    // The route measured the queries themselves, which is the only account that covers a limit this
    // server never chose. Only the last query decides: one query, one answer, and a full last block
    // is a cut. A function that pages internally ends either on a ceiling, its last block full, or
    // on the end of the data, its last block short. The same test reads both.
    if (sparqlExecution && sparqlExecution.queryCount > 0) {
        const { lastLimit, lastRows, endpointCeiling } = sparqlExecution;
        let knownCeiling = null;
        if (lastLimit && endpointCeiling) {
            knownCeiling = Math.min(lastLimit, endpointCeiling);
        } else if (lastLimit || endpointCeiling) {
            knownCeiling = lastLimit || endpointCeiling;
        }

        const atKnownCeiling = knownCeiling !== null && lastRows >= knownCeiling;
        // Below a ceiling nobody declared, an unannounced cut and a whole answer are the same
        // observation. Only a known endpoint cap turns "not at our limit" into "complete".
        let completeness = "unknown";
        if (atKnownCeiling) {
            completeness = false;
        } else if (endpointCeiling) {
            completeness = true;
        }

        const notice = { knownCeiling: knownCeiling, atKnownCeiling: atKnownCeiling, complete: completeness };
        if (returnedRows === null) {
            // The payload has none or several row-bearing keys, so no single count can be vouched for:
            // report what was actually found under each key instead of staying silent about the cut.
            notice.rowCountsByKey = rowCountsByKey(payload);
        } else {
            notice.returnedRows = returnedRows;
        }

        if (atKnownCeiling) {
            const whichCeiling =
                endpointCeiling && knownCeiling === endpointCeiling
                    ? `the endpoint's own cap of ${endpointCeiling} rows, which it applies without announcing it`
                    : `the LIMIT of ${knownCeiling} the query carried`;
            notice.hint =
                `Cut: the last query this call ran came back with ${lastRows} rows against ${whichCeiling}, so this is a prefix of the result, not the result. ` +
                `Never present it to the user as the whole set. ${escalation}`;
        } else if (completeness === "unknown" && returnedRows !== null && returnedRows >= rowCountWorthDoubting) {
            notice.hint =
                `Possibly cut: nothing here proves this answer is whole, because this endpoint's own row cap could not be established and endpoints truncate silently. ` +
                `Do not call it the whole set until a count agrees with it. ${escalation}`;
        }
        return notice;
    }

    // Below this point every branch compares returnedRows against a limit, which needs one resolved
    // count: a payload with none or several row-bearing keys has nothing to report here.
    if (returnedRows === null) {
        return null;
    }

    // A search engine counts what it did not return, so completeness needs no inference here. The
    // count is a floor rather than a figure past 10000 matches, and `describeElasticTotal` says so.
    if (payload && typeof payload.totalMatches === "number" && !payload.totalMatchesIsLowerBound) {
        const isComplete = returnedRows >= payload.totalMatches;
        const notice = { returnedRows: returnedRows, knownCeiling: appliedRowLimit ?? null, atKnownCeiling: !isComplete, complete: isComplete };
        if (!isComplete) {
            notice.hint = `Cut: ${returnedRows} of ${payload.totalMatches} matches came back. ${escalation}`;
        }
        return notice;
    }

    // No account from the route: all that is left is the limit this server asked for, and the count.
    if (appliedRowLimit && returnedRows === appliedRowLimit) {
        return {
            returnedRows: returnedRows,
            knownCeiling: appliedRowLimit,
            atKnownCeiling: true,
            complete: false,
            hint: `Cut: ${returnedRows} rows is exactly the limit in force, so this is a prefix of the result, not the result. Never present it to the user as the whole set. ${escalation}`,
        };
    }
    // Overshoot rather than a cut: several catalog functions page internally and stop on the first
    // page that crosses the limit, so they return whole pages and the limit bounded nothing.
    if (appliedRowLimit && returnedRows > appliedRowLimit) {
        return {
            returnedRows: returnedRows,
            knownCeiling: appliedRowLimit,
            atKnownCeiling: false,
            complete: "unknown",
            hint: `${returnedRows} rows came back for a limit of ${appliedRowLimit}: this function pages internally and returns whole pages, so the limit bounded nothing and says nothing about completeness. ${escalation}`,
        };
    }

    const notice = { returnedRows: returnedRows, knownCeiling: appliedRowLimit ?? null, atKnownCeiling: false, complete: "unknown" };
    if (returnedRows >= rowCountWorthDoubting) {
        notice.hint = `Possibly cut: this call reported no ceiling of its own, and ${returnedRows} rows is large enough that a silent truncation would change a conclusion. ${escalation}`;
    }
    return notice;
}

// Only the base URI cell of a level (`child1`, `child2`, …), never its `child1Label`/`child1Type`/
// `child1IsBlankNode` siblings, which is why the digits must run to the end of the key.
const childDepthKeyRegex = /^child(\d+)$/;

/**
 * How many `descendantsDepth` levels actually carried data, against how many were asked for.
 *
 * A row exposes `child1`..`childN` only for the levels the recursive `OPTIONAL` chain in
 * `getNodeChildren` actually bound: an unbound optional variable is absent from the SPARQL JSON row
 * entirely, not present with a null value. So the highest bound `childN` across every row is the
 * true depth reached, and it is the only way to tell "the hierarchy genuinely ends here" apart from
 * "the depth parameter did nothing" — both look identical otherwise (SLS-02).
 * @param {*} rows - Flattened tool payload, expected to be an array of child rows
 * @param {number} requestedDepth
 * @returns {object|null} `{requestedDepth, depthReached, hint?}`, or null when the payload is not row-shaped
 */
function depthReachedNotice(rows, requestedDepth) {
    if (!Array.isArray(rows) || !Number.isFinite(requestedDepth)) {
        return null;
    }
    let depthReached = 0;
    for (const row of rows) {
        if (!row || typeof row !== "object") {
            continue;
        }
        for (const [key, value] of Object.entries(row)) {
            const depthMatch = key.match(childDepthKeyRegex);
            if (depthMatch && value !== null && value !== undefined && Number(depthMatch[1]) > depthReached) {
                depthReached = Number(depthMatch[1]);
            }
        }
    }
    const notice = { requestedDepth: requestedDepth, depthReached: depthReached };
    if (rows.length === 0) {
        // No row at all, not just a missing deeper key: child1 is bound by the query's base pattern
        // whenever any row matches, so an empty result is a plain "no children", nothing to re-query.
        notice.hint = `Requested depth ${requestedDepth}, but the query returned no rows: this node has no children at any depth, not an ambiguous partial result.`;
    } else if (depthReached < requestedDepth) {
        notice.hint =
            `Requested depth ${requestedDepth}, but no row carries a bound child${depthReached + 1}. ` +
            `This may mean the hierarchy genuinely ends at depth ${depthReached}, or that levels past it were never reached — ` +
            `call sls_node_children again on the child${depthReached} URIs to tell the two apart before reporting the hierarchy as complete.`;
    }
    return notice;
}

/**
 * Run a promoted registry function: agent arguments already use the function's own parameter names,
 * so only the `@mcpFixed` values and the default limit are added.
 * @param {object} descriptor
 * @param {object} toolArguments
 */
async function executeSparqlTool(descriptor, toolArguments) {
    const namedParams = { ...toolArguments, ...descriptor.fixedParams };

    const optionsParam = descriptor.registryEntry.params.find((param) => param.name === "options");
    if (optionsParam) {
        const suppliedOptions = toolArguments.options && typeof toolArguments.options === "object" ? toolArguments.options : {};
        const options = { ...suppliedOptions, ...descriptor.fixedOptions };
        if (acceptsLimitOption(descriptor.registryEntry) && options.limit === undefined) {
            options.limit = mcpConfig.defaultSparqlLimit;
        }
        namedParams.options = options;
    }

    const result = await slsRequest("POST", "/sparqlQueries/run", { body: { name: descriptor.functionName, module: descriptor.module, params: namedParams } });
    if (!result.ok) {
        return result;
    }
    const flattenedData = flattenSparqlResult(result.data);
    const ceilingContext = { appliedRowLimit: namedParams.options?.limit, sparqlExecution: result.sparqlExecution, escalation: escalationForSparql };
    const response = { ...result, data: flattenedData, rowCeiling: rowCeilingNotice(flattenedData, ceilingContext) };
    if (namedParams.descendantsDepth !== undefined) {
        response.depthCeiling = depthReachedNotice(flattenedData, Number(namedParams.descendantsDepth));
    }
    return response;
}

// ---------------------------------------------------------------------------
// Document navigation
//
// For a whole-document answer there is no narrower tool to fall back on: nothing serves a part of a
// mapping file. So the way to avoid reading all of it is to reach inside it, which is what `_select`
// and `_grep` do — the same move an agent makes when it greps a source file instead of opening it.
// ---------------------------------------------------------------------------

/**
 * Walk a dotted path into a document.
 * @param {*} document
 * @param {string} selectPath
 * @returns {{value: *, error: string|null}}
 */
function selectDocumentPath(document, selectPath) {
    const pathSegments = selectPath.split(".");
    let currentValue = document;

    for (const segment of pathSegments) {
        if (!currentValue || typeof currentValue !== "object") {
            return { value: null, error: `"${selectPath}" cannot be followed: "${segment}" is not inside an object or an array.` };
        }
        if (!(segment in currentValue)) {
            const availableKeys = Object.keys(currentValue).slice(0, 40);
            return { value: null, error: `"${selectPath}" has no "${segment}". Available at that level: ${availableKeys.join(", ")}${Object.keys(currentValue).length > 40 ? ", …" : ""}.` };
        }
        currentValue = currentValue[segment];
    }
    return { value: currentValue, error: null };
}

/**
 * Keep the entries of an object or an array whose key or content contains a text.
 *
 * Plain substring, case-insensitive, never a regular expression: an agent-supplied pattern is an
 * agent-supplied way to make the server work hard for nothing.
 * @param {*} document
 * @param {string} grepText
 * @returns {object}
 */
function grepDocument(document, grepText) {
    const needle = grepText.toLowerCase();

    if (Array.isArray(document)) {
        const matchedItems = document.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
        return { grep: grepText, totalEntries: document.length, matchedEntries: matchedItems.length, entries: matchedItems };
    }
    if (document && typeof document === "object") {
        const matchedEntries = {};
        let matchedCount = 0;
        for (const [key, value] of Object.entries(document)) {
            const serializedValue = JSON.stringify(value);
            if (key.toLowerCase().includes(needle) || (serializedValue && serializedValue.toLowerCase().includes(needle))) {
                matchedEntries[key] = value;
                matchedCount += 1;
            }
        }
        return { grep: grepText, totalEntries: Object.keys(document).length, matchedEntries: matchedCount, entries: matchedEntries };
    }
    return { grep: grepText, totalEntries: 0, matchedEntries: 0, entries: null };
}

/**
 * Apply `_select` then `_grep` to a document answer.
 * @param {*} document
 * @param {object} toolArguments
 * @returns {{value: *, error: string|null}}
 */
function navigateDocument(document, toolArguments) {
    let currentValue = document;

    if (toolArguments._select) {
        const selection = selectDocumentPath(currentValue, toolArguments._select);
        if (selection.error) {
            return { value: null, error: selection.error };
        }
        currentValue = selection.value;
    }
    if (toolArguments._grep) {
        currentValue = grepDocument(currentValue, toolArguments._grep);
    }
    return { value: currentValue, error: null };
}

// ---------------------------------------------------------------------------
// REST family
// ---------------------------------------------------------------------------

/**
 * Apply a route's `registryFunctionGuard`: the declaration says which arguments name a catalog
 * function, and this server refuses anything that is not an `@expose read` entry of an allowed
 * module. That is what keeps the generic runner from becoming a way around the read-only rule.
 * @param {object} guard
 * @param {Map<string, object>} registryByKey
 * @param {object} toolArguments
 * @returns {{registryEntry: object|null, refusal: object|null}}
 */
function resolveGuardedFunction(guard, registryByKey, toolArguments) {
    const moduleName = toolArguments[guard.moduleParam];
    const functionName = toolArguments[guard.nameParam];
    const functionKey = `${moduleName}.${functionName}`;

    if (guard.allowedModules && !guard.allowedModules.includes(moduleName)) {
        const refusal = {
            ok: false,
            status: 403,
            data: null,
            errorMessage: `Module "${moduleName}" is not reachable from here. Use one of: ${guard.allowedModules.join(", ")}.`,
            url: null,
        };
        return { registryEntry: null, refusal: refusal };
    }

    const registryEntry = registryByKey.get(functionKey);
    if (!registryEntry || registryEntry.access !== guard.requireAccess) {
        const refusal = {
            ok: false,
            status: 403,
            data: null,
            errorMessage: `"${functionKey}" is not callable: it is either unknown, not exposed, or a write operation. List the callable functions with sls_list_query_functions.`,
            url: null,
        };
        return { registryEntry: null, refusal: refusal };
    }
    return { registryEntry: registryEntry, refusal: null };
}

/**
 * The request is built only from the route's declared templates, so a query or body key the
 * declaration does not mention can never be set by an agent.
 * @param {object} descriptor
 * @param {Map<string, object>} registryByKey
 * @param {object} toolArguments
 */
async function executeRestTool(descriptor, registryByKey, toolArguments) {
    const effectiveArguments = { ...descriptor.paramDefaults, ...toolArguments };
    // A ceiling this server knows it asked for. The generic runner sets it from the injected
    // `options.limit`; a route declaring `rowCeiling` sets it from the parameter it named. Routes that
    // merely list what exists cap nothing and leave it undefined, so they get no notice: telling an
    // agent that the list of sources might be cut would be a doubt about nothing.
    let appliedRowLimit;
    let escalation = escalationForSparql;

    if (descriptor.rowCeiling) {
        appliedRowLimit = Number(effectiveArguments[descriptor.rowCeiling.param]) || undefined;
        escalation = descriptor.rowCeiling.escalation === "elastic" ? escalationForElastic : escalationForSparql;
    }

    if (descriptor.registryFunctionGuard) {
        const { registryEntry, refusal } = resolveGuardedFunction(descriptor.registryFunctionGuard, registryByKey, effectiveArguments);
        if (refusal) {
            return refusal;
        }
        const suppliedParams = effectiveArguments.params && typeof effectiveArguments.params === "object" ? { ...effectiveArguments.params } : {};
        const optionsParam = registryEntry.params.find((param) => param.name === "options");
        if (optionsParam) {
            const options = suppliedParams.options && typeof suppliedParams.options === "object" ? { ...suppliedParams.options } : {};
            // The route injects returnQueryStr itself; an agent-supplied value would contradict it.
            delete options.returnQueryStr;
            if (acceptsLimitOption(registryEntry) && options.limit === undefined) {
                options.limit = mcpConfig.defaultSparqlLimit;
            }
            suppliedParams.options = options;
            appliedRowLimit = options.limit;
        }
        effectiveArguments.params = suppliedParams;
    }

    const requestOptions = {};
    if (descriptor.query) {
        requestOptions.query = resolveTemplateObject(descriptor.query, effectiveArguments);
    }
    if (descriptor.body) {
        requestOptions.body = resolveTemplateObject(descriptor.body, effectiveArguments);
    }

    const result = await slsRequest(descriptor.httpMethod, descriptor.route, requestOptions);

    if (!result.ok) {
        // Some routes fail with a status that names a normal, expected state rather than a fault
        // (SLS-06): nothing configured yet, nobody has built the resource. Surfacing that as a failed
        // tool call sends an agent looking for a bug that is not there; answering with a bare empty
        // object risks the opposite mistake, read as proof the source genuinely has none. Neither is
        // right, so this becomes an ordinary successful answer carrying only the notice.
        if (descriptor.normalAbsence && result.status === descriptor.normalAbsence.status) {
            return { ...result, ok: true, status: 200, errorMessage: null, data: { available: false, notice: descriptor.normalAbsence.notice } };
        }
        const hint = descriptor.statusHints[result.status];
        return hint ? { ...result, errorMessage: hint } : result;
    }

    let shapedData = result.data;
    if (descriptor.parseJsonPayload && typeof shapedData === "string") {
        // dataController.readFile answers with the raw file text; hand the agent a real object.
        try {
            shapedData = JSON.parse(shapedData);
        } catch (parseError) {
            return { ...result, ok: false, errorMessage: `The file returned by SLS is not valid JSON (${parseError.message}).` };
        }
    }
    if (descriptor.emptyListWhenNull && shapedData === null) {
        shapedData = [];
    }
    if (descriptor.excludePromotedFunctions && Array.isArray(shapedData)) {
        // The registry itself, and every other caller of GET /sparqlQueries/catalog, still lists
        // these entries in full: only this discovery listing hides a function once a dedicated tool
        // already reaches it, so an agent scanning it never finds two names for the same capability.
        shapedData = shapedData.filter((entry) => !registryByKey.get(`${entry.module}.${entry.name}`)?.mcpTool);
    }
    if (descriptor.resultShape) {
        const shaper = resultShapers[descriptor.resultShape];
        if (!shaper) {
            throw new Error(`[mcp] route ${descriptor.route} asks for result shape "${descriptor.resultShape}", which this server does not implement.`);
        }
        shapedData = shaper(shapedData);
    }
    // Navigation runs last, on the document the agent would otherwise have received whole.
    if (descriptor.navigableDocument && (toolArguments._select || toolArguments._grep)) {
        const navigated = navigateDocument(shapedData, toolArguments);
        if (navigated.error) {
            return { ...result, ok: false, data: null, errorMessage: navigated.error };
        }
        return { ...result, data: navigated.value };
    }
    // A route reporting nothing about its own ceilings and asked for none by this server has no
    // completeness to claim either way, so it keeps the answer it has always returned.
    const hasCeilingToReport = Boolean(result.sparqlExecution) || appliedRowLimit !== undefined;
    const ceilingContext = { appliedRowLimit: appliedRowLimit, sparqlExecution: result.sparqlExecution, escalation: escalation };

    if (shapedData !== result.data) {
        return { ...result, data: shapedData, rowCeiling: hasCeilingToReport ? rowCeilingNotice(shapedData, ceilingContext) : null };
    }
    const flattenedData = flattenSparqlResult(result.data);
    return { ...result, data: flattenedData, rowCeiling: hasCeilingToReport ? rowCeilingNotice(flattenedData, ceilingContext) : null };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/**
 * Dispatch one tool call.
 * @param {{tools: Map<string, object>, registryByKey: Map<string, object>}} catalog
 * @param {object} descriptor
 * @param {object} toolArguments
 * @returns {Promise<{ok: boolean, status: number, data: *, errorMessage: string|null, url: string|null}>}
 */
// ---------------------------------------------------------------------------
// Paged collection
// ---------------------------------------------------------------------------

// Collecting past an endpoint's row ceiling only works if consecutive blocks agree on an order.
// Without ORDER BY the endpoint may return them in an order of its choosing, and two blocks then
// repeat or skip rows with nothing to show for it. KGquery does not enforce this because a person
// watches its results scroll past; here they become a CSV the user takes for exact.
const orderByRegex = /\bORDER\s+BY\b/i;
const anyLimitOrOffsetRegex = /\b(LIMIT|OFFSET)\s+\d+/i;

/**
 * Walk a whole result set, one block per call to the underlying route.
 *
 * The loop lives here rather than behind the route on purpose, and the reason is the timeout rather
 * than any question of layering. `slsRequest` gives each call to SLS `requestTimeoutMs` to answer.
 * With the loop behind the route, that single stopwatch covered every block at once: fifty blocks
 * of a second and a half blew a sixty-second budget and the whole walk was discarded, forty blocks
 * of retrieved rows included. Raising the budget was the other way out and a bad trade, since it is
 * shared by every tool and would make a genuinely stuck one hang for as long. Unpacking the fifty
 * calls keeps each of them far inside the existing guard, which then goes on protecting everything.
 *
 * Blocks are appended to the query text rather than passed as route parameters: the route already
 * honours a caller's own LIMIT, so nothing new has to be understood on the other side.
 *
 * @param {object} descriptor
 * @param {Map<string, object>} registryByKey
 * @param {object} toolArguments
 */
async function executeCollectedTool(descriptor, registryByKey, toolArguments) {
    const queryParamName = descriptor.pagedCollection.queryParam;
    const query = String(toolArguments[queryParamName] ?? "").trim();

    if (anyLimitOrOffsetRegex.test(query)) {
        return {
            ok: false,
            status: 400,
            data: null,
            errorMessage:
                "Remove LIMIT and OFFSET from the query when collect is true: collecting walks the whole result set and manages them itself. Keep them for a single block, which is what collect false does.",
            url: null,
        };
    }
    // An ORDER BY is what an ordinary reading of "page through a result set" asks for, and it is
    // precisely what makes the walk impossible here. Virtuoso refuses a sorted result once OFFSET
    // plus LIMIT passes 10000: "SR353: Sorted TOP clause specifies more then 20000 rows to sort.
    // Only 10000 are allowed." So an ordered walk dies on its second block and cannot reach the rest,
    // which is the opposite of what collecting is for. Unsorted OFFSET paging has no such ceiling:
    // measured against this platform's instance, OFFSET 90000 answers normally. That is also what
    // `Sparql_OWL.getDictionary` has done for years, one page size and one strategy for the platform.
    if (orderByRegex.test(query)) {
        return {
            ok: false,
            status: 400,
            data: null,
            errorMessage:
                'Remove the ORDER BY when collect is true. Virtuoso refuses a sorted result past 10000 rows (SR353, "Sorted TOP clause specifies more then N rows to sort"), so an ordered walk stops at the second block and never reaches the rest. ' +
                "Collecting reads successive blocks in the endpoint's own scan order, which is stable for an unchanging store and is how this platform has always paged. " +
                "Sort the rows after you have them all, or keep the ORDER BY and leave collect false when the whole result fits under 10000 rows.",
            url: null,
        };
    }

    const batchSize = descriptor.pagedCollection.batchSize;
    const collectedBindings = [];
    let responseVars = [];
    let blockCount = 0;
    let collectedElapsedMs = 0;
    let stoppedOnCeiling = false;

    while (true) {
        const blockQuery = `${query} LIMIT ${batchSize} OFFSET ${collectedBindings.length}`;
        const blockResult = await executeRestTool(descriptor, registryByKey, { ...toolArguments, [queryParamName]: blockQuery });
        if (!blockResult.ok) {
            // A block that fails after others succeeded still fails the call: half a walk answered
            // as if it were whole is the outcome this whole mechanism exists to avoid.
            return blockResult;
        }
        collectedElapsedMs += blockResult.data?.elapsedMs ?? 0;
        const blockBindings = blockResult.data?.results?.bindings;
        // A walk always ends on an empty block, because a short one does not prove the end: an
        // endpoint whose row ceiling sits below the batch size returns short blocks forever, and
        // stopping on one would truncate the walk while calling it complete. That terminating call
        // is a cost, counted in `elapsedMs`, and not a block of rows, so it is deliberately left out
        // of `collectedBlocks`: a reader told a third block exists looks for the rows in it.
        if (!Array.isArray(blockBindings) || blockBindings.length === 0) {
            break;
        }
        blockCount += 1;
        responseVars = blockResult.data.head?.vars ?? responseVars;
        for (const binding of blockBindings) {
            collectedBindings.push(binding);
        }
        if (collectedBindings.length >= mcpConfig.maxCollectedRows) {
            stoppedOnCeiling = true;
            break;
        }
    }

    const rowCeiling = {
        returnedRows: collectedBindings.length,
        knownCeiling: mcpConfig.maxCollectedRows,
        collectedBlocks: blockCount,
        // Summed across the blocks: a collected run is many endpoint calls and the per-call figure
        // would say nothing about what the walk cost.
        elapsedMs: collectedElapsedMs,
        atKnownCeiling: stoppedOnCeiling,
        complete: !stoppedOnCeiling,
    };
    if (stoppedOnCeiling) {
        rowCeiling.hint =
            `Stopped at ${collectedBindings.length} rows, the collection ceiling, so more exist. This is the one cut that cannot be walked past from here. ` +
            `Narrow the query, or split it on an indexed value and collect each part.`;
    }

    return { ok: true, status: 200, data: { head: { vars: responseVars }, results: { bindings: collectedBindings }, rowCeiling: rowCeiling }, errorMessage: null, url: null };
}

// ---------------------------------------------------------------------------
// Store family
// ---------------------------------------------------------------------------

/**
 * Serve a window of rows the size guard held back. Answered from this process alone: no SLS call,
 * no triple store, so paging costs nothing but the tokens of the rows themselves.
 * @param {object} toolArguments
 */
async function executeStoreTool(toolArguments) {
    const page = readPage(toolArguments.resultId, toolArguments.offset ?? 0, toolArguments.limit ?? mcpConfig.defaultSparqlLimit, toolArguments.grep);
    if (!page) {
        // Expiry and a wrong identifier are one message on purpose: the agent's move is the same in
        // both cases, and inviting it to guess at another identifier would be worse.
        return {
            ok: false,
            status: 404,
            data: null,
            errorMessage:
                `No stored result "${toolArguments.resultId}". Results are held in memory for a limited time and are lost when the server restarts, ` +
                `so this one either expired or never existed. Run the tool that produced it again to get a fresh resultId.`,
            url: null,
        };
    }
    return { ok: true, status: 200, data: page, errorMessage: null, url: null };
}

export async function executeTool(catalog, descriptor, toolArguments) {
    if (descriptor.family === "sparql") {
        return executeSparqlTool(descriptor, toolArguments);
    }
    if (descriptor.family === "rest") {
        if (descriptor.pagedCollection && toolArguments[descriptor.pagedCollection.enabledByParam]) {
            return executeCollectedTool(descriptor, catalog.registryByKey, toolArguments);
        }
        return executeRestTool(descriptor, catalog.registryByKey, toolArguments);
    }
    if (descriptor.family === "store") {
        return executeStoreTool(toolArguments);
    }
    throw new Error(`unknown tool family "${descriptor.family}"`);
}
