import { profileModel } from "../../../../../model/profiles.js";
import { quotaModel } from "../../../../../model/quota.js";
import userManager from "../../../../../bin/user.js";

export default function () {
    let operations = {
        GET,
        DELETE,
        PUT,
    };

    async function GET(req, res, _next) {
        const userInfo = await userManager.getUser(req.user);
        const profile = await profileModel.getOneUserProfile(userInfo.user, req.params.id);
        if (profile) {
            res.status(200).json(profile);
            return;
        }
        res.status(400).json({ message: `Profile with id ${req.params.id} not found` });
    }

    async function DELETE(req, res, next) {
        if (!req.params.id) {
            res.status(500).json({ message: "I need a resource ID to perform this request" });
            return;
        }
        try {
            const profileIdToDelete = req.params.id;
            const profileExists = await profileModel.deleteProfile(profileIdToDelete);
            if (!profileExists) {
                res.status(500).json({ message: `I couldn't delete resource ${profileIdToDelete}. Maybe it has been deleted already?` });
                return;
            }
            quotaModel.clearConfigCache();
            const profiles = await profileModel.getAllProfiles();
            res.status(200).json({ message: `${profileIdToDelete} successfully deleted`, resources: profiles });
        } catch (err) {
            next(err);
        }
    }

    async function PUT(req, res, next) {
        const updatedProfile = req.body;
        const profileIdToUpdate = req.params.id;
        if (profileIdToUpdate != updatedProfile.name) {
            res.status(500).json({ message: "Id and name are different." });
            return;
        }
        try {
            const profileExists = await profileModel.updateProfile(updatedProfile);
            if (!profileExists) {
                res.status(400).json({ message: "Resource does not exist. If you want to create another reprofile, use POST instead." });
                return;
            }
            quotaModel.clearConfigCache();
            const profiles = await profileModel.getAllProfiles();
            res.status(200).json({ message: `${profileIdToUpdate} successfully updated`, reprofiles: profiles });
        } catch (err) {
            next(err);
        }
    }

    GET.apiDoc = {
        summary: "Get a profile by id (current user must be a member)",
        description:
            "Returns profile `id` if the caller belongs to it (`profileModel.getOneUserProfile`). " +
            "Useful to read effective `allowedTools` / `sourcesAccessControl` for the current user.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getOneProfile",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Profile name." },
        ],
        responses: {
            200: { description: "Profile descriptor.", schema: { $ref: "#/definitions/Profile" } },
            400: { description: "Profile not found or caller is not a member." },
        },
        tags: ["Profiles"],
    };
    DELETE.apiDoc = {
        summary: "Delete a profile (admin only)",
        description: "Removes profile `id`, invalidates the quota cache, returns the refreshed profiles catalog.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminDeleteProfile",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Profile name to delete." },
        ],
        responses: {
            200: {
                description: "Profile deleted.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Profiles" },
                    },
                },
            },
            500: { description: "Profile not found or persistence error." },
        },
        tags: ["Profiles"],
    };
    PUT.apiDoc = {
        summary: "Update a profile (admin only)",
        description: "Replaces profile `id`. The `name` field of the body must equal the path id. Invalidates the quota cache.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminUpdateProfile",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Profile name to update." },
            { in: "body", name: "body", required: true, schema: { $ref: "#/definitions/Profile" } },
        ],
        responses: {
            200: {
                description: "Profile updated.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        reprofiles: { $ref: "#/definitions/Profiles" },
                    },
                },
            },
            400: { description: "Profile does not exist." },
            500: { description: "Mismatch between path id and body `name`, or persistence error." },
        },
        tags: ["Profiles"],
    };

    return operations;
}
