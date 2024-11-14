const fs = require("fs");
const path = require("path");
const z = require("zod");

const configPath = process.env.CONFIG_PATH || "config";
const mainConfigPath = `${configPath}/mainConfig.json`;
const configUsersPath = `${configPath}/users/users.json`;
const configSourcesPath = `${configPath}/sources.json`;
const configProfilesPath = `${configPath}/profiles.json`;
const configDatabasesPath = `${configPath}/databases.json`;
const configPluginsConfig = `${configPath}/pluginsConfig.json`;
const configPluginsRepository = `${configPath}/plugins.json`;

const directoryPlugins = process.env.PLUGINS_PATH || "plugins";
const directoryPluginsRepositories = process.env.REPOSITORIES_PATH || "plugins.available";

const MainConfigObject = z.object({
    souslesensUrl: z.string().url(),
    souslesensUrlForVirtuoso: z.string().url(),
    listenPort: z.number().positive().max(65535),
    serverUrl: z.string(),
    theme: z.object({
        selector: z.boolean(),
        defaultTheme: z.string(),
    }),
    auth: z.enum(["local", "disabled", "keycloak", "auth0"]),
    cookieSameSite: z.string(),
    cookieSecure: z.boolean(),
    cookieSecureTrustProxy: z.boolean(),
    cookieMaxAge: z.number().positive(),
    defaultGroups: z.array(z.string()),
    logDir: z.string(),
    default_lang: z.string(),
    sentryDsnNode: z.string(),
    sentryDsnJsFront: z.string(),
    formalOntologySourceLabel: z.string(),
    tools_available: z.array(z.string()),
    auth0: z
        .object({
            domain: z.string(),
            clientID: z.string(),
            clientSecret: z.string(),
            scope: z.string(),
            api: z.object({
                clientID: z.string(),
                clientSecret: z.string(),
            }),
        })
        .deepPartial()
        .optional(),
    keycloak: z
        .object({
            realm: z.string(),
            publicClient: z.boolean(),
            clientID: z.string(),
            clientSecret: z.string(),
            authServerURL: z.string().url(),
        })
        .partial()
        .optional(),
    health_enabled_services: z.array(z.string()),
    sparql_server: z.object({
        url: z.string().url(),
        user: z.string(),
        password: z.string(),
    }),
    ElasticSearch: z.object({
        url: z.string().url(),
        user: z.string(),
        password: z.string(),
        skipSslVerify: z.boolean(),
        other_servers: z.array(z.string()),
        searchChunkSize: z.number().positive(),
    }),
    jowlServer: z
        .object({
            url: z.string().url(),
        })
        .optional(),
    slsApi: z
        .object({
            url: z.string().url(),
        })
        .optional(),
    authenticationDatabase: z.object({
        user: z.string(),
        password: z.string(),
        host: z.string(),
        database: z.string(),
        table: z.string(),
        loginColumn: z.string(),
        passwordColumn: z.string(),
        groupsColumn: z.string(),
    }),
});

const checkMainConfig = (config) => {
    console.debug("Check the mainConfig.json file…");

    const results = MainConfigObject.safeParse(config);
    if (!results.success) {
        const formattedErrors = results.error.format();
        Object.entries(formattedErrors).map(([key, data]) => {
            if (key !== "_errors") {
                if (data._errors.length > 0) {
                    console.error(`!! ${key}: ${data._errors}`);
                } else {
                    console.error(`!! ${key}:`);
                    Object.entries(data).map(([name, option]) => {
                        if (name !== "_errors") {
                            console.error(`  - ${name}: ${option._errors}`);
                        }
                    });
                }
            }
        });

        return false;
    }

    console.info("The configuration file is valid.");
    return true;
};

const readMainConfig = () => {
    return JSON.parse(fs.readFileSync(`${configPath}/mainConfig.json`).toString());
};
const config = readMainConfig();

module.exports = {
    checkMainConfig,
    config,
    configDatabasesPath,
    configPath,
    configPluginsConfig,
    configPluginsRepository,
    configProfilesPath,
    configSourcesPath,
    configUsersPath,
    directoryPlugins,
    directoryPluginsRepositories,
    mainConfigPath,
    readMainConfig,
};
