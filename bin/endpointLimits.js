import ConfigManager from "./configManager.js";
import httpProxy from "./httpProxy.js";

// Discovering what an endpoint will and will not do, once per endpoint per process.
//
// A SPARQL endpoint that truncates says nothing about it, so a result of exactly N rows is either
// the whole answer or a prefix, and no amount of reading the response settles which. Everything a
// `rowCeiling` notice can honestly claim rests on knowing that cap, so it is established here rather
// than assumed.
//
// Two ways, tried in that order. Virtuoso will simply state it: `virtuoso_ini_item_value` is callable
// from SPARQL through the `bif:` prefix and returns the configured value, one row, exact. Measured on
// this platform's instance it answers 20000, which matches what the endpoint actually serves.
//
// Anything else gets the empirical route: ask for far more rows than a server would serve and count
// what comes back. That count alone is ambiguous, and this is the trap worth naming. A store holding
// fewer triples than its own cap returns all of them, and taking that for a ceiling would make every
// complete answer of that size report itself as cut. So a second query asks whether a single row
// exists past that point. One row back means the data continues and the count was a cap; none means
// the count was simply the size of the store, and no ceiling is recorded.
//
// Cached against the endpoint URL rather than the source name: many sources share one endpoint and
// these limits belong to the server, not to the graph. Failures are cached too, so a hostile or
// silent endpoint is probed once and never again.
//
// This lives in `bin/` rather than beside one route because two paths reach the triple store and both
// answer the same agents: `/sparql/select` runs the query an agent wrote, `/sparqlQueries/run` runs a
// catalog function that writes one for it. A ceiling known on one path and unknown on the other would
// make the same graph report itself complete or cut depending on which tool asked.
const endpointLimitsByUrl = {};
const rowCeilingProbeRequestedRows = 999999;
const virtuosoIniQuery =
    "SELECT (bif:virtuoso_ini_item_value('SPARQL','ResultSetMaxRows') AS ?rowCeiling) (bif:virtuoso_ini_item_value('SPARQL','MaxQueryExecutionTime') AS ?maxSeconds) WHERE { ?s ?p ?o } LIMIT 1";

export const sparqlResultsHeaders = { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" };

/**
 * Credentials for an endpoint, or null when it is not the platform's own or needs none.
 * @param {string} endpointUrl
 * @returns {object|null} Auth object shaped for `httpProxy`
 */
export function endpointAuthForUrl(endpointUrl) {
    const platformServer = ConfigManager.config?.sparql_server;
    if (!platformServer || !platformServer.user || endpointUrl.indexOf(platformServer.url) !== 0) {
        return null;
    }
    return { user: platformServer.user, pass: platformServer.password, sendImmediately: false };
}

function askEndpoint(endpointUrl, auth, query, callback) {
    const params = { query: query, format: "json" };
    if (auth) {
        params.auth = { ...auth };
    }
    httpProxy.post(endpointUrl, sparqlResultsHeaders, params, function (queryError, queryResult) {
        return callback(queryError ? null : (queryResult?.results?.bindings ?? null));
    });
}

/**
 * `callback({rowCeiling, maxQueryExecutionSeconds})`, either value null when it could not be established.
 *
 * Never fails the caller's query: a probe that errors or comes back unparseable leaves the limits
 * unknown, which is a state every caller already handles.
 * @param {string} endpointUrl
 * @param {object|null} auth
 * @param {function} callback
 */
export function discoverEndpointLimits(endpointUrl, auth, callback) {
    if (Object.prototype.hasOwnProperty.call(endpointLimitsByUrl, endpointUrl)) {
        return callback(endpointLimitsByUrl[endpointUrl]);
    }

    function remember(limits) {
        endpointLimitsByUrl[endpointUrl] = limits;
        console.log(`[endpointLimits] ${endpointUrl} row ceiling: ${limits.rowCeiling ?? "unknown"}, query time limit: ${limits.maxQueryExecutionSeconds ?? "unknown"}s`);
        return callback(limits);
    }

    askEndpoint(endpointUrl, auth, virtuosoIniQuery, function (iniBindings) {
        const declaredRowCeiling = Number(iniBindings?.[0]?.rowCeiling?.value) || null;
        const declaredMaxSeconds = Number(iniBindings?.[0]?.maxSeconds?.value) || null;
        if (declaredRowCeiling) {
            return remember({ rowCeiling: declaredRowCeiling, maxQueryExecutionSeconds: declaredMaxSeconds });
        }

        askEndpoint(endpointUrl, auth, `SELECT ?s WHERE { ?s ?p ?o } LIMIT ${rowCeilingProbeRequestedRows}`, function (probeBindings) {
            if (!Array.isArray(probeBindings) || probeBindings.length >= rowCeilingProbeRequestedRows) {
                return remember({ rowCeiling: null, maxQueryExecutionSeconds: null });
            }
            const observedRowCount = probeBindings.length;
            askEndpoint(endpointUrl, auth, `SELECT ?s WHERE { ?s ?p ?o } LIMIT 1 OFFSET ${observedRowCount}`, function (beyondBindings) {
                const doesDataContinue = Array.isArray(beyondBindings) && beyondBindings.length > 0;
                return remember({ rowCeiling: doesDataContinue ? observedRowCount : null, maxQueryExecutionSeconds: null });
            });
        });
    });
}
