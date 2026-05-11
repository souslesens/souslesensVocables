import { toolModel } from "../../../../../model/tools.js";
import { responseSchema } from "../../utils.js";

export default function () {
    const operations = { GET, PUT };

    // GET /api/v1/admin/plugins/config
    async function GET(_req, res, _next) {
        try {
            const fileContent = toolModel.readConfig();
            res.status(200).json(fileContent);
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    GET.apiDoc = {
        operationId: "adminGetPluginsConfig",
        summary: "Read the plugins configuration file (admin only)",
        description: "Returns the raw plugins configuration (`toolModel.readConfig`) — enabled state, install paths, options.",
        responses: responseSchema("PluginConfig", "GET"),
        security: [{ restrictAdmin: [] }],
        tags: ["Plugins"],
    };

    // PUT /api/v1/admin/plugins/config
    async function PUT(req, res, _next) {
        try {
            if (!req.body.plugins) {
                res.status(400).json({
                    message: "The plugins object is missing from this request",
                });
            } else {
                await toolModel.writeConfig(req.body.plugins);
                res.status(200).json({ message: "Saved successsfully" });
            }
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    PUT.apiDoc = {
        operationId: "adminPutPluginsConfig",
        summary: "Persist the plugins configuration (admin only)",
        description: "Writes `body.plugins` through `toolModel.writeConfig`. Returns `400` if `plugins` is missing.",
        parameters: [
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        plugins: {
                            type: "object",
                            description: "Map keyed by plugin name with enabled flag and options.",
                            example: {
                                lineage: { enabled: true },
                                KGquery: { enabled: true },
                                MappingModeler: { enabled: false },
                            },
                        },
                    },
                    example: {
                        plugins: {
                            lineage: { enabled: true },
                            KGquery: { enabled: true },
                            MappingModeler: { enabled: false },
                        },
                    },
                },
            },
        ],
        responses: {
            200: { description: "Saved.", schema: { properties: { message: { type: "string" } } } },
            400: { description: "Missing `plugins` body." },
            500: { description: "Persistence error." },
        },
        security: [{ restrictAdmin: [] }],
        tags: ["Plugins"],
    };

    return operations;
}
