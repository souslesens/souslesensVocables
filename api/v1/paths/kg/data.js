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
        summary: "Read rows from a configured database (sample or SQL query)",
        description:
            "Two modes depending on parameters: " +
            "(a) `tableName` provided → returns up to `limit` (default 200) sample rows from that table; " +
            "(b) `sqlQuery` provided → executes a `SELECT` query, validated by `UserRequestFiltering.checkSqlSelectQuery` " +
            "to forbid writes/joins on tables outside the user's scope. Database access is gated by " +
            "`databaseModel.getUserConnection` (profile-driven).",
        security: [{ restrictLoggedUser: [] }],
        operationId: "kgGetData",
        parameters: [
            { in: "query", name: "dbName", type: "string", required: true, description: "Database id from `databases.json`." },
            { in: "query", name: "tableName", type: "string", required: false, description: "Sample-mode: table to read." },
            { in: "query", name: "limit", type: "string", required: false, description: "Max rows in sample mode (default 200)." },
            { in: "query", name: "sqlQuery", type: "string", required: false, description: "Query-mode: full `SELECT` statement." },
        ],
        responses: {
            200: {
                description: "Rows from the database.",
                schema: {
                    properties: {
                        rows: { type: "array", items: { type: "object" } },
                    },
                },
            },
            400: { description: "Neither `tableName` nor `sqlQuery` supplied." },
            403: { description: "User has no access to this database, or SQL query was rejected by the filter." },
            500: { description: "Database error." },
        },
        tags: ["KG"],
    };

    return operations;
}
