// Prepares the isolated server groupNamedLikeSource.spec.js runs against: a copy of config/ whose
// database is a throwaway Postgres, so the spec can rewrite sources.json and the profiles freely.
//   node tests/e2e/tools/sources/groupNamedLikeSourceSandbox.js <sandbox config folder>
// The throwaway Postgres is started beforehand, by default on localhost:55432 with trust auth:
//   initdb -D <pgdata> -U postgres -A trust && pg_ctl -D <pgdata> -o "-p 55432" start
// SLS_SANDBOX_DATABASE overrides it, as the JSON knex connection object.
// Then the server under test runs on that copy:
//   CONFIG_PATH=<sandbox config folder> PORT=3020 NODE_V8_COVERAGE=<node coverage folder> \
//     node --import ./tests/e2e/tools/sources/serverCoveragePreload.js ./bin/www

import fs from "fs";
import path from "path";
import knex from "knex";

// trust auth ignores the password, the config check requires one
const defaultSandboxDatabase = { host: "localhost", port: 55432, user: "postgres", password: "sandbox", database: "postgres" };
const sqlSchemaFolder = "scripts/sql";
const backupFileRegex = /_backup\.json$|\.bak$/;

const sandboxConfigFolder = process.argv[2];
if (!sandboxConfigFolder) {
    console.error("usage: node groupNamedLikeSourceSandbox.js <sandbox config folder>");
    process.exit(1);
}
const sandboxDatabase = process.env.SLS_SANDBOX_DATABASE ? JSON.parse(process.env.SLS_SANDBOX_DATABASE) : defaultSandboxDatabase;

fs.mkdirSync(sandboxConfigFolder, { recursive: true });
fs.cpSync("config", sandboxConfigFolder, { recursive: true, filter: (sourcePath) => !backupFileRegex.test(sourcePath) });
const mainConfigPath = path.join(sandboxConfigFolder, "mainConfig.json");
const mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, "utf8"));
mainConfig.database = sandboxDatabase;
mainConfig.auth = "disabled";
fs.writeFileSync(mainConfigPath, JSON.stringify(mainConfig, null, 2));
// the spec writes the sources of each case
fs.writeFileSync(path.join(sandboxConfigFolder, "sources.json"), "{}");

const connection = knex({ client: "pg", connection: sandboxDatabase });
try {
    await connection.raw("drop schema public cascade; create schema public;");
    const schemaFiles = fs.readdirSync(sqlSchemaFolder).sort();
    for (const schemaFile of schemaFiles) {
        await connection.raw(fs.readFileSync(path.join(sqlSchemaFolder, schemaFile), "utf8"));
    }
    console.log(`${sandboxConfigFolder} ready, database ${sandboxDatabase.host}:${sandboxDatabase.port} reset with ${schemaFiles.length} schema files`);
} finally {
    await connection.destroy();
}
