import { failure, success } from "srd";
import { ulid } from "ulid";
import { z } from "zod";
import { Msg } from "./Admin";
import { Dispatch } from "react";

const endpoint = "/api/v1/admin/databases";

async function getDatabases(): Promise<Database[]> {
    const response = await fetch(endpoint);
    const json = (await response.json()) as { resources: DatabaseJson[] };
    return mapDatabases(json.resources);
}

function mapDatabases(resources: DatabaseJson[]) {
    const databases: [string, DatabaseJson][] = Object.entries(resources);
    const mapped_databases = databases
        .map(([key, val]) => {
            return decodeDatabase(key, val);
        })
        .sort((database1: Database, database2: Database) => {
            const name1 = database1.name?.toUpperCase();
            const name2 = database2.name?.toUpperCase();

            if (name1 === undefined || name2 === undefined) {
                return 0;
            }
            if (name1 < name2) {
                return -1;
            }
            if (name1 > name2) {
                return 1;
            }
            return 0;
        });

    return mapped_databases;
}

async function addDatabase(database: Database, updateModel: Dispatch<Msg>) {
    try {
        const body = { database: database };

        const response = await fetch(endpoint, {
            method: "post",
            body: JSON.stringify(body, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });
        const { message, resources } = (await response.json()) as { message: string; resources: DatabaseJson[] };

        if (response.status === 200) {
            updateModel({
                type: "databases",
                payload: success(mapDatabases(resources)),
            });
        } else {
            updateModel({
                type: "databases",
                payload: failure(`${response.status}, ${message}`),
            });
        }
    } catch (error) {
        updateModel({
            type: "databases",
            payload: failure(error as string),
        });
    }
}

async function deleteDatabase(database: Database, updateModel: React.Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${database.id}`, { method: "delete" });
        const { message, resources } = (await response.json()) as { message: string; resources: DatabaseJson[] };

        if (response.status === 200) {
            updateModel({
                type: "databases",
                payload: success(mapDatabases(resources)),
            });
        } else {
            updateModel({
                type: "databases",
                payload: failure(`${response.status}, ${message}`),
            });
        }
    } catch (error) {
        updateModel({
            type: "databases",
            payload: failure(`Unknown error have occured: ${error as string}`),
        });
    }
}

async function editDatabase(database: Database, updateModel: React.Dispatch<Msg>) {
    try {
        const body = { database: database };

        const response = await fetch(`${endpoint}/${database.id}`, {
            method: "put",
            body: JSON.stringify(body, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });
        const { message, resources } = (await response.json()) as { message: string; resources: DatabaseJson[] };

        if (response.status === 200) {
            updateModel({
                type: "databases",
                payload: success(mapDatabases(resources)),
            });
        } else {
            updateModel({
                type: "databases",
                payload: failure(`${response.status}, ${message}`),
            });
        }
    } catch (error) {
        updateModel({
            type: "databases",
            payload: failure(error as string),
        });
    }
}

type DatabaseJson = {
    id: string;
    name?: string;
    driver: "postgres" | "sqlserver";
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
};

const decodeDatabase = (_key: string, database: DatabaseJson): Database => {
    return {
        id: database.id ? database.id : ulid(),
        name: database.name ? database.name : database.id,
        driver: database.driver,
        host: database.host,
        port: database.port,
        database: database.database,
        user: database.user,
        password: database.password,
    };
};

const DatabaseSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    driver: z.enum(["postgres", "sqlserver"]),
    host: z.string().min(1),
    port: z.number().int().positive({ message: "Invalid port" }).lte(65535, { message: "Out of range" }),
    database: z.string().min(1),
    user: z.string().min(1),
    password: z.string().optional(),
});

export type Database = z.infer<typeof DatabaseSchema>;

export const defaultDatabase = (uuid: string): Database => {
    return {
        id: uuid,
        name: "",
        driver: "postgres",
        host: "localhost",
        port: 5432,
        database: "",
        user: "",
        password: "",
    };
};
export { addDatabase, DatabaseSchema, deleteDatabase, editDatabase, getDatabases };
