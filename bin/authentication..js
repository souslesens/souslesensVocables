/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var jsonFileStorage = require("./jsonFileStorage.js");
var path = require("path");
var fs = require("fs");
var mySqlProxy = require("./mySQLproxy..js");
const bcrypt = require("bcrypt");

var passport = require("passport");
var Strategy = require("passport-local");
var KeyCloakStrategy = require("passport-keycloak-oauth2-oidc").Strategy;
const ULID = require("ulid");

// Get config
const { configPath, config } = require("../model/config");

if (config.auth == "keycloak") {
  // Configure auth client (Keycloak)
  let client = new KeyCloakStrategy(
    {
      clientID: config.keycloak.clientID,
      realm: config.keycloak.realm,
      publicClient: config.keycloak.publicClient,
      clientSecret: config.keycloak.clientSecret,
      sslRequired: "external",
      authServerURL: config.keycloak.authServerURL,
      callbackURL: "/login/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // Auth user here
      const usersLocation = path.join(__dirname, "../" + configPath + "/users/users.json");
      let users = JSON.parse("" + fs.readFileSync(usersLocation));

      // Search users
      let findUser = Object.keys(users)
        .map(function (key, _index) {
          return {
            id: users[key].id,
            login: users[key].login,
            groups: users[key].groups,
            source: users[key].source,
          };
        })
        .find((user) => user.login == profile.username);

      if (findUser && findUser.source != "keycloak") {
        // Rewrite local user
        users[findUser.id].password = "";
        users[findUser.id].source = "keycloak";

        findUser.source = "keycloak";

        fs.writeFile(usersLocation, JSON.stringify(users, null, 2), (err) => {
          if (err) throw err;
        });
      }

      if (!findUser) {
        // write user with default group
        const userUlid = ULID.ulid();
        users[userUlid] = {
          id: userUlid,
          login: profile.username,
          password: "",
          source: "keycloak",
          _type: "user",
          groups: config.defaultGroups ? config.defaultGroups : [],
        };

        findUser = {
          id: userUlid,
          login: profile.username,
          groups: config.defaultGroups ? config.defaultGroups : [],
          source: "keycloak",
        };

        fs.writeFile(usersLocation, JSON.stringify(users, null, 2), (err) => {
          if (err) throw err;
        });
      }

      done(null, findUser);
    }
  );
  passport.use("provider", client);
}
else if (config.auth === "local") {
  passport.use(
    new Strategy(function (username, password, cb) {
      var usersLocation = path.join(__dirname, "../" + configPath + "/users/users.json");
      jsonFileStorage.retrieve(path.resolve(usersLocation), function (err, users) {
        // console.log(users)
        if (err) {
          return cb(err);
        }

        var findUser = Object.keys(users)
          .map(function (key, _index) {
            return {
              login: users[key].login,
              password: users[key].password,
              groups: users[key].groups,
            };
          })
          .find((user) => user.login == username);

        if (!findUser) {
          return cb(null, false, { message: "Incorrect username or password." });
        }
        console.log(JSON.stringify(findUser))
        // Compare hash is password is hased
        if (findUser.password.startsWith("$2b$")) {
          if (!bcrypt.compareSync(password, findUser.password)) {
            return cb(null, false, { message: "Incorrect username or password." });
          }
          // plain text comparaison
        } else {
          if (findUser.password != password) {
            return cb(null, false, { message: "Incorrect username or password." });
          }
        }


        return cb(null, findUser);
      });
    })
  );
} else if (config.auth === "database") {
  passport.use(
    new Strategy(function(username, password, cb) {



      var sql = "select * from users where login='" + username + "'";
      var connection= config.authenticationDatabase;
      mySqlProxy.exec(connection, sql, function(err, result) {
        if (err) {
          return cb(err);
        }

        if (result.length == 0) {
          return cb(null, false, { message: "Incorrect username or password." });

        }
        if (password != result[0].password) {
          // bcrypt.compare(password, result[0].motDePasse, function (err, res) {
          return cb(null, false, { message: "Incorrect username or password." });
        }

        var user = result[0];
       // delete user.password;
        user.groups=user.groups.split(",")
        console.log(JSON.stringify(user))
        return cb(null, user);


      });
    }));


} else {
  console.log("Auth is disabled");
}

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { login: user.login, groups: user.groups });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});