import fs from "fs";
import os from "os";
import path from "path";
import knex from "knex";

const utils = jest.createMockFromModule("./utils");

const readSchema = (schema) => {
    const content = fs.readFileSync(path.resolve("scripts", "sql", `${schema}.sql`), "utf-8");

    let currentMode;
    let results;

    const elements = {};
    content.split(os.EOL).forEach((line) => {
        if (!line || line.trim().startsWith("--") || line.trim() === ");") {
            return;
        }

        switch (true) {
            case /create type/.test(line):
                results = line.match(/create type ([^ ]+) as enum\(([^\)]+)\)/);
                currentMode = `type-${results[1]}`;
                elements[currentMode] = results[2];
                return;

            case /create table/.test(line):
                results = line.match(/create table if not exists ([^\(]+)/);
                currentMode = `table-${results[1]}`;
                elements[currentMode] = {};
                return;

            case /create (?:or replace )?view/.test(line):
                results = line.match(/create (?:or replace )?view ([^ ]+) as/);
                currentMode = `view-${results[1]}`;
                elements[currentMode] = [];
                return;
        }

        if (currentMode.startsWith("table-")) {
            results = line.trim().replace(/ +/, " ").replace(/,$/, "").split(" ");
            elements[currentMode][results[0]] = results.slice(1);
        } else if (currentMode.startsWith("view-")) {
            elements[currentMode].push(line.trim());
        }
    });

    return Object.entries(elements);
};

const createDatabaseFromSchema = (connection, data) => {
    const results = data[0].match(/([^-]+)-(.+)/);

    if (results[1] === "table") {
        return connection.schema.createTable(results[2], (table) => {
            Object.entries(data[1]).forEach(([column, attributes]) => {
                const columnType = attributes[0].endsWith("[]") ? "json" : attributes[0];

                switch (columnType) {
                    case "boolean":
                        table.boolean(column);
                        break;

                    case "integer":
                        if (attributes.includes("primary")) {
                            table.increments(column);
                        } else {
                            table.integer(column);
                        }
                        break;

                    case "json":
                        table.json(column);
                        break;

                    default:
                        table.text(column);
                }
            });
        });
    } else if (results[1] === "view") {
        return connection.schema.createView(results[2], (view) => {
            view.as(connection.raw(data[1].join(" ").replace(/::[^\[]+\[\]/, "")));
        });
    }
};

const getKnexConnection = (database) => {
    let connection = knex({
        client: "sqlite3",
        connection: { filename: ":memory:" },
        useNullAsDefault: true,
    });

    Promise.all([
        ...readSchema("010-profiles").map((data) => createDatabaseFromSchema(connection, data)),
        ...readSchema("011-profiles-view").map((data) => createDatabaseFromSchema(connection, data)),
        ...readSchema("020-users").map((data) => createDatabaseFromSchema(connection, data)),
        ...readSchema("030-user-data").map((data) => createDatabaseFromSchema(connection, data)),
        ...readSchema("031-user-data-view").map((data) => createDatabaseFromSchema(connection, data)),
    ])
        .then(() => {})
        .catch((error) => {
            console.error(error);
            connection.destroy();
        });

    const profilesEntries = JSON.parse(fs.readFileSync(path.join("tests", "data", "database", "profiles.json")));
    const usersEntries = JSON.parse(fs.readFileSync(path.join("tests", "data", "database", "users.json")));
    const userDataEntries = JSON.parse(fs.readFileSync(path.join("tests", "data", "database", "userData.json")));
    Promise.all([
        connection("profiles").insert(
            profilesEntries.map((profile) => ({
                ...profile,
                access_control: JSON.stringify(profile.access_control),
                allowed_tools: JSON.stringify(profile.allowed_tools),
                allowed_databases: JSON.stringify(profile.allowed_databases),
                schema_types: JSON.stringify(profile.schema_types),
            })),
        ),
        connection("users").insert(
            usersEntries.map((user) => ({
                ...user,
                profiles: JSON.stringify(user.profiles),
            })),
        ),
        connection("user_data").insert(
            userDataEntries.map((data) => ({
                ...data,
                data_content: JSON.stringify(data.data_content),
                shared_profiles: JSON.stringify(data.shared_profiles),
                shared_users: JSON.stringify(data.shared_users),
            })),
        ),
    ])
        .then(() => {})
        .catch((error) => {
            console.error(error);
            connection.destroy();
        });

    return connection;
};

const cleanupConnection = (connection) => {
    connection.destroy && connection.destroy();
};

export { cleanupConnection, getKnexConnection };
