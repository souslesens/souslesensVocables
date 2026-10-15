#!/usr/bin/env node
/** Partial OWL property unsatisfiability checks using read-only SPARQL rules. */
import { pathToFileURL } from "node:url";
import { buildQuery as buildSparqlQuery, requestSparql } from "./owl-consistency.mjs";

export { requestSparql };

const SUPER_PROPERTY = "(rdfs:subPropertyOf|owl:equivalentProperty|^owl:equivalentProperty)*";
const EQUIVALENT_PROPERTY = "(owl:equivalentProperty|^owl:equivalentProperty)*";
// If the endpoint of this path must be empty, its subproperties and inverses must be empty too.
const EMPTY_DEPENDENCY = "(rdfs:subPropertyOf|owl:equivalentProperty|^owl:equivalentProperty|owl:inverseOf|^owl:inverseOf)*";
const SUPER_CLASS = "(rdfs:subClassOf|owl:equivalentClass|^owl:equivalentClass|owl:intersectionOf/rdf:rest*/rdf:first)*";

const CANDIDATE = `
  VALUES ?propertyKind { owl:ObjectProperty owl:DatatypeProperty }
  ?property a ?propertyKind .
  FILTER(isIRI(?property))
  FILTER(?property NOT IN (owl:bottomObjectProperty, owl:bottomDataProperty))
  ?property ${EMPTY_DEPENDENCY} ?emptyProperty .
`;

function disjointClasses() {
    return `{
    ?class1 (owl:disjointWith|^owl:disjointWith|owl:complementOf|^owl:complementOf) ?class2 .
  } UNION {
    ?classSet a owl:AllDisjointClasses ; owl:members ?classList .
    ?classList rdf:rest* ?classCell1, ?classCell2 .
    ?classCell1 rdf:first ?class1 . ?classCell2 rdf:first ?class2 .
    FILTER(?classCell1 != ?classCell2)
  }`;
}

function boundClasses(bound) {
    return `?emptyProperty ${SUPER_PROPERTY} ?super1, ?super2 .
    ?super1 rdfs:${bound} ?bound1 . ?super2 rdfs:${bound} ?bound2 .
    ?bound1 ${SUPER_CLASS} ?class1 . ?bound2 ${SUPER_CLASS} ?class2 .
    { ${disjointClasses()} }`;
}

export const RULES = [
    {
        id: "bottom-superproperty",
        description: "A property depends on an OWL bottom property and must be empty.",
        pattern: `${CANDIDATE}
      VALUES ?bottom { owl:bottomObjectProperty owl:bottomDataProperty }
      ?emptyProperty ${SUPER_PROPERTY} ?bottom .`,
    },
    {
        id: "disjoint-superproperties",
        description: "A property is contained in two disjoint properties and must be empty.",
        pattern: `${CANDIDATE}
      ?emptyProperty ${SUPER_PROPERTY} ?super1, ?super2 .
      {
        ?super1 (owl:propertyDisjointWith|^owl:propertyDisjointWith) ?super2 .
      } UNION {
        ?propertySet a owl:AllDisjointProperties ; owl:members ?propertyList .
        ?propertyList rdf:rest* ?propertyCell1, ?propertyCell2 .
        ?propertyCell1 rdf:first ?super1 . ?propertyCell2 rdf:first ?super2 .
        FILTER(?propertyCell1 != ?propertyCell2)
      }`,
    },
    {
        id: "nothing-domain",
        description: "A property has a domain contained in owl:Nothing and must be empty.",
        pattern: `${CANDIDATE}
      ?emptyProperty ${SUPER_PROPERTY} ?super .
      ?super rdfs:domain ?domain . ?domain ${SUPER_CLASS} owl:Nothing .`,
    },
    {
        id: "disjoint-domains",
        description: "A property requires a subject in disjoint or complementary classes.",
        pattern: `${CANDIDATE} ${boundClasses("domain")}`,
    },
    {
        id: "nothing-object-range",
        description: "An object property has a range contained in owl:Nothing and must be empty.",
        pattern: `${CANDIDATE}
      ?emptyProperty a owl:ObjectProperty .
      ?emptyProperty ${SUPER_PROPERTY} ?super .
      ?super rdfs:range ?range . ?range ${SUPER_CLASS} owl:Nothing .`,
    },
    {
        id: "disjoint-object-ranges",
        description: "An object property requires an object in disjoint or complementary classes.",
        pattern: `${CANDIDATE} ?emptyProperty a owl:ObjectProperty . ${boundClasses("range")}`,
    },
    {
        id: "symmetric-and-asymmetric",
        description: "A symmetric property is also asymmetric and therefore must be empty.",
        pattern: `${CANDIDATE}
      ?emptyProperty ${EQUIVALENT_PROPERTY} ?symmetricProperty .
      ?symmetricProperty a owl:SymmetricProperty .
      ?emptyProperty ${SUPER_PROPERTY} ?asymmetricProperty .
      ?asymmetricProperty a owl:AsymmetricProperty .`,
    },
];

// Reuses graph IRI validation, prefixes and limit handling from the consistency checker.
export function buildQuery(rule, options = {}) {
    return buildSparqlQuery(rule, options);
}

/**
 * run(requestCallback, options) or run({ request, ...options }).
 * Callback contract: request(query, { ruleId }) -> parsed SPARQL SELECT JSON.
 * Without a callback, uses the same HTTP options as owl-consistency.mjs.
 * This reports schema evidence forcing properties empty; it does not check
 * whether the ontology has a model or whether property assertions exist.
 */
export async function run(requestOrOptions = {}, options = {}) {
    const config = typeof requestOrOptions === "function" ? { ...options, request: requestOrOptions } : requestOrOptions;
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new TypeError("Use run(requestCallback, options) or run(options).");
    }
    const { endpoint, graphs = [], limit = 100, timeoutMs = 30_000, headers = {}, fetchImpl = globalThis.fetch, request } = config;
    if (request !== undefined && typeof request !== "function") throw new TypeError("request must be a function.");
    const executeRequest =
        request ??
        ((query) =>
            requestSparql(query, {
                endpoint,
                headers,
                timeoutMs,
                fetchImpl,
            }));
    const queries = RULES.map((rule) => buildQuery(rule, { graphs, limit }));
    const checks = [];
    const predicates = new Set();
    for (let i = 0; i < RULES.length; i++) {
        const rule = RULES[i];
        try {
            const result = await executeRequest(queries[i], { ruleId: rule.id });
            if (!Array.isArray(result?.head?.vars) || !Array.isArray(result?.results?.bindings)) {
                throw new Error("Expected a SPARQL SELECT JSON result.");
            }
            const bindings = result.results.bindings;
            for (const binding of bindings) {
                if (binding?.property?.type !== "uri" || typeof binding.property.value !== "string") {
                    throw new Error("Every result row must bind ?property to an IRI.");
                }
            }
            const examples = bindings.slice(0, limit);
            for (const row of examples) predicates.add(row.property.value);
            checks.push({
                id: rule.id,
                description: rule.description,
                unsatisfiableDetected: bindings.length > 0,
                truncated: bindings.length > limit,
                examples,
            });
        } catch (cause) {
            throw new Error(`Check "${rule.id}" failed; property satisfiability is unknown.`, { cause });
        }
    }
    return {
        status: checks.some((check) => check.unsatisfiableDetected) ? "unsatisfiable-predicates-detected" : "no-unsatisfiable-predicates-detected",
        completeOwlSatisfiabilityCheck: false,
        ontologyConsistency: "not-checked",
        checkedAt: new Date().toISOString(),
        graphs,
        predicates: [...predicates].sort(),
        truncated: checks.some((check) => check.truncated),
        checks,
    };
}

export { run as checkUnsatisfiablePredicates };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [endpoint, ...graphs] = process.argv.slice(2);
    try {
        if (!endpoint) throw new Error("Usage: node owl-unsatisfiable.mjs ENDPOINT [GRAPH_IRI ...]");
        const headers = process.env.SPARQL_TOKEN ? { Authorization: `Bearer ${process.env.SPARQL_TOKEN}` } : {};
        const report = await run({ endpoint, graphs, headers });
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = report.status === "unsatisfiable-predicates-detected" ? 1 : 0;
    } catch (error) {
        console.error(error.message);
        if (error.cause) console.error(error.cause.message);
        process.exitCode = 2;
    }
}
