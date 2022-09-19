const path = require("path");
const fs = require("fs");
const { configPath, _config } = require("../../../model/config");
const sourcesJSON = path.resolve(configPath + "/sources.json");
const profilesJSON = path.resolve(configPath + "/profiles.json");
exports.profilesJSON = sourcesJSON;
const util = require("util");
const { readResource, writeResource, resourceCreated, resourceUpdated, responseSchema, resourceFetched } = require("./utils");
const userManager = require(path.resolve("bin/user."));
const read = util.promisify(fs.readFile);
module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT,
    };

    const getAllowedSources = (user, profiles, sources) => {
        const aProfiles = Object.entries(profiles);
        const aSources = Object.entries(sources);

        // for all profile
        const allAccessControl = aProfiles.flatMap(([_k, profile]) => {
            const defaultSourceAccessControl = profile.defaultSourceAccessControl;
            const sourcesAccessControl = profile.sourcesAccessControl;
            // browse all sources
            return aSources.map(([sourceName, _v]) => {
                if (sourceName in sourcesAccessControl) {
                    return [sourceName, sourcesAccessControl[sourceName]];
                } else {
                    return [sourceName, defaultSourceAccessControl];
                }
            });
        });

        // get all read or readwrite source
        const allowedSources = allAccessControl
            .filter(([sourceName, accessControl]) => {
                if (["read", "readwrite"].includes(accessControl)) {
                    return sourceName;
                }
            })
            .map(([sourceName, _v]) => sourceName);

        // uniq
        return Array.from(new Set(allowedSources));
    };

    ///// GET api/v1/sources
    async function GET(req, res, next) {
        try {
            const profiles = await read(profilesJSON);
            const parsedProfiles = JSON.parse(profiles);
            const userInfo = await userManager.getUser(req.user);
            const sources = await read(sourcesJSON);
            const parsedSources = JSON.parse(sources);
            const allowedSources = getAllowedSources(userInfo.user, parsedProfiles, parsedSources);
            const filteredSources = filterSources(allowedSources, parsedSources);
            // return all sources if user is admin
            if (userInfo.user.groups.includes("admin")) {
                resourceFetched(res, parsedSources);
            } else {
                resourceFetched(res, filteredSources);
            }
        } catch (err) {
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "Returns all sources",
        security: [{ loginScheme: [] }],
        operationId: "getSources",
        responses: responseSchema("Sources", "GET"),
    };

    ///// PUT api/v1/sources
    async function PUT(req, res, next) {
        try {
            const updatedSource = req.body;
            const profiles = await read(profilesJSON).then((p) => JSON.parse(p));
            const userInfo = await userManager.getUser(req.user);
            const allowedSources = getAllowedSources(userInfo.user, profiles);
            const oldSources = await readResource(sourcesJSON, res);
            const updatedSources = { ...oldSources, ...updatedSource };
            if (Object.keys(oldSources).includes(Object.keys(req.body)[0])) {
                resourceUpdated(res, filterSources(allowedSources, updatedSources));
            } else {
                res.status(400).json({ message: "Resource does not exist. If you want to create another resource, use POST instead." });
            }
        } catch (err) {
            next(err);
        }
    }
    PUT.apiDoc = {
        summary: "Update Sources",
        security: [{ restrictAdmin: [] }],
        operationId: "updateSources",
        parameters: [],
        responses: responseSchema("Sources", "PUT"),
    };

    ///// POST api/v1/sources
    async function POST(req, res, next) {
        try {
            const profileToAdd = req.body;
            //        const successfullyCreated = newProfiles[req.params.id]
            const oldProfiles = await readResource(sourcesJSON, res);
            const profileDoesntExist = !Object.keys(oldProfiles).includes(Object.keys(profileToAdd)[0]);
            const objectToCreateKey = req.body;
            const newProfiles = { ...oldProfiles, ...objectToCreateKey };
            if (profileDoesntExist) {
                const saved = await writeResource(sourcesJSON, newProfiles, res);
                resourceCreated(res, saved);
            } else {
                res.status(400).json({ message: "Resource already exists. If you want to update an existing resource, use PUT instead." });
            }
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

function filterSources(allowedSources, sources) {
    return Object.fromEntries(Object.entries(sources).filter(([sourceId, _source]) => allowedSources.includes(sourceId)));
}
