const { processResponse } = require("./utils");
const rdf = require("rdf");
const { NamedNode, BlankNode, Literal } = rdf;

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        try {
            const graph = new rdf.Graph();
            graph.add(new rdf.Triple(new NamedNode("http://example.com/"), rdf.rdfsns("label"), new Literal("Book", "@en")));
            graph.add(new rdf.Triple(new NamedNode("http://example.com/"), rdf.rdfns("value"), new Literal("10.0", rdf.xsdns("decimal"))));
            graph.add(new rdf.Triple(new BlankNode(), rdf.rdfns("value"), new Literal("10.1", rdf.xsdns("decimal"))));

            const profile = rdf.environment.createProfile();
            profile.setDefaultPrefix("http://example.com/");
            profile.setPrefix("ff", "http://xmlns.com/foaf/0.1/");
            const turtle = graph
                .toArray()
                .sort(function (a, b) {
                    return a.compare(b);
                })
                .map(function (stmt) {
                    return stmt.toTurtle(profile);
                });
            //console.log(profile.n3());
            console.log(turtle.join("\n"));
        } catch (e) {
            console.log(e);
        }

        return processResponse(res, null, { output: str });
    }

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
