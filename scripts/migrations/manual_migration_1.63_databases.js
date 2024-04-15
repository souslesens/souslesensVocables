const fs = require("fs");
const yargs = require("yargs");
const path = require("path");
const ULID = require("ulid");
const { globSync } = require("fast-glob");
const knex = require("knex");
const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const mainconfigFilePath = path.resolve(argv.config, "mainConfig.json");
const databasesFilePath = path.resolve(argv.config, "databases.json");

const mainconfig = JSON.parse(fs.readFileSync(mainconfigFilePath, { encoding: "utf-8" }));

async function main() {
    // get databases from file if exists, else, use empty list
    let databases;
    try {
        databases = JSON.parse(fs.readFileSync(databasesFilePath, { encoding: "utf-8" }));
    } catch {
        databases = [];
    }

    // get sqlServer from mainconfig
    const { SQLserver: sqlServer, ..._rest } = mainconfig;

    // get list of databases in sqlServer
    const conn = knex({
        acquireConnectionTimeout: 5000,
        client: "mssql",
        connection: {
            host: sqlServer.server,
            port: 1433,
            user: sqlServer.user,
            password: sqlServer.password,
            database: sqlServer.database,
        },
    });

    const res = await conn.distinct("name").from("sys.databases");
    const sqlServerDatabases = res.map((obj) => obj.name);

    // remove master database in databases
    const newDatabases = databases.filter((db) => {
        if (db.driver == "sqlserver" && db.host == sqlServer.server && db.database == sqlServer.database) {
            return false;
        }
        return true;
    });

    // add all db in sqlServer
    let mapping_id_dbname = {};
    sqlServerDatabases.forEach((dbName) => {
        const dbId = ULID.ulid();
        mapping_id_dbname[dbName] = dbId;
        newDatabases.push({
            id: dbId,
            name: `sqlserver-${dbName}`,
            driver: "sqlserver",
            host: sqlServer.server,
            port: 1433,
            database: dbName,
            user: sqlServer.user,
            password: sqlServer.password,
        });
    });

    if (argv.w) {
        fs.writeFileSync(databasesFilePath, JSON.stringify(newDatabases, null, 2));
    } else {
        console.log("\n--------------\ndatabases.json\n--------------\n", newDatabases);
    }

    // migrate data/mappings
    const mappingDirPath = path.resolve("data", "mappings");
    const mappingFiles = globSync(path.join(mappingDirPath, "*/main.json"));

    const fileToMigrate = mappingFiles.filter((file) => {
        filePath = path.resolve(file);
        const mapping = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
        const databaseSources = Object.entries(mapping.databaseSources)[0];
        if (databaseSources && "type" in databaseSources[1]) {
            return filePath;
        }
    });

    // backup mapping dir
    if (argv.w && fileToMigrate.length > 0) {
        const now = Date.now();
        fs.cpSync(mappingDirPath, path.resolve("data", `mappings_${now}_backup`), { recursive: true });
    }
    fileToMigrate.forEach((filePath) => {
        const mapping = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
        // loop on datasources
        const newDatabaseSources = Object.fromEntries(
            Object.entries(mapping.databaseSources).map(([dbName, _values]) => {
                const databaseId = mapping_id_dbname[dbName];
                if (!databaseId) {
                    throw `Database ${dbName} is not present on the sqlserver`;
                }
                return [databaseId, { name: dbName }];
            })
        );
        mapping.databaseSources = newDatabaseSources;
        if (argv.w) {
            fs.writeFileSync(filePath, JSON.stringify(mapping, null, 2));
        } else {
            console.log(`--- ${filePath} ---\n`, mapping, "\n");
        }
    });
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
