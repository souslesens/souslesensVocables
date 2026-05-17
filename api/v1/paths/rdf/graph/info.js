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
            if (includesImports === "true") {
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Return graph URI and total triple count for a source",
        description:
            "Lightweight endpoint (a single `COUNT(*)` SPARQL query) used by the UI to display graph size before " +
            "downloading via `GET /rdf/graph`. When `withImports=true`, the count aggregates triples from imported sources too.",
        operationId: "rdfGetGraphInfo",
        parameters: [
            { name: "source", in: "query", type: "string", required: true, description: "Source name. Example: `BFO`." },
            { name: "withImports", in: "query", type: "string", required: false, default: "false", description: "Aggregate counts across imported sources. Pass `true` to include imports." },
        ],
        responses: {
            200: {
                description: "Graph URI and triple count.",
                schema: {
                    properties: {
                        graph: { type: "string" },
                        graphSize: { type: "number" },
                    },
                },
                examples: {
                    "application/json": {
                        graph: "http://purl.obolibrary.org/obo/bfo.owl",
                        graphSize: 1452,
                    },
                },
            },
            404: { description: "Source not accessible to the current user." },
            500: { description: "Triplestore error." },
        },
        tags: ["RDF"],
    };

    return operations;
}
