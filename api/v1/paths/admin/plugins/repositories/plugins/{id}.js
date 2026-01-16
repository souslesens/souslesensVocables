import { toolModel } from "../../../../../../../model/tools.js";
import { responseSchema } from "../../../../utils.js";

export default function () {
    const operations = { GET };

    // GET /api/v1/admin/plugins/repositories/plugins/{id}
    async function GET(req, res, _next) {
        try {
            const repository = req.params.id;

            const response = await toolModel.getRepositoryPlugins(repository);
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
        operationId: "plugins.repositories.plugins.get",
        responses: responseSchema("PluginConfig", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Retrieve the plugin directories in the Git repository",
        tags: ["Plugins"],
    };

    return operations;
}
