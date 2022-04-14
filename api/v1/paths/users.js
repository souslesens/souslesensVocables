const modelUsers = require("../../../model/users");
const path = require("path");
const profilesJSON = path.resolve("config/users/users.json");
exports.profilesJSON = profilesJSON;
const { readRessource, writeRessource, responseSchema, ressourceCreated, ressourceUpdated, successfullyFetched } = require("./utils");
const bcrypt = require("bcrypt");
module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT,
    };
    async function GET(req, res, _next) {
        try {
            const users = await modelUsers.getUsers();
            res.status(200).json(successfullyFetched(users));
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async function PUT(req, res, _next) {
        const updatedProfile = ressourceWithHashedPassword(req);
        try {
            const oldProfiles = await readRessource(profilesJSON, res);
            const updatedProfiles = { ...oldProfiles, ...updatedProfile };
            if (Object.keys(oldProfiles).includes(Object.keys(req.body)[0])) {
                const savedProfiles = await writeRessource(profilesJSON, updatedProfiles, res);
                ressourceUpdated(res, savedProfiles);
            } else {
                res.status(400).json({ message: "Ressource does not exist. If you want to create another ressource, use POST instead." });
            }
        } catch (e) {
            res.status(500).json({ message: e });
        }
    }

    async function POST(req, res, _next) {
        const userToAdd = ressourceWithHashedPassword(req);
        try {
            const oldUsers = await readRessource(profilesJSON, res);
            const userDoesntExist = !Object.keys(oldUsers).includes(Object.keys(userToAdd)[0]);
            const newUsers = { ...oldUsers, ...userToAdd };
            if (userDoesntExist) {
                const saved = await writeRessource(profilesJSON, newUsers, res);
                ressourceCreated(res, saved);
            } else {
                res.status(400).json({ message: "Ressource already exists. If you want to update an existing ressource, use PUT instead." });
            }
        } catch (e) {
            res.status(500);
        }
    }

    GET.apiDoc = {
        summary: "Returns all users",
        security: [{ restrictAdmin: [] }],
        operationId: "getAllUsers",
        parameters: [],
        responses: responseSchema("Users", "GET"),
    };
    PUT.apiDoc = {
        summary: "Update users",
        security: [{ restrictAdmin: [] }],
        operationId: "updateUsers",
        parameters: [],
        responses: responseSchema("Users", "PUT"),
    };
    POST.apiDoc = {
        summary: "Create a new user",
        security: [{ restrictAdmin: [] }],
        operationId: "createUser",
        parameters: [
            // {
            //     in: 'body',
            //     name: "user",
            //     type: 'object',
            //     required: true
            // }
        ],

        responses: responseSchema("Users", "POST"),
    };

    return operations;
};

function ressourceWithHashedPassword(req) {
    return Object.fromEntries(Object.entries(req.body).map(([key, val]) => [key, { ...val, password: val.password.startsWith("$2b$") ? val.password : bcrypt.hashSync(val.password, 10) }]));
}
