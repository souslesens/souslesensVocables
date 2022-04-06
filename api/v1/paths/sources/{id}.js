const path = require("path");
const fs = require("fs");
const profilesJSON = path.resolve("config/sources.json");
const _ = require("lodash");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = function () {
    let operations = {
        GET,
        DELETE,
    };

    // function parseProfile(profile) {

    //     const mappedProfile = {
    //         name: profile.name,
    //         _type: 'profile',
    //         id: ulid(),
    //         allowedSourceSchemas: profile.allowedSourceSchemas,
    //         allowedSources: profile.allowedSources,
    //         forbiddenSources: profile.forbiddenSources,
    //         allowedTools: profile.allowedTools,
    //         forbiddenTools: profile.forbiddenTools,
    //         blender: { contextMenuActionStartLevel: profile.blender.contextMenuActionStartLevel }
    //     }
    //     if (_.some(mappedProfile, _.isNil)) {
    //         throw ('There is some null or undefined here. Check your data.')
    //     }

    //     return mappedProfile

    // }

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
                    message: "I couldn't write profiles.json",
                    error: err,
                })
            );

            const updatedProfiles = await readFile(profilesJSON).catch((_err) => res.status(500).json({ message: "Couldn't read profiles json" }));
            res.status(200).json({
                message: `${req.params.id} successfully deleted`,
                ressources: JSON.parse(updatedProfiles),
            });
        } else if (!req.params.id) {
            res.status(500).json({ message: "I need a ressource ID to perform this request" });
        } else {
            res.status(500).json({ message: `I couldn't delete ressource ${req.params.id}. Maybe it has been deleted already?` });
        }
    }
    GET.apiDoc = {
        summary: "This ressource returns profiles list or a profile if an id is provided",
        operationId: "getProfiles",
        security: [{ loginScheme: [] }],
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
        summary: "Delete a specific source",
        security: [{ restrictAdmin: [] }],
        operationId: "DeleteOneSource",
        parameters: [],
        responses: {
            200: {
                description: "Sources",
                schema: {
                    $ref: "#/definitions/Source",
                },
            },
        },
    };
    return operations;
};
