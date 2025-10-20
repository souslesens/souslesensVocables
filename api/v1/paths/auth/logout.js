const { mainConfigModel } = require("../../../../model/mainConfig");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        const config = await mainConfigModel.getConfig();
        const result = {};
        // logout if aut is not disable
        if (config.auth !== "disabled") {
            req.logout(function (err) {
                if (err) {
                    res.status(err.status || 500).json(err);
                    return next(err);
                }
            });
        }

        if (config.auth === "keycloak") {
            result.redirect = config.keycloak.authServerURL + "/realms/" + config.keycloak.realm + "/protocol/openid-connect/logout?redirect_uri=" + config.souslesensUrl;
        } else if (config.auth === "local" || config.auth === "database") {
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
        tags: ["Authentication"],
    };

    return operations;
};
