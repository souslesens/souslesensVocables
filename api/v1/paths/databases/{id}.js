const { databaseModel } = require("../../../../model/databases");
const { responseSchema } = require("../utils");

module.exports = function () {
    let operations = { GET };

    async function GET(req, res, next) {
        try {
            const database = await databaseModel.getDatabaseMinimal(req.params.id);
            res.status(200).json(database);
        } catch (error) {
            res.status(500).json({ message: err.message, status: err.cause });
        }
    }

    GET.apiDoc = {
        operationId: "getMinimalDatabase",
        responses: responseSchema("DatabaseMinimal", "GET"),
        security: [{ restrictLoggedUser: [] }],
        summary: "Returns the table without insecure information",
    };

    return operations;
};
