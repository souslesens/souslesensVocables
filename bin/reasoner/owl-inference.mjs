#!/usr/bin/env node
/** Partial, read-only OWL/RDFS inference through SPARQL SELECT rules. */
import { pathToFileURL } from "node:url";
import { buildQuery as buildSparqlQuery, requestSparql } from "./owl-consistency.mjs";

export { requestSparql };
const SUPER_CLASS = "(rdfs:subClassOf|owl:equivalentClass|^owl:equivalentClass)*";
const SUPER_PROPERTY = "(rdfs:subPropertyOf|owl:equivalentProperty|^owl:equivalentProperty)*";
const EQUIVALENT_PROPERTY = "(owl:equivalentProperty|^owl:equivalentProperty)*";
const SAME = "(owl:sameAs|^owl:sameAs)*";

// Each pattern binds the conclusion as ?s ?p ?o. Remaining variables are evidence.
export const RULES = [
    {
        id: "subclass-membership",
        description: "Propagate class membership through subclass and equivalent-class paths.",
        pattern: `?s a ?sourceClass . ?sourceClass ${SUPER_CLASS} ?o . BIND(rdf:type AS ?p)`,
    },
    {
        id: "subproperty-assertion",
        description: "Propagate assertions through subproperty and equivalent-property paths.",
        pattern: `?s ?sourceProperty ?o . ?sourceProperty ${SUPER_PROPERTY} ?p .`,
    },
    {
        id: "inverse-property",
        description: "Reverse assertions using an inverse-property axiom.",
        pattern: `?o ?sourceProperty ?s .
      ?sourceProperty ${EQUIVALENT_PROPERTY} ?inverseSource .
      ?inverseSource (owl:inverseOf|^owl:inverseOf) ?inverseTarget .
      ?inverseTarget ${SUPER_PROPERTY} ?p .`,
    },
    {
        id: "symmetric-property",
        description: "Reverse assertions of a symmetric property.",
        pattern: `?symmetricProperty a owl:SymmetricProperty .
      ?sourceProperty ${SUPER_PROPERTY} ?symmetricProperty .
      ?o ?sourceProperty ?s . ?symmetricProperty ${SUPER_PROPERTY} ?p .`,
    },
    {
        id: "transitive-property",
        description: "Join two assertions of a transitive property.",
        pattern: `?transitiveProperty a owl:TransitiveProperty .
      ?s ?leftProperty ?middle . ?middle ?rightProperty ?o .
      ?leftProperty ${SUPER_PROPERTY} ?transitiveProperty .
      ?rightProperty ${SUPER_PROPERTY} ?transitiveProperty .
      ?transitiveProperty ${SUPER_PROPERTY} ?p .`,
    },
    {
        id: "property-domain",
        description: "Infer subject types from OWL property domains.",
        pattern: `VALUES ?propertyKind { owl:ObjectProperty owl:DatatypeProperty }
      ?sourceProperty a ?propertyKind . ?s ?sourceProperty ?value .
      ?sourceProperty ${SUPER_PROPERTY} ?domainProperty .
      ?domainProperty rdfs:domain ?domain . ?domain ${SUPER_CLASS} ?o .
      BIND(rdf:type AS ?p)`,
    },
    {
        id: "object-property-range",
        description: "Infer object types from object-property ranges.",
        pattern: `?sourceProperty a owl:ObjectProperty . ?subject ?sourceProperty ?s .
      ?sourceProperty ${SUPER_PROPERTY} ?rangeProperty .
      ?rangeProperty rdfs:range ?range . ?range ${SUPER_CLASS} ?o .
      BIND(rdf:type AS ?p)`,
    },
    {
        id: "same-as-closure",
        description: "Infer symmetric and transitive equality links between named individuals.",
        pattern: `?s ${SAME} ?o . FILTER(isIRI(?o) && !sameTerm(?s, ?o))
      BIND(owl:sameAs AS ?p)`,
    },
    {
        id: "same-as-subject",
        description: "Copy assertions to an equal subject.",
        pattern: `?sourceSubject ?p ?o . ?sourceSubject ${SAME} ?s .
      FILTER(!sameTerm(?sourceSubject, ?s))`,
    },
    {
        id: "same-as-object",
        description: "Copy assertions to an equal object.",
        pattern: `?s ?p ?sourceObject . FILTER(!isLiteral(?sourceObject))
      ?sourceObject ${SAME} ?o . FILTER(!sameTerm(?sourceObject, ?o))`,
    },
    {
        id: "functional-object-equality",
        description: "Infer equality of two fillers of a functional object property.",
        pattern: `?property a owl:FunctionalProperty, owl:ObjectProperty .
      ?subject ?leftProperty ?s ; ?rightProperty ?o .
      ?leftProperty ${SUPER_PROPERTY} ?property . ?rightProperty ${SUPER_PROPERTY} ?property .
      FILTER(isIRI(?o) && !sameTerm(?s, ?o)) BIND(owl:sameAs AS ?p)`,
    },
    {
        id: "inverse-functional-equality",
        description: "Infer equality of subjects sharing a filler of an inverse-functional property.",
        pattern: `?property a owl:InverseFunctionalProperty .
      ?s ?leftProperty ?value . ?o ?rightProperty ?value .
      ?leftProperty ${SUPER_PROPERTY} ?property . ?rightProperty ${SUPER_PROPERTY} ?property .
      FILTER(isIRI(?o) && !sameTerm(?s, ?o)) BIND(owl:sameAs AS ?p)`,
    },
    {
        id: "has-value-restriction",
        description: "Infer the property value required by an owl:hasValue restriction.",
        pattern: `?s a ?sourceClass . ?sourceClass ${SUPER_CLASS} ?restriction .
      ?restriction a owl:Restriction ; owl:onProperty ?p ; owl:hasValue ?o .`,
    },
    {
        id: "all-values-from-restriction",
        description: "Infer types of existing fillers of an object allValuesFrom restriction.",
        pattern: `?subject a ?sourceClass . ?sourceClass ${SUPER_CLASS} ?restriction .
      ?restriction a owl:Restriction ; owl:onProperty ?property ; owl:allValuesFrom ?fillerClass .
      ?property a owl:ObjectProperty . ?subject ?sourceProperty ?s .
      ?sourceProperty ${SUPER_PROPERTY} ?property . ?fillerClass ${SUPER_CLASS} ?o .
      BIND(rdf:type AS ?p)`,
    },
];

export function buildQuery(rule, options = {}) {
    const query = buildSparqlQuery(
        {
            pattern: `${rule.pattern}
      FILTER(isIRI(?s) && isIRI(?p) && (isIRI(?o) || isLiteral(?o)))
      FILTER NOT EXISTS { ?s ?p ?o }`,
        },
        options,
    );
    return query;
}

function validateTriple(row) {
    if (row?.s?.type !== "uri" || row?.p?.type !== "uri" || !["uri", "literal", "typed-literal"].includes(row?.o?.type) || [row.s, row.p, row.o].some((term) => typeof term.value !== "string")) {
        throw new Error("Every row must bind ?s and ?p to IRIs, and ?o to an IRI or literal.");
    }
}

function tripleKey({ s, p, o }) {
    return JSON.stringify([s.value, p.value, o.type === "typed-literal" ? "literal" : o.type, o.value, o.datatype || "", o["xml:lang"] || ""]);
}

/**
 * run(requestCallback, options) or run({ request, ...options }).
 * Callback returns parsed SPARQL SELECT JSON; HTTP options match the other modules.
 * Executes one read-only pass against the dataset. Returned triples are not fed
 * into subsequent rules and are not inserted into the store.
 */
export async function run(requestOrOptions = {}, options = {}) {
    const config = typeof requestOrOptions === "function" ? { ...options, request: requestOrOptions } : requestOrOptions;
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new TypeError("Use run(requestCallback, options) or run(options).");
    }
    const { endpoint, graphs = [], limit = 100, timeoutMs = 30_000, headers = {}, fetchImpl = globalThis.fetch, request } = config;
    if (request !== undefined && typeof request !== "function") throw new TypeError("request must be a function.");
    const executeRequest = request ?? ((query) => requestSparql(query, { endpoint, headers, timeoutMs, fetchImpl }));
    const queries = RULES.map((rule) => buildQuery(rule, { graphs, limit }));
    const checks = [];
    const triples = new Map();
    for (let i = 0; i < RULES.length; i++) {
        const rule = RULES[i];
        try {
            const result = await executeRequest(queries[i], { ruleId: rule.id });
            if (!Array.isArray(result?.head?.vars) || !Array.isArray(result?.results?.bindings)) {
                throw new Error("Expected a SPARQL SELECT JSON result.");
            }
            const bindings = result.results.bindings;
            for (const row of bindings) validateTriple(row);
            const examples = bindings.slice(0, limit);
            for (const row of examples) {
                const key = tripleKey(row);
                if (!triples.has(key)) triples.set(key, { s: row.s, p: row.p, o: row.o, rules: [] });
                const triple = triples.get(key);
                if (!triple.rules.includes(rule.id)) triple.rules.push(rule.id);
            }
            checks.push({
                id: rule.id,
                description: rule.description,
                inferenceDetected: bindings.length > 0,
                truncated: bindings.length > limit,
                examples,
            });
        } catch (cause) {
            throw new Error(`Inference rule "${rule.id}" failed; inference is incomplete.`, { cause });
        }
    }
    return {
        status: triples.size ? "inferred-triples-detected" : "no-new-triples-detected",
        completeOwlInference: false,
        ontologyConsistency: "not-checked",
        mode: "read-only-single-pass",
        checkedAt: new Date().toISOString(),
        graphs,
        truncated: checks.some((check) => check.truncated),
        inferredTriples: [...triples.values()],
        checks,
    };
}

export { run as inferTriples };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [endpoint, ...graphs] = process.argv.slice(2);
    try {
        if (!endpoint) throw new Error("Usage: node owl-inference.mjs ENDPOINT [GRAPH_IRI ...]");
        const headers = process.env.SPARQL_TOKEN ? { Authorization: `Bearer ${process.env.SPARQL_TOKEN}` } : {};
        console.log(JSON.stringify(await run({ endpoint, graphs, headers }), null, 2));
    } catch (error) {
        console.error(error.message);
        if (error.cause) console.error(error.cause.message);
        process.exitCode = 2;
    }
}
