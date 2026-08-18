#!/usr/bin/env node
/**
 * Checks that the LLM layer fails loudly, on the paths where it used to fail silently.
 *
 * Runs offline: `globalThis.fetch` is stubbed, so nothing here needs an OpenRouter key or a running
 * backend. Four failure modes are covered, each of which previously reached the agent loop as an
 * empty answer, as a TypeError naming no cause, or as a request that never came back:
 *
 *   1. OpenRouter reporting a provider error inside an HTTP 200 body (this is how a rate limit
 *      arrives most of the time), and its variants: no choice at all, finish_reason "error", a body
 *      that is not JSON.
 *   2. A single turn larger than the whole configured per-minute budget, which used to drain the
 *      token window and then crash on `tokenWindow[0].time`.
 *   3. A caller callback that throws, which used to be called a second time with its own exception.
 *
 * Checks 2 and 3 read config/mainConfig.json and only run when `llm.provider` is "openrouter",
 * since they go through llmClient end to end.
 *
 * Run: node scripts/tests/test-llm-failure-modes.js
 */

import createOpenRouterAdapter from "../../bin/AI/adapters/openRouterAdapter.js";
import llmClient from "../../bin/AI/llmClient.js";
import { readMainConfig } from "../../model/config.js";

const results = [];
function record(label, passed, detail) {
    results.push({ label: label, passed: passed, detail: detail });
}

// ---------------------------------------------------------------------------
// Stubbed transport
// ---------------------------------------------------------------------------

let cannedBody = null;
let cannedStatus = 200;

globalThis.fetch = async function () {
    const bodyText = typeof cannedBody === "string" ? cannedBody : JSON.stringify(cannedBody);
    return {
        ok: cannedStatus >= 200 && cannedStatus < 300,
        status: cannedStatus,
        headers: new Map(),
        text: async () => bodyText,
        json: async () => JSON.parse(bodyText),
    };
};

const adapter = createOpenRouterAdapter({ apiKey: "stub-key", defaultModel: "moonshotai/kimi-k2", maxTokens: 1024 });

function callAdapter() {
    return new Promise(function (resolve, reject) {
        adapter.createMessage({ system: "sys", messages: [{ role: "user", content: "x" }] }, function (error, response) {
            return error ? reject(error) : resolve(response);
        });
    });
}

async function expectAdapterError(label, body, expectedFragment, expectedStatus) {
    cannedStatus = 200;
    cannedBody = body;
    try {
        const response = await callAdapter();
        return record(label, false, `no error: got content ${JSON.stringify(response.content)}`);
    } catch (error) {
        const messageMatches = error.message.includes(expectedFragment);
        const statusMatches = expectedStatus === undefined || error.status === expectedStatus;
        record(label, messageMatches && statusMatches, `status ${error.status} — ${error.message.slice(0, 120)}`);
    }
}

// ---------------------------------------------------------------------------
// 1. Errors carried by a successful HTTP response
// ---------------------------------------------------------------------------

await expectAdapterError(
    "rate limit reported inside a 200 body is an error, not an empty turn",
    { id: "gen_1", error: { code: 429, message: "Rate limit exceeded: free-models-per-day" } },
    "Rate limit exceeded",
    429,
);

await expectAdapterError("an error carried by the choice is surfaced too", { id: "gen_2", choices: [{ error: { code: 402, message: "Insufficient credits" } }] }, "Insufficient credits", 402);

await expectAdapterError("a body with no choice is an error", { id: "gen_3", choices: [] }, "no completion choice", 502);

await expectAdapterError(
    'finish_reason "error" is an error',
    { id: "gen_4", choices: [{ finish_reason: "error", native_finish_reason: "content_filter", message: { role: "assistant", content: "" } }] },
    "ended the turn on an error",
    502,
);

await expectAdapterError("a non-JSON 200 body names what was received", "<html>502 Bad Gateway</html>", "not JSON", 502);

// A well-formed answer must still pass, so none of the guards above fires on the normal path.
cannedStatus = 200;
cannedBody = {
    id: "gen_ok",
    model: "moonshotai/kimi-k2",
    choices: [{ finish_reason: "stop", message: { role: "assistant", content: "hello" } }],
    usage: { prompt_tokens: 10, completion_tokens: 2 },
};
const normalResponse = await callAdapter();
record("a normal answer is still accepted", normalResponse.content[0].text === "hello" && normalResponse.stop_reason === "end_turn", JSON.stringify(normalResponse.content));

// ---------------------------------------------------------------------------
// 2 and 3. End-to-end through llmClient
// ---------------------------------------------------------------------------

const mainConfig = await readMainConfig();
const configuredProvider = mainConfig.llm && mainConfig.llm.provider;

if (configuredProvider !== "openrouter") {
    console.log(`  skip  llmClient checks — llm.provider is ${JSON.stringify(configuredProvider)}, these two need "openrouter"`);
} else {
    const rateLimitTPM = mainConfig.llm.openrouter.rateLimitTPM;

    // The OpenRouter adapter estimates roughly one token per 3.5 characters, so this is comfortably
    // above the whole per-minute budget however it is configured.
    const charactersPerToken = 3.5;
    const oversizedPrompt = "x".repeat(Math.ceil((rateLimitTPM + 10000) * charactersPerToken));

    const budgetError = await new Promise(function (resolve) {
        llmClient.createMessage({ messages: [{ role: "user", content: oversizedPrompt }] }, function (error) {
            resolve(error);
        });
    });
    const budgetErrorIsExplicit = Boolean(budgetError) && budgetError.status === 413 && budgetError.message.includes("rateLimitTPM");
    record(
        "a turn larger than the whole budget says so instead of crashing",
        budgetErrorIsExplicit,
        budgetError ? `status ${budgetError.status} — ${budgetError.message.slice(0, 140)}` : "no error at all",
    );

    cannedStatus = 200;
    cannedBody = {
        id: "gen_ok2",
        model: "moonshotai/kimi-k2",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "hello" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2 },
    };

    let callbackInvocations = 0;
    await new Promise(function (resolve) {
        llmClient.createMessage({ messages: [{ role: "user", content: "short" }] }, function () {
            callbackInvocations += 1;
            // A callback throwing on the success path is exactly what an Express response does once
            // the headers are already sent. It must not come back as a second call carrying its own
            // exception, and it must not take the process down either.
            if (callbackInvocations === 1) {
                setTimeout(resolve, 50);
                throw new Error("stub callback failure");
            }
        });
    });
    record("a callback that throws is called exactly once", callbackInvocations === 1, `${callbackInvocations} invocation(s)`);
}

// ---------------------------------------------------------------------------

let failures = 0;
for (const result of results) {
    if (!result.passed) {
        failures += 1;
    }
    console.log(`  ${result.passed ? "ok  " : "FAIL"} ${result.label} — ${result.detail}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exitCode = failures === 0 ? 0 : 1;
