const { rdfDataModel } = require("../../../../model/rdfData");
const { mainConfigModel } = require("../../../../model/mainConfig");
const userManager = require("../../../../bin/user.");
const { sourceModel } = require("../../../../model/sources");
const { ulid } = require("ulid");
const path = require("path");
const fs = require("fs");
const os = require("node:os");

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    async function GET(req, res, _next) {
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

    async function POST(req, res, _next) {
        const config = await mainConfigModel.getConfig();
        const last = req.body.last;
        const id = req.body.identifier || ulid();
        const clean = req.body.clean;
        const file = req.files.data;

        const tmpPath = path.resolve(os.tmpdir(), `${id}.nt`);
        const uploadedPath = path.resolve("data", "uploaded_rdf_data");
        const filePathToUpload = path.resolve(uploadedPath, `${id}.nt`);

        try {
            const sourceName = req.body.source;

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
                res.status(200).send({ identifier: id });
                return;
            }

            // append data to file (create it first time)
            try {
                fs.appendFileSync(tmpPath, file.data);
            } catch (error2) {
                console.log(error2);
            }

            // last chunk, upload file to endpoint
            if (last) {
                // create exposed directory if not exists
                if (!fs.existsSync(uploadedPath)) {
                    fs.mkdirSync(uploadedPath);
                }

                // move file to this dir
                fs.renameSync(tmpPath, filePathToUpload);

                // Load file into triplestore
                const slsUrlForTriplestore = config.souslesensUrlForVirtuoso ? config.souslesensUrlForVirtuoso : config.souslesensUrl;
                const fileToUploadUrl = `${slsUrlForTriplestore}/upload/rdf/${id}.nt`;
                await rdfDataModel.loadGraph(graphUri, fileToUploadUrl);
                // clean
                fs.rmSync(filePathToUpload);
            }
            res.status(200).send({ identifier: id });
        } catch (error) {
            // clean
            if (fs.existsSync(filePathToUpload)) {
                fs.rmSync(filePathToUpload);
            }
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
                name: "last",
                description: "last",
                in: "formData",
                required: true,
                type: "boolean",
            },
            {
                name: "clean",
                description: "clean",
                in: "formData",
                required: true,
                type: "boolean",
            },
            {
                name: "data",
                description: "data",
                in: "formData",
                required: true,
                type: "file",
                format: "binary",
            },
            {
                name: "source",
                description: "source",
                in: "formData",
                required: true,
                type: "string",
            },
            {
                name: "identifier",
                description: "identifier",
                in: "formData",
                required: false,
                type: "string",
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
