const path = require("path");
const fs = require("fs");
const sourcesJSON = path.resolve("config/sources.json");
const profilesJSON = path.resolve("config/profiles.json");
exports.profilesJSON = sourcesJSON;
const _ = require("lodash");
const util = require("util");
const { readRessource, writeRessource, ressourceCreated, ressourceUpdated, responseSchema, ressourceFetched } = require("./utils");
const userManager = require(path.resolve("bin/user."));
const read = util.promisify(fs.readFile);
module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT,
    };

    // const keepProfilesIncludedInUserGroups = (user) => (profile) => {
    //     const [k, val] = profile;
    //     return (user.groups.some(v => val.name === v))
    // };

    // const allAllowedSourcesSchemasCurried = (acc) => (profile) => {
    //     const [k, val] = profile;
    //     return (acc.concat(val.allowedSourceSchemas))
    // };

    const getAllowedSources = (user, profiles) => {
        const aProfiles = Object.entries(profiles);
        let acc = [];

        for (let p of aProfiles) {
            const [_k, val] = p;
            const hasAny = user.groups.some((v) => v === val.name);

            if (hasAny) {
                acc = acc.concat(val.allowedSources);
            } else {
                return acc;
            }
        }
        return Array.from(new Set(acc));
    };

    async function GET(req, res, _next) {
        const profiles = await read(profilesJSON);
        const parsedProfiles = await JSON.parse(profiles);
        const userInfo = userManager.getUser(req.user);
        const allowedSources = getAllowedSources(userInfo.user, parsedProfiles);

        fs.readFile(sourcesJSON, "utf8", (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read profiles.json" });
            } else {
                const sources = JSON.parse(data);
                const filteredSources = filterSources(allowedSources, sources, allowedSources, req);
                ressourceFetched(res, filteredSources);
            }
        });
    }

    async function PUT(req, res, _next) {
        const updatedSource = req.body;
        const profiles = await read(profilesJSON).then((p) => JSON.parse(p));
        const userInfo = userManager.getUser(req.user);
        const allowedSources = getAllowedSources(userInfo.user, profiles);
        try {
            const oldSources = await readRessource(sourcesJSON, res);
            const updatedSources = { ...oldSources, ...updatedSource };
            if (Object.keys(oldSources).includes(Object.keys(req.body)[0])) {
                ressourceUpdated(res, filterSources(allowedSources, updatedSources));
            } else {
                res.status(400).json({ message: "Ressource does not exist. If you want to create another ressource, use POST instead." });
            }
        } catch (err) {
            res.status(500).json({ message: err });
        }
    }

    async function POST(req, res, _next) {
        const profileToAdd = req.body;
        //        const successfullyCreated = newProfiles[req.params.id]
        try {
            const oldProfiles = await readRessource(sourcesJSON, res);
            const profileDoesntExist = !Object.keys(oldProfiles).includes(Object.keys(profileToAdd)[0]);
            const objectToCreateKey = req.body;
            const newProfiles = { ...oldProfiles, ...objectToCreateKey };
            if (profileDoesntExist) {
                const saved = await writeRessource(sourcesJSON, newProfiles, res);
                ressourceCreated(res, saved);
            } else {
                res.status(400).json({ message: "Ressource already exists. If you want to update an existing ressource, use PUT instead." });
            }
        } catch (e) {
            res.status(500);
        }
    }

    GET.apiDoc = {
        summary: "Returns all sources",
        security: [{ loginScheme: [] }],
        operationId: "getSources",
        responses: responseSchema("Sources", "GET"),
    };
    PUT.apiDoc = {
        summary: "Update Sources",
        security: [{ restrictAdmin: [] }],
        operationId: "updateSources",
        parameters: [],
        responses: responseSchema("Sources", "PUT"),
    };
    POST.apiDoc = {
        summary: "Update Sources",
        security: [{ restrictAdmin: [] }],
        operationId: "updateSources",
        parameters: [],
        responses: responseSchema("Sources", "POST"),
    };

    return operations;
};

function filterSources(allowedSources, sources) {
    return allowedSources.includes("ALL") ? sources : Object.fromEntries(Object.entries(sources).filter((source) => allowedSources.some((s) => s === source.schemaType)));
}
