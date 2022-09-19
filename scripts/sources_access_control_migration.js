const fs = require("fs");
const yargs = require("yargs");

const argv = yargs.alias("f", "file").describe("f", "Path to profile file").demandOption(["f"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const profileFilePath = argv.file;

fs.readFile(profileFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const aData = Object.entries(data);
    const newData = aData.map(([_k, profile]) => {
        if (!profile.allowedSources && profile.sourcesAccessControl) {
            console.log("File is allready migrated!");
            process.exit();
        }
        const defaultSourceAccessControl = profile.allowedSources === "ALL" ? "read" : "forbidden";

        const sourcesAccessControlRead =
            profile.allowedSources != "ALL"
                ? profile.allowedSources.map((source) => {
                      return [source, "read"];
                  })
                : [];

        const sourcesAccessControlForbidden =
            profile.forbiddenSources != "ALL"
                ? profile.forbiddenSources.map((source) => {
                      return [source, "forbidden"];
                  })
                : [];

        const sourcesAccessControl = sourcesAccessControlRead.concat(sourcesAccessControlForbidden);

        profile.defaultSourceAccessControl = defaultSourceAccessControl;
        profile.sourcesAccessControl = Object.fromEntries(sourcesAccessControl);

        delete profile.allowedSources;
        delete profile.forbiddenSources;

        return profile;
    });

    if (argv.w) {
        fs.writeFileSync(profileFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});
