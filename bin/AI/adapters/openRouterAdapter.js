const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

// OpenRouter ne fournit pas d'endpoint de comptage de tokens.
// Estimation pré-appel pour le budget du rate-limiter : ratio moyen observé sur
// les tokenizers BPE (~3.5 caractères par token). Volontairement conservateur
// (on divise par un petit nombre) pour ne pas sous-estimer le budget consommé.
const AVERAGE_CHARS_PER_TOKEN = 3.5;

function estimateTokens({ system, messages }) {
    let totalCharacters = system ? system.length : 0;
    (messages ?? []).forEach((message) => {
        totalCharacters += typeof message.content === "string" ? message.content.length : JSON.stringify(message.content).length;
    });
    return Math.ceil(totalCharacters / AVERAGE_CHARS_PER_TOKEN);
}

// Convertit le couple { system, messages } (format Anthropic) vers le tableau
// messages OpenAI/OpenRouter, où le system prompt est un message à part entière.
function toOpenAiMessages(system, messages) {
    const openAiMessages = [];
    if (system) openAiMessages.push({ role: "system", content: system });
    (messages ?? []).forEach((message) => openAiMessages.push(message));
    return openAiMessages;
}

// Normalise la réponse OpenRouter (format OpenAI) vers le format de réponse
// Anthropic, pour que cet adapter soit un drop-in du anthropicAdapter.
function toAnthropicResponse(openRouterResponse) {
    const firstChoice = openRouterResponse.choices?.[0];
    const usage = openRouterResponse.usage ?? {};
    return {
        id: openRouterResponse.id,
        model: openRouterResponse.model,
        role: "assistant",
        content: [{ type: "text", text: firstChoice?.message?.content ?? "" }],
        stop_reason: firstChoice?.finish_reason ?? null,
        usage: {
            input_tokens: usage.prompt_tokens ?? 0,
            output_tokens: usage.completion_tokens ?? 0,
        },
    };
}

function createOpenRouterAdapter(openRouterConfig) {
    const headers = {
        Authorization: `Bearer ${openRouterConfig.apiKey}`,
        "Content-Type": "application/json",
    };
    // Headers de classement optionnels recommandés par OpenRouter.
    if (openRouterConfig.appUrl) headers["HTTP-Referer"] = openRouterConfig.appUrl;
    if (openRouterConfig.appName) headers["X-Title"] = openRouterConfig.appName;

    async function createMessage({ model, system, messages, maxTokens }, callback) {
        try {
            const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: model ?? openRouterConfig.defaultModel,
                    max_tokens: maxTokens ?? openRouterConfig.maxTokens,
                    messages: toOpenAiMessages(system, messages),
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                const error = new Error(`OpenRouter request failed (${response.status}): ${errorBody}`);
                error.status = response.status;
                error.headers = Object.fromEntries(response.headers.entries());
                return callback(error);
            }

            const openRouterResponse = await response.json();
            callback(null, toAnthropicResponse(openRouterResponse));
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

export default createOpenRouterAdapter;
