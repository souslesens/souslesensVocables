import fs from "fs";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
    .alias("c", "config")
    .describe("c", "Path to config directory")
    .demandOption(["c"])
    .alias("w", "write")
    .describe("w", "Write to the file")
    .boolean("w")
    .help().argv;

console.info("Add the baseUri attribute to each sources");
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

console.info("Replace the logDir option in the mainConfig");
const mainConfigFilePath = path.resolve(argv.config, "mainConfig.json");
const mainConfig = JSON.parse(fs.readFileSync(mainConfigFilePath, { encoding: "utf-8" }));

if (mainConfig.logs === undefined) {
    mainConfig.logs = {
        directory: mainConfig.logDir,
        useFileLogger: true,
        useSymlink: true,
    };
}

delete mainConfig.logDir;

if (argv.w) {
    fs.writeFileSync(mainConfigFilePath, JSON.stringify(mainConfig, null, 2));
} else {
    console.log(mainConfig);
}
