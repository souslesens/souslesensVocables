import path from 'path';
const kGcontroller = require(path.resolve("bin/KG/KGcontroller.js"));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        kGcontroller.getMappings(req.params.name, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrieve a KG mapping",
        description: "Retrieve a KG mapping",
        operationId: "Retrieve a KG mapping",
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
