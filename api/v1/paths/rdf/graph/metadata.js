import { rdfDataModel } from "../../../../../model/rdfData.js";
import userManager from "../../../../../bin/user.js";
import { sourceModel } from "../../../../../model/sources.js";

export default function () {
    let operations = {
        GET,
        POST,
    };
    async function POST(req, res, _next) {
        try {
            const sourceName = req.query.source;
            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);
            if (!Object.keys(userSources).includes(sourceName)) {
                res.status(404).send({ error: `${sourceName} not found` });
                return;
            }
            const graphUri = userSources[sourceName].graphUri;
            await rdfDataModel.addMetadata(graphUri, req.body.addedData);
            await rdfDataModel.removeMetadata(graphUri, req.body.removedData);

            res.status(200).send();
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    }

    async function GET(req, res, _next) {
        try {
            const sourceName = req.query.source;

            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);

            if (!Object.keys(userSources).includes(sourceName)) {
                res.status(404).send({ error: `${sourceName} not found` });
                return;
            }

            const graphUri = userSources[sourceName].graphUri;
            const metadata = await rdfDataModel.getRdfMetadata(graphUri);
            res.status(200).send({ graph: graphUri, metadata: metadata });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Add and/or remove metadata triples on a source's graph",
        description:
            "Applies a delta on the metadata-level triples of the named graph attached to `source`: " +
            "`addedData` is inserted, `removedData` is deleted (both via `rdfDataModel.addMetadata`/`removeMetadata`). " +
            "Used by the UI to edit `dc:title`, `dc:creator`, `owl:imports`, version annotations, etc.",
        operationId: "rdfPostGraphMetadata",
        parameters: [
            { name: "source", in: "query", type: "string", required: true, description: "Source name. Example: `IOF_core`." },
            {
                name: "body",
                in: "body",
                description: "Triples to add and triples to remove. Each triple is `[subject, predicate, object]`.",
                schema: {
                    type: "object",
                    properties: {
                        addedData: {
                            type: "array",
                            items: { type: "array", items: { type: "string" } },
                        },
                        removedData: {
                            type: "array",
                            items: { type: "array", items: { type: "string" } },
                        },
                    },
                },
                "x-examples": {
                    "Set dc:title on IOF_core": {
                        addedData: [["https://www.industrialontologies.org/core/", "http://purl.org/dc/terms/title", '"Industrial Ontology Foundry – Core"']],
                        removedData: [],
                    },
                },
            },
        ],
        responses: {
            200: { description: "Metadata updated." },
            404: { description: "Source not accessible to the current user." },
            500: { description: "Triplestore error." },
        },
        tags: ["RDF"],
    };
    GET.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Read metadata triples of a source's graph",
        description: "Returns metadata-level triples (titles, creators, imports, versioning) of the named graph attached to `source`, " + "as fetched by `rdfDataModel.getRdfMetadata`.",
        operationId: "rdfGetGraphMetadata",
        parameters: [{ name: "source", in: "query", type: "string", required: true, description: "Source name." }],
        responses: {
            200: {
                description: "Graph URI and its metadata triples.",
                schema: {
                    properties: {
                        graph: { type: "string" },
                        metadata: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    predicate: { type: "string" },
                                    object: { type: "string" },
                                },
                            },
                        },
                    },
                },
                examples: {
                    "application/json": {
                        graph: "http://purl.obolibrary.org/obo/bfo.owl",
                        metadata: [
                            { predicate: "http://purl.org/dc/terms/title", object: "Basic Formal Ontology" },
                            { predicate: "http://www.w3.org/2002/07/owl#versionIRI", object: "http://purl.obolibrary.org/obo/bfo/2020/bfo.owl" },
                        ],
                    },
                },
            },
            404: { description: "Source not accessible." },
            500: { description: "Triplestore error." },
        },
        tags: ["RDF"],
    };

    return operations;
}
