#!/usr/bin/env node
/** Read-only, partial OWL contradiction checks over a SPARQL 1.1 endpoint. */
import {pathToFileURL} from 'node:url';
import request from "request";

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

export function buildQuery(rule, {graphs = [], limit = 100} = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit >= Number.MAX_SAFE_INTEGER) {
        throw new TypeError('limit must be a positive safe integer.');
    }
    if (!Array.isArray(graphs)) {
        throw new TypeError('graphs must be an array.');
    }
    const dataset = graphs.map(graph => `FROM ${iri(graph)}`).join('\n');
    return `${PREFIXES}\nSELECT DISTINCT *\n${dataset}\nWHERE {\n${rule.pattern}\n}\nLIMIT ${limit + 1}`;
}

/**
 * graphs: explicit graphs merged into the query default graph; omitted uses
 * the endpoint default dataset. Include both ontology and instance graphs.
 * headers: e.g. { Authorization: `Bearer ${token}` }.
 * Results retain SPARQL binding objects, including datatype and language.
 * Any failed query rejects the run; it never produces a clean report.
 */
export async function run({
                              endpoint, graphs = [], limit = 100, timeoutMs = 30_000,
                              headers = {}, fetchImpl = globalThis.fetch,
                          } = {}) {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new TypeError('Use an HTTP(S) endpoint.');
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
        throw new TypeError('Invalid timeoutMs.');
    }
    if (typeof fetchImpl !== 'function') {
        throw new TypeError('fetch is unavailable.');
    }
    const queries = RULES.map(rule => buildQuery(rule, {graphs, limit}));
    const checks = [];
    // Sequential queries avoid overloading the endpoint.
    for (let i = 0; i < RULES.length; i++) {
        const rule = RULES[i];
        try {
            const requestHeaders = new Headers(headers);
            requestHeaders.set('Accept', 'application/sparql-results+json');
            requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
            const response = await fetchImpl(url.href, {
                method: 'POST', headers: requestHeaders,
                body: new URLSearchParams({query: queries[i]}),
                signal: AbortSignal.timeout(timeoutMs),
            });
            console.log(response.json)
            if (false && !response.ok) {
               var x= response.body
            var y=  response.status()
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();





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
            throw new Error(`Check "${rule.id}" failed; consistency is unknown.`, {cause});
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
export {run as checkOwlConsistency};

async function main() {
    const [endpoint, ...graphs] = process.argv.slice(2);
    if (!endpoint) {
        console.error('Usage: node owl-consistency.mjs ENDPOINT [GRAPH_IRI ...]');
        process.exitCode = 2;
        return;
    }
    try {
        const headers = process.env.SPARQL_TOKEN
            ? {Authorization: `Bearer ${process.env.SPARQL_TOKEN}`} : {};
        const report = await run({endpoint, graphs, headers});
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = report.status === 'violations-detected' ? 1 : 0;
    } catch (error) {
        console.error(error.message);
        if (error.cause) {
            console.error(error.cause.message);
        }
        process.exitCode = 2;
    }
}


async function executeQuery(sparqlUrl, query) {

    var options = {
        "method": "POST",
        "url": "http://51.178.139.80:8890/sparql?format=json&query=",
        "auth": {
            "user": process.env.SPARQL_USERNAME,
            "pass": process.env.SPARQL_PASSWORD,
            "sendImmediately": false
        },
        "headers": {
            "Accept": "application/sparql-results+json",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        "form": {
            "query": query,
            "useProxy": true,
            "auth": {
                "user": process.env.SPARQL_USERNAME,
                "pass": process.env.SPARQL_PASSWORD,
                "sendImmediately": false
            }
        }
    }


    request(options, async function (error, response, body) {
        try {
            if (error) {
                console.log(error);
                //  console.log("HTTP_PROXY_ERROR"+JSON.stringify(error, null, 2))


                body = JSON.parse(body);
                //  return callback(null, obj);
            }
        } catch (e) {


        }

        return body;


    })
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
