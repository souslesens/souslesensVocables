const { userModel } = require("../../../model/users");
const { sortObjectByKey, responseSchema, successfullyFetched } = require("./utils");
const { profileModel } = require("../../../model/profiles");
const userManager = require("../../../bin/user.");

module.exports = function () {
    let operations = {
        GET,
    };

    /**
     * Filter user by his profiles
     *
     * @param {users} users - the all users to filter
     * @param {profiles} the group to filter
     * @returns {users} - user objects with matched profiles
     */
    filterUserByGroup = (users, profiles) => {
        const userProfiles = Object.fromEntries(Object.entries(users).filter(([_key, value]) => value.groups.some((g) => profiles.includes(g))));
        return Object.entries(userProfiles).map(([key, value]) => ({ [key]: { login: value.login, profiles: value.groups } }));
    };
    ///// GET api/v1/users
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userProfiles = await profileModel.getUserProfiles(userInfo.user);
            const sharedProfiles = Object.values(userProfiles).filter((profile) => profile.isShared);
            const allUsers = await userModel.getUserAccounts();
            const profileNames = await [...new Set(sharedProfiles.map((item) => item.name))];
            const users = await this.filterUserByGroup(allUsers, profileNames);
            res.status(200).json(successfullyFetched(sortObjectByKey(users)));
        } catch (error) {
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "Return a list of all User Accounts in the same profiles",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getAllUsersWithProfiles",
        parameters: [],
        responses: responseSchema("Users", "GET"),
        tags: ["Users"],
    };

    return operations;
};
