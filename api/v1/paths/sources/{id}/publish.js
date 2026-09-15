import { sourceModel } from "../../../../../model/sources.js";
import userManager from "../../../../../bin/user.js";

export default function () {
    let operations = {
        GET,
        PUT,
    };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const publishableGroups = await sourceModel.getPublishableGroups(userInfo.user, req.params.id);
            res.status(200).json({ message: "resource successfully fetched", resources: publishableGroups });
        } catch (err) {
            res.status(err.status || 500).json({ message: err.message || "An error occurred" });
        }
    }

    async function PUT(req, res, _next) {
        const sourceName = req.params.id;
        try {
            const userInfo = await userManager.getUser(req.user);
            await sourceModel.publishSource(userInfo.user, sourceName, req.body.group);
            const sources = await sourceModel.getOwnedSources(userInfo.user);
            res.status(200).json({ message: `${sourceName} successfully published`, resources: sources });
        } catch (err) {
            res.status(err.status || 500).json({ message: err.message || "An error occurred" });
        }
    }

    GET.apiDoc = {
        summary: "List the groups a source can be published into",
        description:
            "Returns the groups the caller may publish source `id` into: the groups of the existing sources and the groups named in the caller's profiles, " +
            "kept when a profile grants `readwrite` on `<schemaType>/<group>`. `PRIVATE` groups are never returned. Only the owner of the source (or an admin) may call it.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getSourcePublishableGroups",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "Name of a source owned by the caller. Example: `my_new_ontology`." }],
        responses: {
            200: {
                description: "Publishable groups, sorted by name.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { type: "array", items: { type: "string" } },
                    },
                },
                examples: {
                    "application/json": { message: "resource successfully fetched", resources: ["STANDARDS/TOP_ONTOLOGIES", "TEAM_ONTOLOGIES"] },
                },
            },
            403: { description: "The caller does not own the source." },
            404: { description: "The source does not exist." },
        },
        tags: ["Sources"],
    };

    PUT.apiDoc = {
        summary: "Publish a source owned by the current user",
        description:
            "Sets `published = true` on source `id` and moves it into `group`, which must be one of the groups returned by `GET /sources/{id}/publish`. " +
            "Visibility then follows the profiles granting access to that group. Returns the refreshed list of sources owned by the caller.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "publishUserSource",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Name of a source owned by the caller." },
            {
                in: "body",
                name: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["group"],
                    properties: {
                        group: { type: "string", description: "Target group, without the schema type prefix.", example: "TEAM_ONTOLOGIES" },
                    },
                    example: { group: "TEAM_ONTOLOGIES" },
                },
                "x-examples": {
                    "Publish into TEAM_ONTOLOGIES": { group: "TEAM_ONTOLOGIES" },
                },
            },
        ],
        responses: {
            200: {
                description: "Source published.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Sources" },
                    },
                },
            },
            403: { description: "The caller does not own the source, or has no readwrite right on the group." },
            404: { description: "The source does not exist." },
        },
        tags: ["Sources"],
    };

    return operations;
}
