const { profileModel } = require("../../../../model/profiles");
const { resourceFetched, responseSchema, resourceCreated } = require("../utils");
const userManager = require("../../../../bin/user.");

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/profiles
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const profiles = await profileModel.getUserProfiles(userInfo.user);
            resourceFetched(res, profiles);
        } catch (error) {
            res.status(500).json({ message: error.toString() });
        }
    }
    GET.apiDoc = {
        summary: "Returns all profiles",
        security: [{ restrictAdmin: [] }],
        operationId: "getProfiles",
        responses: responseSchema("Profiles", "GET"),
    };

    ///// POST api/v1/profiles
    async function POST(req, res, next) {
        try {
            const newProfile = req.body;
            await Promise.all(
                Object.entries(newProfile).map(async ([_k, profile]) => {
                    await profileModel.addProfile(profile);
                })
            );
            const profiles = await profileModel.getAllProfiles();
            resourceCreated(res, profiles);
        } catch (error) {
            res.status(403).json({ message: error.toString() });
        }
    }
    POST.apiDoc = {
        summary: "Create a new profile",
        security: [{ restrictAdmin: [] }],
        operationId: "createProfile",
        parameters: [],
        responses: responseSchema("Profiles", "POST"),
    };

    return operations;
};
