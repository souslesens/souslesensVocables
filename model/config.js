const fs = require("fs");
const path = require("path");
const z = require("zod");

const configPath = process.env.CONFIG_PATH || "config";
const mainConfigPath = `${configPath}/mainConfig.json`;
const configUsersPath = `${configPath}/users/users.json`;
const configSourcesPath = `${configPath}/sources.json`;
const configProfilesPath = `${configPath}/profiles.json`;
const configDatabasesPath = `${configPath}/databases.json`;
const configPlugins = `${configPath}/pluginsConfig.json`;

const MainConfigObject = z.object({
    souslesensUrl: z.string().url(),
    souslesensUrlForVirtuoso: z.string().url(),
    listenPort: z.number().positive().max(65535),
    serverUrl: z.string(),
    theme: z.object({
        selector: z.boolean(),
        defaultTheme: z.string(),
    }),
    auth: z.enum(["local", "disabled", "keycloak"]),
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
    keycloak: z.object({
        realm: z.string(),
        publicClient: z.boolean(),
        clientID: z.string(),
        clientSecret: z.string(),
        authServerURL: z.string().url(),
    }),
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
    }),
    jowlServer: z.object({
        url: z.string().url(),
    }),
    slsApi: z.object({
        url: z.string().url(),
    }),
    logger: z.object({
        errorsLogPath: z.string(),
        usersLogPath: z.string(),
    }),
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
                console.error(`!! ${key}: ${data._errors}`);
            }
        });

        return false;
    }

    console.info("The configuration file is valid.");
    return true;
}

const readMainConfig = () => {
    return JSON.parse(fs.readFileSync(`${configPath}/mainConfig.json`).toString());;
};
const config = readMainConfig();

module.exports = { configPath, checkMainConfig, mainConfigPath, configUsersPath, configSourcesPath, configProfilesPath, configDatabasesPath, configPlugins, readMainConfig, config };
