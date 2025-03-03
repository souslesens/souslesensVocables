const { rdfDataModel } = require("../../../../model/rdfData");
const { mainConfigModel } = require("../../../../model/mainConfig");
const userManager = require("../../../../bin/user.");
const { sourceModel } = require("../../../../model/sources");
const path = require("path");
const fs = require("fs");

module.exports = function () {
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
        security: [{ restrictLoggedUser: [] }],
        summary: "Post a RDF graph by url",
        description: "Post a RDF graph by url",
        parameters: [
            {
                name: "url",
                description: "url",
                in: "formData",
                required: true,
                type: "string",
            },
            {
                name: "source",
                description: "source",
                in: "formData",
                required: true,
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

    return operations;
};
