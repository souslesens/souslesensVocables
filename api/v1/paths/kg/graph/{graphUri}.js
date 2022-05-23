const CsvTripleBuilder = require("../../../../../bin/KG/CsvTripleBuilder.");
const { processResponse } = require("../../utils");

module.exports = function () {
    let operations = {
        DELETE,
    };

    function DELETE(req, res, next) {
        try {
            CsvTripleBuilder.clearGraph(req.params.graphUri, req.body.sparqlServerUrl || null, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            next(e);
        }
    }

    DELETE.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Creates triples from csv file",
        description: "Takes a csv filename and directory and returns triples",
        operationId: "createTriplesFromCsv",
        parameters: [
            {
                name: "graphUri",
                description: "Graph's Uri to clear",
                in: "path",
                type: "string",
                required: true,
            },
            {
                name: "body",
                description: "sparqlServerUrl",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        sparqlServerUrl: { type: "string" },
                    },
                },
                required: false,
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
