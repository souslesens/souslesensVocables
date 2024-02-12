const path = require("path");
const configPath = process.env.CONFIG_PATH || "config";
const configUsersPath = `${configPath}/users/users.json`;
const configSourcesPath = `${configPath}/sources.json`;
const configProfilesPath = `${configPath}/profiles.json`;
const configDatabasesPath = `${configPath}/databases.json`;
const config = require(path.resolve(`${configPath}/mainConfig.json`));

module.exports = { configPath, configUsersPath, configSourcesPath, configProfilesPath, configDatabasesPath, config };
