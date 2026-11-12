// Local development only: answers through the `codex exec` CLI of the developer's own ChatGPT login, for
// end-to-end runs without API credits. Never enable it on a server shared with other users.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// same heuristic and same ceiling as the OpenRouter adapter
const averageCharsPerToken = 3.5;
const millisecondsPerMinute = 60 * 1000;
const wholeAnswerTimeoutMs = 30 * millisecondsPerMinute;
// would make the CLI bill the API instead of the subscription
const apiBillingVariables = ["CODEX_API_KEY", "OPENAI_API_KEY"];
const cliFailureStatus = 502;
const maxExitReasonLength = 500;
// the callers name OpenRouter ids, unknown to the CLI: the ones listed run on their Codex equivalent, the others on defaultModel
const cliModelByOpenRouterId = {
    "openai/gpt-6.1-sol": "gpt-6.1-sol",
    "openai/gpt-5.6-luna": "gpt-5.6-luna",
    "anthropic/claude-haiku-5.5": "gpt-6-luna",
    "anthropic/claude-opus-5.5": "gpt-6.1-sol",
};
// the lowest effort the Codex models share is low
const cliEffortByReasoningEffort = { none: "low" };

const backendSystemPrompt =
    "You are the model behind the completion endpoint of an application. The user message holds the application's instructions, its tools and the conversation so far. " +
    "Write only the next assistant turn, following those instructions. Never run a command, read a file or search the web.";
const toolProtocol =
    "Answer with the requested structured output. To call tools, list them in toolCalls, each with its input as a JSON object serialized in inputJson, with any text for the user in text. " +
    "To give your final answer, leave toolCalls empty and put the whole answer in text.";
// a strict structured output accepts no free-form object: the tool input travels as a JSON string
const assistantTurnSchema = {
    type: "object",
    properties: {
        text: { type: "string" },
        toolCalls: {
            type: "array",
            items: {
                type: "object",
                properties: { name: { type: "string" }, inputJson: { type: "string" } },
                required: ["name", "inputJson"],
                additionalProperties: false,
            },
        },
    },
    required: ["text", "toolCalls"],
    additionalProperties: false,
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

function toCliError(message, status) {
    const error = new Error(message);
    error.status = status ?? cliFailureStatus;
    return error;
}

function parseJsonObject(jsonText) {
    try {
        const parsedValue = JSON.parse(jsonText);
        const isPlainObject = parsedValue !== null && typeof parsedValue == "object" && !Array.isArray(parsedValue);
        return isPlainObject ? parsedValue : null;
    } catch {
        return null;
    }
}

// a tool turn answers JSON in its agent message; an unreadable one is kept as plain text, without tool call
function readAssistantTurn(answerText) {
    const assistantTurn = parseJsonObject(answerText) ?? { text: answerText, toolCalls: [] };
    const toolCalls = Array.isArray(assistantTurn.toolCalls) ? assistantTurn.toolCalls : [];
    const parsedToolCalls = toolCalls.map((toolCall) => ({ name: toolCall.name, input: parseJsonObject(toolCall.inputJson || "{}") }));
    return { text: assistantTurn.text ?? "", toolCalls: parsedToolCalls };
}

function toAnthropicResponse(answerText, assistantTurn, usage, model) {
    const contentBlocks = [];
    let stopReason = "end_turn";
    if (assistantTurn) {
        if (assistantTurn.text || assistantTurn.toolCalls.length == 0) {
            contentBlocks.push({ type: "text", text: assistantTurn.text });
        }
        assistantTurn.toolCalls.forEach((toolCall) => contentBlocks.push({ type: "tool_use", id: "toolu_" + randomUUID(), name: toolCall.name, input: toolCall.input }));
        if (assistantTurn.toolCalls.length > 0) {
            stopReason = "tool_use";
        }
    } else {
        contentBlocks.push({ type: "text", text: answerText });
    }
    return {
        id: null,
        model: model,
        role: "assistant",
        content: contentBlocks,
        stop_reason: stopReason,
        usage: {
            input_tokens: usage?.input_tokens ?? 0,
            output_tokens: usage?.output_tokens ?? 0,
            cached_input_tokens: usage?.cached_input_tokens ?? 0,
        },
    };
}

function createCodexAdapter(codexConfig) {
    function createMessage({ system, messages, model, tools, reasoningEffort, onTextDelta, onReasoningDelta, abortSignal }, callback) {
        const isToolTurn = Boolean(tools && tools.length > 0);
        const cliModel = cliModelByOpenRouterId[model] ?? codexConfig.defaultModel;
        // the prompt is read from stdin
        const cliArguments = ["exec", "-", "--json", "--model", cliModel, "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only"];
        // no setting, rule, AGENTS.md or web search of the developer's own setup in the answer
        cliArguments.push("--ignore-user-config", "--ignore-rules", "-c", "project_doc_max_bytes=0", "-c", 'web_search="disabled"');
        // the model keeps no tool able to read the machine: the prompt carries database content and user text
        cliArguments.push("--disable", "shell_tool", "--disable", "view_image");
        cliArguments.push("-c", "developer_instructions=" + JSON.stringify(backendSystemPrompt));
        if (reasoningEffort) {
            cliArguments.push("-c", "model_reasoning_effort=" + JSON.stringify(cliEffortByReasoningEffort[reasoningEffort] ?? reasoningEffort));
        }
        // --output-schema reads a file: one per call, removed once the CLI exits
        const assistantTurnSchemaPath = isToolTurn ? path.join(os.tmpdir(), "sls-codex-assistant-turn-schema-" + randomUUID() + ".json") : null;
        if (assistantTurnSchemaPath) {
            fs.writeFileSync(assistantTurnSchemaPath, JSON.stringify(assistantTurnSchema));
            cliArguments.push("--output-schema", assistantTurnSchemaPath);
        }

        const cliEnvironment = { ...process.env };
        apiBillingVariables.forEach((variableName) => delete cliEnvironment[variableName]);

        // outside the repo, so that its AGENTS.md and its files stay out of the answer
        // an npm install on Windows leaves only codex.cmd on the PATH, which spawn cannot run: cliPath names the codex.exe
        const cliProcess = spawn(codexConfig.cliPath ?? "codex", cliArguments, { cwd: os.tmpdir(), env: cliEnvironment, stdio: ["pipe", "pipe", "pipe"], signal: abortSignal });
        let pendingOutput = "";
        let unreadOutput = "";
        let standardError = "";
        let answerText = null;
        let turnUsage = null;
        let failureMessage = null;
        let isSettled = false;
        const settle = function (error, response) {
            if (isSettled) {
                return;
            }
            isSettled = true;
            clearTimeout(answerTimer);
            if (assistantTurnSchemaPath) {
                fs.rm(assistantTurnSchemaPath, { force: true }, () => {});
            }
            callback(error, response);
        };
        const answerTimer = setTimeout(function () {
            cliProcess.kill();
            settle(toCliError("codex exec did not answer within " + wholeAnswerTimeoutMs / millisecondsPerMinute + " minutes, it was stopped"));
        }, wholeAnswerTimeoutMs);

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
            const completedItem = outputEvent?.type == "item.completed" ? outputEvent.item : null;
            if (completedItem?.type == "agent_message") {
                answerText = completedItem.text ?? "";
            } else if (completedItem?.type == "reasoning" && completedItem.text && onReasoningDelta) {
                onReasoningDelta(completedItem.text);
            } else if (completedItem?.type == "error") {
                failureMessage = completedItem.message;
            } else if (outputEvent?.type == "turn.completed") {
                turnUsage = outputEvent.usage;
            } else if (outputEvent?.type == "turn.failed") {
                failureMessage = outputEvent.error?.message;
            } else if (outputEvent?.type == "error") {
                // also sent for a reconnection the CLI recovers from: it only counts if no answer follows
                failureMessage = outputEvent.message;
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
        cliProcess.on("error", (spawnError) => settle(toCliError("could not run codex exec, check llm.codex.cliPath in mainConfig.json: " + spawnError.message)));
        // already reported by the close or error event of the process
        cliProcess.stdin.on("error", () => {});
        cliProcess.on("close", function (exitCode) {
            readOutputLine(pendingOutput);
            if (answerText === null || !turnUsage) {
                const exitReason = failureMessage || standardError || unreadOutput || "it gave no reason, run codex exec by hand in the terminal of the server to see why";
                return settle(toCliError("codex exec exited with code " + exitCode + " before finishing its answer: " + exitReason.slice(0, maxExitReasonLength)));
            }
            const assistantTurn = isToolTurn ? readAssistantTurn(answerText) : null;
            const toolCallWithUnreadableInput = assistantTurn?.toolCalls.find((toolCall) => !toolCall.input);
            if (toolCallWithUnreadableInput) {
                return settle(toCliError("codex exec called the tool " + toolCallWithUnreadableInput.name + " with an input that is not a JSON object"));
            }
            const response = toAnthropicResponse(answerText, assistantTurn, turnUsage, cliModel);
            const responseText = response.content[0]?.text;
            // the CLI streams no text delta: the whole answer comes at once
            if (onTextDelta && responseText) {
                onTextDelta(responseText);
            }
            settle(null, response);
        });
        cliProcess.stdin.end(toCliPrompt(system, messages, tools));
    }

    function complete(prompt, options, callback) {
        return createMessage({ system: options?.system, messages: [{ role: "user", content: prompt }] }, callback);
    }

    async function countTokens(tokenCountRequest) {
        return estimateTokens(tokenCountRequest);
    }

    return { complete, createMessage, countTokens };
}

export default createCodexAdapter;
