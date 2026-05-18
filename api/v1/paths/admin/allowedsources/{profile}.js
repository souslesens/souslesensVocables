import { sourceModel } from "../../../../../model/sources.js";
import { profileModel } from "../../../../../model/profiles.js";
import { successfullyFetched } from "./../../utils.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        try {
            const profileName = req.params.profile;
            const allProfiles = await profileModel.getAllProfiles();

            const profile = allProfiles[profileName];
            if (!profile) {
                res.status(404).json({ message: `Profile with name ${profileName} not found` });
                return;
            }

            const allSources = await sourceModel.getAllSources();

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

            const result = {
                profile: profileName,
                sources: allowedSources,
            };

            res.status(200).json(successfullyFetched(result));
        } catch (err) {
            res.status(err.status || 500).json({ message: err.toString() });
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "Get allowed sources for a specific profile",
        description:
            "Admin-only endpoint. Returns the list of sources allowed for the specified profile. " +
            "Access is determined by `allowedSourceSchemas` and `sourcesAccessControl` from the profile. " +
            "Each source includes `id`, `name`, `accessLevel` (read|readwrite), `schemaType`, and `group`. " +
            "Returns 404 if the profile does not exist.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminGetAllowedSourcesByProfile",
        parameters: [
            {
                in: "path",
                name: "profile",
                type: "string",
                required: true,
                description: "Profile name. Example: `admin_skos`.",
            },
        ],
        responses: {
            200: {
                description: "List of sources allowed for the profile",
                schema: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        resources: {
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
            404: {
                description: "Profile not found",
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
