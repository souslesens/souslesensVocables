import dataController from "../../../../bin/dataController.js";

export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
    };

    function GET(req, res, next) {
        dataController.readFile(req.query.dir, req.query.fileName, function (err, result) {
            if (err) {
                if (err == "file does not exist") {
                    return res.status(500).json(err);
                }
                res.status(err.status || 500).json(err);
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
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
                name: "fileName",
                description: "fileName",
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
        tags: ["Data"],
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
        security: [{ restrictLoggedUser: [] }],
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
        tags: ["Data"],
    };

    function DELETE(req, res, next) {
        dataController.deleteFile(req.query.dir, req.query.fileName, function (err, result) {
            if (err) {
                res.status(err === "file does not exist" ? 404 : 500).json({ error: err });
                return next(err);
            }
            return res.status(200).json({ done: true, message: result });
        });
    }

    DELETE.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Delete a file",
        description: "Delete a file from a sub-directory of data",
        operationId: "Delete a file",
        parameters: [
            {
                name: "dir",
                description: "subDirectory in /dataDir",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "fileName",
                description: "fileName",
                in: "query",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "File deleted",
                schema: {
                    type: "object",
                },
            },
        },
        tags: ["Data"],
    };

    return operations;
}
