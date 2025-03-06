const path = require("path");

const dbConnector = require(path.resolve("bin/KG/dbConnector"));
const { databaseModel } = require(path.resolve("model/databases"));

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const database = await databaseModel.getDatabase(req.query.name);
            const driver = await databaseModel.getClientDriver(database.driver);

            const connection = dbConnector.getConnection(database, driver);
            dbConnector.getKGModel(
                connection,
                database.database,
                database.driver,
                (data) => {
                    let tables = {};
                    data.forEach((d) => {
                        if (!Object.keys(tables).includes(d.table_name)) {
                            tables[d.table_name] = [];
                        }
                        tables[d.table_name].push(d.column_name);
                    });
                    res.status(200).json(tables);
                },
                (error) => {
                    console.error(error);
                    res.status(503).json({
                        message: "The connection to the database was refused",
                    });
                },
            );
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: error });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrieve SQL model",
        description: "Retrieve SQL model",
        operationId: "Retrieve SQL model",
        parameters: [
            {
                name: "type",
                description: "type",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "name",
                description: "name",
                in: "query",
                type: "string",
                required: true,
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
