const fs = require("fs");
const yargs = require("yargs");
const path = require("path");
const ULID = require("ulid");
const { globSync } = require("glob");
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

// return if file is already migrateda
let databaseId = ULID.ulid();
const databaseName = "sqlserver-1";
if (sqlServer) {
    // migrate SQLserver form mainConfig to databases
    const database = {
        id: databaseId,
        name: databaseName,
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
} else {
    databaseId = databases.find((db) => db.name == databaseName).id;
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
    fs.cpSync(mappingDirPath, path.resolve("data", "mappings.bak"), { recursive: true });
}
fileToMigrate.forEach((filePath) => {
    const mapping = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
    mapping.databaseSources = { [databaseId]: { name: databaseName } };
    if (argv.w) {
        fs.writeFileSync(filePath, JSON.stringify(mapping, null, 2));
    } else {
        console.log(`--- ${filePath} ---\n`, mapping, "\n");
    }
});
