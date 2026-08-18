import ConfigManager from "../../../../bin/configManager.js";
import httpProxy from "../../../../bin/httpProxy.js";
import UserRequestFiltering from "../../../../bin/userRequestFiltering.js";
// The row ceiling lives with the MCP configuration rather than here: this route and the catalog
// functions answer the same agents, and two ceilings drifting apart would make a raw SELECT and a
// catalog call return at different scales for no reason a caller could see. The module reads
// environment variables and nothing else, so importing it costs no MCP machinery.
import { mcpConfig } from "../../../../bin/MCP/config.js";
import { describeExecutionError } from "../../../../bin/sparqlQueriesRunner.js";

// Value a source uses in sources.json to point at the platform's own triple store rather than an
// external endpoint. Resolved here the same way every other caller resolves it.
const defaultEndpointMarker = "_default";

// Enough of the refused text to show a code fence, a stray sentence or a prologue keyword the check
// does not accept, without echoing a whole query back into the caller's context.
const refusedQueryHeadLength = 120;

// A query naming no graph reads the endpoint's default graph, which on this platform's Virtuoso is
// every graph it holds. So `source` picked the endpoint and the access check while the query quietly
// answered from the whole store: measured, the same pattern returned 100741 rows scoped to
// PAZFLOR_ABOX and 470468 unscoped, the surplus coming from CLOV and every other graph. Nothing in
// the answer said so. An unscoped query is therefore completed here rather than run, on the source
// the caller already named.
const datasetClauseRegex = /\bFROM\b/i;
const namedGraphPatternRegex = /\bGRAPH\b/i;
// Matches the `WHERE` keyword when it is the last token before the group graph pattern, so the
// dataset clause lands in front of it. SPARQL puts `FROM` between the projection and `WHERE`.
const trailingWhereKeywordRegex = /\bWHERE\s*$/i;

/**
 * Build the `FROM` clauses for a source, one level of imports deep, the way the rest of SLS does.
 *
 * Imports the caller may not read are dropped rather than silently widening the scope past the
 * account's own permissions, which matters because this runs before `filterSparqlRequest` waves an
 * admin through.
 * @param {object} source - Source entry from the caller's readable sources
 * @param {object} userSources - Every source the caller may read, keyed by name
 * @param {boolean} withImports
 * @returns {string} The dataset clause, empty when the source declares no graph
 */
function datasetClauseForSource(source, userSources, withImports) {
    const declaredGraphUris = Array.isArray(source.graphUri) ? source.graphUri : [source.graphUri];
    const graphUris = [];
    for (const graphUri of declaredGraphUris) {
        if (graphUri && !graphUris.includes(graphUri)) {
            graphUris.push(graphUri);
        }
    }

    if (withImports && Array.isArray(source.imports)) {
        for (const importedSourceName of source.imports) {
            const importedSource = userSources[importedSourceName];
            if (!importedSource || !importedSource.graphUri) {
                continue;
            }
            const importedGraphUris = Array.isArray(importedSource.graphUri) ? importedSource.graphUri : [importedSource.graphUri];
            for (const importedGraphUri of importedGraphUris) {
                if (importedGraphUri && !graphUris.includes(importedGraphUri)) {
                    graphUris.push(importedGraphUri);
                }
            }
        }
    }

    const fromClauses = graphUris.map((graphUri) => `FROM <${graphUri}>`);
    return fromClauses.join(" ");
}

/**
 * Insert a dataset clause where SPARQL expects one: after the projection, before the group graph
 * pattern, and before the optional `WHERE` keyword that introduces it.
 * @param {string} query
 * @param {string} datasetClause
 * @returns {string|null} Null when the query holds no group graph pattern to sit in front of
 */
function withDatasetClause(query, datasetClause) {
    let isInsideDoubleQuotedString = false;
    let isInsideSingleQuotedString = false;

    for (let charIndex = 0; charIndex < query.length; charIndex++) {
        const currentChar = query[charIndex];
        if (currentChar === '"' && !isInsideSingleQuotedString) {
            isInsideDoubleQuotedString = !isInsideDoubleQuotedString;
            continue;
        }
        if (currentChar === "'" && !isInsideDoubleQuotedString) {
            isInsideSingleQuotedString = !isInsideSingleQuotedString;
            continue;
        }
        if (currentChar !== "{" || isInsideDoubleQuotedString || isInsideSingleQuotedString) {
            continue;
        }

        const textBeforePattern = query.slice(0, charIndex);
        const trailingWhereMatch = textBeforePattern.match(trailingWhereKeywordRegex);
        const insertionIndex = trailingWhereMatch ? charIndex - trailingWhereMatch[0].length : charIndex;
        return `${query.slice(0, insertionIndex)}${datasetClause} ${query.slice(insertionIndex)}`;
    }
    return null;
}

// A SELECT with no LIMIT on a multi-million-triple graph is a full scan. Agents write those, so the
// route caps what they did not cap themselves, at the ceiling the MCP layer is willing to hold.
// Nothing pages below that: the caller gets the set in one answer, and the MCP result store keeps
// whatever did not fit the response budget. Virtuoso's own `ResultSetMaxRows` usually bites first,
// but it is configuration this code does not own and an external endpoint may have none at all, so
// the ceiling stays explicit here rather than being left to the server on the other end.
//
// The cap is decided on the tail alone, meaning what follows the last closing brace, because that is
// where SPARQL puts the outer query's solution modifiers. Two things depend on it. A LIMIT belonging
// to a sub-SELECT sits before that brace and must not be mistaken for the outer one, or the outer
// query goes out unbounded. And `LIMIT n OFFSET n`, the ordinary way to page through a result set,
// must be recognised: an end-anchored test misses it because OFFSET trails it, appends a second
// LIMIT, and every paged request dies of a syntax error while `OFFSET n LIMIT n` survives. That
// asymmetry is invisible to the caller and makes pagination fail at random.
//
// OFFSET without LIMIT still gets one appended, which is legal: SPARQL accepts the two clauses in
// either order.
const tailLimitRegex = /\bLIMIT\s+(\d+)/i;

// Above this many rows, an answer is large enough that mistaking a prefix for the whole set changes
// a conclusion, so the doubt is worth stating. Below it, the warning would be noise on every call.
const rowCountWorthDoubting = 1000;

// Page size a collecting caller walks with, taken from KGquery rather than chosen here: `KGquery.js`
// has walked result sets this way for years with `limit 10000 offset n`, and two different batch
// sizes against the same triple store would be two behaviours to explain instead of one. This route
// never loops itself: it answers one block and the MCP server walks the rest, one call per block,
// so that the per-call timeout keeps covering one call. The number lives here because it belongs to
// the query shape this route serves, and the declaration below hands it to the MCP server.
const collectBatchSize = 10000;

/**
 * Say what this answer does and does not prove about its own completeness.
 *
 * Two ceilings can cut a result, and only one of them is ours. Virtuoso stops at `ResultSetMaxRows`
 * and announces nothing: measured on this platform's instance it serves 20 000 rows and no more, so
 * a query capped there while our LIMIT says 50 000 comes back looking like a complete answer of
 * 20 000 rows. Comparing the count against our own ceiling alone therefore proves nothing in exactly
 * the case that occurs in practice.
 *
 * That is why the endpoint's ceiling is discovered rather than assumed, either from the probe or
 * from a `sparql_server.maxRows` declaration. With it, `complete` is a real answer: false on the
 * ceiling, true below it. Without it, `complete` stays "unknown" rather than true, because an
 * unannounced cut and a whole answer are the same observation and nothing here can separate them.
 * What separates them is a COUNT, and the notice says so whenever the answer is large enough for
 * the difference to change a conclusion.
 *
 * @param {object} sparqlResults - SPARQL 1.1 JSON results, forwarded otherwise untouched.
 * @param {number} effectiveRowCeiling - Lowest ceiling this code knows to be in force.
 * @param {boolean} isEndpointCeilingKnown - Whether the source declared the endpoint's own cap.
 */
function withRowCeilingNotice(sparqlResults, effectiveRowCeiling, isEndpointCeilingKnown) {
    const bindings = sparqlResults?.results?.bindings;
    if (!Array.isArray(bindings)) {
        return sparqlResults;
    }

    const returnedRows = bindings.length;
    const isAtKnownCeiling = returnedRows >= effectiveRowCeiling;
    // Only a source that declares its endpoint's cap can be answered with a plain yes: below a
    // ceiling nobody declared, an unannounced cut and a complete answer are the same observation.
    let completeness = "unknown";
    if (isAtKnownCeiling) {
        completeness = false;
    } else if (isEndpointCeilingKnown) {
        completeness = true;
    }
    const notice = { returnedRows: returnedRows, knownCeiling: effectiveRowCeiling, atKnownCeiling: isAtKnownCeiling, complete: completeness };

    if (isAtKnownCeiling) {
        notice.hint =
            `Cut: ${returnedRows} rows is the ceiling in force, so this is a prefix of the result, not the result. ` +
            `The rest is reachable: this ceiling caps what one answer carries, not what the endpoint can compute. ` +
            `Set collect true on the same query to walk all of it in one call, which is the only way past 10000 rows here and the right move when the user asked for the whole set. ` +
            `To step through it yourself instead, re-run with OFFSET ${returnedRows} and keep going until a block comes back smaller than the ceiling, but drop any ORDER BY first: ` +
            `Virtuoso refuses a sorted result once OFFSET plus LIMIT passes 10000 (SR353), so an ordered walk dies on its second block. Unsorted blocks come back in the endpoint's scan order, which is stable for an unchanging store. ` +
            `Note this is paging a result that is merely large, which is cheap. Paging a query that is merely slow is not: there, split on an indexed value instead.`;
    } else if (!isEndpointCeilingKnown && returnedRows >= rowCountWorthDoubting) {
        notice.hint =
            `Possibly cut: ${returnedRows} rows is below the ceiling this route applies (${effectiveRowCeiling}), but this endpoint's own limit could not be established and endpoints truncate silently. ` +
            `Do not treat this as the whole set until a SELECT (COUNT(*) AS ?total) on the same pattern agrees with ${returnedRows}. ` +
            `Declaring sparql_server.maxRows on this source would settle it once and remove this warning.`;
    }

    return { ...sparqlResults, rowCeiling: notice };
}

const sparqlResultsHeaders = { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" };

// Discovering what an endpoint will and will not do, once per endpoint per process.
//
// A SPARQL endpoint that truncates says nothing about it, so a result of exactly N rows is either
// the whole answer or a prefix, and no amount of reading the response settles which. Everything the
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
const endpointLimitsByUrl = {};
const rowCeilingProbeRequestedRows = 999999;
const virtuosoIniQuery =
    "SELECT (bif:virtuoso_ini_item_value('SPARQL','ResultSetMaxRows') AS ?rowCeiling) (bif:virtuoso_ini_item_value('SPARQL','MaxQueryExecutionTime') AS ?maxSeconds) WHERE { ?s ?p ?o } LIMIT 1";

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
 * unknown, which is a state the route already handles.
 */
function discoverEndpointLimits(endpointUrl, auth, callback) {
    if (Object.prototype.hasOwnProperty.call(endpointLimitsByUrl, endpointUrl)) {
        return callback(endpointLimitsByUrl[endpointUrl]);
    }

    function remember(limits) {
        endpointLimitsByUrl[endpointUrl] = limits;
        console.log(`[sparql/select] ${endpointUrl} row ceiling: ${limits.rowCeiling ?? "unknown"}, query time limit: ${limits.maxQueryExecutionSeconds ?? "unknown"}s`);
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

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            const sourceName = req.body.source;
            const query = req.body.query;

            if (!sourceName || !query) {
                return res.status(400).json({ message: "Body must include `source` and `query`." });
            }

            // The veto, before anything else touches the query: no parsing, no ACL, no endpoint
            // resolution for something that is not a read. `isSelectQuery` strips comments and
            // PREFIX lines first, so neither `# SELECT` nor a sub-SELECT inside an update passes.
            if (!UserRequestFiltering.isSelectQuery(query)) {
                // Two different mistakes land here, and the caller cannot tell them apart from a
                // bare "not a SELECT": the second one refuses a query that *is* a SELECT. Naming it
                // is what stops an agent from reformulating at random until it gives up.
                const refusedQueryHead = query.trim().slice(0, refusedQueryHeadLength);
                return res.status(403).json({
                    message:
                        "Only SELECT is allowed here: INSERT, DELETE, LOAD, CLEAR, CREATE, DROP, COPY, MOVE and ADD are refused. " +
                        "A `;` followed by one of those keywords is refused as well, even inside a quoted string, because this check " +
                        'deliberately does not parse literals. So a valid SELECT searching for text such as "remove the cap; insert the probe" ' +
                        "is refused too: remove the semicolon from the searched text, or split the search on a shorter phrase, and retry. " +
                        "Send the SPARQL text on its own: a markdown code fence, a prose sentence or a trailing explanation around it lands here too. " +
                        "The query received starts with: " +
                        refusedQueryHead,
                });
            }

            const userSources = await ConfigManager.getUserSources(req, res);
            const source = userSources[sourceName];
            if (!source) {
                return res.status(404).json({ message: `Unknown source "${sourceName}", or it is not readable by this account. List the readable ones with sls_list_sources.` });
            }

            const strippedQuery = UserRequestFiltering.stripSparqlComments(query);
            let scopedQuery = query;
            if (!datasetClauseRegex.test(strippedQuery) && !namedGraphPatternRegex.test(strippedQuery)) {
                const withImports = req.body.withImports !== false;
                const datasetClause = datasetClauseForSource(source, userSources, withImports);
                if (!datasetClause) {
                    return res.status(400).json({
                        message:
                            `Source "${sourceName}" declares no graph, so the scope of this query cannot be filled in for you, and running it unscoped would read every graph the endpoint holds. ` +
                            `Name the graphs yourself with FROM, or query a source that declares one.`,
                    });
                }
                scopedQuery = withDatasetClause(query, datasetClause);
                if (!scopedQuery) {
                    return res.status(400).json({
                        message:
                            "This query has no group graph pattern, so there is nowhere to put the FROM clause that scopes it to the source. Write a SELECT with a WHERE block, or name the graphs yourself with FROM.",
                    });
                }
            }

            // The endpoint comes from the source, never from the caller. That is what keeps this
            // route from becoming a way to make the server fetch an arbitrary host.
            let endpointUrl = source.sparql_server?.url;
            if (!endpointUrl || endpointUrl === defaultEndpointMarker) {
                endpointUrl = ConfigManager.config.sparql_server.url;
            }

            const user = await ConfigManager.getUser(req, res);
            UserRequestFiltering.filterSparqlRequest(scopedQuery, userSources, user, function (filteringError, allowedQuery) {
                if (filteringError) {
                    return res.status(403).json({ message: String(filteringError) });
                }

                const trimmedQuery = allowedQuery.trim();
                const lastClosingBraceIndex = trimmedQuery.lastIndexOf("}");
                const solutionModifiers = lastClosingBraceIndex === -1 ? trimmedQuery : trimmedQuery.slice(lastClosingBraceIndex + 1);
                const callerLimitMatch = solutionModifiers.match(tailLimitRegex);
                let limitedQuery = trimmedQuery;
                let appliedRowCeiling = mcpConfig.maxCollectedRows;
                if (callerLimitMatch) {
                    appliedRowCeiling = Number(callerLimitMatch[1]);
                } else {
                    limitedQuery = `${trimmedQuery} LIMIT ${appliedRowCeiling}`;
                }

                let endpointAuth = null;
                if (endpointUrl.indexOf(ConfigManager.config.sparql_server.url) === 0 && ConfigManager.config.sparql_server.user) {
                    endpointAuth = { user: ConfigManager.config.sparql_server.user, pass: ConfigManager.config.sparql_server.password, sendImmediately: false };
                }

                // A declaration in sources.json wins over the probe: it costs nothing and lets an
                // operator state a cap the probe cannot see, such as one applied by a gateway.
                const declaredEndpointMaxRows = Number(source.sparql_server?.maxRows) || null;
                discoverEndpointLimits(endpointUrl, endpointAuth, function (endpointLimits) {
                    const endpointRowCeiling = declaredEndpointMaxRows ?? endpointLimits.rowCeiling;
                    const isEndpointCeilingKnown = endpointRowCeiling !== null;
                    const effectiveRowCeiling = isEndpointCeilingKnown ? Math.min(appliedRowCeiling, endpointRowCeiling) : appliedRowCeiling;

                    const params = { query: limitedQuery, format: "json" };
                    if (endpointAuth) {
                        params.auth = { ...endpointAuth };
                    }

                    const startedAtMs = Date.now();
                    httpProxy.post(endpointUrl, sparqlResultsHeaders, params, function (endpointError, result) {
                        const elapsedMs = Date.now() - startedAtMs;
                        if (endpointError) {
                            // No client-side deadline is armed here on purpose. Virtuoso's own `timeout`
                            // request parameter looked like the answer and is a trap: measured against
                            // this instance, a query cut short by it comes back HTTP 200, valid SPARQL
                            // JSON, zero rows, no warning header and nothing in `head`. A caller cannot
                            // tell that from a genuine empty result, so it turns a slow query into a
                            // false negative. Waiting and failing loudly is worse for latency and better
                            // for correctness. The real fix belongs in the server: `MaxQueryExecutionTime`
                            // in virtuoso.ini makes the endpoint raise an actual error instead.
                            //
                            // Forwarded verbatim: the triple store names the offending token, the
                            // undeclared prefix or its own limit, and that text is the whole value
                            // of this answer. Summarising it would leave the caller guessing.
                            return res.status(502).json({ message: describeExecutionError(endpointError), elapsedMs: elapsedMs });
                        }
                        const answer = withRowCeilingNotice(result, effectiveRowCeiling, isEndpointCeilingKnown);
                        // What the endpoint spent, so a caller can find out which part of a query is
                        // expensive instead of guessing. Without it the only feedback is "answered"
                        // or "the client gave up", which is one bit and cannot separate a query that
                        // is comfortably fast from one two seconds under the deadline, nor say which
                        // clause carries the cost when the same query is tried without it.
                        answer.elapsedMs = elapsedMs;
                        // Reported only when it is the binding constraint. This platform's Virtuoso
                        // is configured at 10000 seconds, which no caller will ever reach: announcing
                        // it would tell an agent it has hours when the client gives up in one minute.
                        const endpointSeconds = endpointLimits.maxQueryExecutionSeconds;
                        if (endpointSeconds && endpointSeconds * 1000 < mcpConfig.requestTimeoutMs) {
                            answer.endpointQueryTimeLimitSeconds = endpointSeconds;
                        }
                        return res.status(200).json(answer);
                    });
                });
            });
        } catch (error) {
            res.status(500).json({ message: describeExecutionError(error) });
            return next(error);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Run a SELECT query against a source",
        description:
            "Executes raw SPARQL against the endpoint of `source`, for callers that need a query the catalog does not cover. " +
            "**SELECT only**: any other operation is refused with 403 before the query is parsed or forwarded, so this route cannot write. " +
            "The endpoint is resolved from the source configuration and never taken from the request, and the query then goes through " +
            "`UserRequestFiltering.filterSparqlRequest`, which restricts it to graphs the caller may read. " +
            "A query declaring neither `FROM` nor `GRAPH` is scoped to the source's own graph, and to the graphs it imports unless `withImports` is false, " +
            "so `source` bounds what the query reads instead of only choosing the endpoint. " +
            `A query with no trailing \`LIMIT\` receives the ceiling the MCP layer is willing to hold in one answer (\`MCP_MAX_COLLECTED_ROWS\`, ${mcpConfig.maxCollectedRows} by default), ` +
            "which is also what makes an `ORDER BY` without a LIMIT of its own fail on Virtuoso's 10000-row sort ceiling. " +
            "Prefer `sls_run_query_function` when a catalog function already answers the question: it is parameterised, tested, and cheaper to call.",
        operationId: "sparqlSelect",
        // `url` is deliberately absent from `body`: the MCP server builds the request only from the
        // templates declared here, so an agent has no way to name the host the server will call.
        "x-mcp": {
            tools: [
                {
                    name: "sls_sparql_select",
                    access: "read",
                    description:
                        "Runs a raw SPARQL SELECT against one source and returns the SPARQL JSON results. " +
                        "Only SELECT is accepted: INSERT, DELETE, LOAD, CLEAR, CREATE, DROP, COPY, MOVE and ADD are refused with 403. " +
                        "Leave the dataset out and it is filled in from `source`, its imported graphs included unless you set withImports false: an unscoped query would otherwise read every graph the endpoint holds, which is how a source-scoped question quietly returns rows from other sources. " +
                        "Write your own FROM or GRAPH blocks only to query something other than the source you named, and then `source` selects the endpoint alone. " +
                        "Avoid a `;` followed by one of those keywords anywhere in the text, quoted strings included: it reads as a chained update and is refused. " +
                        "Get the source name from sls_list_sources and its graphUri from that same answer. " +
                        `TIME: your client gives up around ${mcpConfig.requestTimeoutMs} ms and you get nothing back, not even a partial answer, so a heavy query costs you a full minute and teaches you nothing. ` +
                        "A LIMIT does not protect you: the endpoint scans the pattern before applying it. Bind the pattern instead: a rdf:type, a known predicate, a FILTER, one graph. " +
                        "An unbound `?s ?p ?o` over a large graph will not finish. Run SELECT (COUNT(*) AS ?total) first: it is cheap and it tells you what you are about to ask the endpoint to walk. " +
                        "Every answer carries `elapsedMs`, what the endpoint spent on it, so measure rather than guess: strip one element at a time and re-run to find which one carries the cost. " +
                        "Two different problems, two different remedies, and confusing them wastes a lot of time. " +
                        "A result that is merely LARGE gets cut at the endpoint's row ceiling and the rest stays reachable: set collect true and the whole set is walked for you, or re-run with OFFSET block after block until one comes back short. " +
                        `ORDER BY is the one clause that fails on its own: Virtuoso caps a sorted query at 10000 rows counted as your LIMIT plus your OFFSET, not as the rows it returns, and a query declaring no LIMIT receives the platform ceiling of ${mcpConfig.maxCollectedRows}, ` +
                        "so an ORDER BY is refused with SR353 even when the answer is a hundred rows. Give it an explicit LIMIT of 10000 or less and the identical query runs, or drop it and sort the rows yourself. " +
                        "Either way do not page with it: an ordered walk dies on its second block, while unsorted blocks come back in the endpoint's scan order, which is stable for an unchanging store. " +
                        "A query that is merely SLOW is not helped by OFFSET, it is made worse, since the endpoint re-evaluates the pattern up to offset+limit for every block and page ten costs more than the whole query did. " +
                        "Split that one on an indexed value instead, one rdf:type, one graph or one value of a bound predicate at a time, so that each part is cheap because the filter applies inside the index. " +
                        "SIZE: the same COUNT is the only way to know a result's real size, because endpoints cap result sets silently. " +
                        "Read the `rowCeiling` block of every answer: it reports the ceiling in force and whether this answer is complete, cut, or unknown. Never treat `unknown` as complete. " +
                        "Rows beyond the response budget are not lost: the `truncation` block names a resultId that sls_result_page reads and greps. " +
                        "Use this only when no function of sls_list_query_functions covers the question.",
                    params: {
                        source: { type: "string", required: true, description: "Source name as listed by sls_list_sources, for instance CFIHOS." },
                        query: {
                            type: "string",
                            required: true,
                            description:
                                "SPARQL SELECT text, PREFIX declarations included. Add LIMIT yourself when you want fewer rows than the platform ceiling. " +
                                "Leave the FROM out unless you mean to query graphs other than the source's own: it is written for you from `source`.",
                        },
                        withImports: {
                            type: "boolean",
                            required: false,
                            default: true,
                            description:
                                "Whether the FROM written for you also covers the graphs the source imports, which is what the SousLeSens interface does by default. " +
                                "Set it false to see what the source states on its own, with nothing inherited. Ignored when the query declares its own FROM or GRAPH.",
                        },
                        collect: {
                            type: "boolean",
                            required: false,
                            default: false,
                            description:
                                "Walk the whole result set instead of returning one block. This is the only way past 10000 rows here, so use it whenever the user asked for every row, typically an export: " +
                                `collecting costs one round trip to the triple store per ${collectBatchSize} rows, so a large set takes many, and there is no way to stop it once started. ` +
                                "Refuses a LIMIT or OFFSET of your own, since it manages those itself, and refuses an ORDER BY, which Virtuoso will not sort past 10000 rows. Sort the rows afterwards if you need them ordered. " +
                                "To answer a question rather than produce a file, leave it false and use a COUNT or a GROUP BY: they answer from one call whatever the size.",
                        },
                    },
                    // `collect` is absent from the body on purpose: the walk belongs to the MCP
                    // server, which reads the flag and calls this route once per block. The route
                    // itself never loops and has no idea it is being paged.
                    body: { source: "{source}", query: "{query}", withImports: "{withImports}" },
                    pagedCollection: { enabledByParam: "collect", queryParam: "query", batchSize: collectBatchSize },
                    // No `statusHints` on purpose. The MCP server *replaces* the error message with
                    // the hint rather than adding to it, which is right for the routes that use it,
                    // all of them on a 500 whose upstream text is "An error occurred on the server".
                    // Here every refusal is specific: which rule the query broke, which source is
                    // unknown, what the triple store answered. A hint would throw exactly the part
                    // an agent needs to fix its next turn.
                },
            ],
        },
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "query"],
                    properties: {
                        source: { type: "string", description: "Source name, as declared in sources.json.", example: "CFIHOS" },
                        query: {
                            type: "string",
                            description: "SPARQL SELECT text. Its dataset is filled in from `source` when it declares none, so a query that names no graph never reads the whole store.",
                            example: "SELECT ?class ?label WHERE { ?class a owl:Class . OPTIONAL { ?class rdfs:label ?label } } LIMIT 50",
                        },
                        withImports: {
                            type: "boolean",
                            default: true,
                            description: "Whether the dataset written from `source` also covers the graphs it imports. Ignored when the query declares its own FROM or GRAPH.",
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "SPARQL 1.1 JSON results returned by the endpoint.",
                schema: { $ref: "#/definitions/SparqlQueryResponse" },
            },
            400: { description: "`source` or `query` missing, or the source declares no graph to scope an unscoped query with." },
            403: { description: "The query is not a SELECT, or it reads a graph the caller may not read." },
            404: { description: "Unknown source, or not readable by this account." },
            502: { description: "The SPARQL endpoint refused the query or is unreachable." },
        },
        tags: ["Sparql"],
    };

    return operations;
}
