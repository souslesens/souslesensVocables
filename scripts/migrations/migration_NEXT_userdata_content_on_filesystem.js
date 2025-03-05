/* Migrate the user_data.data_content field from the database in a dedicated
 * file on the file system */

const fs = require("fs");
const knex = require("knex");
const path = require("path");
const ULID = require("ulid");
const yargs = require("yargs");

const migrateUserDataContent = async (configuration, writeMode) => {
    // Prepare the storage directory
    const userDataDirectory = path.resolve("data", "user_data");
    if (!fs.existsSync(userDataDirectory)) {
        if (writeMode) {
            console.info(" 📁 Create the user_data storage directory");
            fs.mkdirSync(userDataDirectory);
        } else {
            console.debug(` ! The directory ${userDataDirectory} will be created`);
        }
    }

    const connection = knex({ client: "pg", connection: configuration.database });

    // Check if the column still here, in case of the migration was already done
    if (await connection.schema.hasColumn("user_data", "data_content")) {
        const response = await connection
            .select("user_data.id", "user_data.data_path", "user_data.data_content", "users.login")
            .from("user_data")
            .join("users", "users.id", "user_data.owned_by");

        let totalMigration = 0;
        for (const userData of response) {
            // Only update the entries without a declared path
            if (userData.data_path.trim().length === 0) {
                if (writeMode) {
                    const filename = `${id}-${username}-${ULID.ulid()}.json`;

                    const filepath = path.join(userDataDirectory, filename);
                    if (!fs.existsSync(filepath)) {
                        // Write the content in the file system
                        fs.writeFileSync(filepath, JSON.stringify(userData.data_content, null, 2));
                        // Update the database entry
                        await connection("user_data").where({ id: userData.id }).update({data_path: filename});
                    } else {
                        console.error(`The file ${filepath} already exists on the file system`);
                    }
                } else {
                    console.debug(` ! The entry ${userData.id} will be migrated`);
                }

                totalMigration += 1;
            }
        }

        if (writeMode) {
            if (totalMigration > 0) {
                console.info(` ✅ ${totalMigration} entries were migrated`);
            } else {
                console.info(" 👍 Nothing to do");
            }
        }
    } else {
        console.info(" 👍 Nothing to do");
    }

    connection.destroy();
};

const removeDataContentColumn = async (configuration, writeMode) => {
    const connection = knex({ client: "pg", connection: configuration.database });

    if (await connection.schema.hasColumn("user_data", "data_content")) {
        if (writeMode) {
            await connection.schema.alterTable("user_data", (table) => {
                table.dropColumn("data_content");
            });
            console.info(" ✅ The column was removed successfully")
        } else {
            console.debug(" ! The column data_column will be remove from the user_data table");
        }
    } else {
        console.info(" 👍 Nothing to do");
    }

    connection.destroy();
};

const updateUserDataView = async (configuration, writeMode) => {
    const schema = path.resolve("scripts", "sql", "031-user-data-view.sql");
    if (fs.existsSync(schema)) {
        const connection = knex({ client: "pg", connection: configuration.database });

        if (await connection.schema.hasColumn("user_data_list", "data_content")) {
            if (writeMode) {
                await connection.schema.dropViewIfExists("user_data_list");
                await connection.raw(fs.readFileSync(schema, "utf-8"));

                console.info(" ✅ The view was updated successfully");
            } else {
                console.debut(" ! The view will be updated");
            }
        } else {
            console.info(" 👍 Nothing to do");
        }

        connection.destroy();
    } else {
        console.error(` 🛑 The file ${schema} cannot be found on the file system!`);
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
    const configPath = path.resolve(argv.config, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    console.info(">> Migrate the user_data content");
    await migrateUserDataContent(configJSON, argv.write);
    console.info(">> Update the view for the user_data table");
    await updateUserDataView(configJSON, argv.write);
    console.info(">> Remove the column data_content from database");
    await removeDataContentColumn(configJSON, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
