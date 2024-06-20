const fs = require("fs");
const modelUsers = require("../../../../model/users");
const { configUsersPath } = require("../../../../model/config");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = function () {
    let operations = {
        GET,
        DELETE,
    };

    async function GET(req, res, next) {
        try {
            const userId = req.params.id;
            const users = await modelUsers.getUsers();
            if (users[userId] !== undefined) {
                res.status(200).json(users[userId]);
            } else {
                res.status(404).json({ message: `User ${userId} not found` });
            }
        } catch (error) {
            next(error);
        }
    }
    async function DELETE(req, res, next) {
        try {
            const users = await readFile(configUsersPath).catch((err) => res.status(500).json(err));
            const oldUsers = JSON.parse(users);
            const { [req.params.id]: idToDelete, ...remainingUsers } = oldUsers;
            const successfullyDeleted = JSON.stringify(remainingUsers) !== JSON.stringify(oldUsers);

            if (req.params.id && successfullyDeleted) {
                await writeFile(configUsersPath, JSON.stringify(remainingUsers)).catch((err) =>
                    res.status(500).json({
                        message: "I couldn't write users.json",
                        error: err,
                    })
                );

                const updatedUsers = await readFile(configUsersPath).catch((_err) => res.status(500).json({ message: "Couldn't read users json" }));
                res.status(200).json({
                    message: `${req.params.id} successfully deleted`,
                    resources: JSON.parse(updatedUsers),
                });
            } else if (!req.params.id) {
                res.status(500).json({ message: "I need a resource ID to perform this request" });
            } else {
                res.status(500).json({ message: `I couldn't delete resource ${req.params.id}. Maybe it has been deleted already? Does the id field matches the object property name ?` });
            }
        } catch (error) {
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "Returns a specific user",
        security: [{ restrictAdmin: [] }],
        operationId: "getOneUser",
        parameters: [
            {
                in: "path",
                name: "user's id",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "User",
                schema: {
                    $ref: "#/definitions/User",
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
