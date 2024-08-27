const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const pluginsFilePath = path.resolve(configPath + "/plugins.json");

if (!fs.existsSync(pluginsFilePath)) {
    if (argv.w) {
        fs.writeFileSync(pluginsFilePath, JSON.stringify({}, null, 2));
    } else {
        console.log("{}");
    }
}
