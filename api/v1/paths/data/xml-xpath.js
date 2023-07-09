const dataController = require("../../../../bin/dataController.");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        dataController.parseXmlWithXPath(req.query.dir, req.query.name, req.query.xpath, function (err, result) {
            if (err) {
                return res.status(400).json(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Parse XML content of a file with XPath",
        description: "Parse XML content of a file with XPath",
        operationId: "Parse XML content of a file with XPath",
        parameters: [
            {
                name: "dir",
                description: "subDirectory in /dataDir",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "name",
                description: "name",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "xpath",
                description: "XPath expression",
                in: "query",
                type: "string",
                required: true,
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
            },
        },
    };

    return operations;
};
