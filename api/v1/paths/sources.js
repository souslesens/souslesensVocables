const path = require("path");

const { configPath, configProfilesPath } = require("../../../model/config");
const { sourceModel, SourceModel } = require("../../../model/sources");
const { responseSchema } = require("./utils");
const userManager = require(path.resolve("bin/user."));
const { successfullyFetched, successfullyCreated } = require("./utils.js");
module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/sources
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            let localSourceModel;

            if (req.query.sourcesFile) {
                configSourcesPathFromUrlParams = path.resolve(configPath + "/" + req.query.sourcesFile);
                if (!configSourcesPath.startsWith(path.resolve(configPath))) {
                    return res.status(403).json({ done: false, message: "forbidden path" });
                }
                localSourceModel = new SourceModel(configSourcesPathFromUrlParams, configProfilesPath);
            } else {
                localSourceModel = sourceModel;
            }

            const userSources = await localSourceModel.getUserSources(userInfo.user);
            res.status(200).json(successfullyFetched(userSources));
        } catch (err) {
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "Returns all sources",
        security: [{ loginScheme: [] }],
        operationId: "getSources",
        responses: responseSchema("Sources", "GET"),
        parameters: [
            {
                name: "sourcesFile",
                description: "name",
                in: "query",
                type: "string",
                required: false,
            },
        ],
    };

    ///// POST api/v1/sources
    async function POST(req, res, next) {
        try {
            const newSource = req.body;
            await Promise.all(
                Object.entries(newSource).map(async ([_key, value]) => {
                    await sourceModel.addSource(value);
                })
            );
            const sources = await sourceModel.getAllSources();
            res.status(200).json(successfullyCreated(sources));
        } catch (err) {
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Update Sources",
        security: [{ restrictAdmin: [] }],
        operationId: "updateSources",
        parameters: [],
        responses: responseSchema("Sources", "POST"),
    };

    return operations;
};
