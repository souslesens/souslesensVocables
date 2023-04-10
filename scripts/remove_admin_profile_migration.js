const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const profilesFilePath = path.resolve(configPath + "/profiles.json");

fs.readFile(profilesFilePath, (_err, profilesRawData) => {
    const profilesData = JSON.parse(profilesRawData);
    const newProfilesData = Object.fromEntries(
        Object.entries(profilesData).filter(([profileName, profile]) => {
            return profileName !== "admin" || profile.name !== "admin";
        })
    );

    if (argv.w) {
        // create a backup file
        const profilesBackupFilePath = path.resolve(configPath + "/profiles.json.bak");
        fs.cpSync(profilesFilePath, profilesBackupFilePath);
        fs.writeFileSync(profilesFilePath, JSON.stringify(newProfilesData, null, 2));
    } else {
        console.log(newProfilesData);
    }
});
