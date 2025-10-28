const path = require("path");

const { sourceModel } = require("../../../../model/sources");
const { userModel } = require("../../../../model/users");
const { responseSchema } = require("./../utils");
const userManager = require(path.resolve("bin/user."));
const { successfullyFetched, successfullyCreated, fixBooleanInObject } = require("./../utils.js");
module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/sources
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            let localSourceModel = sourceModel;

            const userSources = await localSourceModel.getUserSources(userInfo.user);
            res.status(200).json(successfullyFetched(userSources));
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "Returns all sources",
        security: [{ restrictAdmin: [] }],
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
        tags: ["Sources"],
    };

    ///// POST api/v1/sources
    async function POST(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userLogin = userInfo.user.login;
            const isAdmin = await userModel.isAdmin(userLogin);
            if (!isAdmin && !userInfo.allowSourceCreation) {
                res.status(401).json({ message: "Not allowed to create source" });
                return;
            }

            const userOwnedSources = await sourceModel.getOwnedSources(userInfo.user);
            if (!isAdmin && Object.keys(userOwnedSources).length >= userInfo.maxNumberCreatedSource) {
                res.status(401).json({ message: "Cannot create another source, the maximal limit was reached." });
                return;
            }

            let newSource = req.body;

            newSource = fixBooleanInObject(newSource);

            await Promise.all(
                Object.entries(newSource).map(async ([_key, value]) => {
                    // if user is not admin, set owner=me and published=false
                    if (!isAdmin) {
                        value.owner = userLogin;
                        value.published = false;
                    }
                    await sourceModel.addSource(value);
                }),
            );
            const sources = await sourceModel.getAllSources();
            res.status(200).json(successfullyCreated(sources));
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Update Sources",
        security: [{ restrictAdmin: [] }],
        operationId: "updateSources",
        parameters: [],
        responses: responseSchema("Sources", "POST"),
        tags: ["Sources"],
    };

    return operations;
};
