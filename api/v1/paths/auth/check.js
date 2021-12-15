const path = require("path");
const config = require(path.resolve('config/mainConfig.json'));
const users = require(path.resolve('config/users/users.json'));

module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {

    const logged = req.user ? true : false

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
        .find((user) => user.login == req.user.login) : {};

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

    res.status(200).json(result);
  }

  GET.apiDoc = {
    summary: 'Check if a user is currently logged',
    operationId: 'check',
    parameters: [],
    responses: {
      200: {
        description: 'Current user info',
        schema: {
          $ref: '#/definitions/AuthCheck'
        }
      },
    }
  };

  return operations;
}