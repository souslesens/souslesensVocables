const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const sourcesFilePath = path.resolve(configPath + "/sources.json");

const allowedControllers = ["Sparql_SKOS", "Sparql_OWL"];

fs.readFile(sourcesFilePath, (_err, sourcesRawData) => {
    const sourcesData = JSON.parse(sourcesRawData);
    const newSourcesData = Object.fromEntries(
        Object.entries(sourcesData).map(([sourceName, source]) => {
            if (allowedControllers.indexOf(source.controller) === -1) {
                console.log(`controller ${source.controller} is not allowed. Replacing with Sparql_OWL`);
                source.controller = "Sparql_OWL";
            }
            return [sourceName, source];
        })
    );
    if (argv.w) {
        // create a backup file
        const sourcesBackupFilePath = path.resolve(configPath + "/sources.json.bak");
        fs.cpSync(sourcesFilePath, sourcesBackupFilePath);
        fs.writeFileSync(sourcesFilePath, JSON.stringify(newSourcesData, null, 2));
    } else {
        console.log(newSourcesData);
    }
});
