const path = require("path");
const { config } = require(path.resolve("model/config"));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        const result = {};
        if (config.auth === "disabled") {
            req.logout(function (err) {
                if (err) {
                    return next(err);
                }
            });
        } else if (config.auth === "keycloak") {
            result.redirect = config.keycloak.authServerURL + "/realms/" + config.keycloak.realm + "/protocol/openid-connect/logout?redirect_uri=" + config.souslesensUrl;
        } else if (config.auth === "local") {
            result.redirect = "/login";
        } else {
            throw new Error(`unkown config.auth ${config.auth}`);
        }
        res.status(200).json(result);
    }

    GET.apiDoc = {
        summary: "Logout user",
        operationId: "logout",
        parameters: [],
        responses: {
            200: {
                description: "Logout current user",
                schema: {
                    $ref: "#/definitions/AuthLogout",
                },
            },
        },
    };

    return operations;
};
