const { toolModel } = require("../../../../../../../model/tools");
const { responseSchema } = require("../../../../utils");

module.exports = function() {
    const operations = { GET };

    // GET /api/v1/admin/plugins/repositories/fetch/{id}
    async function GET(req, res, _next) {
        try {
            const repository = req.params.id;

            const repositories = toolModel.readRepositories();
            if (repositories.hasOwnProperty(repository)) {
                const info = repositories[repository];

                const success = await toolModel.fetchRepository(repository, info);
                if (success) {
                    res.status(200).json({ message: "The repository was updated successsfully", status: 200 });
                } else {
                    res.status(500).json({ message: "An error occurs during the fetching of the repository", status: 500 });
                }
            } else {
                res.status(404).json({ message: "Cannot found the repository", status: 404 });
            }
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    GET.apiDoc = {
        operationId: "plugins.repositories.fetch.get",
        responses: responseSchema("PluginConfig", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Update the plugin Git repository",
    };

    return operations;
}
