const { databaseModel } = require("../../../model/databases");
const { resourceFetched, responseSchema } = require("./utils");
const userManager = require("../../../bin/user.");

module.exports = function () {
    let operations = { GET };

    // GET /api/v1/databases
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const databases = await databaseModel.getUserDatabasesName(userInfo.user);
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
