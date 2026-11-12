import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readMappingModelerFile, updateMappingModelerFile } from "../ontologyFromDb/mappings/mappingRuns.js";
import { createMessage, getAnswerText, getCutAnswerError } from "../ontologyFromDb/ontology/ontologyAnswer.js";
import { getPreparedSource, getNotPreparedError, getTableDescription } from "./sourcePreparation.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const promptPath = join(currentDirectory, "prompts/table_reading.md");
// OpenRouter id, fixed here as in the suggestions; the model of the key detection, a reading takes it 7 to 22 s on adventureworks and pazflor
const readingModelId = "openai/gpt-6.1-sol";
const readingReasoningEffort = "medium";
// the reasoning counts: a reading writes a few hundred tokens
const readingMaxTokens = 16000;

// per table of a data source of a source, since the server started: { isRunning, reading, error }; reading is the one the
// suggestions get, kept while a reading asked again runs or after it failed
const readingsByTableKey = {};

function getTableKey(request) {
    const tableKey = [request.source, request.databaseId || request.dataSourceName, request.table].join("|");
    return tableKey;
}

// a database by its id, a csv file by its name; null when the mapping does not list the data source yet
function getDataSourceConfig(mapping, request) {
    const mappingConfig = mapping?.options?.config;
    const dataSourceConfig = request.databaseId ? mappingConfig?.databaseSources?.[request.databaseId] : mappingConfig?.csvSources?.[request.dataSourceName];
    return dataSourceConfig || null;
}

async function readSavedReading(request) {
    const mapping = await readMappingModelerFile(request.source);
    const dataSourceConfig = getDataSourceConfig(mapping, request);
    const savedReading = dataSourceConfig?.tableReadings?.[request.table] || null;
    return savedReading;
}

// a data source the mapping does not list yet gets the reading from the page at its next save
function writeMappingReading(request, reading) {
    const mappingUpdate = updateMappingModelerFile(request.source, function (mapping) {
        const dataSourceConfig = getDataSourceConfig(mapping, request);
        if (!dataSourceConfig) {
            return false;
        }
        dataSourceConfig.tableReadings = { ...dataSourceConfig.tableReadings, [request.table]: reading };
        return true;
    });
    return mappingUpdate;
}

// { reading } or { error }
async function readTable(request, preparedSource) {
    const systemPrompt = readFileSync(promptPath, "utf8") + "\n\n# Upper ontologies, most abstract first\n" + preparedSource.classesText;
    const messageParams = {
        model: readingModelId,
        system: systemPrompt,
        messages: [{ role: "user", content: getTableDescription(request, preparedSource) }],
        maxTokens: readingMaxTokens,
        reasoningEffort: readingReasoningEffort,
        isPromptCached: true,
    };
    const completion = await createMessage(messageParams, { input_tokens: 0, output_tokens: 0 });
    const answerText = getAnswerText(completion);
    const readingText = answerText.trim();
    const cutAnswerError = getCutAnswerError(completion, readingText);
    if (cutAnswerError) {
        return { error: cutAnswerError };
    }
    if (!readingText) {
        return { error: "the model wrote no reading" };
    }
    const reading = { text: readingText, model: readingModelId, readAt: new Date().toISOString() };
    return { reading: reading };
}

function runTableReading(request, tableReading) {
    const tableKey = getTableKey(request);
    getPreparedSource(request.source)
        .then(function (preparedSource) {
            if (!preparedSource) {
                return { error: getNotPreparedError(request.source) };
            }
            return readTable(request, preparedSource);
        })
        .then(function (readResult) {
            if (readResult.error) {
                tableReading.error = readResult.error;
                return;
            }
            tableReading.reading = readResult.reading;
            // a reading asked again meanwhile replaced this one
            if (readingsByTableKey[tableKey] !== tableReading) {
                return;
            }
            // the suggestions still get the reading, and the next save of the page writes it
            return writeMappingReading(request, readResult.reading).catch(function (writeError) {
                console.warn("[aiMappingModeler/tableReading] " + tableKey + ": reading not written in the mapping: " + writeError.message);
            });
        })
        .catch(function (readingError) {
            tableReading.error = readingError.message;
        })
        .finally(function () {
            tableReading.isRunning = false;
            if (tableReading.error) {
                console.warn("[aiMappingModeler/tableReading] " + tableKey + ": " + tableReading.error);
            }
        });
}

// { status: "done" | "running" | "failed", reading, error }: the reading of this server start, else the one the mapping holds,
// else a reading started now; a failed reading is run again only when asked again
async function getTableReading(request, isReadAgain) {
    const tableKey = getTableKey(request);
    const knownReading = readingsByTableKey[tableKey];
    if (!knownReading || (isReadAgain && !knownReading.isRunning)) {
        // registered before the first await: a page asking meanwhile follows this reading instead of paying for another one
        const startedReading = { isRunning: true, reading: knownReading ? knownReading.reading : null, error: null };
        readingsByTableKey[tableKey] = startedReading;
        let mappingReading = null;
        try {
            mappingReading = isReadAgain ? null : await readSavedReading(request);
        } catch (readError) {
            startedReading.isRunning = false;
            startedReading.error = "the mapping of " + request.source + " could not be read: " + readError.message;
        }
        if (mappingReading) {
            startedReading.reading = mappingReading;
            startedReading.isRunning = false;
        } else if (!startedReading.error) {
            runTableReading(request, startedReading);
        }
    }
    const tableReading = readingsByTableKey[tableKey];
    if (tableReading.isRunning) {
        return { status: "running", reading: null };
    }
    if (tableReading.error) {
        return { status: "failed", reading: null, error: tableReading.error };
    }
    // a save of a page that had not got the reading dropped it from the mapping
    const savedReading = await readSavedReading(request);
    if (!savedReading) {
        await writeMappingReading(request, tableReading.reading);
    }
    return { status: "done", reading: tableReading.reading };
}

// none while the first reading of the table runs, or when the table was never read: a suggestion never waits for a reading
async function getKnownTableReading(request) {
    const knownReading = readingsByTableKey[getTableKey(request)];
    if (knownReading && knownReading.reading) {
        return knownReading.reading;
    }
    try {
        const savedReading = await readSavedReading(request);
        return savedReading;
    } catch (readError) {
        // an unreadable mapping costs the suggestion its context, not its answer
        console.warn("[aiMappingModeler/tableReading] " + getTableKey(request) + ": " + readError.message);
        return null;
    }
}

// the reading as the class and restriction suggestions get it, after the description of the table; none for a table never read
function getTableReadingText(tableReading) {
    const tableReadingText = tableReading ? "\n# Reading of the table, by a careful reader\n\nFollow it unless the evidence of the column contradicts it.\n\n" + tableReading.text + "\n" : "";
    return tableReadingText;
}

export { getTableReading, getKnownTableReading, getTableReadingText };
