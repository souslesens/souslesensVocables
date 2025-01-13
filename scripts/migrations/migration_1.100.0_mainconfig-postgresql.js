const bcrypt = require("bcrypt");
const crypto = require("crypto");
const fs = require("fs");
const knex = require("knex");
const path = require("path");
const yargs = require("yargs");

const migrateConfig = (configDirectory, writeMode) => {
    console.info(" - Main configuration");
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    let modification = false;
    if (configJSON.database === undefined) {
        configJSON.database = {
            host: "localhost",
            port: 5432,
            database: "souslesens",
            user: "souslesens",
            password: crypto.randomBytes(25).toString("hex"),
        };

        modification = true;
    }

    if (writeMode) {
        if (modification) {
            fs.writeFileSync(configPath, JSON.stringify(configJSON, null, 2));
            console.info("  ✅ mainConfig options were migrated");
        } else {
            console.info("  👍 Nothing to do");
        }
    }
};

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
    migrateConfig(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
