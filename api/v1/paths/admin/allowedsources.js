import { sourceModel } from "../../../../model/sources.js";
import { profileModel } from "../../../../model/profiles.js";
import { userModel } from "../../../../model/users.js";
import { responseSchema, successfullyFetched } from "./../utils.js";
import userManager from "../../../../bin/user.js";
import { config } from "../../../../model/config.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);

            const allProfiles = await profileModel.getAllProfiles();
            const allSources = await sourceModel.getAllSources();

            const result = Object.entries(allProfiles).map(([profileName, profile]) => {
                const allowedSourceSchemas = profile.allowedSourceSchemas || [];
                const sourcesAccessControl = profile.sourcesAccessControl || {};

                const allowedSources = Object.entries(allSources)
                    .filter(([sourceName, source]) => {
                        if (!allowedSourceSchemas.includes(source.schemaType)) {
                            return false;
                        }

                        const schemaType = source.schemaType;
                        const group = source.group || "";
                        const treeStr = [schemaType, group, sourceName].join("/");

                        const closestParent = Object.entries(sourcesAccessControl)
                            .filter(([k, v]) => treeStr === k || treeStr.startsWith(`${k}/`))
                            .reduce((acc, current) => (acc[0].length >= current[0].length ? acc : current), ["", ""]);

                        const accessLevel = closestParent[1] || "forbidden";

                        if (!["read", "readwrite"].includes(accessLevel)) {
                            return false;
                        }

                        return true;
                    })
                    .map(([sourceName, source]) => {
                        const schemaType = source.schemaType;
                        const group = source.group || "";
                        const treeStr = [schemaType, group, sourceName].join("/");

                        const closestParent = Object.entries(sourcesAccessControl)
                            .filter(([k, v]) => treeStr === k || treeStr.startsWith(`${k}/`))
                            .reduce((acc, current) => (acc[0].length >= current[0].length ? acc : current), ["", ""]);

                        const accessLevel = closestParent[1] || "read";

                        return {
                            id: source.id || sourceName,
                            name: sourceName,
                            accessLevel: accessLevel,
                            schemaType: source.schemaType,
                            group: source.group,
                        };
                    });

                return {
                    profile: profileName,
                    sources: allowedSources,
                };
            });

            res.status(200).json(successfullyFetched(result));
        } catch (err) {
            res.status(err.status || 500).json({ message: err.toString() });
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "List allowed sources for each profile (admin only)",
        description:
            "Admin-only endpoint. Returns a list where each entry contains a profile name and the list of sources allowed for that profile. " +
            "Access is determined by `allowedSourceSchemas` and `sourcesAccessControl` from each profile. " +
            "Each source includes `id`, `name`, `accessLevel` (read|readwrite), `schemaType`, and `group`.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminGetAllowedSources",
        responses: {
            200: {
                description: "List of profiles with their allowed sources",
                schema: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        resources: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    profile: { type: "string" },
                                    sources: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                accessLevel: { type: "string", enum: ["read", "readwrite"] },
                                                schemaType: { type: "string" },
                                                group: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            default: {
                description: "An error occurred",
                schema: {
                    additionalProperties: true,
                },
            },
        },
        tags: ["Profiles", "Sources"],
    };

    return operations;
}
