import { processResponse, failure } from "./utils.js";
import rdf from "../../../bin/RDF_IO.js";
import { validateTriples } from "../../../bin/shacl/validator.mjs";
import { promisify } from "util";

const triples2turtle = promisify(rdf.triples2turtle);

// Route /api/v1/shaclValidate: not used client-side (no calls found in public/ or mainapp/src/). Likely deprecated.
export default function () {
    let operations = {
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
                required: true,
                schema: {
                    type: "object",
                    required: ["triples", "shapes"],
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
                            example:
                                "@prefix sh: <http://www.w3.org/ns/shacl#> .\n@prefix ex: <http://example.org/> .\nex:AssetShape a sh:NodeShape ; sh:targetClass ex:Asset ; sh:property [ sh:path ex:id ; sh:minCount 1 ] .",
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
            400: { description: "Invalid request: `triples` must be an array and `shapes` a string." },
            500: { description: "Parse or validation error." },
        },
        tags: ["Misc"],
    };

    async function POST(req, res, next) {
        try {
            const { triples, shapes } = req.body || {};
            if (!Array.isArray(triples) || typeof shapes !== "string") {
                return failure(res, 400, "triples must be an array and shapes must be a string");
            }
            const turtle = await triples2turtle(triples);
            const report = await validateTriples(shapes, turtle);
            return processResponse(res, null, { output: report });
        } catch (e) {
            return processResponse(res, e);
        }
    }

    return operations;
}
