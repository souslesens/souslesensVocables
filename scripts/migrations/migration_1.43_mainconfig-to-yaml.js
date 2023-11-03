const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const YAML = require("yaml");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const mainConfigFilePath = path.resolve(configPath + "/mainConfig.json");
const mainConfigYamlFilePath = path.resolve(configPath + "/mainConfig.yml");

if (fs.existsSync(mainConfigYamlFilePath)) {
    console.log("YAML file already exists");
    return;
}

try {
    const mainConfig = JSON.parse(fs.readFileSync(mainConfigFilePath));
} catch {
    console.log("No mainConfig.json found");
    return;
}

if (argv.w) {
    fs.writeFileSync(mainConfigYamlFilePath, YAML.stringify(mainConfig));
    // fs.unlinkSync(mainConfigFilePath);
} else {
    console.log(YAML.stringify(mainConfig));
}
