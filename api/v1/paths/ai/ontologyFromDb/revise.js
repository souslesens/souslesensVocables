import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { findSourceRun, readSourceRun, readDatabaseChecks, getDraftGraphUri, runningGenerations, updateGraphTriples } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { getTermNamespace, getAnswerTurtle } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyAnswer.js";
import {
    searchUpperOntologiesTool,
    getUpperOntologyTermsTool,
    describeDatabaseTablesTool,
    getUpperOntologyReaders,
    getDatabaseTablesDescriber,
    getReadingToolOutcome,
    runAgentLoop,
} from "../../../../../bin/AI/ontologyFromDb/revision/revisionAgent.js";
import { getTurtleRestrictions, getRestrictionKey, getNotAllowedRestrictionText } from "../../../../../bin/AI/ontologyFromDb/ontology/restrictionCheck.js";
import { readDraftTriples, getGraphAnswer, getGraphChange, updateGraphCheck } from "../../../../../bin/AI/ontologyFromDb/ontology/draftGraph.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const revisionPromptPath = join(currentDirectory, "../../../../../bin/AI/ontologyFromDb/prompts/ontology_revision.md");
const ontologyBuildingPromptPath = join(currentDirectory, "../../../../../bin/AI/ontologyFromDb/prompts/ontology_building_from_db.md");
const schemaOnlyPromptPath = join(currentDirectory, "../../../../../bin/AI/ontologyFromDb/prompts/ontology_schema_only.md");

// a term of the answer is named by its label: these fields hold the label of another term
const termCollectionByKind = { class: "classes", individual: "individuals", group: "groups" };

const revisionTools = [
    searchUpperOntologiesTool,
    getUpperOntologyTermsTool,
    describeDatabaseTablesTool,
    {
        name: "apply_change",
        description:
            "Change the ontology: the operations are applied in order, and only the triples they touch are written. " +
            "set adds or replaces the term of that label with term, a whole object in the answer format of the building rules. " +
            "remove deletes the term of that label. rename changes its label and every reference to the old label: parents, restriction targets, individual types, group members. " +
            "Refused, and nothing changes, with the reasons, when an operation does not apply, when the Turtle meets problems the ontology did not have, " +
            "or when a restriction it brings uses a property whose domain or range in the upper ontologies does not fit its class or its target.",
        input_schema: {
            type: "object",
            properties: {
                summary: { type: "string", description: "What the change does, in one sentence." },
                operations: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            action: { type: "string", enum: ["set", "remove", "rename"] },
                            kind: { type: "string", enum: Object.keys(termCollectionByKind) },
                            label: { type: "string", description: "Label of the term in the ontology, or of the new term for a set that adds one." },
                            newLabel: { type: "string", description: "rename only." },
                            term: { type: "object", description: "set only: the whole term, its label equal to label." },
                            rationale: { type: "string", description: "The request, the evidence and the building rule behind the operation." },
                        },
                        required: ["action", "kind", "label", "rationale"],
                    },
                },
                report: { type: "object", description: "The whole updated report, when the change touches it." },
                ontologyComment: { type: "string", description: "Only when the business the ontology covers changes." },
            },
            required: ["summary", "operations"],
        },
    },
];

// a label names one term whatever its kind: getAnswerTurtle reports two terms sharing one
function renameReferences(ontologyAnswer, oldLabel, newLabel) {
    const renamedLabel = (reference) => (reference == oldLabel ? newLabel : reference);
    (ontologyAnswer.classes || []).forEach(function (ontologyClass) {
        ontologyClass.parent = Array.isArray(ontologyClass.parent) ? ontologyClass.parent.map(renamedLabel) : renamedLabel(ontologyClass.parent);
        (ontologyClass.restrictions || []).forEach(function (restriction) {
            restriction.target = renamedLabel(restriction.target);
        });
    });
    (ontologyAnswer.individuals || []).forEach(function (individual) {
        individual.type = renamedLabel(individual.type);
    });
    (ontologyAnswer.groups || []).forEach(function (group) {
        group.members = (group.members || []).map(renamedLabel);
    });
}

// the operations on a copy of the answer; an operation that does not apply is reported, never skipped
function applyOperations(baseAnswer, operations) {
    const revisedAnswer = structuredClone(baseAnswer);
    const operationErrors = [];
    operations.forEach(function (operation, operationIndex) {
        const collectionName = termCollectionByKind[operation.kind];
        if (!collectionName) {
            operationErrors.push("operation " + operationIndex + ": unknown kind " + operation.kind);
            return;
        }
        if (!revisedAnswer[collectionName]) {
            revisedAnswer[collectionName] = [];
        }
        const terms = revisedAnswer[collectionName];
        const termIndex = terms.findIndex((term) => term.label == operation.label);
        if (operation.action == "set") {
            if (!operation.term || operation.term.label != operation.label) {
                operationErrors.push("operation " + operationIndex + ": set needs a term whose label is " + operation.label);
                return;
            }
            if (termIndex < 0) {
                terms.push(operation.term);
            } else {
                terms[termIndex] = operation.term;
            }
            return;
        }
        if (termIndex < 0) {
            operationErrors.push("operation " + operationIndex + ": no " + operation.kind + " labelled " + operation.label);
            return;
        }
        if (operation.action == "remove") {
            terms.splice(termIndex, 1);
            return;
        }
        if (operation.action != "rename" || !operation.newLabel) {
            operationErrors.push("operation " + operationIndex + ": " + operation.action + " is not set, remove nor rename with a newLabel");
            return;
        }
        terms[termIndex].label = operation.newLabel;
        renameReferences(revisedAnswer, operation.label, operation.newLabel);
    });
    return { revisedAnswer: revisedAnswer, operationErrors: operationErrors };
}

// the line the page writes under a tool call
function getToolOutcome(toolName, toolResult) {
    const readingToolOutcome = getReadingToolOutcome(toolName, toolResult);
    if (readingToolOutcome) {
        return readingToolOutcome;
    }
    if (toolResult.saved) {
        return "change applied";
    }
    const refusalReasons = toolResult.operationErrors || toolResult.newProblems || toolResult.notAllowedRestrictions;
    return "refused: " + refusalReasons.join("; ");
}

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        // a closed page stops the loop at the next turn, no model call nor change is paid for nobody
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
            const runContext = await findSourceRun(req, source);
            if (runContext.error) {
                return res.status(runContext.status).json({ error: runContext.error });
            }
            if (runningGenerations[source]) {
                return res.status(409).json({ error: "a generation is running for " + source });
            }
            const baseRun = runContext.run.savedRun;
            const sourceConfig = runContext.sourceConfig;
            const termNamespace = getTermNamespace(sourceConfig);
            // an import the user lost access to since the generation is left out
            const upperOntologies = (baseRun.upperOntologies || []).filter((upperOntology) => runContext.userSources[upperOntology]);
            const upperOntologyGraphUris = upperOntologies.map((upperOntology) => runContext.userSources[upperOntology].graphUri);
            const draftGraphUri = getDraftGraphUri(sourceConfig.graphUri);
            const baseTriples = await readDraftTriples(draftGraphUri);
            if (!baseTriples) {
                return res.status(409).json({ error: "the draft of " + source + " holds no triple: open it once to load it" });
            }
            // the report is not ontology: the graph does not hold it
            const graphAnswer = getGraphAnswer(baseTriples, draftGraphUri, termNamespace, upperOntologyGraphUris, baseRun.report);
            const baseAnswer = graphAnswer.ontologyAnswer;
            const notCarried = graphAnswer.notCarried;
            const userContext = { user: runContext.userInfo, userSources: runContext.userSources };
            // the samples and profiles the runs counted on the database, the schema read when a table is asked for
            const databaseChecks = await readDatabaseChecks(runContext.run.database);
            const schemaFileColumns = baseRun.schemaFile?.schema.columns ?? [];
            const schemaFileTableNames = schemaFileColumns.map((column) => column.table_name);
            const inspectedTableNames = [...new Set([...Object.keys(databaseChecks.inspectionsByTable), ...schemaFileTableNames])].sort();
            const tableListLines = inspectedTableNames.map(function (tableName) {
                const tableProfile = databaseChecks.inspectionsByTable[tableName]?.profile;
                return tableName + (tableProfile ? " (" + tableProfile.rowCount + " rows)" : "");
            });

            const usage = { input_tokens: 0, output_tokens: 0 };
            const notCarriedSection =
                notCarried.length > 0
                    ? "\n\n# Statements of the graph the answer format cannot hold\n\nThe ontologist added them in the whiteboard. A change leaves them as they are, unless it removes or renames the term they are about: " +
                      "say so when a change you propose would drop one that matters.\n\n" +
                      notCarried.join("\n")
                    : "";
            if (notCarried.length > 0) {
                sendProgress({ type: "notCarried", statements: notCarried });
            }

            const system =
                readFileSync(revisionPromptPath, "utf8") +
                "\n\n# Building rules\n\n" +
                readFileSync(ontologyBuildingPromptPath, "utf8") +
                (baseRun.schemaFile ? "\n\n" + readFileSync(schemaOnlyPromptPath, "utf8") : "") +
                "\n\n# Ontology under discussion, as its draft holds it" +
                "\n\nSource " +
                source +
                ", upper ontologies " +
                upperOntologies.join(", ") +
                "\n\n```json\n" +
                JSON.stringify(baseAnswer) +
                "\n```" +
                notCarriedSection +
                "\n\n# Measured overlaps\n\nshared distinct values between left and right, with the distinct values of each\n\n" +
                JSON.stringify(baseRun.measuredOverlaps || []) +
                "\n\n# Tables of the database " +
                baseRun.database +
                ", read with describe_database_tables\n\n" +
                tableListLines.join("\n");

            // read again at each change: the whiteboard or an earlier change may have touched the draft since the request started
            async function applyChange(toolInput) {
                if (runningGenerations[source]) {
                    return { saved: false, operationErrors: ["a generation started for " + source + ": it replaces the ontology"] };
                }
                const operations = toolInput.operations || [];
                if (operations.length == 0 && !toolInput.report && !toolInput.ontologyComment) {
                    return { saved: false, operationErrors: ["no operation, report nor ontologyComment: nothing to change"] };
                }
                const found = { ...runContext, run: await readSourceRun(source) };
                const currentTriples = await readDraftTriples(draftGraphUri);
                const currentGraphAnswer = getGraphAnswer(currentTriples, draftGraphUri, termNamespace, upperOntologyGraphUris, found.run.savedRun.report);
                const { revisedAnswer, operationErrors } = applyOperations(currentGraphAnswer.ontologyAnswer, operations);
                if (operationErrors.length > 0) {
                    return { saved: false, operationErrors: operationErrors };
                }
                if (toolInput.report) {
                    revisedAnswer.report = toolInput.report;
                }
                if (toolInput.ontologyComment) {
                    revisedAnswer.ontologyComment = toolInput.ontologyComment;
                }
                const currentProblems = getAnswerTurtle(currentGraphAnswer.ontologyAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris, currentGraphAnswer.graphTerms).problems;
                const answerOntology = getAnswerTurtle(revisedAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris, currentGraphAnswer.graphTerms);
                const newProblems = answerOntology.problems.filter((problem) => !currentProblems.includes(problem));
                // never applied with a problem it brings, whatever the conversation says: a database value can steer the model
                if (newProblems.length > 0) {
                    return { saved: false, newProblems: newProblems };
                }

                const { deletedTriples, insertedTriples, droppedTriples } = getGraphChange(currentGraphAnswer, answerOntology.turtle, draftGraphUri);
                // only the restrictions this change brings stop it, not those the ontology already had
                const currentRestrictions = getTurtleRestrictions(currentTriples, draftGraphUri);
                const currentRestrictionKeys = new Set(currentRestrictions.map(getRestrictionKey));
                const savedRun = found.run.savedRun;
                const previousReport = savedRun.report ?? null;
                async function saveRunFile() {
                    await writeFile(found.run.jsonPath, JSON.stringify(savedRun, null, 2));
                }
                // kept before the write: a server stopped in between leaves a change that can be undone, and undoing one that was not written changes nothing
                savedRun.chatbotChanges = savedRun.chatbotChanges ?? [];
                savedRun.chatbotChanges.push({ summary: toolInput.summary, deletedTriples: deletedTriples, insertedTriples: insertedTriples, previousReport: previousReport });
                savedRun.report = revisedAnswer.report ?? null;
                await saveRunFile();
                async function takeBackChange() {
                    await updateGraphTriples(draftGraphUri, insertedTriples, deletedTriples);
                    savedRun.chatbotChanges.pop();
                    savedRun.report = previousReport;
                    await saveRunFile();
                }
                try {
                    await updateGraphTriples(draftGraphUri, deletedTriples, insertedTriples);
                    // the check reads the hierarchy of the local classes in the graph: it comes after the write
                    await updateGraphCheck(found, source, await readDraftTriples(draftGraphUri));
                    const newNotAllowedChecks = (savedRun.restrictionChecks || []).filter(
                        (restrictionCheck) => restrictionCheck.status == "notAllowed" && !currentRestrictionKeys.has(getRestrictionKey(restrictionCheck)),
                    );
                    if (newNotAllowedChecks.length > 0) {
                        await takeBackChange();
                        await updateGraphCheck(found, source, await readDraftTriples(draftGraphUri));
                        return { saved: false, notAllowedRestrictions: newNotAllowedChecks.map(getNotAllowedRestrictionText) };
                    }
                } catch (changeError) {
                    // a triple store that stopped refuses this too: the change stays in the list, the button takes it back later
                    await takeBackChange().catch((takeBackError) => console.error("[ai/ontologyFromDb/revise] change not taken back: " + takeBackError.message));
                    throw changeError;
                }
                sendProgress({ type: "version", runName: found.run.runName, summary: toolInput.summary, droppedTripleCount: droppedTriples.length });
                return { saved: true, droppedStatements: droppedTriples, restrictionCheckError: found.run.savedRun.restrictionCheckError };
            }

            const toolFunctionsByName = {
                ...getUpperOntologyReaders(upperOntologies, userContext, {}),
                describe_database_tables: getDatabaseTablesDescriber(runContext.userInfo, baseRun, databaseChecks),
                apply_change: applyChange,
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
            console.error("ontologyFromDb/revise route error:", error);
            if (!res.headersSent) {
                return res.status(error.status || 500).json({ error: error.message });
            }
            sendProgress({ type: "error", error: error.message });
            res.end();
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictAdmin: [] }],
        summary: "Discuss the ontology of a source and change its draft, in natural language",
        description:
            "Runs Claude Opus 5.5, at medium reasoning effort, through OpenRouter, on the conversation of an ontologist about the draft `<source graphUri>/semanticvirtualdb/`. " +
            "The model reads the `bin/AI/ontologyFromDb/prompts/ontology_revision.md` prompt, the building rules, the draft read back in the answer format with the edits made in the whiteboard, the report and the measured overlaps of the run file, and the statements the answer format cannot hold, listed to the model and in a notCarried event, " +
            "and through tools the enriched model of the upper ontologies and the tables of the database (schema read live, samples and profiles from the `databaseChecks.json` the generations saved). " +
            "A change is set, remove and rename operations on the answer: only the triples they touch are deleted and inserted in the draft, what the answer format cannot hold stays unless its term goes. A change the checks refuse is taken back. " +
            "Each change keeps its triples in the run file, for POST /ai/ontologyFromDb/undo. Answers in NDJSON: a notCarried event first when the graph holds such statements, toolCall and toolResult events, a version event per change applied, then an answer event with the reply, or an error event.",
        operationId: "reviseOntologyFromDbRun",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "messages"],
                    properties: {
                        source: { type: "string" },
                        messages: {
                            type: "array",
                            description: "The conversation, ending with a message of the ontologist.",
                            items: { type: "object", properties: { role: { type: "string", enum: ["user", "assistant"] }, content: { type: "string" } } },
                        },
                    },
                },
            },
        ],
        responses: {
            200: { description: "NDJSON events: toolCall, toolResult, version, answer, error." },
            400: { description: "No conversation." },
            404: { description: "The source is unknown, or it has no ontology." },
            409: { description: "A generation is running, or the draft is empty." },
        },
        tags: ["AI"],
    };

    return operations;
}
