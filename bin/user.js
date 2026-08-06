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
            const adminSourceCreationRights = await user.resolveSourceCreationRights(adminUser);
            result = {
                logged: true,
                user: {
                    id: adminUser.id,
                    login: adminUser.login,
                    groups: adminUser.groups,
                    token: adminUser.token,
                },
                authSource: "disabled",
                allowSourceCreation: adminSourceCreationRights.allowSourceCreation,
                maxNumberCreatedSource: adminSourceCreationRights.maxNumberCreatedSource,
                auth: {},
            };
        } else if (logged) {
            const [_name, findUser] = await userModel.findUserAccount(reqUser.login);
            if (findUser === undefined) {
                throw Error("could not find logged user " + reqUser);
            }
            const sourceCreationRights = await user.resolveSourceCreationRights(findUser);
            result = {
                logged: true,
                user: { id: findUser.id, login: findUser.login, groups: findUser.groups, token: findUser.token },
                authSource: config.auth,
                allowSourceCreation: sourceCreationRights.allowSourceCreation,
                maxNumberCreatedSource: sourceCreationRights.maxNumberCreatedSource,
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
     * The source creation rights live on the user account and on the profiles.
     * A profile that defines them takes precedence, so an offer tier can lower
     * the account defaults. The account values remain the fallback for the
     * profiles that leave them undefined.
     * @param {UserAccount} userAccount - the user account read from the database
     * @returns {Promise<{ allowSourceCreation: boolean, maxNumberCreatedSource: number }>}
     */
    resolveSourceCreationRights: async (userAccount) => {
        const profileRights = await profileModel.getSourceCreationRightsForUser(userAccount);

        return {
            allowSourceCreation: profileRights.allowSourceCreation ?? userAccount.allowSourceCreation,
            maxNumberCreatedSource: profileRights.maxNumberCreatedSource ?? userAccount.maxNumberCreatedSource,
        };
    },
    getProfiles: async (reqUser) => {
        const currentUser = await user.getUser(reqUser);
        return currentUser.user.groups !== undefined ? currentUser.user.groups : [];
    },
};

export default user;
