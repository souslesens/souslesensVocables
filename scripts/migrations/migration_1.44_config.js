const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const profilesFilePath = path.resolve(configPath + "/profiles.json");
const mainConfigFilePath = path.resolve(configPath + "/mainConfig.json");
// const sourcesFilePath = path.resolve(configPath + "/sources.json");

const profilesRawData = fs.readFileSync(profilesFilePath);
const profilesData = JSON.parse(profilesRawData);
const newProfilesData = Object.fromEntries(
    Object.entries(profilesData).map(([profileName, profile]) => {
        const { blender, ...newProfile } = profile;
        return [profileName, newProfile];
    })
);

const mainConfigRawData = fs.readFileSync(mainConfigFilePath);
const mainConfigData = JSON.parse(mainConfigRawData);
const newMainConfigData = Object.fromEntries(
    Object.entries(mainConfigData).filter(([key, value]) => {
        if (key != "default_sparql_url") {
            return [key, value];
        }
    })
);

if (argv.w) {
    // create backup files
    const profilesBackupFilePath = path.resolve(configPath + "/profiles.json.bak");
    fs.cpSync(profilesFilePath, profilesBackupFilePath);
    fs.writeFileSync(profilesFilePath, JSON.stringify(newProfilesData, null, 2));

    const mainConfigBackupFilePath = path.resolve(configPath + "/mainConfig.json.bak");
    fs.cpSync(mainConfigFilePath, mainConfigBackupFilePath);
    fs.writeFileSync(mainConfigFilePath, JSON.stringify(newMainConfigData, null, 2));
} else {
    console.log("---------- profiles.json ----------");
    console.log(newProfilesData);
    console.log("---------- mainConfig.json ----------");
    console.log(newMainConfigData);
}
