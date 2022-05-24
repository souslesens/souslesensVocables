const path = require("path");
const passport = require("passport");
const { config } = require(path.resolve("model/config"));

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        if (config.auth == "keycloak") {
            passport.authenticate("provider", { scope: ["openid", "email", "profile"] });
            // TODO: what to return ?
            // see also /api/v1/paths/auth/login/callback.js
        } else if (config.auth == "json") {
            passport.authenticate("local", {
                successRedirect: "/vocables",
                failureRedirect: "/login",
                failureMessage: true,
            }); // TODO: what to return ?
        } else {
            throw Error("bad request"); // should not call this route if auth is disabled?
        }
        // res.status(200).json(currentUser);
    }

    POST.apiDoc = {
        summary: "Authenticate a user",
        operationId: "login",
        parameters: [],
        responses: {},
    };

    return operations;
};

