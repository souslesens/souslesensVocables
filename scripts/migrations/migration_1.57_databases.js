const fs = require("fs");
const yargs = require("yargs");
const path = require("path");
const ULID = require("ulid");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const mainconfigFilePath = path.resolve(argv.config, "mainConfig.json");
const databasesFilePath = path.resolve(argv.config, "databases.json");

const mainconfig = JSON.parse(fs.readFileSync(mainconfigFilePath, { encoding: "utf-8" }));
const { SQLserver: sqlServer, ..._rest } = mainconfig;


// return if file is already migrated
if (fs.existsSync(databasesFilePath)) {
    return 0;
}

const databases = [];
// migrate SQLserver form mainConfig to databases
const database = {
    id: ULID.ulid(),
    name: "sqlserver-1",
    driver: "sqlserver",
    host: sqlServer.server,
    port: 1433,
    database: sqlServer.database,
    user: sqlServer.user,
    password: sqlServer.password,
};
databases.push(database);

if (argv.w) {
    fs.writeFileSync(databasesFilePath, JSON.stringify(databases, null, 2));
} else {
    console.log("\n--------------\ndatabases.json\n--------------\n", databases);
}
