/**
 * End-to-end smoke test of the MCP server, using the official SDK client.
 *
 * Plain Node script rather than a Jest test: it needs a running MCP server, a running SLS backend
 * and a real SLS token, which is exactly what Jest cannot provide.
 *
 * Run:
 *   SLS_MCP_TEST_TOKEN=sls-… node scripts/tests/test-mcp-protocol.js
 *
 * Optional:
 *   SLS_MCP_URL          default http://localhost:3011/mcp
 *   SLS_MCP_TEST_SOURCE  default BFO
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpUrl = process.env.SLS_MCP_URL || "http://localhost:3011/mcp";
const token = process.env.SLS_MCP_TEST_TOKEN;
const testSource = process.env.SLS_MCP_TEST_SOURCE || "BFO";

if (!token) {
    console.error("SLS_MCP_TEST_TOKEN is required. Generate one with POST /api/v1/users/token.");
    process.exit(1);
}

const checks = [];

function record(name, passed, detail) {
    checks.push({ name, passed, detail });
    console.log(`${passed ? "  ok  " : " FAIL "} ${name}${detail ? " — " + detail : ""}`);
}

function connectClient(bearerToken) {
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
        requestInit: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });
    const client = new Client({ name: "sls-mcp-smoke-test", version: "1.0.0" }, { capabilities: {} });
    return { client, transport };
}

function readEnvelope(callResult) {
    const firstBlock = callResult.content && callResult.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
        return null;
    }
    try {
        return JSON.parse(firstBlock.text);
    } catch {
        return null;
    }
}

async function main() {
    const { client, transport } = connectClient(token);
    await client.connect(transport);
    record("initialize", true, mcpUrl);

    const listed = await client.listTools();
    const toolNames = [];
    for (const tool of listed.tools) {
        toolNames.push(tool.name);
    }
    record("tools/list", listed.tools.length > 0, `${listed.tools.length} tools`);

    const sourcesResult = await client.callTool({ name: "sls_list_sources", arguments: {} });
    const sourcesEnvelope = readEnvelope(sourcesResult);
    const accessibleSources = sourcesEnvelope && sourcesEnvelope.data && sourcesEnvelope.data.resources ? Object.keys(sourcesEnvelope.data.resources) : [];
    record("sls_list_sources", !sourcesResult.isError && accessibleSources.length > 0, `${accessibleSources.length} sources`);

    const sourceForQueries = accessibleSources.includes(testSource) ? testSource : accessibleSources[0];
    if (!sourceForQueries) {
        record("no source reachable, stopping here", false, "");
        await client.close();
        return report();
    }

    // Promoted tools take the SPARQL function's own parameter names, straight from its JSDoc.
    const topConceptsResult = await client.callTool({ name: "sls_top_concepts", arguments: { sourceLabel: sourceForQueries } });
    const topConceptsEnvelope = readEnvelope(topConceptsResult);
    const topConceptRows = topConceptsEnvelope && Array.isArray(topConceptsEnvelope.data) ? topConceptsEnvelope.data : [];
    record("sls_top_concepts", !topConceptsResult.isError, `${sourceForQueries}: ${topConceptRows.length} rows`);

    // Flattening: a binding cell {type, value} must have become a plain string.
    const firstRow = topConceptRows[0] || {};
    const firstValue = Object.values(firstRow)[0];
    record("SPARQL bindings are flattened", topConceptRows.length === 0 || typeof firstValue === "string", topConceptRows.length === 0 ? "no row to check" : JSON.stringify(firstRow).slice(0, 90));

    const listFunctionsResult = await client.callTool({ name: "sls_list_query_functions", arguments: {} });
    const listFunctionsEnvelope = readEnvelope(listFunctionsResult);
    const callableFunctions = listFunctionsEnvelope && Array.isArray(listFunctionsEnvelope.data) ? listFunctionsEnvelope.data : [];
    record("sls_list_query_functions", !listFunctionsResult.isError && callableFunctions.length > 0, `${callableFunctions.length} callable functions`);

    // Neither the write operations nor any Sparql_SKOS function may be reachable.
    const writeNames = ["deleteTriples", "insertTriples", "deleteTriplesWithFilter", "copyGraph", "copyNodes", "createDecapitalizedLabelTriples"];
    const leaked = [];
    for (const callableFunction of callableFunctions) {
        if (writeNames.includes(callableFunction.name) || callableFunction.module === "Sparql_SKOS") {
            leaked.push(`${callableFunction.module}.${callableFunction.name}`);
        }
    }
    record("no write function, no Sparql_SKOS, in the escape hatch", leaked.length === 0, leaked.join(", "));

    const describeResult = await client.callTool({ name: "sls_list_query_functions", arguments: { name: "getDictionary" } });
    const describeEnvelope = readEnvelope(describeResult);
    record("sls_list_query_functions(name) documents params", !describeResult.isError && Boolean(describeEnvelope && describeEnvelope.data[0] && describeEnvelope.data[0].params), "");

    const escapeHatchResult = await client.callTool({
        name: "sls_run_query_function",
        arguments: { name: "getDistinctPredicates", module: "Sparql_generic", params: { sourceLabel: sourceForQueries } },
    });
    record("sls_run_query_function", !escapeHatchResult.isError, "");

    const blockedWriteResult = await client.callTool({
        name: "sls_run_query_function",
        arguments: { name: "deleteTriples", module: "Sparql_generic", params: { sourceLabel: sourceForQueries } },
    });
    record("escape hatch refuses a write function", blockedWriteResult.isError === true, "");

    const indexesResult = await client.callTool({ name: "sls_list_indexes", arguments: {} });
    const indexesEnvelope = readEnvelope(indexesResult);
    const availableIndexes = indexesEnvelope && Array.isArray(indexesEnvelope.data) ? indexesEnvelope.data : [];
    record("sls_list_indexes", !indexesResult.isError, indexesResult.isError ? "Elasticsearch unreachable on this instance" : `${availableIndexes.length} indices`);

    // Index names are lowercase and do not always match the source name, so look one up rather
    // than taking the first of the list: the head of the list is full of throwaway test indices.
    const indexForSource = availableIndexes.find((indexName) => indexName === sourceForQueries.toLowerCase());
    if (indexForSource) {
        const searchResult = await client.callTool({ name: "sls_search_labels", arguments: { text: "entity", indexes: [indexForSource] } });
        const searchEnvelope = readEnvelope(searchResult);
        const searchHits = searchEnvelope && searchEnvelope.data && Array.isArray(searchEnvelope.data.hits) ? searchEnvelope.data.hits : [];
        const firstHit = searchHits[0];
        record("sls_search_labels", !searchResult.isError && searchHits.length > 0, `${indexForSource}: ${searchHits.length} hits, top = ${firstHit ? firstHit.label : "none"}`);
    } else {
        record("sls_search_labels skipped", true, `no index named "${sourceForQueries.toLowerCase()}"`);
    }

    const forbiddenSourceResult = await client.callTool({ name: "sls_top_concepts", arguments: { sourceLabel: "__no_such_source__" } });
    record("unknown source is refused by SLS", forbiddenSourceResult.isError === true, "");

    // The point of the whole design: no tool exists that some SousLeSens code did not declare.
    // GET /catalog reports, for each tool, the @mcpTool function or the x-mcp route it came from.
    const catalogResponse = await fetch(mcpUrl.replace(/\/mcp$/, "/catalog"));
    const catalogRows = await catalogResponse.json();
    const declaredSources = new Map();
    for (const catalogRow of catalogRows) {
        declaredSources.set(catalogRow.name, catalogRow.source);
    }
    const undeclaredTools = toolNames.filter((toolName) => !declaredSources.get(toolName));
    record("every tool traces back to a code declaration", undeclaredTools.length === 0, undeclaredTools.join(", ") || `${declaredSources.size} declarations`);

    // @mcpFixed must remove the key from the schema, not merely override it at call time.
    const descendantsTool = listed.tools.find((tool) => tool.name === "sls_node_descendants");
    const descendantsOptions = descendantsTool && descendantsTool.inputSchema.properties.options.properties;
    record("@mcpFixed keys are absent from the input schema", Boolean(descendantsOptions) && !("descendants" in descendantsOptions) && !("excludeItself" in descendantsOptions), "");

    const kgModelResult = await client.callTool({ name: "sls_kgquery_model", arguments: { source: sourceForQueries } });
    const kgModelEnvelope = readEnvelope(kgModelResult);
    const kgModelIsParsed = Boolean(kgModelEnvelope && kgModelEnvelope.data && typeof kgModelEnvelope.data === "object");
    record("sls_kgquery_model", !kgModelResult.isError && kgModelIsParsed, kgModelResult.isError ? "no KGquery model saved for this source" : "parsed as an object");

    await client.close();

    // A bad token must be refused before any tool runs.
    const badAuth = connectClient("sls-definitely-invalid");
    try {
        await badAuth.client.connect(badAuth.transport);
        const badResult = await badAuth.client.callTool({ name: "sls_list_sources", arguments: {} });
        record("invalid token is refused", badResult.isError === true, "");
        await badAuth.client.close();
    } catch (connectError) {
        record("invalid token is refused", true, connectError.message);
    }

    report();
}

function report() {
    const failed = checks.filter((check) => !check.passed);
    console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
    process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(function (error) {
    console.error("smoke test crashed:", error.message);
    process.exit(1);
});
