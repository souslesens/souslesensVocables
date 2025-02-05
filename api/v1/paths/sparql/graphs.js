const userManager = require("../../../../bin/user.");
const { rdfDataModel } = require("../../../../model/rdfData");
const { sourceModel } = require("../../../../model/sources");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);

            const userGraphUri = Object.entries(userSources).map(([_, src]) => {
                return src.graphUri;
            });

            const rdfGraphs = await rdfDataModel.getGraphs();
            const allowedRdfGraphs = rdfGraphs.filter((g) => userGraphUri.includes(g.name));

            res.status(200).send(allowedRdfGraphs);
        } catch (error) {
            res.status(500).send({ error: error });
            console.error(error);
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
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
        tags: ["Sparql"],
    };

    return operations;
};
