import { processResponse } from "./utils.js";



export default function () {
    let operations = {
        GET,
        POST,
    };

    POST.apiDoc = {
        summary: "transform owlrestrictions into html form",
        security: [{ restrictLoggedUser: [] }],
        operationId: "shaclform",

        responses: {
            200: {
                description: "Response",
                // schema: {}
            },
        },
        parameters: [
            {
                name: "graphUri",
                description: "graphUri",
                in: "body",
                type: "string",
                required: true,
            },
            {
                name: "classUri",
                description: "classUri",
                in: "body",
                type: "string",
                required:true,
            },
            {
                name: "divId",
                description: "divId",
                in: "body",
                type: "string",
                required:true,
            },
        ],
    };

    function POST(req, res, next) {
        try {
            var triples = req.body.triples;
            var shapes = req.body.shapes;

            rdf.triples2turtle(triples, function (err, turtle) {
                const report = Validator.validateTriples(shapes, turtle);
                return processResponse(res, null, { output: report });
            });
        } catch (e) {
            return processResponse(res, e);
        }
    }

    function GET(req, res, next) {}

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "validates triples  regarding shacl turtle rules ",
        description: "validates triples  regarding shacl turtle rules ",
        operationId: "validates triples  regarding shacl turtle rules",
        parameters: [
            {
                name: "shapes",
                description: "shacl rules in turtle format",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "triples",
                description: "triples graph  in sls format",
                type: "string",
                in: "query",
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
}
