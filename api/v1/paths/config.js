const path = require("path");
const { config } = require(path.resolve("model/config"));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const result = {
            auth: config.auth,
            default_lang: config.default_lang,
            default_sparql_url: config.default_sparql_url,
            formalOntologySourceLabel: config.formalOntologySourceLabel,
            wiki: config.wiki,
            version: process.env.npm_package_version,
            sentryDsnJsFront: config.sentryDsnJsFront,
            tools_available: config.tools_available,
        };

        res.status(200).json(result);
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
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
