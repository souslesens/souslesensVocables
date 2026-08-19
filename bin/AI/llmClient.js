import { readMainConfig } from "../../model/config.js";
import createAnthropicAdapter from "./adapters/anthropicAdapter.js";
import createOpenRouterAdapter from "./adapters/openRouterAdapter.js";
import createOllamaAdapter from "./adapters/ollamaAdapter.js";
import { decryptSecret } from "./secret.js";

const ADAPTERS = { anthropic: createAnthropicAdapter, openrouter: createOpenRouterAdapter, ollama: createOllamaAdapter };

// ── Rate limiter (module-level singleton — shared across all callers) ───────
const oneMinuteMs = 60000;

// Ceiling on how long one call may sit waiting for budget. Past it the caller is told why instead
// of holding an HTTP request open with nothing to show: a browser agent loop that waits several
// minutes on a silent server is indistinguishable from one that crashed.
const maxBudgetWaitMs = 120000;

const tokenWindow = [];

// Providers whose config carries no usable rateLimitTPM. Warned about once per process rather than
// on every call, but never passed over in silence: no rateLimitTPM means no pacing at all.
const providersWarnedAboutMissingRateLimit = new Set();

function pruneTokenWindow(now) {
    while (tokenWindow.length && tokenWindow[0].time <= now - oneMinuteMs) {
        tokenWindow.shift();
    }
}

/**
 * Book the estimated cost of a call before it is sent, and hand back the entry so the real usage
 * can replace the estimate once the provider answers.
 *
 * Reserving up front is what makes the limiter correct under concurrency: two turns starting at the
 * same instant would otherwise both read the same free budget and both go through. It also means a
 * call that fails still counts, which is the case that matters most, since a provider that answered
 * 429 did consume something.
 *
 * @param {number} estimatedTokens
 * @returns {{count: number, time: number}} Mutable reservation entry
 */
function reserveTokens(estimatedTokens) {
    const now = Date.now();
    pruneTokenWindow(now);
    const reservation = { count: estimatedTokens, time: now };
    tokenWindow.push(reservation);
    return reservation;
}

function tokensUsedLastMinute() {
    pruneTokenWindow(Date.now());
    let totalTokens = 0;
    for (const entry of tokenWindow) {
        totalTokens += entry.count;
    }
    return totalTokens;
}

/**
 * Hold the caller until the sliding window has room for `neededTokens`.
 *
 * Every way out of here is explicit. A budget that can never fit the request, a wait that runs past
 * the ceiling and a provider with no configured limit each produce a message naming what to change,
 * because the failure they replace was a silent one: the previous version read `tokenWindow[0].time`
 * with no guard, so a request larger than the whole per-minute budget drained the window, then threw
 * "Cannot read properties of undefined" from a line that says nothing about rate limiting.
 *
 * @param {number} neededTokens
 * @param {number} rateLimitTPM
 * @param {string} provider - Value of `llm.provider`, quoted in the messages so the fix is locatable
 */
async function waitForBudget(neededTokens, rateLimitTPM, provider) {
    if (!Number.isFinite(rateLimitTPM) || rateLimitTPM <= 0) {
        if (!providersWarnedAboutMissingRateLimit.has(provider)) {
            providersWarnedAboutMissingRateLimit.add(provider);
            console.warn(`[llm] no usable llm.${provider}.rateLimitTPM in config/mainConfig.json (got ${JSON.stringify(rateLimitTPM)}): calls to "${provider}" are not paced at all.`);
        }
        return;
    }

    if (neededTokens > rateLimitTPM) {
        const error = new Error(
            `This single request needs about ${neededTokens} tokens, more than the whole per-minute budget of ${rateLimitTPM} (llm.${provider}.rateLimitTPM). ` +
                `No amount of waiting frees that much: shorten the conversation, send fewer tool schemas, or raise rateLimitTPM in config/mainConfig.json.`,
        );
        error.status = 413;
        throw error;
    }

    const waitStartedAt = Date.now();
    while (true) {
        const availableTokens = rateLimitTPM - tokensUsedLastMinute();
        if (availableTokens >= neededTokens) {
            return;
        }

        const waitedSoFarMs = Date.now() - waitStartedAt;
        if (waitedSoFarMs >= maxBudgetWaitMs) {
            const error = new Error(
                `Waited ${Math.round(waitedSoFarMs / 1000)} s for rate-limit budget without getting it: ${neededTokens} tokens needed, ` +
                    `${Math.max(availableTokens, 0)} free out of ${rateLimitTPM} per minute (llm.${provider}.rateLimitTPM). Retry in a minute, or raise the limit.`,
            );
            error.status = 429;
            throw error;
        }

        // The window holds at least one entry here (used tokens are above zero, otherwise the whole
        // budget would be free), but it is read defensively: this exact access is what used to crash.
        const oldestEntry = tokenWindow[0];
        const waitMs = oldestEntry ? Math.max(oneMinuteMs - (Date.now() - oldestEntry.time) + 500, 250) : 250;
        console.warn(`[llm] rate limit reached: ${neededTokens} tokens needed, ${Math.max(availableTokens, 0)} free of ${rateLimitTPM} TPM. Waiting ${waitMs} ms.`);
        await sleep(waitMs);
    }
}

// ── Retry with exponential backoff ──────────────────────────────────────────
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// A provider is free to ask for an arbitrarily long pause; honouring it literally would hold an HTTP
// request open for as long as it likes. Past this the exponential backoff and the retry count decide.
const maxRetryDelayMs = 60000;

/**
 * How long to wait before retrying a 429.
 *
 * `Retry-After` comes in two forms per RFC 9110 (delay in seconds, or an HTTP-date) and the header
 * bag is a plain object with some SDKs and a `Headers` instance with others. Both were unhandled:
 * `parseInt` of an HTTP-date yields NaN, and `setTimeout(NaN)` fires immediately, so a rate-limited
 * call burned its five retries in a few milliseconds and reported the last provider error as if the
 * backoff had run.
 *
 * @param {*} errorHeaders - Response headers carried by the provider error, in either shape
 * @param {number} attempt - 1-based
 * @param {number} baseDelayMs
 * @returns {number}
 */
function retryDelayMs(errorHeaders, attempt, baseDelayMs) {
    const exponentialDelayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxRetryDelayMs);
    if (!errorHeaders) {
        return exponentialDelayMs;
    }

    const rawRetryAfter = typeof errorHeaders.get === "function" ? errorHeaders.get("retry-after") : (errorHeaders["retry-after"] ?? errorHeaders["Retry-After"]);
    if (rawRetryAfter === undefined || rawRetryAfter === null || rawRetryAfter === "") {
        return exponentialDelayMs;
    }

    const delaySeconds = Number(rawRetryAfter);
    if (Number.isFinite(delaySeconds) && delaySeconds >= 0) {
        return Math.min(delaySeconds * 1000, maxRetryDelayMs);
    }

    const retryAtMs = Date.parse(rawRetryAfter);
    if (!Number.isNaN(retryAtMs)) {
        return Math.min(Math.max(retryAtMs - Date.now(), 0), maxRetryDelayMs);
    }
    return exponentialDelayMs;
}

async function withRetry(fn, retries = 5, baseDelayMs = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            // A budget error raised by waitForBudget carries 429 too, but retrying it here would only
            // stack another wait on top of the one that just timed out: it is thrown, not retried.
            const isProviderRateLimit = (error.status === 429 || error.message?.includes("rate_limit")) && !error.isBudgetError;
            if (!isProviderRateLimit || attempt === retries) {
                throw error;
            }
            const waitMs = retryDelayMs(error.headers, attempt, baseDelayMs);
            console.warn(`[llm] provider rate-limited (attempt ${attempt}/${retries}): ${error.message}. Retrying in ${waitMs} ms.`);
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

    // Decrypt the API key if it was stored encrypted (enc:v1:...); plaintext keys pass through unchanged.
    const resolvedConfig = { ...providerConfig };
    if (resolvedConfig.apiKey) {
        resolvedConfig.apiKey = decryptSecret(resolvedConfig.apiKey);
    }

    return { adapter: adapterFactory(resolvedConfig), rateLimitTPM: providerConfig.rateLimitTPM, provider: llmConfig.provider };
}

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Run one adapter call through the token budget and the retry policy.
 *
 * @param {function(object, function): void} invokeAdapter - Called with the resolved adapter and an error-first callback
 * @param {{system: *, messages: *, tools: *}} tokenCountRequest - What the pre-call estimate is measured on
 * @param {function} callback - Error-first, called exactly once
 */
function callAdapterWithBudget(invokeAdapter, tokenCountRequest, callback) {
    getAdapter()
        .then(({ adapter, rateLimitTPM, provider }) =>
            withRetry(async () => {
                const estimatedInputTokens = await adapter.countTokens(tokenCountRequest);
                try {
                    await waitForBudget(estimatedInputTokens, rateLimitTPM, provider);
                } catch (budgetError) {
                    budgetError.isBudgetError = true;
                    throw budgetError;
                }
                const reservation = reserveTokens(estimatedInputTokens);
                return new Promise((resolve, reject) => {
                    invokeAdapter(adapter, (error, result) => {
                        if (error) {
                            return reject(error);
                        }
                        const usage = result?.usage ?? {};
                        const reportedTokens = (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
                        // Providers that report no usage at all (some OpenRouter models) would zero the
                        // reservation and make the window under-count; the estimate stands in that case.
                        reservation.count = reportedTokens > 0 ? reportedTokens : estimatedInputTokens;
                        resolve(result);
                    });
                });
            }),
        )
        .then(
            // Two-argument `then` rather than `.catch`, and the success callback guarded on its own:
            // with a trailing catch, a callback that threw on the success path (a normalizer, an
            // Express response) was caught here and called a second time with its own exception,
            // answering an already-answered HTTP request. It is now reported and stops there, rather
            // than turning into an unhandled rejection that takes the process down.
            (result) => {
                try {
                    callback(null, result);
                } catch (callbackError) {
                    console.error("[llm] the caller's callback threw after a successful completion:", callbackError);
                }
            },
            (error) => callback(error),
        );
}

function complete(prompt, options, callback) {
    callAdapterWithBudget((adapter, adapterCallback) => adapter.complete(prompt, options, adapterCallback), { system: options?.system, messages: [{ role: "user", content: prompt }] }, callback);
}

function createMessage(params, callback) {
    callAdapterWithBudget((adapter, adapterCallback) => adapter.createMessage(params, adapterCallback), { system: params.system, messages: params.messages, tools: params.tools }, callback);
}

export default { complete, createMessage };
