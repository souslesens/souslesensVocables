export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {}

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Return manchester syntax of triples",
        description: "Return manchester syntax of triples",
        operationId: "Return manchester syntax of triples",
        parameters: [
            {
                name: "triples",
                description: "triples",
                in: "query",
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
        tags: ["Axiom"],
    };

    return operations;
}
