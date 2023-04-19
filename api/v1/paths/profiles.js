const path = require("path");
const ulid = require("ulid");
const { configPath } = require("../../../model/config");
const { profileModel } = require("../../../model/profiles");
const profilesJSON = path.resolve(configPath + "/profiles.json");
exports.profilesJSON = profilesJSON;
const { sortObjectByKey, readResource, writeResource, resourceFetched, resourceUpdated, responseSchema, resourceCreated } = require("./utils");
const userManager = require("../../../bin/user.");

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
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "Returns all profiles",
        security: [{ loginScheme: [] }],
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
        } catch (err) {
            next(err);
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

function _sanitizeDB(profiles) {
    const sanitized = Object.entries(profiles).map(([key, val]) => {
        let id = ulid();
        if (!val.id) {
            ({ [id]: { ...val, id: id } });
        } else {
            [key, val];
        }
    });
    console.log("DATA SANITIZED", sanitized);
    return sanitized;
}
