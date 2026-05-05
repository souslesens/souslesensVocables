import { default as rdfParser } from "rdf-parse";
import { processResponse } from "./utils.js";
import streamify_string_module from "streamify-string";
export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const str = req.query.turtle;
        const textStream = streamify_string_module(str);
        var triples = [];
        var prefixMap = {};

        rdfParser
            .parse(textStream, { contentType: "text/turtle", baseIRI: "" })
            .on("data", function (quad) {
                var obj = {
                    o: quad.object.value,
                    s: quad.subject.value,
                    p: quad.predicate.value,
                };
                triples.push(obj);
            })
            .on("prefix", (prefix, iri) => {
                prefixMap[prefix] = iri.id;
            })
            .on("error", function (error) {
                console.error(error);
                return processResponse(res, error, null);
            })

            .on("end", function () {
                return processResponse(res, null, { triples: triples, prefixMap: prefixMap });
            });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Parse a Turtle string into SLSV-format triples",
        description:
            "Parses `turtle` (a Turtle/N3 document supplied as a query string) using `rdf-parse`. Returns the array of " +
            "`{ s, p, o }` triples and the prefix map declared in the document.",
        operationId: "rdfIoTurtleToTriples",
        parameters: [
            { name: "turtle", in: "query", type: "string", required: true, description: "Turtle/N3 document body." },
        ],
        responses: {
            200: {
                description: "Parsed triples + prefix map.",
                schema: {
                    properties: {
                        triples: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: { s: { type: "string" }, p: { type: "string" }, o: { type: "string" } },
                            },
                        },
                        prefixMap: { type: "object", additionalProperties: { type: "string" } },
                    },
                },
            },
            500: { description: "Parse error." },
        },
        tags: ["RDF"],
    };

    return operations;
}
