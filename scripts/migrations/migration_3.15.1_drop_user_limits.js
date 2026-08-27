import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

/* The five limits now live on the profile only: the user-account override is
 * gone, so these columns have no reader left and can be dropped. */
const limitColumns = ["create_source", "maximum_source", "max_writable_triples", "max_upload_triples", "max_user_data_records"];

const readConfig = (configDirectory) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    return JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));
};

const migrateTable = async (configDirectory, writeMode) => {
    const configJSON = readConfig(configDirectory);

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const presentColumns = [];
    for (const column of limitColumns) {
        if (await connection.schema.hasColumn("users", column)) {
            presentColumns.push(column);
        }
    }

    if (presentColumns.length === 0) {
        console.info("The table users is already up to date");
        connection.destroy();
        return;
    }

    if (writeMode) {
        await connection.schema.alterTable("users", function (table) {
            presentColumns.forEach((column) => table.dropColumn(column));
        });
        console.info("The migration is done on users");
    } else {
        console.info(`Will drop ${presentColumns.join(", ")} from users`);
    }
    connection.destroy();
};

/* The view lists its columns one by one, so it has to be dropped and read
 * again from the schema file, which no longer carries the dropped ones. */
const migrateView = async (configDirectory, writeMode) => {
    const configJSON = readConfig(configDirectory);

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const viewSchema = path.resolve("scripts", "sql", "021-users-view.sql");
    if (!(await connection.schema.hasColumn("public_users_list", limitColumns[0]))) {
        console.info("The view public_users_list is already up to date");
        connection.destroy();
        return;
    }

    if (writeMode) {
        await connection.schema.dropViewIfExists("public_users_list");
        await connection.raw(fs.readFileSync(viewSchema, "utf-8"));
        console.info(`The script ${viewSchema} have been executed`);
    } else {
        console.info("Will rebuild the view public_users_list");
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
    await migrateTable(argv.config, argv.write);
    await migrateView(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
