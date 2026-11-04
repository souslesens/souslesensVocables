// One run, server stopped, from the repository root: node scripts/utils/migrateVirtualDbCreatorToSingleOntology.js [--apply]
// Without --apply it only prints what it would do.
// For each source of the sls-virtual-db-creator plugin, keeps one ontology version: the validated one, else the newest with a Turtle.
// Its triples, the edits of its graph included, go to the draft <graphUri>/semanticvirtualdb/. A validated one is also written in the graph of the
// source, and its source <source>_TBOX_<version> is removed. The other files move to data/semanticVirtualDB/_archive/, nothing is deleted from the
// triple store: the old graphs <graphUri>/virtual-db-creator/<timestamp>/ stay until someone drops them.
import { copyFile, mkdir, readdir, readFile, rename, writeFile } from "fs/promises";
import { basename, join } from "path";
import rdflib from "rdflib";
import { rdfDataModel } from "../../model/rdfData.js";
import { sourceModel } from "../../model/sources.js";
import { llmAnswersDirectory, getRunName, getDraftGraphUri, getValidatedTriplesPath, updateGraphTriples, trailingSlashRegex } from "../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { readDraftTriples, getGraphHash } from "../../bin/AI/ontologyFromDb/ontology/draftGraph.js";

const isApplied = process.argv.includes("--apply");
const archiveFolderName = "_archive";
// <source>_<run timestamp>.json, as the versions were named
const versionFileRegex = /^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.json$/;
const tboxSourceInfix = "_TBOX_";
const mappingsFolderName = "mappings";
const mappingModelerDirectory = join("data", "graphs");
const blankNodeLabelPrefix = "_:bm";
const nonDigitRegex = /\D/g;

function getVersionGraphUri(sourceGraphUri, runTimestamp) {
    return sourceGraphUri.replace(trailingSlashRegex, "") + "/virtual-db-creator/" + runTimestamp + "/";
}

// the versions of every source, whatever database folder holds them
async function listVersionsBySource() {
    const versionsBySource = {};
    const entries = await readdir(llmAnswersDirectory, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name == archiveFolderName) {
            continue;
        }
        const fileNames = await readdir(join(llmAnswersDirectory, entry.name));
        for (const fileName of fileNames) {
            const versionMatch = fileName.match(versionFileRegex);
            if (!versionMatch) {
                continue;
            }
            const jsonPath = join(llmAnswersDirectory, entry.name, fileName);
            let savedRun = null;
            try {
                savedRun = JSON.parse(await readFile(jsonPath, "utf8"));
            } catch (readError) {
                console.warn("  not read, left in place: " + jsonPath + ": " + readError.message);
                continue;
            }
            const version = {
                database: entry.name,
                runTimestamp: versionMatch[2],
                jsonPath: jsonPath,
                turtlePath: jsonPath.slice(0, -".json".length) + ".ttl",
                hasTurtle: fileNames.includes(fileName.slice(0, -".json".length) + ".ttl"),
                savedRun: savedRun,
            };
            versionsBySource[savedRun.source] = versionsBySource[savedRun.source] ?? [];
            versionsBySource[savedRun.source].push(version);
        }
    }
    return versionsBySource;
}

// the triples of a version as N-Triples lines, its graph first: it holds the edits of the whiteboard. Genuine blank nodes become IRIs <_:b...>
async function readVersionTriples(version, sourceGraphUri) {
    const graphUri = getVersionGraphUri(sourceGraphUri, version.runTimestamp);
    const tripleCount = await rdfDataModel.getTripleCount(graphUri);
    const versionText = tripleCount > 0 ? await rdfDataModel.getGraphPartNt(graphUri, tripleCount, 0) : await readFile(version.turtlePath, "utf8");
    const store = rdflib.graph();
    rdflib.parse(versionText, store, graphUri, "text/turtle");
    function toText(term) {
        return term.termType == "BlankNode" ? "<" + blankNodeLabelPrefix + version.runTimestamp.replace(nonDigitRegex, "") + term.value + ">" : term.toNT();
    }
    return store.statements.map((statement) => toText(statement.subject) + " " + statement.predicate.toNT() + " " + toText(statement.object) + " .");
}

// a mapping names the source of each of its classes
async function replaceTboxSourceInMappings(database, source, tboxSources) {
    const paths = [join(mappingModelerDirectory, "mappings_" + source + "_ALL.json")];
    const mappingsDirectory = join(llmAnswersDirectory, database, mappingsFolderName);
    const mappingFileNames = await readdir(mappingsDirectory).catch(() => []);
    const mappingNamePrefix = source + "_mapping_";
    for (const mappingFileName of mappingFileNames) {
        if (mappingFileName.startsWith(mappingNamePrefix)) {
            paths.push(join(mappingsDirectory, mappingFileName));
        }
    }
    for (const path of paths) {
        const mappingText = await readFile(path, "utf8").catch(() => null);
        if (mappingText === null) {
            continue;
        }
        let replacedText = mappingText;
        for (const tboxSource of tboxSources) {
            replacedText = replacedText.split('"' + tboxSource + '"').join('"' + source + '"');
        }
        if (replacedText != mappingText) {
            await copyFile(path, path + ".beforeSingleOntology");
            await writeFile(path, replacedText);
            console.log("  rewritten: " + path);
        }
    }
}

async function migrateSource(source, versions, storedSources) {
    const storedSource = storedSources[source];
    if (!storedSource) {
        console.log(source + ": no longer declared, left in place");
        return;
    }
    const tboxSources = (storedSource.imports || []).filter((importedSource) => importedSource.startsWith(source + tboxSourceInfix));
    const allTboxSources = Object.keys(storedSources).filter((sourceName) => sourceName.startsWith(source + tboxSourceInfix));
    const validatedGraphUri = tboxSources.length > 0 ? storedSources[tboxSources[0]]?.graphUri : null;
    const versionsWithTurtle = versions.filter((version) => version.hasTurtle);
    versionsWithTurtle.sort((version1, version2) => version2.runTimestamp.localeCompare(version1.runTimestamp));
    const validatedVersion = versionsWithTurtle.find((version) => getVersionGraphUri(storedSource.graphUri, version.runTimestamp) == validatedGraphUri);
    const keptVersion = validatedVersion ?? versionsWithTurtle[0];
    if (!keptVersion) {
        console.log(source + ": " + versions.length + " versions, none with a Turtle: left in place");
        return;
    }
    const triples = await readVersionTriples(keptVersion, storedSource.graphUri);
    const otherImports = (storedSource.imports || []).filter((importedSource) => !tboxSources.includes(importedSource));
    console.log(
        source +
            ": keeps " +
            keptVersion.runTimestamp +
            (validatedVersion ? " (validated)" : " (newest)") +
            ", " +
            triples.length +
            " triples, archives " +
            (versions.length - 1) +
            " other versions" +
            (validatedVersion ? ", writes them in " + storedSource.graphUri + ", removes the sources " + allTboxSources.join(", ") : ""),
    );
    if (!isApplied) {
        return;
    }

    const draftGraphUri = getDraftGraphUri(storedSource.graphUri);
    await rdfDataModel.deleteGraph(draftGraphUri);
    await updateGraphTriples(draftGraphUri, [], triples);
    const savedRun = { ...keptVersion.savedRun, graphUri: draftGraphUri, graphHash: null };
    delete savedRun.answer;
    delete savedRun.ontologyVersion;
    delete savedRun.revision;
    if (validatedVersion) {
        await updateGraphTriples(storedSource.graphUri, [], triples);
        await writeFile(getValidatedTriplesPath(source), triples.join("\n"));
        savedRun.validatedAt = new Date().toISOString();
        savedRun.validatedGraphHash = getGraphHash(await readDraftTriples(draftGraphUri));
    }
    await writeFile(join(llmAnswersDirectory, keptVersion.database, getRunName(source) + ".json"), JSON.stringify(savedRun, null, 2));

    const archiveDirectory = join(llmAnswersDirectory, archiveFolderName, keptVersion.database);
    await mkdir(archiveDirectory, { recursive: true });
    for (const version of versions) {
        await rename(version.jsonPath, join(archiveDirectory, basename(version.jsonPath)));
        if (version.hasTurtle) {
            await rename(version.turtlePath, join(archiveDirectory, basename(version.turtlePath)));
        }
    }
    await replaceTboxSourceInMappings(keptVersion.database, source, allTboxSources);
    if (tboxSources.length > 0) {
        await sourceModel.updateSource({ ...storedSource, imports: otherImports });
    }
    for (const tboxSource of allTboxSources) {
        await sourceModel.deleteSource(tboxSource);
    }
}

const versionsBySource = await listVersionsBySource();
const storedSources = await sourceModel.getAllSources();
console.log((isApplied ? "APPLYING" : "DRY RUN, nothing changes; --apply to migrate") + "\n");
for (const [source, versions] of Object.entries(versionsBySource)) {
    await migrateSource(source, versions, storedSources);
}
process.exit(0);
