#!/usr/bin/env node
/** Read-only, partial OWL contradiction checks over a SPARQL 1.1 endpoint. */
import { pathToFileURL } from 'node:url';

const PREFIXES = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
`;
const SAME = '(owl:sameAs|^owl:sameAs)*';
const SUPER = '(rdfs:subClassOf|owl:equivalentClass|^owl:equivalentClass)*';
const different = (a, b) => `
  { ${a} (owl:differentFrom|^owl:differentFrom) ${b} }
  UNION {
    ?differentSet a owl:AllDifferent ; (owl:distinctMembers|owl:members) ?differentList .
    ?differentList rdf:rest* ?differentCell1, ?differentCell2 .
    ?differentCell1 rdf:first ${a} . ?differentCell2 rdf:first ${b} .
    FILTER(?differentCell1 != ?differentCell2)
  }`;

// Exported so callers can inspect exactly what is checked.
export const RULES = [
    {
        id: 'same-and-different',
        description: 'Individuals asserted equal are also explicitly different.',
        pattern: `?a ${SAME} ?b . { ${different('?a', '?b')} }`,
    },
    {
        id: 'disjoint-classes',
        description: 'An individual belongs to two disjoint classes.',
        pattern: `?x ${SAME} ?x1, ?x2 .
      ?x1 a ?type1 . ?x2 a ?type2 .
      ?type1 ${SUPER} ?class1 . ?type2 ${SUPER} ?class2 .
      {
        ?class1 (owl:disjointWith|^owl:disjointWith) ?class2 .
      } UNION {
        ?set a owl:AllDisjointClasses ; owl:members ?list .
        ?list rdf:rest* ?cell1, ?cell2 .
        ?cell1 rdf:first ?class1 . ?cell2 rdf:first ?class2 .
        FILTER(?cell1 != ?cell2)
      }`,
    },
    {
        id: 'nothing-membership',
        description: 'An individual belongs to owl:Nothing.',
        pattern: `?x a ?type . ?type ${SUPER} owl:Nothing .`,
    },
    {
        id: 'complement-classes',
        description: 'An individual belongs to a class and its complement.',
        pattern: `?x ${SAME} ?x1, ?x2 .
      ?x1 a ?type1 . ?x2 a ?type2 .
      ?type1 ${SUPER} ?class1 . ?type2 ${SUPER} ?class2 .
      ?class1 (owl:complementOf|^owl:complementOf) ?class2 .`,
    },
    {
        id: 'negative-assertion',
        description: 'A positive property assertion contradicts a negative assertion.',
        pattern: `?negative a owl:NegativePropertyAssertion ;
      owl:sourceIndividual ?source ; owl:assertionProperty ?property .
      ?source ${SAME} ?s . ?s ?property ?value .
      {
        ?negative owl:targetIndividual ?target .
        ?value ${SAME} ?target .
      } UNION {
        ?negative owl:targetValue ?target .
        FILTER(isLiteral(?value) && ?value = ?target)
      }`,
    },
    {
        id: 'irreflexive-property',
        description: 'An irreflexive property relates an individual to itself.',
        pattern: `?property a owl:IrreflexiveProperty .
      ?s ?property ?o . ?s ${SAME} ?o .`,
    },
    {
        id: 'asymmetric-property',
        description: 'An asymmetric property has edges in both directions.',
        pattern: `?property a owl:AsymmetricProperty .
      ?s ?property ?o . ?o ${SAME} ?o2 . ?s ${SAME} ?s2 .
      ?o2 ?property ?s2 .`,
    },
    {
        id: 'disjoint-properties',
        description: 'Two disjoint properties relate the same pair of individuals.',
        pattern: `?s ?property1 ?o . ?s ${SAME} ?s2 .
      ?s2 ?property2 ?o2 .
      FILTER(sameTerm(?o, ?o2) || (isLiteral(?o) && isLiteral(?o2) && ?o = ?o2))
      {
        ?property1 (owl:propertyDisjointWith|^owl:propertyDisjointWith) ?property2 .
      } UNION {
        ?set a owl:AllDisjointProperties ; owl:members ?list .
        ?list rdf:rest* ?cell1, ?cell2 .
        ?cell1 rdf:first ?property1 . ?cell2 rdf:first ?property2 .
        FILTER(?cell1 != ?cell2)
      }`,
    },
    {
        id: 'functional-object-property',
        description: 'A functional object property has explicitly different fillers.',
        pattern: `?property a owl:FunctionalProperty, owl:ObjectProperty .
      ?s ${SAME} ?s2 . ?s ?property ?a0 . ?s2 ?property ?b0 .
      ?a0 ${SAME} ?a . ?b0 ${SAME} ?b .
      { ${different('?a', '?b')} }`,
    },
    {
        id: 'inverse-functional-property',
        description: 'An inverse-functional property has explicitly different subjects sharing a filler.',
        pattern: `?property a owl:InverseFunctionalProperty .
      ?a0 ?property ?o . ?b0 ?property ?o2 . ?o ${SAME} ?o2 .
      ?a0 ${SAME} ?a . ?b0 ${SAME} ?b .
      { ${different('?a', '?b')} }`,
    },
];

function iri(value) {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9+.-]*:/i.test(value) ||
        /[\u0000-\u0020<>"{}|^`\\]/u.test(value)) {
        throw new TypeError('Graph must be an absolute IRI without SPARQL delimiters.');
    }
    return `<${value}>`;
}

export function buildQuery(rule, { graphs = [], limit = 100 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit >= Number.MAX_SAFE_INTEGER) {
        throw new TypeError('limit must be a positive safe integer.');
    }
    if (!Array.isArray(graphs)) throw new TypeError('graphs must be an array.');
    const dataset = graphs.map(graph => `FROM ${iri(graph)}`).join('\n');
    return `${PREFIXES}\nSELECT DISTINCT *\n${dataset}\nWHERE {\n${rule.pattern}\n}\nLIMIT ${limit + 1}`;
}

/** Execute one query over HTTP and return the parsed SPARQL JSON result. */
export async function requestSparql(query, {
    endpoint, headers = {}, timeoutMs = 30_000, fetchImpl = globalThis.fetch,
} = {}) {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Use an HTTP(S) endpoint.');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('Invalid timeoutMs.');
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch is unavailable.');
    const requestHeaders = new Headers(headers);
    requestHeaders.set('Accept', 'application/sparql-results+json');
    requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
    const response = await fetchImpl(url.href, {
        method: 'POST', headers: requestHeaders,
        body: new URLSearchParams({ query }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers?.get('content-type') || 'unspecified';
    const responseInfo = `HTTP ${response.status}, Content-Type: ${contentType}`;
    const body = await response.text();
    if (!body.trim()) {
        throw new Error(`Empty SPARQL response (${responseInfo}). Check the query endpoint URL, authentication, and server/proxy logs; SELECT requires a JSON results body.`);
    }
    try {
        return JSON.parse(body);
    } catch (cause) {
        throw new Error(`Invalid or incomplete SPARQL JSON response (${responseInfo}, ${body.length} characters). Check that the endpoint returns application/sparql-results+json and that the server/proxy has not truncated the response.`, { cause });
    }
}

/**
 * request(query, { ruleId }): callback returning parsed SPARQL SELECT JSON
 * (or a Promise for it). When supplied, it owns transport/auth/timeouts;
 * endpoint, headers, timeoutMs and fetchImpl are only used by the default HTTP request.
 * graphs: explicit graphs merged into the query default graph; omitted uses
 * the endpoint default dataset. Include both ontology and instance graphs.
 * headers: e.g. { Authorization: `Bearer ${token}` }.
 * Results retain SPARQL binding objects, including datatype and language.
 * Any failed query rejects the run; it never produces a clean report.
 * Supports run({ request, ...options }) and run(request, options).
 */
export async function run(requestOrOptions = {}, options = {}) {
    const configuration = typeof requestOrOptions === 'function'
        ? { ...options, request: requestOrOptions }
        : requestOrOptions;
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
        throw new TypeError('Use run(requestCallback, options) or run(options).');
    }
    const {
        endpoint, graphs = [], limit = 100, timeoutMs = 30_000,
        headers = {}, fetchImpl = globalThis.fetch, request,
    } = configuration;
    if (request !== undefined && typeof request !== 'function') {
        throw new TypeError('request must be a function.');
    }
    const executeRequest = request ?? (query => requestSparql(query, {
        endpoint, headers, timeoutMs, fetchImpl,
    }));
    const queries = RULES.map(rule => buildQuery(rule, { graphs, limit }));
    const checks = [];
    // Sequential queries avoid overloading the endpoint.
    for (let i = 0; i < RULES.length; i++) {
        const rule = RULES[i];
        try {
            const result = await executeRequest(queries[i], { ruleId: rule.id });
            if (!Array.isArray(result?.head?.vars) || !Array.isArray(result?.results?.bindings)) {
                throw new Error('Endpoint did not return a SPARQL SELECT JSON result.');
            }
            const bindings = result.results.bindings;
            checks.push({
                id: rule.id, description: rule.description,
                violationDetected: bindings.length > 0,
                truncated: bindings.length > limit,
                examples: bindings.slice(0, limit),
            });
        } catch (cause) {
            throw new Error(`Check "${rule.id}" failed; consistency is unknown.`, { cause });
        }
    }
    const violationDetected = checks.some(check => check.violationDetected);
    return {
        status: violationDetected ? 'violations-detected' : 'no-violations-detected',
        completeOwlConsistencyCheck: false,
        checkedAt: new Date().toISOString(),
        graphs,
        checks,
    };
}

// Keep the original API available for existing callers.
export { run as checkOwlConsistency };

async function main() {
    const [endpoint, ...graphs] = process.argv.slice(2);
    if (!endpoint) {
        console.error('Usage: node owl-consistency.mjs ENDPOINT [GRAPH_IRI ...]');
        process.exitCode = 2;
        return;
    }
    try {
        const headers = process.env.SPARQL_TOKEN
            ? { Authorization: `Bearer ${process.env.SPARQL_TOKEN}` } : {};
        const report = await run({ endpoint, graphs, headers });
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = report.status === 'violations-detected' ? 1 : 0;
    } catch (error) {
        console.error(error.message);
        if (error.cause) console.error(error.cause.message);
        process.exitCode = 2;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
