const fs = require("fs");
const path = require("path");
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

const readMainConfig = () => {
    return JSON.parse(fs.readFileSync(`${configPath}/mainConfig.json`).toString());
};
const config = readMainConfig();

module.exports = {
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
