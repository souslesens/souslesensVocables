import path from 'path';

const dbConnector = require(path.resolve("bin/KG/dbConnector"));
const { databaseModel } = require(path.resolve("model/databases"));

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const database = await databaseModel.getDatabase(req.query.dbName);
            const driver = await databaseModel.getClientDriver(database.driver);

            const connection = dbConnector.getConnection(database, driver);
            dbConnector.getData(
                connection,
                req.query.sqlQuery,
                (data) => {
                    // TODO: Adapt the result to send the same structure as the
                    // previous connectors
                    res.status(200).json(data);
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
        summary: "Execute SQL query",
        description: "Execute SQL query",
        operationId: "Execute SQL query",
        parameters: [
            {
                name: "type",
                description: "type",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "dbName",
                description: "database name",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "sqlQuery",
                description: "SQL query to execute",
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
        tags: ["KG"],
    };

    return operations;
};
