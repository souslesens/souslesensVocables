const { toolModel } = require("../../../../../model/tools");
const { responseSchema } = require("../../utils");

module.exports = function () {
    const operations = { GET };

    // GET /api/v1/admin/plugins/repositories
    async function GET(_req, res, _next) {
        try {
            const fileContent = toolModel.readRepositories();
            res.status(200).json(fileContent);
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    GET.apiDoc = {
        operationId: "plugins.repositories.get",
        responses: responseSchema("PluginConfig", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Retrieve the plugins repositories",
    };

    return operations;
};
