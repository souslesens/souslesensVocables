import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const migrateProfiles = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const connection = await knex({ client: "pg", connection: configJSON.database });
        if (!await connection.schema.hasColumn("profiles", "is_shared")) {
            if (writeMode) {
                await connection.schema.alterTable('profiles', function (table) {
                    table.boolean('is_shared').defaultTo(true);
                })
                console.info(`The migration is done`);
            } else {
                console.info(`Will run the migration on profiles`);
            }
        } else {
            console.info("The table is already up to date");
        }
        connection.destroy();
};

const migrateProfileListView = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const profileListSchema = path.resolve("scripts", "sql", "011-profiles-view.sql");
    if (fs.existsSync(profileListSchema)) {
        const connection = await knex({ client: "pg", connection: configJSON.database });
        if (!await connection.schema.hasColumn("profiles_list", "is_shared")) {
            if (writeMode) {
                /* Remove the view since the library cannot do it on his own */
                await connection.schema.dropViewIfExists("profiles_list");
                /* Read the schema again to add the view again with the latest
                 * modification */
                await connection.raw(fs.readFileSync(profileListSchema, "utf-8"));
                connection.destroy();
                console.info(`The script ${profileListSchema} have beed executed`);
            } else {
                console.info(`Will run the script ${profileListSchema}`);
            }
        } else {
            console.info("The view is already up to date");
        }
    }
};

const main = async () => {
    const argv = yargs(hideBin(process.argv))
        .alias("c", "config")
        .describe("c", "Path to the config directory")
        .alias("w", "write")
        .describe("w", "Write the migration in the file")
        .boolean("w")
        .demandOption(["config"])
        .help().argv;

    console.info(argv.write ? "🚧 Prepare the migration…" : "🔧 Dry run mode…");
    await migrateProfiles(argv.config, argv.write);
    await migrateProfileListView(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
