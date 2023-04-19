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
        const profileToAdd = req.body;
        //        const successfullyCreated = newProfiles[req.params.id]
        try {
            const oldProfiles = await readResource(profilesJSON, res);
            const profileDoesntExist = !Object.keys(oldProfiles).includes(Object.keys(profileToAdd)[0]);
            const newProfiles = { ...oldProfiles, ...profileToAdd };
            if (profileDoesntExist) {
                const saved = await writeResource(profilesJSON, newProfiles, res);
                resourceCreated(res, saved);
            } else {
                res.status(400).json({ message: "Resource already exists. If you want to update an existing resource, use PUT instead." });
            }
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
