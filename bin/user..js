const path = require("path");
const config = require(path.resolve('config/mainConfig.json'));
const users = require(path.resolve('config/users/users.json'));

const user = {
    getUser: function(reqUser) {

      const logged = reqUser ? true : false

      const auth =
          config.auth == "keycloak"
              ? {
                    realm: config.keycloak.realm,
                    clientID: config.keycloak.clientID,
                    authServerURL: config.keycloak.authServerURL,
                }
              : {};

      const findUser = logged ? Object.keys(users)
          .map(function (key, index) {
              return {
                  id: users[key].id,
                  login: users[key].login,
                  groups: users[key].groups,
                  source: users[key].source,
              };
          })
          .find((user) => user.login == reqUser.login) : {};

      const result = {
        logged: config.disableAuth ? true : logged,
        user: config.disableAuth ? {
          login: "admin",
          groups: ["admin"],
        } : logged ? {
          login: findUser.login,
          groups: findUser.groups,
        } : {},
        authSource: config.disableAuth ? "json" : config.auth,
        auth: config.disableAuth ? {} : auth,
      }

      return result
    }
}

module.exports = user