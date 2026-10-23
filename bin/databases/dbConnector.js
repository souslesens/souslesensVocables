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

async function getSampleData(connection, tableName, limit, driver) {
    const tableRef = driver === "pg" ? "public." + tableName : tableName;
    return connection(tableRef).select("*").limit(limit);
}

export { getConnection, getData, getKGModel, getKGModelAsync, getSampleData };
