const path = require("path");
const fs = require("fs");
const modelUsers = require("../../../../model/users");
const profilesJSON = path.resolve("config/users/users.json");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = function () {
    let operations = {
        GET,
        DELETE,
    };

    async function GET(req, res, _next) {
        const userId = req.params.id;
        try {
            const users = await modelUsers.getUsers();
            if (users[userId] !== undefined) {
                res.status(200).json(users[userId]);
            } else {
                res.status(404).json({ message: `User ${userId} not found` });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    async function DELETE(req, res, _next) {
        const profiles = await readFile(profilesJSON).catch((err) => res.status(500).json(err));
        const oldProfiles = JSON.parse(profiles);
        const { [req.params.id]: idToDelete, ...remainingProfiles } = oldProfiles;
        const successfullyDeleted = JSON.stringify(remainingProfiles) !== JSON.stringify(oldProfiles);

        if (req.params.id && successfullyDeleted) {
            await writeFile(profilesJSON, JSON.stringify(remainingProfiles)).catch((err) =>
                res.status(500).json({
                    message: "I couldn't write users.json",
                    error: err,
                })
            );

            const updatedProfiles = await readFile(profilesJSON).catch((_err) => res.status(500).json({ message: "Couldn't read users json" }));
            res.status(200).json({
                message: `${req.params.id} successfully deleted`,
                resources: JSON.parse(updatedProfiles),
            });
        } else if (!req.params.id) {
            res.status(500).json({ message: "I need a resource ID to perform this request" });
        } else {
            res.status(500).json({ message: `I couldn't delete resource ${req.params.id}. Maybe it has been deleted already? Does the id field matches the object property name ?` });
        }
    }
    GET.apiDoc = {
        summary: "Returns a specific profile",
        security: [{ restrictAdmin: [] }],
        operationId: "getOneProfile",
        parameters: [
            {
                in: "path",
                name: "profile's id",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "Profiles",
                schema: {
                    $ref: "#/definitions/Profile",
                },
            },
        },
    };
    DELETE.apiDoc = {
        summary: "Delete a specific user",
        security: [{ restrictAdmin: [] }],
        operationId: "DeleteOneUser",
        parameters: [],
        responses: {
            200: {
                description: "Users",
                schema: {
                    $ref: "#/definitions/User",
                },
            },
        },
    };

    return operations;
};
