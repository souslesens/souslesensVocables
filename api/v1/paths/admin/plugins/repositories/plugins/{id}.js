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
        operationId: "adminGetRepositoryPlugins",
        summary: "List plugin sub-directories inside a cloned Git repository (admin only)",
        description:
            "Scans the local clone of repository `{id}` for sub-directories containing a `public/js/main.js` " +
            "file (the plugin entry-point marker) and returns their names via `toolModel.getRepositoryPlugins`. " +
            "When the repository contains only one plugin, `message` is a single-entry array with the repository id itself.",
        parameters: [
            { name: "id", in: "path", type: "string", required: true, description: "Repository identifier. Example: `slsv-plugin-example`." },
        ],
        responses: {
            200: {
                description: "Plugin directory names found in the repository.",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "array",
                            items: { type: "string" },
                            description: "Plugin folder names (one per discovered `public/js/main.js`).",
                            example: ["slsv-plugin-example"],
                        },
                        status: { type: "integer", example: 200 },
                    },
                    example: { message: ["slsv-plugin-example"], status: 200 },
                },
            },
            404: { description: "Repository `{id}` not found in the plugins directory or `plugins.json`." },
        },
        security: [{ restrictAdmin: [] }],
        tags: ["Plugins"],
    };

    return operations;
}
