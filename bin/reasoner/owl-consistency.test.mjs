import test from "node:test";
import assert from "node:assert/strict";
import { RULES, buildQuery, run, checkOwlConsistency } from "./owl-consistency.mjs";

const empty = () => ({
    ok: true,
    json: async () => ({ head: { vars: [] }, results: { bindings: [] } }),
});

test("clean report executes every rule against the specified dataset", async () => {
    const requests = [];
    const report = await run({
        endpoint: "https://example.org/sparql",
        graphs: ["urn:ontology", "urn:data"],
        headers: { Authorization: "Bearer test-token" },
        fetchImpl: async (url, options) => {
            requests.push({ url, options });
            return empty();
        },
    });
    assert.equal(report.status, "no-violations-detected");
    assert.equal(report.completeOwlConsistencyCheck, false);
    assert.equal(requests.length, RULES.length);
    for (const { url, options } of requests) {
        assert.equal(url, "https://example.org/sparql");
        assert.equal(options.method, "POST");
        assert.equal(options.headers.get("Authorization"), "Bearer test-token");
        const query = options.body.get("query");
        assert.match(query, /FROM <urn:ontology>\nFROM <urn:data>/);
        assert.match(query, /LIMIT 101$/);
    }
});

test("witness terms are preserved and capped with a truncation indicator", async () => {
    let calls = 0;
    const term = { x: { type: "literal", value: "bonjour", "xml:lang": "fr" } };
    const report = await checkOwlConsistency({
        endpoint: "https://example.org/sparql",
        limit: 1,
        fetchImpl: async () =>
            ++calls === 1
                ? {
                      ok: true,
                      json: async () => ({ head: { vars: ["x"] }, results: { bindings: [term, term] } }),
                  }
                : empty(),
    });
    assert.equal(report.status, "violations-detected");
    assert.equal(report.checks[0].truncated, true);
    assert.deepEqual(report.checks[0].examples, [term]);
});

test("HTTP failure rejects rather than declaring consistency", async () => {
    await assert.rejects(
        checkOwlConsistency({
            endpoint: "https://example.org/sparql",
            fetchImpl: async () => ({ ok: false, status: 401 }),
        }),
        (error) => /consistency is unknown/.test(error.message) && error.cause.message === "HTTP 401",
    );
});

test("invalid JSON result rejects", async () => {
    await assert.rejects(
        checkOwlConsistency({
            endpoint: "https://example.org/sparql",
            fetchImpl: async () => ({ ok: true, json: async () => ({ boolean: true }) }),
        }),
        /consistency is unknown/,
    );
});

test("network or abort failures reject", async () => {
    await assert.rejects(
        checkOwlConsistency({
            endpoint: "https://example.org/sparql",
            fetchImpl: async () => {
                throw new Error("aborted");
            },
        }),
        (error) => error.cause.message === "aborted",
    );
});

test("rejects graph injection and invalid limits before sending requests", async () => {
    assert.throws(() => buildQuery(RULES[0], { graphs: ["urn:x> WHERE { ?s ?p ?o } #"] }), /Graph/);
    assert.throws(() => buildQuery(RULES[0], { limit: 0 }), /limit/);
    await assert.rejects(checkOwlConsistency({ endpoint: "file:///tmp/data" }), /HTTP/);
});
