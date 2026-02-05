/* Add the userData section to the mainConfig.json */

const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const main = async () => {
    const argv = yargs
        .alias("c", "config")
        .describe("c", "Path to the config directory")
        .alias("w", "write")
        .describe("w", "Write the migration in the file")
        .boolean("w")
        .demandOption(["config"])
        .help().argv;

    console.info(argv.write ? "🚧 Prepare the migration…" : "🔧 Dry run mode…");
    const configPath = path.resolve(argv.config, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    if (configJSON.sparqlDownloadLimit === undefined) {
        configJSON.sparqlDownloadLimit = 10000;

        if (argv.write) {
            console.info(" ✅ The mainConfig.json was updated");
            fs.writeFileSync(configPath, JSON.stringify(configJSON, null, 2));
        } else {
            console.debug(" ! The mainConfig.json will be updated");
        }
    } else {
        console.info(" 👍 Nothing to do");
    }
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
