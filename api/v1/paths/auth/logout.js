const path = require("path");
const { config } = require(path.resolve("model/config"));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        (config.auth === "disabled") ? null : req.logout();
        const result = {
            redirect:
                config.auth == "keycloak" ? config.keycloak.authServerURL + "/realms/" + config.keycloak.realm + "/protocol/openid-connect/logout?redirect_uri=" + config.souslesensUrl : "/login",
        };

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
