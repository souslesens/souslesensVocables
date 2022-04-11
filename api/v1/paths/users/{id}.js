const path = require("path");
const fs = require("fs");
const profilesJSON = path.resolve("config/users/users.json");
const _ = require("lodash");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = function () {
    let operations = {
        GET,
        DELETE,
    };

    function GET(req, res, _next) {
        fs.readFile(profilesJSON, "utf8", (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read profiles.json" });
            } else {
                const profiles = JSON.parse(data);
                const profile = profiles[req.params.id];
                req.params.id
                    ? profile
                        ? res.status(200).json(profiles[req.params.id])
                        : res.status(400).json({ message: `Profile with id ${req.params.id} not found` })
                    : res.status(200).json(profiles);
            }
        });
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
                ressources: JSON.parse(updatedProfiles),
            });
        } else if (!req.params.id) {
            res.status(500).json({ message: "I need a ressource ID to perform this request" });
        } else {
            res.status(500).json({ message: `I couldn't delete ressource ${req.params.id}. Maybe it has been deleted already? Does the id field matches the object property name ?` });
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
