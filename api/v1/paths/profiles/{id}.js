const path = require("path");
const fs = require("fs");
const { configPath } = require("../../../../model/config");
const profilesJSON = path.resolve(configPath + "/profiles.json");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const { readResource, resourceUpdated } = require("../utils");
const { profileModel } = require("../../../../model/profiles");
const userManager = require("../../../../bin/user.");

module.exports = function () {
    let operations = {
        GET,
        DELETE,
        PUT,
    };

    async function GET(req, res, _next) {
        const userInfo = await userManager.getUser(req.user);
        const profile = await profileModel.getOneUSerProfile(userInfo.user, req.params.id);
        if (profile) {
            res.status(200).json(profile);
            return;
        }
        res.status(400).json({ message: `Profile with id ${req.params.id} not found` });
    }

    async function DELETE(req, res, _next) {
        const profiles = await readFile(profilesJSON).catch((_err) => res.status(500).json(_err));
        const oldProfiles = JSON.parse(profiles);
        const { [req.params.id]: idToDelete, ...remainingProfiles } = oldProfiles;
        const successfullyDeleted = JSON.stringify(remainingProfiles) !== JSON.stringify(oldProfiles);

        if (req.params.id && successfullyDeleted) {
            await writeFile(profilesJSON, JSON.stringify(remainingProfiles, null, 2)).catch((err) =>
                res.status(500).json({
                    message: "I couldn't write profiles.json",
                    error: err,
                })
            );

            const updatedProfiles = await readFile(profilesJSON).catch((_err) => res.status(500).json({ message: "Couldn't read profiles json" }));
            res.status(200).json({
                message: `${req.params.id} successfully deleted`,
                resources: JSON.parse(updatedProfiles),
            });
        } else if (!req.params.id) {
            res.status(500).json({ message: "I need a resource ID to perform this request" });
        } else {
            res.status(500).json({ message: `I couldn't delete resource ${req.params.id}. Maybe it has been deleted already?` });
        }
    }

    async function PUT(req, res, next) {
        try {
            const updatedProfile = req.body;
            const oldProfiles = await readResource(profilesJSON, res);
            if (req.params.id in oldProfiles) {
                if (req.params.id == updatedProfile.name) {
                    const updatedProfiles = { ...oldProfiles };
                    updatedProfiles[req.params.id] = updatedProfile;
                    await writeFile(profilesJSON, JSON.stringify(updatedProfiles, null, 2)).catch((_err) => {
                        res.status(500).json({ message: "I couldn't write profiles.json" });
                    });
                    resourceUpdated(res, updatedProfiles);
                } else {
                    res.status(400).json({ message: "Id and name are different." });
                }
            } else {
                res.status(400).json({ message: "Resource does not exist. If you want to create another resource, use POST instead." });
            }
        } catch (err) {
            next(err);
        }
    }

    GET.apiDoc = {
        summary: "Get a specific profile",
        security: [{ loginScheme: [] }],
        operationId: "getOneProfile",
        parameters: [],
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
        summary: "Delete a specific profile",
        security: [{ restrictAdmin: [] }],
        operationId: "DeleteOneProfile",
        parameters: [],
        responses: {
            200: {
                description: "Profiles",
                schema: {
                    $ref: "#/definitions/Profile",
                },
            },
        },
    };
    PUT.apiDoc = {
        summary: "Update Profile",
        security: [{ restrictAdmin: [] }],
        operationId: "updateProfiles",
        parameters: [],
        responses: {
            200: {
                description: "Profile",
                schema: {
                    $ref: "#/definitions/Profile",
                },
            },
        },
    };

    return operations;
};
