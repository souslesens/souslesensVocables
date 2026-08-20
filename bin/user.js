import { config } from "../model/config.js";
import { userModel } from "../model/users.js";
import { profileModel } from "../model/profiles.js";

const user = {
    getUser: async (reqUser) => {
        let result = {};
        const logged = reqUser ? true : false;
        const auth =
            config.auth == "keycloak"
                ? {
                      realm: config.keycloak.realm,
                      clientID: config.keycloak.clientID,
                      authServerURL: config.keycloak.authServerURL,
                  }
                : {};

        if (config.auth === "disabled") {
            const [_name, adminUser] = await userModel.findUserAccount("admin");
            if (adminUser === undefined) {
                throw Error("Admin user not found in database. Ensure ensureAdminUserExists() was called at startup.");
            }
            const adminLimits = await user.resolveUserLimits(adminUser);
            result = {
                logged: true,
                user: {
                    id: adminUser.id,
                    login: adminUser.login,
                    groups: adminUser.groups,
                    token: adminUser.token,
                },
                authSource: "disabled",
                ...adminLimits,
                auth: {},
            };
        } else if (logged) {
            const [_name, findUser] = await userModel.findUserAccount(reqUser.login);
            if (findUser === undefined) {
                throw Error("could not find logged user " + reqUser);
            }
            const userLimits = await user.resolveUserLimits(findUser);
            result = {
                logged: true,
                user: { id: findUser.id, login: findUser.login, groups: findUser.groups, token: findUser.token },
                authSource: config.auth,
                ...userLimits,
                auth: auth,
            };
        } else {
            result = {
                logged: false,
                user: {},
                authSource: config.auth,
                auth: auth,
            };
        }

        return result;
    },
    /**
     * The limits live on the user account and on the profiles. A profile that
     * defines one takes precedence, so an offer tier can lower the account
     * defaults. The account values remain the fallback for the profiles that
     * leave them undefined, and a limit left undefined on both sides caps nothing.
     *
     * `??` and never `||`: 0 is a cap that forbids, not a missing value.
     *
     * @param {UserAccount} userAccount - the user account read from the database
     * @returns {Promise<{ allowSourceCreation: boolean, maxNumberCreatedSource: number, maxWritableTriplesPerUser: number|undefined, maxUploadTriplesPerUser: number|undefined, maxUserDataRecordsPerUser: number|undefined }>}
     */
    resolveUserLimits: async (userAccount) => {
        const profileLimits = await profileModel.getLimitsForUser(userAccount);

        return {
            allowSourceCreation: profileLimits.allowSourceCreation ?? userAccount.allowSourceCreation,
            maxNumberCreatedSource: profileLimits.maxNumberCreatedSource ?? userAccount.maxNumberCreatedSource,
            maxWritableTriplesPerUser: profileLimits.maxWritableTriplesPerUser ?? userAccount.maxWritableTriplesPerUser,
            maxUploadTriplesPerUser: profileLimits.maxUploadTriplesPerUser ?? userAccount.maxUploadTriplesPerUser,
            maxUserDataRecordsPerUser: profileLimits.maxUserDataRecordsPerUser ?? userAccount.maxUserDataRecordsPerUser,
        };
    },
    getProfiles: async (reqUser) => {
        const currentUser = await user.getUser(reqUser);
        return currentUser.user.groups !== undefined ? currentUser.user.groups : [];
    },
};

export default user;
