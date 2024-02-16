const { databaseModel } = require("../../../../../model/databases");

module.exports = function () {
    let operations = { DELETE, GET, PUT };

    async function GET(req, res, next) {
        res.status(400).json({ message: `Database with id ${req.params.id} was not found` });
    }

    GET.apiDoc = {
        operationId: "getOneDatabase",
        parameters: [],
        responses: {
            200: {
                description: "Databases",
                schema: {
                    $ref: "#/definitions/Database",
                },
            },
        },
        security: [{ restrictAdmin: [] }],
        summary: "Get a specific database",
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
                next(err);
            }
        }
    }

    DELETE.apiDoc = {
        summary: "Delete a specific database",
        security: [{ restrictAdmin: [] }],
        operationId: "DeleteOneDatabase",
        parameters: [],
        responses: {
            200: {
                description: "The specified database was deleted successfully",
                schema: {
                    $ref: "#/definitions/Database",
                },
            },
            400: {
                description: "The database identifier was missing from the request",
                schema: {
                    $ref: "#/definitions/Database",
                },
            },
        },
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
                next(err);
            }
        }
    }

    PUT.apiDoc = {
        summary: "Update a specific database",
        security: [{ restrictAdmin: [] }],
        operationId: "UpdateOneDatabase",
        parameters: [],
        responses: {
            200: {
                description: "The specified database was updated successfully",
                schema: {
                    $ref: "#/definitions/Database",
                },
            },
            400: {
                description: "The database identifier was missing from the request",
                schema: {
                    $ref: "#/definitions/Database",
                },
            },
        },
    };

    return operations;
};
