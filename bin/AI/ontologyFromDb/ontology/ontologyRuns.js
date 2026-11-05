import { mkdir, readdir, readFile, rename, rm, writeFile } from "fs/promises";
import { join, resolve as resolvePath } from "path";
import rdflib from "rdflib";
import httpProxy from "../../../httpProxy.js";
import { rdfDataModel } from "../../../../model/rdfData.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";
import { sourceModel } from "../../../../model/sources.js";
import userManager from "../../../user.js";
import { tryCheckRunRestrictions, getNotAllowedRestrictionText } from "./restrictionCheck.js";

// a source has one ontology: <source>_ontology.json in the folder of its database, its graph the draft the generation, the chatbot and the whiteboard write
const llmAnswersDirectory = resolvePath("data", "semanticVirtualDB");
const nonNameCharacterRegex = /[^A-Za-z0-9_-]/g;
const timestampSeparatorRegex = /[:.]/g;
const trailingSlashRegex = /\/$/;
const turtleExtension = ".ttl";
const runNameSuffix = "ontology";
const failedGenerationSuffix = "failedGeneration";
const validatedTriplesSuffix = "validatedTriples";
// a draft is small, a batch keeps the SPARQL update far below the request size limits
const updatedTriplesPerQuery = 200;
// the samples, profiles and overlaps measured on a database, read again by the next runs on it
const databaseChecksFileName = "databaseChecks.json";

// the generations running in this server process, by source: a page opened during a run finds it there
const runningGenerations = {};
// how the last generation of each source ended, for a page that did not start it
const lastGenerationEnds = {};

// an ISO date a file name accepts, as 2026-10-27T12-45-25-821Z
function getNewRunTimestamp() {
    return new Date().toISOString().replace(timestampSeparatorRegex, "-");
}

function getRunName(source) {
    return (source + "_" + runNameSuffix).replace(nonNameCharacterRegex, "_");
}

// the draft sits under the graph of its source, so it reads as an annex of that source
function getDraftGraphUri(sourceGraphUri) {
    return sourceGraphUri.replace(trailingSlashRegex, "") + "/semanticvirtualdb/";
}

// a validation writes the draft in the graph of the source itself; null before the first one
function getValidatedSource(source, run) {
    return run?.savedRun?.validatedAt ? source : null;
}

function getRunProblems(savedRun) {
    const notAllowedChecks = (savedRun?.restrictionChecks || []).filter((restrictionCheck) => restrictionCheck.status == "notAllowed");
    const notAllowedTexts = notAllowedChecks.map(getNotAllowedRestrictionText);
    // once its graph is checked, what the graph holds replaces what writing the Turtle met, see updateGraphCheck
    const contentProblems = savedRun?.graphProblems ?? savedRun?.answerProblems ?? [];
    const runProblems = [...contentProblems, ...notAllowedTexts];
    // no graph to check, a check that failed, or a run saved before the check existed
    if (!savedRun?.restrictionChecks) {
        const notCheckedReason = savedRun?.restrictionCheckError ?? savedRun?.graphError ?? savedRun?.failure ?? savedRun?.answerError;
        runProblems.push("restrictions not checked" + (notCheckedReason ? ": " + notCheckedReason : ""));
    }
    return runProblems;
}

// the ontology of a source, whatever database it was built from; null before the first generation
async function readSourceRun(source) {
    const runName = getRunName(source);
    let databaseFolders = [];
    try {
        databaseFolders = await readdir(llmAnswersDirectory, { withFileTypes: true });
    } catch (readError) {
        // nothing saved yet on this server
        if (readError.code == "ENOENT") {
            return null;
        }
        throw readError;
    }
    for (const databaseFolder of databaseFolders) {
        if (!databaseFolder.isDirectory()) {
            continue;
        }
        const fileNames = await readdir(join(llmAnswersDirectory, databaseFolder.name));
        if (!fileNames.includes(runName + ".json")) {
            continue;
        }
        const runPath = join(llmAnswersDirectory, databaseFolder.name, runName);
        const savedRun = JSON.parse(await readFile(runPath + ".json", "utf8"));
        // two source names differing only by characters a file name replaces share the file name
        if (savedRun.source != source) {
            continue;
        }
        return {
            runName: runName,
            database: databaseFolder.name,
            turtlePath: runPath + turtleExtension,
            jsonPath: runPath + ".json",
            // kept until its graph is loaded: a load that failed is done again without paying the model
            hasPendingTurtle: fileNames.includes(runName + turtleExtension),
            savedRun: savedRun,
        };
    }
    return null;
}

// the source config of the user, or the HTTP error to answer
async function findUserSource(req, sourceName) {
    const userInfo = await userManager.getUser(req.user);
    const userSources = await sourceModel.getUserSources(userInfo.user);
    if (!userSources[sourceName]) {
        return { status: 404, error: sourceName + " not found" };
    }
    return { userInfo: userInfo, userSources: userSources, sourceConfig: userSources[sourceName] };
}

// the source config of the user and its ontology, null before the first generation, or the HTTP error to answer
async function findSourceOntology(req, sourceName) {
    const found = await findUserSource(req, sourceName);
    if (found.error) {
        return found;
    }
    found.run = await readSourceRun(sourceName);
    return found;
}

// the same for a route that needs an ontology
async function findSourceRun(req, sourceName) {
    const found = await findSourceOntology(req, sourceName);
    if (found.error) {
        return found;
    }
    if (!found.run) {
        return { status: 404, error: "no ontology generated yet for " + sourceName };
    }
    return found;
}

function postSparqlUpdate(sparqlServer, query) {
    const params = { query: query };
    if (sparqlServer.user) {
        params.auth = { user: sparqlServer.user, pass: sparqlServer.password, sendImmediately: false };
    }
    return new Promise((resolve, reject) => {
        httpProxy.post(sparqlServer.url, null, params, (error) => (error ? reject(new Error(String(error))) : resolve()));
    });
}

// triples as N-Triples lines; a delete of a triple the graph does not hold changes nothing
async function updateGraphTriples(graphUri, deletedTriples, insertedTriples) {
    const config = await mainConfigModel.getConfig();
    const batchCount = Math.ceil(Math.max(deletedTriples.length, insertedTriples.length) / updatedTriplesPerQuery);
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
        const batchStart = batchIndex * updatedTriplesPerQuery;
        const deletedBatch = deletedTriples.slice(batchStart, batchStart + updatedTriplesPerQuery);
        const insertedBatch = insertedTriples.slice(batchStart, batchStart + updatedTriplesPerQuery);
        const deleteClause = deletedBatch.length > 0 ? "DELETE {\n" + deletedBatch.join("\n") + "\n} " : "";
        const insertClause = insertedBatch.length > 0 ? "INSERT {\n" + insertedBatch.join("\n") + "\n} " : "";
        await postSparqlUpdate(config.sparql_server, "WITH GRAPH <" + graphUri + "> " + deleteClause + insertClause + "WHERE {}");
    }
}

// Virtuoso gives a genuine blank node as nodeID://, see sparql_OWL.js
async function deleteGenuineBlankNodeTriples(graphUri) {
    const config = await mainConfigModel.getConfig();
    const blankNodeFilter = 'FILTER(STRSTARTS(STR(?subject), "nodeID://") || STRSTARTS(STR(?object), "nodeID://"))';
    await postSparqlUpdate(config.sparql_server, "WITH GRAPH <" + graphUri + "> DELETE { ?subject ?predicate ?object } WHERE { ?subject ?predicate ?object . " + blankNodeFilter + " }");
}

// the only write that replaces a whole graph: a failed batch drops it, so a half written graph is never read as loaded, and the Turtle kept loads it again
async function loadTurtleIntoGraph(turtle, graphUri) {
    const store = rdflib.graph();
    rdflib.parse(turtle, store, graphUri, "text/turtle");
    const triples = store.statements.map((statement) => statement.toNT());
    await rdfDataModel.deleteGraph(graphUri);
    try {
        await updateGraphTriples(graphUri, [], triples);
    } catch (insertError) {
        await rdfDataModel.deleteGraph(graphUri);
        throw insertError;
    }
    return store.statements.length;
}

// the hierarchy of the local classes is read in the draft: no graph, no check
async function loadAndCheckTurtle(turtle, graphUri, source, upperOntologies, userContext) {
    const checkedDraft = { graphTripleCount: null, graphError: null, restrictionChecks: null, restrictionCheckError: null };
    try {
        checkedDraft.graphTripleCount = await loadTurtleIntoGraph(turtle, graphUri);
    } catch (loadError) {
        checkedDraft.graphError = loadError.message;
    }
    if (!checkedDraft.graphTripleCount) {
        return checkedDraft;
    }
    const restrictionCheckResult = await tryCheckRunRestrictions(turtle, graphUri, source, upperOntologies, userContext);
    checkedDraft.restrictionChecks = restrictionCheckResult.restrictionChecks;
    checkedDraft.restrictionCheckError = restrictionCheckResult.restrictionCheckError;
    return checkedDraft;
}

// given a Turtle, its graph is still to load; without one, it is loaded and the Turtle is removed. A source built from another database leaves no file there
async function saveRun(databaseFolder, savedRun, turtle) {
    const runName = getRunName(savedRun.source);
    const previousRun = await readSourceRun(savedRun.source);
    const databaseAnswersDirectory = join(llmAnswersDirectory, databaseFolder);
    await mkdir(databaseAnswersDirectory, { recursive: true });
    await writeFile(join(databaseAnswersDirectory, runName + ".json"), JSON.stringify(savedRun, null, 2));
    if (turtle) {
        await writeFile(join(databaseAnswersDirectory, runName + turtleExtension), turtle);
    } else {
        await rm(join(databaseAnswersDirectory, runName + turtleExtension), { force: true });
    }
    if (previousRun && previousRun.database != databaseFolder) {
        await rm(previousRun.jsonPath, { force: true });
        await rm(previousRun.turtlePath, { force: true });
    }
}

// a generation that produced no Turtle leaves the ontology as it is, and is kept aside: a paid answer is never lost
async function saveFailedGeneration(databaseFolder, savedRun) {
    const databaseAnswersDirectory = join(llmAnswersDirectory, databaseFolder);
    await mkdir(databaseAnswersDirectory, { recursive: true });
    const failedRunName = (savedRun.source + "_" + failedGenerationSuffix + "_" + getNewRunTimestamp()).replace(nonNameCharacterRegex, "_");
    await writeFile(join(databaseAnswersDirectory, failedRunName + ".json"), JSON.stringify(savedRun, null, 2));
}

// what the last validation wrote in the graph of the source, whose other triples are not ours: outside the database folders, a generation may change of database
function getValidatedTriplesPath(source) {
    return join(llmAnswersDirectory, (source + "_" + validatedTriplesSuffix).replace(nonNameCharacterRegex, "_") + ".nt");
}

// { inspectionsByTable: { table: { columnNames, sampleTexts, profile } }, overlapsByPairKey: { "a.x=b.y": sharedDistinctValues } },
// empty before the first run
async function readDatabaseChecks(databaseFolder) {
    try {
        return JSON.parse(await readFile(join(llmAnswersDirectory, databaseFolder, databaseChecksFileName), "utf8"));
    } catch (readError) {
        // a file cut by a stopped server is counted again rather than blocking every run
        if (readError.code == "ENOENT" || readError instanceof SyntaxError) {
            return { inspectionsByTable: {}, overlapsByPairKey: {} };
        }
        throw readError;
    }
}

async function saveDatabaseChecks(databaseFolder, databaseChecks) {
    const databaseAnswersDirectory = join(llmAnswersDirectory, databaseFolder);
    await mkdir(databaseAnswersDirectory, { recursive: true });
    // written aside then renamed: a run reading the file never finds it half written
    const temporaryPath = join(databaseAnswersDirectory, databaseChecksFileName + ".tmp");
    await writeFile(temporaryPath, JSON.stringify(databaseChecks));
    await rename(temporaryPath, join(databaseAnswersDirectory, databaseChecksFileName));
}

export {
    llmAnswersDirectory,
    nonNameCharacterRegex,
    trailingSlashRegex,
    runningGenerations,
    lastGenerationEnds,
    getNewRunTimestamp,
    getRunName,
    getValidatedSource,
    getRunProblems,
    getDraftGraphUri,
    getValidatedTriplesPath,
    readSourceRun,
    findUserSource,
    findSourceOntology,
    findSourceRun,
    updateGraphTriples,
    deleteGenuineBlankNodeTriples,
    loadTurtleIntoGraph,
    loadAndCheckTurtle,
    saveRun,
    saveFailedGeneration,
    readDatabaseChecks,
    saveDatabaseChecks,
};
