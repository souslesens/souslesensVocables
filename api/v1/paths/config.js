const path = require("path");
const { config } = require(path.resolve("model/config"));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const { user, password, ...sparql_server } = config.sparql_server;
        const result = {
            auth: config.auth,
            default_lang: config.default_lang,
            sparql_server: sparql_server,
            formalOntologySourceLabel: config.formalOntologySourceLabel,
            wiki: config.wiki,
            version: process.env.npm_package_version,
            sentryDsnJsFront: config.sentryDsnJsFront,
            tools_available: config.tools_available,
            slsApi: config.slsApi,
        };

        res.status(200).json(result);
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Returns serveur configuration",
        operationId: "Config",
        parameters: [],
        responses: {
            200: {
                description: "Welcome message",
                schema: {
                    items: {
                        $ref: "#/definitions/Config",
                    },
                },
            },
        },
    };

    return operations;
};
