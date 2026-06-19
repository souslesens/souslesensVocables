import { readMainConfig } from "../../model/config.js";
import createAnthropicAdapter from "./adapters/anthropicAdapter.js";
import createOpenRouterAdapter from "./adapters/openRouterAdapter.js";

const ADAPTERS = { anthropic: createAnthropicAdapter, openrouter: createOpenRouterAdapter };

// ── Rate limiter (module-level singleton — shared across all callers) ───────
const tokenWindow = [];

function recordTokens(count) {
    const now = Date.now();
    tokenWindow.push({ count, time: now });
    while (tokenWindow.length && tokenWindow[0].time < now - 60000) tokenWindow.shift();
}

function tokensUsedLastMinute() {
    const now = Date.now();
    return tokenWindow.filter((entry) => entry.time >= now - 60000).reduce((sum, entry) => sum + entry.count, 0);
}

async function waitForBudget(neededTokens, rateLimitTPM) {
    while (true) {
        const available = rateLimitTPM - tokensUsedLastMinute();
        if (available >= neededTokens) break;
        const oldestEntryAge = Date.now() - tokenWindow[0].time;
        const waitMs = 60000 - oldestEntryAge + 500;
        await sleep(waitMs);
    }
}

// ── Retry with exponential backoff ──────────────────────────────────────────
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = 5, baseDelayMs = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.status === 429 || error.message?.includes("rate_limit");
            if (!isRateLimit || attempt === retries) throw error;
            const retryAfterHeader = error.headers?.["retry-after"];
            const waitMs = retryAfterHeader ? parseInt(retryAfterHeader) * 1000 : baseDelayMs * Math.pow(2, attempt - 1);
            await sleep(waitMs);
        }
    }
}

// ── Adapter resolution ───────────────────────────────────────────────────────
async function getAdapter() {
    const config = await readMainConfig();
    const llmConfig = config.llm;
    if (!llmConfig) throw new Error("LLM integration not configured in mainConfig.json");

    const adapterFactory = ADAPTERS[llmConfig.provider];
    if (!adapterFactory) throw new Error(`Unknown LLM provider: "${llmConfig.provider}"`);

    const providerConfig = llmConfig[llmConfig.provider];
    if (!providerConfig) throw new Error(`Config missing for LLM provider "${llmConfig.provider}"`);

    return { adapter: adapterFactory(providerConfig), rateLimitTPM: providerConfig.rateLimitTPM };
}

// ── Public API ───────────────────────────────────────────────────────────────
function complete(prompt, options, callback) {
    getAdapter()
        .then(({ adapter, rateLimitTPM }) =>
            withRetry(async () => {
                const inputTokens = await adapter.countTokens({
                    system: options?.system,
                    messages: [{ role: "user", content: prompt }],
                });
                await waitForBudget(inputTokens, rateLimitTPM);
                return new Promise((resolve, reject) => {
                    adapter.complete(prompt, options, (err, result) => {
                        if (err) return reject(err);
                        recordTokens(result.usage.input_tokens + result.usage.output_tokens);
                        resolve(result);
                    });
                });
            }),
        )
        .then((result) => callback(null, result))
        .catch(callback);
}

function createMessage(params, callback) {
    getAdapter()
        .then(({ adapter, rateLimitTPM }) =>
            withRetry(async () => {
                const inputTokens = await adapter.countTokens({ system: params.system, messages: params.messages });
                await waitForBudget(inputTokens, rateLimitTPM);
                return new Promise((resolve, reject) => {
                    adapter.createMessage(params, (err, result) => {
                        if (err) return reject(err);
                        recordTokens(result.usage.input_tokens + result.usage.output_tokens);
                        resolve(result);
                    });
                });
            }),
        )
        .then((result) => callback(null, result))
        .catch(callback);
}

export default { complete, createMessage };
