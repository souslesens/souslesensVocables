import { toolModel } from "../../../../../../../model/tools.js";
import { responseSchema } from "../../../../utils.js";

export default function () {
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
        operationId: "adminGetRepositoryTags",
        summary: "List the most recent Git tags of a plugin repository (admin only)",
        description:
            "Returns up to 5 tags from the local clone of repository `{id}`, sorted descending by refname " +
            "(latest first) via `toolModel.getRepositoryTags`. Used by the admin UI to pick a specific plugin " +
            "version before installation.",
        parameters: [{ name: "id", in: "path", type: "string", required: true, description: "Repository identifier. Example: `slsv-plugin-example`." }],
        responses: {
            200: {
                description: "Most recent Git tags (max 5, newest first).",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "array",
                            items: { type: "string" },
                            description: "Tag names sorted descending by refname.",
                            example: ["v2.1.0", "v2.0.1", "v2.0.0"],
                        },
                        status: { type: "string", example: "success" },
                    },
                    example: { message: ["v2.1.0", "v2.0.1", "v2.0.0"], status: "success" },
                },
            },
            404: { description: "Repository `{id}` not found in the plugins directory or `plugins.json`." },
        },
        security: [{ restrictAdmin: [] }],
        tags: ["Plugins"],
    };

    return operations;
}
