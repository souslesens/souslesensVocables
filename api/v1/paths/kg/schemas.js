import * as dbConnector from "../../../../bin/databases/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";
import userManager from "../../../../bin/user.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const connection = await databaseModel.getUserConnection(userInfo.user, req.query.name);
            const database = await databaseModel.getDatabase(req.query.name);
            const driver = await databaseModel.getClientDriver(database.driver);

            dbConnector.getSchemas(
                connection,
                driver,
                (schemas) => {
                    res.status(200).json({ schemas });
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
            res.status(error.status || error.cause || 500).json({ message: error.message });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "List the schemas of a configured database",
        description:
            "Returns the names of the schemas holding user tables in database `name`, ordered, by calling `dbConnector.getSchemas`. " +
            "System schemas (`information_schema`, `pg_catalog`, `sys`, `pg_toast*`) are excluded. " +
            "Used to pick which schema the KG extractor reads when a database spreads its tables over several schemas. " +
            "Access is gated by `databaseModel.getUserConnection` (profile-driven).",
        operationId: "kgGetSchemas",
        parameters: [{ name: "name", in: "query", type: "string", required: true, description: "Database id from `databases.json`." }],
        responses: {
            200: {
                description: "Schema names of the database, ordered and without the system schemas.",
                schema: {
                    type: "object",
                    properties: {
                        schemas: { type: "array", items: { type: "string" } },
                    },
                },
                examples: {
                    "application/json": {
                        schemas: ["public", "staging"],
                    },
                },
            },
            404: { description: "Database not found or not accessible." },
            403: { description: "User has no access to this database." },
            500: { description: "Database introspection failure." },
            503: { description: "Connection refused by the database." },
        },
        tags: ["KG"],
    };

    return operations;
}
