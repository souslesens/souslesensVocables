import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { findSourceRun, readDatabaseChecks, getNewRunTimestamp, getRunName, getRunGraphUri, loadTurtleIntoGraph, saveRun } from "../../../../../bin/AI/ontologyRuns.js";
import {
    ontologyModelId,
    ontologyReasoningEffort,
    firstOntologyVersion,
    getNextOntologyVersion,
    jsonBlockRegex,
    createMessage,
    getCutAnswerError,
    getAnswerText,
    getTermNamespace,
    getAnswerTurtle,
} from "../../../../../bin/AI/ontologyAnswer.js";
import { getEnrichedOntologyModel } from "../../../../../bin/enrichedOntologyModel.js";
import { rdfDataModel } from "../../../../../model/rdfData.js";
import { databaseModel } from "../../../../../model/databases.js";
import { getSchemaDescription } from "../../../../../bin/KG/dbConnector.js";
import { describeDatabase } from "../../../../../bin/AI/databaseDescription.js";
import { checkRunRestrictions, getTurtleRestrictions, getRestrictionKey } from "../../../../../bin/AI/restrictionCheck.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const revisionPromptPath = join(currentDirectory, "../../../../../bin/AI/prompts/ontology_revision.md");
const ontologyBuildingPromptPath = join(currentDirectory, "../../../../../bin/AI/prompts/ontology_building_from_db.md");

// a loop that never stops is the failure that costs money: a few reads, a proposal, a fix, the answer
const maxAgentTurns = 12;
// a turn writes an answer or a few operations, not a whole ontology as a generation does
const agentTurnMaxOutputTokens = 32000;
const maxSearchResults = 30;
// a term of the answer is named by its label: these fields hold the label of another term
const termCollectionByKind = { class: "classes", individual: "individuals", group: "groups" };

const revisionTools = [
    {
        name: "search_upper_ontologies",
        description:
            "Find classes and object properties of the upper ontologies imported by the source whose label or IRI contains a text, case ignored. " +
            "Answers at most " +
            maxSearchResults +
            " terms with their source, kind, label and first definition, and isTruncated when more matched.",
        input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
    {
        name: "get_upper_ontology_terms",
        description:
            "Read terms of the upper ontologies by IRI: for a class its definitions, examples, superclass and axioms in Manchester syntax, for an object property its definitions, domain, range, inverse and superproperty.",
        input_schema: { type: "object", properties: { iris: { type: "array", items: { type: "string" } } }, required: ["iris"] },
    },
    {
        name: "describe_database_tables",
        description:
            "Read tables of the database the version was built from, as the generation read them: row count, columns with their type, nullability, distinct and null counts, primary and foreign keys, sample rows.",
        input_schema: { type: "object", properties: { tables: { type: "array", items: { type: "string" } } }, required: ["tables"] },
    },
    {
        name: "propose_version",
        description:
            "Save a new version: a copy of the version under discussion with the operations applied, in order. " +
            "set adds or replaces the term of that label with term, a whole object in the answer format of the building rules. " +
            "remove deletes the term of that label. rename changes its label and every reference to the old label: parents, restriction targets, individual types, group members. " +
            "Refused, with the reasons, when an operation does not apply, when the Turtle meets problems the version under discussion did not have, " +
            "or when a restriction it brings uses a property whose domain or range in the upper ontologies does not fit its class or its target, unless acceptProblems is true.",
        input_schema: {
            type: "object",
            properties: {
                summary: { type: "string", description: "What the new version changes, in one sentence." },
                operations: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            action: { type: "string", enum: ["set", "remove", "rename"] },
                            kind: { type: "string", enum: Object.keys(termCollectionByKind) },
                            label: { type: "string", description: "Label of the term in the version under discussion, or of the new term for a set that adds one." },
                            newLabel: { type: "string", description: "rename only." },
                            term: { type: "object", description: "set only: the whole term, its label equal to label." },
                            rationale: { type: "string", description: "The request, the evidence and the building rule behind the operation." },
                        },
                        required: ["action", "kind", "label", "rationale"],
                    },
                },
                report: { type: "object", description: "The whole updated report, when the change touches it." },
                ontologyComment: { type: "string", description: "Only when the business the ontology covers changes." },
                acceptProblems: {
                    type: "boolean",
                    description: "Save despite new Turtle problems or restrictions outside a domain or range, only when the ontologist asked for the change knowing them.",
                },
            },
            required: ["summary", "operations"],
        },
    },
];

// a label names one term whatever its kind: getAnswerTurtle reports two terms sharing one
function renameReferences(ontologyAnswer, oldLabel, newLabel) {
    const renamedLabel = (reference) => (reference == oldLabel ? newLabel : reference);
    (ontologyAnswer.classes || []).forEach(function (ontologyClass) {
        ontologyClass.parent = renamedLabel(ontologyClass.parent);
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
    if (toolResult.error) {
        return "failed: " + toolResult.error;
    }
    if (toolName == "search_upper_ontologies") {
        return toolResult.terms.length + " terms" + (toolResult.isTruncated ? ", more matched" : "");
    }
    if (toolName == "get_upper_ontology_terms") {
        return Object.keys(toolResult).length + " terms read";
    }
    if (toolName == "describe_database_tables") {
        return toolResult.describedTables.length + " tables described" + (toolResult.unknownTables.length > 0 ? ", unknown: " + toolResult.unknownTables.join(", ") : "");
    }
    if (toolResult.saved) {
        return "version " + toolResult.ontologyVersion + " saved";
    }
    const refusalReasons = toolResult.operationErrors || toolResult.newProblems || toolResult.notAllowedRestrictions;
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
            const runContext = await findSourceRun(req, req.body.source, req.body.runName);
            if (runContext.error) {
                return res.status(runContext.status).json({ error: runContext.error });
            }
            const baseRun = runContext.run.savedRun;
            const baseAnswerMatch = baseRun?.answer ? baseRun.answer.match(jsonBlockRegex) : null;
            let baseAnswer = null;
            try {
                baseAnswer = baseAnswerMatch ? JSON.parse(baseAnswerMatch[1]) : null;
            } catch (_parseError) {
                baseAnswer = null;
            }
            if (!baseAnswer) {
                return res.status(400).json({ error: req.body.runName + " holds no readable answer to revise" });
            }
            const source = req.body.source;
            const sourceConfig = runContext.sourceConfig;
            const termNamespace = getTermNamespace(sourceConfig);
            // an import the user lost access to since the generation is left out
            const upperOntologies = (baseRun.upperOntologies || []).filter((upperOntology) => runContext.userSources[upperOntology]);
            const upperOntologyGraphUris = upperOntologies.map((upperOntology) => runContext.userSources[upperOntology].graphUri);
            const userContext = { user: runContext.userInfo, userSources: runContext.userSources };
            // the samples and profiles the runs counted on the database, the schema read when a table is asked for
            const databaseChecks = await readDatabaseChecks(runContext.run.database);
            const inspectedTableNames = Object.keys(databaseChecks.inspectionsByTable).sort();
            const tableListLines = inspectedTableNames.map(function (tableName) {
                const tableProfile = databaseChecks.inspectionsByTable[tableName].profile;
                return tableName + (tableProfile ? " (" + tableProfile.rowCount + " rows)" : "");
            });
            let databaseSchema = null;

            const baseOntologyVersion = baseRun.ontologyVersion || firstOntologyVersion;
            const baseProblems = getAnswerTurtle(baseAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris, baseOntologyVersion).problems;
            // the version a proposal applies to: the requested one, then each version saved during this request
            let discussedVersion = { runName: runContext.run.runName, answer: baseAnswer, problems: baseProblems };
            const usage = { input_tokens: 0, output_tokens: 0 };

            const system =
                readFileSync(revisionPromptPath, "utf8") +
                "\n\n# Building rules\n\n" +
                readFileSync(ontologyBuildingPromptPath, "utf8") +
                "\n\n# Version under discussion: " +
                runContext.run.runName +
                ", ontology version " +
                baseOntologyVersion +
                "\n\nSource " +
                source +
                ", upper ontologies " +
                upperOntologies.join(", ") +
                "\n\n```json\n" +
                JSON.stringify(baseAnswer) +
                "\n```\n\n# Measured overlaps\n\nshared distinct values between left and right, with the distinct values of each\n\n" +
                JSON.stringify(baseRun.measuredOverlaps || []) +
                "\n\n# Tables of the database " +
                baseRun.database +
                ", read with describe_database_tables\n\n" +
                tableListLines.join("\n");

            async function getUpperOntologyModels() {
                const upperOntologyModels = [];
                for (const upperOntology of upperOntologies) {
                    upperOntologyModels.push({ source: upperOntology, model: await getEnrichedOntologyModel(upperOntology, userContext) });
                }
                return upperOntologyModels;
            }

            async function searchUpperOntologies(toolInput) {
                const searchedText = String(toolInput.text).toLowerCase();
                const matchingTerms = [];
                for (const { source: upperOntology, model } of await getUpperOntologyModels()) {
                    const termsByKind = { class: model.classes, objectProperty: model.properties };
                    for (const [termKind, termsByIri] of Object.entries(termsByKind)) {
                        for (const [termIri, term] of Object.entries(termsByIri)) {
                            const lowerCaseIri = termIri.toLowerCase();
                            const lowerCaseLabel = String(term.label).toLowerCase();
                            if (!lowerCaseIri.includes(searchedText) && !lowerCaseLabel.includes(searchedText)) {
                                continue;
                            }
                            if (matchingTerms.length == maxSearchResults) {
                                return { terms: matchingTerms, isTruncated: true };
                            }
                            matchingTerms.push({ source: upperOntology, kind: termKind, iri: termIri, label: term.label, definition: term.definitions[0] ?? null });
                        }
                    }
                }
                return { terms: matchingTerms, isTruncated: false };
            }

            async function getUpperOntologyTerms(toolInput) {
                const termsByIri = {};
                const upperOntologyModels = await getUpperOntologyModels();
                for (const termIri of toolInput.iris || []) {
                    termsByIri[termIri] = "not in the upper ontologies of " + source;
                    // a term imported by several upper ontologies is read in the most abstract one
                    for (const { source: upperOntology, model } of upperOntologyModels) {
                        const ontologyClass = model.classes[termIri];
                        const property = model.properties[termIri];
                        if (ontologyClass) {
                            termsByIri[termIri] = { source: upperOntology, kind: "class", ...ontologyClass };
                            break;
                        }
                        if (property) {
                            const constraint = model.constraints[termIri] || {};
                            termsByIri[termIri] = { source: upperOntology, kind: "objectProperty", ...property, domain: constraint.domain ?? null, range: constraint.range ?? null };
                            break;
                        }
                    }
                }
                return termsByIri;
            }

            async function describeDatabaseTables(toolInput) {
                if (!databaseSchema) {
                    // the first runs saved the name of their database only
                    const allDatabases = await databaseModel.getAllDatabases();
                    const runDatabase = allDatabases.find((database) => database.id == baseRun.databaseId || database.database == baseRun.database);
                    if (!runDatabase) {
                        return { error: "the database " + baseRun.database + " is no longer configured" };
                    }
                    const connection = await databaseModel.getUserConnection(runContext.userInfo.user, runDatabase.id);
                    databaseSchema = { database: runDatabase, schema: await getSchemaDescription(connection, runDatabase.driver) };
                }
                const requestedTables = toolInput.tables || [];
                const columnsByTable = {};
                databaseSchema.schema.columns.forEach(function (column) {
                    if (!requestedTables.includes(column.table_name)) {
                        return;
                    }
                    if (!columnsByTable[column.table_name]) {
                        columnsByTable[column.table_name] = [];
                    }
                    columnsByTable[column.table_name].push(column);
                });
                const describedTables = Object.keys(columnsByTable);
                const tableInspections = {};
                describedTables.forEach(function (tableName) {
                    tableInspections[tableName] = databaseChecks.inspectionsByTable[tableName] || { sampleError: "not read by the runs on this database" };
                });
                return {
                    describedTables: describedTables,
                    unknownTables: requestedTables.filter((tableName) => !columnsByTable[tableName]),
                    description: describeDatabase(databaseSchema.database, databaseSchema.schema, columnsByTable, tableInspections),
                };
            }

            async function proposeVersion(toolInput) {
                const operations = toolInput.operations || [];
                if (operations.length == 0 && !toolInput.report && !toolInput.ontologyComment) {
                    return { saved: false, operationErrors: ["no operation, report nor ontologyComment: the version would be a copy"] };
                }
                const { revisedAnswer, operationErrors } = applyOperations(discussedVersion.answer, operations);
                if (operationErrors.length > 0) {
                    return { saved: false, operationErrors: operationErrors };
                }
                if (toolInput.report) {
                    revisedAnswer.report = toolInput.report;
                }
                if (toolInput.ontologyComment) {
                    revisedAnswer.ontologyComment = toolInput.ontologyComment;
                }
                // the runs saved since the request started count too
                const ontologyVersion = await getNextOntologyVersion(source);
                const answerOntology = getAnswerTurtle(revisedAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris, ontologyVersion);
                const newProblems = answerOntology.problems.filter((problem) => !discussedVersion.problems.includes(problem));
                if (newProblems.length > 0 && !toolInput.acceptProblems) {
                    return { saved: false, newProblems: newProblems };
                }

                const runTimestamp = getNewRunTimestamp();
                const runName = getRunName(source, runTimestamp);
                const graphUri = getRunGraphUri(sourceConfig.graphUri, runTimestamp);
                let graphTripleCount = null;
                let graphError = null;
                try {
                    graphTripleCount = await loadTurtleIntoGraph(answerOntology.turtle, graphUri);
                } catch (loadError) {
                    graphError = loadError.message;
                }
                // the hierarchy of the local classes is read in the version graph: no graph, no check
                let restrictionChecks = null;
                let restrictionCheckError = null;
                if (graphTripleCount) {
                    try {
                        restrictionChecks = await checkRunRestrictions(answerOntology.turtle, graphUri, source, upperOntologies, userContext);
                    } catch (checkError) {
                        restrictionCheckError = checkError.message || String(checkError);
                    }
                }
                // only the restrictions this proposal brings stop it, not those the version under discussion already had
                const discussedTurtle = getAnswerTurtle(discussedVersion.answer, source, sourceConfig, termNamespace, upperOntologyGraphUris, ontologyVersion).turtle;
                const discussedRestrictions = getTurtleRestrictions(discussedTurtle, graphUri);
                const discussedRestrictionKeys = new Set(discussedRestrictions.map(getRestrictionKey));
                const newNotAllowedChecks = (restrictionChecks || []).filter(
                    (restrictionCheck) => restrictionCheck.status == "notAllowed" && !discussedRestrictionKeys.has(getRestrictionKey(restrictionCheck)),
                );
                const notAllowedRestrictions = newNotAllowedChecks.map(
                    (restrictionCheck) =>
                        restrictionCheck.classLabel + " " + restrictionCheck.propertyLabel + " " + restrictionCheck.targetLabel + ": the domain or range of the property does not fit",
                );
                if (notAllowedRestrictions.length > 0 && !toolInput.acceptProblems) {
                    await rdfDataModel.deleteGraph(graphUri);
                    return { saved: false, notAllowedRestrictions: notAllowedRestrictions };
                }
                const savedRun = {
                    source: source,
                    database: baseRun.database,
                    databaseId: baseRun.databaseId ?? null,
                    upperOntologies: upperOntologies,
                    ontologyVersion: ontologyVersion,
                    model: ontologyModelId,
                    reasoningEffort: ontologyReasoningEffort,
                    usage: usage,
                    totalSeconds: Math.round((Date.now() - requestStart) / 1000),
                    graphUri: graphUri,
                    graphTripleCount: graphTripleCount,
                    graphError: graphError,
                    restrictionChecks: restrictionChecks,
                    restrictionCheckError: restrictionCheckError,
                    // the evidence of the generation, the next revisions argue from it too
                    linkCandidates: baseRun.linkCandidates ?? null,
                    measuredOverlaps: baseRun.measuredOverlaps ?? [],
                    report: revisedAnswer.report ?? null,
                    answerProblems: answerOntology.problems,
                    revision: {
                        parentRunName: discussedVersion.runName,
                        summary: toolInput.summary,
                        operations: operations,
                        acceptedProblems: newProblems,
                        acceptedNotAllowedRestrictions: notAllowedRestrictions,
                        conversation: conversation,
                    },
                    answer: "```json\n" + JSON.stringify(revisedAnswer, null, 2) + "\n```",
                };
                try {
                    await saveRun(runContext.run.database, runName, savedRun, answerOntology.turtle);
                } catch (saveError) {
                    // a graph without its files is listed by no run and never deleted
                    await rdfDataModel.deleteGraph(graphUri);
                    throw saveError;
                }
                discussedVersion = { runName: runName, answer: revisedAnswer, problems: answerOntology.problems };
                sendProgress({
                    type: "version",
                    runName: runName,
                    ontologyVersion: ontologyVersion,
                    summary: toolInput.summary,
                    graphUri: graphUri,
                    graphTripleCount: graphTripleCount,
                    graphError: graphError,
                });
                return {
                    saved: true,
                    runName: runName,
                    ontologyVersion: ontologyVersion,
                    graphError: graphError,
                    acceptedProblems: newProblems,
                    acceptedNotAllowedRestrictions: notAllowedRestrictions,
                    restrictionCheckError: restrictionCheckError,
                };
            }

            const toolFunctionsByName = {
                search_upper_ontologies: searchUpperOntologies,
                get_upper_ontology_terms: getUpperOntologyTerms,
                describe_database_tables: describeDatabaseTables,
                propose_version: proposeVersion,
            };
            const messages = conversation.map((message) => ({ role: message.role, content: String(message.content) }));
            let answerText = null;
            for (let agentTurn = 0; agentTurn < maxAgentTurns; agentTurn++) {
                if (isRequestClosed) {
                    return;
                }
                const completion = await createMessage(
                    { system: system, messages: messages, tools: revisionTools, maxTokens: agentTurnMaxOutputTokens, model: ontologyModelId, reasoningEffort: ontologyReasoningEffort },
                    usage,
                );
                const turnText = getAnswerText(completion);
                const cutAnswerError = getCutAnswerError(completion, turnText);
                if (cutAnswerError) {
                    throw new Error(cutAnswerError);
                }
                const toolUses = completion.content.filter((block) => block.type == "tool_use");
                if (toolUses.length == 0) {
                    answerText = turnText;
                    break;
                }
                messages.push({ role: "assistant", content: completion.content });
                const toolResults = [];
                for (const toolUse of toolUses) {
                    sendProgress({ type: "toolCall", id: toolUse.id, name: toolUse.name, input: toolUse.input });
                    let toolResult;
                    try {
                        toolResult = await toolFunctionsByName[toolUse.name](toolUse.input);
                    } catch (toolError) {
                        toolResult = { error: toolError.message };
                    }
                    sendProgress({ type: "toolResult", id: toolUse.id, name: toolUse.name, outcome: getToolOutcome(toolUse.name, toolResult), isError: Boolean(toolResult.error) });
                    toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(toolResult) });
                }
                messages.push({ role: "user", content: toolResults });
            }
            if (answerText === null) {
                throw new Error("the agent stopped after " + maxAgentTurns + " turns without answering");
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
        security: [{ restrictAdmin: [] }],
        summary: "Discuss a version of a generated ontology and propose new versions, in natural language",
        description:
            "Runs Claude Opus 5.5, at medium reasoning effort, through OpenRouter, on the conversation of an ontologist about one run of POST /ai/ontologyFromDb. " +
            "The model reads the `bin/AI/prompts/ontology_revision.md` prompt, the building rules of the run, its JSON answer with its report and its measured overlaps, " +
            "and through tools the enriched model of the upper ontologies of the run and the tables of its database (schema read live, samples and profiles from the `databaseChecks.json` the runs saved). " +
            "A change is a new run: a copy of the discussed answer with set, remove and rename operations applied, a minor version above it, its parent, operations and rationale kept in its `.json` file, loaded into its own run graph. " +
            "The run discussed is never modified. Answers in NDJSON: toolCall and toolResult events, a version event per new run, then an answer event with the reply, or an error event.",
        operationId: "reviseOntologyFromDbRun",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "runName", "messages"],
                    properties: {
                        source: { type: "string" },
                        runName: { type: "string", description: "Run discussed, as GET /ai/ontologyFromDb/runs lists it." },
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
            400: { description: "No conversation, or a run with no answer to revise." },
            404: { description: "The source or the run is unknown." },
        },
        tags: ["AI"],
    };

    return operations;
}
