const fs = require("fs");
const path = require("path");
const { configPath, config } = require("../model/config");
const { userModel } = require("../model/users");

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
            result = {
                logged: true,
                user: { login: "admin", groups: ["admin"] },
                authSource: "json",
                auth: {},
            };
        } else if (logged) {
            const findUser = await userModel.findUserAccount(reqUser.login);
            if (findUser === undefined) {
                throw Error("could not find logged user " + reqUser);
            }
            result = {
                logged: true,
                user: { login: findUser.login, groups: findUser.groups },
                authSource: config.auth,
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

module.exports = user;
