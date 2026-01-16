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
        operationId: "plugins.get",
        responses: responseSchema("Tools", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Returns all available plugins",
        tags: ["Plugins"],
    };

    return operations;
}
