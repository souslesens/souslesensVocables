const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

// OpenRouter offers no token counting endpoint.
// Pre-call estimate for the rate limiter budget: average ratio observed on
// BPE tokenizers (~3.5 characters per token). Deliberately conservative
// (dividing by a small number) so as not to underestimate the budget used.
const AVERAGE_CHARS_PER_TOKEN = 3.5;

// OpenAI finish_reason -> Anthropic stop_reason, so that the agent loop reads the same
// vocabulary whatever the configured provider.
const ANTHROPIC_STOP_REASONS = { stop: "end_turn", length: "max_tokens", tool_calls: "tool_use" };

function estimateTokens({ system, messages, tools }) {
    let totalCharacters = system ? system.length : 0;
    (messages ?? []).forEach((message) => {
        if (typeof message.content === "string") {
            totalCharacters += message.content.length;
            return;
        }
        // JSON.stringify returns `undefined` on a missing content, and reading `.length` on it made
        // the estimate fail before the call even started, with a TypeError that says nothing about tokens.
        const serializedContent = JSON.stringify(message.content);
        totalCharacters += serializedContent ? serializedContent.length : 0;
    });
    // Tool schemas dominate the input of an agent turn: the MCP catalog alone weighs about
    // 5 800 tokens, sent again at each iteration. Leaving them out would make the rate limiter blind to
    // most of the traffic it is supposed to pace.
    if (tools && tools.length > 0) {
        totalCharacters += JSON.stringify(tools).length;
    }
    return Math.ceil(totalCharacters / AVERAGE_CHARS_PER_TOKEN);
}

// Converts tool schemas from the Anthropic format ({ name, description, input_schema }) to the
// OpenAI function calling format OpenRouter expects.
function toOpenAiTools(anthropicTools) {
    return anthropicTools.map((anthropicTool) => ({
        type: "function",
        function: { name: anthropicTool.name, description: anthropicTool.description, parameters: anthropicTool.input_schema },
    }));
}

// Flattens the `content` of an Anthropic tool_result block (string, or array of blocks) to the single
// string an OpenAI `role: "tool"` message expects.
function toToolResultText(toolResultContent) {
    if (typeof toolResultContent === "string") {
        return toolResultContent;
    }
    const resultBlocks = toolResultContent ?? [];
    const resultTextParts = [];
    for (const resultBlock of resultBlocks) {
        resultTextParts.push(resultBlock.type === "text" ? resultBlock.text : JSON.stringify(resultBlock));
    }
    return resultTextParts.join("\n");
}

// Converts the { system, messages } pair (Anthropic format) to the OpenAI/OpenRouter
// messages array. Three format differences are absorbed here:
//   - the system prompt becomes a message of its own;
//   - the tool_use blocks of an assistant turn become a `tool_calls` array next to the text;
//   - the tool_result blocks, carried by a `user` message on the Anthropic side, become as many
//     separate `role: "tool"` messages.
// This translation of the *request*, not only of the response, is what lets the
// /ai/complete route keep a single contract in Anthropic blocks whatever the provider.
function toOpenAiMessages(system, messages, isSystemCached) {
    const openAiMessages = [];
    // the cache point on the system also covers the tools that precede it in the Anthropic prefix
    if (system && isSystemCached) {
        openAiMessages.push({ role: "system", content: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] });
    } else if (system) {
        openAiMessages.push({ role: "system", content: system });
    }

    (messages ?? []).forEach((message) => {
        if (typeof message.content === "string") {
            openAiMessages.push(message);
            return;
        }

        const contentBlocks = message.content ?? [];
        const textParts = [];
        const toolCalls = [];
        const toolResultMessages = [];

        for (const contentBlock of contentBlocks) {
            if (contentBlock.type === "text") {
                textParts.push(contentBlock.text);
            }
            if (contentBlock.type === "tool_use") {
                toolCalls.push({
                    id: contentBlock.id,
                    type: "function",
                    function: { name: contentBlock.name, arguments: JSON.stringify(contentBlock.input ?? {}) },
                });
            }
            if (contentBlock.type === "tool_result") {
                toolResultMessages.push({ role: "tool", tool_call_id: contentBlock.tool_use_id, content: toToolResultText(contentBlock.content) });
            }
        }

        // Tool results go before the text of the same message: they answer the previous assistant
        // turn, while the text that comes with them belongs to the current turn.
        toolResultMessages.forEach((toolResultMessage) => openAiMessages.push(toolResultMessage));

        const text = textParts.join("");
        if (toolCalls.length > 0) {
            // `content: null` and not `""`: this is what the OpenAI API specifies for an assistant
            // turn that only calls tools, and some models reject the empty string.
            openAiMessages.push({ role: message.role, content: text || null, tool_calls: toolCalls });
        } else if (text) {
            openAiMessages.push({ role: message.role, content: text });
        }
    });

    return openAiMessages;
}

// Default HTTP status of an error reported in a 200 body without a usable code: 502, the
// same value the /ai/complete route gives to a provider that refuses.
const openRouterBodyErrorStatus = 502;

/**
 * Detects an error reported *inside* an HTTP 200 response.
 *
 * OpenRouter reports provider outages in the body as often as with an HTTP status:
 * `{error: {code, message}}` at the top level, an error carried by the choice, or a
 * `finish_reason: "error"`. Read as a normal response, none of these forms raises an
 * exception: `choices?.[0]` is `undefined`, the rebuilt message is empty, and the assistant
 * turn returned is an empty text block with `usage` at zero. This is how an exceeded quota
 * reached the agent loop as silence rather than as an error.
 *
 * @param {*} openRouterResponse
 * @returns {Error|null}
 */
function errorFromOpenRouterBody(openRouterResponse) {
    const firstChoice = openRouterResponse?.choices?.[0];
    const reportedError = openRouterResponse?.error ?? firstChoice?.error;

    if (reportedError) {
        const reportedMessage = reportedError.message ?? JSON.stringify(reportedError);
        const error = new Error(`OpenRouter returned an error inside a successful response: ${reportedMessage}`);
        const reportedCode = Number(reportedError.code);
        error.status = Number.isInteger(reportedCode) && reportedCode >= 400 ? reportedCode : openRouterBodyErrorStatus;
        return error;
    }

    if (!Array.isArray(openRouterResponse?.choices) || openRouterResponse.choices.length === 0) {
        const error = new Error(`OpenRouter returned no completion choice: ${JSON.stringify(openRouterResponse).slice(0, 500)}`);
        error.status = openRouterBodyErrorStatus;
        return error;
    }

    if (firstChoice.finish_reason === "error") {
        const error = new Error(`OpenRouter ended the turn on an error (native_finish_reason: ${firstChoice.native_finish_reason ?? "none"}).`);
        error.status = openRouterBodyErrorStatus;
        return error;
    }

    return null;
}

// Normalizes the OpenRouter response (OpenAI format) to the Anthropic response format, tool_use
// blocks included, so that this adapter stays a drop-in for anthropicAdapter and
// normalizeCompletion can reuse the Anthropic normalizer without duplicating it.
function toAnthropicResponse(openRouterResponse) {
    const firstChoice = openRouterResponse.choices?.[0];
    const responseMessage = firstChoice?.message ?? {};
    const usage = openRouterResponse.usage ?? {};
    const toolCalls = responseMessage.tool_calls ?? [];

    const contentBlocks = [];
    // The text block stays present even when empty if the model calls no tool: classify.js and
    // alignment.js read `content[0].text` without a guard.
    if (responseMessage.content || toolCalls.length === 0) {
        contentBlocks.push({ type: "text", text: responseMessage.content ?? "" });
    }
    toolCalls.forEach((toolCall) => {
        const rawArguments = toolCall.function?.arguments ?? "{}";
        let parsedArguments;
        try {
            parsedArguments = JSON.parse(rawArguments);
        } catch {
            // A loud failure rather than a fallback on {}: an agent loop running the tool
            // with empty arguments would produce a wrong result that nothing downstream could
            // tell from a real one.
            throw new Error(`OpenRouter returned malformed tool arguments for "${toolCall.function?.name}": ${rawArguments}`);
        }
        contentBlocks.push({ type: "tool_use", id: toolCall.id, name: toolCall.function?.name, input: parsedArguments });
    });

    return {
        id: openRouterResponse.id,
        model: openRouterResponse.model,
        role: "assistant",
        content: contentBlocks,
        stop_reason: ANTHROPIC_STOP_REASONS[firstChoice?.finish_reason] ?? firstChoice?.finish_reason ?? null,
        usage: {
            input_tokens: usage.prompt_tokens ?? 0,
            output_tokens: usage.completion_tokens ?? 0,
            cached_input_tokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
        },
    };
}

// Anthropic models are named anthropic/<model> on OpenRouter
const anthropicModelPrefix = "anthropic/";
// Bedrock and Google also serve these models, but cutting the connection there does not stop the billing (OpenRouter doc, stream cancellation)
const anthropicProviderRouting = { order: ["anthropic"], allow_fallbacks: false };
const sseDataPrefix = "data: ";
const sseDoneLine = "data: [DONE]";
// A request that receives nothing more is stuck: stopping it frees what the caller holds, the generation lock of a source first.
// A stream sends its reasoning while the model works, a non-streamed answer only arrives at the end.
// The SSE keep-alive comments do not count: OpenRouter also sends them when the provider no longer answers.
const millisecondsPerMinute = 60 * 1000;
const streamedIdleTimeoutMs = 10 * millisecondsPerMinute;
const wholeAnswerTimeoutMs = 30 * millisecondsPerMinute;

// Reads a `stream: true` response and rebuilds it in the shape of a non-streamed one: the
// error detection and the normalization that follow stay those of the normal mode.
async function readStreamedCompletion(response, onTextDelta, onReasoningDelta, onDataReceived) {
    const decoder = new TextDecoder();
    const streamedChoice = { message: { content: "" }, finish_reason: null };
    const streamedResponse = { choices: [streamedChoice] };
    const streamedToolCalls = [];
    function readLine(rawLine) {
        const line = rawLine.trimEnd();
        // the `: OPENROUTER PROCESSING` lines are SSE comments that keep the connection open
        if (!line.startsWith(sseDataPrefix) || line === sseDoneLine) {
            return;
        }
        onDataReceived();
        const chunk = JSON.parse(line.slice(sseDataPrefix.length));
        streamedResponse.id = chunk.id ?? streamedResponse.id;
        streamedResponse.model = chunk.model ?? streamedResponse.model;
        if (chunk.usage) {
            streamedResponse.usage = chunk.usage;
        }
        // an error after the headers arrives in a chunk, the HTTP status stays 200
        if (chunk.error) {
            streamedResponse.error = chunk.error;
        }
        const chunkChoice = chunk.choices?.[0];
        if (!chunkChoice) {
            return;
        }
        streamedChoice.finish_reason = chunkChoice.finish_reason ?? streamedChoice.finish_reason;
        const delta = chunkChoice.delta ?? {};
        if (delta.content) {
            streamedChoice.message.content += delta.content;
            onTextDelta(delta.content);
        }
        if (typeof delta.reasoning === "string" && delta.reasoning && onReasoningDelta) {
            onReasoningDelta(delta.reasoning);
        }
        // a tool call arrives in pieces identified by their index: the id and the name in the first, the JSON arguments as split text
        (delta.tool_calls ?? []).forEach(function (toolCallDelta) {
            // without an index, a new id opens a new call, otherwise the piece continues the last one
            let toolCallIndex = toolCallDelta.index;
            if (toolCallIndex === undefined) {
                const lastToolCall = streamedToolCalls[streamedToolCalls.length - 1];
                const isNewToolCall = !lastToolCall || (toolCallDelta.id && toolCallDelta.id != lastToolCall.id);
                toolCallIndex = isNewToolCall ? streamedToolCalls.length : streamedToolCalls.length - 1;
            }
            if (!streamedToolCalls[toolCallIndex]) {
                streamedToolCalls[toolCallIndex] = { id: "", type: "function", function: { name: "", arguments: "" } };
            }
            const streamedToolCall = streamedToolCalls[toolCallIndex];
            streamedToolCall.id = toolCallDelta.id ?? streamedToolCall.id;
            streamedToolCall.function.name += toolCallDelta.function?.name ?? "";
            streamedToolCall.function.arguments += toolCallDelta.function?.arguments ?? "";
        });
    }

    let pendingText = "";
    for await (const bytes of response.body) {
        pendingText += decoder.decode(bytes, { stream: true });
        const lines = pendingText.split("\n");
        // the last line may be cut in the middle, it waits for the next packet
        pendingText = lines.pop();
        lines.forEach(readLine);
    }
    // the last chunk, often the usage one, may arrive without a final line break
    readLine(pendingText + decoder.decode());
    if (streamedToolCalls.length > 0) {
        // a tool without parameters receives no arguments piece, the non-streamed mode gives it "{}"
        streamedToolCalls.forEach(function (streamedToolCall) {
            streamedToolCall.function.arguments = streamedToolCall.function.arguments || "{}";
        });
        streamedChoice.message.tool_calls = streamedToolCalls;
    }
    // a stream cut without finish_reason is a truncated answer, not a whole one
    if (!streamedResponse.error && !streamedChoice.finish_reason) {
        streamedResponse.error = { message: "the stream ended before the model finished its answer" };
    }
    return streamedResponse;
}

function createOpenRouterAdapter(openRouterConfig) {
    const headers = {
        Authorization: `Bearer ${openRouterConfig.apiKey}`,
        "Content-Type": "application/json",
    };
    // Optional ranking headers recommended by OpenRouter.
    if (openRouterConfig.appUrl) headers["HTTP-Referer"] = openRouterConfig.appUrl;
    if (openRouterConfig.appName) headers["X-Title"] = openRouterConfig.appName;

    // onTextDelta receives the text of the answer as it comes; without it, the answer arrives all at once.
    // isPromptCached: the system is sent again unchanged at each turn of an agent loop, Anthropic then reads it from its cache.
    // A generation in a single call does not ask for it: writing the cache costs more than a plain read.
    async function createMessage({ model, system, messages, maxTokens, tools, reasoningEffort, onTextDelta, onReasoningDelta, isPromptCached, abortSignal }, callback) {
        const isStreamed = typeof onTextDelta === "function";
        const idleTimeoutMs = isStreamed ? streamedIdleTimeoutMs : wholeAnswerTimeoutMs;
        const abortController = new AbortController();
        const requestSignal = abortSignal ? AbortSignal.any([abortController.signal, abortSignal]) : abortController.signal;
        let idleTimer = null;
        function restartIdleTimer() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () {
                abortController.abort(new Error(`OpenRouter sent nothing for ${idleTimeoutMs / millisecondsPerMinute} minutes, the request was stopped`));
            }, idleTimeoutMs);
        }
        try {
            const requestedModel = model ?? openRouterConfig.defaultModel;
            // OpenRouter passes cache_control only to Anthropic models, the other providers cache on their own
            const isAnthropicModel = String(requestedModel).startsWith(anthropicModelPrefix);
            const isSystemCached = Boolean(isPromptCached) && isAnthropicModel;
            const requestBody = {
                model: requestedModel,
                max_tokens: maxTokens ?? openRouterConfig.maxTokens,
                messages: toOpenAiMessages(system, messages, isSystemCached),
            };
            // Set only when the caller declares tools: an empty array puts
            // some models in error, and classify/alignment never pass any.
            if (tools && tools.length > 0) {
                requestBody.tools = toOpenAiTools(tools);
            }
            if (reasoningEffort) {
                requestBody.reasoning = { effort: reasoningEffort };
            }
            if (isStreamed) {
                requestBody.stream = true;
            }
            if (isAnthropicModel) {
                requestBody.provider = anthropicProviderRouting;
            }

            restartIdleTimer();
            const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
                method: "POST",
                headers,
                body: JSON.stringify(requestBody),
                signal: requestSignal,
            });

            if (isStreamed && response.ok) {
                const streamedResponse = await readStreamedCompletion(response, onTextDelta, onReasoningDelta, restartIdleTimer);
                const streamError = errorFromOpenRouterBody(streamedResponse);
                if (streamError) {
                    return callback(streamError);
                }
                return callback(null, toAnthropicResponse(streamedResponse));
            }

            // Body read as text in every case: a gateway or a proxy may answer HTML
            // with a 200 status, and `response.json()` then failed on "Unexpected token <", without
            // showing anything of what was really received.
            const rawBody = await response.text();

            if (!response.ok) {
                const error = new Error(`OpenRouter request failed (${response.status}): ${rawBody}`);
                error.status = response.status;
                error.headers = Object.fromEntries(response.headers.entries());
                return callback(error);
            }

            let openRouterResponse;
            try {
                openRouterResponse = JSON.parse(rawBody);
            } catch {
                const error = new Error(`OpenRouter answered ${response.status} with a body that is not JSON: ${rawBody.slice(0, 500)}`);
                error.status = openRouterBodyErrorStatus;
                return callback(error);
            }

            const bodyError = errorFromOpenRouterBody(openRouterResponse);
            if (bodyError) {
                bodyError.headers = Object.fromEntries(response.headers.entries());
                return callback(bodyError);
            }

            callback(null, toAnthropicResponse(openRouterResponse));
        } catch (error) {
            // fetch and the stream reading reject a stop in various forms depending on the moment: the reason given to abort replaces them
            callback(requestSignal.aborted ? requestSignal.reason : error);
        } finally {
            clearTimeout(idleTimer);
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
        return estimateTokens({ system, messages, tools });
    }

    return { complete, createMessage, countTokens };
}

export default createOpenRouterAdapter;
