import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

/* The Virtuoso load threshold lives only on the profile: left null, the global
 * `config.metrics.virtuoso.maxLoad` applies as the fallback. */
const limitColumn = "max_virtuoso_load";

const readConfig = (configDirectory) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    return JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));
};

const migrateTable = async (configDirectory, writeMode, tableName) => {
    const configJSON = readConfig(configDirectory);

    const connection = await knex({ client: "pg", connection: configJSON.database });
    if (await connection.schema.hasColumn(tableName, limitColumn)) {
        console.info(`The table ${tableName} is already up to date`);
        connection.destroy();
        return;
    }

    if (writeMode) {
        await connection.schema.alterTable(tableName, function (table) {
            table.integer(limitColumn);
        });
        console.info(`The migration is done on ${tableName}`);
    } else {
        console.info(`Will add ${limitColumn} to ${tableName}`);
    }
    connection.destroy();
};

/* The views list their columns one by one, so they have to be dropped and read
 * again from the schema files, which now carry the new one. */
const migrateView = async (configDirectory, writeMode, viewName, schemaFile) => {
    const configJSON = readConfig(configDirectory);

    const connection = await knex({ client: "pg", connection: configJSON.database });
    const viewSchema = path.resolve("scripts", "sql", schemaFile);
    if (await connection.schema.hasColumn(viewName, limitColumn)) {
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
    await migrateView(argv.config, argv.write, "profiles_list", "011-profiles-view.sql");
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
