import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const migrateProfiles = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const connection = await knex({ client: "pg", connection: configJSON.database });
    if (!(await connection.schema.hasColumn("profiles", "quota"))) {
        if (writeMode) {
            await connection.schema.alterTable("profiles", function (table) {
                table.json("quota").defaultTo({});
            });
            console.info(`The migration is done`);
        } else {
            console.info(`Will run the migration on profiles`);
        }
    } else {
        console.info("The table is already up to date");
    }
    connection.destroy();
};
const migrateProfilesList = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const profileListSchema = path.resolve("scripts", "sql", "011-profiles-view.sql");
    if (!(await connection.schema.hasColumn("profiles_list", "quota"))) {
        if (writeMode) {
            /* Remove the view since the library cannot do it on his own */
            await connection.schema.dropViewIfExists("profiles_list");
            /* Read the schema again to add the view again with the latest
             * modification */
            await connection.raw(fs.readFileSync(profileListSchema, "utf-8"));
            connection.destroy();
            console.info(`The script ${profileListSchema} have beed executed`);
        } else {
            console.info(`Will run the migration on profiles`);
        }
    } else {
        console.info("The table is already up to date");
    }
    connection.destroy();
};

const createQuotaTable = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));
    const connection = await knex({ client: "pg", connection: configJSON.database });
    if (!(await connection.schema.hasTable("quota"))) {
        if (writeMode) {
            const quotaSchema = path.resolve("scripts", "sql", "040-quota.sql");
            await connection.raw(fs.readFileSync(quotaSchema, "utf-8"));
            connection.destroy();
            console.info(`The script ${quotaSchema} have beed executed`);
        } else {
            console.info(`Will create quota table`);
        }
    } else {
        console.info("Table quota already exists");
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
    await migrateProfilesList(argv.config, argv.write);
    await createQuotaTable(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
