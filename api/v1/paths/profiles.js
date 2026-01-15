import { profileModel } from '../../../model/profiles';
import { userModel } from '../../../model/users';
import { resourceFetched, responseSchema } from './utils';
import userManager from '../../../bin/user.';

module.exports = function () {
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
        summary: "Returns all profiles of current user",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getProfilesCurrentUser",
        responses: responseSchema("Profiles", "GET"),
        tags: ["Profiles"],
    };
    return operations;
};
