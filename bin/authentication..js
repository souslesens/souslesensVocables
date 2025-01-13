/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const { userModel } = require("../model/users");
const { profileModel } = require("../model/profiles");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const Auth0Strategy = require('passport-auth0');
const KeyCloakStrategy = require("passport-keycloak-oauth2-oidc").Strategy;
const ULID = require("ulid");

// Get config
const { readMainConfig } = require("../model/config");
const config = readMainConfig();

const getUserAccount = async (source, username) => {
    let [_name, account] = await userModel.findUserAccount(username);

    // create a new account if the username was not found in the database
    if (!account) {
        account = {
            _type: "user",
            allowSourceCreation: false,
            groups: config.defaultGroups ? config.defaultGroups : [],
            id: ULID.ulid(),
            login: username,
            maxNumberCreatedSource: 5,
            password: "",
            source: source,
        }
        await userModel.addUserAccount(account);
    }
    // Replace the password with an empty one if the user was not related to
    // the specified source
    else if (account.source !== source) {
        account = { ...account, password: "", source: source };
        userModel.updateUserAccount(account);
    }

    // Do not disclose _type
    const { _type, ...accountWithoutType } = account;
    return accountWithoutType;
};

const fetchAccessTokenFromAPI = async (domain, clientID, clientSecret) => {
    const response = await fetch(
        `https://${domain}/oauth/token`, {
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: clientID,
                client_secret: clientSecret,
                audience: `https://${domain}/api/v2/`,
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            redirect: "follow",
        }
    );

    const data = await response.json();
    return data.access_token || undefined;
};

const fetchUserRolesFromAPI = async (domain, userID, accessToken) => {
    const response = await fetch(
        `https://${domain}/api/v2/users/${userID}/roles`, {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            method: "GET",
        }
    );

    const data = await response.json();
    return data;
};

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
            async function (_accessToken, _refreshToken, profile, done) {
                const userAccount = await getUserAccount("keycloak", profile.username);
                done(null, userAccount);
            }
        )
    );
} else if (config.auth === "auth0") {
    passport.use(
        "auth0",
        new Auth0Strategy(
            {
                callbackURL: "/login/callback",
                clientID: config.auth0.clientID,
                clientSecret: config.auth0.clientSecret,
                domain: config.auth0.domain,
                scope: config.auth0.scope,
                sslRequired: "external",
            },
            async function(_accessToken, _refreshToken, response, profile, done) {
                const accessToken = await fetchAccessTokenFromAPI(
                    config.auth0.domain,
                    config.auth0.api.clientID || config.auth0.clientID,
                    config.auth0.api.clientSecret || config.auth0.clientSecret,
                )

                const roles = await fetchUserRolesFromAPI(
                    config.auth0.domain,
                    profile.user_id,
                    accessToken,
                );

                const available_groups = Object.keys(await profileModel.getAllProfiles());

                const groups = roles
                    .filter((role) => available_groups.includes(role.name))
                    .map((role) => role.name);

                const userAccount = await getUserAccount("auth0", profile._json.nickname);
                userAccount.groups = groups;
                userModel.updateUserAccount(userAccount);

                done(null, userAccount);
            },
        )
    );
} else if (config.auth === "local" || config.auth === "database") {
    passport.use(
        new LocalStrategy(function (username, password, cb) {
            userModel.checkUserPassword(username, password).then((checkOK) => {
                if (!checkOK) {
                    return cb(null, false, { message: "Incorrect username or password." });
                }
                userModel.findUserAccount(username).then(([_name, userAccount]) => {
                    cb(null, userAccount);
                });
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
