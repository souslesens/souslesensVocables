import { processResponse } from "../../../utils.js";
import configManager from "../../../../../../bin/configManager.js";
export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            configManager.addImportToSource(req.params.id, req.body.importedSource, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Add an import to a source's `imports` list",
        description:
            "Adds `importedSource` to the `imports` array of source `id` in `sources.json` (no-op if already present). " +
            "Triggers `configManager.addImportToSource` so dependent SPARQL queries automatically include the imported graph.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "addSourceImport",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Importing source name. Example: `IOF_core`." },
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        importedSource: { type: "string", description: "Source name to add to `imports`.", example: "BFO" },
                    },
                    example: { importedSource: "BFO" },
                },
                "x-examples": {
                    "Add BFO to IOF_core imports": { importedSource: "BFO" },
                },
            },
        ],
        responses: {
            200: {
                description: "Import added.",
                schema: { properties: { result: { type: "string" } } },
            },
            500: { description: "Source not found or persistence error." },
        },
        tags: ["Sources"],
    };

    return operations;
}
