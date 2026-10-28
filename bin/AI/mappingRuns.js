import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { join, resolve as resolvePath } from "path";
import { llmAnswersDirectory, nonNameCharacterRegex } from "./ontologyRuns.js";

// the mapping versions of a source sit in the mappings folder of their database, next to its ontology runs
const mappingsFolderName = "mappings";
const mappingNameInfix = "_mapping_";
// the file MappingModeler opens for a source, as mappingColumnsGraph.js names it
const mappingModelerDirectory = resolvePath("data", "graphs");

function getMappingName(source, mappingTimestamp) {
    return (source + mappingNameInfix + mappingTimestamp).replace(nonNameCharacterRegex, "_");
}

function getMappingModelerPath(source) {
    return join(mappingModelerDirectory, "mappings_" + source + "_ALL.json");
}

// the mapping versions of a source, newest first, with the content of their file
async function listSourceMappings(source) {
    const mappingNamePrefix = (source + mappingNameInfix).replace(nonNameCharacterRegex, "_");
    let databaseFolders = [];
    try {
        databaseFolders = await readdir(llmAnswersDirectory, { withFileTypes: true });
    } catch (readError) {
        if (readError.code == "ENOENT") {
            return [];
        }
        throw readError;
    }
    const mappingVersions = [];
    for (const databaseFolder of databaseFolders) {
        if (!databaseFolder.isDirectory()) {
            continue;
        }
        const mappingsDirectory = join(llmAnswersDirectory, databaseFolder.name, mappingsFolderName);
        let mappingFileNames = [];
        try {
            mappingFileNames = await readdir(mappingsDirectory);
        } catch (_readError) {
            continue;
        }
        for (const mappingFileName of mappingFileNames) {
            if (!mappingFileName.startsWith(mappingNamePrefix) || !mappingFileName.endsWith(".json")) {
                continue;
            }
            const mappingPath = join(mappingsDirectory, mappingFileName);
            const savedMapping = JSON.parse(await readFile(mappingPath, "utf8"));
            mappingVersions.push({ mappingName: mappingFileName.slice(0, -".json".length), databaseFolder: databaseFolder.name, mappingPath: mappingPath, savedMapping: savedMapping });
        }
    }
    mappingVersions.sort((mapping1, mapping2) => mapping2.savedMapping.createdAt.localeCompare(mapping1.savedMapping.createdAt));
    return mappingVersions;
}

async function saveMappingVersion(databaseFolder, mappingName, savedMapping) {
    const mappingsDirectory = join(llmAnswersDirectory, databaseFolder, mappingsFolderName);
    await mkdir(mappingsDirectory, { recursive: true });
    await writeFile(join(mappingsDirectory, mappingName + ".json"), JSON.stringify(savedMapping, null, 2));
}

async function deleteMappingVersion(mappingPath) {
    await rm(mappingPath, { force: true });
}

// the mapping MappingModeler opens for the source, or null before the first one
async function readMappingModelerFile(source) {
    try {
        return JSON.parse(await readFile(getMappingModelerPath(source), "utf8"));
    } catch (readError) {
        if (readError.code == "ENOENT") {
            return null;
        }
        throw readError;
    }
}

// the version is written as the mapping MappingModeler opens, its name kept in options.config, which MappingModeler saves as it reads it
async function writeMappingModelerFile(source, mappingName, mapping) {
    const writtenMapping = structuredClone(mapping);
    writtenMapping.options.config.mappingVersion = mappingName;
    await mkdir(mappingModelerDirectory, { recursive: true });
    await writeFile(getMappingModelerPath(source), JSON.stringify(writtenMapping, null, 2));
}

// what a mapping states, its layout and the editor display flags left out: an edit in MappingModeler changes it, a moved node does not
function getMappingStatement(mapping) {
    // MappingModeler rewrites lastUpdate at every save, mappingVersion is ours
    const { lastUpdate: _lastUpdate, mappingVersion: _mappingVersion, ...statedConfig } = mapping.options?.config || {};
    const nodeStatements = (mapping.nodes || []).map((node) => JSON.stringify([node.id, node.data]));
    const edgeStatements = (mapping.edges || []).map((edge) => JSON.stringify([edge.from, edge.to, edge.data || null]));
    nodeStatements.sort();
    edgeStatements.sort();
    return JSON.stringify([nodeStatements, edgeStatements, statedConfig]);
}

export { getMappingName, getMappingModelerPath, listSourceMappings, saveMappingVersion, deleteMappingVersion, readMappingModelerFile, writeMappingModelerFile, getMappingStatement };
