#!/usr/bin/env node
/**
 * Checks that the OpenRouter adapter is a drop-in for the Anthropic one on an agent turn.
 *
 * Runs offline: `globalThis.fetch` is stubbed, so nothing here needs an OpenRouter key, a
 * configured provider, or a running SLS backend. What it proves is the round trip the browser
 * agent loop depends on: Anthropic-shaped tools and content blocks go out as OpenAI function
 * calling and `role: "tool"` messages, the OpenAI reply comes back as Anthropic content blocks,
 * and the payload `classify.js` / `alignment.js` / the rate limiter read is left untouched.
 *
 * Run: node scripts/tests/test-openrouter-tools.js
 */

import createOpenRouterAdapter from "../../bin/AI/adapters/openRouterAdapter.js";
import { normalizeCompletion } from "../../bin/AI/normalizeCompletion.js";

const capturedRequests = [];
let cannedResponse = null;

globalThis.fetch = async function (url, requestInit) {
    capturedRequests.push({ url: url, body: JSON.parse(requestInit.body) });
    return {
        ok: true,
        status: 200,
        headers: new Map(),
        json: async () => cannedResponse,
        text: async () => JSON.stringify(cannedResponse),
    };
};

const adapter = createOpenRouterAdapter({ apiKey: "stub-key", defaultModel: "moonshotai/kimi-k2", maxTokens: 1024, appName: "SLS test" });

const tools = [
    {
        name: "sls_count_labels_by_source",
        description: "Counts how many labels match a phrase in each index.",
        input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
];

const results = [];
function record(label, passed, detail) {
    results.push({ label, passed, detail });
}

function lastRequestBody() {
    return capturedRequests[capturedRequests.length - 1].body;
}

function callAdapter(params) {
    return new Promise(function (resolve, reject) {
        adapter.createMessage(params, function (error, response) {
            if (error) {
                return reject(error);
            }
            return resolve(response);
        });
    });
}

// ── Turn 1 : the model asks for a tool ───────────────────────────────────────
cannedResponse = {
    id: "gen_stub",
    model: "moonshotai/kimi-k2",
    choices: [
        {
            finish_reason: "tool_calls",
            message: {
                role: "assistant",
                content: "Je compte les sources.",
                tool_calls: [{ id: "call_stub_01", type: "function", function: { name: "sls_count_labels_by_source", arguments: '{"text":"pump","indexes":["cfihos-iof"]}' } }],
            },
        },
    ],
    usage: { prompt_tokens: 6120, completion_tokens: 84 },
};

const firstTurn = await callAdapter({ system: "sys", messages: [{ role: "user", content: "Quelles sources parlent de pompes ?" }], tools: tools, maxTokens: 2048 });

const sentTool = lastRequestBody().tools?.[0];
record("tools go out as OpenAI function calling", sentTool?.type === "function" && sentTool?.function?.name === "sls_count_labels_by_source", JSON.stringify(sentTool?.type));
record("input_schema becomes function.parameters", sentTool?.function?.parameters?.required?.[0] === "text", JSON.stringify(sentTool?.function?.parameters?.required));
record("system prompt becomes a leading message", lastRequestBody().messages?.[0]?.role === "system", lastRequestBody().messages?.[0]?.role);
record("createMessage honours maxTokens", lastRequestBody().max_tokens === 2048, String(lastRequestBody().max_tokens));

record("finish_reason maps to an Anthropic stop_reason", firstTurn.stop_reason === "tool_use", firstTurn.stop_reason);
record(
    "tool_calls become tool_use blocks",
    firstTurn.content?.[1]?.type === "tool_use" && firstTurn.content[1].name === "sls_count_labels_by_source",
    firstTurn.content?.map((block) => block.type).join(","),
);
record("tool arguments are parsed into an input object", firstTurn.content?.[1]?.input?.text === "pump", JSON.stringify(firstTurn.content?.[1]?.input));
record("usage keeps the shape the rate limiter reads", firstTurn.usage?.input_tokens === 6120 && firstTurn.usage?.output_tokens === 84, JSON.stringify(firstTurn.usage));

const normalized = normalizeCompletion("openrouter", firstTurn);
record("the Anthropic normalizer applies as-is", normalized.stopReason === "tool_use" && normalized.toolCalls?.[0]?.input?.text === "pump", JSON.stringify(normalized.toolCalls));
record("normalizer concatenates text blocks", normalized.text === "Je compte les sources.", JSON.stringify(normalized.text));

// ── Turn 2 : the caller echoes the assistant turn back and appends the result ─
cannedResponse = {
    id: "gen_stub_2",
    model: "moonshotai/kimi-k2",
    choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Deux sources : cfihos-iof et eclass." } }],
    usage: { prompt_tokens: 6400, completion_tokens: 20 },
};

const secondTurn = await callAdapter({
    system: "sys",
    messages: [
        { role: "user", content: "Quelles sources parlent de pompes ?" },
        { role: "assistant", content: firstTurn.content },
        { role: "user", content: [{ type: "tool_result", tool_use_id: "call_stub_01", content: [{ type: "text", text: '{"cfihos-iof":12}' }] }] },
    ],
    tools: tools,
});

const sentMessages = lastRequestBody().messages;
const assistantMessage = sentMessages.find((message) => message.role === "assistant");
const toolMessage = sentMessages.find((message) => message.role === "tool");
record("echoed tool_use blocks go back out as tool_calls", assistantMessage?.tool_calls?.[0]?.id === "call_stub_01", JSON.stringify(assistantMessage?.tool_calls?.[0]?.id));
record("tool_result becomes a role:tool message", toolMessage?.tool_call_id === "call_stub_01" && toolMessage?.content === '{"cfihos-iof":12}', JSON.stringify(toolMessage));
record(
    "the tool result precedes nothing but follows the assistant turn",
    sentMessages.indexOf(toolMessage) === sentMessages.indexOf(assistantMessage) + 1,
    `assistant@${sentMessages.indexOf(assistantMessage)} tool@${sentMessages.indexOf(toolMessage)}`,
);
record("a plain reply maps to end_turn", secondTurn.stop_reason === "end_turn", secondTurn.stop_reason);

// ── Non-regression : the callers that pass no tool at all ────────────────────
cannedResponse = {
    id: "gen_stub_3",
    model: "moonshotai/kimi-k2",
    choices: [{ finish_reason: "stop", message: { role: "assistant", content: "réponse simple" } }],
    usage: { prompt_tokens: 10, completion_tokens: 3 },
};

const plainCompletion = await new Promise(function (resolve, reject) {
    adapter.complete("un prompt", { system: "sys" }, function (error, response) {
        return error ? reject(error) : resolve(response);
    });
});
record("no tools passed means no tools key in the request", !("tools" in lastRequestBody()), Object.keys(lastRequestBody()).join(","));
record("classify/alignment still read content[0].text", plainCompletion.content?.[0]?.text === "réponse simple", JSON.stringify(plainCompletion.content?.[0]?.text));

// Tool schemas dominate an agent turn's input, so the rate limiter must see them.
const tokensWithoutTools = await adapter.countTokens({ system: "sys", messages: [{ role: "user", content: "hello" }] });
const tokensWithTools = await adapter.countTokens({ system: "sys", messages: [{ role: "user", content: "hello" }], tools: tools });
record("countTokens accounts for tool schemas", tokensWithTools > tokensWithoutTools, `${tokensWithoutTools} -> ${tokensWithTools}`);

// Failing loudly beats calling the tool with empty arguments: a wrong result would be
// indistinguishable from a right one downstream.
cannedResponse = {
    id: "gen_stub_4",
    model: "moonshotai/kimi-k2",
    choices: [
        {
            finish_reason: "tool_calls",
            message: { role: "assistant", content: null, tool_calls: [{ id: "call_bad", type: "function", function: { name: "sls_search_labels", arguments: "{not json" } }] },
        },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 3 },
};
let malformedArgumentsRejected = false;
try {
    await callAdapter({ system: "sys", messages: [{ role: "user", content: "x" }], tools: tools });
} catch (error) {
    malformedArgumentsRejected = error.message.includes("malformed tool arguments");
}
record("malformed tool arguments fail loudly", malformedArgumentsRejected, String(malformedArgumentsRejected));

let failures = 0;
for (const result of results) {
    if (!result.passed) {
        failures += 1;
    }
    console.log(`  ${result.passed ? "ok  " : "FAIL"} ${result.label} — ${result.detail}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exitCode = failures === 0 ? 0 : 1;
