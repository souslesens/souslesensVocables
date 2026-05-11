import { sourceModel } from "../../../../../model/sources.js";
import userManager from "../../../../../bin/user.js";

export default function () {
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
        summary: "Get a single source descriptor by id",
        description:
            "Returns the descriptor of source `id` if the caller has access to it (`getOneUserSource`). " + "Despite living under `/admin/sources/{id}`, this GET only requires a logged-in user.",
        operationId: "adminGetOneSource",
        security: [{ restrictLoggedUser: [] }],
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "Source name. Example: `BFO`." }],
        responses: {
            200: {
                description: "Source descriptor.",
                schema: { $ref: "#/definitions/Source" },
            },
            400: { description: "Source not found or not accessible." },
        },
        tags: ["Sources"],
    };
    DELETE.apiDoc = {
        summary: "Delete a source (admin endpoint)",
        description: "Admin-only deletion of source `id`. Returns the refreshed full sources catalog. " + "Does not drop the named graph in the triplestore.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminDeleteSource",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "Source name to delete." }],
        responses: {
            200: {
                description: "Source deleted.",
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
        summary: "Update a source descriptor (admin endpoint)",
        description: "Admin-only update of source `id`. Body must be a full `Source` descriptor whose `name` matches the path `id`. " + "Returns the full sources catalog after update.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminUpdateSource",
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
            400: { description: "Source does not exist." },
            500: { description: "Mismatch between path id and body `name`, or persistence error." },
        },
        tags: ["Sources"],
    };
    return operations;
}
