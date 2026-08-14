import { rdfDataModel } from "../../../../model/rdfData.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";
import userManager from "../../../../bin/user.js";
import { sourceModel } from "../../../../model/sources.js";
import { tripleQuotaModel, UPLOAD_KIND } from "../../../../model/tripleQuota.js";
import path from "path";
import fs from "fs";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const config = await mainConfigModel.getConfig();
        const url = req.body.url;

        const uploadedPath = path.resolve("data", "uploaded_rdf_data");
        const filename = url.split("/").pop();
        const filePathToUpload = path.resolve(uploadedPath, filename);

        try {
            const sourceName = req.body.source;
            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);

            if (!Object.keys(userSources).includes(sourceName)) {
                return res.status(404).send({ error: `${sourceName} not found` });
            }
            /* On its own branch: nested inside the test above, it could only run when
             * the source was unreachable, where reading its accessControl threw. */
            if (userSources[sourceName].accessControl != "readwrite") {
                return res.status(403).send({ error: `Not authorized to write ${sourceName}` });
            }
            const graphUri = userSources[sourceName].graphUri;

            const allowance = await tripleQuotaModel.checkAllowance(userInfo.user.login, UPLOAD_KIND, userInfo.maxUploadTriplesPerUser);
            if (!allowance.allowed) {
                return res.status(403).send({
                    error:
                        allowance.cap === 0
                            ? "Your profile does not allow uploading graphs."
                            : `You already hold ${allowance.usage.toLocaleString("en-US")} uploaded triples, and your profile allows ${allowance.cap.toLocaleString("en-US")}. Delete some before uploading more.`,
                });
            }

            // create exposed directory if not exists
            if (!fs.existsSync(uploadedPath)) {
                fs.mkdirSync(uploadedPath);
            }
            // write file to this dir
            const buffer = await fetch(url).then((r) => r.arrayBuffer());
            fs.writeFileSync(filePathToUpload, new Uint8Array(buffer));

            // Load file into triplestore
            const slsUrlForTriplestore = config.souslesensUrlForVirtuoso ? config.souslesensUrlForVirtuoso : config.souslesensUrl;
            const fileToUploadUrl = `${slsUrlForTriplestore}/upload/rdf/${filename}`;
            const uploadBucket = { kind: UPLOAD_KIND, graphUri: graphUri };
            const sizeBefore = await tripleQuotaModel.snapshot([uploadBucket]);
            await rdfDataModel.loadGraph(graphUri, fileToUploadUrl);
            /* Measured, since the fetched payload is opaque and may hold triples the
             * graph already had, which add nothing. */
            await tripleQuotaModel.recordSince(userInfo.user.login, [uploadBucket], sizeBefore).catch((quotaError) => console.error("Could not record the upload quota share", quotaError));
            // clean
            fs.rmSync(filePathToUpload);
            res.status(200).send({ message: "ok" });
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
        security: [{ restrictLoggedUser: [], restrictQuota: [], restrictVirtuosoLoad: [] }],
        summary: "Load an RDF file from a remote URL into a source's graph",
        description:
            "Server-side fetch of `url` (typically a Turtle/RDF-XML/OWL file), persisted under " +
            "`data/uploaded_rdf_data/<basename>` then loaded into the triplestore via `rdfDataModel.loadGraph`. " +
            "The file is removed after loading. Requires `readwrite` access on the source.",
        operationId: "rdfPostGraphUrl",
        consumes: ["multipart/form-data", "application/x-www-form-urlencoded"],
        parameters: [
            { name: "url", in: "formData", required: true, type: "string", description: "Public URL of the RDF file to import. Example: BFO TTL on GitHub." },
            { name: "source", in: "formData", required: true, type: "string", description: "Target source name." },
        ],
        responses: {
            200: {
                description: "Loaded.",
                schema: { properties: { message: { type: "string" } } },
                examples: { "application/json": { message: "ok" } },
            },
            500: { description: "Fetch or triplestore load failure." },
            503: { description: "User does not have `readwrite` access to the source." },
        },
        tags: ["RDF"],
    };

    return operations;
}
