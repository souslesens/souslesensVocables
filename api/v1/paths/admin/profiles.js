import { profileModel } from "../../../../model/profiles.js";
import { quotaModel } from "../../../../model/quota.js";
import { resourceFetched, responseSchema, resourceCreated } from "../utils.js";
import userManager from "../../../../bin/user.js";

export default function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/profiles
    async function GET(_req, res, _next) {
        try {
            const profiles = await profileModel.getAllProfiles();
            resourceFetched(res, profiles);
        } catch (error) {
            res.status(500).json({ message: error.toString() });
        }
    }
    GET.apiDoc = {
        summary: "List every profile (admin only)",
        description:
            "Admin-only. Returns the full `profiles.json` catalog. Each profile defines `allowedTools`, " +
            "`allowedSourceSchemas`, `sourcesAccessControl`, optional `quota`, etc.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminGetProfiles",
        responses: responseSchema("Profiles", "GET"),
        tags: ["Profiles"],
    };

    ///// POST api/v1/profiles
    async function POST(req, res, _next) {
        try {
            const newProfile = req.body;
            await Promise.all(
                Object.entries(newProfile).map(async ([_k, profile]) => {
                    await profileModel.addProfile(profile);
                }),
            );
            quotaModel.clearConfigCache();
            const profiles = await profileModel.getAllProfiles();
            resourceCreated(res, profiles);
        } catch (error) {
            res.status(403).json({ message: error.toString() });
        }
    }
    POST.apiDoc = {
        summary: "Create one or more profiles (admin only)",
        description:
            "Body is a map `profileName → Profile`. Each entry is added via `profileModel.addProfile`. " +
            "Quota cache is invalidated after insertion. Returns the refreshed profiles catalog.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminCreateProfiles",
        parameters: [
            {
                in: "body",
                name: "body",
                required: true,
                schema: { type: "object", additionalProperties: { $ref: "#/definitions/Profile" } },
                "x-examples": {
                    "Add a read-only profile on BFO/IOF_core": {
                        readers: {
                            allowedSourceSchemas: ["OWL"],
                            allowedTools: ["lineage", "KGquery"],
                            sourcesAccessControl: {
                                "OWL/STANDARDS/TOP_ONTOLOGIES/BFO": "read",
                                "OWL/STANDARDS/ABSTRACT ONTOLOGIES/IOF_core": "read",
                            },
                            theme: "default",
                        },
                    },
                },
            },
        ],
        responses: responseSchema("Profiles", "POST"),
        tags: ["Profiles"],
    };

    return operations;
}
