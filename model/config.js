const path = require("path");
const configPath = process.env.CONFIG_PATH || "config";
const mainConfigPath = `${configPath}/mainConfig.json`;
const configUsersPath = `${configPath}/users/users.json`;
const configSourcesPath = `${configPath}/sources.json`;
const configProfilesPath = `${configPath}/profiles.json`;
const configDatabasesPath = `${configPath}/databases.json`;
const configPlugins = `${configPath}/pluginsConfig.json`;
const config = require(path.resolve(`${configPath}/mainConfig.json`));

module.exports = { configPath, mainConfigPath, configUsersPath, configSourcesPath, configProfilesPath, configDatabasesPath, configPlugins, config };
