const CsvTripleBuilder = require("../../../../../bin/KG/CsvTripleBuilder.");
const { processResponse } = require("../../utils");

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        try {
            CsvTripleBuilder.createTriplesFromCsv(req.body.dir, req.body.fileName, JSON.parse(req.body.options), function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Creates triples from csv file",
        description: "Takes a csv filename and directory and returns triples",
        operationId: "createTriplesFromCsv",
        parameters: [
            {
                name: "body",
                description: "subDirectory in /dataDir",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        dir: { type: "string" },
                        fileName: { type: "string" },
                        options: { type: "string" },
                    },
                },
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
    };

    return operations;
};
