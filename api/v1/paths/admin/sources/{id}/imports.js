import { processResponse } from '../../../utils.js';
import configManager from '../../../../../../bin/configManager.js';
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
        summary: "Add an import to a given source",
        description: "Allow user to add an import to a given source",
        security: [{ restrictLoggedUser: [] }],
        operationId: "sourceImport",
        parameters: [
            { in: "path", name: "id", type: "string", required: true },
            {
                in: "body",
                name: "body",
                schema: {
                    type: "object",
                    properties: {
                        importedSource: { type: "string" },
                    },
                },
            },
        ],
        responses: {
            200: { description: "results", schema: { type: "object", properties: { result: { type: "string" } } } },
        },
        tags: ["Sources"],
    };

    return operations;
};
