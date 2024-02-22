const { databaseModel } = require("../../../../model/databases");
const { resourceFetched, responseSchema } = require("../utils");

module.exports = function () {
    let operations = { GET };

    async function GET(req, res, next) {
        try {
            const serverId = req.params.id;
            const databases = await databaseModel.getDatabasesFromServer();
            resourceFetched(res, databases);
        } catch (error) {
            next(error);
        }
    }

    GET.apiDoc = {
        operationId: "getDatabasesName",
        responses: responseSchema("DatabaseNames", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Returns all databases name",
    };

    return operations;
};
