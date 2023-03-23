const path = require("path");
//const configPath = process.env.CONFIG_PATH || "config";
const configPath = process.env.CONFIG_PATH || path.join(__dirname, "config").replace("\\model", ""); // correction CF
const configUsersPath = `${configPath}/users/users.json`;
const config = require(path.resolve(`${configPath}/mainConfig.json`));

module.exports = { configPath, configUsersPath, config };
