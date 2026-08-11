/**
 * Wires the MCP protocol handlers onto the catalog.
 *
 * The low-level `Server` is used rather than `McpServer`: our input schemas are JSON Schema
 * generated from the SPARQL registry, and round-tripping them through Zod would lose the fidelity
 * of the `anyOf` unions for no benefit.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { mcpConfig } from "./config.js";
import { executeTool } from "./execute.js";

const requireJson = createRequire(import.meta.url);
const packageJson = requireJson("../../package.json");

// Returned with the initialize result, so every client hands it to the model at connection time,
// without the user having to ask for anything. That is what separates it from an MCP prompt, which
// is user-invoked and therefore cannot carry a rule the agent must never break.
//
// Strictly cross-cutting: what is true of one tool belongs to that tool's own description, which
// comes from the SousLeSens code and is sent with tools/list anyway.
const serverInstructions = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "instructions.md"), "utf8");

/**
 * Locate the paginable array inside an SLS answer, whatever its envelope.
 * @param {*} payload
 * @returns {{rows: object[], replace: function(object[]): *}|null}
 */
function findRows(payload) {
    if (Array.isArray(payload)) {
        return { rows: payload, replace: (keptRows) => keptRows };
    }
    if (payload && payload.results && Array.isArray(payload.results.bindings)) {
        return {
            rows: payload.results.bindings,
            replace: (keptRows) => ({ ...payload, results: { ...payload.results, bindings: keptRows } }),
        };
    }
    if (payload && Array.isArray(payload.resources)) {
        return { rows: payload.resources, replace: (keptRows) => ({ ...payload, resources: keptRows }) };
    }
    if (payload && Array.isArray(payload.hits)) {
        return { rows: payload.hits, replace: (keptRows) => ({ ...payload, hits: keptRows }) };
    }
    return null;
}

/**
 * Keep a tool result under the byte budget so a large answer cannot blow up the agent's context.
 *
 * V1 guard only: it cuts rows from the tail and says so. Offset paging, per-cell truncation and a
 * result cache are deliberately left out until the server has been exercised for real.
 * @param {*} payload
 * @returns {{payload: *, truncation: object}}
 */
function applySizeGuard(payload) {
    const initialText = JSON.stringify(payload);
    const initialBytes = initialText === undefined ? 0 : initialText.length;
    if (initialBytes <= mcpConfig.maxResponseBytes) {
        return { payload: payload, truncation: { truncated: false, bytes: initialBytes } };
    }

    const rowsHolder = findRows(payload);
    if (!rowsHolder) {
        const previewLength = Math.floor(mcpConfig.maxResponseBytes / 2);
        return {
            payload: { truncatedPreview: initialText.slice(0, previewLength) },
            truncation: {
                truncated: true,
                bytes: initialBytes,
                maxResponseBytes: mcpConfig.maxResponseBytes,
                hint: "Answer is a single large object, only a textual preview is returned. Narrow the request.",
            },
        };
    }

    const totalRows = rowsHolder.rows.length;
    let keptCount = totalRows;
    let keptPayload = payload;
    let keptBytes = initialBytes;
    while (keptCount > 0 && keptBytes > mcpConfig.maxResponseBytes) {
        keptCount = Math.floor(keptCount / 2);
        keptPayload = rowsHolder.replace(rowsHolder.rows.slice(0, keptCount));
        keptBytes = JSON.stringify(keptPayload).length;
    }

    return {
        payload: keptPayload,
        truncation: {
            truncated: true,
            totalRows: totalRows,
            returnedRows: keptCount,
            bytes: keptBytes,
            maxResponseBytes: mcpConfig.maxResponseBytes,
            hint: "Result was cut to fit the response budget. Narrow the filters or lower options.limit.",
        },
    };
}

function toCallToolResult(descriptor, result) {
    if (!result.ok) {
        return {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ error: result.errorMessage, status: result.status, tool: descriptor.name }) }],
        };
    }

    const guarded = applySizeGuard(result.data);
    const envelope = { tool: descriptor.name, data: guarded.payload, truncation: guarded.truncation };
    return { content: [{ type: "text", text: JSON.stringify(envelope) }] };
}

/**
 * Build an MCP server bound to a catalog.
 * @param {{tools: Map<string, object>, registryByKey: Map<string, object>}} catalog
 * @returns {Server}
 */
export function buildMcpServer(catalog) {
    const catalogTools = catalog.tools;
    const server = new Server({ name: "souslesens-vocables", version: packageJson.version }, { capabilities: { tools: { listChanged: false } }, instructions: serverInstructions });

    server.setRequestHandler(ListToolsRequestSchema, async function () {
        const tools = [];
        for (const descriptor of catalogTools.values()) {
            tools.push({
                name: descriptor.name,
                description: descriptor.description,
                inputSchema: descriptor.inputSchema,
                annotations: descriptor.annotations,
            });
        }
        return { tools: tools };
    });

    server.setRequestHandler(CallToolRequestSchema, async function (request) {
        const descriptor = catalogTools.get(request.params.name);
        if (!descriptor) {
            return { isError: true, content: [{ type: "text", text: `Unknown tool "${request.params.name}". Call tools/list to see what is available.` }] };
        }

        const toolArguments = request.params.arguments || {};
        try {
            const result = await executeTool(catalog, descriptor, toolArguments);
            return toCallToolResult(descriptor, result);
        } catch (executionError) {
            // Protocol errors are reserved for protocol faults; anything that happens while serving a
            // tool comes back as an error result the agent can read and correct.
            return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: executionError.message, tool: descriptor.name }) }] };
        }
    });

    return server;
}
