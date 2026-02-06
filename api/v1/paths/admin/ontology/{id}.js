import RDF_IO from "../../../../../bin/RDF_IO.js";

export default function () {
    let operations = {
        GET,
    };
    async function GET(req, res, next) {
        try {
            if (!req.params.id) return req.send("missing ontology label");
            var name = req.params.id;
            RDF_IO.getOntology(name, function (err, result) {
                res.contentType("text/turtle");
                res.status(200).send(result);
            });
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "Returns an ontology",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getOntology",
        parameters: [
            {
                name: "id",
                description: "Ontology id",
                in: "path",
                type: "string",
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
        tags: ["Ontology"],
    };
    return operations;
}
