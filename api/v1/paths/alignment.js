import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import llmClient from "../../../bin/AI/llmClient.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const SEMANTIC_ALIGNMENT_PROMPT_PATH = join(currentDirectory, "../../../bin/AI/prompts/semantic_alignment_prompt.md");

// Output upper bound: a JSON entry per non-exact row, so we need generous room.
const DEFAULT_MAX_TOKENS = 8000;
// The five canonical categories the prompt asks the LLM to choose from.
const CATEGORIES = ["Exact match AI", "SubclassOf", "SubclassOf inverse", "Not match", "Unknown"];

/**
 * Maps any LLM-returned category string to one of the canonical categories (or "Other").
 * @param {string} category - Raw category from the LLM.
 * @returns {string} A canonical category name or "Other".
 */
function normalizeCategory(category) {
    if (!category) {
        return "Other";
    }
    const normalized = String(category).trim().toLowerCase();
    if (normalized === "exact match ai") {
        return "Exact match AI";
    }
    if (normalized === "subclassof") {
        return "SubclassOf";
    }
    if (normalized === "subclassof inverse") {
        return "SubclassOf inverse";
    }
    if (normalized === "not match") {
        return "Not match";
    }
    if (normalized === "unknown") {
        return "Unknown";
    }
    return "Other";
}

/**
 * Counts how many classifications fall into each canonical category.
 * @param {Array} classifications - Array of { category }.
 * @returns {Object} A map category -> count (including "Other").
 */
function countCategories(classifications) {
    const counts = {};
    CATEGORIES.forEach(function (category) {
        counts[category] = 0;
    });
    counts["Other"] = 0;
    classifications.forEach(function (item) {
        const category = normalizeCategory(item.category);
        counts[category] += 1;
    });
    return counts;
}

/**
 * Builds the full LLM prompt: the semantic-alignment instructions plus the two input tables
 * (non-exacts to classify + definitions table), and an explicit JSON output contract.
 * @param {string} basePrompt - Contents of semantic_alignment_prompt.md.
 * @param {Array} nonExacts - Non-exact pairs ({ srcLabel, tgtLabel, ... }).
 * @param {Object} definitions - { from: [{label,definition}], target: [{label,definition}] }.
 * @returns {string} The complete prompt.
 */
function buildAlignmentPrompt(basePrompt, nonExacts, definitions) {
    const rows = nonExacts.map(function (pair) {
        return { srcLabel: pair.srcLabel, tgtLabel: pair.tgtLabel };
    });
    let fromDefs = [];
    let targetDefs = [];
    if (definitions && definitions.from) {
        fromDefs = definitions.from.map(function (d) {
            return { label: d.label, definition: d.definition };
        });
    }
    if (definitions && definitions.target) {
        targetDefs = definitions.target.map(function (d) {
            return { label: d.label, definition: d.definition };
        });
    }
    let prompt = basePrompt;
    prompt += "\n\n---\n\n## Input data\n\n";
    prompt += "### Non-exact matches to classify (process every row, keep this exact order)\n";
    prompt += "```json\n" + JSON.stringify(rows) + "\n```\n\n";
    prompt += "### Definitions table (look up each label's definition here)\n";
    prompt += "```json\n" + JSON.stringify({ source_from: fromDefs, target: targetDefs }) + "\n```\n\n";
    prompt += "## Required output\n";
    prompt += "Return ONLY a JSON array, one object per non-exact row, in the same order, with EXACTLY this shape:\n";
    prompt += '[{"srcLabel":"...","tgtLabel":"...","category":"Exact match AI|SubclassOf|SubclassOf inverse|Not match|Unknown","reason":"..."}]\n';
    prompt += "Do not output any text, explanation or markdown fences outside the JSON array.\n";
    return prompt;
}

/**
 * Extracts and parses the JSON array from the LLM raw output (tolerates code fences / surrounding text).
 * @param {string} rawText - The LLM raw output.
 * @returns {Array} The parsed classifications.
 */
function parseClassifications(rawText) {
    let text = String(rawText == null ? "" : rawText).trim();
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
        throw new Error("LLM output does not contain a JSON array");
    }
    const jsonSlice = text.slice(firstBracket, lastBracket + 1);
    return JSON.parse(jsonSlice);
}

export default function () {
    let operations = {
        POST,
    };

    ///// POST api/v1/alignment
    // Runs the semantic-alignment classification (AI treatment) over the supplied non-exact pairs,
    // using the definitions table as context. The LLM provider and model come from mainConfig.llm
    // (single configured model — no per-call model selection).
    async function POST(req, res, _next) {
        try {
            const body = req.body || {};
            const nonExacts = body.nonExacts || [];
            const definitions = body.definitions || { from: [], target: [] };
            let maxTokens = body.maxTokens;
            if (!maxTokens) {
                maxTokens = DEFAULT_MAX_TOKENS;
            }
            if (!Array.isArray(nonExacts) || nonExacts.length === 0) {
                return res.status(400).json({ error: "missing or empty 'nonExacts'" });
            }

            const basePrompt = readFileSync(SEMANTIC_ALIGNMENT_PROMPT_PATH, "utf8");
            const prompt = buildAlignmentPrompt(basePrompt, nonExacts, definitions);

            const options = { maxTokens: maxTokens };

            const result = await new Promise((resolve, reject) => {
                llmClient.complete(prompt, options, (error, completion) => {
                    if (error) return reject(error);
                    resolve(completion);
                });
            });

            const rawText = result.content?.[0]?.text ?? "";
            let classifications = [];
            let parseError = null;
            try {
                classifications = parseClassifications(rawText);
            } catch (error) {
                parseError = error.message;
            }
            const counts = countCategories(classifications);
            const inputTokens = result.usage?.input_tokens ?? 0;
            const outputTokens = result.usage?.output_tokens ?? 0;

            const response = {
                model: result.model,
                counts: counts,
                classifications: classifications,
                usage: { input_tokens: inputTokens, output_tokens: outputTokens },
            };
            if (parseError) {
                response.parseError = parseError;
                response.rawOutput = rawText;
            }
            res.status(200).json(response);
        } catch (error) {
            console.error("alignment route error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        summary: "Classify non-exact label matches (AI treatment) via the configured LLM",
        description:
            "Runs the `bin/AI/prompts/semantic_alignment_prompt.md` prompt over the supplied non-exact pairs, " +
            "using the definitions table as context, and asks the LLM to assign one of: Exact match AI, SubclassOf, " +
            "SubclassOf inverse, Not match, Unknown. Provider and model come from `mainConfig.llm`. " +
            "Returns the classifications, per-category counts and token usage.",
        security: [],
        operationId: "postAlignment",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["nonExacts"],
                    properties: {
                        nonExacts: {
                            type: "array",
                            description: "Non-exact pairs to classify.",
                            items: {
                                type: "object",
                                properties: {
                                    srcLabel: { type: "string" },
                                    tgtLabel: { type: "string" },
                                },
                            },
                        },
                        definitions: {
                            type: "object",
                            description: "Definitions table for the source-from and target classes.",
                            properties: {
                                from: { type: "array", items: { type: "object" } },
                                target: { type: "array", items: { type: "object" } },
                            },
                        },
                        maxTokens: { type: "integer", description: "Optional max output tokens." },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Classifications, per-category counts and token usage.",
                schema: {
                    type: "object",
                    properties: {
                        model: { type: "string" },
                        counts: { type: "object" },
                        classifications: { type: "array", items: { type: "object" } },
                        usage: {
                            type: "object",
                            properties: {
                                input_tokens: { type: "integer" },
                                output_tokens: { type: "integer" },
                            },
                        },
                    },
                },
            },
            400: { description: "Missing or empty nonExacts." },
            500: { description: "LLM call or prompt read failed." },
        },
        tags: ["AI"],
    };

    return operations;
}
