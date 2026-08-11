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

export const mcpConfig = {
    listenPort: readPositiveNumber("MCP_LISTEN_PORT", 3011),
    slsApiUrl: readString("MCP_SLS_API_URL", "http://localhost:3010/api/v1").replace(trailingSlashRegex, ""),
    requestTimeoutMs: readPositiveNumber("MCP_REQUEST_TIMEOUT_MS", 60000),
    maxResponseBytes: readPositiveNumber("MCP_MAX_RESPONSE_BYTES", 100000),
    defaultSparqlLimit: readPositiveNumber("MCP_DEFAULT_SPARQL_LIMIT", 200),
    // An agent iterating over a taxonomy fires calls far faster than the web UI ever did, and
    // bin/remoteCodeRunner.js resolves the *current* call's callback from a process-wide
    // unhandledRejection handler: concurrent SPARQL executions can cross there. Until that is fixed
    // in the backend, this server keeps its own pressure on the API low and bounded.
    maxConcurrentSlsRequests: readPositiveNumber("MCP_MAX_CONCURRENT_SLS_REQUESTS", 4),
    maxQueuedSlsRequests: readPositiveNumber("MCP_MAX_QUEUED_SLS_REQUESTS", 32),
};
