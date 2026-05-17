export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        try {
            /*var triples = JSON.parse(req.query.triples);
            var result = TriplesToManchester.convert(triples);
            return res.status(200).json({ result: result });*/
        } catch (err) {
            return res.status(400).json({ error: err.message || err });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Convert axiom triples to Manchester syntax (in-process)",
        description:
            "In-process Manchester rendering (no JOWL server round-trip). Currently the body of the handler is " +
            "commented out — kept as an HTTP entry point for the legacy `TriplesToManchester` engine.",
        operationId: "axiomsToManchester",
        parameters: [{ name: "triples", in: "query", type: "string", required: true, description: "JSON-encoded triple array to render." }],
        responses: {
            200: {
                description: "Manchester string rendered from the supplied triples.",
                schema: {
                    type: "object",
                    properties: { result: { type: "string", description: "Manchester-syntax expression.", example: "BFO_0000001 SubClassOf owl:Thing" } },
                    example: { result: "BFO_0000001 SubClassOf owl:Thing" },
                },
            },
            400: { description: "Parse error.", schema: { properties: { error: { type: "string" } } } },
        },
        tags: ["Axiom"],
    };

    return operations;
}
