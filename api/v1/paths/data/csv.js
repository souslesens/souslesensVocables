import dataController from "../../../../bin/dataController.js";

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        let options = null;
        if (req.query.options) {
            options = JSON.parse(req.query.options);
        }
        dataController.readCsv(req.query.dir, req.query.fileName, options, function (err, result) {
            if (err) {
                res.status(err.status || 500).json(err);
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Read a CSV file as a JSON array of rows",
        description:
            "Parses `dataDir/<dir>/<fileName>` via `dataController.readCsv`. Pass `options` to limit the number of rows " +
            "returned (e.g. `{\"lines\":50}`) — used by MappingModeler to preview large files.",
        operationId: "dataReadCsv",
        parameters: [
            { name: "dir", in: "query", type: "string", required: true, description: "Sub-directory under `dataDir`." },
            { name: "fileName", in: "query", type: "string", required: true, description: "CSV file name." },
            { name: "options", in: "query", type: "string", required: false, description: "JSON-encoded options, e.g. `{\"lines\":50}`." },
        ],
        responses: {
            200: { description: "Parsed rows.", schema: { type: "object" } },
            500: { description: "Read or parse error." },
        },
        tags: ["Data"],
    };

    return operations;
}
