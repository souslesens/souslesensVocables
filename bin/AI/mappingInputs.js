import { findSourceRuns, getRunGraphUri, isTboxSourceOf, readDatabaseChecks } from "./ontologyRuns.js";
import { getTermNamespace } from "./ontologyAnswer.js";
import { getMappingDocument, getLiteralRangeWarnings, checkMappingRelations } from "./mappingAnswer.js";
import { getImportedOntologies } from "./restrictionCheck.js";
import { getDatatypePropertyIris, getValidatedOntologyModelText } from "./upperOntologyModel.js";
import { describeDatabase } from "./databaseDescription.js";
import { callVocablesFunction } from "../remoteCodeRunner.js";
import { getSchemaDescription } from "../KG/dbConnector.js";
import { databaseModel } from "../../model/databases.js";

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
    // the database, the upper ontologies and the overlaps are read in the run file of the version
    if (!validatedRun?.savedRun) {
        return { status: 409, error: "the validated version " + tboxSource + " has no run file" };
    }
    const userContext = { user: found.userInfo, userSources: found.userSources };
    // the graph is the validated version, whatever answer format produced it and whatever was edited in it since
    const validatedModel = await getValidatedOntologyModelText(tboxSource, getTermNamespace(found.sourceConfig), found.sourceConfig.prefix, userContext);
    if (!validatedModel) {
        return { status: 409, error: "the graph of the validated version " + tboxSource + " holds no ontology model" };
    }
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
        termNamespace: getTermNamespace(found.sourceConfig),
        // the namespace MappingModeler builds the instance URIs on
        instanceNamespace: found.sourceConfig.baseUri || found.sourceConfig.graphUri,
        validatedRun: validatedRun,
        validatedModel: validatedModel,
        database: database,
        schema: schema,
        columnsByTable: columnsByTable,
        databaseChecks: databaseChecks,
        databaseText: describeDatabase(database, schema, columnsByTable, tableInspections),
        userContext: userContext,
    };
}

// the MappingModeler document of a compact answer and what the checks find in it, for a generation as for a revision
async function checkMappingAnswer(mappingAnswer, inputs, source) {
    // a local class is read in the validated version, an upper one in the upper ontology that declares it
    const classSourceByIri = {};
    const classLabelByIri = { ...inputs.validatedModel.classLabelByIri };
    for (const classIri of Object.keys(classLabelByIri)) {
        classSourceByIri[classIri] = inputs.tboxSource;
    }
    const datatypePropertyIris = new Set(inputs.validatedModel.datatypePropertyIris);
    const upperOntologies = getImportedOntologies(inputs.validatedRun.savedRun.upperOntologies || [], inputs.found.userSources);
    const upperModels = await callVocablesFunction("OntologyModels", "registerSourcesModel", [upperOntologies, {}], inputs.userContext);
    for (const upperOntology of upperOntologies) {
        const upperModel = upperModels[upperOntology] || {};
        for (const [classIri, upperClass] of Object.entries(upperModel.classes || {})) {
            classSourceByIri[classIri] = classSourceByIri[classIri] ?? upperOntology;
            classLabelByIri[classIri] = classLabelByIri[classIri] ?? upperClass.label;
        }
        for (const propertyIri of getDatatypePropertyIris(upperModel)) {
            datatypePropertyIris.add(propertyIri);
        }
    }
    const mappingDocument = getMappingDocument(mappingAnswer, {
        source: source,
        instanceNamespace: inputs.instanceNamespace,
        databaseId: inputs.database.id,
        databaseName: inputs.database.database,
        schemaName: inputs.database.driver == "postgres" ? postgresSchemaName : null,
        columnsByTable: inputs.columnsByTable,
        prefixes: inputs.validatedModel.prefixes,
        classSourceByIri: classSourceByIri,
        classLabelByIri: classLabelByIri,
        datatypePropertyIris: datatypePropertyIris,
        userLogin: inputs.found.userInfo.user?.login ?? null,
    });
    const rangeWarnings = getLiteralRangeWarnings(mappingAnswer, inputs.columnsByTable);
    let relationChecks = null;
    let relationCheckError = null;
    try {
        relationChecks = await checkMappingRelations(mappingDocument.checkedRelations, source, inputs.userContext);
    } catch (checkError) {
        relationCheckError = checkError.message || String(checkError);
    }
    return { mappingDocument: mappingDocument, rangeWarnings: rangeWarnings, relationChecks: relationChecks, relationCheckError: relationCheckError };
}

export { getMappingInputs, checkMappingAnswer };
