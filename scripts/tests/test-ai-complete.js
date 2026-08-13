#!/usr/bin/env node
/**
 * Checks the tool-calling plumbing behind POST /api/v1/ai/complete.
 *
 * Runs offline: a local HTTP server stands in for api.anthropic.com, so nothing here depends on a
 * valid API key, on the configured provider, or on a running SLS backend. What it proves is that
 * `tools` reaches the provider, that the reply is flattened correctly, and above all that the
 * payload the existing callers read (`classify.js`, `alignment.js`, and the rate limiter inside
 * `llmClient.js`) is untouched by the passthrough.
 *
 * Run: node scripts/tests/test-ai-complete.js
 */

import http from "node:http";

const stubPort = 3099;

const cannedToolUseResponse = {
    id: "msg_stub",
    type: "message",
    role: "assistant",
    model: "claude-stub",
    content: [
        { type: "text", text: "Je compte les sources." },
        { type: "tool_use", id: "toolu_stub_01", name: "sls_count_labels_by_source", input: { text: "pump", indexes: ["cfihos-iof", "eclass"] } },
    ],
    stop_reason: "tool_use",
    usage: { input_tokens: 6120, output_tokens: 84 },
};

const capturedRequests = [];

const stubServer = http.createServer(function (request, response) {
    const bodyChunks = [];
    request.on("data", function (chunk) {
        bodyChunks.push(chunk);
    });
    request.on("end", function () {
        capturedRequests.push(JSON.parse(Buffer.concat(bodyChunks).toString() || "{}"));
        response.setHeader("Content-Type", "application/json");
        if (request.url.includes("count_tokens")) {
            return response.end(JSON.stringify({ input_tokens: cannedToolUseResponse.usage.input_tokens }));
        }
        return response.end(JSON.stringify(cannedToolUseResponse));
    });
});

await new Promise(function (resolve) {
    stubServer.listen(stubPort, resolve);
});

// Set before importing the adapter: the Anthropic SDK reads this when the client is constructed.
process.env.ANTHROPIC_BASE_URL = `http://localhost:${stubPort}`;

const { default: createAnthropicAdapter } = await import("../../bin/AI/adapters/anthropicAdapter.js");
const { normalizeCompletion } = await import("../../bin/AI/normalizeCompletion.js");

const adapter = createAnthropicAdapter({ apiKey: "stub-key", defaultModel: "claude-stub", maxTokens: 1024 });

const tools = [
    {
        name: "sls_count_labels_by_source",
        description: "Counts how many labels match a phrase in each index.",
        input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
];
const messages = [{ role: "user", content: "Quelles sources parlent de pompes ?" }];

const results = [];
function record(label, passed, detail) {
    results.push({ label, passed, detail });
}

function lastRequest() {
    return capturedRequests[capturedRequests.length - 1];
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

// Tool schemas dominate an agent turn's input, so the rate limiter must see them.
await adapter.countTokens({ system: "sys", messages: messages, tools: tools });
record("countTokens forwards tools", lastRequest().tools?.length === 1, String(lastRequest().tools?.[0]?.name));

await adapter.countTokens({ system: "sys", messages: messages });
record("countTokens omits the key when no tool is passed", !("tools" in lastRequest()), Object.keys(lastRequest()).join(","));

const toolCallingResponse = await callAdapter({ system: "sys", messages: messages, tools: tools, maxTokens: 2048 });
record("createMessage forwards tools", lastRequest().tools?.[0]?.name === "sls_count_labels_by_source", String(lastRequest().tools?.[0]?.name));
record("createMessage honours maxTokens", lastRequest().max_tokens === 2048, String(lastRequest().max_tokens));

await callAdapter({ system: "sys", messages: messages });
record("createMessage omits the key when no tool is passed", !("tools" in lastRequest()), Object.keys(lastRequest()).join(","));

// The reason the adapter still returns the provider's raw payload.
record("raw payload preserved for classify/alignment", toolCallingResponse.content?.[0]?.text === "Je compte les sources.", String(toolCallingResponse.content?.[0]?.text));
record("raw payload preserved for the rate limiter", toolCallingResponse.usage?.input_tokens === 6120, String(toolCallingResponse.usage?.input_tokens));

const normalized = normalizeCompletion("anthropic", toolCallingResponse);
record("normalizer reads stopReason", normalized.stopReason === "tool_use", normalized.stopReason);
record("normalizer concatenates text blocks", normalized.text === "Je compte les sources.", JSON.stringify(normalized.text));
record("normalizer extracts tool calls", normalized.toolCalls.length === 1 && normalized.toolCalls[0].input.text === "pump", JSON.stringify(normalized.toolCalls));
// An agent loop must echo the assistant turn back verbatim, tool_use blocks included, or the
// provider rejects the tool results that follow.
record("normalizer keeps the raw blocks", normalized.content.length === 2 && normalized.content[1].type === "tool_use", normalized.content.map((block) => block.type).join(","));

let unsupportedProviderThrew = false;
try {
    normalizeCompletion("openrouter", cannedToolUseResponse);
} catch {
    unsupportedProviderThrew = true;
}
record("an unsupported provider fails loudly", unsupportedProviderThrew, String(unsupportedProviderThrew));

let failures = 0;
for (const result of results) {
    if (!result.passed) {
        failures += 1;
    }
    console.log(`  ${result.passed ? "ok  " : "FAIL"} ${result.label} — ${result.detail}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);

stubServer.close();
process.exitCode = failures === 0 ? 0 : 1;
