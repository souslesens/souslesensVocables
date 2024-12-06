const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const mainConfigFilePath = path.resolve(configPath + "/mainConfig.json");

const mainConfigRawData = fs.readFileSync(mainConfigFilePath);
const mainConfigData = JSON.parse(mainConfigRawData);
let alreadyMigrated = true;
const newMainConfigData = Object.fromEntries(
    Object.entries(mainConfigData).map(([key, value]) => {
        if (key === "slsApi") {
            alreadyMigrated = false;
            return ["slsPyApi", value];
        }
        return [key, value];
    })
);

if (argv.w) {
    if (!alreadyMigrated) {
        fs.writeFileSync(mainConfigFilePath, JSON.stringify(newMainConfigData, null, 2));
    }
} else {
    console.log(newMainConfigData);
}
