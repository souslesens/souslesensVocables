// Local development only: answers through the `claude -p` CLI of the developer's own login, for
// end-to-end runs without API credits. Never enable it on a server shared with other users.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";

// same heuristic and same ceiling as the OpenRouter adapter
const averageCharsPerToken = 3.5;
const millisecondsPerMinute = 60 * 1000;
const wholeAnswerTimeoutMs = 30 * millisecondsPerMinute;
// would make the CLI bill the API instead of the subscription
const apiBillingVariables = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"];
const cliFailureStatus = 502;

const backendSystemPrompt =
    "You are the model behind the completion endpoint of an application. The user message holds the application's instructions, its tools and the conversation so far. " +
    "Write only the next assistant turn, following those instructions. You have no tool of your own.";
const toolProtocol =
    "Answer with the requested structured output. To call tools, list them in toolCalls, with any text for the user in text. To give your final answer, leave toolCalls empty and put the whole answer in text.";
const assistantTurnSchema = {
    type: "object",
    properties: {
        text: { type: "string" },
        toolCalls: {
            type: "array",
            items: { type: "object", properties: { name: { type: "string" }, input: { type: "object" } }, required: ["name", "input"] },
        },
    },
    required: ["text", "toolCalls"],
};

function estimateTokens({ system, messages, tools }) {
    const serializedRequest = JSON.stringify({ system, messages, tools });
    return Math.ceil(serializedRequest.length / averageCharsPerToken);
}

function contentBlockToText(contentBlock) {
    if (contentBlock.type == "text") {
        return contentBlock.text;
    }
    if (contentBlock.type == "tool_use") {
        return '<tool_call id="' + contentBlock.id + '" name="' + contentBlock.name + '">' + JSON.stringify(contentBlock.input ?? {}) + "</tool_call>";
    }
    if (contentBlock.type == "tool_result") {
        const resultText = typeof contentBlock.content == "string" ? contentBlock.content : JSON.stringify(contentBlock.content ?? "");
        return '<tool_result tool_call_id="' + contentBlock.tool_use_id + '">' + resultText + "</tool_result>";
    }
    return JSON.stringify(contentBlock);
}

// the CLI takes one prompt: the system, the tools and the turns of the conversation are written into it
function toCliPrompt(system, messages, tools) {
    const promptParts = [];
    if (system) {
        promptParts.push("<application_instructions>\n" + system + "\n</application_instructions>");
    }
    if (tools && tools.length > 0) {
        promptParts.push("<available_tools>\n" + JSON.stringify(tools) + "\n</available_tools>\n" + toolProtocol);
    }
    (messages ?? []).forEach(function (message) {
        const contentBlocks = typeof message.content == "string" ? [{ type: "text", text: message.content }] : (message.content ?? []);
        const turnTexts = contentBlocks.map(contentBlockToText);
        promptParts.push('<turn role="' + message.role + '">\n' + turnTexts.join("\n") + "\n</turn>");
    });
    return promptParts.join("\n\n");
}

function toAnthropicResponse(cliResult, isToolTurn, model) {
    const contentBlocks = [];
    let stopReason = cliResult.stop_reason;
    if (isToolTurn) {
        const assistantTurn = cliResult.structured_output ?? { text: cliResult.result ?? "", toolCalls: [] };
        const toolCalls = assistantTurn.toolCalls ?? [];
        if (assistantTurn.text || toolCalls.length == 0) {
            contentBlocks.push({ type: "text", text: assistantTurn.text ?? "" });
        }
        toolCalls.forEach((toolCall) => contentBlocks.push({ type: "tool_use", id: "toolu_" + randomUUID(), name: toolCall.name, input: toolCall.input }));
        // the CLI reports its own internal structured output tool here, never the application's
        if (stopReason != "max_tokens") {
            stopReason = toolCalls.length > 0 ? "tool_use" : "end_turn";
        }
    } else {
        contentBlocks.push({ type: "text", text: cliResult.result ?? "" });
    }
    return {
        id: cliResult.session_id ?? null,
        model: model,
        role: "assistant",
        content: contentBlocks,
        stop_reason: stopReason ?? "end_turn",
        usage: {
            input_tokens: cliResult.usage?.input_tokens ?? 0,
            output_tokens: cliResult.usage?.output_tokens ?? 0,
            cached_input_tokens: cliResult.usage?.cache_read_input_tokens ?? 0,
        },
    };
}

function toCliError(message, status) {
    const error = new Error(message);
    error.status = status ?? cliFailureStatus;
    return error;
}

function createClaudeCodeAdapter(claudeCodeConfig) {
    // `model` is ignored: the callers name OpenRouter ids, which the CLI does not know
    function createMessage({ system, messages, maxTokens, tools, reasoningEffort, onTextDelta, onReasoningDelta, abortSignal }, callback) {
        const isToolTurn = Boolean(tools && tools.length > 0);
        const isStreamed = Boolean(onTextDelta) && !isToolTurn;
        const cliArguments = ["-p", "--output-format", isStreamed ? "stream-json" : "json", "--model", claudeCodeConfig.defaultModel];
        if (isStreamed) {
            // --thinking-display is missing from claude --help; without it the reasoning arrives empty
            cliArguments.push("--verbose", "--include-partial-messages", "--thinking-display", "summarized");
        }
        // no tool, setting, hook, MCP server or skill of the developer's own setup in the answer
        cliArguments.push("--tools", "", "--setting-sources", "", "--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence");
        cliArguments.push("--system-prompt", backendSystemPrompt);
        if (reasoningEffort) {
            cliArguments.push("--effort", reasoningEffort);
        }
        if (isToolTurn) {
            cliArguments.push("--json-schema", JSON.stringify(assistantTurnSchema));
        }

        const cliEnvironment = { ...process.env };
        apiBillingVariables.forEach((variableName) => delete cliEnvironment[variableName]);
        const outputLimit = maxTokens ?? claudeCodeConfig.maxTokens;
        if (outputLimit) {
            cliEnvironment.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(outputLimit);
        }

        // outside the repo, so that its CLAUDE.md stays out of the answer
        const cliProcess = spawn("claude", cliArguments, { cwd: os.tmpdir(), env: cliEnvironment, stdio: ["pipe", "pipe", "pipe"], signal: abortSignal });
        let pendingOutput = "";
        let unreadOutput = "";
        let standardError = "";
        let cliResult = null;
        let isSettled = false;
        const settle = function (error, response) {
            if (isSettled) {
                return;
            }
            isSettled = true;
            clearTimeout(answerTimer);
            callback(error, response);
        };
        const answerTimer = setTimeout(function () {
            cliProcess.kill();
            settle(toCliError("claude -p did not answer within " + wholeAnswerTimeoutMs / millisecondsPerMinute + " minutes, it was stopped"));
        }, wholeAnswerTimeoutMs);

        // both output formats end on the same result object, stream-json sends the deltas before it
        const readOutputLine = function (outputLine) {
            if (!outputLine) {
                return;
            }
            let outputEvent;
            try {
                outputEvent = JSON.parse(outputLine);
            } catch {
                unreadOutput += outputLine;
                return;
            }
            // an exception here would reach no callback: a line of another shape is left aside
            if (outputEvent?.type == "result") {
                cliResult = outputEvent;
            }
            const delta = outputEvent?.type == "stream_event" ? outputEvent.event?.delta : null;
            if (delta?.type == "text_delta") {
                onTextDelta(delta.text);
            } else if (delta?.type == "thinking_delta" && delta.thinking && onReasoningDelta) {
                onReasoningDelta(delta.thinking);
            }
        };

        // a character cut between two chunks would otherwise be silently corrupted
        cliProcess.stdout.setEncoding("utf8");
        cliProcess.stderr.setEncoding("utf8");
        cliProcess.stdout.on("data", function (chunk) {
            const outputLines = (pendingOutput + chunk).split("\n");
            // the last line may be cut in the middle, it waits for the next chunk
            pendingOutput = outputLines.pop();
            outputLines.forEach(readOutputLine);
        });
        cliProcess.stderr.on("data", (chunk) => (standardError += chunk));
        cliProcess.on("error", (spawnError) => settle(toCliError("could not run claude -p: " + spawnError.message)));
        // already reported by the close or error event of the process
        cliProcess.stdin.on("error", () => {});
        cliProcess.on("close", function (exitCode) {
            readOutputLine(pendingOutput);
            if (!cliResult) {
                const exitReason = standardError || unreadOutput || "it gave no reason, run claude -p by hand in the terminal of the server to see why";
                return settle(toCliError("claude -p exited with code " + exitCode + " before finishing its answer: " + exitReason.slice(0, 500)));
            }
            if (cliResult.is_error) {
                // an error of the run itself lists its causes in errors, without any result
                const failureReason = cliResult.result || (cliResult.errors ?? []).join(", ") || cliResult.subtype;
                return settle(toCliError("claude -p failed: " + failureReason, cliResult.api_error_status));
            }
            const response = toAnthropicResponse(cliResult, isToolTurn, claudeCodeConfig.defaultModel);
            const answerText = response.content[0]?.text;
            // a tool turn is not streamed: its text comes out of the structured output
            if (onTextDelta && answerText && !isStreamed) {
                onTextDelta(answerText);
            }
            settle(null, response);
        });
        cliProcess.stdin.end(toCliPrompt(system, messages, tools));
    }

    function complete(prompt, options, callback) {
        return createMessage({ system: options?.system, messages: [{ role: "user", content: prompt }], maxTokens: options?.maxTokens }, callback);
    }

    async function countTokens(tokenCountRequest) {
        return estimateTokens(tokenCountRequest);
    }

    return { complete, createMessage, countTokens };
}

export default createClaudeCodeAdapter;
