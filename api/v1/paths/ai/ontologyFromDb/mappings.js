import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { findSourceRuns, getRunGraphUri, getNewRunTimestamp, isTboxSourceOf, readDatabaseChecks } from "../../../../../bin/AI/ontologyRuns.js";
import {
    ontologyModelId,
    ontologyReasoningEffort,
    modelMaxOutputTokens,
    jsonBlockRegex,
    createMessage,
    getCutAnswerError,
    getAnswerText,
    getTermNamespace,
    getLocalName,
} from "../../../../../bin/AI/ontologyAnswer.js";
import { getMappingDocument, getLiteralRangeWarnings, checkMappingRelations } from "../../../../../bin/AI/mappingAnswer.js";
import {
    getMappingName,
    listSourceMappings,
    saveMappingVersion,
    deleteMappingVersion,
    readMappingModelerFile,
    writeMappingModelerFile,
    getMappingStatement,
} from "../../../../../bin/AI/mappingRuns.js";
import { getImportedOntologies } from "../../../../../bin/AI/restrictionCheck.js";
import { callVocablesFunction } from "../../../../../bin/remoteCodeRunner.js";
import { describeDatabase } from "../../../../../bin/AI/databaseDescription.js";
import { getSchemaDescription } from "../../../../../bin/KG/dbConnector.js";
import { databaseModel } from "../../../../../model/databases.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const mappingPromptPath = join(currentDirectory, "../../../../../bin/AI/prompts/mapping_building_from_ontology.md");
// the page is told what the model writes at most once a second
const writingProgressIntervalMs = 1000;
// MappingModeler reads the public schema of a postgres database, see getSchemaDescription
const postgresSchemaName = "public";

// the database is the one the validated version was built on, read as its generation read it
async function getMappingInputs(req, source) {
    const found = await findSourceRuns(req, source);
    if (found.error) {
        return found;
    }
    const tboxSource = (found.sourceConfig.imports || []).find((importedSource) => isTboxSourceOf(source, importedSource));
    if (!tboxSource || !found.userSources[tboxSource]) {
        return { status: 409, error: "no validated version of " + source + ": validate a version before mapping it" };
    }
    const tboxGraphUri = found.userSources[tboxSource].graphUri;
    const validatedRun = found.runs.find((run) => getRunGraphUri(found.sourceConfig.graphUri, run.runTimestamp) == tboxGraphUri);
    const answerMatch = validatedRun?.savedRun?.answer ? validatedRun.savedRun.answer.match(jsonBlockRegex) : null;
    if (!answerMatch) {
        return { status: 409, error: "the validated version " + tboxSource + " holds no readable answer" };
    }
    const ontologyAnswer = JSON.parse(answerMatch[1]);
    const savedRun = validatedRun.savedRun;
    const allDatabases = await databaseModel.getAllDatabases();
    const database = allDatabases.find((configuredDatabase) => configuredDatabase.id == savedRun.databaseId || configuredDatabase.database == savedRun.database);
    if (!database) {
        return { status: 409, error: "the database " + savedRun.database + " of the validated version is no longer configured" };
    }
    const connection = await databaseModel.getUserConnection(found.userInfo.user, database.id);
    const schema = await getSchemaDescription(connection, database.driver);
    const columnsByTable = {};
    schema.columns.forEach(function (column) {
        if (!columnsByTable[column.table_name]) {
            columnsByTable[column.table_name] = [];
        }
        columnsByTable[column.table_name].push(column);
    });
    const databaseChecks = await readDatabaseChecks(validatedRun.database);
    const tableInspections = {};
    for (const tableName of Object.keys(columnsByTable)) {
        tableInspections[tableName] = databaseChecks.inspectionsByTable[tableName] || { sampleError: "not read by the generation" };
    }
    return {
        found: found,
        tboxSource: tboxSource,
        validatedRun: validatedRun,
        ontologyAnswer: ontologyAnswer,
        database: database,
        schema: schema,
        columnsByTable: columnsByTable,
        databaseText: describeDatabase(database, schema, columnsByTable, tableInspections),
        userContext: { user: found.userInfo, userSources: found.userSources },
    };
}

// a file written before any version counts as edited
async function activateMappingVersion(source, mappingName, mapping, databaseFolder, mappingVersions) {
    const mappingModelerFile = await readMappingModelerFile(source);
    let keptMappingName = null;
    if (mappingModelerFile) {
        const activeMappingName = mappingModelerFile.options?.config?.mappingVersion;
        const activeMappingVersion = mappingVersions.find((mappingVersion) => mappingVersion.mappingName == activeMappingName);
        const isEditedInMappingModeler = !activeMappingVersion || getMappingStatement(mappingModelerFile) != getMappingStatement(activeMappingVersion.savedMapping.mapping);
        if (isEditedInMappingModeler) {
            keptMappingName = getMappingName(source, getNewRunTimestamp());
            await saveMappingVersion(databaseFolder, keptMappingName, {
                source: source,
                kind: "mappingModeler",
                basedOn: activeMappingName ?? null,
                createdAt: new Date().toISOString(),
                mapping: mappingModelerFile,
            });
        }
    }
    await writeMappingModelerFile(source, mappingName, mapping);
    return keptMappingName;
}

export default function () {
    let operations = {
        GET,
        POST,
        PUT,
        DELETE,
    };

    async function GET(req, res, _next) {
        try {
            const found = await findSourceRuns(req, req.query.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const mappingVersions = await listSourceMappings(req.query.source);
            // one version: what its checks and its report say, without the document and the answer
            if (req.query.mappingName) {
                const mappingVersion = mappingVersions.find((sourceMapping) => sourceMapping.mappingName == req.query.mappingName);
                if (!mappingVersion) {
                    return res.status(404).json({ error: "no mapping version " + req.query.mappingName + " for " + req.query.source });
                }
                const { mapping: _mapping, answer: _answer, ...mappingDetails } = mappingVersion.savedMapping;
                return res.status(200).json({ mappingName: mappingVersion.mappingName, ...mappingDetails });
            }
            const mappingModelerFile = await readMappingModelerFile(req.query.source);
            const activeMappingName = mappingModelerFile?.options?.config?.mappingVersion ?? null;
            const activeMappingVersion = mappingVersions.find((mappingVersion) => mappingVersion.mappingName == activeMappingName);
            const versionDescriptions = mappingVersions.map(function (mappingVersion) {
                const savedMapping = mappingVersion.savedMapping;
                return {
                    mappingName: mappingVersion.mappingName,
                    kind: savedMapping.kind,
                    createdAt: savedMapping.createdAt,
                    tboxSource: savedMapping.tboxSource ?? null,
                    model: savedMapping.model ?? null,
                    totalSeconds: savedMapping.totalSeconds ?? null,
                    basedOn: savedMapping.basedOn ?? null,
                    summary: savedMapping.revision?.summary ?? null,
                    problemCount: (savedMapping.problems || []).length,
                    warningCount: (savedMapping.rangeWarnings || []).length,
                    notAllowedRelationCount: (savedMapping.relationChecks || []).filter((relationCheck) => relationCheck.status == "notAllowed").length,
                    isActive: mappingVersion.mappingName == activeMappingName,
                };
            });
            res.status(200).json({
                mappings: versionDescriptions,
                activeMappingName: activeMappingName,
                hasMappingModelerFile: Boolean(mappingModelerFile),
                isEditedInMappingModeler:
                    Boolean(mappingModelerFile) && (!activeMappingVersion || getMappingStatement(mappingModelerFile) != getMappingStatement(activeMappingVersion.savedMapping.mapping)),
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async function POST(req, res, _next) {
        const requestStart = Date.now();
        const isProgressStreamed = !req.body.promptOnly;
        function sendProgress(progressEvent) {
            // the page that started the generation may be closed: the generation goes on and is saved all the same
            if (!isProgressStreamed || res.destroyed || res.writableEnded) {
                return;
            }
            if (!res.headersSent) {
                res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
                res.flushHeaders();
            }
            progressEvent.elapsedSeconds = Math.round((Date.now() - requestStart) / 1000);
            res.write(JSON.stringify(progressEvent) + "\n");
        }
        const stepSeconds = {};
        function endStep(stepName, stepStart, stepDetails) {
            stepSeconds[stepName] = Math.round((Date.now() - stepStart) / 1000);
            sendProgress({ type: "stepEnd", step: stepName, seconds: stepSeconds[stepName], ...stepDetails });
        }
        try {
            const source = req.body.source;
            const inputs = await getMappingInputs(req, source);
            if (inputs.error) {
                return res.status(inputs.status).json({ error: inputs.error });
            }
            const sourceConfig = inputs.found.sourceConfig;
            const termNamespace = getTermNamespace(sourceConfig);
            // the namespace MappingModeler builds the instance URIs on
            const instanceNamespace = sourceConfig.baseUri || sourceConfig.graphUri;
            const prompt =
                readFileSync(mappingPromptPath, "utf8") +
                "\n\n# Inputs\n\nSource: " +
                source +
                "\nValidated ontology: " +
                inputs.tboxSource +
                ", namespace of its terms " +
                termNamespace +
                "\nInstance namespace: " +
                instanceNamespace +
                "\n\n## Validated ontology\n\n```json\n" +
                JSON.stringify(inputs.ontologyAnswer) +
                "\n```\n\n## Database\n\n" +
                inputs.databaseText +
                "\n## Overlaps measured between candidate columns\n\nshared distinct values between left and right, with the distinct values of each\n\n" +
                JSON.stringify(inputs.validatedRun.savedRun.measuredOverlaps || []) +
                "\n";
            if (req.body.promptOnly) {
                return res.status(200).json({ prompt: prompt, promptCharacters: prompt.length });
            }

            const usage = { input_tokens: 0, output_tokens: 0 };
            let completion = null;
            let failure = null;
            const mappingStart = Date.now();
            if (!req.body.answer) {
                sendProgress({ type: "stepStart", step: "mapping", model: ontologyModelId, reasoningEffort: ontologyReasoningEffort, promptCharacters: prompt.length });
                let writtenCharacters = 0;
                let lastWritingProgress = 0;
                try {
                    completion = await createMessage(
                        {
                            messages: [{ role: "user", content: prompt }],
                            maxTokens: modelMaxOutputTokens,
                            model: ontologyModelId,
                            reasoningEffort: ontologyReasoningEffort,
                            onTextDelta: function (textDelta) {
                                writtenCharacters += textDelta.length;
                                if (Date.now() - lastWritingProgress >= writingProgressIntervalMs) {
                                    lastWritingProgress = Date.now();
                                    sendProgress({ type: "writing", writtenCharacters: writtenCharacters });
                                }
                            },
                        },
                        usage,
                    );
                } catch (llmError) {
                    failure = llmError.message;
                }
            }
            endStep("mapping", mappingStart, { usage: usage, failure: failure });

            const answerText = req.body.answer || getAnswerText(completion);
            const answerMatch = answerText.match(jsonBlockRegex);
            let answerError = getCutAnswerError(completion, answerText);
            let mappingAnswer = null;
            if (!answerError && !answerMatch && !failure) {
                answerError = "the answer holds no JSON block";
            }
            if (answerMatch) {
                try {
                    mappingAnswer = JSON.parse(answerMatch[1]);
                } catch (parseError) {
                    answerError = "the JSON of the answer could not be read: " + parseError.message;
                }
            }

            let mappingDocument = null;
            let rangeWarnings = [];
            let relationChecks = null;
            let relationCheckError = null;
            if (mappingAnswer) {
                const checksStart = Date.now();
                sendProgress({ type: "stepStart", step: "mappingChecks" });
                const localClassLabels = new Set();
                const localDatatypePropertyLabels = new Set();
                (inputs.ontologyAnswer.classes || []).forEach(function (ontologyClass) {
                    localClassLabels.add(ontologyClass.label);
                    (ontologyClass.datatypeProperties || []).forEach((datatypeProperty) => localDatatypePropertyLabels.add(datatypeProperty.label));
                });
                // a local class is read in the validated version, an upper one in the upper ontology that declares it
                const classSourceByIri = {};
                localClassLabels.forEach((classLabel) => (classSourceByIri[termNamespace + getLocalName(classLabel)] = inputs.tboxSource));
                const upperOntologies = getImportedOntologies(inputs.validatedRun.savedRun.upperOntologies || [], inputs.found.userSources);
                const upperModels = await callVocablesFunction("OntologyModels", "registerSourcesModel", [upperOntologies, {}], inputs.userContext);
                upperOntologies.forEach(function (upperOntology) {
                    Object.keys(upperModels[upperOntology]?.classes || {}).forEach((classIri) => (classSourceByIri[classIri] = classSourceByIri[classIri] ?? upperOntology));
                });
                mappingDocument = getMappingDocument(mappingAnswer, {
                    source: source,
                    instanceNamespace: instanceNamespace,
                    termNamespace: termNamespace,
                    databaseId: inputs.database.id,
                    databaseName: inputs.database.database,
                    schemaName: inputs.database.driver == "postgres" ? postgresSchemaName : null,
                    columnsByTable: inputs.columnsByTable,
                    localClassLabels: localClassLabels,
                    localDatatypePropertyLabels: localDatatypePropertyLabels,
                    classSourceByIri: classSourceByIri,
                    userLogin: inputs.found.userInfo.user?.login ?? null,
                });
                rangeWarnings = getLiteralRangeWarnings(mappingAnswer, inputs.columnsByTable);
                try {
                    relationChecks = await checkMappingRelations(mappingDocument.checkedRelations, source, inputs.userContext);
                } catch (checkError) {
                    relationCheckError = checkError.message || String(checkError);
                }
                const notAllowedRelations = (relationChecks || []).filter((relationCheck) => relationCheck.status == "notAllowed");
                endStep("mappingChecks", checksStart, {
                    problemCount: mappingDocument.problems.length,
                    warningCount: rangeWarnings.length,
                    notAllowedCount: notAllowedRelations.length,
                    checkedRelationCount: relationChecks ? relationChecks.length : 0,
                    error: relationCheckError,
                });
            }

            // every generation is kept, a failed one included: a paid answer is never lost
            const mappingName = getMappingName(source, getNewRunTimestamp());
            const savedMapping = {
                source: source,
                kind: "generation",
                tboxSource: inputs.tboxSource,
                ontologyRunName: inputs.validatedRun.runName,
                database: inputs.database.database,
                databaseId: inputs.database.id,
                model: completion?.model ?? null,
                reasoningEffort: completion ? ontologyReasoningEffort : null,
                stopReason: completion?.stop_reason ?? null,
                failure: failure,
                usage: usage,
                createdAt: new Date().toISOString(),
                totalSeconds: Math.round((Date.now() - requestStart) / 1000),
                stepSeconds: stepSeconds,
                answerError: answerError,
                problems: mappingDocument?.problems ?? null,
                rangeWarnings: rangeWarnings,
                relationChecks: relationChecks,
                relationCheckError: relationCheckError,
                report: mappingAnswer?.report ?? null,
                candidates: mappingAnswer?.candidates ?? null,
                mapping: mappingDocument?.mapping ?? null,
                answer: answerText,
            };
            await saveMappingVersion(inputs.validatedRun.database, mappingName, savedMapping);
            // the newest mapping is the one MappingModeler opens, unless it names what the inputs do not hold
            let keptMappingName = null;
            const isActivated = Boolean(mappingDocument) && mappingDocument.problems.length == 0;
            if (isActivated) {
                const mappingVersions = await listSourceMappings(source);
                keptMappingName = await activateMappingVersion(source, mappingName, mappingDocument.mapping, inputs.validatedRun.database, mappingVersions);
            }
            sendProgress({
                type: "result",
                mappingName: mappingName,
                isActive: isActivated,
                keptMappingName: keptMappingName,
                failure: failure,
                answerError: answerError,
                problems: savedMapping.problems,
                rangeWarnings: rangeWarnings,
                relationChecks: relationChecks,
                relationCheckError: relationCheckError,
                usage: usage,
                totalSeconds: Math.round((Date.now() - requestStart) / 1000),
            });
            res.end();
        } catch (error) {
            console.error("ontologyFromDb/mappings route error:", error);
            if (!res.headersSent) {
                return res.status(error.status || 500).json({ error: error.message });
            }
            sendProgress({ type: "error", error: error.message });
            res.end();
        }
    }

    async function PUT(req, res, _next) {
        try {
            const found = await findSourceRuns(req, req.body.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const mappingVersions = await listSourceMappings(req.body.source);
            const mappingVersion = mappingVersions.find((sourceMapping) => sourceMapping.mappingName == req.body.mappingName);
            if (!mappingVersion || !mappingVersion.savedMapping.mapping) {
                return res.status(404).json({ error: "no mapping version " + req.body.mappingName + " for " + req.body.source });
            }
            const keptMappingName = await activateMappingVersion(req.body.source, mappingVersion.mappingName, mappingVersion.savedMapping.mapping, mappingVersion.databaseFolder, mappingVersions);
            res.status(200).json({ activeMappingName: mappingVersion.mappingName, keptMappingName: keptMappingName });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async function DELETE(req, res, _next) {
        try {
            const found = await findSourceRuns(req, req.query.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const mappingVersions = await listSourceMappings(req.query.source);
            const mappingVersion = mappingVersions.find((sourceMapping) => sourceMapping.mappingName == req.query.mappingName);
            if (!mappingVersion) {
                return res.status(404).json({ error: "no mapping version " + req.query.mappingName + " for " + req.query.source });
            }
            const mappingModelerFile = await readMappingModelerFile(req.query.source);
            if (mappingModelerFile?.options?.config?.mappingVersion == mappingVersion.mappingName) {
                return res.status(409).json({ error: mappingVersion.mappingName + " is the mapping MappingModeler opens: activate another one first" });
            }
            await deleteMappingVersion(mappingVersion.mappingPath);
            res.status(200).json({ deleted: mappingVersion.mappingName });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    const sourceParameter = { name: "source", in: "query", type: "string", required: true, description: "Source whose mappings are read." };

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "List the mapping versions of a source",
        description:
            "Lists the mapping versions saved under `data/semanticVirtualDB/<database>/mappings/`, newest first: generations, revisions, and MappingModeler files kept before " +
            "another version replaced them. The active version is the one written to `data/graphs/mappings_<source>_ALL.json`, which MappingModeler opens.",
        operationId: "getOntologyFromDbMappings",
        parameters: [sourceParameter, { name: "mappingName", in: "query", type: "string", required: false, description: "A version to read the checks and the report of, instead of the list." }],
        responses: {
            200: {
                description:
                    "With mappingName: the saved version without its document and its answer (problems, rangeWarnings, relationChecks, report, candidates...). Otherwise " +
                    "{ mappings: [{ mappingName, kind, createdAt, tboxSource, model, totalSeconds, basedOn, summary, problemCount, warningCount, notAllowedRelationCount, isActive }], " +
                    "activeMappingName, hasMappingModelerFile, isEditedInMappingModeler }",
            },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Generate a mapping of a source from its validated version",
        description:
            "Builds the `bin/AI/prompts/mapping_building_from_ontology.md` prompt with the validated version the source imports (its answer JSON), the schema, samples and profiles " +
            "of the database it was built on and the measured overlaps, then calls the ontology model once. The answer is a compact JSON (resources, relations, candidates, report) " +
            "that the route turns into the MappingModeler document. Tables, columns, classes and properties it names are checked against the schema and the validated version, " +
            "the ranges of its literals against the SQL types, and its relations with OntologyModels.getAllowedPropertiesBetweenNodes. The version is saved and becomes the mapping " +
            "MappingModeler opens. NDJSON events: stepStart and stepEnd (mapping, mappingChecks), writing, result, error.",
        operationId: "postOntologyFromDbMappings",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source"],
                    properties: {
                        source: { type: "string", description: "Source whose validated version is mapped." },
                        promptOnly: { type: "boolean", description: "Return the assembled prompt without calling the LLM." },
                        answer: { type: "string", description: "Answer of an earlier call to convert, check and save again, without calling the LLM." },
                    },
                },
            },
        ],
        responses: {
            200: { description: "promptOnly: { prompt, promptCharacters }. A generation: NDJSON events ending with a result event or an error event." },
            404: { description: "The source is unknown to the user." },
            409: { description: "The source imports no validated version, or its database is no longer configured." },
        },
        tags: ["AI"],
    };

    PUT.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Make a mapping version the one MappingModeler opens",
        description:
            "Writes the version to `data/graphs/mappings_<source>_ALL.json`. A file edited in MappingModeler since the active version, or written before any version, " +
            "is saved first as a version of kind mappingModeler.",
        operationId: "putOntologyFromDbMappings",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: { type: "object", required: ["source", "mappingName"], properties: { source: { type: "string" }, mappingName: { type: "string" } } },
            },
        ],
        responses: {
            200: { description: "{ activeMappingName, keptMappingName }: keptMappingName names the version the replaced file was saved as, or is null." },
            404: { description: "The source or the mapping version is unknown." },
        },
        tags: ["AI"],
    };

    DELETE.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Delete a mapping version",
        description: "Deletes the file of a mapping version. The active version is refused.",
        operationId: "deleteOntologyFromDbMappings",
        parameters: [sourceParameter, { name: "mappingName", in: "query", type: "string", required: true, description: "Mapping version name, as GET lists it." }],
        responses: {
            200: { description: "{ deleted }" },
            404: { description: "The source or the mapping version is unknown." },
            409: { description: "The version is the one MappingModeler opens." },
        },
        tags: ["AI"],
    };

    return operations;
}
