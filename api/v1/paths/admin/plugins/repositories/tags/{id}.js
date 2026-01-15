import { toolModel } from '../../../../../../../model/tools.js';
import { responseSchema } from '../../../../utils.js';

module.exports = function () {
    const operations = { GET };

    // GET /api/v1/admin/plugins/repositories/tags/{id}
    async function GET(req, res, _next) {
        try {
            const repository = req.params.id;

            const response = await toolModel.getRepositoryTags(repository);
            if (response.status === "success") {
                res.status(200).json({ message: response.message, status: 200 });
            } else {
                res.status(404).json({ message: "This repository do not exists", status: 404 });
            }
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    GET.apiDoc = {
        operationId: "plugins.repositories.tags.get",
        responses: responseSchema("PluginConfig", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Retrieve the tags of the Git repository",
        tags: ["Plugins"],
    };

    return operations;
};
