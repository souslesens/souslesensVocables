import Anthropic from "@anthropic-ai/sdk";

function createAnthropicAdapter(anthropicConfig) {
    // dangerouslyAllowBrowser: the SLS Node server defines browser-like globals (window/document) so it
    // can import shared frontend modules, which trips the SDK's browser detection. This adapter runs
    // server-side only — the API key never reaches the client — so enabling the flag here is safe.
    const client = new Anthropic({ apiKey: anthropicConfig.apiKey, dangerouslyAllowBrowser: true });

    async function createMessage({ model, system, messages, maxTokens }, callback) {
        try {
            const response = await client.messages.create({
                model: model ?? anthropicConfig.defaultModel,
                max_tokens: maxTokens ?? anthropicConfig.maxTokens,
                system,
                messages,
            });
            callback(null, response);
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
            callback
        );
    }

    async function countTokens({ system, messages }) {
        const response = await client.messages.countTokens({
            model: anthropicConfig.defaultModel,
            system,
            messages,
        });
        return response.input_tokens;
    }

    return { complete, createMessage, countTokens };
}

export default createAnthropicAdapter;
