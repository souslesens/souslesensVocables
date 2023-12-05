const { rdfDataModel } = require("../../../../../model/rdfData");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const graphUri = req.query.graph;
            const graphSize = await rdfDataModel.getTripleCount(graphUri);
            const pageSize = Math.min(await rdfDataModel.getPageSize(graphUri), 2000);
            res.status(200).send({ graph: graphUri, graphSize: graphSize, pageSize: pageSize });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Get a RDF graph info (size and pageSize)",
        operationId: "RDF get graph info",
        parameters: [
            {
                name: "graph",
                description: "URI of the graph to retrieve",
                in: "query",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "The RDF graph info",
                schema: {
                    properties: {
                        graph: { type: "string" },
                        graphSize: { type: "number" },
                        pageSize: { type: "number" },
                    },
                },
            },
        },
    };

    return operations;
};
