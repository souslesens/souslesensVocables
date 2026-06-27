// Adapter for a local Ollama server (https://ollama.com). Fully local, free, no rate limit.
// Drop-in for the anthropic/openrouter adapters: exposes complete / createMessage / countTokens
// and normalises the Ollama response to the Anthropic response shape used across the app.

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

// Ollama has no token-count endpoint; estimate from characters for the rate-limiter budget
// (same heuristic as the OpenRouter adapter). Local runs are not rate-limited, so this is only
// used to feed llmClient's budget bookkeeping.
const AVERAGE_CHARS_PER_TOKEN = 3.5;

function estimateTokens({ system, messages }) {
    let totalCharacters = 0;
    if (system) {
        totalCharacters += system.length;
    }
    (messages ?? []).forEach((message) => {
        if (typeof message.content === "string") {
            totalCharacters += message.content.length;
        } else {
            totalCharacters += JSON.stringify(message.content).length;
        }
    });
    return Math.ceil(totalCharacters / AVERAGE_CHARS_PER_TOKEN);
}

// Converts the { system, messages } pair (Anthropic format) to Ollama's chat messages array,
// where the system prompt is a leading message.
function toOllamaMessages(system, messages) {
    const ollamaMessages = [];
    if (system) {
        ollamaMessages.push({ role: "system", content: system });
    }
    (messages ?? []).forEach((message) => ollamaMessages.push(message));
    return ollamaMessages;
}

// Normalises the Ollama /api/chat response to the Anthropic response shape, so this adapter is a
// drop-in replacement for the anthropic/openrouter adapters.
function toAnthropicResponse(ollamaResponse) {
    const message = ollamaResponse.message ?? {};
    return {
        id: ollamaResponse.created_at ?? null,
        model: ollamaResponse.model,
        role: "assistant",
        content: [{ type: "text", text: message.content ?? "" }],
        stop_reason: ollamaResponse.done_reason ?? null,
        usage: {
            input_tokens: ollamaResponse.prompt_eval_count ?? 0,
            output_tokens: ollamaResponse.eval_count ?? 0,
        },
    };
}

function createOllamaAdapter(ollamaConfig) {
    let baseUrl = ollamaConfig.baseUrl;
    if (!baseUrl) {
        baseUrl = DEFAULT_OLLAMA_BASE_URL;
    }
    const chatUrl = baseUrl.replace(/\/+$/, "") + "/api/chat";

    async function createMessage({ model, system, messages, maxTokens }, callback) {
        try {
            const body = {
                model: model ?? ollamaConfig.defaultModel,
                messages: toOllamaMessages(system, messages),
                stream: false,
            };
            const numPredict = maxTokens ?? ollamaConfig.maxTokens;
            if (numPredict) {
                body.options = { num_predict: numPredict };
            }

            const response = await fetch(chatUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                const error = new Error(`Ollama request failed (${response.status}): ${errorBody}`);
                error.status = response.status;
                return callback(error);
            }

            const ollamaResponse = await response.json();
            callback(null, toAnthropicResponse(ollamaResponse));
        } catch (error) {
            callback(error);
        }
    }

    function complete(prompt, options, callback) {
        return createMessage(
            {
                model: options?.model,
                system: options?.system,
                messages: [{ role: "user", content: prompt }],
                maxTokens: options?.maxTokens,
            },
            callback,
        );
    }

    async function countTokens({ system, messages }) {
        return estimateTokens({ system, messages });
    }

    return { complete, createMessage, countTokens };
}

export default createOllamaAdapter;
