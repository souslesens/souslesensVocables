import { mainConfigModel } from "../../../../model/mainConfig.js";

export default function () {
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
        } else if (config.auth === "auth0") {
            const logoutUrl = `https://${config.auth0.domain}/oidc/logout`;
            result.redirect = logoutUrl;
        } else if (config.auth === "local" || config.auth === "database") {
            result.redirect = "/login";
        } else {
            throw new Error(`unkown config.auth ${config.auth}`);
        }
        res.status(200).json(result);
    }

    GET.apiDoc = {
        summary: "Log out the current user and return the provider redirect URL",
        description:
            'Terminates the local session via `req.logout` (no-op when `mainConfig.auth === "disabled"`) and computes a ' +
            "`redirect` URL adapted to the configured provider: " +
            "Keycloak → `<authServerURL>/realms/<realm>/protocol/openid-connect/logout?redirect_uri=<souslesensUrl>`, " +
            "Auth0 → `https://<domain>/oidc/logout`, " +
            "local/database → `/login`. " +
            "Throws if `mainConfig.auth` is set to an unknown value.",
        operationId: "authLogout",
        parameters: [],
        responses: {
            200: {
                description: "Provider-specific redirect URL.",
                schema: { $ref: "#/definitions/AuthLogout" },
                examples: {
                    "application/json": { redirect: "/login" },
                },
            },
            500: { description: "Logout failure." },
        },
        tags: ["Authentication"],
    };

    return operations;
}
