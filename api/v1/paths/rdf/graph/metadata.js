import { rdfDataModel } from '../../../../../model/rdfData.js';
import userManager from '../../../../../bin/user.js';
import { sourceModel } from '../../../../../model/sources.js';

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
        security: [{ restrictLoggedUser: [] }],
        summary: "POST RDF graph metadata",
        operationId: "post-rdf-graph-metadata",
        parameters: [
            {
                name: "source",
                description: "Source name of the graph to retrieve",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "body",
                description: "the updated list of metadata",
                in: "body",
                schema: {
                    properties: {
                        metadata: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    metadata: { type: "string" },
                                    type: { type: "string" },
                                    value: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "The RDF graph metadata",
                schema: {
                    properties: {
                        metadata: { type: "array" },
                    },
                },
            },
        },
        tags: ["RDF"],
    };
    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Get a RDF graph metadata",
        operationId: "RDF get graph metadata",
        parameters: [
            {
                name: "source",
                description: "Source name of the graph to retrieve",
                in: "query",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "The RDF graph metadata",
                schema: {
                    properties: {
                        metadata: { type: "array" },
                    },
                },
            },
        },
        tags: ["RDF"],
    };

    return operations;
};
