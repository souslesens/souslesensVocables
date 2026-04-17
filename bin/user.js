import { config } from "../model/config.js";
import { userModel } from "../model/users.js";

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
            result = {
                logged: true,
                user: {
                    id: adminUser.id,
                    login: adminUser.login,
                    groups: adminUser.groups,
                    token: adminUser.token,
                },
                authSource: "disabled",
                allowSourceCreation: adminUser.allowSourceCreation,
                maxNumberCreatedSource: adminUser.maxNumberCreatedSource,
                auth: {},
            };
        } else if (logged) {
            const [_name, findUser] = await userModel.findUserAccount(reqUser.login);
            if (findUser === undefined) {
                throw Error("could not find logged user " + reqUser);
            }
            result = {
                logged: true,
                user: { id: findUser.id, login: findUser.login, groups: findUser.groups, token: findUser.token },
                authSource: config.auth,
                allowSourceCreation: findUser.allowSourceCreation,
                maxNumberCreatedSource: findUser.maxNumberCreatedSource,
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
    getProfiles: async (reqUser) => {
        const currentUser = await user.getUser(reqUser);
        return currentUser.user.groups !== undefined ? currentUser.user.groups : [];
    },
};

export default user;
