import dataController from "../../../../bin/dataController.js";

export default function () {
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
        summary: "Create a new directory under the data folder",
        description: "Creates `dataDir/<dir>/<newDirName>` via `dataController.createDirectory`.",
        operationId: "dataCreateDirectory",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        dir: { type: "string", description: "Parent sub-directory under `dataDir`.", example: "CSV" },
                        newDirName: { type: "string", description: "Name of the directory to create.", example: "maintenance" },
                    },
                    example: { dir: "CSV", newDirName: "maintenance" },
                },
                "x-examples": { "Create CSV/maintenance": { dir: "CSV", newDirName: "maintenance" } },
            },
        ],
        responses: {
            200: { description: "Directory created." },
            500: { description: "Filesystem error or directory traversal attempt." },
        },
        tags: ["Data"],
    };
    return operations;
}
