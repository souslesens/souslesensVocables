const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const sourcesFilePath = path.resolve(argv.config, "sources.json");
const sources = JSON.parse(fs.readFileSync(sourcesFilePath, { encoding: "utf-8" }));

Object.entries(sources).forEach(([id, source]) => {
    if (!source.baseUri) {
        source.baseUri = source.graphUri;
    }
});

if (argv.w) {
    // backup
    fs.cpSync(sourcesFilePath, path.resolve(argv.config, `sources_${Date.now()}_backup.json`));
    fs.writeFileSync(sourcesFilePath, JSON.stringify(sources, null, 2));
} else {
    console.log(sources);
}
