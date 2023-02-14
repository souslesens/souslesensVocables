const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("f", "file").describe("f", "Path to sources file").demandOption(["f"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const sourceFilePath = argv.file;

fs.readFile(sourceFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const aData = Object.entries(data);
    const newData = Object.fromEntries(
        aData.map(([sourceId, source]) => {
            if ("public" in source) {
                console.log("File is allready migrated!");
                process.exit();
            }
            source.public = false;
            return [sourceId, source];
        })
    );

    if (argv.w) {
        // create a backup file
        const sourcesBackupFilePath = path.resolve(`${sourceFilePath}.bak`);
        fs.cpSync(sourceFilePath, sourcesBackupFilePath);
        fs.writeFileSync(sourceFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});
