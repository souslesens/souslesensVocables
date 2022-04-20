const modelUsers = require("../../../model/users");
const path = require("path");
const profilesJSON = path.resolve("config/users/users.json");
exports.profilesJSON = profilesJSON;
const { readResource, writeResource, responseSchema, resourceCreated, resourceUpdated, successfullyFetched } = require("./utils");
const bcrypt = require("bcrypt");
module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT,
    };
    async function GET(req, res, next) {
        try {
            const users = await modelUsers.getUsers();
            res.status(200).json(successfullyFetched(users));
        } catch (error) {
            next(error);
        }
    }

    async function PUT(req, res, next) {
        try {
            const updatedProfile = resourceWithHashedPassword(req);
            const oldProfiles = await readResource(profilesJSON, res);
            const updatedProfiles = { ...oldProfiles, ...updatedProfile };
            if (Object.keys(oldProfiles).includes(Object.keys(req.body)[0])) {
                const savedProfiles = await writeResource(profilesJSON, updatedProfiles, res);
                resourceUpdated(res, savedProfiles);
            } else {
                res.status(400).json({ message: "Resource does not exist. If you want to create another resource, use POST instead." });
            }
        } catch (error) {
            next(error);
        }
    }

    async function POST(req, res, next) {
        try {
            const userToAdd = resourceWithHashedPassword(req);
            const oldUsers = await readResource(profilesJSON, res);
            const userDoesntExist = !Object.keys(oldUsers).includes(Object.keys(userToAdd)[0]);
            const newUsers = { ...oldUsers, ...userToAdd };
            if (userDoesntExist) {
                const saved = await writeResource(profilesJSON, newUsers, res);
                resourceCreated(res, saved);
            } else {
                res.status(400).json({ message: "Resource already exists. If you want to update an existing resource, use PUT instead." });
            }
        } catch (error) {
            next(error);
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

function resourceWithHashedPassword(req) {
    return Object.fromEntries(Object.entries(req.body).map(([key, val]) => [key, { ...val, password: val.password.startsWith("$2b$") ? val.password : bcrypt.hashSync(val.password, 10) }]));
}
