const { processResponse } = require("./utils");
const rdf = require("../../../bin/RDF_IO..js");
const { NamedNode, BlankNode, Literal, Graph } = rdf;

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    POST.apiDoc = {
        summary: "Upload files",
        security: [{ restrictLoggedUser: [] }],
        operationId: "upload",

        responses: {
            200: {
                description: "Response",
                // schema: {}
            },
        },
        parameters: [
            {
                name: "triples",
                description: "triples",
                in: "body",
                schema: {
                    type: "object",
                },
            },
        ],
        tags: ["RDF"],
    };

    function POST(req, res, _next) {
        try {
            var triples = req.body.triples;

            rdf.triples2turtle(triples, function (err, turtle) {
                return processResponse(res, null, { output: turtle });
            });
        } catch (e) {
            return processResponse(res, e);
        }
    }

    function GET(_req, _res, _next) {}

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "transform sls triples to rdf",
        description: "transform turtle into json triples",
        operationId: "transform turtle into json triples",
        parameters: [
            {
                name: "triples",
                description: "triples Array in sls format {subjet:xx,predicate:fff, object : dddd}",
                type: "string",
                in: "query",
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
        tags: ["RDF"],
    };

    return operations;
};
