import { databaseModel } from "../../../../model/databases.js";
import { resourceFetched, responseSchema } from "../utils.js";

export default function () {
    let operations = { GET, POST };

    // GET /api/v1/databases
    async function GET(req, res, next) {
        try {
            const databases = await databaseModel.getAllDatabases();
            resourceFetched(res, databases);
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }

    GET.apiDoc = {
        operationId: "adminGetDatabases",
        responses: responseSchema("Databases", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "List all configured external databases (admin only)",
        description: "Admin-only. Returns the full `databases.json` catalog. Each entry exposes `driver`, `host`, " + "`port`, `database`, `user` (passwords are also included — admin endpoint).",
        tags: ["Databases"],
    };

    // POST /api/v1/databases
    async function POST(req, res, next) {
        if (!req.body.database) {
            res.status(400).json({
                message: "The database object is missing from this request",
            });
        } else {
            try {
                await databaseModel.addDatabase(req.body.database);

                const databases = await databaseModel.getAllDatabases();
                resourceFetched(res, databases);
            } catch (error) {
                res.status(error.status || 500).json(error);
                next(error);
            }
        }
    }

    POST.apiDoc = {
        operationId: "adminAddDatabase",
        responses: responseSchema("Databases", "POST"),
        security: [{ restrictAdmin: [] }],
        summary: "Register a new external database (admin only)",
        description: "Body must wrap the descriptor under a `database` key (`req.body.database`). Returns the refreshed catalog.",
        parameters: [
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        database: { $ref: "#/definitions/Database" },
                    },
                    example: {
                        database: {
                            id: "pg_assets",
                            name: "pg_assets",
                            driver: "pg",
                            host: "db.example.org",
                            port: 5432,
                            database: "assets",
                            user: "sls_reader",
                            password: "<secret>",
                        },
                    },
                },
                "x-examples": {
                    "Add Postgres datasource": {
                        database: {
                            id: "pg_assets",
                            name: "pg_assets",
                            driver: "pg",
                            host: "db.example.org",
                            port: 5432,
                            database: "assets",
                            user: "sls_reader",
                            password: "<secret>",
                        },
                    },
                },
            },
        ],
        tags: ["Databases"],
    };

    return operations;
}
