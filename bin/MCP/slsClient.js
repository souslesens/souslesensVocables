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

// ---------------------------------------------------------------------------
// Concurrency cap
//
// Process-wide, not per session: what must be protected is the SLS backend, and it does not care
// which MCP session a request came from. Waiting requests are queued, and the queue itself is
// bounded so a runaway agent gets a readable refusal instead of unbounded memory growth.
// ---------------------------------------------------------------------------

let inFlightRequestCount = 0;
const waitingRequestResolvers = [];

/**
 * Wait for a free slot.
 * @returns {Promise<boolean>} False when the queue is full and the caller must give up
 */
function acquireRequestSlot() {
    if (inFlightRequestCount < mcpConfig.maxConcurrentSlsRequests) {
        inFlightRequestCount += 1;
        return Promise.resolve(true);
    }
    if (waitingRequestResolvers.length >= mcpConfig.maxQueuedSlsRequests) {
        return Promise.resolve(false);
    }
    return new Promise(function (resolveSlot) {
        waitingRequestResolvers.push(resolveSlot);
    });
}

function releaseRequestSlot() {
    const nextResolver = waitingRequestResolvers.shift();
    if (nextResolver) {
        // The slot moves straight to the next waiter, so inFlightRequestCount stays accurate.
        return nextResolver(true);
    }
    inFlightRequestCount -= 1;
}

/**
 * Current pressure on the SLS backend, for GET /healthz.
 * @returns {{inFlight: number, queued: number, maxConcurrent: number}}
 */
export function requestPressure() {
    return { inFlight: inFlightRequestCount, queued: waitingRequestResolvers.length, maxConcurrent: mcpConfig.maxConcurrentSlsRequests };
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
    const slsMessage = payload && typeof payload === "object" && payload.message ? String(payload.message) : typeof payload === "string" ? payload : "";

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

/**
 * Perform one request against the SLS API with the caller's bearer token.
 * @param {"GET"|"POST"} method
 * @param {string} routePath - Path under /api/v1, starting with a slash
 * @param {object} [options]
 * @param {object} [options.query] - Query parameters
 * @param {object} [options.body] - JSON body, POST only
 * @returns {Promise<{ok: boolean, status: number, data: *, errorMessage: string|null, url: string}>}
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

    const gotSlot = await acquireRequestSlot();
    if (!gotSlot) {
        return {
            ok: false,
            status: 429,
            data: null,
            errorMessage: `Too many SousLeSens requests in flight from this MCP server (${mcpConfig.maxConcurrentSlsRequests} at a time, ${mcpConfig.maxQueuedSlsRequests} queued). Wait for the calls already running, or narrow the work into fewer queries.`,
            url: url,
        };
    }
    try {
        // The slot covers reading the body too: on a large SPARQL answer the backend is still
        // streaming long after fetch() has resolved its headers.
        return await sendAndRead(url, fetchOptions);
    } finally {
        releaseRequestSlot();
    }
}

/**
 * One request/response round trip, without the concurrency accounting.
 * @param {string} url
 * @param {object} fetchOptions
 * @returns {Promise<{ok: boolean, status: number, data: *, errorMessage: string|null, url: string}>}
 */
async function sendAndRead(url, fetchOptions) {
    let response;
    try {
        response = await fetch(url, fetchOptions);
    } catch (networkError) {
        const isTimeout = networkError.name === "TimeoutError";
        const reason = isTimeout ? `no answer within ${mcpConfig.requestTimeoutMs} ms` : networkError.message;
        return { ok: false, status: 0, data: null, errorMessage: `SLS backend unreachable at ${mcpConfig.slsApiUrl} (${reason}).`, url: url };
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
    return { ok: true, status: response.status, data: payload, errorMessage: null, url: url };
}
