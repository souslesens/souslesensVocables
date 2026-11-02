import Anthropic from "@anthropic-ai/sdk";

function createAnthropicAdapter(anthropicConfig) {
    // dangerouslyAllowBrowser: the SLS Node server defines browser-like globals (window/document) so it
    // can import shared frontend modules, which trips the SDK's browser detection. This adapter runs
    // server-side only — the API key never reaches the client — so enabling the flag here is safe.
    const client = new Anthropic({ apiKey: anthropicConfig.apiKey, dangerouslyAllowBrowser: true });

    async function createMessage({ model, system, messages, maxTokens, tools }, callback) {
        try {
            const requestBody = {
                model: model ?? anthropicConfig.defaultModel,
                max_tokens: maxTokens ?? anthropicConfig.maxTokens,
                system,
                messages,
            };
            // Set `tools` only when the caller declared some: the API rejects an empty array, and the
            // existing callers (classify, alignment) never pass any.
            if (tools && tools.length > 0) {
                requestBody.tools = tools;
            }
            const response = await client.messages.create(requestBody);
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

    async function countTokens({ system, messages, tools }) {
        const countRequest = {
            model: anthropicConfig.defaultModel,
            system,
            messages,
        };
        // Tool schemas dominate the input of an agent turn: the MCP catalog alone is around 5 800
        // tokens, resent at every iteration. Leaving them out here would make the rate limiter blind
        // to most of the traffic it is supposed to pace.
        if (tools && tools.length > 0) {
            countRequest.tools = tools;
        }
        const response = await client.messages.countTokens(countRequest);
        return response.input_tokens;
    }

    return { complete, createMessage, countTokens };
}

export default createAnthropicAdapter;
