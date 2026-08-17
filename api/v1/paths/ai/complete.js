import { readMainConfig } from "../../../../model/config.js";
import llmClient from "../../../../bin/AI/llmClient.js";
import { normalizeCompletion, normalizersByProvider } from "../../../../bin/AI/normalizeCompletion.js";

// A single turn is capped well above a normal answer but far below the provider maximum: this route
// runs inside an agent loop, so a caller that asks for the ceiling on every iteration burns the
// platform's LLM budget in a handful of turns.
const maxTokensCeiling = 16384;

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        try {
            const config = readMainConfig();
            const provider = config.llm?.provider;
            if (!provider) {
                return res.status(501).json({ error: "No LLM provider configured. Add an `llm` block to config/mainConfig.json." });
            }

            // Refused up front rather than after the call: this route always answers in the
            // normalized shape, so a provider with no normalizer cannot be served at all, with or
            // without `tools`. A provider qualifies once its adapter speaks Anthropic content
            // blocks in both directions, request included: an OpenAI-style provider carries tool
            // results back as `role: "tool"` messages, and unless the adapter hides that, the
            // caller's whole loop would differ and not just this reply's shape.
            if (!normalizersByProvider[provider]) {
                const supportedProviders = Object.keys(normalizersByProvider);
                return res.status(501).json({
                    error: `This route is not implemented for LLM provider "${provider}". Set llm.provider to one of ${supportedProviders.join(", ")} in config/mainConfig.json. Other routes (classify, alignment) are unaffected.`,
                    provider: provider,
                    supportedProviders: supportedProviders,
                });
            }

            const messages = req.body.messages;
            if (!Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({ error: "`messages` must be a non-empty array." });
            }

            const tools = req.body.tools;
            const requestedMaxTokens = req.body.maxTokens;
            const maxTokens = requestedMaxTokens ? Math.min(requestedMaxTokens, maxTokensCeiling) : undefined;

            return llmClient.createMessage({ system: req.body.system, messages: messages, tools: tools, maxTokens: maxTokens, model: req.body.model }, function (error, completion) {
                if (error) {
                    // The upstream status is reported in the body rather than as the response
                    // status: a 401 from the provider means the platform's API key is wrong, and
                    // returning it as-is would tell the browser its own session expired. The two
                    // exceptions are the statuses the caller can act on: 429 says retry later, and
                    // 413 says this conversation cannot fit the configured per-minute budget at all,
                    // which retrying will never fix.
                    const upstreamStatus = error.status ?? null;
                    const isCallerActionable = upstreamStatus === 429 || upstreamStatus === 413;
                    const status = isCallerActionable ? upstreamStatus : 502;
                    console.warn(`[ai/complete] ${status}: ${error.message}`);
                    return res.status(status).json({ error: error.message, upstreamStatus: upstreamStatus });
                }

                // Guarded rather than left to throw into the callback: normalising a completion whose
                // shape the adapter did not guarantee must answer the request, not reject a promise
                // inside llmClient with the HTTP call still open.
                try {
                    const normalized = normalizeCompletion(provider, completion);
                    return res.status(200).json({ ...normalized, model: completion.model });
                } catch (normalizationError) {
                    console.error(`[ai/complete] could not normalize the ${provider} completion:`, normalizationError.message);
                    return res.status(502).json({ error: `The ${provider} answer could not be read: ${normalizationError.message}` });
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
            return next(error);
        }
    }

    POST.apiDoc = {
        // Admin like `classify` and `alignment`, the two other routes that spend the platform's LLM
        // key, plus the per-account quota because one call here is one turn of a loop, not one
        // answer. `restrictQuota` is declared first: it is the handler that reads the Bearer token
        // into `req.user`, which `restrictAdmin` then reads to check the group.
        security: [{ restrictQuota: [], restrictAdmin: [] }],
        summary: "Run one LLM turn, with optional tool calling",
        description:
            "Forwards `{system, messages, tools}` to the configured LLM provider through `bin/AI/llmClient.js`, which applies the shared rate limiter and " +
            "decrypts the API key. Exists so that an agent loop can run in the browser without the API key ever leaving the server: the caller drives the " +
            "conversation and executes the tools, this route only produces the model's next turn. " +
            'The wire format is Anthropic content blocks whatever the provider: `llm.provider` may be "anthropic" or "openrouter" (which fronts any tool-calling ' +
            "model it serves, Kimi and DeepSeek included), and the OpenRouter adapter translates both directions so the caller's loop never changes. Any other " +
            "provider answers 501, with the supported list in the body. `classify` and `alignment` are unaffected by that restriction. " +
            "`content` is returned unchanged and must be echoed back verbatim as the next assistant message, tool_use blocks included, or the provider " +
            "rejects the tool results that follow it.",
        operationId: "aiComplete",
        // Deliberately no `x-mcp`: this route is what *drives* an MCP client, exposing it as an MCP
        // tool would let an agent spend the platform's LLM budget on its own initiative.
        parameters: [
            {
                name: "body",
                description: "One LLM turn.",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["messages"],
                    properties: {
                        messages: {
                            type: "array",
                            description: "Conversation so far, in the provider's message format.",
                            items: { type: "object", additionalProperties: true },
                        },
                        system: {
                            type: "string",
                            description: "System prompt. For an MCP-backed agent, start from the `instructions` returned by the MCP server's `initialize`.",
                        },
                        tools: {
                            type: "array",
                            description:
                                "Tool schemas offered to the model, in Anthropic format (`{name, description, input_schema}`). The OpenRouter adapter converts them to OpenAI function calling.",
                            items: { type: "object", additionalProperties: true },
                        },
                        maxTokens: {
                            type: "integer",
                            description: `Output ceiling for this turn. Capped at ${maxTokensCeiling}; falls back to the provider's configured maxTokens when omitted.`,
                        },
                        model: {
                            type: "string",
                            description: "Model override. Defaults to the provider's configured defaultModel.",
                        },
                    },
                    example: {
                        system: "You answer questions about ontologies.",
                        messages: [{ role: "user", content: "Which sources mention pumps?" }],
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "The model's turn, normalized.",
                schema: {
                    type: "object",
                    properties: {
                        stopReason: { type: "string", description: "`end_turn`, `tool_use`, `max_tokens`. `tool_use` means the caller must run the tools and send the results back." },
                        text: { type: "string", description: "Concatenation of the text blocks, for display." },
                        toolCalls: {
                            type: "array",
                            description: "Tools the model wants run, in order.",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    input: { type: "object", additionalProperties: true },
                                },
                            },
                        },
                        content: {
                            type: "array",
                            description: "Raw provider blocks. Echo back verbatim as the next assistant message.",
                            items: { type: "object", additionalProperties: true },
                        },
                        usage: { type: "object", additionalProperties: true },
                        model: { type: "string" },
                    },
                    example: {
                        stopReason: "tool_use",
                        text: "Let me look that up.",
                        toolCalls: [{ id: "toolu_01", name: "sls_count_labels_by_source", input: { text: "pump", indexes: ["cfihos-iof"] } }],
                        usage: { input_tokens: 6120, output_tokens: 84 },
                        model: "claude-sonnet-4-6",
                    },
                },
            },
            400: { description: "`messages` missing or empty." },
            413: {
                description:
                    "This turn alone needs more tokens than the whole configured per-minute budget (`llm.<provider>.rateLimitTPM`). Retrying will not help: shorten the conversation or raise the limit.",
            },
            429: { description: "Provider rate limit, the shared per-minute token budget could not be freed in time, or the caller's profile quota for this route." },
            501: { description: "No LLM provider configured, or the configured provider is not supported by this route." },
            502: { description: "The LLM provider refused or is unreachable. `upstreamStatus` carries its status." },
        },
        tags: ["AI"],
    };

    return operations;
}
