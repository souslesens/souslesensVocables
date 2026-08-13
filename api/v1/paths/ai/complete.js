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
            // without `tools`. Anthropic is the only one wired, because the divergence is not just
            // the reply shape: OpenAI-style providers also carry tool results back as `role: "tool"`
            // messages instead of content blocks, so the caller's whole loop would differ.
            if (!normalizersByProvider[provider]) {
                return res.status(501).json({
                    error: `This route is not implemented for LLM provider "${provider}". Set llm.provider to "anthropic" in config/mainConfig.json. Other routes (classify, alignment) are unaffected.`,
                    provider: provider,
                    supportedProviders: Object.keys(normalizersByProvider),
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
                    // returning it as-is would tell the browser its own session expired.
                    const upstreamStatus = error.status ?? null;
                    const status = upstreamStatus === 429 ? 429 : 502;
                    return res.status(status).json({ error: error.message, upstreamStatus: upstreamStatus });
                }

                const normalized = normalizeCompletion(provider, completion);
                return res.status(200).json({ ...normalized, model: completion.model });
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
            return next(error);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Run one LLM turn, with optional tool calling",
        description:
            "Forwards `{system, messages, tools}` to the configured LLM provider through `bin/AI/llmClient.js`, which applies the shared rate limiter and " +
            "decrypts the API key. Exists so that an agent loop can run in the browser without the API key ever leaving the server: the caller drives the " +
            "conversation and executes the tools, this route only produces the model's next turn. " +
            'Requires `llm.provider: "anthropic"`: other providers answer 501, since OpenAI-style providers carry tool results back as `role: "tool"` messages ' +
            "instead of content blocks, which would change the caller's loop and not just this reply's shape. `classify` and `alignment` are unaffected by that restriction. " +
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
                            description: "Tool schemas offered to the model, in the provider's format. Anthropic only.",
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
            429: { description: "Provider rate limit, or the caller's profile quota for this route." },
            501: { description: "No LLM provider configured, or the configured provider is not supported by this route." },
            502: { description: "The LLM provider refused or is unreachable. `upstreamStatus` carries its status." },
        },
        tags: ["AI"],
    };

    return operations;
}
