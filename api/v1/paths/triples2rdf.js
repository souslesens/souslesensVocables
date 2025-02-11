const { processResponse } = require("./utils");
const rdf = require("../../../bin/RDF_IO..js");
const { NamedNode, BlankNode, Literal, Graph } = rdf;

var Validator = null;
import("../../../bin/shacl/validator.mjs").then((mod) => {
    Validator = mod; // true
});

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
    };

    function POST(req, res, next) {
        try {
            var triples = req.body.triples;

            var turtle = rdf.triples2turtle(triples);
            return processResponse(res, null, turtle);

            rdf.triples2turtle(triples, function (err, result) {
                const report = Validator.triples2turtle(result);
                return processResponse(res, null, report);
            });
        } catch (e) {
            return processResponse(res, e);
        }
    }

    function GET(req, res, next) {}

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
    };

    return operations;
};
