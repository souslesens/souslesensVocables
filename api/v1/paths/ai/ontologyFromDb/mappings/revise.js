import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getNewRunTimestamp } from "../../../../../../bin/AI/ontologyRuns.js";
import { ontologyModelId, ontologyReasoningEffort, jsonBlockRegex } from "../../../../../../bin/AI/ontologyAnswer.js";
import { getMappingInputs, checkMappingAnswer } from "../../../../../../bin/AI/mappingInputs.js";
import { getMappingName, listSourceMappings, saveMappingVersion } from "../../../../../../bin/AI/mappingRuns.js";
import {
    searchUpperOntologiesTool,
    getUpperOntologyTermsTool,
    describeDatabaseTablesTool,
    getUpperOntologyReaders,
    getDatabaseTablesDescriber,
    getReadingToolOutcome,
    runAgentLoop,
} from "../../../../../../bin/AI/revisionAgent.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const revisionPromptPath = join(currentDirectory, "../../../../../../bin/AI/prompts/mapping_revision.md");
const mappingPromptPath = join(currentDirectory, "../../../../../../bin/AI/prompts/mapping_building_from_ontology.md");

// the compact answer keys each item: a resource by its column, a relation by its two ends and its property, a candidate by its description
const itemCollectionByKind = { resource: "resources", relation: "relations", candidate: "candidates" };
const itemKeyByKind = {
    resource: (resource) => resource.table + "." + resource.column,
    relation: (relation) => relation.from + " " + relation.property + " " + relation.to,
    candidate: (candidate) => candidate.description,
};

const revisionTools = [
    searchUpperOntologiesTool,
    getUpperOntologyTermsTool,
    describeDatabaseTablesTool,
    {
        name: "propose_mapping_version",
        description:
            "Save a new mapping version: a copy of the version under discussion with the operations applied, in order. " +
            "set adds or replaces the item of that key with item, a whole object in the format of the mapping rules. remove deletes the item of that key. " +
            "A resource is keyed table.column, a relation 'from property to' as the version writes them, a candidate by its description. " +
            "Refused, with the reasons, when an operation does not apply, when the checks find problems the version under discussion did not have, " +
            "or relations whose property does not allow their two classes, unless acceptProblems is true. The new version is not validated: the ontologist validates it in the plugin.",
        input_schema: {
            type: "object",
            properties: {
                summary: { type: "string", description: "What the new version changes, in one sentence." },
                operations: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            action: { type: "string", enum: ["set", "remove"] },
                            kind: { type: "string", enum: Object.keys(itemCollectionByKind) },
                            key: { type: "string", description: "Key of the item in the version under discussion, or of the new item for a set that adds one." },
                            item: { type: "object", description: "set only: the whole item, its key equal to key." },
                            rationale: { type: "string", description: "The request, the evidence and the mapping rule behind the operation." },
                        },
                        required: ["action", "kind", "key", "rationale"],
                    },
                },
                report: { type: "object", description: "The whole updated report, when the change touches it." },
                acceptProblems: {
                    type: "boolean",
                    description: "Save despite new problems or relations not allowed, only when the ontologist asked for the change knowing them.",
                },
            },
            required: ["summary", "operations"],
        },
    },
];

function applyOperations(baseAnswer, operations) {
    const revisedAnswer = structuredClone(baseAnswer);
    const operationErrors = [];
    operations.forEach(function (operation, operationIndex) {
        const collectionName = itemCollectionByKind[operation.kind];
        if (!collectionName) {
            operationErrors.push("operation " + operationIndex + ": unknown kind " + operation.kind);
            return;
        }
        const getItemKey = itemKeyByKind[operation.kind];
        const items = revisedAnswer[collectionName] || [];
        revisedAnswer[collectionName] = items;
        const itemIndex = items.findIndex((item) => getItemKey(item) == operation.key);
        if (operation.action == "remove") {
            if (itemIndex < 0) {
                operationErrors.push("operation " + operationIndex + ": no " + operation.kind + " " + operation.key + " to remove");
                return;
            }
            items.splice(itemIndex, 1);
            return;
        }
        if (operation.action != "set" || !operation.item) {
            operationErrors.push("operation " + operationIndex + ": a set needs an item, the only actions are set and remove");
            return;
        }
        if (getItemKey(operation.item) != operation.key) {
            operationErrors.push("operation " + operationIndex + ": the item is keyed " + getItemKey(operation.item) + ", not " + operation.key);
            return;
        }
        if (itemIndex < 0) {
            items.push(operation.item);
        } else {
            items[itemIndex] = operation.item;
        }
    });
    return { revisedAnswer: revisedAnswer, operationErrors: operationErrors };
}

// keyed as the compact answer writes them, the key a remove or a set of the relation takes
function getNotAllowedRelationTexts(relationChecks) {
    const notAllowedChecks = (relationChecks || []).filter((relationCheck) => relationCheck.status == "notAllowed");
    return notAllowedChecks.map((relationCheck) => relationCheck.from + " " + (relationCheck.answerProperty ?? relationCheck.property) + " " + relationCheck.to);
}

function getToolOutcome(toolName, toolResult) {
    const readingToolOutcome = getReadingToolOutcome(toolName, toolResult);
    if (readingToolOutcome) {
        return readingToolOutcome;
    }
    if (toolResult.saved) {
        return "mapping version saved";
    }
    const refusalReasons = toolResult.operationErrors || toolResult.newProblems || toolResult.notAllowedRelations;
    return "refused: " + refusalReasons.join("; ");
}

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const requestStart = Date.now();
        // a closed page stops the loop at the next turn, no model call nor version is paid for nobody
        let isRequestClosed = false;
        res.on("close", function () {
            isRequestClosed = true;
        });
        function sendProgress(progressEvent) {
            if (!res.headersSent) {
                res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
                res.flushHeaders();
            }
            res.write(JSON.stringify(progressEvent) + "\n");
        }

        try {
            const conversation = req.body.messages;
            if (!Array.isArray(conversation) || conversation.length == 0 || conversation[conversation.length - 1].role != "user") {
                return res.status(400).json({ error: "messages must be the conversation, ending with a message of the ontologist" });
            }
            const source = req.body.source;
            const inputs = await getMappingInputs(req, source);
            if (inputs.error) {
                return res.status(inputs.status).json({ error: inputs.error });
            }
            const mappingVersions = await listSourceMappings(source);
            const baseVersion = mappingVersions.find((mappingVersion) => mappingVersion.mappingName == req.body.mappingName);
            if (!baseVersion) {
                return res.status(404).json({ error: "no mapping version " + req.body.mappingName + " for " + source });
            }
            // a file edited in MappingModeler, or a generation that failed, has no compact answer: it can be questioned, not revised
            const baseAnswerMatch = baseVersion.savedMapping.answer ? baseVersion.savedMapping.answer.match(jsonBlockRegex) : null;
            let baseAnswer = null;
            try {
                baseAnswer = baseAnswerMatch ? JSON.parse(baseAnswerMatch[1]) : null;
            } catch (_parseError) {
                baseAnswer = null;
            }
            const baseSavedMapping = baseVersion.savedMapping;
            const noAnswerReason =
                baseSavedMapping.kind == "mappingModeler"
                    ? "edited in MappingModeler"
                    : "a generation without readable answer (" + (baseSavedMapping.answerError || baseSavedMapping.failure || "no JSON block") + ")";
            const tableListLines = Object.keys(inputs.columnsByTable).sort();
            const discussedChecks = {
                problems: baseSavedMapping.problems || [],
                rangeWarnings: baseSavedMapping.rangeWarnings || [],
                relationsNotAllowed: getNotAllowedRelationTexts(baseSavedMapping.relationChecks),
            };
            const system =
                readFileSync(revisionPromptPath, "utf8") +
                "\n\n# Mapping rules\n\n" +
                readFileSync(mappingPromptPath, "utf8") +
                "\n\n# Inputs\n\nSource: " +
                source +
                "\nValidated ontology: " +
                inputs.tboxSource +
                ", namespace of its terms " +
                inputs.termNamespace +
                "\nInstance namespace: " +
                inputs.instanceNamespace +
                "\n\n## Validated ontology\n" +
                inputs.validatedModel.text +
                "\n\n# Mapping version under discussion: " +
                baseVersion.mappingName +
                "\n\n" +
                (baseAnswer
                    ? "```json\n" + JSON.stringify(baseAnswer) + "\n```"
                    : "No compact answer, " + noAnswerReason + ": the version can be questioned but not revised. Its MappingModeler document:\n\n```json\n" +
                      JSON.stringify({ nodes: baseSavedMapping.mapping?.nodes ?? [], edges: baseSavedMapping.mapping?.edges ?? [] }) +
                      "\n```") +
                "\n\n# Checks of the version\n\n" +
                JSON.stringify(discussedChecks) +
                "\n\n# Measured overlaps\n\nshared distinct values between left and right, with the distinct values of each\n\n" +
                JSON.stringify(inputs.validatedRun.savedRun.measuredOverlaps || []) +
                "\n\n# Tables of the database " +
                inputs.database.database +
                ", read with describe_database_tables\n\n" +
                tableListLines.join("\n");

            // the version a proposal applies to: the requested one, then each version saved during this request
            let discussedVersion = { mappingName: baseVersion.mappingName, answer: baseAnswer, checks: null };
            const usage = { input_tokens: 0, output_tokens: 0 };

            async function proposeMappingVersion(toolInput) {
                if (!discussedVersion.answer) {
                    return { saved: false, operationErrors: [discussedVersion.mappingName + " is " + noAnswerReason + ": revise a version holding a compact answer"] };
                }
                const operations = toolInput.operations || [];
                if (operations.length == 0 && !toolInput.report) {
                    return { saved: false, operationErrors: ["no operation nor report: the version would be a copy"] };
                }
                const { revisedAnswer, operationErrors } = applyOperations(discussedVersion.answer, operations);
                if (operationErrors.length > 0) {
                    return { saved: false, operationErrors: operationErrors };
                }
                if (toolInput.report) {
                    revisedAnswer.report = toolInput.report;
                }
                // the discussed version is checked again with the same inputs: a validation since its save may have changed what it finds
                if (!discussedVersion.checks) {
                    discussedVersion.checks = await checkMappingAnswer(discussedVersion.answer, inputs, source);
                }
                const revisedChecks = await checkMappingAnswer(revisedAnswer, inputs, source);
                const discussedProblems = discussedVersion.checks.mappingDocument.problems;
                const newProblems = revisedChecks.mappingDocument.problems.filter((problem) => !discussedProblems.includes(problem));
                const discussedNotAllowed = getNotAllowedRelationTexts(discussedVersion.checks.relationChecks);
                const revisedNotAllowed = getNotAllowedRelationTexts(revisedChecks.relationChecks);
                const notAllowedRelations = revisedNotAllowed.filter((relationText) => !discussedNotAllowed.includes(relationText));
                if ((newProblems.length > 0 || notAllowedRelations.length > 0) && !toolInput.acceptProblems) {
                    return newProblems.length > 0 ? { saved: false, newProblems: newProblems } : { saved: false, notAllowedRelations: notAllowedRelations };
                }

                const mappingName = getMappingName(source, getNewRunTimestamp());
                const savedMapping = {
                    source: source,
                    kind: "revision",
                    basedOn: discussedVersion.mappingName,
                    tboxSource: inputs.tboxSource,
                    ontologyRunName: inputs.validatedRun.runName,
                    database: inputs.database.database,
                    databaseId: inputs.database.id,
                    model: ontologyModelId,
                    reasoningEffort: ontologyReasoningEffort,
                    usage: usage,
                    createdAt: new Date().toISOString(),
                    totalSeconds: Math.round((Date.now() - requestStart) / 1000),
                    problems: revisedChecks.mappingDocument.problems,
                    rangeWarnings: revisedChecks.rangeWarnings,
                    relationChecks: revisedChecks.relationChecks,
                    relationCheckError: revisedChecks.relationCheckError,
                    report: revisedAnswer.report ?? null,
                    candidates: revisedAnswer.candidates ?? null,
                    mapping: revisedChecks.mappingDocument.mapping,
                    revision: {
                        summary: toolInput.summary,
                        operations: operations,
                        acceptedProblems: newProblems,
                        acceptedNotAllowedRelations: notAllowedRelations,
                        conversation: conversation,
                    },
                    answer: "```json\n" + JSON.stringify(revisedAnswer, null, 2) + "\n```",
                };
                await saveMappingVersion(baseVersion.databaseFolder, mappingName, savedMapping);
                discussedVersion = { mappingName: mappingName, answer: revisedAnswer, checks: revisedChecks };
                sendProgress({ type: "version", mappingName: mappingName, summary: toolInput.summary });
                return {
                    saved: true,
                    mappingName: mappingName,
                    acceptedProblems: newProblems,
                    acceptedNotAllowedRelations: notAllowedRelations,
                    rangeWarnings: revisedChecks.rangeWarnings,
                    relationCheckError: revisedChecks.relationCheckError,
                };
            }

            // an upper ontology the user lost access to since the generation is left out
            const upperOntologies = (inputs.validatedRun.savedRun.upperOntologies || []).filter((upperOntology) => inputs.found.userSources[upperOntology]);
            const toolFunctionsByName = {
                ...getUpperOntologyReaders(upperOntologies, inputs.userContext, inputs.validatedModel.prefixes),
                describe_database_tables: getDatabaseTablesDescriber(inputs.found.userInfo, inputs.validatedRun.savedRun, inputs.databaseChecks, {
                    database: inputs.database,
                    schema: inputs.schema,
                }),
                propose_mapping_version: proposeMappingVersion,
            };
            const answerText = await runAgentLoop({
                system: system,
                conversation: conversation,
                tools: revisionTools,
                toolFunctionsByName: toolFunctionsByName,
                getToolOutcome: getToolOutcome,
                usage: usage,
                sendProgress: sendProgress,
                isRequestClosed: () => isRequestClosed,
            });
            if (answerText === null) {
                return;
            }
            sendProgress({ type: "answer", text: answerText });
            res.end();
        } catch (error) {
            console.error("ontologyFromDb/mappings/revise route error:", error);
            if (!res.headersSent) {
                return res.status(error.status || 500).json({ error: error.message });
            }
            sendProgress({ type: "error", error: error.message });
            res.end();
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Discuss a mapping version and propose new versions, in natural language",
        description:
            "Runs Claude Opus 5.5, at medium reasoning effort, through OpenRouter, on the conversation of an ontologist about one mapping version of POST /ai/ontologyFromDb/mappings. " +
            "The model reads the `bin/AI/prompts/mapping_revision.md` prompt, the mapping rules, the validated ontology read from its graph, the compact answer of the version and its checks, " +
            "and through a tool the tables of the database. A change is a new mapping version: a copy of the discussed answer with set and remove operations applied, checked as a generation is, " +
            "refused when it brings new problems or relations not allowed. It is not validated: PUT /ai/ontologyFromDb/mappings validates it. " +
            "Answers in NDJSON: toolCall and toolResult events, a version event per new version, then an answer event with the reply, or an error event.",
        operationId: "reviseOntologyFromDbMapping",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "mappingName", "messages"],
                    properties: {
                        source: { type: "string", description: "Source the mapping maps." },
                        mappingName: { type: "string", description: "Mapping version under discussion, as GET /ai/ontologyFromDb/mappings lists it." },
                        messages: {
                            type: "array",
                            description: "The conversation, oldest first, ending with a message of the ontologist.",
                            items: { type: "object", properties: { role: { type: "string", enum: ["user", "assistant"] }, content: { type: "string" } } },
                        },
                    },
                },
            },
        ],
        responses: {
            200: { description: "NDJSON events: toolCall, toolResult, version, answer, error." },
            400: { description: "The conversation does not end with a message of the ontologist." },
            404: { description: "The source or the mapping version is unknown." },
            409: { description: "The source imports no validated version, or its database is no longer configured." },
        },
        tags: ["AI"],
    };

    return operations;
}
