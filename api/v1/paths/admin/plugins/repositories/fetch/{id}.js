import { toolModel } from "../../../../../../../model/tools.js";
import { responseSchema } from "../../../../utils.js";

export default function () {
    const operations = { GET };

    // GET /api/v1/admin/plugins/repositories/fetch/{id}
    async function GET(req, res, _next) {
        try {
            const repository = req.params.id;

            const repositories = toolModel.readRepositories();
            if (repositories.hasOwnProperty(repository)) {
                const info = repositories[repository];

                const response = await toolModel.fetchRepository(repository, info);
                if (response.status === "success") {
                    res.status(200).json({ message: "The repository was updated successsfully", status: 200 });
                } else {
                    res.status(500).json(response);
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
        tags: ["Plugins"],
    };

    return operations;
}
