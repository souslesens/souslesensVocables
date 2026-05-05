import userManager from "../../../../bin/user.js";
import { rdfDataModel } from "../../../../model/rdfData.js";
import { sourceModel } from "../../../../model/sources.js";

export default function () {
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "List RDF graphs accessible to the current user",
        description:
            "Returns the subset of named graphs present in the triplestore whose URI matches the `graphUri` " +
            "of a source the current user is allowed to read (intersection of triplestore graphs and `getUserSources`). " +
            "Each entry comes from `rdfDataModel.getGraphs()` and exposes at least the graph `name` (its URI).",
        operationId: "sparqlGetUserGraphs",
        parameters: [],
        responses: {
            200: {
                description: "Allowed RDF graphs.",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Graph URI." },
                        },
                    },
                },
                examples: {
                    "application/json": [
                        { name: "http://purl.obolibrary.org/obo/bfo.owl" },
                        { name: "https://www.industrialontologies.org/core/" },
                    ],
                },
            },
            500: {
                description: "Server error while reading graphs from the triplestore.",
                schema: { properties: { error: { type: "object" } } },
            },
        },
        tags: ["Sparql"],
    };

    return operations;
}
