const { toolModel } = require("../../../../model/tools");
const { resourceFetched, responseSchema } = require("../utils");

module.exports = function () {
    let operations = { GET };

    // GET /api/v1/admin/all-tools
    async function GET(req, res, next) {
        try {
            const tools = toolModel.allTools;
            resourceFetched(res, tools);
        } catch (error) {
            res.status(error.status || 500).json(error);next(error);
        }
    }

    GET.apiDoc = {
        operationId: "all-tools.get",
        responses: responseSchema("Tools", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Returns all existing tools wether they are made available or not",
        tags: ["Tools"],
    };

    return operations;
};
