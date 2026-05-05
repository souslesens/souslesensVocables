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
        summary: "Stream an ontology as Turtle by its label",
        description:
            "Resolves `id` (ontology label, e.g. `BFO`, `IOF_core`) to the underlying ontology file via " +
            "`RDF_IO.getOntology` and returns it serialised as `text/turtle`. Used to expose a stable URL for tools that " +
            "need to fetch the raw RDF (reasoners, external editors).",
        operationId: "adminGetOntology",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Ontology label. Example: `BFO`." },
        ],
        produces: ["text/turtle"],
        responses: {
            200: { description: "Turtle content of the ontology.", schema: { type: "string" } },
            500: { description: "Ontology not found or read error." },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Ontology"],
    };
    return operations;
}
