const fs = require("fs");
const path = require("path");
const { processResponse } = require("../utils");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        try {
            var filePath = req.query.filePath;
            var realPath = path.resolve(`public/vocables/${filePath}`);
            var data = "" + fs.readFileSync(realPath);
            var json = JSON.parse(data);
            processResponse(res, null, json);
        } catch (e) {
            next(e);
        }
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
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
    };

    return operations;
};
