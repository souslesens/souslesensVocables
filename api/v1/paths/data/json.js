const dataController = require("../../../../bin/dataController.");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        dataController.readJson(req.query.dir, req.query.name, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Read JSON content of a file",
        description: "Read JSON content of a file",
        operationId: "Read JSON content of a file",
        parameters: [
            {
                name: "dir",
                description: "subDirectory in /dataDir",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "name",
                description: "name",
                in: "query",
                type: "string",
                required: true,
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
