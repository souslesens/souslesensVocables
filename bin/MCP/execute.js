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
 * Recognises the three shapes SLS actually returns: a bare array of bindings, the full
 * `{head, results: {bindings}}` envelope, and `{hierarchies, rawResult}` from
 * getNodesAncestorsOrDescendants.
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
    if (Array.isArray(payload.rawResult)) {
        return { ...payload, rawResult: flattenSparqlResult(payload.rawResult) };
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

    const totalEnvelope = hitsEnvelope && hitsEnvelope.total;
    const totalMatches = totalEnvelope && typeof totalEnvelope === "object" ? totalEnvelope.value : totalEnvelope;
    return { totalMatches: totalMatches, hits: flatHits };
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

const resultShapers = { elasticHits: shapeElasticHits, sourceCards: shapeSourceCards };

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
    return result.ok ? { ...result, data: flattenSparqlResult(result.data) } : result;
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
        const hint = descriptor.statusHints[result.status];
        return hint ? { ...result, errorMessage: hint } : result;
    }
    if (descriptor.parseJsonPayload && typeof result.data === "string") {
        // dataController.readFile answers with the raw file text; hand the agent a real object.
        try {
            return { ...result, data: JSON.parse(result.data) };
        } catch (parseError) {
            return { ...result, ok: false, errorMessage: `The file returned by SLS is not valid JSON (${parseError.message}).` };
        }
    }
    if (descriptor.emptyListWhenNull && result.data === null) {
        return { ...result, data: [] };
    }
    if (descriptor.resultShape) {
        const shaper = resultShapers[descriptor.resultShape];
        if (!shaper) {
            throw new Error(`[mcp] route ${descriptor.route} asks for result shape "${descriptor.resultShape}", which this server does not implement.`);
        }
        return { ...result, data: shaper(result.data) };
    }
    return { ...result, data: flattenSparqlResult(result.data) };
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
export async function executeTool(catalog, descriptor, toolArguments) {
    if (descriptor.family === "sparql") {
        return executeSparqlTool(descriptor, toolArguments);
    }
    if (descriptor.family === "rest") {
        return executeRestTool(descriptor, catalog.registryByKey, toolArguments);
    }
    throw new Error(`unknown tool family "${descriptor.family}"`);
}
