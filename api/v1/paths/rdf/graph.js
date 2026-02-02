import { rdfDataModel } from "../../../../model/rdfData.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";
import userManager from "../../../../bin/user.js";
import { sourceModel } from "../../../../model/sources.js";
import { ulid } from "ulid";
import path from "path";
import fs from "fs";
import os from "node:os";

export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
    };

    async function GET(req, res, _next) {
        try {
            const sourceName = req.query.source;
            const limit = req.query.limit;
            const offset = req.query.offset;
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

            const data = await rdfDataModel.getGraphPartNt(graphUri, limit, offset, graphsImports);
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
                const blob = fs.readFileSync(tmpPath);
                fs.writeFileSync(filePathToUpload, blob);

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

    async function DELETE(req, res, _next) {
        const sourceName = req.query.source;

        const userInfo = await userManager.getUser(req.user);
        const userSources = await sourceModel.getUserSources(userInfo.user);

        if (!(sourceName in userSources)) {
            res.status(404).send({ error: `${sourceName} not found` });
            return;
        }

        try {
            if (!Object.keys(userSources).includes(sourceName)) {
                if (userSources[sourceName].accessControl != "readwrite") {
                    res.status(503).send({ error: `Not authorized to delete ${sourceName}` });
                }
                return;
            }

            const graphUri = userSources[sourceName].graphUri;
            await rdfDataModel.deleteGraph(graphUri);
            res.status(200).send({ message: `${sourceName} deleted` });
        } catch (error) {
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
        tags: ["RDF"],
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
            {
                name: "withImports",
                description: "Include imports",
                in: "query",
                type: "boolean",
                required: false,
                default: false,
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
        tags: ["RDF"],
    };

    DELETE.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "DELETE a RDF graph",
        parameters: [
            {
                name: "source",
                description: "Source name of the graph to delete",
                in: "query",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "delete OK",
                schema: { type: "object" },
            },
        },
        tags: ["RDF"],
    };

    return operations;
}
