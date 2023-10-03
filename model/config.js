const YAML = require("yaml");
const fs = require("fs");

const configPath = process.env.CONFIG_PATH || "config";
const configMainPath = `${configPath}/mainConfig.yml`;
const configUsersPath = `${configPath}/users/users.json`;
const configSourcesPath = `${configPath}/sources.json`;
const configProfilesPath = `${configPath}/profiles.json`;

const yamlConfig = fs.readFileSync(configMainPath, "utf8");
const config = YAML.parse(yamlConfig);

module.exports = { configPath, configUsersPath, configSourcesPath, configProfilesPath, config };
