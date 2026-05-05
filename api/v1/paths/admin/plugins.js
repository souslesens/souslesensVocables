import { toolModel } from "../../../../model/tools.js";
import { responseSchema } from "../utils.js";

export default function () {
    const operations = { GET };

    // GET /api/v1/admin/plugins
    async function GET(_req, res, _next) {
        try {
            const plugins = toolModel.plugins;
            res.status(200).json(plugins);
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    GET.apiDoc = {
        operationId: "adminGetPlugins",
        summary: "List installed plugins (admin only)",
        description:
            "Returns `toolModel.plugins`: the plugins currently registered with the platform. " +
            "Distinct from `GET /admin/all-tools` which also includes built-in tools.",
        responses: responseSchema("Tools", "GET"),
        security: [{ restrictAdmin: [] }],
        tags: ["Plugins"],
    };

    return operations;
}
