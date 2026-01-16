import * as dbConnector from "../../../../bin/KG/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";

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
                function (result) {
                    res.status(200).json(result);
                },
                function (error) {
                    res.status(500).json({ error });
                },
            );
        } catch (error) {
            res.status(error.status || 500).json({ error: error });
        }
    }

    GET.apiDoc = {
        summary: "Retrieve data from a database",
        security: [{ restrictLoggedUser: [] }],
        operationId: "retrieveDataFromDb",
        parameters: [
            {
                in: "query",
                name: "dbName",
                type: "string",
                required: true,
            },
            {
                in: "query",
                name: "sqlQuery",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "Results of the SQL query.",
            },
        },
    };

    return operations;
}
