import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { normalizeColumn, normalizeColumns, inferColumnType, toTypedValue, detectDatetime, parseWithFormat, loadCsvToDatabase } from "../../model/csvToDb.js";

describe("normalizeColumn", () => {
    test("lowercases and replaces non-alphanumeric characters", () => {
        expect(normalizeColumn("First Name")).toBe("first_name");
        expect(normalizeColumn("First.Name")).toBe("first_name");
        expect(normalizeColumn("  A/B  ")).toBe("a_b");
    });

    test("suffixes reserved words", () => {
        expect(normalizeColumn("select")).toBe("select_1");
        expect(normalizeColumn("User")).toBe("user_1");
    });
});

describe("normalizeColumns", () => {
    test("deduplicates normalized names", () => {
        expect(normalizeColumns(["A", "a", "A"])).toStrictEqual(["a", "a_2", "a_3"]);
    });
});

describe("inferColumnType", () => {
    test("detects integers, floats, booleans and text", () => {
        expect(inferColumnType(["1", "2", "3"])).toBe("int");
        expect(inferColumnType(["1.5", "2"])).toBe("float");
        expect(inferColumnType(["true", "false"])).toBe("bool");
        expect(inferColumnType(["a", "b"])).toBe("str");
    });

    test("ignores empty values", () => {
        expect(inferColumnType(["1", "", undefined])).toBe("int");
        expect(inferColumnType(["", ""])).toBe("str");
    });

    test("falls back to text on mixed kinds", () => {
        expect(inferColumnType(["1", "x"])).toBe("str");
        expect(inferColumnType(["true", "1"])).toBe("str");
    });
});

describe("toTypedValue", () => {
    test("converts according to the inferred type", () => {
        expect(toTypedValue("42", "int")).toBe(42);
        expect(toTypedValue("1.5", "float")).toBe(1.5);
        expect(toTypedValue("true", "bool")).toBe(true);
        expect(toTypedValue("false", "bool")).toBe(false);
        expect(toTypedValue("x", "str")).toBe("x");
    });

    test("maps empty values to null", () => {
        expect(toTypedValue("", "int")).toBeNull();
        expect(toTypedValue(undefined, "str")).toBeNull();
    });
});

describe("detectDatetime", () => {
    test("detects the common date and datetime formats", () => {
        expect(detectDatetime(["2024-12-16", "2024-12-17"])).not.toBeNull();
        expect(detectDatetime(["16/12/2024"])).not.toBeNull();
        expect(detectDatetime(["12/16/2024"])).not.toBeNull();
        expect(detectDatetime(["16.12.2024"])).not.toBeNull();
        expect(detectDatetime(["2024-12-16T14:30:45"])).not.toBeNull();
        expect(detectDatetime(["12/16/2024 02:30:45 PM"])).not.toBeNull();
    });

    test("keeps day-first before month-first (same order as csv-to-db-py)", () => {
        expect(parseWithFormat("16/12/2024", detectDatetime(["16/12/2024"]))).toBe("2024-12-16 00:00:00");
        expect(parseWithFormat("12/16/2024", detectDatetime(["12/16/2024"]))).toBe("2024-12-16 00:00:00");
        expect(parseWithFormat("05/11/2024", detectDatetime(["05/11/2024"]))).toBe("2024-11-05 00:00:00");
    });

    test("formats the value as a naive timestamp", () => {
        expect(parseWithFormat("2024-12-16T14:30:45", detectDatetime(["2024-12-16T14:30:45"]))).toBe("2024-12-16 14:30:45");
        expect(parseWithFormat("12/16/2024 02:30:45 PM", detectDatetime(["12/16/2024 02:30:45 PM"]))).toBe("2024-12-16 14:30:45");
        expect(parseWithFormat("2024-12-16T14:30:45.123", detectDatetime(["2024-12-16T14:30:45.123"]))).toBe("2024-12-16 14:30:45.123");
    });

    test("ignores empty values but stays strict at threshold 1.0", () => {
        expect(detectDatetime(["", "2024-12-16"])).not.toBeNull();
        expect(detectDatetime(["2024-12-16", "oops"])).toBeNull();
        expect(detectDatetime(["", ""])).toBeNull();
    });
});

const makeConnection = ({ existingColumns } = {}) => {
    const created = {};
    const inserted = [];
    let truncateCount = 0;
    const columnInfo = existingColumns && !Array.isArray(existingColumns) ? existingColumns : Object.fromEntries((existingColumns ?? []).map((column) => [column, {}]));

    const connection = () => ({
        columnInfo: async () => columnInfo,
        truncate: async () => {
            truncateCount += 1;
        },
    });
    connection.schema = {
        hasTable: async () => existingColumns !== undefined,
        createTable: async (_name, callback) => callback({ specificType: (name, type) => (created[name] = type) }),
    };
    connection.batchInsert = async (_name, rows) => inserted.push(...rows);
    connection.created = created;
    connection.inserted = inserted;
    connection.truncateCount = () => truncateCount;
    return connection;
};

describe("loadCsvToDatabase", () => {
    let csvPath;

    beforeEach(() => {
        csvPath = path.join(os.tmpdir(), `csvToDb-${Date.now()}.csv`);
    });

    afterEach(() => {
        fs.rmSync(csvPath, { force: true });
    });

    test("creates the table with inferred types and inserts typed rows", async () => {
        fs.writeFileSync(csvPath, "id,Name,price,active\n1,Alice,1.5,true\n2,Bob,2,false\n");
        const connection = makeConnection();

        const result = await loadCsvToDatabase({ connection, client: "pg", table: "people", csvPath, delimiter: "," });

        expect(connection.created).toStrictEqual({ id: "INTEGER", name: "TEXT", price: "FLOAT", active: "BOOLEAN" });
        expect(connection.inserted).toStrictEqual([
            { id: 1, name: "Alice", price: 1.5, active: true },
            { id: 2, name: "Bob", price: 2, active: false },
        ]);
        expect(result.rowCount).toBe(2);
    });

    test("creates datetime columns and inserts naive timestamp strings", async () => {
        fs.writeFileSync(csvPath, "id,iso,fr\n1,2024-12-16,16/12/2024\n2,2024-12-17,17/12/2024\n");
        const connection = makeConnection();

        await loadCsvToDatabase({ connection, client: "pg", table: "events", csvPath, delimiter: "," });

        expect(connection.created).toStrictEqual({ id: "INTEGER", iso: "TIMESTAMP", fr: "TIMESTAMP" });
        expect(connection.inserted).toStrictEqual([
            { id: 1, iso: "2024-12-16 00:00:00", fr: "2024-12-16 00:00:00" },
            { id: 2, iso: "2024-12-17 00:00:00", fr: "2024-12-17 00:00:00" },
        ]);
    });

    test("keeps a date column as text when one value is invalid", async () => {
        fs.writeFileSync(csvPath, "id,d\n1,2024-12-16\n2,oops\n");
        const connection = makeConnection();

        await loadCsvToDatabase({ connection, client: "pg", table: "events", csvPath, delimiter: "," });

        expect(connection.created).toStrictEqual({ id: "INTEGER", d: "TEXT" });
    });

    test("truncates an existing table with the same columns", async () => {
        fs.writeFileSync(csvPath, "id,name\n1,Alice\n");
        const connection = makeConnection({ existingColumns: ["name", "id"] });

        await loadCsvToDatabase({ connection, client: "mssql", table: "people", csvPath, delimiter: "," });

        expect(connection.truncateCount()).toBe(1);
        expect(connection.created).toStrictEqual({});
        expect(connection.inserted).toStrictEqual([{ id: 1, name: "Alice" }]);
    });

    test("rejects column drift", async () => {
        fs.writeFileSync(csvPath, "id,name\n1,Alice\n");
        const connection = makeConnection({ existingColumns: ["id", "other"] });

        await expect(loadCsvToDatabase({ connection, client: "pg", table: "people", csvPath, delimiter: "," })).rejects.toThrow(/Column drift/);
    });

    test("rejects type drift on an existing table", async () => {
        fs.writeFileSync(csvPath, "id,d\n1,2024-12-16\n");
        const connection = makeConnection({ existingColumns: { id: { type: "integer" }, d: { type: "text" } } });

        await expect(loadCsvToDatabase({ connection, client: "pg", table: "events", csvPath, delimiter: "," })).rejects.toThrow(/Type drift/);
    });

    test("accepts an existing table whose types already match", async () => {
        fs.writeFileSync(csvPath, "id,d\n1,2024-12-16\n");
        const connection = makeConnection({ existingColumns: { id: { type: "integer" }, d: { type: "timestamp without time zone" } } });

        await loadCsvToDatabase({ connection, client: "pg", table: "events", csvPath, delimiter: "," });

        expect(connection.truncateCount()).toBe(1);
    });

    test("rejects unsupported clients", async () => {
        fs.writeFileSync(csvPath, "id\n1\n");
        const connection = makeConnection();

        await expect(loadCsvToDatabase({ connection, client: "mysql", table: "people", csvPath, delimiter: "," })).rejects.toThrow(/Unsupported/);
    });
});
