import { successfullyFetched } from "./utils.js";
import { profileModel } from "../../../model/profiles.js";
import userManager from "../../../bin/user.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userTools = await profileModel.getUserTools(userInfo.user);
            res.status(200).json(successfullyFetched(userTools));
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "List the tools enabled for the current user's profiles",
        description:
            "Returns the intersection of tools enabled at the platform level (`mainConfig.tools_available`) and " +
            "tools allowed by the caller's profiles (`profileModel.getUserTools`). Drives the home-page tool launcher.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getUserTools",
        responses: {
            200: {
                description: "Allowed tools.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { type: "array", items: { type: "string" } },
                    },
                },
                examples: {
                    "application/json": {
                        message: "resource successfully fetched",
                        resources: ["lineage", "KGquery", "MappingModeler"],
                    },
                },
            },
        },
        tags: ["Tools"],
    };
    return operations;
}
