const path = require("path");
const userManager = require(path.resolve("bin/user."));
const passport = require("passport");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        passport.authenticate("provider", { successRedirect: "/", failureRedirect: "/login" });
        // res.status(200).json(currentUser);
        // TODO: what to return?
    }
    GET.apiDoc = {
        summary: "Callback for keycloak",
        operationId: "loginCallback",
        parameters: [],
        responses: {},
    };

    return operations;
};
