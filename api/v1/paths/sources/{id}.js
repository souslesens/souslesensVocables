const path = require("path");
const fs = require("fs");
const { configPath } = require("../../../../model/config");
const sourcesJSON = path.resolve(configPath + "/sources.json");
const util = require("util");
const { readResource, resourceUpdated } = require("../utils");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = function () {
    let operations = {
        GET,
        DELETE,
        PUT,
    };

    function GET(req, res, _next) {
        fs.readFile(sourcesJSON, "utf8", (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read profiles.json" });
            } else {
                const sources = JSON.parse(data);
                const source = sources[req.params.id];
                req.params.id
                    ? source
                        ? res.status(200).json(sources[req.params.id])
                        : res.status(400).json({ message: `Source with id ${req.params.id} not found` })
                    : res.status(200).json(sources);
            }
        });
    }
    async function DELETE(req, res, _next) {
        const sources = await readFile(sourcesJSON).catch((err) => res.status(500).json(err));
        const oldSources = JSON.parse(sources);
        const { [req.params.id]: idToDelete, ...remainingSources } = oldSources;
        const successfullyDeleted = JSON.stringify(remainingSources) !== JSON.stringify(oldSources);

        if (req.params.id && successfullyDeleted) {
            await writeFile(sourcesJSON, JSON.stringify(remainingSources, null, 2)).catch((err) =>
                res.status(500).json({
                    message: "I couldn't write sources.json",
                    error: err,
                })
            );

            const updatedSources = await readFile(sourcesJSON).catch((_err) => res.status(500).json({ message: "Couldn't read sources json" }));
            res.status(200).json({
                message: `${req.params.id} successfully deleted`,
                resources: JSON.parse(updatedSources),
            });
        } else if (!req.params.id) {
            res.status(500).json({ message: "I need a resource ID to perform this request" });
        } else {
            res.status(500).json({ message: `I couldn't delete resource ${req.params.id}. Maybe it has been deleted already?` });
        }
    }

    async function PUT(req, res, next) {
        try {
            const updatedSource = req.body;
            const oldSources = await readResource(sourcesJSON, res);
            if (req.params.id in oldSources) {
                if (req.params.id == updatedSource.name) {
                    const updatedSources = { ...oldSources };
                    updatedSources[req.params.id] = updatedSource;
                    await writeFile(sourcesJSON, JSON.stringify(updatedSources, null, 2)).catch((_err) => {
                        res.status(500).json({ message: "I couldn't write sources.json" });
                    });
                    resourceUpdated(res, updatedSource);
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
        summary: "This resource returns profiles list or a profile if an id is provided",
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
    PUT.apiDoc = {
        summary: "Update Sources",
        security: [{ restrictAdmin: [] }],
        operationId: "updateSources",
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
