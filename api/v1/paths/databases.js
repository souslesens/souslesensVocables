const { databaseModel } = require("../../../model/databases");
const { resourceFetched, responseSchema } = require("./utils");

module.exports = function () {
    let operations = { GET };

    // GET /api/v1/databases
    async function GET(_req, res, next) {
        try {
            const databases = await databaseModel.getDatabasesName();
            resourceFetched(res, databases);
        } catch (error) {
            next(error);
        }
    }

    GET.apiDoc = {
        operationId: "getDatabasesName",
        responses: responseSchema("DatabaseNames", "GET"),
        security: [{ restrictLoggedUser: [] }],
        summary: "Returns all databases name",
        tags: ["Databases"],
    };

    return operations;
};
