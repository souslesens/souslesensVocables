import { getUpperOntologyClassesText, getUpperOntologyModelText } from "../ontologyFromDb/upperOntologyModel.js";
import { describeDatabase, getSampleTexts } from "../ontologyFromDb/databaseDescription.js";
import { getImportedOntologies } from "../ontologyFromDb/ontology/restrictionCheck.js";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";
import { getSchemaDescription, getFilledSampleData } from "../../KG/dbConnector.js";
import { callVocablesFunction } from "../../remoteCodeRunner.js";
import csvCrawler from "../../_csvCrawler.js";
import { databaseModel } from "../../../model/databases.js";
import { getKnownAiKeys, addAiKeysToSchema } from "./keyDetection.js";

// a csv file, or a database out of reach, describes its columns and its rows only
const noSchema = { columns: [], primaryKeys: [], foreignKeys: [], comments: [] };
// where the mapping tools store the csv files of a source, one directory per source
const csvDirectory = join(dirname(fileURLToPath(import.meta.url)), "../../../data/CSV");
const sampleRowCount = 5;

// per source, as a promise: a suggestion asked during the preparation waits for its end
const preparedSources = {};

async function readDatabaseSchemas(databaseIds, userInfo) {
    const schemasByDatabaseId = {};
    const databaseErrors = {};
    for (const databaseId of databaseIds) {
        try {
            const database = await databaseModel.getDatabase(databaseId);
            const connection = await databaseModel.getUserConnection(userInfo.user, databaseId);
            schemasByDatabaseId[databaseId] = { database: database, schema: await getSchemaDescription(connection, database.driver) };
        } catch (databaseError) {
            databaseErrors[databaseId] = databaseError.message;
        }
    }
    return { schemasByDatabaseId, databaseErrors };
}

// the classes alone for the class suggestions, the whole model with its object properties for the restriction suggestions;
// the allowed properties are checked against every imported ontology, the ones too big for the prompt included
async function buildPreparedSource(source, upperOntologies, databaseIds, userContext) {
    const upperOntologyClasses = await getUpperOntologyClassesText(upperOntologies, userContext);
    const upperOntologyModel = await getUpperOntologyModelText(upperOntologies, userContext);
    const checkedOntologies = getImportedOntologies(userContext.userSources[source].imports || [], userContext.userSources);
    const ontologyModels = await callVocablesFunction("OntologyModels", "registerSourcesModel", [checkedOntologies, {}], userContext);
    const databaseSchemas = await readDatabaseSchemas(databaseIds, userContext.user);
    const preparedSource = {
        checkedOntologies: checkedOntologies,
        classesText: upperOntologyClasses.text,
        classPrefixes: upperOntologyClasses.prefixes,
        classLabelByIri: upperOntologyClasses.classLabelByIri,
        modelText: upperOntologyModel.text,
        modelPrefixes: upperOntologyModel.prefixes,
        ontologyModels: ontologyModels,
        ...databaseSchemas,
    };
    return preparedSource;
}

function prepareSource(source, upperOntologies, databaseIds, userContext) {
    const preparedSource = buildPreparedSource(source, upperOntologies, databaseIds, userContext);
    preparedSources[source] = preparedSource;
    // a failed preparation is reported to its caller and must not answer the clicks that follow
    preparedSource.catch(function () {
        if (preparedSources[source] === preparedSource) {
            delete preparedSources[source];
        }
    });
    return preparedSource;
}

// null when the source was never prepared, or its preparation failed
async function getPreparedSource(source) {
    const preparedSource = await preparedSources[source];
    return preparedSource || null;
}

// the columns of every table, to judge how often an object comes back; a csv file knows only its own
function getDatabaseOverview(schema) {
    const columnNamesByTable = {};
    schema.columns.forEach(function (column) {
        if (!columnNamesByTable[column.table_name]) {
            columnNamesByTable[column.table_name] = [];
        }
        columnNamesByTable[column.table_name].push(column.column_name);
    });
    const tableLines = Object.entries(columnNamesByTable).map(([tableName, columnNames]) => tableName + ": " + columnNames.join(", "));
    const databaseOverview = tableLines.length > 0 ? "# Tables of the database\n\n" + tableLines.join("\n") + "\n\n" : "";
    return databaseOverview;
}

// the database with the keys the AI found in its data beside the declared ones, null for a csv file or a database out of reach
function getSchemaWithAiKeys(request, preparedSource) {
    const databaseSchema = preparedSource.schemasByDatabaseId[request.databaseId];
    const aiKeys = getKnownAiKeys(request.databaseId);
    if (!databaseSchema || !aiKeys) {
        return databaseSchema || null;
    }
    const schemaAndAiKeys = addAiKeysToSchema(databaseSchema.schema, aiKeys);
    const databaseSchemaWithAiKeys = { database: databaseSchema.database, schema: schemaAndAiKeys.schema, aiKeys: schemaAndAiKeys.aiKeys };
    return databaseSchemaWithAiKeys;
}

// the keys of the table that the schema does not declare, so that the model weighs them as found in the data
function getAiKeysText(table, aiKeys) {
    if (!aiKeys) {
        return "";
    }
    const tablePrimaryKey = aiKeys.primaryKeys.find((primaryKey) => primaryKey.table == table);
    const tableForeignKeys = aiKeys.foreignKeys.filter((foreignKey) => foreignKey.table == table);
    const keyTexts = tableForeignKeys.map((foreignKey) => "foreign key " + foreignKey.column + " -> " + foreignKey.referencedTable + "." + foreignKey.referencedColumn);
    if (tablePrimaryKey) {
        keyTexts.unshift("primary key (" + tablePrimaryKey.columns.join(", ") + ")");
    }
    const tableWithoutIdentifier = aiKeys.tablesWithoutIdentifier.find((aiTable) => aiTable.table == table);
    let aiKeysText = keyTexts.length > 0 ? "Keys found in the data, which the schema does not declare: " + keyTexts.join("; ") + "\n" : "";
    if (tableWithoutIdentifier) {
        const togetherText = tableWithoutIdentifier.columns.length > 0 ? " (the columns " + tableWithoutIdentifier.columns.join(", ") + " identify its rows only together)" : "";
        aiKeysText += "No column identifies the object of the table, which needs a virtual column" + togetherText + ": " + tableWithoutIdentifier.reason + "\n";
    }
    return aiKeysText;
}

// the tables of the database, then the table of the request with its keys, comments and sample rows
function getTableDescription(request, preparedSource) {
    const noSchemaDescription = { database: { database: request.dataSourceName, driver: "no schema read" }, schema: noSchema };
    const databaseSchema = getSchemaWithAiKeys(request, preparedSource) || noSchemaDescription;
    const schemaColumns = databaseSchema.schema.columns.filter((column) => column.table_name == request.table);
    const nameOnlyColumns = request.columns.map((columnName) => ({ column_name: columnName, data_type: "text", is_nullable: "YES" }));
    const tableColumns = schemaColumns.length > 0 ? schemaColumns : nameOnlyColumns;
    const tableInspection = { sampleTexts: getSampleTexts(request.sampleRows, tableColumns) };
    const tableText = describeDatabase(databaseSchema.database, databaseSchema.schema, { [request.table]: tableColumns }, { [request.table]: tableInspection });
    const referencingKeys = databaseSchema.schema.foreignKeys.filter((keyColumn) => keyColumn.referenced_table == request.table && keyColumn.table_name != request.table);
    const referencingKeyLines = referencingKeys.map(function (keyColumn) {
        const sharedKeyText = isPrimaryKeyColumn(databaseSchema.schema, keyColumn) ? " (primary key of " + keyColumn.table_name + ")" : "";
        return keyColumn.table_name + "." + keyColumn.column_name + " -> " + request.table + "." + keyColumn.referenced_column + sharedKeyText;
    });
    const referencingKeysText = referencingKeyLines.length > 0 ? "Foreign keys of other tables to this table:\n" + referencingKeyLines.join("\n") + "\n" : "";
    const tableDescription = getDatabaseOverview(databaseSchema.schema) + "# Table of the column\n\n" + tableText + getAiKeysText(request.table, databaseSchema.aiKeys) + referencingKeysText;
    return tableDescription;
}

// a table taking the key of another one as its own primary key holds a kind of the rows of that other table;
// a key over several columns, the foreign key among them, relates these rows to other objects
function isPrimaryKeyColumn(schema, keyColumn) {
    const tablePrimaryKeys = schema.primaryKeys.filter((primaryKey) => primaryKey.table_name == keyColumn.table_name);
    const isPrimaryKey = tablePrimaryKeys.length == 1 && tablePrimaryKeys[0].column_name == keyColumn.column_name;
    return isPrimaryKey;
}

// the primary keys of the other tables taking the key of a table that only hands it out, none otherwise: one subtype table
// is a plain one to one extension, and a table with a column its subtype tables lack, as person with firstname, is a
// business object of its own; the schema may list one key under two constraints
function getHandedOutKeys(schema, table) {
    const sharedKeys = schema.foreignKeys.filter((keyColumn) => keyColumn.referenced_table == table && keyColumn.table_name != table && isPrimaryKeyColumn(schema, keyColumn));
    const subtypeKeys = sharedKeys.filter((sharedKey, keyIndex) => sharedKeys.findIndex((otherKey) => otherKey.table_name == sharedKey.table_name) == keyIndex);
    const subtypeTables = subtypeKeys.map((subtypeKey) => subtypeKey.table_name);
    const subtypeColumns = schema.columns.filter((column) => subtypeTables.includes(column.table_name));
    const subtypeColumnNames = subtypeColumns.map((column) => column.column_name);
    const ownColumns = schema.columns.filter((column) => column.table_name == table && !isPrimaryKeyColumn(schema, column));
    const isHandingOutItsKey = subtypeKeys.length > 1 && ownColumns.every((column) => subtypeColumnNames.includes(column.column_name));
    const handedOutKeys = isHandingOutItsKey ? subtypeKeys : [];
    return handedOutKeys;
}

// none for a csv file or a database out of reach; the referenced key is the one the column points at, when it is a foreign key
function getTableKeys(request, preparedSource) {
    const databaseSchema = getSchemaWithAiKeys(request, preparedSource);
    if (!databaseSchema) {
        return { primaryKeyColumns: [], foreignKeyColumns: [], handedOutKeys: [], referencedKey: null, referencedHandedOutKeys: [] };
    }
    const schema = databaseSchema.schema;
    const primaryKeys = schema.primaryKeys.filter((keyColumn) => keyColumn.table_name == request.table);
    const foreignKeys = schema.foreignKeys.filter((keyColumn) => keyColumn.table_name == request.table);
    const columnForeignKey = foreignKeys.find((keyColumn) => keyColumn.column_name == request.column);
    const tableKeys = {
        primaryKeyColumns: primaryKeys.map((keyColumn) => keyColumn.column_name),
        foreignKeyColumns: foreignKeys.map((keyColumn) => keyColumn.column_name),
        handedOutKeys: getHandedOutKeys(schema, request.table),
        referencedKey: columnForeignKey ? columnForeignKey.referenced_table + "." + columnForeignKey.referenced_column : null,
        referencedHandedOutKeys: columnForeignKey ? getHandedOutKeys(schema, columnForeignKey.referenced_table) : [],
    };
    return tableKeys;
}

// null when the file has no such column, a mapping older than the file
async function readFilledCsvRows(request) {
    const filePath = join(csvDirectory, basename(request.source), basename(request.table));
    const filledRows = [];
    for await (const rowBatch of csvCrawler.readCsvBatchGenerator({ filePath: filePath })) {
        if (!(request.column in rowBatch[0])) {
            return null;
        }
        const filledBatchRows = rowBatch.filter((row) => row[request.column] !== undefined && row[request.column].trim() !== "");
        filledRows.push(...filledBatchRows);
        if (filledRows.length >= sampleRowCount) {
            break;
        }
    }
    const firstFilledRows = filledRows.slice(0, sampleRowCount);
    return firstFilledRows;
}

async function readFilledDatabaseRows(request, userInfo) {
    const database = await databaseModel.getDatabase(request.databaseId);
    const connection = await databaseModel.getUserConnection(userInfo.user, request.databaseId);
    const clientDriver = databaseModel.getClientDriver(database.driver);
    const filledRows = await getFilledSampleData(connection, clientDriver, request.table, request.column, sampleRowCount);
    return filledRows;
}

// { sampleRows, columnState }: the first rows holding a value in the column, columnState "filled"; otherwise the first rows
// of the table, which the page read, columnState "empty" when the column holds no value, "unread" when it cannot be read
async function readColumnSample(request, userInfo) {
    try {
        const filledRows = request.databaseId ? await readFilledDatabaseRows(request, userInfo) : await readFilledCsvRows(request);
        if (!filledRows) {
            return { sampleRows: request.sampleRows, columnState: "unread" };
        }
        const columnSample = filledRows.length > 0 ? { sampleRows: filledRows, columnState: "filled" } : { sampleRows: request.sampleRows, columnState: "empty" };
        return columnSample;
    } catch (readError) {
        console.warn("rows holding " + request.table + "." + request.column + " not read: " + readError.message);
        return { sampleRows: request.sampleRows, columnState: "unread" };
    }
}

export { prepareSource, getPreparedSource, getTableDescription, getTableKeys, readColumnSample };
