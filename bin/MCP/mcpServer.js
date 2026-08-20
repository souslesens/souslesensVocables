/**
 * Wires the MCP protocol handlers onto the catalog.
 *
 * The low-level `Server` is used rather than `McpServer`: our input schemas are JSON Schema
 * generated from the SPARQL registry, and round-tripping them through Zod would lose the fidelity
 * of the `anyOf` unions for no benefit.
 *
 * **No progress notification, deliberately, and what it would take.** A slow SPARQL query returns
 * nothing to the client until it completes, so a client whose own timeout is shorter than the query
 * gives up with no explanation. The protocol answers this with `notifications/progress`, emitted on
 * the SSE response of the POST already in flight: no session, no change to any SLS route, and
 * nothing streamed — it only says "still working". It is not implemented because no timeout has
 * been observed in use. Two things would change that: an SLS deployment slower than the one this
 * was built against, or exposing the heavy queries. The heaviest of the catalog — `getDictionary`,
 * `getLabelsMap`, `generateOWL` — are reachable through `sls_run_query_function` but no `@mcpTool`
 * promotes them, and `getSourceTaxonomy`, which is promoted, measured 9 KB on BFO and 36 KB on
 * IOF_core, well inside the budget. Revisit when a client actually cuts a call short.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { storeRows } from "./resultStore.js";

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
    // A page served by sls_result_page. Missing here, a page of wide rows was not recognised as rows
    // at all and the whole page was replaced by its structure, so the caller received an answer with
    // no `rows` key. The browser drain reads exactly that key, so a result whose rows were wide
    // enough to overflow one page could never be drained: it stopped on its first read and the panel
    // kept the handful of rows the first answer had carried.
    //
    // The counters are corrected along with the rows, or the page would announce a window it no
    // longer carries and an agent paging by `nextOffset` would skip the rows that were cut.
    if (payload && Array.isArray(payload.rows)) {
        return {
            rows: payload.rows,
            replace: (keptRows) => ({ ...payload, rows: keptRows, returnedRows: keptRows.length, hasMore: true, nextOffset: (payload.offset || 0) + keptRows.length }),
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
 * Describe a payload too large to send, one entry per top-level key.
 *
 * Half a document is not half an answer, it is broken JSON, so an oversized object is replaced by
 * the map of what it holds. That is what lets an agent come back asking for the part it needs
 * instead of being handed a string cut mid-token with nothing to act on.
 * @param {object} payload
 * @returns {object[]} `{key, type, entries?, bytes}`, largest first
 */
function describeOversizedObject(payload) {
    const entries = [];
    for (const [key, value] of Object.entries(payload)) {
        const valueText = JSON.stringify(value);
        const entry = { key: key, type: Array.isArray(value) ? "array" : typeof value, bytes: valueText === undefined ? 0 : valueText.length };
        if (Array.isArray(value)) {
            entry.entries = value.length;
        } else if (value && typeof value === "object") {
            entry.entries = Object.keys(value).length;
        }
        entries.push(entry);
    }
    entries.sort((firstEntry, secondEntry) => secondEntry.bytes - firstEntry.bytes);
    return entries;
}

/**
 * Keep a tool result under the byte budget so a large answer cannot blow up the agent's context.
 *
 * The budget is not a statement about the client's context window, which this server cannot know:
 * it is shared between every call of a conversation, so a generous ceiling plus a truncation that
 * explains itself beats a ceiling tuned for the widest client.
 *
 * Rows and documents are cut differently on purpose. A prefix of rows is still usable, so rows are
 * halved until they fit and the agent is told how many exist. A document has no usable prefix, so
 * it is replaced by its structure. In both cases the answer says what it would take to get the rest,
 * because "narrow the request" is not advice an agent can act on when it asked for a whole taxonomy.
 *
 * Cut rows go to the result store rather than to the bin, so the answer can name what it takes to
 * read the rest instead of declaring it unreachable.
 * @param {*} payload
 * @param {number} budgetBytes
 * @param {string} toolName - Quoted back to the agent alongside the stored rows.
 * @param {boolean} [rowsAlreadyStored] - True when the payload is a window of a stored result, so cutting it needs no second copy.
 * @returns {{payload: *, truncation: object}}
 */
export function applySizeGuard(payload, budgetBytes, toolName, rowsAlreadyStored) {
    const initialText = JSON.stringify(payload);
    const initialBytes = initialText === undefined ? 0 : initialText.length;
    if (initialBytes <= budgetBytes) {
        return { payload: payload, truncation: { truncated: false, bytes: initialBytes } };
    }

    const rowsHolder = findRows(payload);
    if (!rowsHolder) {
        const isDescribableObject = Boolean(payload) && typeof payload === "object";
        return {
            payload: isDescribableObject ? { oversizedDocumentStructure: describeOversizedObject(payload) } : { oversizedValuePreview: initialText.slice(0, 2000) },
            truncation: {
                truncated: true,
                bytes: initialBytes,
                maxResponseBytes: budgetBytes,
                hint: isDescribableObject
                    ? `This document is ${initialBytes} characters, over the ${budgetBytes} budget, and half a document is not an answer — its top-level structure is returned instead. Tell the user how large it is and ask which part they need, then fetch that part with a more specific tool.`
                    : `This value is ${initialBytes} characters, over the ${budgetBytes} budget, and is not an object that can be summarised. Only its head is returned.`,
            },
        };
    }

    const totalRows = rowsHolder.rows.length;
    let keptCount = totalRows;
    let keptPayload = payload;
    let keptBytes = initialBytes;
    while (keptCount > 0 && keptBytes > budgetBytes) {
        keptCount = Math.floor(keptCount / 2);
        keptPayload = rowsHolder.replace(rowsHolder.rows.slice(0, keptCount));
        keptBytes = JSON.stringify(keptPayload).length;
    }

    // A window of a stored result is already held under its own identifier, so storing it again
    // duplicates rows the process has and, worse, ages the original out: the store keeps a bounded
    // number of results and evicts the oldest, which during a drain is the very result being read.
    // A hundred-thousand-row drain died around its twentieth page for exactly that reason.
    if (rowsAlreadyStored) {
        return {
            payload: keptPayload,
            truncation: {
                truncated: true,
                totalRows: totalRows,
                returnedRows: keptCount,
                bytes: keptBytes,
                maxResponseBytes: budgetBytes,
                hint:
                    `Only the first ${keptCount} rows of the ${totalRows} you asked for fit this answer. The rest are still in the same stored result: ask again with the same resultId, ` +
                    `the offset you used plus ${keptCount}. Rows this wide are why the window shrank, so a smaller limit costs nothing and avoids the cut.`,
            },
        };
    }

    // The cut rows are held rather than dropped, so "there is no way to fetch them" stops being
    // true. When the store refuses them, because the set alone is larger than everything it may
    // hold, the old advice is the honest one again and it is what the agent gets.
    const resultId = storeRows(toolName, rowsHolder.rows);
    if (!resultId) {
        return {
            payload: keptPayload,
            truncation: {
                truncated: true,
                totalRows: totalRows,
                returnedRows: keptCount,
                bytes: keptBytes,
                maxResponseBytes: budgetBytes,
                hint:
                    `Rows ${keptCount + 1} to ${totalRows} were cut to fit the response budget, and this answer is too large to be held for later reading. ` +
                    `Narrow the question — more URIs, a predicate, a filter, or an aggregate such as COUNT or GROUP BY that answers it without listing every row. ` +
                    `If it cannot be narrowed, tell the user that ${totalRows} is how large the answer is rather than working from the first ${keptCount} rows as if they were the whole set.`,
            },
        };
    }

    return {
        payload: keptPayload,
        truncation: {
            truncated: true,
            totalRows: totalRows,
            returnedRows: keptCount,
            bytes: keptBytes,
            maxResponseBytes: budgetBytes,
            resultId: resultId,
            nextOffset: keptCount,
            hint:
                `Rows ${keptCount + 1} to ${totalRows} did not fit this answer, but they were kept: reach them with sls_result_page using resultId "${resultId}". ` +
                `Search them rather than walk them — sls_result_page takes a \`grep\` term matched across every column, which finds the rows you need inside ${totalRows} without reading them. ` +
                `Page with offset ${keptCount} only when the question really needs every row in order. An aggregate — COUNT, GROUP BY, DISTINCT — often answers it without either. ` +
                `To hand the whole set to the user rather than read it yourself, say how many rows there are and let the client display or export them.`,
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

    const guarded = applySizeGuard(result.data, descriptor.maxResponseBytes || mcpConfig.maxResponseBytes, descriptor.name, descriptor.family === "store");
    const truncation = guarded.truncation;
    if (truncation.truncated && descriptor.navigableDocument) {
        // The only tools with nowhere narrower to go are the ones that can be read from inside.
        truncation.hint = `${truncation.hint} Call this tool again with _select to take one part of it, or _grep to keep only the entries matching a term.`;
    }
    const envelope = { tool: descriptor.name, data: guarded.payload, truncation: truncation };
    // Sits beside `truncation` rather than inside `data`: several tools answer with a bare array, and
    // wrapping that to carry a notice would change the shape every caller reads rows from.
    if (result.rowCeiling) {
        envelope.rowCeiling = result.rowCeiling;
    }
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
