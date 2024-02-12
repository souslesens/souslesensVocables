const fs = require("fs");
const yargs = require("yargs");
const path = require("path");
const ULID = require("ulid");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const mainconfigFilePath = path.resolve(argv.config, "mainConfig.json");
const databasesFilePath = path.resolve(argv.config, "databases.json");

const mainconfig = JSON.parse(fs.readFileSync(mainconfigFilePath, { encoding: "utf-8" }));

// get databases from file if exists, else, use empty list
let databases;
try {
    databases = JSON.parse(fs.readFileSync(databasesFilePath, { encoding: "utf-8" }));
} catch {
    databases = [];
}

// remove SQLserver from mainconfig
const { SQLserver: sqlServer, ...newMainConfig } = mainconfig;

// return if file is already migrated
if (!sqlServer) {
    return 0;
}

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
    fs.writeFileSync(mainconfigFilePath, JSON.stringify(newMainConfig, null, 2));
    fs.writeFileSync(databasesFilePath, JSON.stringify(databases, null, 2));
} else {
    console.log("---------------\nmainConfig.json\n---------------\n", mainconfig);
    console.log("\n--------------\ndatabases.json\n--------------\n", databases);
}
