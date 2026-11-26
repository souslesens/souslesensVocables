// Local development only: answers through the `opencode run` CLI of the developer's own OpenCode
// login, for end-to-end runs without API credits. Never enable it on a server shared with other users.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";

// same heuristic and same ceiling as the OpenRouter adapter
const averageCharsPerToken = 3.5;
const millisecondsPerMinute = 60 * 1000;
const wholeAnswerTimeoutMs = 30 * millisecondsPerMinute;
const cliFailureStatus = 502;
// the callers name OpenRouter ids, unknown to the CLI: the ones listed run on their opencode-go
// equivalent, the others on defaultModel; the equivalents are measured on JSON answers and latency,
// see the master data devinette run
const cliModelByOpenRouterId = { "openai/gpt-5.6-luna": "opencode-go/minimax-m3.1-flash", "openai/gpt-6.1-sol": "opencode-go/kimi-k3.1-pro" };
// the completion agent of the user's OpenCode config: no tool of its own, no default agent prompt
const defaultAgentName = "slsBackend";

const backendSystemPrompt =
    "You are the model behind the completion endpoint of an application. The user message holds the application's instructions, its tools and the conversation so far. " +
    "Write only the next assistant turn, following those instructions. You have no tool of your own.";
const toolProtocol =
    'Answer with one JSON object and nothing else: {"text":"...","toolCalls":[{"name":"...","input":{...}}]}. To call tools, list them in toolCalls, with any text for the user in text. To give your final answer, leave toolCalls empty and put the whole answer in text.';
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
        promptParts.push(
            "<available_tools>\n" + JSON.stringify(tools) + "\n</available_tools>\n" + toolProtocol + "\nThe JSON object to answer is of this shape: " + JSON.stringify(assistantTurnSchema),
        );
    }
    (messages ?? []).forEach(function (message) {
        const contentBlocks = typeof message.content == "string" ? [{ type: "text", text: message.content }] : (message.content ?? []);
        const turnTexts = contentBlocks.map(contentBlockToText);
        promptParts.push('<turn role="' + message.role + '">\n' + turnTexts.join("\n") + "\n</turn>");
    });
    return promptParts.join("\n\n");
}

// the JSON object of the tool protocol, read out of the answer text of the model; null when it wrote none
function readStructuredTurn(answerText) {
    const jsonObjectMatch = answerText.match(/\{[\s\S]*\}/);
    if (!jsonObjectMatch) {
        return null;
    }
    try {
        return JSON.parse(jsonObjectMatch[0]);
    } catch {
        return null;
    }
}

function toAnthropicResponse(cliAnswer, tokens, stopReason, isToolTurn, model) {
    const contentBlocks = [];
    let answerStopReason = stopReason;
    if (isToolTurn) {
        const structuredTurn = readStructuredTurn(cliAnswer) ?? { text: cliAnswer, toolCalls: [] };
        const toolCalls = structuredTurn.toolCalls ?? [];
        if (structuredTurn.text || toolCalls.length == 0) {
            contentBlocks.push({ type: "text", text: structuredTurn.text ?? "" });
        }
        toolCalls.forEach((toolCall) => contentBlocks.push({ type: "tool_use", id: "toolu_" + randomUUID(), name: toolCall.name, input: toolCall.input }));
        if (answerStopReason != "max_tokens") {
            answerStopReason = toolCalls.length > 0 ? "tool_use" : "end_turn";
        }
    } else {
        contentBlocks.push({ type: "text", text: cliAnswer });
    }
    return {
        id: null,
        model: model,
        role: "assistant",
        content: contentBlocks,
        stop_reason: answerStopReason ?? "end_turn",
        usage: {
            input_tokens: tokens.input,
            output_tokens: tokens.output,
            cached_input_tokens: tokens.cachedInput,
        },
    };
}

function toCliError(message, status) {
    const error = new Error(message);
    error.status = status ?? cliFailureStatus;
    return error;
}

// the session variables of the developer's own agent sessions stay out of the CLI
const sessionVariablePrefixes = ["OPENCODE_", "CLAUDE_"];

function cliEnvironment() {
    const environment = { ...process.env };
    Object.keys(environment).forEach((variableName) => {
        if (sessionVariablePrefixes.some((prefix) => variableName.startsWith(prefix))) {
            delete environment[variableName];
        }
    });
    return environment;
}

function createOpenCodeAdapter(openCodeConfig) {
    function createMessage({ system, messages, model, tools, onTextDelta, abortSignal }, callback) {
        const isToolTurn = Boolean(tools && tools.length > 0);
        const cliModel = cliModelByOpenRouterId[model] ?? openCodeConfig.defaultModel;
        const cliArguments = ["run", "--format", "json", "--archived", "--agent", openCodeConfig.agentName ?? defaultAgentName, "--model", cliModel];

        const cliProcess = spawn(openCodeConfig.cliPath ?? "opencode", cliArguments, { cwd: os.tmpdir(), env: cliEnvironment(), stdio: ["pipe", "pipe", "pipe"], signal: abortSignal });
        let pendingOutput = "";
        let unreadOutput = "";
        let standardError = "";
        let answerText = "";
        const tokens = { input: 0, output: 0, cachedInput: 0 };
        let stopReason = null;
        let error = null;
        let isSettled = false;
        const settle = function (settledError, response) {
            if (isSettled) {
                return;
            }
            isSettled = true;
            clearTimeout(answerTimer);
            callback(settledError, response);
        };
        const answerTimer = setTimeout(function () {
            cliProcess.kill();
            settle(toCliError("opencode run did not answer within " + wholeAnswerTimeoutMs / millisecondsPerMinute + " minutes, it was stopped"));
        }, wholeAnswerTimeoutMs);

        // the json format emits one event per line: text parts of the answer, token counts of every step, errors
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
            if (outputEvent?.type == "error") {
                error = outputEvent.error?.message ?? JSON.stringify(outputEvent.error ?? outputEvent);
            }
            const part = outputEvent?.part;
            if (part?.type == "text") {
                answerText += part.text ?? "";
                // a tool turn answers the JSON object of the tool protocol: only its text is for the user
                if (onTextDelta) {
                    const partText = part.text ?? "";
                    onTextDelta(isToolTurn ? (readStructuredTurn(partText)?.text ?? partText) : partText);
                }
            }
            if (part?.type == "step-finish") {
                tokens.input += part.tokens?.input ?? 0;
                tokens.output += part.tokens?.output ?? 0;
                tokens.cachedInput += part.tokens?.cache?.read ?? 0;
                stopReason = part.reason ?? stopReason;
            }
        };

        let onTextDeltaCallback = null;
        let argumentsCalledWithOnTextDelta = false;
        const setCallbacks = function (onTextDelta) {
            argumentsCalledWithOnTextDelta = Boolean(onTextDelta);
            onTextDeltaCallback = onTextDelta ?? (() => {});
        };
        setCallbacks(arguments[0]?.onTextDelta);

        cliProcess.stdout.setEncoding("utf8");
        cliProcess.stderr.setEncoding("utf8");
        cliProcess.stdout.on("data", function (chunk) {
            const outputLines = (pendingOutput + chunk).split("\n");
            pendingOutput = outputLines.pop();
            outputLines.forEach(readOutputLine);
        });
        cliProcess.stderr.on("data", (chunk) => (standardError += chunk));
        cliProcess.on("error", (spawnError) => settle(toCliError("could not run opencode: " + spawnError.message)));
        cliProcess.stdin.on("error", () => {});
        cliProcess.on("close", function (exitCode) {
            readOutputLine(pendingOutput);
            if (error) {
                return settle(toCliError("opencode run failed: " + error));
            }
            if (exitCode !== 0) {
                const exitReason = standardError || unreadOutput || "it gave no reason, run opencode run by hand in the terminal of the server to see why";
                return settle(toCliError("opencode exited with code " + exitCode + " before finishing its answer: " + exitReason.slice(0, 500)));
            }
            const response = toAnthropicResponse(answerText, tokens, stopReason, isToolTurn, cliModel);
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

export default createOpenCodeAdapter;
