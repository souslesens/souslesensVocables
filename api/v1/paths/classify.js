import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import llmClient from "../../../bin/AI/llmClient.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const CLASSIFY_PROMPT_PATH = join(currentDirectory, "../../../bin/AI/prompts/classify_tests.md");

export default function () {
    let operations = {
        GET,
    };

    ///// GET api/v1/classify
    async function GET(req, res, _next) {
        try {
            const prompt = readFileSync(CLASSIFY_PROMPT_PATH, "utf8");
            const result = await new Promise((resolve, reject) => {
                llmClient.complete(prompt, {}, (error, completion) => {
                    if (error) return reject(error);
                    resolve(completion);
                });
            });
            const inputTokens = result.usage?.input_tokens ?? 0;
            const outputTokens = result.usage?.output_tokens ?? 0;
            const totalTokens = inputTokens + outputTokens;
            res.status(200).json({
                model: result.model,
                output: result.content?.[0]?.text ?? "",
                usage: result.usage,
                tokensMessage: `Cette tâche a consommé ${totalTokens} tokens (${inputTokens} en entrée + ${outputTokens} en sortie).`,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    GET.apiDoc = {
        summary: "Run the classify_tests prompt through the configured LLM",
        description:
            "Reads the `bin/AI/prompts/classify_tests.md` prompt and sends it to the LLM provider " +
            "selected in `mainConfig.llm` (provider, model and API key). Takes no input. " +
            "Returns the model name, the raw LLM output and the token usage for the call.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getClassify",
        parameters: [],
        responses: {
            200: {
                description: "LLM completion for the classify prompt.",
                schema: {
                    properties: {
                        model: { type: "string" },
                        output: { type: "string" },
                        usage: {
                            type: "object",
                            properties: {
                                input_tokens: { type: "integer" },
                                output_tokens: { type: "integer" },
                            },
                        },
                        tokensMessage: { type: "string" },
                    },
                },
                examples: {
                    "application/json": {
                        model: "anthropic/claude-3.5-sonnet",
                        output: "Hi!",
                        usage: { input_tokens: 12, output_tokens: 3 },
                        tokensMessage: "Cette tâche a consommé 15 tokens (12 en entrée + 3 en sortie).",
                    },
                },
            },
            500: {
                description: "LLM call or prompt read failed.",
                schema: {
                    properties: {
                        error: { type: "string" },
                    },
                },
            },
        },
        tags: ["AI"],
    };

    return operations;
}
