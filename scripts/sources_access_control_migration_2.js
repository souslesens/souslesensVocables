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
            const sourcesAccessControl = profile.sourcesAccessControl;
            const newSourcesAccessControl = Object.fromEntries(
                Object.entries(sourcesAccessControl).map(([sourceName, accessControl]) => {
                    const source = sourcesData[sourceName];
                    const sourceGroup = source.group;
                    const sourceSchemaType = source.schemaType;
                    const newAccessControl = sourceSchemaType + "/" + sourceGroup + "/" + sourceName;
                    return [newAccessControl, accessControl];
                })
            );
            profile.sourcesAccessControl = newSourcesAccessControl;
            return [profileName, profile];
        });

        const newProfilesData = Object.fromEntries(newProfilesListData);

        if (argv.w) {
            fs.writeFileSync(profilesFilePath, JSON.stringify(newProfilesData, null, 2));
        } else {
            console.log(newProfilesData);
        }
    });
});
