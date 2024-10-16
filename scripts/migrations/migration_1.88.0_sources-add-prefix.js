const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const sourcesFilePath = path.resolve(argv.config, "sources.json");
const sources = JSON.parse(fs.readFileSync(sourcesFilePath, { encoding: "utf-8" }));

const kebabCase = (str) =>
    str
        .toLowerCase()
        .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
        .join("-");

Object.entries(sources).forEach(([id, source]) => {
    if (!source.prefix) {
        source.prefix = kebabCase(id);
    }
});

if (argv.w) {
    // backup
    fs.cpSync(sourcesFilePath, path.resolve(argv.config, `sources_${Date.now()}_backup.json`));
    fs.writeFileSync(sourcesFilePath, JSON.stringify(sources, null, 2));
} else {
    console.log(sources);
}
