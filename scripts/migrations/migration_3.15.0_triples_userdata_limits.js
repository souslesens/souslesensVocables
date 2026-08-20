import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

/* The three caps live on the profile and on the user account alike: the profile
 * decides when it defines one, the account is the fallback. Left null on both
 * sides, nothing is capped. */
const limitColumns = ["max_writable_triples", "max_upload_triples", "max_user_data_records"];

const readConfig = (configDirectory) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    return JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));
};

const migrateTable = async (configDirectory, writeMode, tableName) => {
    const configJSON = readConfig(configDirectory);

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const missingColumns = [];
    for (const column of limitColumns) {
        if (!(await connection.schema.hasColumn(tableName, column))) {
            missingColumns.push(column);
        }
    }

    if (missingColumns.length === 0) {
        console.info(`The table ${tableName} is already up to date`);
        connection.destroy();
        return;
    }

    if (writeMode) {
        await connection.schema.alterTable(tableName, function (table) {
            /* No default value on purpose: an instance that never set these must
             * stay uncapped, and 0 must keep meaning "forbidden". */
            missingColumns.forEach((column) => table.integer(column));
        });
        console.info(`The migration is done on ${tableName}`);
    } else {
        console.info(`Will add ${missingColumns.join(", ")} to ${tableName}`);
    }
    connection.destroy();
};

/* The views list their columns one by one, so they have to be dropped and read
 * again from the schema files, which now carry the new ones. */
const migrateView = async (configDirectory, writeMode, viewName, schemaFile) => {
    const configJSON = readConfig(configDirectory);

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const viewSchema = path.resolve("scripts", "sql", schemaFile);
    if (await connection.schema.hasColumn(viewName, limitColumns[0])) {
        console.info(`The view ${viewName} is already up to date`);
        connection.destroy();
        return;
    }

    if (writeMode) {
        await connection.schema.dropViewIfExists(viewName);
        await connection.raw(fs.readFileSync(viewSchema, "utf-8"));
        console.info(`The script ${viewSchema} have been executed`);
    } else {
        console.info(`Will rebuild the view ${viewName}`);
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
    await migrateTable(argv.config, argv.write, "profiles");
    await migrateTable(argv.config, argv.write, "users");
    await migrateView(argv.config, argv.write, "profiles_list", "011-profiles-view.sql");
    await migrateView(argv.config, argv.write, "public_users_list", "021-users-view.sql");
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
