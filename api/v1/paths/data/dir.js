const dataController = require("../../../../bin/dataController.");

module.exports = function () {
    const operations = {
        POST,
    };

    function POST(req, res, next) {
        dataController.createDirectory(req.body.dir, req.body.newDirName, function (err, result) {
            if (err) {
                res.status(err.status || 500).json(err);
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Create new directory in a subdirectory of data",
        description: "Create new directory in a subdirectory of data",
        operationId: "Create new directory in a subdirectory of data",
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
                        newDirName: {
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
        tags: ["Data"],
    };
    return operations;
};
