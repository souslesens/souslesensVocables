const fs = require("fs");
const yargs = require("yargs");
const path = require("path");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configFilePath = path.resolve(argv.config + "/mainConfig.json");

fs.readFile(configFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    if (!data.hasOwnProperty("theme")) {
        data.theme = { selector: true, defaultTheme: "Sea Breeze" };
    }

    if (argv.w) {
        fs.writeFileSync(configFilePath, JSON.stringify(data, null, 2));
    } else {
        console.log(data);
    }
});
