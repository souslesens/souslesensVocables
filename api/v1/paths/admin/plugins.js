const { toolModel } = require("../../../../model/tools");
const { responseSchema } = require("../utils");

module.exports = function () {
    let operations = { PUT };

    // PUT /api/v1/admin/plugins
    async function PUT(req, res, _next) {
        try {
            if (!req.body.plugins) {
                res.status(400).json({
                    message: "The plugins object is missing from this request",
                });
            } else {
                const body = Object.fromEntries(req.body.plugins.map((tool) => [tool.name, tool.config]));
                await toolModel.writeConfig(body);
                res.status(200).json({ message: "Saved successsfully" });
            }
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    PUT.apiDoc = {
        operationId: "plugins.put",
        responses: responseSchema("Tools", "PUT"),
        security: [{ restrictAdmin: [] }],
        summary: "Save the plugins configuration",
    };

    return operations;
};
