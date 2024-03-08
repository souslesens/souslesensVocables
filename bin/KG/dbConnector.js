const knex = require("knex");

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
            .then(result => successCallback(result))
            .catch(error => errorCallback(error));
    },

    getKGModel: function (connection, dbName, successCallback, errorCallback) {
        connection
            .select("table_name", "column_name")
            .from("information_schema.columns")
            .where("table_schema", dbName)
            .orderBy("table_schema", "table_name")
            .then(result => successCallback(result))
            .catch(error => errorCallback(error));
    }
};
