import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const sourceCreationColumns = ["create_source", "maximum_source"];

const migrateProfiles = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const missingColumns = [];
    for (const column of sourceCreationColumns) {
        if (!(await connection.schema.hasColumn("profiles", column))) {
            missingColumns.push(column);
        }
    }

    if (missingColumns.length === 0) {
        console.info("The table is already up to date");
        connection.destroy();
        return;
    }

    if (writeMode) {
        await connection.schema.alterTable("profiles", function (table) {
            if (missingColumns.includes("create_source")) {
                table.boolean("create_source");
            }
            if (missingColumns.includes("maximum_source")) {
                table.integer("maximum_source");
            }
        });
        console.info(`The migration is done`);
    } else {
        console.info(`Will run the migration on profiles`);
    }
    connection.destroy();
};

const migrateProfilesList = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const profileListSchema = path.resolve("scripts", "sql", "011-profiles-view.sql");
    if (!(await connection.schema.hasColumn("profiles_list", "create_source"))) {
        if (writeMode) {
            /* Remove the view since the library cannot do it on his own */
            await connection.schema.dropViewIfExists("profiles_list");
            /* Read the schema again to add the view again with the latest
             * modification */
            await connection.raw(fs.readFileSync(profileListSchema, "utf-8"));
            console.info(`The script ${profileListSchema} have beed executed`);
        } else {
            console.info(`Will run the migration on profiles`);
        }
    } else {
        console.info("The table is already up to date");
    }
    connection.destroy();
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
    await migrateProfilesList(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
