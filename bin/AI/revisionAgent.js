import { ontologyModelId, ontologyReasoningEffort, createMessage, getCutAnswerError, getAnswerText } from "./ontologyAnswer.js";
import { describeDatabase } from "./databaseDescription.js";
import { getTermIri } from "./mappingAnswer.js";
import { getEnrichedOntologyModel } from "../enrichedOntologyModel.js";
import { databaseModel } from "../../model/databases.js";
import { getSchemaDescription } from "../KG/dbConnector.js";

// a loop that never stops is the failure that costs money: a few reads, a proposal, a fix, the answer
const maxAgentTurns = 12;
// a turn writes an answer or a few operations, not a whole ontology as a generation does
const agentTurnMaxOutputTokens = 32000;
// the page is sent what the model writes at most every 200 ms, not one event per token
const writingFlushIntervalMs = 200;

const maxSearchResults = 30;

const searchUpperOntologiesTool = {
    name: "search_upper_ontologies",
    description:
        "Find classes and object properties of the upper ontologies imported by the source whose label or IRI contains a text, case ignored. " +
        "Answers at most " +
        maxSearchResults +
        " terms with their source, kind, label and first definition, and isTruncated when more matched.",
    input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
};

const getUpperOntologyTermsTool = {
    name: "get_upper_ontology_terms",
    description:
        "Read terms of the upper ontologies by IRI, or by prefixed name when the inputs list prefixes: for a class its definitions, examples, superclass and axioms in Manchester syntax, " +
        "for an object property its definitions, domain, range, inverse and superproperty.",
    input_schema: { type: "object", properties: { iris: { type: "array", items: { type: "string" } } }, required: ["iris"] },
};

const describeDatabaseTablesTool = {
    name: "describe_database_tables",
    description:
        "Read tables of the database the version was built from, as the generation read them: row count, columns with their type, nullability, distinct and null counts, primary and foreign keys, sample rows.",
    input_schema: { type: "object", properties: { tables: { type: "array", items: { type: "string" } } }, required: ["tables"] },
};

// the schema is read live once, unless the caller already read it; the samples and profiles are those the runs saved in databaseChecks
function getDatabaseTablesDescriber(userInfo, savedRun, databaseChecks, knownDatabaseSchema) {
    let databaseSchema = knownDatabaseSchema ?? null;
    return async function describeDatabaseTables(toolInput) {
        if (!databaseSchema) {
            // the first runs saved the name of their database only
            const allDatabases = await databaseModel.getAllDatabases();
            const runDatabase = allDatabases.find((database) => database.id == savedRun.databaseId || database.database == savedRun.database);
            if (!runDatabase) {
                return { error: "the database " + savedRun.database + " is no longer configured" };
            }
            const connection = await databaseModel.getUserConnection(userInfo.user, runDatabase.id);
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
    };
}

// the enriched models of the upper ontologies, read on the first call; a term imported by several is read in the first, the most abstract
function getUpperOntologyReaders(upperOntologies, userContext, prefixes) {
    let upperOntologyModels = null;
    async function getUpperOntologyModels() {
        if (!upperOntologyModels) {
            upperOntologyModels = [];
            for (const upperOntology of upperOntologies) {
                upperOntologyModels.push({ source: upperOntology, model: await getEnrichedOntologyModel(upperOntology, userContext) });
            }
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
        const termsByReference = {};
        const loadedModels = await getUpperOntologyModels();
        for (const termReference of toolInput.iris || []) {
            termsByReference[termReference] = "not in the upper ontologies of the source";
            const termIri = getTermIri(termReference, prefixes);
            for (const { source: upperOntology, model } of loadedModels) {
                const ontologyClass = model.classes[termIri];
                const property = model.properties[termIri];
                if (ontologyClass) {
                    termsByReference[termReference] = { source: upperOntology, kind: "class", ...ontologyClass };
                    break;
                }
                if (property) {
                    const constraint = model.constraints[termIri] || {};
                    termsByReference[termReference] = { source: upperOntology, kind: "objectProperty", ...property, domain: constraint.domain ?? null, range: constraint.range ?? null };
                    break;
                }
            }
        }
        return termsByReference;
    }

    return { search_upper_ontologies: searchUpperOntologies, get_upper_ontology_terms: getUpperOntologyTerms };
}

// the line the page writes under a reading tool, null for a tool of the route
function getReadingToolOutcome(toolName, toolResult) {
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
    return null;
}

// the model calls tools until it answers in text; null when the page closed meanwhile, no turn is paid for nobody.
// The text of every turn is streamed as textDelta events, a turn calling tools included: the page decides what it shows
async function runAgentLoop({ system, conversation, tools, toolFunctionsByName, getToolOutcome, usage, sendProgress, isRequestClosed }) {
    const messages = conversation.map((message) => ({ role: message.role, content: String(message.content) }));
    for (let agentTurn = 0; agentTurn < maxAgentTurns; agentTurn++) {
        if (isRequestClosed()) {
            return null;
        }
        let unsentText = "";
        let lastFlushMs = 0;
        const flushText = function () {
            if (unsentText) {
                sendProgress({ type: "textDelta", text: unsentText });
                unsentText = "";
            }
            lastFlushMs = Date.now();
        };
        const completion = await createMessage(
            {
                system: system,
                messages: messages,
                tools: tools,
                maxTokens: agentTurnMaxOutputTokens,
                model: ontologyModelId,
                reasoningEffort: ontologyReasoningEffort,
                // the system prompt is sent again unchanged at every turn
                isPromptCached: true,
                onTextDelta: function (textDelta) {
                    unsentText += textDelta;
                    if (Date.now() - lastFlushMs >= writingFlushIntervalMs) {
                        flushText();
                    }
                },
            },
            usage,
        );
        flushText();
        const turnText = getAnswerText(completion);
        const cutAnswerError = getCutAnswerError(completion, turnText);
        if (cutAnswerError) {
            throw new Error(cutAnswerError);
        }
        const toolUses = completion.content.filter((block) => block.type == "tool_use");
        if (toolUses.length == 0) {
            return turnText;
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
    throw new Error("the agent stopped after " + maxAgentTurns + " turns without answering");
}

export {
    searchUpperOntologiesTool,
    getUpperOntologyTermsTool,
    describeDatabaseTablesTool,
    getUpperOntologyReaders,
    getDatabaseTablesDescriber,
    getReadingToolOutcome,
    runAgentLoop,
};
