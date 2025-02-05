const { toolModel } = require("../../../../../model/tools");
const { responseSchema } = require("../../utils");

module.exports = function () {
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
        operationId: "plugins.config.get",
        responses: responseSchema("PluginConfig", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Retrieve the plugins configuration",
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
        operationId: "plugins.config.put",
        responses: responseSchema("Tools", "PUT"),
        security: [{ restrictAdmin: [] }],
        summary: "Save the plugins configuration",
        tags: ["Plugins"],
    };

    return operations;
};
