const fs = require("fs");
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
        auth: z.enum(["local", "database", "disabled", "keycloak", "auth0"]),
        cookieSameSite: z.string(),
        cookieSecure: z.boolean(),
        cookieSecureTrustProxy: z.boolean(),
        cookieMaxAge: z.number().positive(),
        defaultGroups: z.array(z.string()),
        logs: z.object({
            directory: z.string(),
            useFileLogger: z.boolean(),
            useSymlink: z.boolean(),
        }),
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
                usernameMapping: z.enum(["email", "nickname", "name"]),
            })
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
                enabled: z.boolean(),
                url: z.string().url().optional(),
            })
            .strict(),
        slsPyApi: z
            .object({
                enabled: z.boolean(),
                url: z.string().url().optional(),
            })
            .strict(),
        database: z
            .object({
                user: z.string(),
                password: z.string(),
                host: z.string(),
                database: z.string(),
                port: z.number().positive().max(65535),
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
        userData: z
            .object({
                location: z.enum(["database", "file"]),
                maximumFileSize: z.number().positive(),
            })
            .strict(),
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
        } else if (values.length > 0) {
            cleanedErrors["root"] = values[0];
        }
    });

    return cleanedErrors;
};

const colorText = (text, color = "31;1") => `\x1b[${color}m${text}\x1b[0m`;

const printErrorReport = (errors, section, logs = []) => {
    Object.entries(errors).forEach(([key, data]) => {
        if (typeof data !== "string") {
            logs = printErrorReport(data, key, logs);
        } else {
            const option = section === null ? key : `${section}.${key}`;
            if (data === "Required") {
                logs.push(`⛔ The option ${colorText(option)} is missing`);
            } else if (data.startsWith("Unrecognized key")) {
                const keys = data.split(": ")[1];
                if (option === "root") {
                    logs.push(`❓ Unknown key(s): ${keys}`);
                } else {
                    logs.push(`❓ Unknown key(s) for the option ${colorText(option)}: ${keys}`);
                }
            } else {
                logs.push(`❌ Wrong value for the option ${colorText(option)}: ${data}`);
            }
        }
    });

    return logs;
};

const checkMainConfig = (config) => {
    console.debug("Check the mainConfig.json file…");

    const results = MainConfigObject.safeParse(config);
    if (!results.success) {
        const errors = checkMainConfigSection(results.error.format(), {});
        console.error("The configuration file is invalid:");
        const logs = printErrorReport(errors, null);
        logs.forEach((log) => console.error(log));
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
    MainConfigObject,
    checkMainConfig,
    checkMainConfigSection,
    colorText,
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
    printErrorReport,
    readMainConfig,
};
