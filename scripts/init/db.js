import { createInterface } from "node:readline/promises";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import knex from "knex";

import { userModel } from "../../model/users.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDbConnection = async (conn) => {
    try {
        await conn.raw("SELECT 1");
        return true;
    } catch {
        return false;
    }
};

/**
 * Checks if the database contains any user‑defined tables.
 * Returns true when the DB is empty (no tables in the "public" schema).
 */
async function isDatabaseEmpty(config) {
    const db = knex(config);
    try {
        const rows = await db.select("table_name").from("information_schema.tables").where({
            table_schema: "public",
            table_type: "BASE TABLE",
        });
        return rows.length === 0;
    } catch (err) {
        console.error("Error while checking for empty DB:", err);
        return false;
    } finally {
        await db.destroy();
    }
}

async function executeSqlFiles(dir, conn) {
    const entries = await readdir(dir, { withFileTypes: true });
    const sqlFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".sql"))
        .map((e) => e.name)
        .sort();
    for (const file of sqlFiles) {
        const filePath = path.join(dir, file);
        const sql = await readFile(filePath, "utf8");
        await conn.raw(sql);
    }
}

const read = createInterface({
    input: process.stdin,
    output: process.stdout,
});

const defaultHost = "localhost";
const defaultPort = 5432;
const defaultUser = "slsv";
const defaultName = "slsv";
const defaultPassword = "slsv";

const databaseHost = (await read.question(`> Database host? [${defaultHost}] `)) || defaultHost;
const databasePort = Number((await read.question(`> Database port? [${defaultPort}] `)) || defaultPort);
const databaseUser = (await read.question(`> Database user? [${defaultUser}] `)) || defaultUser;
const databaseName = (await read.question(`> Database name? [${defaultName}] `)) || defaultName;
const databasePassword = (await read.question(`> Database password? [${defaultPassword}] `)) || defaultPassword;

console.log(`\nUse database ${databaseName} on server ${databaseHost}:${databasePort} with password *********?`);

const yes = (await read.question("Y/n ")) || "y";

if (!["yes", "y", "oui", "o"].includes(yes.toLowerCase())) {
    console.log("aborting");
    process.exit(0);
}

const dbConfig = {
    client: "pg",
    connection: {
        host: databaseHost,
        user: databaseUser,
        password: databasePassword,
        database: databaseName,
        port: databasePort,
    },
};

const db = knex(dbConfig);
const dbOk = await testDbConnection(db);
console.log();

if (!dbOk) {
    console.error("❌️ Database connection is not working. Please check the information provided");
    process.exit(1);
}

const empty = await isDatabaseEmpty(dbConfig);
if (empty) {
    await executeSqlFiles(path.resolve(__dirname, "../sql"), db);
    console.log("✅️ Database initialized!");
} else {
    console.log("ℹ️ Database already contains tables.");
}

// create admin users
console.log("\nCreate admin user?");
const yes2 = (await read.question("Y/n ")) || "y";
if (["yes", "y", "oui", "o"].includes(yes2.toLowerCase())) {
    const existingUser = await userModel.findUserAccount("admin");
    if (!existingUser) {
        await userModel.addUserAccount({ _type: "database", login: "admin", groups: [], source: "database", token: "", password: "admin" });
        console.log("✅️ Database initialized!");
    } else {
        console.log("ℹ️ admin user already present in database.");
    }
}

await db.destroy();
await read.close();
process.exit(0);
