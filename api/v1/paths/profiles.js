const path = require("path");
const ulid = require("ulid");
const { configPath } = require("../../../model/config");
const profilesJSON = path.resolve(configPath + "/profiles.json");
exports.profilesJSON = profilesJSON;
const { sortObjectByKey, readResource, writeResource, resourceFetched, resourceUpdated, responseSchema, resourceCreated } = require("./utils");
const userManager = require("../../../bin/user.");

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    function parseAccessControl(accessControlJson) {
        const accessControl = accessControlJson.toLowerCase();
        if (!["forbidden", "read", "readwrite"].includes(accessControl)) {
            throw new Error("Invalid SourcesAccessControl");
        }
        return accessControl;
    }

    ///// GET api/v1/profiles
    async function GET(req, res, next) {
        try {
            let profiles = await readResource(profilesJSON, res);
            profiles = Object.fromEntries(
                Object.entries(profiles).map(([profileId, profile]) => {
                    profile.sourcesAccessControl = Object.fromEntries(
                        Object.entries(profile.sourcesAccessControl).map(([sourceId, accessControl]) => {
                            return [sourceId, parseAccessControl(accessControl)];
                        })
                    );
                    return [profileId, profile];
                })
            );
            const sortedProfiles = sortObjectByKey(profiles);
            const currentUser = await userManager.getUser(req.user);
            const groups = currentUser.user.groups;
            if (groups.includes("admin")) {
                // return an admin profile with all right
                adminProfile = {
                    name: "admin",
                    _type: "profile",
                    id: "admin",
                    allowedSourceSchemas: ["OWL", "SKOS"],
                    defaultSourceAccessControl: "readwrite",
                    sourcesAccessControl: {},
                    allowedTools: "ALL",
                    forbiddenTools: [],
                    blender: {
                        contextMenuActionStartLevel: 0,
                    },
                };
                const sortedProfilesWithAdmin = sortObjectByKey({ ...sortedProfiles, admin: adminProfile });
                resourceFetched(res, sortedProfilesWithAdmin);
            } else {
                const sortedUserProfiles = Object.fromEntries(
                    Object.entries(sortedProfiles).filter(([profileId, _profile]) => {
                        return groups.includes(profileId);
                    })
                );
                resourceFetched(res, sortedUserProfiles);
            }
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
