const knex = require("knex");

const { databaseModel } = require("../../../../../../model/databases");

function getClientDriver(driverName) {
    switch (driverName) {
        case "sqlserver":
            return "mssql";
        case "postgres":
            return "pg";
    }
}

module.exports = function () {
    let operations = { GET };

    async function GET(req, res, next) {
        try {
            const database = await databaseModel.getDatabase(req.params.id);

            const connection = knex({
                acquireConnectionTimeout: 5000, // 5s
                client: getClientDriver(database.driver),
                connection: {
                    host: database.host,
                    port: database.port,
                    user: database.user,
                    password: database.password,
                    database: database.database,
                },
            });

            connection
                .raw("SELECT 1")
                .then(() => {
                    res.status(200).json({ message: "The remote database server is running" });
                })
                .catch((err) => {
                    res.status(403).json({ message: "The connection to the database was refused" });
                });
        } catch (err) {
            if (typeof err.cause === "number") {
                res.status(err.cause).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }

    GET.apiDoc = {
        operationId: "testDatabase",
        parameters: [
            {
                description: "Database identifier",
                in: "path",
                name: "id",
                required: true,
                type: "string",
            },
        ],
        responses: {
            200: {
                description: "The connection was establish successfully",
                schema: { $ref: "#/definitions/Database" },
            },
            403: {
                description: "The credential do not allow to establish the connection",
                schema: { $ref: "#/definitions/Database" },
            },
            404: {
                description: "The remote server cannot be found",
                schema: { $ref: "#/definitions/Database" },
            },
        },
        security: [{ restrictAdmin: [] }],
        summary: "Test the connection to the database",
    };

    return operations;
};
