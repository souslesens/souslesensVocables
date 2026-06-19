import Anthropic from "@anthropic-ai/sdk";

function createAnthropicAdapter(anthropicConfig) {
    const client = new Anthropic({ apiKey: anthropicConfig.apiKey });

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
            callback,
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
