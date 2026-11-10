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
    // a comment without a column is the comment of its table
    let comments = [];
    if (isPostgres) {
        const commentRows = await connection.raw(
            "SELECT tableClass.relname AS table_name, tableColumn.attname AS column_name, objectComment.description AS comment " +
                "FROM pg_description objectComment " +
                "JOIN pg_class tableClass ON tableClass.oid = objectComment.objoid " +
                "JOIN pg_namespace tableSchema ON tableSchema.oid = tableClass.relnamespace " +
                "LEFT JOIN pg_attribute tableColumn ON tableColumn.attrelid = tableClass.oid AND tableColumn.attnum = objectComment.objsubid AND objectComment.objsubid > 0 " +
                "WHERE objectComment.classoid = 'pg_class'::regclass AND tableSchema.nspname = 'public' " +
                "ORDER BY tableClass.relname, objectComment.objsubid",
        );
        comments = commentRows.rows;
    }
    return { columns, primaryKeys, foreignKeys, comments };
}

// the tables of a postgres database are read in public whatever the search_path of its connection
function getTableSchema(clientDriver) {
    const tableSchema = clientDriver === "pg" ? "public" : undefined;
    return tableSchema;
}

function getTableReference(tableName, clientDriver) {
    const tableSchema = getTableSchema(clientDriver);
    const tableReference = tableSchema ? tableSchema + "." + tableName : tableName;
    return tableReference;
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

// a column read as text, its name given as the binding of ??
function getTextCastSql(clientDriver) {
    // VARCHAR would turn the unicode characters of an nvarchar column into "?" on sqlserver
    const textType = clientDriver === "mssql" ? "NVARCHAR(4000)" : "VARCHAR(4000)";
    const textCastSql = "CAST(?? AS " + textType + ")";
    return textCastSql;
}

// rows of a table, and for each column its non null and distinct values, in one scan
async function getColumnProfile(connection, clientDriver, tableName, columnNames) {
    const textCastSql = getTextCastSql(clientDriver);
    const selections = [connection.raw("COUNT(*) AS ??", ["rowCount"])];
    columnNames.forEach(function (columnName, columnIndex) {
        selections.push(connection.raw("COUNT(??) AS ??", [columnName, "filled" + columnIndex]));
        selections.push(connection.raw("COUNT(DISTINCT " + textCastSql + ") AS ??", [columnName, "distinct" + columnIndex]));
    });
    const [counts] = await withDataCheckTimeout(connection(getTableReference(tableName, clientDriver)).select(selections), clientDriver);
    const columnsByName = {};
    columnNames.forEach(function (columnName, columnIndex) {
        columnsByName[columnName] = { filledCount: Number(counts["filled" + columnIndex]), distinctCount: Number(counts["distinct" + columnIndex]) };
    });
    return { rowCount: Number(counts.rowCount), columnsByName: columnsByName };
}

// rows where the column holds a value: NULL, an empty text and a text of spaces are empty, compared as text whatever the
// type; a NULL compared to '' is never true
async function getFilledSampleData(connection, clientDriver, tableName, columnName, limit) {
    const filledRowsQuery = connection(getTableReference(tableName, clientDriver))
        .select("*")
        .whereRaw("LTRIM(RTRIM(" + getTextCastSql(clientDriver) + ")) <> ''", [columnName])
        .limit(limit);
    const filledRows = await withDataCheckTimeout(filledRowsQuery, clientDriver);
    return filledRows;
}

// compared as text, since a link without a declared key may join columns of different types
function getColumnTextValues(connection, clientDriver, tableName, columnName) {
    return connection(getTableReference(tableName, clientDriver))
        .select({ value: connection.raw(getTextCastSql(clientDriver), [columnName]) })
        .whereNotNull(columnName);
}

// INTERSECT reads each table once, views included, and compares distinct sets
async function getSharedDistinctValueCount(connection, clientDriver, leftTable, leftColumn, rightTable, rightColumn) {
    const sharedValues = getColumnTextValues(connection, clientDriver, leftTable, leftColumn).intersect(getColumnTextValues(connection, clientDriver, rightTable, rightColumn));
    const [sharedCount] = await withDataCheckTimeout(connection.from(sharedValues.as("sharedValues")).count({ count: "*" }), clientDriver);
    return Number(sharedCount.count);
}

// the values of the column held by the most rows, with some of those rows: [{ value, rowCount, rows }]
async function getRepeatedValueRows(connection, clientDriver, tableName, columnName, valueLimit, rowLimit) {
    const castColumnSql = getTextCastSql(clientDriver);
    const repeatedValuesQuery = connection(getTableReference(tableName, clientDriver))
        .select({ value: connection.raw(castColumnSql, [columnName]) })
        .count({ rowCount: "*" })
        .whereNotNull(columnName)
        .groupByRaw(castColumnSql, [columnName])
        .havingRaw("COUNT(*) > 1")
        .orderBy("rowCount", "desc")
        .limit(valueLimit);
    const repeatedValues = await withDataCheckTimeout(repeatedValuesQuery, clientDriver);
    const repeatedValueRows = [];
    for (const repeatedValue of repeatedValues) {
        const rowsQuery = connection(getTableReference(tableName, clientDriver))
            .select("*")
            .whereRaw(castColumnSql + " = ?", [columnName, repeatedValue.value])
            .limit(rowLimit);
        const rows = await withDataCheckTimeout(rowsQuery, clientDriver);
        repeatedValueRows.push({ value: repeatedValue.value, rowCount: Number(repeatedValue.rowCount), rows: rows });
    }
    return repeatedValueRows;
}

export {
    getConnection,
    getData,
    getKGModel,
    getKGModelAsync,
    getSchemaDescription,
    getSampleData,
    getColumnProfile,
    getSharedDistinctValueCount,
    getTableSchema,
    getFilledSampleData,
    getRepeatedValueRows,
};
