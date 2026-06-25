/**
 * Integration test for the exposed SPARQL query execution path used by POST /api/v1/sparqlQueries/run.
 *
 * For every function flagged `@expose` in bin/sparqlRegistry.json, it builds the positional args
 * exactly like the POST route does and runs it through RemoteCodeRunner.runVocablesFn with
 * `returnQueryStr: false` — the real execution path (build query → send → parse → post-process)
 * against the configured triple store, using the source named by SPARQL_EXEC_TEST_SOURCE
 * (default "BFO").
 *
 * Run: node scripts/tests/test-sparql-queries-exec.js
 * Exits 0 if every exposed function executes without error, 1 otherwise.
 *
 * This is a plain Node script (not Jest) on purpose: remoteCodeRunner registers a custom ESM
 * loader to resolve the frontend `public/vocables` modules, which Jest's resolver does not honour.
 */

import { createRequire } from "node:module";
import RemoteCodeRunner from "../../bin/remoteCodeRunner.js";

const require = createRequire(import.meta.url);
const registry = require("../../bin/sparqlRegistry.json");

// Silence the verbose browser-mock loggers and the query-error dumps the SPARQL layer prints, so
// only our own table (written straight to stdout) shows.
globalThis.MainController = { errorAlert: () => {}, currentSource: null };
globalThis.UI = { message: () => {} };
globalThis.alert = () => {};
function print(line) {
    process.stdout.write(line + "\n");
}
console.log = () => {};
console.error = () => {};
console.warn = () => {};
console.info = () => {};

const TEST_SOURCE = process.env.SPARQL_EXEC_TEST_SOURCE || "BFO";
const TEST_URI = process.env.SPARQL_EXEC_TEST_URI || "http://purl.obolibrary.org/obo/BFO_0000001";
const PER_CALL_TIMEOUT_MS = 60000;

const PLURAL_ID_PARAMS = ["ids", "uris", "subClassIds", "classIds", "domainIds", "resourcesIds", "subjectIds", "propertyIds", "objectIds", "allIds", "propIds", "properties"];
const SINGULAR_ID_PARAMS = ["id", "conceptId", "subjectUri"];

function fixtureFor(paramName) {
    if (/source/i.test(paramName)) return TEST_SOURCE;
    if (/depth/i.test(paramName)) return 1;
    if (/taxonomyPredicate/i.test(paramName)) return "rdfs:subClassOf";
    if (paramName === "words" || paramName === "processor" || paramName === "collection") return null;
    if (PLURAL_ID_PARAMS.includes(paramName)) return [TEST_URI];
    if (SINGULAR_ID_PARAMS.includes(paramName)) return TEST_URI;
    return null;
}

function buildPositionalArgs(entry) {
    const paramsWithoutCallback = entry.params.filter((param) => param.name !== "callback");
    return paramsWithoutCallback.map((param) => {
        if (param.name === "options") return { returnQueryStr: false, limit: 50 };
        return fixtureFor(param.name);
    });
}

function describeResult(result) {
    if (result == null) return "null/undefined";
    if (Array.isArray(result)) return "array[" + result.length + "]";
    if (result.results && result.results.bindings) return "bindings[" + result.results.bindings.length + "]";
    if (typeof result === "object") return "object{" + Object.keys(result).length + " keys}";
    return typeof result;
}

// A thrown error inside an async SPARQL post-processing callback escapes the normal error path,
// so capture process-level failures and attribute them to the currently running function.
let currentFinish = null;
process.on("uncaughtException", (error) => currentFinish && currentFinish(false, "THROW: " + error.message));
process.on("unhandledRejection", (reason) => currentFinish && currentFinish(false, "REJECT: " + ((reason && reason.message) || String(reason))));

function runOne(entry) {
    return new Promise((resolve) => {
        let done = false;
        const finish = (passed, detail) => {
            if (done) return;
            done = true;
            currentFinish = null;
            resolve({ passed, detail });
        };
        currentFinish = finish;
        setTimeout(() => finish(false, "TIMEOUT after " + PER_CALL_TIMEOUT_MS + "ms"), PER_CALL_TIMEOUT_MS);
        try {
            const userContext = { user: null, userSources: null, tools: [] };
            RemoteCodeRunner.runVocablesFn({ moduleName: entry.module, functionName: entry.name, args: buildPositionalArgs(entry) }, userContext, (err, result) => {
                if (err) return finish(false, "ERR: " + ((err && err.message) || JSON.stringify(err)));
                finish(true, describeResult(result));
            });
        } catch (error) {
            finish(false, "THROW: " + error.message);
        }
    });
}

async function main() {
    const exposedEntries = registry.filter((entry) => entry.expose === true);
    print(`Testing ${exposedEntries.length} exposed SPARQL functions (returnQueryStr=false) against "${TEST_SOURCE}"\n`);

    const failures = [];
    for (const entry of exposedEntries) {
        const { passed, detail } = await runOne(entry);
        const label = `${entry.module}.${entry.name}`;
        print(`[${passed ? "PASS" : "FAIL"}] ${label.padEnd(48)} ${detail}`);
        if (!passed) failures.push(label);
    }

    print("\n" + "=".repeat(60));
    print(`RESULTS: ${exposedEntries.length - failures.length} passed, ${failures.length} failed`);
    if (failures.length > 0) {
        print("Failed: " + failures.join(", "));
        process.exit(1);
    }
    print("All exposed SPARQL functions executed successfully.");
    process.exit(0);
}

main();
