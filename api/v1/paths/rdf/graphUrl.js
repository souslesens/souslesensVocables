import { rdfDataModel } from "../../../../model/rdfData.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";
import userManager from "../../../../bin/user.js";
import { sourceModel } from "../../../../model/sources.js";
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
                if (userSources[sourceName].accessControl != "readwrite") {
                    res.status(503).send({ error: `Not authorized to write ${sourceName}` });
                }
                return;
            }
            const graphUri = userSources[sourceName].graphUri;

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
            await rdfDataModel.loadGraph(graphUri, fileToUploadUrl);
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
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
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
