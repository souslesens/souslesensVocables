/**
 * Thin HTTP client towards the SLS API.
 *
 * Every call carries the caller's own bearer token, so SLS remains the single authority on
 * authentication, source rights, quotas and audit. This process never reads the users table.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { mcpConfig } from "./config.js";

// Same pattern as bin/remoteCodeRunner.js: per-call context that concurrent requests cannot leak
// into each other. The token is never stored anywhere else.
export const callerContext = new AsyncLocalStorage();

function currentToken() {
    const store = callerContext.getStore();
    if (!store || !store.token) {
        throw new Error("no caller token in context: a tool was executed outside an authenticated MCP request");
    }
    return store.token;
}

function buildQueryString(queryParams) {
    const searchParams = new URLSearchParams();
    for (const [parameterName, parameterValue] of Object.entries(queryParams)) {
        if (parameterValue === undefined || parameterValue === null) {
            continue;
        }
        if (Array.isArray(parameterValue)) {
            for (const singleValue of parameterValue) {
                searchParams.append(parameterName, String(singleValue));
            }
        } else {
            searchParams.append(parameterName, String(parameterValue));
        }
    }
    const serialized = searchParams.toString();
    return serialized ? `?${serialized}` : "";
}

/**
 * Turn a non-2xx SLS response into a message an agent can act on.
 * @param {number} status
 * @param {*} payload - Parsed response body, when it was JSON
 * @returns {string}
 */
function messageForStatus(status, payload) {
    // SLS routes report their reason under `message`, but `error` is what express's own handler and
    // some routes use. Reading only `message` silently replaced a precise refusal with the generic
    // sentence below, which sends an agent looking for a permission problem it does not have.
    const payloadIsObject = payload !== null && typeof payload === "object";
    const reportedReason = payloadIsObject ? payload.message || payload.error : payload;
    const slsMessage = typeof reportedReason === "string" ? reportedReason : "";

    if (status === 401) {
        return "SLS rejected the token. Regenerate one with POST /api/v1/users/token and update the MCP client configuration.";
    }
    if (status === 403) {
        return slsMessage || "SLS denied access to this resource for the current user profile.";
    }
    if (status === 404) {
        return slsMessage || "SLS does not know this function or route. The MCP catalog may be stale: restart the MCP server.";
    }
    if (status === 429) {
        return slsMessage || "SLS profile quota exceeded for this route. Slow down or narrow the query.";
    }
    if (status >= 500) {
        return slsMessage || `SLS returned ${status}. The backend is failing or the query timed out.`;
    }
    return slsMessage || `SLS returned ${status}.`;
}

// Set by /sparqlQueries/run with the facts about the queries it ran: how many, the LIMIT the last one
// carried, how many rows it returned and the endpoint's own cap. Absent on every other route and on
// any call that never reached the triple store, which is why a missing header is a normal state and
// not an error.
const sparqlExecutionHeaderName = "x-sls-sparql-execution";

/**
 * @param {Response} response
 * @returns {object|null} Execution facts, or null when the route reported none
 */
function parseSparqlExecutionHeader(response) {
    const headerValue = response.headers.get(sparqlExecutionHeaderName);
    if (!headerValue) {
        return null;
    }
    try {
        return JSON.parse(headerValue);
    } catch {
        // A header this code cannot read leaves completeness unknown, which is a state every caller
        // already handles. Failing the whole call over it would be worse than the doubt.
        return null;
    }
}

/**
 * Perform one request against the SLS API with the caller's bearer token.
 * @param {"GET"|"POST"} method
 * @param {string} routePath - Path under /api/v1, starting with a slash
 * @param {object} [options]
 * @param {object} [options.query] - Query parameters
 * @param {object} [options.body] - JSON body, POST only
 * @returns {Promise<{ok: boolean, status: number, data: *, errorMessage: string|null, url: string, sparqlExecution: object|null}>}
 */
export async function slsRequest(method, routePath, options) {
    const requestOptions = options || {};
    const url = mcpConfig.slsApiUrl + routePath + buildQueryString(requestOptions.query || {});

    const fetchOptions = {
        method: method,
        headers: { Authorization: `Bearer ${currentToken()}`, Accept: "application/json" },
        signal: AbortSignal.timeout(mcpConfig.requestTimeoutMs),
    };
    if (requestOptions.body !== undefined) {
        fetchOptions.headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(requestOptions.body);
    }

    // No client-side concurrency cap on purpose: several MCP processes, the web UI and Yasgui all
    // reach the same triple store, so a per-process ceiling protects nothing. Bounding SPARQL
    // pressure belongs to the single point every client goes through, in the SLS backend.
    let response;
    try {
        response = await fetch(url, fetchOptions);
    } catch (networkError) {
        // A deadline reached and a host that is not there are the same exception and were reported
        // with the same word, "unreachable". They call for opposite moves. An agent told the platform
        // was down stops and says so to the user, which is what happened on a query that was merely
        // heavy: the backend answered every other call in milliseconds throughout.
        if (networkError.name === "TimeoutError") {
            return {
                ok: false,
                status: 0,
                data: null,
                errorMessage:
                    `This call ran past the ${mcpConfig.requestTimeoutMs} ms deadline and was abandoned. The SousLeSens platform is not down and is very probably still evaluating it: ` +
                    `nothing here is broken and nothing needs to be reported as an outage. What was asked for is too heavy to answer in one call, and running it again unchanged will end the same way. ` +
                    `Make it cheaper instead: bind the pattern with an rdf:type, a known predicate or a single graph, or split it on an indexed value and run one part per call, ` +
                    `one class or one property at a time, then merge the parts yourself.`,
                url: url,
            };
        }
        return { ok: false, status: 0, data: null, errorMessage: `SLS backend unreachable at ${mcpConfig.slsApiUrl} (${networkError.message}).`, url: url };
    }

    const rawText = await response.text();
    let payload = rawText;
    try {
        payload = JSON.parse(rawText);
    } catch {
        // Some routes answer with plain text; keep the raw body in that case.
    }

    if (!response.ok) {
        return { ok: false, status: response.status, data: payload, errorMessage: messageForStatus(response.status, payload), url: url };
    }
    // Routes that reach the triple store report what bounded the answer beside it rather than in it,
    // because their body shape varies per catalog function. See `sparqlExecutionHeader`.
    return { ok: true, status: response.status, data: payload, errorMessage: null, url: url, sparqlExecution: parseSparqlExecutionHeader(response) };
}
