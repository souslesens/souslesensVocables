const dataController = require("../../../../bin/dataController.");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        dataController.parseJsonWithJsonPath(req.query.dir, req.query.name, req.query.jsonpath, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Parse JSON content of a file with JSONPath",
        description: "Parse JSON content of a file with JSONPath",
        operationId: "Parse JSON content of a file with JSONPath",
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
            {
                name: "jsonpath",
                description: "JSONPath expression",
                in: "query",
                type: "string",
                required: true,
            },
        ],

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
