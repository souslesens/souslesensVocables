import userManager from "../../../../bin/user.js";
import llmClient from "../../../../bin/AI/llmClient.js";
import { readMainConfig } from "../../../../model/config.js";
import { sourceModel } from "../../../../model/sources.js";
import { getSourceDescriptionPrompt } from "../../../../bin/AI/sourceDescription.js";

const jsonBlockRegex = /```json\s*([\s\S]*?)```/;
const answerExcerptLength = 200;
// the middle tier, run on sonnet by the claudeCode provider: 6 s on CFIHOS-IOF against 34 s for opus at default effort, for a description of the same quality
const sourceDescriptionModel = "openai/gpt-6.1-terra";
const sourceDescriptionReasoningEffort = "medium";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            if (!readMainConfig().llm?.provider) {
                return res.status(501).json({ error: "No LLM provider configured. Add an `llm` block to config/mainConfig.json." });
            }
            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);
            const source = req.query.source;
            if (!userSources[source]) {
                return res.status(404).json({ error: source + " not found" });
            }
            const prompt = await getSourceDescriptionPrompt(source, req.query.lang, { user: userInfo, userSources: userSources });
            if (!prompt) {
                return res.status(404).json({ error: "no ontology model for " + source });
            }
            const request = { messages: [{ role: "user", content: prompt }], model: sourceDescriptionModel, reasoningEffort: sourceDescriptionReasoningEffort };
            llmClient.createMessage(request, function (error, completion) {
                if (error) {
                    console.warn("[ai/sourceDescription] " + error.message);
                    return res.status(502).json({ error: error.message });
                }
                const answerText = completion.content?.[0]?.text ?? "";
                const jsonBlockMatch = answerText.match(jsonBlockRegex);
                let description = null;
                try {
                    description = JSON.parse(jsonBlockMatch ? jsonBlockMatch[1] : answerText).description;
                } catch {
                    description = null;
                }
                if (!description) {
                    const answerExcerpt = answerText.slice(0, answerExcerptLength);
                    return res.status(502).json({ error: "The LLM answer holds no description: " + answerExcerpt });
                }
                return res.status(200).json({ description: description });
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message || String(error) });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Have the LLM write the description of a source",
        description:
            "Fills the `bin/AI/prompts/source_description.md` prompt for `source` (its enriched ontology model as text, compacted when large, " +
            "whether its graph holds individuals and the descriptions of the sources sharing one of its imports, never its own) and sends it " +
            "to the configured LLM provider. Returns the description, the text `sls_ontology_summary` reads to pick a source. Writes nothing: " +
            "the caller saves it as `dcterms:description` through POST /rdf/graph/metadata.",
        operationId: "aiSourceDescription",
        parameters: [
            { name: "source", in: "query", type: "string", required: true, description: "Source name. Example: `IOF-CORE-2026`." },
            { name: "lang", in: "query", type: "string", required: false, enum: ["en", "fr"], description: "Language of the description, English when omitted." },
        ],
        responses: {
            200: {
                description: "The description written by the LLM.",
                schema: {
                    type: "object",
                    properties: { description: { type: "string" } },
                    example: { description: "Describes manufacturing through the roles material things take on in the planned processes of a company..." },
                },
            },
            404: { description: "Source unknown to the caller, or without ontology model." },
            501: { description: "No LLM provider configured." },
            502: { description: "The LLM provider failed, or its answer held no description." },
        },
        tags: ["AI"],
    };

    return operations;
}
