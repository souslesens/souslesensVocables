import knex from 'knex';

module.exports = {
    getConnection: function (database, driver) {
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
    },

    getData: function (connection, query, successCallback, errorCallback) {
        connection
            .raw(query)
            .then((result) => successCallback(result))
            .catch((error) => errorCallback(error));
    },

    getKGModel: function (connection, dbName, driver, successCallback, errorCallback) {
        const where = driver == "postgres" ? { table_schema: "public" } : {};
        connection
            .distinct("table_name", "column_name")
            .from("information_schema.columns")
            .where(where)
            .orderBy("table_name")
            .then((result) => successCallback(result))
            .catch((error) => errorCallback(error));
    },

    getKGModelAsync: async function (connection, dbName, driver) {
        return new Promise((resolve, reject) => {
            module.exports.getKGModel(
                connection,
                dbName,
                driver,
                (data) => resolve(data),
                (error) => reject(error),
            );
        });
    },
};
