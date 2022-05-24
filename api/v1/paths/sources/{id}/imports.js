const { processResponse } = require("../../utils");
const configManager = require("../../../../../bin/configManager.");
module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            configManager.addImportToSource(req.params.id, req.body.importedSource, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (err) {
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Add an import to a given source",
        description: "Allow user to add an import to a given source",
        security: [{ loginScheme: [] }],
        operationId: "sourceImport",
        parameters: [
            { in: "path", name: "id", type: "string", required: true },
            {
                in: "body",
                name: "body",
                schema: {
                    type: "object",
                    properties: {
                        importedSource: { type: "string" },
                    },
                },
            },
        ],
        responses: {
            200: { description: "results", schema: { type: "object", properties: { result: { type: "string" } } } },
        },
    };

    return operations;
};
