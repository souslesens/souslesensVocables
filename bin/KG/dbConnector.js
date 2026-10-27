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

function getKGModel(connection, dbName, driver, successCallback, errorCallback, withTypes) {
    const where = driver == "postgres" ? { table_schema: "public" } : {};
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

// columns, ordered primary keys and ordered foreign keys; postgres limited to public as in getKGModel
async function getSchemaDescription(connection, driver) {
    const isPostgres = driver == "postgres";
    const columns = await connection
        .select("table_name", "column_name", "data_type", "is_nullable")
        .from("information_schema.columns")
        .where(isPostgres ? { table_schema: "public" } : {})
        .orderBy(["table_name", "ordinal_position"]);
    const primaryKeys = await connection
        .select("keyColumn.table_name", "keyColumn.column_name")
        .from("information_schema.table_constraints as tableConstraint")
        .join("information_schema.key_column_usage as keyColumn", function () {
            this.on("keyColumn.constraint_schema", "tableConstraint.constraint_schema").andOn("keyColumn.constraint_name", "tableConstraint.constraint_name");
        })
        .where("tableConstraint.constraint_type", "PRIMARY KEY")
        .andWhere(isPostgres ? { "keyColumn.table_schema": "public" } : {})
        .orderBy(["keyColumn.table_name", "keyColumn.ordinal_position"]);
    // a composite key pairs each column with the referenced column of the same position
    const foreignKeys = await connection
        .select("keyColumn.constraint_name", "keyColumn.table_name", "keyColumn.column_name", "referencedColumn.table_name as referenced_table", "referencedColumn.column_name as referenced_column")
        .from("information_schema.referential_constraints as referentialConstraint")
        .join("information_schema.key_column_usage as keyColumn", function () {
            this.on("keyColumn.constraint_schema", "referentialConstraint.constraint_schema").andOn("keyColumn.constraint_name", "referentialConstraint.constraint_name");
        })
        .join("information_schema.key_column_usage as referencedColumn", function () {
            this.on("referencedColumn.constraint_schema", "referentialConstraint.unique_constraint_schema")
                .andOn("referencedColumn.constraint_name", "referentialConstraint.unique_constraint_name")
                .andOn("referencedColumn.ordinal_position", "keyColumn.position_in_unique_constraint");
        })
        .where(isPostgres ? { "keyColumn.table_schema": "public" } : {})
        .orderBy(["keyColumn.table_name", "keyColumn.constraint_name", "keyColumn.ordinal_position"]);
    return { columns, primaryKeys, foreignKeys };
}

function getTableReference(tableName, clientDriver) {
    return clientDriver === "pg" ? "public." + tableName : tableName;
}

async function getSampleData(connection, tableName, limit, clientDriver) {
    return connection(getTableReference(tableName, clientDriver)).select("*").limit(limit);
}

// a check on a big table must not hold the connection
const dataCheckTimeoutMs = 30000;

// sqlserver cannot cancel a running query: there the timeout only releases the connection
function withDataCheckTimeout(query, clientDriver) {
    return query.timeout(dataCheckTimeoutMs, { cancel: clientDriver !== "mssql" });
}

function getTextCastType(clientDriver) {
    // VARCHAR would turn the unicode characters of an nvarchar column into "?" on sqlserver
    return clientDriver === "mssql" ? "NVARCHAR(4000)" : "VARCHAR(4000)";
}

// rows of a table, and for each column its non null and distinct values, in one scan
async function getColumnProfile(connection, clientDriver, tableName, columnNames) {
    const textType = getTextCastType(clientDriver);
    const selections = [connection.raw("COUNT(*) AS ??", ["rowCount"])];
    columnNames.forEach(function (columnName, columnIndex) {
        selections.push(connection.raw("COUNT(??) AS ??", [columnName, "filled" + columnIndex]));
        selections.push(connection.raw("COUNT(DISTINCT CAST(?? AS " + textType + ")) AS ??", [columnName, "distinct" + columnIndex]));
    });
    const [counts] = await withDataCheckTimeout(connection(getTableReference(tableName, clientDriver)).select(selections), clientDriver);
    const columnsByName = {};
    columnNames.forEach(function (columnName, columnIndex) {
        columnsByName[columnName] = { filledCount: Number(counts["filled" + columnIndex]), distinctCount: Number(counts["distinct" + columnIndex]) };
    });
    return { rowCount: Number(counts.rowCount), columnsByName: columnsByName };
}

// compared as text, since a link without a declared key may join columns of different types
function getColumnTextValues(connection, clientDriver, tableName, columnName) {
    return connection(getTableReference(tableName, clientDriver))
        .select({ value: connection.raw("CAST(?? AS " + getTextCastType(clientDriver) + ")", [columnName]) })
        .whereNotNull(columnName);
}

// INTERSECT reads each table once, views included, and compares distinct sets
async function getSharedDistinctValueCount(connection, clientDriver, leftTable, leftColumn, rightTable, rightColumn) {
    const sharedValues = getColumnTextValues(connection, clientDriver, leftTable, leftColumn).intersect(getColumnTextValues(connection, clientDriver, rightTable, rightColumn));
    const [sharedCount] = await withDataCheckTimeout(connection.from(sharedValues.as("sharedValues")).count({ count: "*" }), clientDriver);
    return Number(sharedCount.count);
}

export { getConnection, getData, getKGModel, getKGModelAsync, getSchemaDescription, getSampleData, getColumnProfile, getSharedDistinctValueCount };
