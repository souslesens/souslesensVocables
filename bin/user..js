const fs = require("fs");
const path = require("path");
const config = require(path.resolve("config/mainConfig.json"));

const user = {
    getUser: function (reqUser) {
        const usersLocation = path.join(__dirname, "../config/users/users.json");
        let users = JSON.parse("" + fs.readFileSync(usersLocation));

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

        if (config.disableAuth) {
            result = {
                logged: true,
                user: { login: "admin", groups: "admin" },
                authSource: "json",
                auth: {},
            };
        } else if (logged) {
            const findUser = Object.keys(users)
                .map(function (key, _index) {
                    return {
                        id: users[key].id,
                        login: users[key].login,
                        groups: users[key].groups,
                        source: users[key].source,
                    };
                })
                .find((user) => user.login == reqUser.login);

            if (findUser === undefined) {
                console.log("could not find logged user ", reqUser, typeof reqUser);
                console.log("users are ", users);
                throw "could not find logged user " + reqUser;
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
    getProfiles: function (reqUser) {
        const currentUser = user.getUser(reqUser);
        return currentUser.user.groups !== undefined ? currentUser.user.groups : [];
    },
};

module.exports = user;
