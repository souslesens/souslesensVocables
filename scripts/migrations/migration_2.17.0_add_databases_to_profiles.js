const fs = require("fs");
const knex = require("knex");
const path = require("path");
const yargs = require("yargs");

const migrateProfiles = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const connection = knex({ client: "pg", connection: configJSON.database });

    if (!(await connection.schema.hasColumn("profiles", "allowed_databases"))) {
        if (writeMode) {
            await connection.schema.alterTable("profiles", (table) => {
                table.specificType("allowed_databases", "text[]");
            });
            // drop and recreate view since the lib cannot update it
            const profilesListViewPath = path.resolve("scripts", "sql", "011-profiles-view.sql");
            await connection.schema.dropViewIfExists("profiles_list");
            await connection.raw(fs.readFileSync(profilesListViewPath, "utf-8"));

            console.info(`The migration is done`);
        } else {
            console.info("Will run the migration on profiles");
        }
    }

    connection.destroy();
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
    await migrateProfiles(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
