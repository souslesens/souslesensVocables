import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getSchemaDescription } from "../../../../../bin/databases/dbConnector.js";
import { databaseModel } from "../../../../../model/databases.js";
import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { getKeyDetection, describeKeyedDatabase, keyDetectionModelId } from "../../../../../bin/AI/aiMappingModeler/keyDetection.js";
import { runEvidenceQuery, changeGuess } from "../../../../../bin/AI/aiMappingModeler/masterData.js";
import { getPreparedSource } from "../../../../../bin/AI/aiMappingModeler/sourcePreparation.js";
import { runAgentLoop, searchUpperOntologiesTool, getUpperOntologyTermsTool, getUpperOntologyReaders, getReadingToolOutcome } from "../../../../../bin/AI/ontologyFromDb/revision/revisionAgent.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workflowChatPromptPath = join(currentDirectory, "../../../../../bin/AI/aiMappingModeler/prompts/workflow_chat.md");

const runSqlTool = {
    name: "run_sql",
    description: "Run one read-only SELECT on the database the user opened. At most 20 rows come back, the user sees them as a table under the answer.",
    input_schema: {
        type: "object",
        properties: {
            purpose: { type: "string", description: "What the rows show, in one short sentence, written above the table." },
            sql: { type: "string", description: "One SELECT or WITH statement, table names without schema prefix." },
        },
        required: ["purpose", "sql"],
    },
};

const superClassOptionInputs = {
    superClassIri: { type: "string", description: "IRI of a class of the upper ontologies, found with search_upper_ontologies, or label of a local class added with add_local_class." },
    definition: { type: "string", description: "Definition of that superclass, from the upper ontology." },
    probability: { type: "number", description: "0 to 100, how likely the data make it." },
    impact: { type: "string", description: "What choosing it changes in the ontology." },
};
// one tool for every change, so that the agent does not carry a tool per change; made only when the user asks, the prompt says so
const changeGuessTool = {
    name: "change_guess",
    description:
        "Change a guess of the workflow as the user asks: the master data of step 1, the important classes of step 2, the association classes of step 3, the links of step 4 or the class mappings of step 5. Saved in the mapping and drawn at once. The change names what to do:\n" +
        "- apply_decision: decide an entry, the reading chosen and, for a new class, the superclass chosen among its options (superClass).\n" +
        "- undo_decision: its reading and superclass become open again, and an upper class taken as the class gives back the classes proposed before.\n" +
        "- add_superclass_option: add a class of the upper ontologies, or a local class, as superclass option of the class (superClassIri, definition, probability, impact).\n" +
        "- add_local_class: add a local class of the ontology the user needs above entries, as a client above reseller and individual customer, no entry named " +
        "(newLabel, definition, superClassIri its own superclass); then add it as superclass option of each entry and decide it.\n" +
        "- remove_superclass_option: remove an option (superClass); a decision on it is undone.\n" +
        "- update_class: rename the class (newLabel), change its definition (definition), or take a class of the upper ontologies as the class itself (existingClassIri). " +
        "A renamed imported class becomes a local class without superclass options.\n" +
        "- add_reading: add a reading of what one row denotes (newLabel, rowIs, inData, askBusiness, definition of its class, superClassOptions).\n" +
        "- remove_reading: remove a reading with its class; a decision on it is undone.\n" +
        "- remove_entry: remove the entry with its readings and classes.\n" +
        "On step 4 every change names its link by its id:\n" +
        "- apply_link_decision: decide the link (link), choosing one of its propertyOptions (property = its propertyIri); the decision shows on the link in the graph.\n" +
        "- undo_link_decision: an undecided link (link).\n" +
        "- add_link_property_option: add a property of the upper ontologies to the options of the link (link, propertyIri, definition, probability, inverse), after searching them.\n" +
        "- remove_link_property_option: remove one of its options (link, property); the decision on it, if any, is undone.\n" +
        "- remove_link: remove the link from the guess (link).\n" +
        "On step 5 every change names its class by classLabel, as in the mappingGuess:\n" +
        "- apply_class_mapping: apply the mapping of the class: its instance (identifierColumns, uriType, prefixURI, labelColumn) and, per column entry, the option chosen (columnChoices).\n" +
        "- undo_class_mapping: the mapping of the class and the choices of its columns are open again.",
    input_schema: {
        type: "object",
        properties: {
            change: {
                type: "string",
                enum: ["apply_decision", "undo_decision", "add_superclass_option", "remove_superclass_option", "update_class", "add_reading", "remove_reading", "remove_entry", "add_local_class", "apply_link_decision", "undo_link_decision", "add_link_property_option", "remove_link_property_option", "remove_link", "apply_class_mapping", "undo_class_mapping"],
            },
            rationale: {
                type: "string",
                description: "Why this change, in one or two sentences: what the user asked and the facts that support it, citing the numbers read in the data. Logged with the change for the next steps.",
            },
            step: { type: "string", enum: ["masterData", "importantClasses", "events", "links", "mapping"], description: "The guess changed, the step the user has open when left out." },
            entry: { type: "string", description: "Label of the master data, of the important class, of the association class or, on step 4, of the link, as in the guess; every change but add_local_class names one." },
            link: { type: "string", description: "The id of the link the change acts on, on step 4. Copy it from the linksGuess the user sees." },
            property: { type: "string", description: "On step 4, the propertyIri or the label of the option of the link the change acts on." },
            propertyIri: { type: "string", description: "On step 4, the IRI of the property added to the link, found with search_upper_ontologies." },
            inverse: { type: "boolean", description: "On step 4, when the property holds from the other class to the link's one." },
            classLabel: { type: "string", description: "On step 5, the class whose mapping changes, as in the mappingGuess." },
            instance: {
                type: "object",
                description: "On step 5, how one row gives one instance; the one of the guess when left out.",
                properties: { identifierColumns: { type: "array", items: { type: "string" } }, uriType: { type: "string", enum: ["fromLabel", "blankNode", "randomIdentifier"] }, prefixURI: { type: "string" }, labelColumn: { type: "string" } },
            },
            columnChoices: {
                type: "array",
                description: "On step 5, the option chosen per column entry: columns as the entry joins them with a comma and a space, optionIndex its index in options.",
                items: { type: "object", properties: { columns: { type: "string" }, optionIndex: { type: "integer" } }, required: ["columns", "optionIndex"] },
            },
            reading: { type: "string", description: "Label of one of its readings; leave it out when it has a single one." },
            superClass: { type: "string", description: "Label or IRI of one of the superclass options." },
            ...superClassOptionInputs,
            definition: { type: "string", description: "Definition of the class, or of the superclass added by add_superclass_option." },
            newLabel: { type: "string", description: "New label of the class, or label of the reading added." },
            existingClassIri: { type: "string", description: "IRI of a class of the upper ontologies that is the class itself." },
            rowIs: { type: "string", description: "What one row is under the reading added." },
            inData: { type: "string", description: "What in the data points to the reading added." },
            askBusiness: { type: "string", description: "The question that settles the reading added." },
            superClassOptions: { type: "array", items: { type: "object", properties: superClassOptionInputs, required: ["superClassIri", "definition", "probability", "impact"] } },
        },
        required: ["change", "rationale"],
    },
};
// rows of a query kept in the change log, enough to show what the data said
const loggedRowCount = 5;

function getToolOutcome(toolName, toolResult) {
    if (toolResult.error) {
        return "failed: " + toolResult.error;
    }
    if (toolName == "run_sql") {
        return toolResult.rows.length + " rows";
    }
    const toolOutcome = getReadingToolOutcome(toolName, toolResult) ?? toolResult.summary;
    return toolOutcome;
}

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        // a closed page stops the loop at the next turn, no model call is paid for nobody
        let isRequestClosed = false;
        const modelAbortController = new AbortController();
        res.on("close", function () {
            isRequestClosed = true;
            modelAbortController.abort();
        });
        function sendProgress(progressEvent) {
            if (!res.headersSent) {
                res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
                res.flushHeaders();
            }
            res.write(JSON.stringify(progressEvent) + "\n");
        }

        try {
            const { source, databaseId, screen, messages } = req.body;
            const found = await findUserSource(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const keyDetection = await getKeyDetection(source, databaseId);
            if (!keyDetection.aiKeys || !keyDetection.aiKeys.masterDataGuess) {
                return res.status(409).json({ error: "the master data of this database are not guessed yet" });
            }
            const database = await databaseModel.getDatabase(databaseId);
            const connection = await databaseModel.getUserConnection(found.userInfo.user, databaseId);
            const schema = await getSchemaDescription(connection, database.driver);
            const columnsByTable = {};
            schema.columns.forEach(function (column) {
                if (!columnsByTable[column.table_name]) {
                    columnsByTable[column.table_name] = [];
                }
                columnsByTable[column.table_name].push(column);
            });
            // describeDatabase reads an inspection per table, an empty one gives neither profile nor sample rows
            const schemaOnlyInspections = {};
            Object.keys(columnsByTable).forEach((tableName) => (schemaOnlyInspections[tableName] = {}));
            const system =
                readFileSync(workflowChatPromptPath, "utf8") +
                "\n# Master data guess, step 1\n\n" +
                JSON.stringify(keyDetection.aiKeys.masterDataGuess) +
                "\n\n# Important classes guess, step 2\n\n" +
                JSON.stringify(keyDetection.aiKeys.importantClassesGuess || "not guessed yet") +
                "\n\n# Association classes guess, step 3\n\n" +
                JSON.stringify(keyDetection.aiKeys.eventsGuess || "not guessed yet") +
                "\n\n# Links guess, step 4\n\n" +
                JSON.stringify(keyDetection.aiKeys.linksGuess || "not guessed yet") +
                "\n\n# Mapping guess, step 5\n\n" +
                JSON.stringify(keyDetection.aiKeys.mappingGuess || "not guessed yet") +
                "\n\n# What the user has open\n\n" +
                JSON.stringify(screen || {}) +
                "\n\n# Database\n\n" +
                describeKeyedDatabase(database, schema, columnsByTable, schemaOnlyInspections, keyDetection.aiKeys);

            const clientDriver = databaseModel.getClientDriver(database.driver);
            // the queries read while answering this question, logged with the changes it makes: the server keeps them, the
            // model cannot write them
            const answerQueries = [];
            const runSql = async function (toolInput) {
                const queryResult = await runEvidenceQuery(connection, clientDriver, String(toolInput.sql || ""));
                if (!queryResult.error) {
                    sendProgress({ type: "table", purpose: toolInput.purpose, sql: toolInput.sql, columns: queryResult.columns, rows: queryResult.rows });
                    answerQueries.push({ purpose: toolInput.purpose, sql: toolInput.sql, columns: queryResult.columns, rows: queryResult.rows.slice(0, loggedRowCount) });
                }
                return queryResult;
            };
            const userMessages = messages.filter((message) => message.role == "user");
            const userRequest = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : "";
            const runGuessChange = async function (toolInput) {
                toolInput.step = toolInput.step || screen?.step;
                const changed = await changeGuess(source, databaseId, toolInput.change, toolInput, { userRequest: userRequest, queries: answerQueries.slice() });
                if (changed.error) {
                    return { error: changed.error };
                }
                sendProgress({ type: "guessChange", summary: changed.summary, guessKey: changed.guessKey, guess: changed.guess });
                return { summary: changed.summary };
            };
            const toolFunctionsByName = { run_sql: runSql, change_guess: runGuessChange };
            // the superclasses the chat proposes are searched in the upper ontologies the guess was classified in
            const preparedSource = await getPreparedSource(source);
            const upperOntologies = preparedSource ? preparedSource.checkedOntologies : [];
            const upperOntologyReaders = getUpperOntologyReaders(upperOntologies, { user: found.userInfo, userSources: found.userSources }, {});
            toolFunctionsByName.search_upper_ontologies = upperOntologyReaders.search_upper_ontologies;
            toolFunctionsByName.get_upper_ontology_terms = upperOntologyReaders.get_upper_ontology_terms;
            const answerText = await runAgentLoop({
                system: system,
                conversation: messages,
                tools: [runSqlTool, searchUpperOntologiesTool, getUpperOntologyTermsTool, changeGuessTool],
                toolFunctionsByName: toolFunctionsByName,
                getToolOutcome: getToolOutcome,
                usage: { input_tokens: 0, output_tokens: 0 },
                sendProgress: sendProgress,
                isRequestClosed: () => isRequestClosed,
                abortSignal: modelAbortController.signal,
                // the model the guesses were made with
                model: keyDetectionModelId,
            });
            if (answerText === null) {
                return;
            }
            sendProgress({ type: "answer", text: answerText });
            res.end();
        } catch (error) {
            // the page stopped the answer: the model call under way was aborted on purpose
            if (isRequestClosed) {
                return;
            }
            console.error("aiMappingWorkflow/chat route error:", error);
            if (!res.headersSent) {
                return res.status(error.status || 500).json({ error: error.message });
            }
            sendProgress({ type: "error", error: error.message });
            res.end();
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictLoggedUser: [] }],
        summary: "Answer the questions of the user of the AI Mapping Workflow about the guesses of its steps and the data of the database",
        description:
            "POST the source, the database opened, what the user has open on the screen and the conversation. The model sees the master data and important classes guesses of the database, " +
            "the screen and the schema with its keys, and reads the data with read-only SELECTs. Answers one JSON event per line: " +
            "textDelta, toolCall, toolResult, table { purpose, sql, columns, rows } for each query read, guessChange { summary, guessKey, guess } for each change of the guess the user asked for, " +
            "then answer { text } or error { error }.",
        operationId: "aiMappingWorkflowChat",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "databaseId", "messages"],
                    properties: {
                        source: { type: "string" },
                        databaseId: { type: "string" },
                        screen: { type: "object", description: "what the user has open: the database, the step, the card of an entry and the choices on it" },
                        messages: {
                            type: "array",
                            items: { type: "object", properties: { role: { type: "string", enum: ["user", "assistant"] }, content: { type: "string" } }, required: ["role", "content"] },
                        },
                    },
                },
            },
        ],
        responses: {
            200: { description: "One JSON event per line, the last one answer or error." },
            404: { description: "The source is unknown to the user." },
            409: { description: "The master data of the database are not guessed yet." },
        },
        tags: ["AI"],
    };

    return operations;
}
