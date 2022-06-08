const dataController = require("../../../../bin/dataController.");

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    function GET(req, res, next) {
        dataController.readFile(req.query.dir, req.query.name, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Read content of a file",
        description: "Read content of a file",
        operationId: "Read content of a file",
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

    function POST(req, res, next) {
        dataController.saveDataToFile(req.body.dir, req.body.fileName, req.body.data, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Save Data to file",
        description: "Save Data to file",
        operationId: "Save Data to file",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        dir: {
                            type: "string",
                        },
                        fileName: {
                            type: "string",
                        },
                        data: {
                            type: "string",
                        },
                    },
                },
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
