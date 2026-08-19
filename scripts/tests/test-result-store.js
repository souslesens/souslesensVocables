#!/usr/bin/env node
/**
 * Checks the rows held back from oversized answers, and the size guard that hands them over.
 *
 * Runs offline: no SLS backend, no triple store, no token. The store is process memory and the size
 * guard is a pure function, so both are exercised directly.
 *
 * What matters here is the promise the truncation message now makes. It used to say the cut rows
 * were unreachable, which was false, and an agent that believed it stopped working. It now names a
 * resultId and an offset, so the test asserts that those two actually read back the rows that were
 * cut, and that the old message comes back verbatim in the one case where it is true again: a set
 * too large for the store to hold at all.
 *
 * Run: node scripts/tests/test-result-store.js
 */

import { storeRows, readPage, forgetEverything } from "../../bin/MCP/resultStore.js";
import { applySizeGuard } from "../../bin/MCP/mcpServer.js";
import { mcpConfig } from "../../bin/MCP/config.js";

const results = [];
function record(label, passed, detail) {
    results.push({ label, passed, detail });
}

function makeRows(count, prefix) {
    const rows = [];
    for (let rowIndex = 0; rowIndex < count; rowIndex += 1) {
        rows.push({ uri: `http://example.org/${prefix}/${rowIndex}`, label: `${prefix} label ${rowIndex}` });
    }
    return rows;
}

// ── The store on its own ─────────────────────────────────────────────────────
forgetEverything();

const wholeSet = makeRows(18432, "pump");
const storedId = storeRows("sls_sparql_select", wholeSet);
record("a large set is stored and named", typeof storedId === "string" && storedId.startsWith("res_"), String(storedId));

const middlePage = readPage(storedId, 500, 1000);
record(
    "a page reads the rows that follow an offset",
    middlePage.rows[0].uri === "http://example.org/pump/500" && middlePage.returnedRows === 1000,
    `${middlePage.rows[0].uri} x${middlePage.returnedRows}`,
);
record("a page reports the whole size, not its own", middlePage.totalRows === 18432, String(middlePage.totalRows));
record("nextOffset continues where the page stopped", middlePage.nextOffset === 1500 && middlePage.hasMore === true, `${middlePage.nextOffset} hasMore=${middlePage.hasMore}`);

const lastPage = readPage(storedId, 18000, 1000);
record("the final page is short and says so", lastPage.returnedRows === 432 && lastPage.hasMore === false && lastPage.nextOffset === null, `${lastPage.returnedRows} hasMore=${lastPage.hasMore}`);
record("a page past the end is empty, not an error", readPage(storedId, 99999, 10).returnedRows === 0, "0 rows");
record("an unknown identifier reads as absent", readPage("res_never_1", 0, 10) === null, "null");
record("the producing tool is remembered", lastPage.toolName === "sls_sparql_select", lastPage.toolName);

// A set larger than everything the store may hold would evict the rest and still not fit.
record("a set beyond the total ceiling is refused", storeRows("t", makeRows(mcpConfig.resultStoreMaxRows + 1, "x")) === null, "null");

// Oldest out first, so a long conversation cannot grow the store without bound.
forgetEverything();
const firstId = storeRows("t", makeRows(10, "a"));
const laterIds = [];
for (let storeIndex = 0; storeIndex < mcpConfig.resultStoreMaxResults; storeIndex += 1) {
    laterIds.push(storeRows("t", makeRows(10, "b")));
}
record("the count ceiling evicts the oldest first", readPage(firstId, 0, 1) === null && readPage(laterIds[laterIds.length - 1], 0, 1) !== null, "oldest gone, newest kept");

// ── grep, the way to reach a few rows without reading thousands ──────────────
forgetEverything();

const mixedRows = [];
for (let rowIndex = 0; rowIndex < 5000; rowIndex += 1) {
    mixedRows.push({ uri: `http://example.org/eq/${rowIndex}`, label: rowIndex % 500 === 3 ? "centrifugal PUMP casing" : `valve ${rowIndex}` });
}
const mixedId = storeRows("sls_sparql_select", mixedRows);

const grepped = readPage(mixedId, 0, 5, "centrifugal");
record("grep keeps only the matching rows", grepped.matchedRows === 10 && grepped.rows[0].label === "centrifugal PUMP casing", `${grepped.matchedRows} matches`);
record("grep reports the whole size next to the matches", grepped.totalRows === 5000, `${grepped.matchedRows}/${grepped.totalRows}`);
record("grep is case-insensitive", readPage(mixedId, 0, 5, "pUmP cAsInG").matchedRows === 10, "10 matches");
record("grep searches every column, not just labels", readPage(mixedId, 0, 5, "eq/1234").matchedRows === 1, "1 match on the uri column");
record("a term matching nothing still reports the rows exist", readPage(mixedId, 0, 5, "zzzz").matchedRows === 0 && readPage(mixedId, 0, 5, "zzzz").totalRows === 5000, "0 of 5000");

const grepPaged = readPage(mixedId, 8, 5, "centrifugal");
record("offset walks the matches, not the original rows", grepPaged.offset === 8 && grepPaged.returnedRows === 2 && grepPaged.hasMore === false, `${grepPaged.returnedRows} left after offset 8`);
record("the term is echoed back", grepPaged.grep === "centrifugal" && readPage(mixedId, 0, 5).grep === null, String(grepPaged.grep));
record("a blank term is not a filter", readPage(mixedId, 0, 5, "   ").matchedRows === 5000, "5000");

// ── The size guard, which is what agents actually meet ───────────────────────
forgetEverything();

const oversizedPayload = { head: { vars: ["uri", "label"] }, results: { bindings: makeRows(9000, "valve") } };
const guarded = applySizeGuard(oversizedPayload, 20000, "sls_sparql_select");
record("an oversized row set is truncated", guarded.truncation.truncated === true, String(guarded.truncation.truncated));
record("the truncation names a stored result", typeof guarded.truncation.resultId === "string", String(guarded.truncation.resultId));
record("the truncation stops claiming the rows are unreachable", !guarded.truncation.hint.includes("no way to fetch"), guarded.truncation.hint.slice(0, 60) + "...");
record("the truncation steers toward an aggregate before paging", guarded.truncation.hint.includes("COUNT"), "mentions COUNT");
record("the truncation offers searching before walking", guarded.truncation.hint.includes("grep"), "mentions grep");

const continued = readPage(guarded.truncation.resultId, guarded.truncation.nextOffset, 5);
record("nextOffset resumes exactly where the answer stopped", continued.rows[0].uri === `http://example.org/valve/${guarded.truncation.returnedRows}`, continued.rows[0].uri);
record("the stored set is the whole one, not the truncated one", continued.totalRows === 9000, String(continued.totalRows));

// A payload that fits is left completely alone: no store entry, no identifier, no advice.
const smallPayload = { head: { vars: ["uri"] }, results: { bindings: makeRows(3, "small") } };
const untouched = applySizeGuard(smallPayload, 20000, "sls_search_labels");
record("an answer that fits is not stored", untouched.truncation.truncated === false && untouched.truncation.resultId === undefined, JSON.stringify(untouched.truncation));

// When the store cannot hold the set, the old advice is the honest one again.
const beyondStore = { head: {}, results: { bindings: makeRows(mcpConfig.resultStoreMaxRows + 1, "huge") } };
const unstorable = applySizeGuard(beyondStore, 20000, "sls_sparql_select");
record(
    "an unstorable set falls back to narrowing advice",
    unstorable.truncation.resultId === undefined && unstorable.truncation.hint.includes("too large to be held"),
    unstorable.truncation.hint.slice(0, 60) + "...",
);

// ── A page too large for one answer, which is how a wide result is drained ───
//
// The guard runs on the page sls_result_page returns, and that page carries its rows under `rows`.
// Unrecognised, the whole page was replaced by its structure and came back with no `rows` key at
// all, so a browser draining a result of wide rows stopped on its first read and kept whatever the
// first answer had carried: 393 rows of a 100741-row extract, announced as an incomplete table.
forgetEverything();

const wideRows = [];
for (let rowIndex = 0; rowIndex < 1000; rowIndex += 1) {
    wideRows.push({
        notification: { type: "uri", value: `http://totalenergies/resources/tsf/ontology/lifex_fpso/Notification_${13082212 + rowIndex}` },
        label: { type: "literal", value: String(13082212 + rowIndex) },
        description: { type: "literal", value: "GDAC-03001053 REMPLACEMENT Centrifugal Separator 3500 l/h" },
        date: { type: "literal", value: "2011-10-01" },
    });
}
const widePage = { rows: wideRows, offset: 393, returnedRows: 1000, matchedRows: 100741, totalRows: 100741, grep: null, hasMore: true, nextOffset: 1393, toolName: "sls_sparql_select" };
const guardedPage = applySizeGuard(widePage, 20000, "sls_result_page", true);

record("a cut page still answers under `rows`", Array.isArray(guardedPage.payload.rows) && guardedPage.payload.rows.length > 0, `${guardedPage.payload.rows.length} rows`);
record("a cut page keeps the head of the window, in order", guardedPage.payload.rows[0].label.value === "13082212", guardedPage.payload.rows[0].label.value);
record("a cut page corrects its own counters", guardedPage.payload.returnedRows === guardedPage.payload.rows.length && guardedPage.payload.nextOffset === 393 + guardedPage.payload.rows.length, `returnedRows ${guardedPage.payload.returnedRows}, nextOffset ${guardedPage.payload.nextOffset}`);
// Storing it again would duplicate rows the process already holds and, since the store evicts the
// oldest result, would age out the very result being drained partway through the drain.
record("a cut page is not stored a second time", guardedPage.truncation.resultId === undefined && readPage("res_1", 0, 1) === null, "no new resultId");
record("a cut page says how to ask for the rest", guardedPage.truncation.hint.includes("same resultId"), guardedPage.truncation.hint.slice(0, 60) + "...");

// A document has no usable prefix and no rows, so it keeps its structural summary.
const documentPayload = { mapping: { name: "x", columns: makeRows(4000, "col") }, extra: "y" };
const documentGuarded = applySizeGuard(documentPayload, 2000, "sls_mapping_get");
record(
    "a document without rows still answers with its structure",
    Boolean(documentGuarded.payload.oversizedDocumentStructure) || Boolean(documentGuarded.truncation.resultId),
    Object.keys(documentGuarded.payload).join(","),
);

let failures = 0;
for (const result of results) {
    if (!result.passed) {
        failures += 1;
    }
    console.log(`  ${result.passed ? "ok  " : "FAIL"} ${result.label} — ${result.detail}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exitCode = failures === 0 ? 0 : 1;
