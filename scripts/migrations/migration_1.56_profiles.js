const fs = require("fs");
const yargs = require("yargs");
const path = require("path");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const profilesFilePath = path.resolve(argv.config + "/profiles.json");
const mainConfigFilePath = path.resolve(argv.config + "/mainConfig.json");

// get default theme
const rawConfig = fs.readFileSync(mainConfigFilePath);
const config = JSON.parse(rawConfig);
const defaultTheme = config.theme.defaultTheme;

// set default theme if theme is not in profiles
fs.readFile(profilesFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const newData = Object.fromEntries(
        Object.entries(data).map(([profileName, profile]) => {
            if (!profile.hasOwnProperty("theme")) {
                profile.theme = defaultTheme;
            }
            return [profileName, profile];
        })
    );
    if (argv.w) {
        fs.writeFileSync(profilesFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});
