const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const mainconfigFilePath = path.resolve(argv.config, "mainConfig.json");
const mainconfig = JSON.parse(fs.readFileSync(mainconfigFilePath, { encoding: "utf-8" }));

const availableTools = mainconfig.tools_available;

const profilesFilePath = path.resolve(argv.config, "profiles.json");
const profiles = JSON.parse(fs.readFileSync(profilesFilePath, { encoding: "utf-8" }));

Object.entries(profiles).forEach(([key, profile]) => {
    if (profile.forbiddenTools !== undefined) {
        if (profile.allowedTools == "ALL") {
            profile.allowedTools = availableTools.filter((tool) => !profile.forbiddenTools.includes(tool));
        } else {
            // Avoid to keep forbidden tools which are in the allowed section
            profile.allowedTools = profile.allowedTools.filter((tool) => !profile.forbiddenTools.includes(tool));
        }

        delete profile.forbiddenTools;
    }
});

if (argv.w) {
    // backup
    fs.cpSync(profilesFilePath, path.resolve(argv.config, `profiles_${Date.now()}_backup.json`));
    fs.writeFileSync(profilesFilePath, JSON.stringify(profiles, null, 2));
} else {
    console.log(profiles);
}
