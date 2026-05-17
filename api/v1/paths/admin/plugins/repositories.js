import { toolModel } from "../../../../../model/tools.js";
import { responseSchema } from "../../utils.js";

export default function () {
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
        operationId: "adminGetPluginRepositories",
        summary: "List configured plugin Git repositories (admin only)",
        description:
            "Returns the contents of `plugins.json`: a map of repository identifiers to their configuration " +
            "(at minimum a `url` field pointing to the Git remote). Used by the admin UI to manage which " +
            "external plugin repositories are registered on the platform.",
        responses: {
            200: {
                description: "Registered plugin repository configurations.",
                schema: {
                    type: "object",
                    additionalProperties: {
                        type: "object",
                        properties: {
                            url: { type: "string", description: "Git remote URL of the repository.", example: "https://github.com/souslesens/slsv-plugin-example" },
                        },
                        additionalProperties: true,
                    },
                    example: {
                        "slsv-plugin-example": { url: "https://github.com/souslesens/slsv-plugin-example" },
                    },
                },
            },
            500: { description: "Failed to read `plugins.json`." },
        },
        security: [{ restrictAdmin: [] }],
        tags: ["Plugins"],
    };

    return operations;
}
