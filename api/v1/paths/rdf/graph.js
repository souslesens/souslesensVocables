const { rdfDataModel } = require("../../../../model/rdfData");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        try {
            const graphUri = req.query.graph;
            const limit = req.query.limit;
            const offset = req.query.offset;
            const data = await rdfDataModel.getGraphPartNt(graphUri, limit, offset);
            res.status(200).send(data);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Get a RDF graph",
        description: "Get a RDF graph in several serialization format",
        operationId: "RDF get graph",
        parameters: [
            {
                name: "graph",
                description: "URI of the graph to retrieve",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "limit",
                description: "SPARQL LIMIT",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "offset",
                description: "SPARQL OFFSET",
                in: "query",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "The RDF data",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
