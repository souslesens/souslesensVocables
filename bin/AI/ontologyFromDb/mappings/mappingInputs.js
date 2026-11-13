import { findSourceOntology, getValidatedSource, readDatabaseChecks } from "../ontology/ontologyRuns.js";
import { getTermNamespace } from "../ontology/ontologyAnswer.js";
import { getMappingDocument, getLiteralRangeWarnings, checkMappingRelations } from "./mappingAnswer.js";
import { getImportedOntologies } from "../ontology/restrictionCheck.js";
import { getDatatypePropertyIris, getValidatedOntologyModelText } from "../upperOntologyModel.js";
import { describeDatabase } from "../databaseDescription.js";
import { callVocablesFunction } from "../../../remoteCodeRunner.js";
import { getSchemaDescription } from "../../../databases/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";
import { listSourceMappings } from "./mappingRuns.js";

// MappingModeler reads the public schema of a postgres database, see getSchemaDescription
const postgresSchemaName = "public";

// the database is the one the validated version was built on, read as its generation read it
// a version built from a schema file has none: the database of its last mapping stays until another one is chosen
async function getMappingDatabase(source, validatedRun, chosenDatabaseId) {
    const savedRun = validatedRun.savedRun;
    const allDatabases = await databaseModel.getAllDatabases();
    if (!savedRun.schemaFile) {
        return allDatabases.find((configuredDatabase) => configuredDatabase.id == savedRun.databaseId || configuredDatabase.database == savedRun.database);
    }
    const mappingVersions = await listSourceMappings(source);
    const lastMappingOfRun = mappingVersions.find((mappingVersion) => mappingVersion.savedMapping.ontologyRunName == validatedRun.runName && mappingVersion.savedMapping.databaseId);
    const mappedDatabaseId = chosenDatabaseId ?? lastMappingOfRun?.savedMapping.databaseId;
    return allDatabases.find((configuredDatabase) => configuredDatabase.id == mappedDatabaseId);
}

async function getMappingInputs(req, source, chosenDatabaseId) {
    const found = await findSourceOntology(req, source);
    if (found.error) {
        return found;
    }
    const tboxSource = getValidatedSource(source, found.run);
    if (!tboxSource) {
        return { status: 409, error: "no validated ontology for " + source + ": validate it before mapping it" };
    }
    // the database, the upper ontologies and the overlaps are read in the run file
    const validatedRun = found.run;
    const userContext = { user: found.userInfo, userSources: found.userSources };
    // the graph is the validated version, whatever answer format produced it and whatever was edited in it since
    const validatedModel = await getValidatedOntologyModelText(tboxSource, getTermNamespace(found.sourceConfig), found.sourceConfig.prefix, userContext);
    if (!validatedModel) {
        return { status: 409, error: "the graph of the validated version " + tboxSource + " holds no ontology model" };
    }
    const savedRun = validatedRun.savedRun;
    const database = await getMappingDatabase(source, validatedRun, chosenDatabaseId);
    if (!database && savedRun.schemaFile) {
        return { status: 409, error: "the validated version was built from the schema file " + savedRun.schemaFile.fileName + ": choose the database to map" };
    }
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
