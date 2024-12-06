const { mainConfigModel } = require("../../../model/mainConfig");
const { userModel } = require("../../../model/users");
const userManager = require("../../../bin/user.");

module.exports = function () {
    let operations = {
        GET,
        PUT,
    };

    async function GET(_req, res, _next) {
        const config = await mainConfigModel.getConfig();

        const { user, password, ...sparql_server } = config.sparql_server;
        const result = {
            auth: config.auth,
            defaultGroups: config.defaultGroups,
            default_lang: config.default_lang,
            sparql_server: sparql_server,
            formalOntologySourceLabel: config.formalOntologySourceLabel,
            wiki: config.wiki,
            version: process.env.npm_package_version,
            sentryDsnJsFront: config.sentryDsnJsFront,
            tools_available: config.tools_available,
            slsPyApi: config.slsPyApi,
            theme: config.theme,
        };

        res.status(200).json(result);
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Returns serveur configuration",
        operationId: "config.get",
        parameters: [],
        responses: {
            200: {
                description: "JSON serialization of server configuration",
                schema: {
                    items: {
                        $ref: "#/definitions/Config",
                    },
                },
            },
        },
    };

    async function PUT(req, res, next) {
        try {
            const { defaultGroups, tools_available, theme } = req.body;
            const initialConfig = await mainConfigModel.getConfig();
            await mainConfigModel.writeConfig({ ...initialConfig, defaultGroups, tools_available, theme });
            const newConfig = await mainConfigModel.getConfig({ ...initialConfig, defaultGroups, tools_available, theme });
            res.status(200).json(newConfig);
        } catch (error) {
            next(error);
        }
    }

    PUT.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Returns serveur configuration",
        operationId: "config.put",
        responses: {
            200: {
                description: "JSON serialization of server configuration",
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
