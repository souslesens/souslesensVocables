const path = require("path");
const fs = require("fs");
const { configPath } = require("../../../../model/config");
const { sourceModel } = require("../../../../model/sources");
const sourcesJSON = path.resolve(configPath + "/sources.json");
const util = require("util");
const { readResource, resourceUpdated, successfullyDeleted } = require("../utils");
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
    async function DELETE(req, res, next) {
        if (!req.params.id) {
            res.status(500).json({ message: "I need a resource ID to perform this request" });
            return;
        }
        try {
            const sourceIdToDelete = req.params.id;
            const sourceExists = await sourceModel.deleteSource(sourceIdToDelete);
            if (!sourceExists) {
                res.status(500).json({ message: `I couldn't delete resource ${sourceIdToDelete}. Maybe it has been deleted already?` });
                return;
            }
            const sources = await sourceModel.getAllSources();
            res.status(200).json({ message: `${sourceIdToDelete} successfully deleted`, resources: sources });
        } catch (err) {
            next(err);
        }
    }

    async function PUT(req, res, next) {
        const updatedSource = req.body;
        const sourceIdToUpdate = req.params.id;
        if (sourceIdToUpdate != updatedSource.name) {
            res.status(500).json({ message: "Id and name are different." });
            return;
        }
        try {
            const sourceExists = await sourceModel.updateSource(updatedSource);
            if (!sourceExists) {
                res.status(400).json({ message: "Resource does not exist. If you want to create another resource, use POST instead." });
                return;
            }
            const sources = await sourceModel.getAllSources();
            res.status(200).json({ message: `${sourceIdToUpdate} successfully updated`, resources: sources });
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
