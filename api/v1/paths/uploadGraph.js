const RDF_IO = require("../../../bin/RDF_IO.");
const { processResponse } = require("./utils");

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        try {
            RDF_IO.uploadOntologyFromOwlFile(req.body.graphUri, req.body.filePath, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Upload an Owl graph",
        description: "Let user upload an owl graph",
        operationId: "uploadOwlGraph",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        graphUri: {
                            type: "string",
                        },
                        filePath: {
                            type: "string",
                        },
                    },
                },
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
