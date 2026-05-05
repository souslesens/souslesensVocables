import { profileModel } from "../../../model/profiles.js";
import { userModel } from "../../../model/users.js";
import { resourceFetched, responseSchema } from "./utils.js";
import userManager from "../../../bin/user.js";

export default function () {
    let operations = {
        GET,
    };

    ///// GET api/v1/profiles
    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);

            if ((await userModel.isAdmin(userInfo.user.login)) === true) {
                resourceFetched(res, await profileModel.getAllProfiles());
                return;
            }

            const profiles = await profileModel.getUserProfiles(userInfo.user);
            resourceFetched(res, profiles);
        } catch (error) {
            res.status(500).json({ message: error.toString() });
        }
    }
    GET.apiDoc = {
        summary: "List profiles visible to the current user",
        description:
            "Admin callers receive the full profiles catalog (`profileModel.getAllProfiles`). " +
            "Non-admin callers receive only the profiles they belong to (`profileModel.getUserProfiles`). " +
            "Each profile carries `allowedTools`, `allowedSourceSchemas`, `sourcesAccessControl`, etc. — see the `Profile` definition.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getProfilesCurrentUser",
        responses: responseSchema("Profiles", "GET"),
        tags: ["Profiles"],
    };
    return operations;
}
