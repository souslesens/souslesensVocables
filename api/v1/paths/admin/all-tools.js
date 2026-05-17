import { toolModel } from "../../../../model/tools.js";
import { resourceFetched, responseSchema } from "../utils.js";

export default function () {
    let operations = { GET };

    // GET /api/v1/admin/all-tools
    async function GET(req, res, next) {
        try {
            const tools = toolModel.allTools;
            resourceFetched(res, tools);
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }

    GET.apiDoc = {
        operationId: "adminGetAllTools",
        summary: "List every tool known to the platform (admin only)",
        description:
            "Returns the full tool catalog (`toolModel.allTools`), including tools currently disabled or hidden from the UI. " +
            "Useful for admins to inspect available capabilities before enabling them via `PUT /admin/plugins/config`.",
        responses: responseSchema("Tools", "GET"),
        security: [{ restrictAdmin: [] }],
        tags: ["Tools"],
    };

    return operations;
}
