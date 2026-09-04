/**
 * Builds the MCP tool catalog in memory at server startup, entirely from SousLeSens code.
 *
 * Nothing here decides what an agent can reach. Every tool is declared next to the thing it
 * exposes, and this file only converts those declarations into MCP shape:
 *
 *   SPARQL functions   `@expose read` + `@mcpTool` + `@mcpFixed` in the JSDoc of
 *                      public/vocables/modules/sparqlProxies/sparql_*.js, read through
 *                      buildRegistry() so the agent catalog can never drift from
 *                      bin/sparqlRegistry.json.
 *   REST routes        an `x-mcp` key inside each route's `.apiDoc`, read through
 *                      GET /api/v1/api-docs so no route module is ever imported here.
 *
 * Adding a tool therefore means editing the function or the route, never this file. The only
 * policy this server holds is its own: V1 is read-only, so anything not declared `read` is refused.
 */

import { z } from "zod";

import { buildRegistry } from "../sparqlRegistryExtractor.js";
import { mcpConfig } from "./config.js";
import { resultShapeNames } from "./execute.js";

// MCP tool names accept [a-zA-Z0-9_-].
const toolNameRegex = /^[a-zA-Z0-9_-]{1,64}$/;
const readAccess = "read";

// Only readOnlyHint carries information: it tells a client no confirmation prompt is needed.
const readOnlyAnnotations = { readOnlyHint: true };

// sparqlQueriesRunner injects returnQueryStr itself; an agent-supplied value would contradict it.
const runnerControlledOption = "returnQueryStr";

// ---------------------------------------------------------------------------
// SLS type -> JSON Schema draft-07
//
// Shared by both families: registry parameters and `x-mcp` parameters use the same type vocabulary.
// ---------------------------------------------------------------------------

const surroundingParensRegex = /^\((.*)\)$/;
const arraySuffixRegex = /\[\]$/;
const arrayGenericRegex = /^Array<(.+)>$/;

const scalarSchemas = {
    string: { type: "string" },
    number: { type: "number" },
    boolean: { type: "boolean" },
};

/**
 * Map one SLS type branch (no union) to a JSON Schema.
 * @param {string} typeBranch
 * @returns {object|null} Schema, or null when the parameter must be dropped (Function)
 */
function schemaForTypeBranch(typeBranch) {
    const trimmedType = typeBranch.trim();

    if (trimmedType === "Function") {
        return null;
    }
    if (scalarSchemas[trimmedType]) {
        return { ...scalarSchemas[trimmedType] };
    }
    if (trimmedType === "any") {
        return {};
    }
    if (trimmedType === "Object") {
        return { type: "object", additionalProperties: true };
    }

    const genericMatch = trimmedType.match(arrayGenericRegex);
    if (genericMatch) {
        const itemSchema = schemaForTypeBranch(genericMatch[1]);
        return { type: "array", items: itemSchema || {} };
    }
    if (arraySuffixRegex.test(trimmedType)) {
        const itemSchema = schemaForTypeBranch(trimmedType.replace(arraySuffixRegex, ""));
        return { type: "array", items: itemSchema || {} };
    }

    console.warn(`[mcp] unmapped SLS type "${trimmedType}", exposed as any`);
    return {};
}

/**
 * Map a full SLS type string, unions included, to a JSON Schema.
 * @param {string} slsType
 * @returns {object|null} Schema, or null when the parameter must be dropped
 */
export function schemaForType(slsType) {
    const parensMatch = slsType.trim().match(surroundingParensRegex);
    const unionBody = parensMatch ? parensMatch[1] : slsType.trim();
    const rawBranches = unionBody.split("|");

    const branchSchemas = [];
    for (const rawBranch of rawBranches) {
        const branchSchema = schemaForTypeBranch(rawBranch);
        if (branchSchema === null) {
            return null;
        }
        branchSchemas.push(branchSchema);
    }

    return branchSchemas.length === 1 ? branchSchemas[0] : { anyOf: branchSchemas };
}

// ---------------------------------------------------------------------------
// SPARQL family: one promoted registry function -> one tool
// ---------------------------------------------------------------------------

/**
 * Split `@mcpFixed` targets into the two places they can land: a positional parameter of the
 * function, or a key of its `options` object.
 * @param {object|undefined} mcpFixed
 * @returns {{fixedParams: object, fixedOptions: object}}
 */
function splitFixedTargets(mcpFixed) {
    const fixedParams = {};
    const fixedOptions = {};
    for (const [fixedTarget, fixedValue] of Object.entries(mcpFixed || {})) {
        const dotIndex = fixedTarget.indexOf(".");
        if (dotIndex < 0) {
            fixedParams[fixedTarget] = fixedValue;
        } else {
            fixedOptions[fixedTarget.slice(dotIndex + 1)] = fixedValue;
        }
    }
    return { fixedParams, fixedOptions };
}

// Where an agent recovers what the per-key prose said, on the one call in ten where it matters.
const optionDocsPointer = "Full option docs: sls_list_query_functions.";
// JSDoc descriptions rarely end with punctuation, so the sentence would otherwise run into ours.
const sentenceEndRegex = /[.!?]$/;

/**
 * Build the nested schema of a registry `options` parameter, minus the keys the agent must not set.
 *
 * Key names and types are kept, per-key prose is not: it is the single largest item of tools/list,
 * sent on every turn, while the guidance that actually changes an agent's behaviour ("returns
 * nothing unless you pass skipTopClassFilter") belongs to the function's summary paragraph, which
 * is sent anyway. Dropping the prose costs ~2 100 characters less per listing and loses nothing an
 * agent cannot fetch on demand. Hiding a whole key is a different decision, and a domain one:
 * it is spelled `@mcpFixed` in the function's own JSDoc, never here.
 * @param {object} optionsParam - Registry entry for the `options` parameter
 * @param {object} fixedOptions - Keys frozen by `@mcpFixed`
 * @returns {object}
 */
function optionsSchemaFor(optionsParam, fixedOptions) {
    const properties = {};
    for (const optionProperty of optionsParam.properties || []) {
        if (optionProperty.name === runnerControlledOption || optionProperty.name in fixedOptions) {
            continue;
        }
        const propertySchema = schemaForType(optionProperty.type);
        if (propertySchema === null) {
            continue;
        }
        properties[optionProperty.name] = propertySchema;
    }

    if (Object.keys(properties).length === 0) {
        return { type: "object", properties: properties, additionalProperties: true, description: optionsParam.description };
    }

    const trimmedDescription = optionsParam.description.trim();
    const separator = sentenceEndRegex.test(trimmedDescription) ? " " : ". ";
    return {
        type: "object",
        properties: properties,
        additionalProperties: true,
        description: trimmedDescription + separator + optionDocsPointer,
    };
}

/**
 * Convert one `@mcpTool`-promoted registry entry into an MCP tool descriptor.
 * @param {object} registryEntry
 * @returns {object}
 */
function sparqlToolDescriptor(registryEntry) {
    const { fixedParams, fixedOptions } = splitFixedTargets(registryEntry.mcpFixed);

    const properties = {};
    const requiredNames = [];
    for (const param of registryEntry.params) {
        if (param.name in fixedParams) {
            continue;
        }
        if (param.name === "options") {
            properties.options = optionsSchemaFor(param, fixedOptions);
            // sparqlQueriesRunner never treats options as required, whatever the JSDoc says.
            continue;
        }
        const paramSchema = schemaForType(param.type);
        if (paramSchema === null) {
            continue;
        }
        properties[param.name] = { ...paramSchema, description: param.description };
        if (param.required) {
            requiredNames.push(param.name);
        }
    }

    const fixedTargets = Object.keys(registryEntry.mcpFixed || {});
    const fixedNotice =
        fixedTargets.length === 0 ? "" : ` Fixed for this tool: ${fixedTargets.map((fixedTarget) => `${fixedTarget}=${JSON.stringify(registryEntry.mcpFixed[fixedTarget])}`).join(", ")}.`;

    return {
        name: registryEntry.mcpTool,
        description: (registryEntry.summary || registryEntry.description) + fixedNotice,
        inputSchema: { type: "object", properties: properties, required: requiredNames, additionalProperties: false },
        annotations: readOnlyAnnotations,
        family: "sparql",
        module: registryEntry.module,
        functionName: registryEntry.name,
        fixedParams: fixedParams,
        fixedOptions: fixedOptions,
        registryEntry: registryEntry,
    };
}

// ---------------------------------------------------------------------------
// REST family: one `x-mcp` tool declaration -> one tool
// ---------------------------------------------------------------------------

// `x-mcp` parameters use the same type vocabulary as the SPARQL JSDoc, so one mapper serves both
// families. A route author who writes the Swagger spelling `"object"` must be told, not silently
// handed an untyped parameter.
const restParamTypes = ["string", "number", "boolean", "Object", "any", "string[]", "number[]", "boolean[]", "Object[]"];

// Swagger validates the shape of an operation but treats every `x-` key as opaque, so a typo like
// `paramz` or `statusHint` passes the SLS boot untouched and would simply produce a tool missing
// the feature its author asked for. `.strict()` everywhere turns that into a named boot failure.
const restParamDeclarationSchema = z
    .object({
        type: z.enum(restParamTypes),
        description: z.string().min(1),
        required: z.boolean().optional(),
        default: z.any().optional(),
        enum: z.array(z.any()).nonempty().optional(),
    })
    .strict();

const restToolDeclarationSchema = z
    .object({
        name: z.string().regex(toolNameRegex),
        access: z.enum(["read", "write"]),
        description: z.string().min(1),
        params: z.record(z.string(), restParamDeclarationSchema).optional(),
        query: z.record(z.string(), z.any()).optional(),
        body: z.record(z.string(), z.any()).optional(),
        parseJsonPayload: z.boolean().optional(),
        emptyListWhenNull: z.boolean().optional(),
        // Drops entries the SPARQL registry already promotes to their own tool (`entry.mcpTool` set):
        // an agent that can already reach a function through a dedicated tool has no reason to see it
        // a second time in this discovery listing. The REST route itself is untouched — every other
        // caller of GET /sparqlQueries/catalog still gets the complete registry.
        excludePromotedFunctions: z.boolean().optional(),
        resultShape: z.enum(resultShapeNames).optional(),
        maxResponseBytes: z.number().positive().optional(),
        navigableDocument: z.boolean().optional(),
        registryFunctionGuard: z
            .object({
                nameParam: z.string().min(1),
                moduleParam: z.string().min(1),
                requireAccess: z.enum(["read", "write"]),
                allowedModules: z.array(z.string()).nonempty().optional(),
            })
            .strict()
            .optional(),
        // Declares that one of this tool's own parameters caps how many rows come back, so an answer
        // holding exactly that many is a prefix rather than a total. Routes reaching the triple store
        // need no declaration: /sparqlQueries/run reports the ceilings it applied in a header, which
        // is the only account that covers a limit a catalog function carries in its own query text.
        rowCeiling: z
            .object({
                param: z.string().min(1),
                escalation: z.enum(["sparql", "elastic"]),
            })
            .strict()
            .optional(),
        // Declares that this route returns one block of a larger result set, and that the MCP
        // server may walk the rest by appending LIMIT and OFFSET to `queryParam`, one call per
        // block, when the agent sets `enabledByParam`.
        pagedCollection: z
            .object({
                enabledByParam: z.string().min(1),
                queryParam: z.string().min(1),
                batchSize: z.number().positive(),
            })
            .strict()
            .optional(),
        statusHints: z.record(z.string(), z.string().min(1)).optional(),
        // Declares that one HTTP status from this route is not a failure at all: the resource is
        // simply not materialized yet (a cache nothing has filled, a file nobody has built). Rather
        // than a failed tool call, the agent gets an ordinary successful answer carrying `notice`, so
        // it reads as "unknown, ask elsewhere" rather than as an outage to retry or, worse, as an
        // empty object it could mistake for "this source has zero classes".
        normalAbsence: z
            .object({
                status: z.number(),
                notice: z.string().min(1),
            })
            .strict()
            .optional(),
    })
    .strict();

const restDeclarationSchema = z.object({ tools: z.array(restToolDeclarationSchema).nonempty() }).strict();

/**
 * Turn a zod failure into one line per problem, each naming the path inside the declaration.
 * @param {object} zodError
 * @returns {string}
 */
function describeDeclarationProblems(zodError) {
    const problems = [];
    for (const issue of zodError.issues) {
        const location = issue.path.length > 0 ? issue.path.join(".") : "x-mcp";
        problems.push(`${location}: ${issue.message}`);
    }
    return problems.join("; ");
}

/**
 * Convert an `x-mcp` parameter declaration into a JSON Schema property.
 * @param {object} paramDeclaration
 * @returns {object}
 */
function restParamSchema(paramDeclaration) {
    const baseSchema = schemaForType(paramDeclaration.type);
    const paramSchema = { ...baseSchema, description: paramDeclaration.description };
    if (paramDeclaration.enum) {
        paramSchema.enum = paramDeclaration.enum;
    }
    if (paramDeclaration.default !== undefined) {
        paramSchema.default = paramDeclaration.default;
    }
    return paramSchema;
}

// Added to a tool whose route declares `navigableDocument`. A whole-document answer has no narrower
// tool to fall back on — there is no "part of a mapping file" endpoint — so the way not to read all
// of it is to reach inside it, the way an agent greps a source file instead of opening it. The
// underscore says plainly that these two are the MCP server's own, not the route's parameters.
const documentNavigationProperties = {
    _select: {
        type: "string",
        description: "Return only this part of the document: a top-level key, or a dotted path such as `nodes.0`. The keys are what an oversized answer lists back to you.",
    },
    _grep: {
        type: "string",
        description: "Return only the entries whose key or content contains this text, case-insensitive. Applied after _select. Plain text, not a regular expression.",
    },
};

/**
 * Convert one entry of a route's `x-mcp.tools` into an MCP tool descriptor.
 * @param {object} toolDeclaration
 * @param {string} routePath - Path as it appears in the OpenAPI document
 * @param {string} httpMethod - Upper-case verb
 * @returns {object}
 */
function restToolDescriptor(toolDeclaration, routePath, httpMethod) {
    const declarationOrigin = `${httpMethod} ${routePath}`;

    if (toolDeclaration.access !== readAccess) {
        throw new Error(`[mcp] ${declarationOrigin} declares tool "${toolDeclaration.name}" with access "${toolDeclaration.access}". This server is read-only.`);
    }

    const properties = {};
    const requiredNames = [];
    const paramDefaults = {};
    for (const [paramName, paramDeclaration] of Object.entries(toolDeclaration.params || {})) {
        properties[paramName] = restParamSchema(paramDeclaration);
        if (paramDeclaration.required) {
            requiredNames.push(paramName);
        }
        if (paramDeclaration.default !== undefined) {
            paramDefaults[paramName] = paramDeclaration.default;
        }
    }
    if (toolDeclaration.navigableDocument) {
        Object.assign(properties, documentNavigationProperties);
    }

    return {
        name: toolDeclaration.name,
        description: toolDeclaration.description,
        inputSchema: { type: "object", properties: properties, required: requiredNames, additionalProperties: false },
        annotations: readOnlyAnnotations,
        family: "rest",
        route: routePath,
        httpMethod: httpMethod,
        query: toolDeclaration.query || null,
        body: toolDeclaration.body || null,
        paramDefaults: paramDefaults,
        parseJsonPayload: Boolean(toolDeclaration.parseJsonPayload),
        emptyListWhenNull: Boolean(toolDeclaration.emptyListWhenNull),
        excludePromotedFunctions: Boolean(toolDeclaration.excludePromotedFunctions),
        resultShape: toolDeclaration.resultShape || null,
        maxResponseBytes: toolDeclaration.maxResponseBytes || null,
        navigableDocument: Boolean(toolDeclaration.navigableDocument),
        registryFunctionGuard: toolDeclaration.registryFunctionGuard || null,
        rowCeiling: toolDeclaration.rowCeiling || null,
        pagedCollection: toolDeclaration.pagedCollection || null,
        statusHints: toolDeclaration.statusHints || {},
        normalAbsence: toolDeclaration.normalAbsence || null,
    };
}

/**
 * Read every `x-mcp` declaration of the live OpenAPI document.
 *
 * Fetched rather than imported: importing a route module would pull in knex, the Elasticsearch
 * proxy and the KG builder, which is exactly what this process must not depend on. The document is
 * public and read once at startup, before any caller exists, so it carries no bearer token.
 * @returns {Promise<object[]>} Tool descriptors
 */
async function fetchRestToolDescriptors() {
    const apiDocsUrl = `${mcpConfig.slsApiUrl}/api-docs`;
    let openApiDocument;
    try {
        const apiDocsResponse = await fetch(apiDocsUrl, { signal: AbortSignal.timeout(mcpConfig.requestTimeoutMs) });
        if (!apiDocsResponse.ok) {
            throw new Error(`HTTP ${apiDocsResponse.status}`);
        }
        openApiDocument = await apiDocsResponse.json();
    } catch (fetchError) {
        throw new Error(`[mcp] cannot read ${apiDocsUrl}: ${fetchError.message}. The SLS backend must be reachable for the MCP catalog to be built.`);
    }

    const descriptors = [];
    for (const [routePath, pathItem] of Object.entries(openApiDocument.paths || {})) {
        for (const [rawMethod, operation] of Object.entries(pathItem)) {
            const mcpDeclaration = operation && operation["x-mcp"];
            if (!mcpDeclaration) {
                continue;
            }
            const httpMethod = rawMethod.toUpperCase();
            const parsedDeclaration = restDeclarationSchema.safeParse(mcpDeclaration);
            if (!parsedDeclaration.success) {
                throw new Error(`[mcp] the x-mcp declaration of ${httpMethod} ${routePath} is unusable — ${describeDeclarationProblems(parsedDeclaration.error)}`);
            }
            for (const toolDeclaration of parsedDeclaration.data.tools) {
                descriptors.push(restToolDescriptor(toolDeclaration, routePath, httpMethod));
            }
        }
    }

    // Zero declarations is not an empty catalog, it is the wrong backend. The usual cause is an SLS
    // process started before the x-mcp keys were added to its routes: it answers /api-docs happily,
    // the MCP builds only the SPARQL family, and the missing half is invisible to everyone. Since
    // the catalog is built once at startup and clients cache tools/list, a degraded catalog is worse
    // than refusing to start.
    if (descriptors.length === 0) {
        throw new Error(
            `[mcp] ${apiDocsUrl} declares no x-mcp tool at all. Either the SousLeSens backend is older than the x-mcp declarations in api/v1/paths — restart it — or MCP_SLS_API_URL points at the wrong instance.`,
        );
    }
    return descriptors;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * Build the whole catalog. Throws on any declaration this server cannot honour, so a half-built
 * catalog never reaches an agent: clients cache tools/list, and a missing tool is worse than a
 * crash-loop the container restart policy can act on.
 * @returns {Promise<{tools: Map<string, object>, registryByKey: Map<string, object>, summary: object}>}
 */
// ---------------------------------------------------------------------------
// Store family: one hand-written tool, reading what the size guard held back
// ---------------------------------------------------------------------------

/**
 * The counterpart of the result store: every other tool can produce a `resultId`, this one spends it.
 *
 * Declared here rather than on a route because it never leaves this process. Its rows are already in
 * memory, so serving them costs no HTTP call and no triple store work, and putting it behind an
 * endpoint would only add a hop.
 */
function resultPageToolDescriptor() {
    return {
        name: "sls_result_page",
        description:
            "Searches and reads rows that did not fit an earlier answer. When a result is truncated its `truncation` block carries a `resultId` and a `nextOffset`: pass them here. " +
            "Works for every tool, not just SPARQL. Rows are held in memory for a limited time and are lost when the server restarts, so read them in the same conversation or run the original tool again. " +
            "`grep` is the reason to reach for this tool: it keeps only the rows containing a term, across every column at once, and is how you find the handful of rows you need inside thousands without reading them. " +
            "Search before you page. Walking a large result offset by offset fills your context with rows you will not use, and an aggregate — COUNT, GROUP BY, DISTINCT — often answers the question " +
            "without any of this. Page only when the question genuinely needs every row in order, and stop as soon as you have what you came for.",
        inputSchema: {
            type: "object",
            properties: {
                resultId: { type: "string", description: "Identifier from the `truncation.resultId` of an earlier answer." },
                grep: {
                    type: "string",
                    description:
                        "Keep only the rows containing this text, case-insensitive, matched against every column of the row. Plain text, not a regular expression. " +
                        "Filtering happens before paging, so `offset` then walks the matches. The answer reports `matchedRows` next to `totalRows`, which tells you whether the term was too narrow or too broad.",
                },
                offset: {
                    type: "number",
                    description: "First row to read, zero-based. The earlier answer's `truncation.nextOffset` is where it stopped. Counts matches when `grep` is set.",
                    default: 0,
                },
                limit: { type: "number", description: `How many rows to read. Defaults to ${mcpConfig.defaultSparqlLimit}; a page too large for the response budget is truncated and stored again.` },
            },
            required: ["resultId"],
            additionalProperties: false,
        },
        annotations: readOnlyAnnotations,
        family: "store",
        route: null,
        httpMethod: null,
        query: null,
        body: null,
        paramDefaults: { offset: 0 },
        parseJsonPayload: false,
        emptyListWhenNull: false,
        excludePromotedFunctions: false,
        resultShape: null,
        maxResponseBytes: null,
        navigableDocument: false,
        registryFunctionGuard: null,
        rowCeiling: null,
        statusHints: {},
    };
}

export async function buildCatalog() {
    const registry = buildRegistry(true);

    const registryByKey = new Map();
    for (const entry of registry) {
        if (entry.expose && entry.access === readAccess) {
            registryByKey.set(`${entry.module}.${entry.name}`, entry);
        }
    }

    const tools = new Map();
    function addTool(descriptor) {
        if (!toolNameRegex.test(descriptor.name)) {
            throw new Error(`[mcp] invalid tool name "${descriptor.name}": must match ${toolNameRegex}`);
        }
        if (tools.has(descriptor.name)) {
            throw new Error(`[mcp] duplicate tool name "${descriptor.name}": it is declared twice across the SPARQL modules and the API routes.`);
        }
        tools.set(descriptor.name, descriptor);
    }

    let promotedCount = 0;
    for (const entry of registry) {
        if (!entry.mcpTool) {
            continue;
        }
        addTool(sparqlToolDescriptor(entry));
        promotedCount += 1;
    }

    const restDescriptors = await fetchRestToolDescriptors();
    for (const descriptor of restDescriptors) {
        addTool(descriptor);
    }

    addTool(resultPageToolDescriptor());

    return {
        tools: tools,
        registryByKey: registryByKey,
        summary: {
            registryEntries: registry.length,
            promotedTools: promotedCount,
            restTools: restDescriptors.length,
            reachableFunctions: registryByKey.size,
        },
    };
}
