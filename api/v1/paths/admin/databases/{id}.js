import { databaseModel } from "../../../../../model/databases.js";

export default function () {
    let operations = { DELETE, GET, PUT };

    async function GET(req, res, _next) {
        try {
            const database = await databaseModel.getDatabase(req.params.id);
            res.status(200).json(database);
        } catch (err) {
            res.status(500).json({ message: err.message, status: err.cause });
        }
    }

    GET.apiDoc = {
        operationId: "adminGetOneDatabase",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Database id from `databases.json`." },
        ],
        responses: {
            200: { description: "Database descriptor.", schema: { $ref: "#/definitions/Database" } },
            500: { description: "Database not found or persistence error." },
        },
        security: [{ restrictAdmin: [] }],
        summary: "Get a database descriptor by id (admin only)",
        tags: ["Databases"],
    };

    async function DELETE(req, res, next) {
        if (!req.params.id) {
            res.status(400).json({
                message: "The database identifier is missing from this request",
            });
        } else {
            const identifier = req.params.id;

            try {
                await databaseModel.deleteDatabase(identifier);

                const databases = await databaseModel.getAllDatabases();
                res.status(200).json({
                    message: `The database ${identifier} was successfully deleted`,
                    resources: databases,
                });
            } catch (err) {
                res.status(err.status || 500).json(err);
                next(err);
            }
        }
    }

    DELETE.apiDoc = {
        summary: "Delete a database descriptor (admin only)",
        description: "Removes database `id` from `databases.json`. Returns the refreshed catalog.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminDeleteOneDatabase",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Database id to delete." },
        ],
        responses: {
            200: {
                description: "Database deleted.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Databases" },
                    },
                },
            },
            400: { description: "Missing `id` in path." },
            500: { description: "Persistence error." },
        },
        tags: ["Databases"],
    };

    async function PUT(req, res, next) {
        if (!req.body.database) {
            res.status(400).json({
                message: "The database object is missing from this request",
            });
        } else {
            const database = req.body.database;

            try {
                await databaseModel.updateDatabase(database);

                const databases = await databaseModel.getAllDatabases();
                res.status(200).json({
                    message: `The database ${database.id} was successfully updated`,
                    resources: databases,
                });
            } catch (err) {
                res.status(err.status || 500).json(err);
                next(err);
            }
        }
    }

    PUT.apiDoc = {
        summary: "Update a database descriptor (admin only)",
        description: "Body must wrap the descriptor under a `database` key. Returns the refreshed catalog.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminUpdateOneDatabase",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Database id to update." },
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: { database: { $ref: "#/definitions/Database" } },
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
            },
        ],
        responses: {
            200: {
                description: "Database updated.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Databases" },
                    },
                },
            },
            400: { description: "Missing body." },
            500: { description: "Persistence error." },
        },
        tags: ["Databases"],
    };

    return operations;
}
