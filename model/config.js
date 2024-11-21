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

const MainConfigObject = z
    .object({
        souslesensUrl: z.string().url(),
        souslesensUrlForVirtuoso: z.string().url(),
        listenPort: z.number().positive().max(65535),
        serverUrl: z.string(),
        theme: z
            .object({
                selector: z.boolean(),
                defaultTheme: z.string(),
            })
            .strict(),
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
                api: z
                    .object({
                        clientID: z.string(),
                        clientSecret: z.string(),
                    })
                    .strict(),
            })
            .deepPartial()
            .strict()
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
            .strict()
            .optional(),
        health_enabled_services: z.array(z.string()),
        sparql_server: z
            .object({
                url: z.string().url(),
                user: z.string(),
                password: z.string(),
            })
            .strict(),
        ElasticSearch: z
            .object({
                url: z.string().url(),
                user: z.string(),
                password: z.string(),
                skipSslVerify: z.boolean(),
                other_servers: z.array(z.string()),
                searchChunkSize: z.number().positive(),
            })
            .strict(),
        jowlServer: z
            .object({
                url: z.string().url(),
            })
            .strict()
            .optional(),
        slsApi: z
            .object({
                url: z.string().url(),
            })
            .strict()
            .optional(),
        authenticationDatabase: z
            .object({
                user: z.string(),
                password: z.string(),
                host: z.string(),
                database: z.string(),
                port: z.number().positive().max(65535),
                table: z.string(),
                loginColumn: z.string(),
                passwordColumn: z.string(),
                groupsColumn: z.string(),
            })
            .strict(),
        annotator: z
            .object({
                tikaServerUrl: z.string().url(),
                spacyServerUrl: z.string().url(),
                parsedDocumentsHomeDir: z.string().nullable(),
                uploadDirPath: z.string().nullable(),
            })
            .strict()
            .optional(),
        wiki: z
            .object({
                url: z.string().url(),
            })
            .strict()
            .optional(),
    })
    .strict();

// Recursive function used to manage sub-sections of the config
const checkMainConfigSection = (errors, cleanedErrors) => {
    Object.entries(errors).map(([key, values]) => {
        if (key !== "_errors") {
            if (values._errors.length === 0) {
                cleanedErrors[key] = checkMainConfigSection(values, cleanedErrors[key] || {});
            } else {
                cleanedErrors[key] = values._errors[0];
            }
        } else {
            cleanedErrors["root"] = values[0];
        }
    });

    return cleanedErrors;
};

const colorText = (text, color = "31;1") => `\x1b[${color}m${text}\x1b[0m`;

const printErrorReport = (errors, section) => {
    Object.entries(errors).forEach(([key, data]) => {
        if (typeof data !== "string") {
            printErrorReport(data, key);
        } else {
            const option = section === null ? key : `${section}.${key}`;
            if (data === "Required") {
                console.error(`⛔ The option ${colorText(option)} is missing`);
            } else if (data.startsWith("Unrecognized key")) {
                const keys = data.split(": ")[1];
                if (option === "root") {
                    console.error(`❓ Unknown key(s): ${keys}`);
                } else {
                    console.error(`❓ Unknown key(s) for the option ${colorText(option)}: ${keys}`);
                }
            } else {
                console.error(`❌ Wrong value for the option ${colorText(option)}: ${data}`);
            }
        }
    });
};

const checkMainConfig = (config) => {
    console.debug("Check the mainConfig.json file…");

    const results = MainConfigObject.safeParse(config);
    if (!results.success) {
        const errors = checkMainConfigSection(results.error.format(), {});
        console.error("The configuration file is invalid:");
        printErrorReport(errors, null);
        return false;
    }

    console.info("The configuration file is valid.");
    return true;
};

const readMainConfig = (path = mainConfigPath) => {
    return JSON.parse(fs.readFileSync(path).toString());
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
