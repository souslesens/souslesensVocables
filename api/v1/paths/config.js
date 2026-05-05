import { mainConfigModel } from "../../../model/mainConfig.js";

export default function () {
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
            sparqlDownloadLimit: config.sparqlDownloadLimit,
            generalQuota: config.generalQuota || {},
        };

        res.status(200).json(result);
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Return the public server configuration",
        description:
            "Returns the subset of `mainConfig` safe to expose to logged-in users (auth mode, default language, " +
            "available tools, theme, version, SPARQL download limit, general quota, ...). Credentials of " +
            "`sparql_server` (`user`, `password`) are stripped before returning.",
        operationId: "configGet",
        parameters: [],
        responses: {
            200: {
                description: "Public server configuration.",
                schema: { $ref: "#/definitions/Config" },
                examples: {
                    "application/json": {
                        auth: "disabled",
                        defaultGroups: ["admin"],
                        default_lang: "en",
                        sparql_server: { url: "http://localhost:8890/sparql" },
                        formalOntologySourceLabel: "IDO-3",
                        wiki: { url: "https://wiki.example.com" },
                        sentryDsnJsFront: "",
                        tools_available: ["lineage", "KGquery", "admin"],
                        slsPyApi: { enabled: false, url: "http://localhost:8000" },
                        theme: { defaultTheme: "default", selector: true },
                        sparqlDownloadLimit: 10000,
                        generalQuota: {},
                    },
                },
            },
        },
        tags: ["Config"],
    };

    async function PUT(req, res, next) {
        try {
            const { defaultGroups, tools_available, theme, generalQuota } = req.body;
            const initialConfig = await mainConfigModel.getConfig();
            await mainConfigModel.writeConfig({ ...initialConfig, defaultGroups, tools_available, theme, generalQuota: generalQuota || {} });
            const newConfig = await mainConfigModel.getConfig({ ...initialConfig, defaultGroups, tools_available, theme, generalQuota: generalQuota || {} });
            res.status(200).json(newConfig);
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }

    PUT.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Update the writeable subset of the server configuration (admin)",
        description:
            "Admin-only. Updates `defaultGroups`, `tools_available`, `theme` and `generalQuota` in `mainConfig.json`. " +
            "All other fields are preserved. Returns the new full configuration.",
        operationId: "configPut",
        parameters: [
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        defaultGroups: { type: "array", items: { type: "string" }, example: ["admin"] },
                        tools_available: { type: "array", items: { type: "string" }, example: ["lineage", "KGquery", "MappingModeler", "admin"] },
                        theme: {
                            type: "object",
                            properties: {
                                defaultTheme: { type: "string", example: "default" },
                                selector: { type: "boolean", example: true },
                            },
                            example: { defaultTheme: "default", selector: true },
                        },
                        generalQuota: { type: "object", example: {} },
                    },
                    example: {
                        defaultGroups: ["admin"],
                        tools_available: ["lineage", "KGquery", "MappingModeler", "admin"],
                        theme: { defaultTheme: "default", selector: true },
                        generalQuota: {},
                    },
                },
            },
        ],
        responses: {
            200: { description: "Updated configuration.", schema: { $ref: "#/definitions/Config" } },
            500: { description: "Persistence error." },
        },
        tags: ["Config"],
    };

    return operations;
}
