#!/usr/bin/env node
/**
 * Checks the SELECT-only veto behind POST /api/v1/sparql/select.
 *
 * Runs offline: it exercises `UserRequestFiltering.isSelectQuery` directly, which is the single
 * discriminator the route calls before it resolves an endpoint or forwards anything. What matters
 * here is not that a plain SELECT passes, it is that every disguise fails: a commented-out
 * operation, a sub-SELECT nested in an update, an update chained behind a leading SELECT.
 *
 * The chaining case carries the most weight. `filterSparqlRequest` returns early for admins, and
 * /ai/complete is admin-only, so the sparqljs parse inside `checkSelectQuery` never runs for an
 * agent turn. This veto is then the only thing standing between the agent and the triple store.
 *
 * Run: node scripts/tests/test-sparql-select-veto.js
 */

import UserRequestFiltering from "../../bin/userRequestFiltering.js";

const allowedQueries = [
    ["a plain SELECT", "SELECT ?s WHERE { GRAPH <http://g> { ?s ?p ?o } }"],
    ["lower case", "select ?s where { graph <http://g> { ?s ?p ?o } }"],
    ["leading whitespace and newlines", "\n\n   SELECT ?s WHERE { GRAPH <http://g> { ?s ?p ?o } }"],
    ["PREFIX declarations first", "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nSELECT ?s FROM <http://g> WHERE { ?s rdfs:label ?l }"],
    ["several PREFIX lines", "PREFIX owl: <http://www.w3.org/2002/07/owl#>\nPREFIX rdf: <http://x>\nSELECT ?c FROM <http://g> WHERE { ?c a owl:Class }"],
    ["a leading comment then SELECT", "# listing the classes\nSELECT ?c FROM <http://g> WHERE { ?c ?p ?o }"],
    ["a semicolon in a property list", "SELECT ?s FROM <http://g> WHERE { ?s rdfs:label ?l ; rdfs:comment ?c }"],
    ["a sub-SELECT inside a SELECT", "SELECT ?s FROM <http://g> WHERE { { SELECT ?s WHERE { ?s ?p ?o } LIMIT 5 } }"],
    ["a BASE declaration first", "BASE <http://x#>\nSELECT ?s FROM <http://g> WHERE { ?s ?p ?o }"],
    ["BASE then PREFIX", "BASE <http://x#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nSELECT ?s FROM <http://g> WHERE { ?s rdfs:label ?l }"],
    ["PREFIX then BASE", "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> BASE <http://x#> SELECT ?s FROM <http://g> WHERE { ?s ?p ?o }"],
];

const refusedQueries = [
    ["INSERT DATA", "INSERT DATA { GRAPH <http://g> { <http://a> <http://b> <http://c> } }"],
    ["DELETE DATA", "DELETE DATA { GRAPH <http://g> { <http://a> <http://b> <http://c> } }"],
    ["DELETE WHERE", "DELETE WHERE { GRAPH <http://g> { ?s ?p ?o } }"],
    ["DELETE/INSERT", "WITH <http://g> DELETE { ?s ?p ?o } INSERT { ?s ?p 'x' } WHERE { ?s ?p ?o }"],
    ["LOAD", "LOAD <http://evil/data.ttl> INTO GRAPH <http://g>"],
    ["CLEAR", "CLEAR GRAPH <http://g>"],
    ["DROP", "DROP GRAPH <http://g>"],
    ["CREATE", "CREATE GRAPH <http://g>"],
    ["COPY", "COPY <http://g1> TO <http://g2>"],
    ["MOVE", "MOVE <http://g1> TO <http://g2>"],
    ["ADD", "ADD <http://g1> TO <http://g2>"],
    ["PREFIX then INSERT", "PREFIX ex: <http://e#>\nINSERT DATA { GRAPH <http://g> { ex:a ex:b ex:c } }"],
    ["BASE then INSERT", "BASE <http://x#>\nINSERT DATA { GRAPH <http://g> { <http://a> <http://b> <http://c> } }"],
    ["BASE then DELETE", "BASE <http://x#> DELETE WHERE { GRAPH <http://g> { ?s ?p ?o } }"],
    ["a SELECT wrapped in a markdown fence", "```sparql\nSELECT ?s FROM <http://g> WHERE { ?s ?p ?o }\n```"],
    ["an update disguised behind a SELECT comment", "# SELECT ?s WHERE { ?s ?p ?o }\nINSERT DATA { GRAPH <http://g> { <http://a> <http://b> <http://c> } }"],
    ["a sub-SELECT nested in an INSERT", "INSERT { GRAPH <http://g> { ?s ?p ?o } } WHERE { { SELECT ?s ?p ?o WHERE { ?s ?p ?o } } }"],
    ["an INSERT chained behind a SELECT", "SELECT ?s FROM <http://g> WHERE { ?s ?p ?o } ; INSERT DATA { GRAPH <http://g> { <http://a> <http://b> <http://c> } }"],
    ["a DELETE chained behind a SELECT", "SELECT ?s FROM <http://g> WHERE { ?s ?p ?o }; DELETE WHERE { GRAPH <http://g> { ?s ?p ?o } }"],
    ["a DROP chained behind a PREFIX + SELECT", "PREFIX ex: <http://e#>\nSELECT ?s FROM <http://g> WHERE { ?s ?p ?o } ; DROP GRAPH <http://g>"],
    ["a chained update hidden by a comment", "SELECT ?s FROM <http://g> WHERE { ?s ?p ?o }\n# harmless\n; CLEAR GRAPH <http://g>"],
];

const results = [];
function record(label, passed, detail) {
    results.push({ label, passed, detail });
}

for (const [label, query] of allowedQueries) {
    record(`allows ${label}`, UserRequestFiltering.isSelectQuery(query) === true, "expected allowed");
}
for (const [label, query] of refusedQueries) {
    record(`refuses ${label}`, UserRequestFiltering.isSelectQuery(query) === false, "expected refused");
}

// The discriminator must stay in step with the branch it was extracted from: a query it calls a
// SELECT has to take the SELECT branch of filterSparqlRequest, never the update branch.
const nonAdminUser = { user: { groups: ["readers"] } };
const selectWithForbiddenGraph = "SELECT ?s FROM <http://forbidden> WHERE { ?s ?p ?o }";
await new Promise(function (resolve) {
    UserRequestFiltering.filterSparqlRequest(selectWithForbiddenGraph, {}, nonAdminUser, function (filteringError) {
        const message = String(filteringError ?? "");
        record("a SELECT still routes to the graph ACL check", message.includes("not allowed for current user"), message.slice(0, 90));
        resolve();
    });
});

let failures = 0;
for (const result of results) {
    if (!result.passed) {
        failures += 1;
    }
    console.log(`  ${result.passed ? "ok  " : "FAIL"} ${result.label} — ${result.detail}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exitCode = failures === 0 ? 0 : 1;
