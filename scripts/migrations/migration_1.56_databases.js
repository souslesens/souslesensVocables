const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs
      .alias("c", "config")
      .describe("c", "Path to config directory")
      .demandOption(["c"])
      .alias("w", "write")
      .describe("w", "Write to the file")
      .boolean("w").help().argv;

const mainconfigFilePath = path.resolve(argv.config, "mainConfig.json");
const profilesFilePath = path.resolve(argv.config, "profiles.json");

const mainConfig = JSON.parse(
    fs.readFileSync(mainconfigFilePath, { encoding: "utf-8" })
);

let profiles;
try {
    profiles = JSON.parse(
        fs.readFileSync(profilesFilePath, { encoding: "utf-8" })
    );
} catch {
    profiles = {};
}

// Add the default theme when the attribute is missing
const newProfiles = Object.entries(profiles).map(([key, profile]) => {
    if (!profile.theme) {
        profile.theme = mainConfig.theme.defaultTheme;
    }
    return [profile.name, profile];
});

const data = Object.fromEntries(newProfiles);
if (argv.w) {
    fs.writeFileSync(profilesFilePath, JSON.stringify(data, null, 2));
} else {
    console.log(data);
}
