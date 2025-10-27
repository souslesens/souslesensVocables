const fs = require("fs");
const path = require("path");
const { processResponse, sanitizePath } = require("../utils");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        try {
            const filePath = sanitizePath(req.query.filePath);
            const realPath = path.resolve(`public/vocables/${filePath}`);
            const data = fs.readFileSync(realPath).toString();
            const json = JSON.parse(data);
            processResponse(res, null, json);
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Get json file",
        description: "Get a json file",
        operationId: "getJsonFile",
        parameters: [{ in: "query", type: "string", required: true, name: "filePath", description: "file path" }],

        responses: {
            200: {
                description: "Results",
                schema: {},
            },
        },
        tags: ["Misc"],
    };

    return operations;
};
