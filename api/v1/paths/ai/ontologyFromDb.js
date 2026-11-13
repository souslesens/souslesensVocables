import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
    nonNameCharacterRegex,
    runningGenerations,
    lastGenerationEnds,
    getRunName,
    getDraftGraphUri,
    readSourceRun,
    loadTurtleIntoGraph,
    loadAndCheckTurtle,
    saveRun,
    saveFailedGeneration,
    readDatabaseChecks,
} from "../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { fixNotAllowedRestrictions } from "../../../../bin/AI/ontologyFromDb/ontology/restrictionFix.js";
import {
    ontologyModelId,
    ontologyReasoningEffort,
    modelMaxOutputTokens,
    jsonBlockRegex,
    createMessage,
    getCutAnswerError,
    getAnswerText,
    toJsonBlock,
    getTermNamespace,
    getAnswerTurtle,
} from "../../../../bin/AI/ontologyFromDb/ontology/ontologyAnswer.js";
import userManager from "../../../../bin/user.js";
import * as dbConnector from "../../../../bin/databases/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";
import { sourceModel } from "../../../../model/sources.js";
import { getUpperOntologyModelText } from "../../../../bin/AI/ontologyFromDb/upperOntologyModel.js";
import { checkRunRestrictions } from "../../../../bin/AI/ontologyFromDb/ontology/restrictionCheck.js";
import { describeDatabase } from "../../../../bin/AI/ontologyFromDb/databaseDescription.js";
import { indexSchemaColumns, readTableSamples, getLinkCandidatesPrompt, measureLinkCandidates, saveTableInspections, getOverlapsText } from "../../../../bin/AI/ontologyFromDb/databaseReading.js";
import { readSchemaFile } from "../../../../bin/AI/ontologyFromDb/schemaFile.js";
import { deleteVersionConversations } from "../../../../bin/AI/ontologyFromDb/revision/revisionConversations.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const ontologyBuildingPromptPath = join(currentDirectory, "../../../../bin/AI/ontologyFromDb/prompts/ontology_building_from_db.md");
const schemaOnlyPromptPath = join(currentDirectory, "../../../../bin/AI/ontologyFromDb/prompts/ontology_schema_only.md");

const sqlFileExtensionRegex = /\.sql$/i;
// the steps that read the data of a database, which a schema file does not hold
const databaseReadingSteps = ["profiles", "linkCandidates", "pairs"];
// keeps the runs of a schema file apart from those of a database of the same name, and from its databaseChecks.json
const schemaFileFolderSuffix = "_schemaFile";
const answerLabelRegex = /"label"\s*:\s*"([^"]+)"/g;
// the page is told what the model writes at most once a second
const writingProgressIntervalMs = 1000;
const generationStoppedMessage = "stopped by the user";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const runStart = Date.now();
        // a generation streams its progress, one JSON object per line; the prompt-only calls answer at once
        const isProgressStreamed = !req.body.promptOnly && !req.body.linkCandidatesPromptOnly;
        // the entry of this generation in runningGenerations, which pages opened later read
        let runningGeneration = null;
        let generationFailure = null;
        let restrictionFixError = null;
        const stopController = new AbortController();
        const stopSignal = stopController.signal;
        function sendProgress(progressEvent) {
            if (!isProgressStreamed || (req.body.schemaFile && databaseReadingSteps.includes(progressEvent.step))) {
                return;
            }
            if (progressEvent.type == "stepStart") {
                runningGeneration.step = progressEvent.step;
            }
            // the page that started the run may be closed: the run goes on and is saved all the same
            if (res.destroyed || res.writableEnded) {
                return;
            }
            if (!res.headersSent) {
                res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
                res.flushHeaders();
            }
            progressEvent.elapsedSeconds = Math.round((Date.now() - runStart) / 1000);
            res.write(JSON.stringify(progressEvent) + "\n");
        }
        const stepSeconds = {};
        function endStep(stepName, stepStart, stepDetails) {
            stepSeconds[stepName] = Math.round((Date.now() - stepStart) / 1000);
            sendProgress({ type: "stepEnd", step: stepName, seconds: stepSeconds[stepName], ...stepDetails });
        }
        function endStoppedPreparation() {
            sendProgress({ type: "result", isStopped: true, totalSeconds: Math.round((Date.now() - runStart) / 1000) });
            res.end();
        }

        try {
            const source = req.body.source;
            const databaseId = req.body.databaseId;
            const schemaFile = req.body.schemaFile;
            if (Boolean(databaseId) == Boolean(schemaFile)) {
                return res.status(400).json({ error: "give either a databaseId or a schemaFile" });
            }
            const upperOntologies = req.body.upperOntologies || [];

            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);
            const unknownSources = [source, ...upperOntologies].filter((sourceName) => !userSources[sourceName]);
            if (unknownSources.length > 0) {
                return res.status(404).json({ error: "sources not found: " + unknownSources.join(", ") });
            }
            if (isProgressStreamed) {
                if (runningGenerations[source]) {
                    return res.status(409).json({ error: "a generation is already running for " + source + ", started at " + runningGenerations[source].startedAt });
                }
                // stop stays out of the JSON the runs route answers
                runningGeneration = {
                    startedAt: new Date(runStart).toISOString(),
                    database: null,
                    step: null,
                    isStopping: false,
                    stop: function () {
                        runningGeneration.isStopping = true;
                        stopController.abort(new Error(generationStoppedMessage));
                    },
                };
                runningGenerations[source] = runningGeneration;
            }

            let connection = null;
            let database = null;
            let schema = null;
            let savedSchemaFile;
            if (schemaFile) {
                const schemaFileContent = readSchemaFile(schemaFile.text);
                if (schemaFileContent.error) {
                    return res.status(400).json({ error: schemaFileContent.error });
                }
                schema = schemaFileContent.schema;
                database = { database: schemaFile.name.replace(sqlFileExtensionRegex, "") + schemaFileFolderSuffix, driver: "postgres" };
                savedSchemaFile = { fileName: schemaFile.name, schema: schema, leftOutViewCount: schemaFileContent.leftOutViewCount, leftOutTables: schemaFileContent.leftOutTables };
            } else {
                connection = await databaseModel.getUserConnection(userInfo.user, databaseId);
                database = await databaseModel.getDatabase(databaseId);
                schema = await dbConnector.getSchemaDescription(connection, database.driver);
            }
            const clientDriver = databaseModel.getClientDriver(database.driver);
            const databaseFolder = database.database.replace(nonNameCharacterRegex, "_");
            if (runningGeneration) {
                runningGeneration.database = database.database;
            }
            // the samples, profiles and overlaps of the previous runs on the database, unless the caller asks to count again
            const databaseChecks = req.body.refreshDatabaseChecks ? { inspectionsByTable: {}, overlapsByPairKey: {} } : await readDatabaseChecks(databaseFolder);

            const preparationStart = Date.now();
            const { columnsByTable, columnsByQualifiedName } = indexSchemaColumns(schema);
            const tableNames = Object.keys(columnsByTable);
            if (savedSchemaFile) {
                endStep("schemaFile", preparationStart, {
                    tableCount: tableNames.length,
                    columnCount: schema.columns.length,
                    foreignKeyColumnCount: schema.foreignKeys.length,
                    leftOutViewCount: savedSchemaFile.leftOutViewCount,
                    leftOutTableCount: savedSchemaFile.leftOutTables.length,
                });
            }
            sendProgress({ type: "stepStart", step: "profiles", tableCount: tableNames.length, columnCount: schema.columns.length });
            // the samples first: the link candidates step reads the schema and the samples while the profiles are counted
            const tableInspections = await readTableSamples(connection, clientDriver, columnsByTable, databaseChecks, Boolean(schemaFile), stopSignal);
            const linkCandidatesPrompt = getLinkCandidatesPrompt(database, schema, columnsByTable, tableInspections);
            if (req.body.linkCandidatesPromptOnly) {
                return res.status(200).json({ prompt: linkCandidatesPrompt, promptCharacters: linkCandidatesPrompt.length });
            }
            const measuredLinks = await measureLinkCandidates({
                connection: connection,
                clientDriver: clientDriver,
                columnsByTable: columnsByTable,
                columnsByQualifiedName: columnsByQualifiedName,
                tableInspections: tableInspections,
                databaseChecks: databaseChecks,
                isSchemaFile: Boolean(schemaFile),
                stopSignal: stopSignal,
                sendProgress: sendProgress,
                endStep: endStep,
                preparationStart: preparationStart,
                linkCandidatesPrompt: linkCandidatesPrompt,
                givenLinkCandidates: req.body.linkCandidates,
            });
            const { linkCandidates, linkCandidatesAnswer, linkCandidatesModel, linkCandidatesError, linkCandidatesUsage, measuredOverlaps } = measuredLinks;
            const preparationSeconds = Math.round((Date.now() - preparationStart) / 1000);
            const databaseText = describeDatabase(database, schema, columnsByTable, tableInspections);
            try {
                if (!schemaFile) {
                    await saveTableInspections(databaseFolder, databaseChecks, tableInspections);
                }
            } catch (writeError) {
                console.warn("[ai/ontologyFromDb] database checks not saved: " + writeError.message);
            }
            // after the save: what was measured before the stop serves the next run
            if (stopSignal.aborted) {
                return endStoppedPreparation();
            }
            const overlapsText = getOverlapsText(measuredLinks, Boolean(schemaFile));

            const upperOntologiesStart = Date.now();
            sendProgress({ type: "stepStart", step: "upperOntologies", sources: upperOntologies });
            const ontologiesModel = await getUpperOntologyModelText(upperOntologies, { user: userInfo, userSources: userSources });
            const ontologiesText = ontologiesModel.text;
            endStep("upperOntologies", upperOntologiesStart, {});
            if (stopSignal.aborted) {
                return endStoppedPreparation();
            }

            const basePrompt = readFileSync(ontologyBuildingPromptPath, "utf8");
            const sourceConfig = userSources[source];
            const termNamespace = getTermNamespace(sourceConfig);
            const prompt =
                basePrompt +
                (schemaFile ? "\n\n" + readFileSync(schemaOnlyPromptPath, "utf8") : "") +
                "\n\n# Inputs\n\nSource whose ontology is built: " +
                source +
                "\nGraph: " +
                sourceConfig.graphUri +
                "\nNamespace of its terms: " +
                termNamespace +
                "\n\n## Database\n\n" +
                databaseText +
                overlapsText +
                "\n# Upper ontologies, most abstract first\n" +
                ontologiesText;
            if (req.body.promptOnly) {
                return res.status(200).json({
                    prompt: prompt,
                    promptCharacters: prompt.length,
                    measuredOverlapCount: measuredOverlaps.length,
                    preparationSeconds: preparationSeconds,
                    linkCandidates: linkCandidates,
                    linkCandidatesError: linkCandidatesError,
                    linkCandidatesUsage: linkCandidatesUsage,
                });
            }

            const usage = { input_tokens: 0, output_tokens: 0 };
            let completion = null;
            let failure = null;
            const ontologyStart = Date.now();
            // what the model wrote before a failure is paid all the same: it is saved as the answer of the run
            let writtenText = "";
            if (!req.body.answer) {
                sendProgress({ type: "stepStart", step: "ontology", model: ontologyModelId, reasoningEffort: ontologyReasoningEffort, promptCharacters: prompt.length });
                let reasoningText = "";
                let labelScanPosition = 0;
                let sentReasoningLength = 0;
                let lastWritingProgress = 0;
                const sendWritingProgress = function (isLastTick) {
                    if (!isLastTick && Date.now() - lastWritingProgress < writingProgressIntervalMs) {
                        return;
                    }
                    lastWritingProgress = Date.now();
                    const newLabels = [];
                    // a label cut in the middle is left for the next tick
                    const unscannedText = writtenText.slice(labelScanPosition);
                    let scannedLength = 0;
                    for (const labelMatch of unscannedText.matchAll(answerLabelRegex)) {
                        newLabels.push(labelMatch[1]);
                        scannedLength = labelMatch.index + labelMatch[0].length;
                    }
                    labelScanPosition += scannedLength;
                    // the page appends the reasoning, so each tick carries only what came since the last one
                    const newReasoning = reasoningText.slice(sentReasoningLength);
                    sentReasoningLength = reasoningText.length;
                    sendProgress({
                        type: "writing",
                        writtenCharacters: writtenText.length,
                        reasoningCharacters: reasoningText.length,
                        newReasoning: newReasoning,
                        newLabels: newLabels,
                    });
                };
                const ontologyMessage = {
                    messages: [{ role: "user", content: prompt }],
                    maxTokens: modelMaxOutputTokens,
                    model: ontologyModelId,
                    reasoningEffort: ontologyReasoningEffort,
                    abortSignal: stopSignal,
                    onTextDelta: function (textDelta) {
                        writtenText += textDelta;
                        sendWritingProgress();
                    },
                    onReasoningDelta: function (reasoningDelta) {
                        reasoningText += reasoningDelta;
                        sendWritingProgress();
                    },
                };
                try {
                    completion = await createMessage(ontologyMessage, usage);
                } catch (llmError) {
                    console.warn("[ai/ontologyFromDb] " + llmError.message);
                    // each provider words an abort its own way
                    failure = stopSignal.aborted ? generationStoppedMessage : llmError.message;
                }
                sendWritingProgress(true);
            }
            endStep("ontology", ontologyStart, { usage: usage, failure: failure, isStopped: stopSignal.aborted });

            const answerText = req.body.answer || getAnswerText(completion) || writtenText;
            const answerMatch = answerText.match(jsonBlockRegex);
            let ontologyAnswer = null;
            let answerError = getCutAnswerError(completion, answerText);
            if (!answerError && !answerMatch && !failure) {
                answerError = "the answer holds no JSON block, see the answer saved with the run";
            }
            if (answerMatch) {
                try {
                    ontologyAnswer = JSON.parse(answerMatch[1]);
                } catch (parseError) {
                    answerError = "the JSON of the answer could not be read: " + parseError.message;
                }
            }
            const upperOntologyGraphUris = upperOntologies.map((upperOntology) => userSources[upperOntology].graphUri);
            let answerOntology = null;
            // an answer of an unexpected shape must not stop the save of a paid generation
            try {
                answerOntology = ontologyAnswer ? getAnswerTurtle(ontologyAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris) : null;
            } catch (conversionError) {
                answerError = "answer not turned into Turtle: " + conversionError.message;
            }
            let turtle = answerOntology ? answerOntology.turtle : null;

            const runName = getRunName(source);
            const runGraphUri = getDraftGraphUri(sourceConfig.graphUri);
            const previousSavedRun = (await readSourceRun(source))?.savedRun;
            let graphTripleCount = null;
            let graphError = null;
            let restrictionChecks = null;
            let restrictionCheckError = null;
            let restrictionFix = null;
            let savedAnswerText = answerText;
            let saveError = null;
            function getSavedRun() {
                return {
                    source: source,
                    database: database.database,
                    databaseId: databaseId,
                    schemaFile: savedSchemaFile,
                    upperOntologies: upperOntologies,
                    model: completion?.model ?? null,
                    reasoningEffort: completion ? ontologyReasoningEffort : null,
                    stopReason: completion?.stop_reason ?? null,
                    failure: failure,
                    usage: usage,
                    totalSeconds: Math.round((Date.now() - runStart) / 1000),
                    stepSeconds: stepSeconds,
                    graphUri: turtle ? runGraphUri : null,
                    graphTripleCount: graphTripleCount,
                    graphError: graphError,
                    restrictionChecks: restrictionChecks,
                    restrictionCheckError: restrictionCheckError,
                    preparationSeconds: preparationSeconds,
                    linkCandidatesModel: linkCandidatesModel,
                    linkCandidatesUsage: linkCandidatesUsage,
                    linkCandidates: linkCandidates,
                    linkCandidatesError: linkCandidatesError,
                    linkCandidatesAnswer: linkCandidatesAnswer,
                    measuredOverlaps: measuredOverlaps,
                    report: ontologyAnswer?.report ?? null,
                    answerError: answerError,
                    answerProblems: answerOntology?.problems ?? null,
                    restrictionFix: restrictionFix,
                    // the graph of the source stays validated until the next validation
                    validatedAt: previousSavedRun?.validatedAt,
                    validatedGraphHash: previousSavedRun?.validatedGraphHash,
                    answer: savedAnswerText,
                };
            }
            // written before the load empties the draft: a load that fails is done again without paying the model
            async function saveRunBeforeLoad() {
                try {
                    await saveRun(databaseFolder, getSavedRun(), turtle);
                } catch (writeError) {
                    console.warn("[ai/ontologyFromDb] answer not saved: " + writeError.message);
                    saveError = writeError.message;
                }
            }
            // last moment a stop leaves the draft and the run file as they are, even with a whole answer written
            if (stopSignal.aborted) {
                turtle = null;
                failure = generationStoppedMessage;
            }
            if (turtle) {
                await saveRunBeforeLoad();
            }
            if (turtle && !saveError) {
                const graphStart = Date.now();
                sendProgress({ type: "stepStart", step: "graph", graphUri: runGraphUri });
                try {
                    graphTripleCount = await loadTurtleIntoGraph(turtle, runGraphUri);
                } catch (loadError) {
                    graphError = loadError.message;
                }
                endStep("graph", graphStart, { tripleCount: graphTripleCount, error: graphError });
            }
            // the hierarchy of the local classes is read in the draft: no graph, no check
            // the load itself is never cut, it would leave half a draft
            if (graphTripleCount && !stopSignal.aborted) {
                const restrictionCheckStart = Date.now();
                sendProgress({ type: "stepStart", step: "restrictionCheck" });
                try {
                    restrictionChecks = await checkRunRestrictions(turtle, runGraphUri, source, upperOntologies, { user: userInfo, userSources: userSources });
                } catch (checkError) {
                    restrictionCheckError = checkError.message || String(checkError);
                }
                const notAllowedChecks = (restrictionChecks || []).filter((restrictionCheck) => restrictionCheck.status == "notAllowed");
                const uncheckedChecks = (restrictionChecks || []).filter((restrictionCheck) => restrictionCheck.status == "unchecked");
                endStep("restrictionCheck", restrictionCheckStart, {
                    checkedCount: restrictionChecks ? restrictionChecks.length : 0,
                    notAllowedCount: notAllowedChecks.length,
                    uncheckedCount: uncheckedChecks.length,
                    error: restrictionCheckError,
                });
            }

            // a second turn on the refused restrictions, checked once more: what stays refused is a problem of the ontology
            const refusedChecks = (restrictionChecks || []).filter((restrictionCheck) => restrictionCheck.status == "notAllowed");
            if (refusedChecks.length > 0 && !stopSignal.aborted) {
                const restrictionFixStart = Date.now();
                sendProgress({ type: "stepStart", step: "restrictionFix", model: ontologyModelId, reasoningEffort: ontologyReasoningEffort });
                let fixedAnswer = null;
                ({ fixedAnswer, restrictionFix } = await fixNotAllowedRestrictions(ontologyAnswer, refusedChecks, stopSignal));
                let fixedAnswerOntology = null;
                if (fixedAnswer) {
                    try {
                        fixedAnswerOntology = getAnswerTurtle(fixedAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris);
                    } catch (conversionError) {
                        // the ontology keeps the generated answer: no fix of the turn is applied
                        restrictionFix.error = "fixed answer not turned into Turtle: " + conversionError.message;
                        restrictionFix.replacedCount = 0;
                        restrictionFix.removedCount = 0;
                    }
                }
                if (fixedAnswerOntology) {
                    answerOntology = fixedAnswerOntology;
                    turtle = fixedAnswerOntology.turtle;
                    // the generated answer stays in the record of the turn
                    restrictionFix.generatedAnswer = answerText;
                    savedAnswerText = toJsonBlock(fixedAnswer);
                    await saveRunBeforeLoad();
                    ({ graphTripleCount, graphError, restrictionChecks, restrictionCheckError } = await loadAndCheckTurtle(turtle, runGraphUri, source, upperOntologies, {
                        user: userInfo,
                        userSources: userSources,
                    }));
                }
                const stillRefusedChecks = (restrictionChecks || []).filter((restrictionCheck) => restrictionCheck.status == "notAllowed");
                endStep("restrictionFix", restrictionFixStart, {
                    usage: restrictionFix.usage,
                    replacedCount: restrictionFix.replacedCount,
                    removedCount: restrictionFix.removedCount,
                    notAllowedCount: stillRefusedChecks.length,
                    error: restrictionFix.error ?? graphError ?? restrictionCheckError,
                    isStopped: stopSignal.aborted,
                });
            }
            const totalSeconds = Math.round((Date.now() - runStart) / 1000);

            const isGraphLoaded = Boolean(turtle && graphTripleCount && !graphError);
            const savedRun = getSavedRun();
            try {
                if (isGraphLoaded) {
                    // the graph is the reference from now on
                    delete savedRun.answer;
                    await saveRun(databaseFolder, savedRun, null);
                    await deleteVersionConversations(source, "ontology", runName);
                } else if (turtle) {
                    await saveRun(databaseFolder, savedRun, turtle);
                } else {
                    await saveFailedGeneration(databaseFolder, savedRun);
                }
            } catch (writeError) {
                console.warn("[ai/ontologyFromDb] answer not saved: " + writeError.message);
                saveError = writeError.message;
            }

            const savedAs = saveError ? null : "data/semanticVirtualDB/" + databaseFolder + "/" + runName;
            // a stop is no failure, and the error of a cut restriction fix is only that stop
            const modelFailure = stopSignal.aborted ? null : failure;
            restrictionFixError = stopSignal.aborted ? null : (restrictionFix?.error ?? null);
            generationFailure = modelFailure ?? answerError ?? graphError ?? saveError;
            sendProgress({
                type: "result",
                runName: runName,
                isStopped: stopSignal.aborted,
                // the ontology is there, this reaches the page as an error of the run and not as its failure
                restrictionFixError: restrictionFixError,
                failure: modelFailure,
                model: completion?.model ?? null,
                answerError: answerError,
                answerProblems: answerOntology?.problems ?? null,
                stopReason: completion?.stop_reason ?? null,
                usage: usage,
                linkCandidatesUsage: linkCandidatesUsage,
                linkCandidatesError: linkCandidatesError,
                totalSeconds: totalSeconds,
                stepSeconds: stepSeconds,
                graphUri: savedRun.graphUri,
                isLoadPending: Boolean(turtle) && !isGraphLoaded,
                graphTripleCount: graphTripleCount,
                graphError: graphError,
                restrictionChecks: restrictionChecks,
                restrictionCheckError: restrictionCheckError,
                savedAs: savedAs,
                saveError: saveError,
            });
            res.end();
        } catch (error) {
            console.error("ontologyFromDb route error:", error);
            generationFailure = error.message;
            if (!res.headersSent) {
                return res.status(error.status || 500).json({ error: error.message });
            }
            sendProgress({ type: "error", error: error.message });
            res.end();
        } finally {
            if (runningGeneration && runningGenerations[req.body.source] === runningGeneration) {
                delete runningGenerations[req.body.source];
                lastGenerationEnds[req.body.source] = { isStopped: stopSignal.aborted, failure: generationFailure, restrictionFixError: restrictionFixError };
            }
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictAdmin: [] }],
        summary: "Generate a domain ontology from a database and the upper ontologies of a source",
        description:
            "Builds the `bin/AI/ontologyFromDb/prompts/ontology_building_from_db.md` prompt with the database schema (columns, nullability, primary and foreign keys, " +
            "sample rows, row count and per column distinct and null counts), the overlaps measured beforehand between the pairs of columns " +
            "a first LLM call (Claude Haiku 5.5) proposes from the database description alone (150 at most) and the enriched model of the upper ontologies (as GET /ontologyModels/enriched returns it), most abstract first, then calls Claude Opus 5.5 once, at medium reasoning effort, through OpenRouter. " +
            "The answer is one compact JSON object (classes, restrictions, datatype properties, individuals, groups, report) that the route turns into Turtle. " +
            "A source has one ontology. A run that produced a Turtle replaces it: saved under `data/semanticVirtualDB/<database>/<source>_ontology`, the Turtle in a `.ttl` file, the report, the problems met while writing the Turtle and the whole answer in a `.json` file, the Turtle is then loaded into the draft `<source graphUri>/semanticvirtualdb/`. " +
            "Once loaded, the graph is the reference: the `.ttl` and the answer are removed, the conversations and the chatbot changes of the ontology replaced go, the graph of the source stays as validated until the next validation. A load that failed keeps them, and POST /ai/ontologyFromDb/runs loads the Turtle again. " +
            "A run that produced no Turtle leaves the ontology as it is, and is kept as `<source>_failedGeneration_<timestamp>.json`. " +
            "Each restriction of the draft is then checked with OntologyModels.getAllowedPropertiesBetweenNodes against the domains and ranges of the upper ontologies, inherited ones included: allowed, notAllowed, or unchecked when the property has no named domain nor range. " +
            "When some are notAllowed, a second call of the same model (`bin/AI/ontologyFromDb/prompts/ontology_restriction_fix.md`) gets them, with the properties whose domain or range fit each class and target, and chooses for each one of those properties or its removal, a property outside them being refused; " +
            "the Turtle is written again, loaded and checked once more, and the run file keeps that turn under restrictionFix, the generated answer included. " +
            "A `schemaFile` replaces the database: a plain SQL dump of a Postgres schema, its tables, keys and comments are the only evidence, no sample, profile, link candidate nor overlap is read, and the `bin/AI/ontologyFromDb/prompts/ontology_schema_only.md` rules are added to the prompt. " +
            "A generation answers in NDJSON, one event per line while it runs: stepStart and stepEnd (profiles, linkCandidates, pairs, upperOntologies, ontology, graph, restrictionCheck, restrictionFix) with their seconds, " +
            "progress (tables profiled, pairs measured; the samples, profiles and overlaps of earlier runs on the database are read from its databaseChecks.json), writing (characters written, reasoning excerpt, labels completed) and a last result event with the total time, or an error event. " +
            "POST /ai/ontologyFromDb/stop stops it: before the answer of the model is whole, the draft stays and what the model wrote is kept as a failed generation; once its load has started, the load ends and the steps after it are skipped; isStopped is set on the result event.",
        operationId: "postOntologyFromDb",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source"],
                    properties: {
                        source: { type: "string", description: "Source the ontology is built for." },
                        databaseId: { type: "string", description: "Database id from `databases.json`. Required unless a schemaFile is given." },
                        schemaFile: {
                            type: "object",
                            required: ["name", "text"],
                            properties: { name: { type: "string" }, text: { type: "string" } },
                            description: "Name and content of a plain SQL dump of a Postgres schema, read in place of a database.",
                        },
                        upperOntologies: { type: "array", items: { type: "string" }, description: "Imports of the source, most abstract first." },
                        promptOnly: { type: "boolean", description: "Return the assembled prompt without calling the LLM." },
                        linkCandidatesPromptOnly: { type: "boolean", description: "Return the prompt of the link candidates step (database description only) without calling any LLM." },
                        linkCandidates: {
                            type: "object",
                            properties: {
                                pairs: { type: "array", items: { type: "object", properties: { left: { type: "string" }, right: { type: "string" } } } },
                                repeatingTables: { type: "array", items: { type: "array", items: { type: "string" } } },
                            },
                            description:
                                "Pairs of columns to measure, as the link candidates step returns them: { pairs: [{ left: table.column, right: table.column }], repeatingTables: [[table, table]] }. Skips that step.",
                        },
                        answer: { type: "string", description: "Answer of an earlier call to turn into Turtle and load in the draft, without calling the LLM." },
                        refreshDatabaseChecks: {
                            type: "boolean",
                            description:
                                "Read the samples, profiles and overlaps from the database again instead of the ones the earlier runs saved in `data/semanticVirtualDB/<database>/databaseChecks.json`.",
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description:
                    "Prompt-only calls: the prompt as JSON. A generation: NDJSON progress events ending with a result event (run name, draft graph, isLoadPending, total time, usage, problems) or an error event.",
            },
            400: { description: "Neither or both of databaseId and schemaFile, or a schema file that cannot be read." },
            404: { description: "A source is unknown to the user." },
            409: { description: "A generation is already running for the source." },
        },
        tags: ["AI"],
    };

    return operations;
}
