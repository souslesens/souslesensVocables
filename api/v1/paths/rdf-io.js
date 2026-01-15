import { default as rdfParser } from 'rdf-parse';
import { processResponse } from './utils.js';
export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const str = req.query.turtle;
        const textStream = require("streamify-string")(str);
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
        summary: "transform turtle into json triples",
        description: "transform turtle into json triples",
        operationId: "transform turtle into json triples",
        parameters: [
            {
                name: "turtle",
                description: "turtle string",
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
        tags: ["RDF"],
    };

    return operations;
};
