import { readdir, readFile } from "fs/promises";
import { join, resolve as resolvePath } from "path";
import rdflib from "rdflib";
import httpProxy from "../httpProxy.js";
import { rdfDataModel } from "../../model/rdfData.js";
import { mainConfigModel } from "../../model/mainConfig.js";

// each run of POST /ai/ontologyFromDb is saved as <source>_<run timestamp>.ttl and .json in the folder of its database
const llmAnswersDirectory = resolvePath("data", "semanticVirtualDB");
const nonNameCharacterRegex = /[^A-Za-z0-9_-]/g;
const runTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
const trailingSlashRegex = /\/$/;
const turtleExtension = ".ttl";
// a run graph is small, a batch keeps the SPARQL update far below the request size limits
const insertedTriplesPerQuery = 200;
// some sources store blank nodes as IRIs <_:b...>, which no RDF parser accepts
const blankNodeAsIriRegex = /<_:([^>]+)>/g;

function getRunName(source, runTimestamp) {
    return (source + "_" + runTimestamp).replace(nonNameCharacterRegex, "_");
}

// the graph of one run sits under the graph of its source, so it reads as an annex of that source
function getRunGraphUri(sourceGraphUri, runTimestamp) {
    return sourceGraphUri.replace(trailingSlashRegex, "") + "/virtual-db-creator/" + runTimestamp + "/";
}

// the runs of a source, whatever database they were built from, newest first, with the content of their run file
async function listSourceRuns(source) {
    const runNamePrefix = getRunName(source, "");
    let databaseFolders = [];
    try {
        databaseFolders = await readdir(llmAnswersDirectory, { withFileTypes: true });
    } catch (readError) {
        // no run saved yet on this server
        if (readError.code == "ENOENT") {
            return [];
        }
        throw readError;
    }
    const runs = [];
    for (const databaseFolder of databaseFolders) {
        if (!databaseFolder.isDirectory()) {
            continue;
        }
        const fileNames = await readdir(join(llmAnswersDirectory, databaseFolder.name));
        for (const fileName of fileNames) {
            if (!fileName.startsWith(runNamePrefix) || !fileName.endsWith(turtleExtension)) {
                continue;
            }
            const runName = fileName.slice(0, -turtleExtension.length);
            const runTimestamp = runName.slice(runNamePrefix.length);
            // a source whose name extends this one shares the prefix: its timestamp part does not parse
            if (!runTimestampRegex.test(runTimestamp)) {
                continue;
            }
            const runPath = join(llmAnswersDirectory, databaseFolder.name, runName);
            const run = { runName: runName, runTimestamp: runTimestamp, database: databaseFolder.name, turtlePath: runPath + turtleExtension, jsonPath: runPath + ".json", savedRun: null };
            // the first runs were saved with a Turtle file only
            try {
                run.savedRun = JSON.parse(await readFile(run.jsonPath, "utf8"));
            } catch (_readError) {
                run.savedRun = null;
            }
            // two source names differing only by characters a file name replaces share the prefix
            if (run.savedRun && run.savedRun.source != source) {
                continue;
            }
            runs.push(run);
        }
    }
    runs.sort((run1, run2) => run2.runTimestamp.localeCompare(run1.runTimestamp));
    return runs;
}

// the triples of a subject and of the blank nodes it nests travel in one query: a blank node label only holds inside one query
function getSubjectGroups(store) {
    const statementsByRootSubject = new Map();
    store.statements.forEach(function (statement) {
        let rootSubject = statement.subject;
        const climbedBlankNodes = [];
        // a cycle of blank nodes stops the climb at the first one met twice
        while (rootSubject.termType == "BlankNode" && !climbedBlankNodes.includes(rootSubject.value)) {
            climbedBlankNodes.push(rootSubject.value);
            const parentStatement = store.statementsMatching(null, null, rootSubject)[0];
            if (!parentStatement) {
                break;
            }
            rootSubject = parentStatement.subject;
        }
        const rootKey = rootSubject.toNT();
        if (!statementsByRootSubject.has(rootKey)) {
            statementsByRootSubject.set(rootKey, []);
        }
        statementsByRootSubject.get(rootKey).push(statement);
    });
    return [...statementsByRootSubject.values()];
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

// a failed batch drops the graph, so a half written graph is never read as loaded
async function loadTurtleIntoGraph(turtle, graphUri) {
    const store = rdflib.graph();
    rdflib.parse(turtle.replace(blankNodeAsIriRegex, "_:$1"), store, graphUri, "text/turtle");
    const config = await mainConfigModel.getConfig();
    await rdfDataModel.deleteGraph(graphUri);

    let batchTexts = [];
    let batchTripleCount = 0;
    const subjectGroups = getSubjectGroups(store);
    for (const [groupIndex, subjectStatements] of subjectGroups.entries()) {
        const statementTexts = subjectStatements.map((statement) => statement.toNT());
        batchTexts.push(...statementTexts);
        batchTripleCount += subjectStatements.length;
        const isLastGroup = groupIndex == subjectGroups.length - 1;
        if (batchTripleCount < insertedTriplesPerQuery && !isLastGroup) {
            continue;
        }
        try {
            // INSERT rather than INSERT DATA: Virtuoso refuses blank nodes in INSERT DATA
            await postSparqlUpdate(config.sparql_server, "WITH GRAPH <" + graphUri + "> INSERT {\n" + batchTexts.join("\n") + "\n} WHERE {}");
        } catch (insertError) {
            await rdfDataModel.deleteGraph(graphUri);
            throw insertError;
        }
        batchTexts = [];
        batchTripleCount = 0;
    }
    return store.statements.length;
}

export { llmAnswersDirectory, blankNodeAsIriRegex, nonNameCharacterRegex, trailingSlashRegex, getRunName, getRunGraphUri, listSourceRuns, loadTurtleIntoGraph };
