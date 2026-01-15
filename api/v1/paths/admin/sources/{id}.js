import { sourceModel } from '../../../../../model/sources';
import userManager from '../../../../../bin/user.';

module.exports = function () {
    let operations = {
        GET,
        DELETE,
        PUT,
    };

    async function GET(req, res, _next) {
        const userInfo = await userManager.getUser(req.user);
        const source = await sourceModel.getOneUserSource(userInfo.user, req.params.id);
        if (source) {
            res.status(200).json(source);
            return;
        }
        res.status(400).json({ message: `Source with id ${req.params.id} not found` });
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
            res.status(err.status || 500).json(err);
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
            res.status(err.status || 500).json(err);
            next(err);
        }
    }

    GET.apiDoc = {
        summary: "This resource returns profiles list or a profile if an id is provided",
        operationId: "getProfiles",
        security: [{ restrictLoggedUser: [] }],
        parameters: [],
        responses: {
            200: {
                description: "Profiles",
                schema: {
                    $ref: "#/definitions/Profile",
                },
            },
        },
        tags: ["Sources"],
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
        tags: ["Sources"],
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
        tags: ["Sources"],
    };
    return operations;
};
