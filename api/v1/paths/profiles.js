const path = require("path");
const fs = require("fs");
const ulid = require("ulid");
const profilesJSON = path.resolve("config/profiles.json");
exports.profilesJSON = profilesJSON;
const _ = require("lodash");
const { rest } = require("lodash");
const { readRessource, writeRessource, ressourceFetched, ressourceUpdated, responseSchema, ressourceCreated } = require("./utils");

module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT,
    };
    async function GET(req, res, next) {
        const profiles = await readRessource(profilesJSON, res);
        // I need to have the db indexed by a unique id.
        //const sanitizedDB = await writeRessource(profilesJSON, profiles, res)

        ressourceFetched(res, profiles);
    }

    async function PUT(req, res, next) {
        const updatedProfile = req.body;
        try {
            const objectToUpdateKey = Object.keys(req.body)[0];
            const oldProfiles = await readRessource(profilesJSON, res); //.catch(e => res.status((500).json({ message: 'I couldn\'t read the ressource' })));
            const updatedProfiles = { ...oldProfiles, ...updatedProfile };
            if (oldProfiles.hasOwnProperty(objectToUpdateKey)) {
                const savedProfiles = await writeRessource(profilesJSON, updatedProfiles, res); //.catch(e => res.status((500).json({ message: "I couldn't write the ressource" })));
                ressourceUpdated(res, savedProfiles);
            } else {
                res.status(400).json({ message: "Ressource does not exist. If you want to create another ressource, use POST instead." });
            }
        } catch (e) {
            res.status(500);
        }
    }

    async function POST(req, res, next) {
        const profileToAdd = req.body;
        //        const successfullyCreated = newProfiles[req.params.id]
        try {
            const oldProfiles = await readRessource(profilesJSON, res);
            const profileDoesntExist = !oldProfiles.hasOwnProperty(Object.keys(profileToAdd)[0]);
            const newProfiles = { ...oldProfiles, ...profileToAdd };
            if (profileDoesntExist) {
                const saved = await writeRessource(profilesJSON, newProfiles, res);
                ressourceCreated(res, saved);
            } else {
                res.status(400).json({ message: "Ressource already exists. If you want to update an existing ressource, use PUT instead." });
            }
        } catch (e) {
            res.status(500);
        }
    }

    // NOTE: We could also use a YAML string here.
    GET.apiDoc = {
        summary: "Returns all profiles",
        security: [{ loginScheme: [] }],
        operationId: "getProfiles",
        responses: responseSchema("Profiles", "GET"),
    };

    PUT.apiDoc = {
        summary: "Update profiles one by one",
        security: [{ restrictAdmin: [] }],
        operationId: "updateProfiles",
        parameters: [],
        responses: responseSchema("Profiles", "PUT"),
    };

    POST.apiDoc = {
        summary: "Create a new profile",
        security: [{ restrictAdmin: [] }],
        operationId: "createProfile",
        parameters: [],
        responses: responseSchema("Profiles", "POST"),
    };

    return operations;
};

function sanitizeDB(profiles) {
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
