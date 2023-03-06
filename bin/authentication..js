/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const { userModel } = require("../model/users");
var mySqlProxy = require("./mySQLproxy..js");
const bcrypt = require("bcrypt");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const KeyCloakStrategy = require("passport-keycloak-oauth2-oidc").Strategy;
const ULID = require("ulid");

// Get config
const { configPath, config } = require("../model/config");

if (config.auth == "keycloak") {
    passport.use(
        "provider",
        new KeyCloakStrategy(
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
                userModel.findUserAccount(profile.username).then((userAccount) => {
                    // if no local UserAccount, create one
                    if (!userAccount) {
                        userAccount = {
                            id: ULID.ulid(),
                            login: profile.username,
                            password: "",
                            source: "keycloak",
                            _type: "user",
                            groups: config.defaultGroups ? config.defaultGroups : [],
                        };
                        userModel.addUserAccount(userAccount);
                    }
                    // make sure source is keycloak and password is empty
                    if (userAccount.source != "keycloak") {
                        userAccount.source = "keycloak";
                        userAccount.password = "";
                        userModel.updateUserAccount(userAccount);
                    }
                    // do not disclose password and _type
                    delete userAccount["password"];
                    delete userAccount["_type"];
                    done(null, userAccount);
                });
            }
        )
    );
} else if (config.auth === "local") {
    passport.use(
        new LocalStrategy(function (username, password, cb) {
            userModel.checkUserPassword(username, password).then((checkOK) => {
                if (!checkOK) {
                    return cb(null, false, { message: "Incorrect username or password." });
                }
                userModel.findUserAccount(username).then((userAccount) => cb(null, userAccount));
            });
        })
    );
} else if (config.auth === "database") {
    passport.use(
        new LocalStrategy(function (username, password, cb) {
            var connection = config.authenticationDatabase;
            if (!config.authenticationDatabase) return cb("No authenticationDatabase declared in mainConfig.json");
            var sql = "select * from " + connection.table + " where " + connection.loginColumn + "='" + username + "'";

            mySqlProxy.exec(connection, sql, function (err, result) {
                if (err) {
                    console.log("connection To authentication database failed");
                    return cb(err);
                }
                console.log("connection To authentication database ok");
                if (result.length == 0) {
                    console.log("bad Login");
                    return cb(null, false, { message: "Incorrect username or password." });
                }
                if (password != result[0][connection.passwordColum]) {
                    console.log("bad Password");
                    // bcrypt.compare(password, result[0].motDePasse, function (err, res) {
                    return cb(null, false, { message: "Incorrect username or password." });
                }

                var user = result[0];
                // delete user.password;
                user.login = username;
                user.groups = user[connection.groupsColumn].split(",");
                console.log(JSON.stringify(user));
                return cb(null, user);
            });
        })
    );
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
