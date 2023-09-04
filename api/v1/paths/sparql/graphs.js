const { rdfDataModel } = require("../../../../model/rdfData");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(_req, res, _next) {
        try {
            const rdfGraphs = await rdfDataModel.getGraphs();
            res.status(200).send(rdfGraphs);
        } catch (error) {
            res.status(500).send({ error: error });
            console.error(error);
        }
    }

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Get all RDF graphs present in the triplestore",
        description: "Get all RDF graphs present in the triplestore",
        operationId: "Sparql get graphs",
        parameters: [],
        responses: {
            200: {
                description: "Indices to delete",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
            },
            500: {
                description: "Server error",
                schema: {
                    properties: {
                        error: { type: "object" },
                    },
                },
            },
        },
    };

    return operations;
};
