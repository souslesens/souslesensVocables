const { rdfDataModel } = require("../../../../model/rdfData");
const { config } = require("../../../../model/config");
const userManager = require("../../../../bin/user.");
const { sourceModel, SourceModel } = require("../../../../model/sources");
const { ulid } = require("ulid");
const path = require("path");
const fs = require("fs");

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    async function GET(req, res, next) {
        try {
            const sourceName = req.query.source;
            const limit = req.query.limit;
            const offset = req.query.offset;

            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);

            if (!Object.keys(userSources).includes(sourceName)) {
                res.status(404).send({ error: `${sourceName} not found` });
                return;
            }

            const graphUri = userSources[sourceName].graphUri;

            const data = await rdfDataModel.getGraphPartNt(graphUri, limit, offset);
            res.status(200).send(data);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    }

    async function POST(req, res, next) {
        const last = JSON.parse(req.body.last);
        const id = JSON.parse(req.body.id) || ulid();
        const clean = JSON.parse(req.body.clean);
        const file = req.files.data;

        const tmpPath = `/tmp/${id}.nt`;
        const uploadedPath = path.resolve("data/uploaded_rdf_data");
        const filePathToUpload = `${uploadedPath}/${id}.nt`;

        try {
            const sourceName = JSON.parse(req.body.source);

            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);

            if (!Object.keys(userSources).includes(sourceName)) {
                if (userSources[sourceName].accessControl != "readwrite") {
                    res.status(503).send({ error: `Not authorized to write ${sourceName}` });
                }
                return;
            }
            const graphUri = userSources[sourceName].graphUri;

            if (clean) {
                fs.rmSync(tmpPath);
                res.status(200).send({ id: id });
                return;
            }

            // append data to file (create it first time)
            fs.appendFileSync(tmpPath, file.data);

            // last chunk, upload file to endpoint
            if (last) {
                // create exposed directory if not exists
                if (!fs.existsSync(uploadedPath)) {
                    fs.mkdirSync(uploadedPath);
                }

                // move file to this dir
                fs.renameSync(tmpPath, filePathToUpload);

                // Load file into triplestore
                const slsUrlForTriplestore = config.souslesensUrlForVirtuoso ? config.souslesensUrlForVirtuoso : souslesensUrl;
                const fileToUploadUrl = `${slsUrlForTriplestore}/upload/rdf/${id}.nt`;
                await rdfDataModel.loadGraph(graphUri, fileToUploadUrl);
                // clean
                fs.rmSync(filePathToUpload);
            }
            res.status(200).send({ id: id });
        } catch (error) {
            // clean
            fs.rmSync(filePathToUpload);
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Post a RDF graph",
        description: "Post a RDF graph",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        last: { type: "string" },
                        id: { type: "string" },
                        clean: { type: "string" },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Upload ok",
                schema: {
                    type: "object",
                },
            },
        },
    };

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Get a RDF graph",
        description: "Get a RDF graph in several serialization format",
        operationId: "RDF get graph",
        parameters: [
            {
                name: "source",
                description: "Source name of the graph to retrieve",
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
