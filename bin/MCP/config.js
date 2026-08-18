/**
 * MCP server configuration.
 *
 * Read from environment variables rather than config/mainConfig.json: the main config is validated
 * by a `.strict()` zod schema and any unknown key makes the SLS server exit at boot, so adding an
 * `mcp` block there is a change to make once this server has stabilised.
 */

const trailingSlashRegex = /\/+$/;

function readString(variableName, fallback) {
    const rawValue = process.env[variableName];
    return rawValue === undefined || rawValue === "" ? fallback : rawValue;
}

function readPositiveNumber(variableName, fallback) {
    const rawValue = process.env[variableName];
    if (rawValue === undefined || rawValue === "") {
        return fallback;
    }
    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        throw new Error(`${variableName} must be a positive number, got "${rawValue}"`);
    }
    return parsedValue;
}

const originSeparatorRegex = /\s*,\s*/;

/**
 * Browser origins allowed to call this server.
 *
 * Defaults to the origin serving the SLS API, since the only page that has a legitimate reason to
 * speak MCP from a browser is the SLS UI itself. `MCP_ALLOWED_ORIGINS` overrides with a
 * comma-separated list, and the literal value "none" turns cross-origin access off entirely.
 */
function readAllowedOrigins(slsApiUrl) {
    const rawValue = readString("MCP_ALLOWED_ORIGINS", "");
    if (rawValue === "none") {
        return [];
    }
    if (rawValue !== "") {
        return rawValue.split(originSeparatorRegex);
    }
    try {
        return [new URL(slsApiUrl).origin];
    } catch {
        return [];
    }
}

const slsApiUrl = readString("MCP_SLS_API_URL", "http://localhost:3010/api/v1").replace(trailingSlashRegex, "");

export const mcpConfig = {
    listenPort: readPositiveNumber("MCP_LISTEN_PORT", 3011),
    slsApiUrl: slsApiUrl,
    allowedOrigins: readAllowedOrigins(slsApiUrl),
    requestTimeoutMs: readPositiveNumber("MCP_REQUEST_TIMEOUT_MS", 60000),
    // Default budget for one tool result. Not a statement about the client's context window, which
    // this server cannot know and which is shared between every call of a conversation. A route
    // whose document is legitimately larger raises it for itself through `x-mcp.maxResponseBytes`.
    maxResponseBytes: readPositiveNumber("MCP_MAX_RESPONSE_BYTES", 250000),
    // Row ceiling for anything an agent runs against the triple store: the `limit` option injected
    // into catalog functions, and the LIMIT that /api/v1/sparql/select appends to a raw SELECT that
    // declares none. One number for both, so a raw query and a catalog call answer at the same
    // scale. Well under `maxResponseBytes`, which truncates whatever exceeds it anyway.
    defaultSparqlLimit: readPositiveNumber("MCP_DEFAULT_SPARQL_LIMIT", 1000),
    // Ceilings for the rows held back from oversized answers, see resultStore.js. In memory and
    // lost on restart by design: persistence would buy little and cost a file lifecycle. The age
    // ceiling is what matters on a long-lived server, the other two only cap a burst.
    resultStoreTtlMs: readPositiveNumber("MCP_RESULT_STORE_TTL_MS", 900000),
    resultStoreMaxResults: readPositiveNumber("MCP_RESULT_STORE_MAX_RESULTS", 20),
    // Total across every stored result, not per result, so it bounds the process rather than one
    // answer. Measured on this platform's triple store, a SPARQL binding row costs about 85 bytes
    // serialised and closer to 400 as a live object, which puts this ceiling near 250 MB held at
    // once in the worst case. Raise it and that figure moves with it.
    resultStoreMaxRows: readPositiveNumber("MCP_RESULT_STORE_MAX_ROWS", 600000),
    // Ceiling of one collected run, and the reason the platform can hand back a whole A-box extract
    // without anyone opening KGquery. Kept below the store ceiling on purpose: a run larger than
    // what the store accepts would be walked block by block and then dropped whole, which is the
    // worst of both.
    maxCollectedRows: readPositiveNumber("MCP_MAX_COLLECTED_ROWS", 500000),
};
