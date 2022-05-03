const path = require("path");
const configPath = process.env.CONFIG_PATH || "config";
const config = require(path.resolve(configPath + "/mainConfig.json"));

module.exports = { configPath, config };
