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
        summary: "Upload an RDF file into the graph of a source (chunked)",
        description:
            "Streams an RDF payload into the named graph attached to `source`. The endpoint supports chunked uploads: " +
            "each call appends `data` to a temporary file identified by `identifier` (a ULID generated on the first chunk). " +
            "When `last=true` (or when MIME is `application/n-triples`) the temporary file is moved to `data/uploaded_rdf_data/` " +
            "and loaded into the triplestore via `rdfDataModel.loadGraph`. If `clean=true`, the temporary file is dropped without uploading. " +
            "Supported MIME types: `application/n-triples`, `text/turtle`, `application/rdf+xml`, `application/owl+xml`, `text/n3`, `application/trig`.",
        operationId: "rdfPostGraph",
        consumes: ["multipart/form-data"],
        parameters: [
            { name: "source", in: "formData", required: true, type: "string", description: "Source name (key of `sources.json`). Example: `BFO`." },
            { name: "last", in: "formData", required: false, type: "string", description: "Truthy string for the final chunk — triggers the actual upload to the triplestore." },
            { name: "clean", in: "formData", required: false, type: "string", description: "Truthy string drops the temporary file and returns without uploading." },
            { name: "data", in: "formData", required: true, type: "file", format: "binary", description: "RDF chunk content." },
            {
                name: "identifier",
                in: "formData",
                required: false,
                type: "string",
                description: "ULID identifying the upload session. Omit on the first chunk; reuse the value returned by the server for following chunks.",
            },
        ],
        responses: {
            200: {
                description: "Chunk accepted. Returns the upload session identifier.",
                schema: { properties: { identifier: { type: "string" } } },
                examples: { "application/json": { identifier: "01H7AS9Q6BN6QHV23K4BCJXHCC" } },
            },
            500: { description: "I/O or triplestore error during upload." },
            503: { description: "User does not have `readwrite` access to the source." },
        },
        tags: ["RDF"],
    };

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Stream the N-Triples content of a source's graph (paginated)",
        description:
            "Returns a slice of the RDF graph of `source` serialised as N-Triples. " +
            "Pagination is driven by `offset` against the page size configured in `mainConfig.sparqlDownloadLimit`. " +
            "When `withImports=true`, triples from imported source graphs are included. " +
            "On the first page (`offset=0`) the server prepends a `dc:contributor` triple (if missing) and import triples for the source.",
        operationId: "rdfGetGraph",
        parameters: [
            { name: "source", in: "query", type: "string", required: true, description: "Source name. Example: `IOF_core`." },
            { name: "offset", in: "query", type: "string", required: true, description: "SPARQL OFFSET (number of triples already received)." },
            { name: "withImports", in: "query", type: "string", required: false, default: "false", description: "If true, also stream imported sources' triples." },
        ],
        responses: {
            200: {
                description: "Page of N-Triples plus pagination cursor.",
                schema: {
                    properties: {
                        graph_size: { type: "integer", description: "Total triple count in the graph." },
                        next_offset: { type: "integer", description: "Offset for the next page, or null when last page reached." },
                        data: { type: "string", description: "N-Triples payload for this page." },
                    },
                },
                examples: {
                    "application/json": {
                        graph_size: 1234,
                        next_offset: 5000,
                        data:
                            "<http://purl.obolibrary.org/obo/BFO_0000001> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2002/07/owl#Class> .\n" +
                            "<http://purl.obolibrary.org/obo/BFO_0000002> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://purl.obolibrary.org/obo/BFO_0000001> .",
                    },
                },
            },
            404: { description: "Source not found in the user's accessible sources." },
            500: { description: "Server error." },
        },
        tags: ["RDF"],
    };

    DELETE.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Drop the named graph attached to a source",
        description:
            "Issues a SPARQL `DROP GRAPH` on the `graphUri` of `source`. The source descriptor itself is **not** removed " +
            "from `sources.json` — only the triples in the triplestore. Requires `readwrite` access on the source.",
        operationId: "rdfDeleteGraph",
        parameters: [{ name: "source", in: "query", type: "string", required: true, description: "Source name whose graph must be cleared." }],
        responses: {
            200: {
                description: "Graph dropped.",
                schema: { properties: { message: { type: "string" } } },
                examples: { "application/json": { message: "BFO deleted" } },
            },
            404: { description: "Source not found." },
            500: { description: "Triplestore error." },
            503: { description: "User does not have `readwrite` access to the source." },
        },
        tags: ["RDF"],
    };

    return operations;
}
