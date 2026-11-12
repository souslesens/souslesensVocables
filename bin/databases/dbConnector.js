import knex from "knex";

function getConnection(database, driver) {
    return knex({
        acquireConnectionTimeout: 5000, // 5s
        client: driver,
        connection: {
            host: database.host,
            port: database.port,
            user: database.user,
            password: database.password,
            database: database.database,
        },
    });
}

function getData(connection, query, successCallback, errorCallback) {
    connection
        .raw(query)
        .then((result) => successCallback(result))
        .catch((error) => errorCallback(error));
}

// both spellings are accepted: some call sites pass the config driver name ("sqlserver"), others the knex name ("mssql")
function getDefaultSchema(driver) {
    return driver === "mssql" || driver === "sqlserver" ? "dbo" : "public";
}

function getKGModel(connection, dbName, driver, successCallback, errorCallback, withTypes, schema) {
    const where = { table_schema: schema ?? getDefaultSchema(driver) };
    const selectedColumns = withTypes ? ["table_name", "column_name", "data_type"] : ["table_name", "column_name"];
    connection
        .distinct(selectedColumns)
        .from("information_schema.columns")
        .where(where)
        .orderBy("table_name")
        .then((result) => successCallback(result))
        .catch((error) => errorCallback(error));
}

async function getKGModelAsync(connection, dbName, driver) {
    return new Promise((resolve, reject) => {
        getKGModel(
            connection,
            dbName,
            driver,
            (data) => resolve(data),
            (error) => reject(error),
        );
    });
}

function quoteIdentifier(name) {
    return '"' + name.replace(/"/g, '""') + '"';
}

function qualifiedTable(tableName, driver, schema) {
    if (!tableName.includes(".")) {
        return quoteIdentifier(schema ?? getDefaultSchema(driver)) + "." + quoteIdentifier(tableName);
    }
    const quotedParts = tableName.split(".").map((part) => quoteIdentifier(part));
    return quotedParts.join(".");
}

// schemas of information_schema.columns that never hold user tables: system catalogs and postgres toast tables
const systemSchemaRegex = /^(information_schema|pg_catalog|sys|pg_toast.*)$/;

function getSchemas(connection, driver, successCallback, errorCallback) {
    // sql server uses camelCase catalog names, unlike the postgres lower case convention
    const tableSchemaColumn = driver === "mssql" || driver === "sqlserver" ? "TABLE_SCHEMA" : "table_schema";
    connection
        .distinct(tableSchemaColumn)
        .from("information_schema.columns")
        .orderBy(tableSchemaColumn)
        .then((result) => {
            const schemas = [];
            result.forEach((row) => {
                const schemaName = row[tableSchemaColumn];
                if (!systemSchemaRegex.test(schemaName)) {
                    schemas.push(schemaName);
                }
            });
            successCallback(schemas);
        })
        .catch((error) => errorCallback(error));
}

// the tables of a postgres database are read in public whatever the search_path of its connection
// the KGbuilder pipeline is still pinned to this driver default until it forwards a schema
function getTableSchema(clientDriver) {
    const tableSchema = clientDriver === "pg" ? "public" : undefined;
    return tableSchema;
}

async function getSampleData(connection, tableName, limit, driver, schema) {
    return connection(qualifiedTable(tableName, driver, schema))
        .select("*")
        .limit(limit);
}

export { getConnection, getData, getDefaultSchema, getKGModel, getKGModelAsync, getSchemas, getSampleData, getTableSchema, qualifiedTable, quoteIdentifier };
