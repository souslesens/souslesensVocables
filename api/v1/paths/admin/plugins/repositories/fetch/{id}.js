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
        operationId: "adminFetchPluginRepository",
        summary: "Pull the latest commits for a registered plugin repository (admin only)",
        description:
            "Runs `toolModel.fetchRepository` on the Git repository identified by `{id}`. On success the local " +
            "clone is updated to `HEAD`. Requires that the repository was previously registered in `plugins.json` " +
            "via `GET /admin/plugins/repositories`.",
        parameters: [{ name: "id", in: "path", type: "string", required: true, description: "Repository identifier as declared in `plugins.json`. Example: `slsv-plugin-example`." }],
        responses: {
            200: {
                description: "Repository updated successfully.",
                schema: {
                    type: "object",
                    properties: {
                        message: { type: "string", example: "The repository was updated successsfully" },
                        status: { type: "integer", example: 200 },
                    },
                    example: { message: "The repository was updated successsfully", status: 200 },
                },
            },
            404: { description: "Repository `{id}` not found in `plugins.json`." },
            500: { description: "Git fetch failed." },
        },
        security: [{ restrictAdmin: [] }],
        tags: ["Plugins"],
    };

    return operations;
}
