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
        const userProfiles = Object.fromEntries(Object.entries(users).filter(([key, value]) => value.groups.some((g) => profiles.includes(g))));
        return Object.entries(userProfiles).map(([key, value]) => ({ [key]: { login: value.login, profiles: value.groups } }));
    };
    ///// GET api/v1/users
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const profiles = await profileModel.getUserProfiles(userInfo.user);
            const allUsers = await userModel.getUserAccounts();
            const profileNames = await [...new Set(Object.values(profiles).map((item) => item.name))];
            const userProfiles = await this.filterUserByGroup(allUsers, profileNames);
            res.status(200).json(successfullyFetched(sortObjectByKey(userProfiles)));
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
    };

    ///// PUT api/v1/users
    async function PUT(req, res, next) {
        try {
            await Promise.all(
                Object.entries(req.body).map(async function ([_key, value]) {
                    await userModel.updateUserAccount(value);
                })
            );
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyUpdated(users));
        } catch (error) {
            next(error);
        }
    }
    PUT.apiDoc = {
        summary: "Update a User Account",
        security: [{ restrictAdmin: [] }],
        operationId: "updateUsers",
        parameters: [],
        responses: responseSchema("Users", "PUT"),
    };

    ///// POST api/v1/users
    async function POST(req, res, next) {
        try {
            await Promise.all(
                Object.entries(req.body).map(async function ([_key, value]) {
                    await userModel.addUserAccount(value);
                })
            );
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyCreated(users));
        } catch (error) {
            res.status(403).json({ message: error.toString() });
        }
    }
    POST.apiDoc = {
        summary: "Create a new user",
        security: [{ restrictAdmin: [] }],
        operationId: "createUser",
        parameters: [],
        responses: responseSchema("Users", "POST"),
    };

    return operations;
};
