const dataController = require("../../../../bin/dataController.");

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        dataController.addRowIdToCsv(req.body.dir, req.body.fileName, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json({message: result});
            }
        });
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Add row_ID to a CSV file",
        description: "Add row_ID to a CSV file",
        operationId: "Add row_ID to a CSV file",
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
