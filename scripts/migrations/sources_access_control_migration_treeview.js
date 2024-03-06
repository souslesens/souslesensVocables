const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const profilesFilePath = path.resolve(configPath + "/profiles.json");
const sourcesFilePath = path.resolve(configPath + "/sources.json");

fs.readFile(sourcesFilePath, (_err, sourcesRawData) => {
    const sourcesData = JSON.parse(sourcesRawData);
    fs.readFile(profilesFilePath, (_err, profilesRawData) => {
        const profilesData = JSON.parse(profilesRawData);
        const profilesListData = Object.entries(profilesData);

        const newProfilesListData = profilesListData.map(([profileName, profile]) => {
            if (!profile.defaultSourceAccessControl) {
                console.log("File is allready migrated!");
                process.exit();
            }
            const sourcesAccessControl = profile.sourcesAccessControl;
            const newSourcesAccessControl = Object.fromEntries(
                Object.entries(sourcesAccessControl)
                    .map(([sourceName, accessControl]) => {
                        const source = sourcesData[sourceName];
                        if (source) {
                            const sourceGroup = source.hasOwnProperty("group") ? source.group : "NONE";
                            const newAccessControl = sourceGroup + "/" + sourceName;
                            return [newAccessControl, accessControl];
                        }
                        return [null, null];
                    })
                    .filter(([sourceName, accessControl]) => {
                        if (sourceName) {
                            return [sourceName, accessControl];
                        }
                    })
            );
            profile.sourcesAccessControl = newSourcesAccessControl;
            delete profile.defaultSourceAccessControl;

            return [profileName, profile];
        });

        const newProfilesData = Object.fromEntries(newProfilesListData);

        if (argv.w) {
            // create a backup file
            const profilesBackupFilePath = path.resolve(configPath + "/profiles.json.bak");
            fs.cpSync(profilesFilePath, profilesBackupFilePath);
            fs.writeFileSync(profilesFilePath, JSON.stringify(newProfilesData, null, 2));
        } else {
            console.log(newProfilesData);
        }
    });
});
