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
        description: "Returns the file names found under `dataDir/<dir>` via `dataController.getFilesList`. " + "Used by MappingModeler and the CSV picker to populate file-selection dialogs.",
        operationId: "dataListFiles",
        // Same rule as `GET /data/file`: `dir` is derived from the agent's `source`, never supplied.
        "x-mcp": {
            tools: [
                {
                    name: "sls_mappings_list",
                    access: "read",
                    description: "Names of the mapping documents saved for a source, one per data source. Feed a name straight to sls_mapping_get.",
                    params: { source: { type: "string", required: true, description: "SLS source name the mappings target." } },
                    query: { dir: "mappings/{source}" },
                    // getFilesList answers null when the directory does not exist, which simply
                    // means the source has no mapping yet.
                    emptyListWhenNull: true,
                    // The directory also holds editor backups (`*.json-19-12`), which sls_mapping_get
                    // cannot read: the shape keeps the real mappings and drops their extension.
                    resultShape: "mappingFileNames",
                },
            ],
        },
        parameters: [{ name: "dir", in: "query", type: "string", required: true, description: "Sub-directory under the configured `dataDir`. Example: `CSV/maintenance`." }],
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
