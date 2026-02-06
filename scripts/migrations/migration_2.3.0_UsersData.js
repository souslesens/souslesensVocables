import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs";

const migrateUsersData = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const connection = knex({ client: "pg", connection: configJSON.database });
    if (!await connection.schema.hasColumn("user_data", "data_tool")) {
        if (writeMode) {
            await connection.schema.alterTable('user_data', function (table) {
                table.string('data_tool').defaultTo("");
            })
            console.info(`The migration is done`);
        } else {
            console.info(`Will run the migration on usersData`);
        }
    } else {
        console.info("The table is already up to date");
    }
    if (!await connection.schema.hasColumn("user_data", "data_source")) {
        if (writeMode) {
            await connection.schema.alterTable('user_data', function (table) {
                table.string('data_source').defaultTo("");
            })
            console.info(`The migration is done`);
        } else {
            console.info(`Will run the migration on usersData`);
        }
    } else {
        console.info("The table is already up to date");
    }
    connection.destroy();
};

const migrateUsersDataListView = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const usersDataListSchema = path.resolve("scripts", "sql", "030-user-data.sql");
    if (fs.existsSync(usersDataListSchema)) {
        const connection = knex({ client: "pg", connection: configJSON.database });
        if (!await connection.schema.hasColumn("user_data_list", "data_tool")) {
            if (writeMode) {
                /* Remove the view since the library cannot do it on his own */
                await connection.schema.dropViewIfExists("user_data_list");
                /* Read the schema again to add the view again with the latest
                 * modification */
                await connection.raw(fs.readFileSync(usersDataListSchema, "utf-8"));
                connection.destroy();
                console.info(`The script ${usersDataListSchema} have beed executed`);
            } else {
                console.info(`Will run the script ${usersDataListSchema}`);
            }
        } else {
            console.info("The view is already up to date");
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
    await migrateUsersData(argv.config, argv.write);
    await migrateUsersDataListView(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
