import path from 'path';
const kGcontroller = require(path.resolve("bin/KG/KGcontroller."));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        kGcontroller.getAssetGlobalMappings(req.params.name, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrieve a KG asset mapping",
        description: "Retrieve a KG asset mapping",
        operationId: "Retrieve a KG asset mapping",
        parameters: [
            {
                name: "name",
                description: "name",
                in: "path",
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
