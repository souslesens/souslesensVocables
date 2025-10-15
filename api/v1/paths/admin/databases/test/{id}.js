const { databaseModel } = require("../../../../../../model/databases");

module.exports = function () {
    let operations = { GET };

    async function GET(req, res, _next) {
        try {
            const connection = await databaseModel.getAdminRestrictedConnection(req.params.id);
            await databaseModel.query(connection, "SELECT 1");
            res.status(200).json({ message: "The remote database server is running" });
        } catch (err) {
            if (err.code === "EHOSTUNREACH") {
                res.status(403).json({ message: err.message });
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
        tags: ["Databases"],
    };

    return operations;
};
