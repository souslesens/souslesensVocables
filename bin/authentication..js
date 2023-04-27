/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const { userModel } = require("../model/users");

const bcrypt = require("bcrypt");
const mariadb = require("mariadb");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const KeyCloakStrategy = require("passport-keycloak-oauth2-oidc").Strategy;
const ULID = require("ulid");

// Get config
const { config } = require("../model/config");

if (config.auth == "keycloak") {
    passport.use(
        "keycloak",
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
            async function (accessToken, refreshToken, profile, done) {
                const userAccount = await userModel.findUserAccount(profile.username);
                const userAccountToAdd = {
                    id: ULID.ulid(),
                    login: profile.username,
                    password: "",
                    source: "keycloak",
                    _type: "user",
                    groups: config.defaultGroups ? config.defaultGroups : [],
                };
                const user = userAccount ? userAccount : userAccountToAdd;

                // if no local UserAccount, create one
                if (!userAccount) {
                    await userModel.addUserAccount(userAccountToAdd);
                } else if (user.source != "keycloak") {
                    // make sure source is keycloak and password is empty
                    const userAccountWithPassword = { ...userAccount, password: "", source: "keycloak" };
                    userModel.updateUserAccount(userAccountWithPassword);
                }
                // do not disclose _type
                const { _type, ...userAccountWithoutType } = user;
                done(null, userAccountWithoutType);
                // });
            }
        )
    );
} else if (config.auth === "local" || config.auth === "database") {
    passport.use(
        new LocalStrategy(function (username, password, cb) {
            userModel.checkUserPassword(username, password).then((checkOK) => {
                if (!checkOK) {
                    return cb(null, false, { message: "Incorrect username or password." });
                }
                userModel.findUserAccount(username).then((userAccount) => {
                    cb(null, userAccount)});
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
