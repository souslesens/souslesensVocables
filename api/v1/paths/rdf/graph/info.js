import { rdfDataModel } from "../../../../../model/rdfData.js";
import userManager from "../../../../../bin/user.js";
import { sourceModel } from "../../../../../model/sources.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const sourceName = req.query.source;
            const includesImports = req.query.withImports;

            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);

            if (!Object.keys(userSources).includes(sourceName)) {
                res.status(404).send({ error: `${sourceName} not found` });
                return;
            }

            let graphsImports = [];
            if (includesImports) {
                graphsImports = userSources[sourceName].imports
                    .map((src) => {
                        if (userSources[src].graphUri) {
                            return userSources[src].graphUri;
                        } else {
                            return null;
                        }
                    })
                    .filter((uri) => uri !== null);
            }

            const graphUri = userSources[sourceName].graphUri;
            const graphSize = await rdfDataModel.getTripleCount(graphUri, graphsImports);
            res.status(200).send({ graph: graphUri, graphSize: graphSize });
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
                name: "source",
                description: "Source name of the graph to retrieve",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "withImports",
                description: "",
                in: "query",
                type: "boolean",
                required: false,
                default: false,
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
        tags: ["RDF"],
    };

    return operations;
}
