/**
 * Turn a provider-specific completion into the single shape the agent loop consumes.
 *
 * The adapters deliberately keep returning their provider's raw payload: `classify.js` and
 * `alignment.js` read `result.content[0].text` and `result.usage` directly, and `llmClient` reads
 * `result.usage.input_tokens` to feed its rate limiter. Normalising inside an adapter would break
 * all three. So the translation lives here, applied by the caller that wants a uniform shape.
 */

/**
 * Flatten an Anthropic message into text, tool calls and the raw blocks.
 *
 * `content` is returned untouched on purpose: an agent loop must echo the assistant turn back
 * verbatim in its next `messages` array, tool_use blocks included, or the API rejects the tool
 * results that follow.
 *
 * @param {Object} response - Raw `messages.create` response.
 * @returns {{stopReason: string, text: string, toolCalls: Array<{id: string, name: string, input: Object}>, content: Array<Object>, usage: Object}}
 */
function normalizeAnthropicCompletion(response) {
    const contentBlocks = Array.isArray(response.content) ? response.content : [];

    const textParts = [];
    const toolCalls = [];
    for (const contentBlock of contentBlocks) {
        if (contentBlock.type === "text") {
            textParts.push(contentBlock.text);
        }
        if (contentBlock.type === "tool_use") {
            toolCalls.push({ id: contentBlock.id, name: contentBlock.name, input: contentBlock.input });
        }
    }

    return {
        stopReason: response.stop_reason,
        text: textParts.join(""),
        toolCalls: toolCalls,
        content: contentBlocks,
        usage: response.usage,
    };
}

const normalizersByProvider = {
    anthropic: normalizeAnthropicCompletion,
    // The OpenRouter adapter already rebuilds the OpenAI reply as Anthropic content blocks, so the
    // same normalizer applies and no second flattener has to be kept in sync. That conversion
    // belongs to the adapter rather than here because the request needs translating too: an
    // OpenAI-style provider carries tool results as `role: "tool"` messages instead of blocks, and
    // only the adapter sees the request.
    openrouter: normalizeAnthropicCompletion,
};

/**
 * @param {string} provider - Value of `llm.provider` in mainConfig.json.
 * @param {Object} response - Raw completion returned by that provider's adapter.
 */
function normalizeCompletion(provider, response) {
    const normalizer = normalizersByProvider[provider];
    if (!normalizer) {
        throw new Error(`No completion normalizer for LLM provider "${provider}"`);
    }
    return normalizer(response);
}

export { normalizeCompletion, normalizersByProvider };
