const fs = require("fs");
const knex = require("knex");
const path = require("path");
const yargs = require("yargs");

const migrateUserDataView = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const userDataSchema = path.resolve("scripts", "sql", "003-user-data.sql");
    if (fs.existsSync(userDataSchema)) {
        if (writeMode) {
            const connection = await knex({ client: "pg", connection: configJSON.database });
            // Remove the view since the library cannot do it on his own
            await connection.schema.dropViewIfExists("user_data_list");
            // Read the schema again to add the view
            await connection.raw(fs.readFileSync(userDataSchema, "utf-8"));
            connection.destroy();
            console.info(`The script ${userDataSchema} have beed executed`);
        } else {
            console.info(`Will run the script ${userDataSchema}`);
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
    await migrateUserDataView(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
