import { sourceModel } from '../../../../model/sources';
import userManager from '../../../../bin/user.';

module.exports = function () {
    let operations = {
        DELETE,
        PUT,
    };

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
            const userInfo = await userManager.getUser(req.user);
            const sources = await sourceModel.getOwnedSources(userInfo.user);
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
            const userInfo = await userManager.getUser(req.user);
            const sources = await sourceModel.getOwnedSources(userInfo.user);
            res.status(200).json({ message: `${sourceIdToUpdate} successfully updated`, resources: sources });
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }

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
