const path = require("path");
const KGbuilder_main = require(path.resolve("bin/KGbuilder/KGbuilder_main.js"));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        KGbuilder_main.getSourceMappingsFiles(req.query.source, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrieve mappings files used by a source with triples created on it",
        description: "Retrieve mappings files used by a source with triples created on it",
        operationId: "Retrieve mappings files used by a source with triples created on it",
        parameters: [
            {
                name: "source",
                description: "source",
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
        tags: ["KG"],
    };

    return operations;
};
