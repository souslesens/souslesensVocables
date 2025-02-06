
//const {processResponse} = require("./utils");
import {processResponse} from "./utils.js";
import rdf from '@rdfjs/data-model'
import toNT from '@rdfjs/to-ntriples'

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {

        var str=toNT([
            rdf.quad(
                rdf.blankNode(),
                rdf.namedNode('http://example.org/predicate'),
                rdf.literal('1')
            ),
            rdf.quad(
                rdf.blankNode(),
                rdf.namedNode('http://example.org/predicate'),
                rdf.literal('2')
            )
        ])

                return processResponse(res, null, {output: str});


    }


    GET.apiDoc = {
        security: [{restrictLoggedUser: []}],
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
