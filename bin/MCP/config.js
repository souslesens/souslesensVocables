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
};
