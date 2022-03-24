const path = require("path");
const dataController = require(path.resolve("bin/dataController."));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        dataController.getFilesList(function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "List files in data directory",
        description: "List files in data directory",
        operationId: "List files in data directory",
        parameters: [],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
            },
        },
    };

    return operations;
};
