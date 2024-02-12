const { databaseModel } = require("../../../model/databases");
const { resourceFetched, responseSchema } = require("./utils");

module.exports = function () {
    let operations = { GET };

    // GET /api/v1/databases
    async function GET(req, res, next) {
        try {
            const databases = await databaseModel.getAllDatabases();
            resourceFetched(res, databases);
        } catch (error) {
            next(error);
        }
    }

    GET.apiDoc = {
        operationId: "getDatabases",
        responses: responseSchema("Databases", "GET"),
        security: [{ restrictLoggedUser: [] }],
        summary: "Returns all the databases from the configuration",
    };

    return operations;
};
