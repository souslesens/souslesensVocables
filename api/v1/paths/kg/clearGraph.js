const KGtripleBuilder = require("../../../../bin/KGtripleBuilder.");
const { processResponse } = require("../utils");

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        try {
            KGtripleBuilder.clearGraph(req.body.graphUri, undefined, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Creates triples from csv file",
        description: "Takes a csv filename and directory and returns triples",
        operationId: "createTriplesFromCsvOrTable",
        parameters: [
            {
                name: "body",
                description: "sparqlServerUrl",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        graphUri: { type: "string" },
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
        tags: ["KG"],
    };

    return operations;
};
