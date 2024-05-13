const fs = require("fs");
const yargs = require("yargs");
const path = require("path");
const ULID = require("ulid");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const pluginsFilePath = path.resolve(argv.config, "pluginsConfig.json");

// return if file is already migrated
if (fs.existsSync(pluginsFilePath)) {
    return 0;
}

if (argv.w) {
    fs.writeFileSync(pluginsFilePath, JSON.stringify({}, null, 2));
} else {
    console.log("{}");
}
