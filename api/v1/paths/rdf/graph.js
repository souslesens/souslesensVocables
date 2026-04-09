import { rdfDataModel } from "../../../../model/rdfData.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";
import userManager from "../../../../bin/user.js";
import { sourceModel } from "../../../../model/sources.js";
import { ulid } from "ulid";
import path from "path";
import fs from "fs";
import os from "node:os";
import { getUploadedMime } from "../utils.js";

export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
    };

    async function GET(req, res, _next) {
        try {
            const config = await mainConfigModel.getConfig();
            const limit = config.sparqlDownloadLimit;

            const sourceName = req.query.source;
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
            const graphSize = await rdfDataModel.getTripleCount(graphUri, graphsImports);
            const data = await rdfDataModel.getGraphPartNt(graphUri, limit, offset, graphsImports);

            let additionalTriples = "";
            // add contributor and import triples only in offset 0
            if (Number(offset) === 0) {
                const owner = userSources[sourceName].owner;
                const contributorTriple = rdfDataModel.genContributorTriple(graphUri, owner);
                const checkContributorTriple = await rdfDataModel.ask(graphUri, contributorTriple);
                const contributorTripleStr = checkContributorTriple ? "" : rdfDataModel.formatTripleToNt(...contributorTriple);

                let importTriplesStrArray = [];
                if (graphsImports.length > 0) {
                    importTriples = rdfDataModel.genImportTriples(graphUri, graphsImports);
                    importTriplesStrArray = await Promise.all(
                        importTriples
                            .map(async (t) => {
                                const checkImportTriple = await rdfDataModel.ask(graphUri, t);
                                return checkImportTriple ? null : rdfDataModel.formatTripleToNt(...t);
                            })
                            .filter((e) => e !== null),
                    );
                }
                additionalTriples = `${contributorTripleStr}\n${importTriplesStrArray.join("\n")}\n`;
            }
            const dataWithAdditionalTriples = additionalTriples + data;

            let nextOffset;
            if (Number(offset) + Number(limit) >= graphSize) {
                nextOffset = null;
            } else {
                nextOffset = Number(offset) + Number(limit);
            }

            const response = { graph_size: graphSize, next_offset: nextOffset, data: dataWithAdditionalTriples };

            res.status(200).send(response);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    }

    async function POST(req, res, _next) {
        // Helper function to upload a chunk and clean temporary files
        async function uploadChunkAndClean(tmpPath, uploadedPath, filePathToUpload, graphUri, config) {
            // Ensure the directory for exposed uploads exists
            if (!fs.existsSync(uploadedPath)) {
                fs.mkdirSync(uploadedPath);
            }
            // Move the temporary file to the exposed directory
            const blob = fs.readFileSync(tmpPath);
            fs.writeFileSync(filePathToUpload, blob);

            // Load file into triplestore
            const slsUrl = config.souslesensUrlForVirtuoso ? config.souslesensUrlForVirtuoso : config.souslesensUrl;
            const fileToUploadUrl = `${slsUrl}/upload/rdf/${path.basename(filePathToUpload)}`;
            await rdfDataModel.loadGraph(graphUri, fileToUploadUrl);

            // Clean up
            if (fs.existsSync(filePathToUpload)) fs.rmSync(filePathToUpload);
        }

        const config = await mainConfigModel.getConfig();
        const last = req.body.last;
        const id = req.body.identifier || ulid();
        const clean = req.body.clean;
        const file = req.files.data;
        const uploadedMime = getUploadedMime(file);

        const mimeToExtension = {
            "application/n-triples": ".nt",
            "text/turtle": ".ttl",
            "application/rdf+xml": ".rdf",
            "application/owl+xml": ".owl",
            "text/n3": ".n3",
            "application/trig": ".trig",
        };
        const fileExtension = mimeToExtension[uploadedMime] || ".nt";
        const tmpPath = path.resolve(os.tmpdir(), `${id}${fileExtension}`);
        const uploadedPath = path.resolve("data", "uploaded_rdf_data");
        const filePathToUpload = path.resolve(uploadedPath, `${id}${fileExtension}`);

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

            try {
                fs.appendFileSync(tmpPath, file.data);
            } catch (error) {
                console.error(error);
            }

            // N‑Triples can be uploaded directly.
            // upload it immediately and clean temporary files.
            if (uploadedMime === "application/n-triples" || last) {
                await uploadChunkAndClean(tmpPath, uploadedPath, filePathToUpload, graphUri, config);
                // clean
                if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath);
            }

            res.status(200).send({ identifier: id });
        } catch (error) {
            // clean
            if (fs.existsSync(filePathToUpload)) {
                if (fs.existsSync(filePathToUpload)) fs.rmSync(filePathToUpload);
                if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath);
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
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
