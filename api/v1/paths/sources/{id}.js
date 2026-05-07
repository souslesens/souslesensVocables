import { sourceModel } from "../../../../model/sources.js";
import userManager from "../../../../bin/user.js";

export default function () {
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
        summary: "Delete a source owned by the current user",
        description:
            "Removes the source descriptor `id` from `sources.json`. Returns the refreshed list of sources owned by the caller. " +
            "Does **not** drop the corresponding named graph in the triplestore — use `DELETE /rdf/graph` for that.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "deleteUserSource",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Source name to delete. Example: `my_new_ontology`." },
        ],
        responses: {
            200: {
                description: "Source deleted. Returns the refreshed owned-sources list.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Sources" },
                    },
                },
            },
            500: { description: "Source not found or persistence error." },
        },
        tags: ["Sources"],
    };
    PUT.apiDoc = {
        summary: "Update a source descriptor",
        description:
            "Replaces the descriptor of source `id`. The `name` field of the body must equal the path `id`. " +
            "Returns the refreshed list of sources owned by the caller.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "updateUserSource",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Source name to update." },
            { in: "body", name: "body", required: true, schema: { $ref: "#/definitions/SourceUpdate" } },
        ],
        responses: {
            200: {
                description: "Source updated.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Sources" },
                    },
                },
            },
            400: { description: "Source does not exist (use POST to create)." },
            500: { description: "Mismatch between path id and body `name`, or persistence error." },
        },
        tags: ["Sources"],
    };
    return operations;
}
