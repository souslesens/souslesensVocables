const path = require("path");
const fs = require("fs");
const { configPath, config } = require("../../../model/config");
const sourcesJSON = path.resolve(configPath + "/sources.json");
const profilesJSON = path.resolve(configPath + "/profiles.json");
const util = require("util");
const { readResource, writeResource, resourceCreated, responseSchema, resourceFetched } = require("./utils");
const userManager = require(path.resolve("bin/user."));
const read = util.promisify(fs.readFile);
const { getAllowedSources, filterSources } = require("./utils.js");
module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/sources
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const sources = await read(sourcesJSON);
            const parsedSources = JSON.parse(sources);
            if (userInfo.user.groups.includes("admin")) {
                // return all sources if user is admin
                resourceFetched(res, parsedSources);
            } else {
                const profiles = await read(profilesJSON);
                const parsedProfiles = JSON.parse(profiles);
                const allowedSources = getAllowedSources(userInfo.user, parsedProfiles, parsedSources, config.formalOntologySourceLabel);
                const filteredSources = filterSources(allowedSources, parsedSources);
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
