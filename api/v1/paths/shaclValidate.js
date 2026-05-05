import { processResponse } from "./utils.js";
import rdf from "../../../bin/RDF_IO.js";
const { NamedNode, BlankNode, Literal, Graph } = rdf;

var Validator = null;
import("../../../bin/shacl/validator.mjs").then((mod) => {
    Validator = mod; // true
});

// Route /api/v1/shaclValidate: not used client-side (no calls found in public/ or mainapp/src/). Likely deprecated.
export default function () {
    let operations = {
        GET,
        POST,
    };

    POST.apiDoc = {
        summary: "Validate a triple set against SHACL shapes",
        description:
            "Serialises `body.triples` (SLSV-format triples) to Turtle via `RDF_IO.triples2turtle`, then runs the SHACL " +
            "validator (`bin/shacl/validator.mjs`) using `body.shapes` as the shape graph. Returns the SHACL validation report.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "shaclValidate",
        parameters: [
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        triples: {
                            type: "array",
                            description: "SLSV-format triples to validate.",
                            items: {
                                type: "object",
                                properties: {
                                    s: { type: "string", example: "http://example.org/asset/1" },
                                    p: { type: "string", example: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" },
                                    o: { type: "string", example: "http://example.org/Asset" },
                                },
                            },
                            example: [
                                {
                                    s: "http://example.org/asset/1",
                                    p: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    o: "http://example.org/Asset",
                                },
                            ],
                        },
                        shapes: {
                            type: "string",
                            description: "SHACL shape graph in Turtle.",
                            example: "@prefix sh: <http://www.w3.org/ns/shacl#> .\n@prefix ex: <http://example.org/> .\nex:AssetShape a sh:NodeShape ; sh:targetClass ex:Asset ; sh:property [ sh:path ex:id ; sh:minCount 1 ] .",
                        },
                    },
                    example: {
                        triples: [
                            {
                                s: "http://example.org/asset/1",
                                p: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                o: "http://example.org/Asset",
                            },
                        ],
                        shapes: "@prefix sh: <http://www.w3.org/ns/shacl#> .\n@prefix ex: <http://example.org/> .\nex:AssetShape a sh:NodeShape ; sh:targetClass ex:Asset ; sh:property [ sh:path ex:id ; sh:minCount 1 ] .",
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "SHACL validation report.",
                schema: { properties: { output: { type: "object" } } },
            },
            500: { description: "Parse or validation error." },
        },
        tags: ["Misc"],
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
        summary: "[GET stub] SHACL validation",
        description:
            "Stub — the GET handler is currently a no-op. Use `POST /shaclValidate` to validate triples against shapes.",
        operationId: "shaclValidateGet",
        parameters: [
            { name: "shapes", in: "query", type: "string", required: true, description: "SHACL rules in Turtle." },
            { name: "triples", in: "query", type: "string", required: true, description: "SLSV-format triples." },
        ],
        responses: {
            200: { description: "(no-op).", schema: { type: "object" } },
        },
        tags: ["Misc"],
    };

    return operations;
}
