import path from "path";
import dataController from "../../../../bin/dataController.js";

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        dataController.getFilesList(req.query.dir, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "List files inside a sub-directory of the data folder",
        description:
            "Returns the file names found under `dataDir/<dir>` via `dataController.getFilesList`. " +
            "Used by MappingModeler and the CSV picker to populate file-selection dialogs.",
        operationId: "dataListFiles",
        parameters: [
            { name: "dir", in: "query", type: "string", required: true, description: "Sub-directory under the configured `dataDir`. Example: `CSV/maintenance`." },
        ],
        responses: {
            200: {
                description: "File names.",
                schema: { type: "array", items: { type: "string" } },
                examples: { "application/json": ["assets.csv", "events.csv"] },
            },
            500: { description: "Read error or directory traversal attempt." },
        },
        tags: ["Data"],
    };

    return operations;
}
