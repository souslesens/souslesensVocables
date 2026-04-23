import * as dbConnector from "../../../../bin/KG/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";
import userManager from "../../../../bin/user.js";
import UserRequestFiltering from "../../../../bin/userRequestFiltering.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const connection = await databaseModel.getUserConnection(userInfo.user, req.query.dbName);

            if (!connection) {
                return res.status(403).json({ error: "Access to this database is not allowed" });
            }

            if (req.query.tableName) {
                const database = await databaseModel.getDatabase(req.query.dbName);
                const driver = databaseModel.getClientDriver(database.driver);
                const limit = parseInt(req.query.limit) || 200;
                const rows = await dbConnector.getSampleData(connection, req.query.tableName, limit, driver);
                res.status(200).json({ rows });
            } else {
                const sqlQuery = req.query.sqlQuery;
                if (!sqlQuery) {
                    return res.status(400).json({ error: "Missing tableName or sqlQuery parameter" });
                }
                const { user } = userInfo;
                //const isAdmin = user.login === "admin" || (user.groups && user.groups.includes("admin"));
                const isAdmin = false; // Disable admin bypass for SQL filtering to enhance security. Admin users should still have their queries filtered to prevent potential misuse.
                if (!isAdmin) {
                    const database = await databaseModel.getDatabase(req.query.dbName);
                    const driver = databaseModel.getClientDriver(database.driver);
                    const filterError = await new Promise((resolve) => {
                        UserRequestFiltering.checkSqlSelectQuery(sqlQuery, driver, (err) => resolve(err));
                    });
                    if (filterError) {
                        return res.status(403).json({ error: filterError });
                    }
                }
                dbConnector.getData(
                    connection,
                    sqlQuery,
                    function (result) {
                        res.status(200).json(result);
                    },
                    function (error) {
                        res.status(500).json({ error });
                    },
                );
            }
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
                name: "tableName",
                type: "string",
                required: false,
            },
            {
                in: "query",
                name: "limit",
                type: "integer",
                required: false,
            },
            {
                in: "query",
                name: "sqlQuery",
                type: "string",
                required: false,
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
