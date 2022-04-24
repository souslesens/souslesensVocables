const path = require("path");
const ulid = require("ulid");
const profilesJSON = path.resolve("config/profiles.json");
exports.profilesJSON = profilesJSON;
const { readResource, writeResource, resourceFetched, resourceUpdated, responseSchema, resourceCreated } = require("./utils");

module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT,
    };

    ///// GET api/v1/profiles
    async function GET(req, res, next) {
        try {
            const profiles = await readResource(profilesJSON, res);
            // I need to have the db indexed by a unique id.
            //const sanitizedDB = await writeResource(profilesJSON, profiles, res)
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

    ///// PUT api/v1/profiles
    async function PUT(req, res, next) {
        try {
            const updatedProfile = req.body;
            const objectToUpdateKey = Object.keys(req.body)[0];
            const oldProfiles = await readResource(profilesJSON, res); //.catch(e => res.status((500).json({ message: 'I couldn\'t read the resource' })));
            const updatedProfiles = { ...oldProfiles, ...updatedProfile };
            if (objectToUpdateKey in oldProfiles) {
                const savedProfiles = await writeResource(profilesJSON, updatedProfiles, res); //.catch(e => res.status((500).json({ message: "I couldn't write the resource" })));
                resourceUpdated(res, savedProfiles);
            } else {
                res.status(400).json({ message: "Resource does not exist. If you want to create another resource, use POST instead." });
            }
        } catch (err) {
            next(err);
        }
    }
    PUT.apiDoc = {
        summary: "Update profiles one by one",
        security: [{ restrictAdmin: [] }],
        operationId: "updateProfiles",
        parameters: [],
        responses: responseSchema("Profiles", "PUT"),
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
