/* Migrate the old JSON storage to a Postgresql database */

const fs = require("fs");
const knex = require("knex");
const path = require("path");
const yargs = require("yargs");

const insertData = async (connection, datas, table, column) => {
    const conn = knex({ client: "pg", connection: connection });

    const migrated = [];
    for (let index = 0; index < datas.length; index++) {
        try {
            const check = await conn.select(column).from(table).where(column, datas[index][column]).first();

            if (check === undefined) {
                await conn.insert(datas[index]).into(table);
                migrated.push(datas[index][column]);
            }
        } catch (error) {
            if (error.routine === "auth_failed") {
                console.error("  ❌ Cannot authenticate with the database");
                return;
            } else {
                console.error(`  ❌ Cannot insert data: ${error.detail}`);
            }
        }
    }

    return migrated;
};

const migrateConfig = (configDirectory, writeMode) => {
    console.info(" - Main configuration")
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    let modification = false;
    if (configJSON.authenticationDatabase !== undefined) {
        configJSON.database = {
            host: configJSON.authenticationDatabase.host,
            port: configJSON.authenticationDatabase.port,
            database: configJSON.authenticationDatabase.database,
            user: configJSON.authenticationDatabase.user,
            password: configJSON.authenticationDatabase.password,
        };

        delete configJSON.authenticationDatabase;
        modification = true;
    }

    if (writeMode) {
        if (modification) {
            fs.writeFileSync(configPath, JSON.stringify(configJSON, null, 2));
            console.info("  ✅ mainConfig options were migrated");
        } else {
            console.info("  👍 Nothing to do");
        }
    }
};

const migrateProfiles = async (configDirectory, writeMode) => {
    console.info(" - Profiles");
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const profilesPath = path.resolve(configDirectory, "profiles.json");
    if (fs.existsSync(profilesPath)) {
        const profilesJSON = JSON.parse(fs.readFileSync(profilesPath, { encoding: "utf-8" }));

        const profiles = Object.values(profilesJSON).map((profile) => ({
            label: profile.name,
            theme: profile.theme,
            allowed_tools: profile.allowedTools,
            access_control: JSON.stringify(profile.sourcesAccessControl),
            schema_types: profile.allowedSourceSchemas,
        }));

        if (writeMode) {
            const migrated_profiles = await insertData(configJSON.database, profiles, "profiles", "label");
            if (migrated_profiles.length > 0) {
                console.info(`  ✅ the following profiles were migrated: ${migrated_profiles}`);
            } else {
                console.info("  👍 Nothing to do");
            }
        }
    }
}
        }
    }
};

const main = async () => {
    const argv = yargs
        .alias("c", "config").describe("c", "Path to the config directory")
        .alias("w", "write").describe("w", "Write the migration in the file").boolean("w")
        .demandOption(["config"]).help().argv;

    console.info(argv.write ? "🚧 Prepare the migration…" : "🔧 Dry run mode…");
    migrateConfig(argv.config, argv.write);
    await migrateProfiles(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
