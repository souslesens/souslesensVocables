const fs = require("fs");
const yargs = require("yargs");
const path = require("path");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const sourcesFilePath = path.resolve(argv.config + "/sources.json");

fs.readFile(sourcesFilePath, (_err, rawData) => {
    const data = JSON.parse(rawData);
    const lData = Object.entries(data);
    const lNewData = lData.map(([id, source]) => {
        if (!source.hasOwnProperty("owner")) {
            source.owner = "admin";
        }
        if (!source.hasOwnProperty("published")) {
            source.published = true;
        }
        return [id, source];
    });
    const newData = Object.fromEntries(lNewData);

    if (argv.w) {
        fs.writeFileSync(sourcesFilePath, JSON.stringify(newData, null, 2));
    } else {
        console.log(newData);
    }
});
