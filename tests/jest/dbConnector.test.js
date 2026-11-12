import { getDefaultSchema, getKGModel, getSampleData, getSchemas, qualifiedTable, quoteIdentifier } from "../../bin/databases/dbConnector.js";

function createFakeConnection(result, error) {
    const calls = { distinct: [], from: [], where: [], orderBy: [] };
    const chain = {
        distinct: (...args) => {
            calls.distinct.push(args);
            return chain;
        },
        from: (...args) => {
            calls.from.push(args);
            return chain;
        },
        where: (...args) => {
            calls.where.push(args);
            return chain;
        },
        orderBy: (...args) => {
            calls.orderBy.push(args);
            return chain;
        },
        then: (resolve) => {
            if (!error) {
                resolve(result);
            }
            return chain;
        },
        catch: (onError) => {
            if (error) {
                onError(error);
            }
            return chain;
        },
    };
    return { chain, calls };
}

function runGetKGModel(connection, driver, schema) {
    return new Promise((resolve, reject) => {
        getKGModel(
            connection,
            "db",
            driver,
            (data) => resolve(data),
            (error) => reject(error),
            false,
            schema,
        );
    });
}

describe("getDefaultSchema", () => {
    test("postgres drivers and no driver fall back to public", () => {
        expect(getDefaultSchema("pg")).toBe("public");
        expect(getDefaultSchema("postgres")).toBe("public");
        expect(getDefaultSchema(undefined)).toBe("public");
    });

    test("sql server drivers use dbo", () => {
        expect(getDefaultSchema("mssql")).toBe("dbo");
        expect(getDefaultSchema("sqlserver")).toBe("dbo");
    });
});

describe("quoteIdentifier", () => {
    test("wraps a plain name", () => {
        expect(quoteIdentifier("assets")).toBe('"assets"');
    });

    test("doubles an embedded double quote", () => {
        expect(quoteIdentifier('my"table')).toBe('"my""table"');
        expect(quoteIdentifier('a""b')).toBe('"a""""b"');
    });
});

describe("qualifiedTable", () => {
    test("bare name with explicit schema", () => {
        expect(qualifiedTable("assets", "pg", "staging")).toBe('"staging"."assets"');
    });

    test("bare name without schema uses the driver default", () => {
        expect(qualifiedTable("assets", "pg")).toBe('"public"."assets"');
        expect(qualifiedTable("assets", "mssql")).toBe('"dbo"."assets"');
    });

    test("already qualified name is never re-qualified", () => {
        expect(qualifiedTable("staging.assets", "pg")).toBe('"staging"."assets"');
        expect(qualifiedTable("staging.assets", "mssql", "other")).toBe('"staging"."assets"');
    });

    test("already qualified name holding a double quote is quoted per part", () => {
        expect(qualifiedTable('a"b.c', "pg")).toBe('"a""b"."c"');
    });
});

describe("getKGModel", () => {
    test("defaults the schema to public for a postgres driver", async () => {
        const { chain, calls } = createFakeConnection([]);
        await runGetKGModel(chain, "pg");
        expect(calls.where).toStrictEqual([[{ table_schema: "public" }]]);
    });

    test("defaults the schema to dbo for sql server", async () => {
        const { chain, calls } = createFakeConnection([]);
        await runGetKGModel(chain, "mssql");
        expect(calls.where).toStrictEqual([[{ table_schema: "dbo" }]]);
    });

    test("uses the given schema", async () => {
        const { chain, calls } = createFakeConnection([]);
        await runGetKGModel(chain, "pg", "staging");
        expect(calls.where).toStrictEqual([[{ table_schema: "staging" }]]);
    });

    test("passes the rows to the success callback", async () => {
        const rows = [{ table_name: "assets", column_name: "id" }];
        const { chain } = createFakeConnection(rows);
        await expect(runGetKGModel(chain, "pg")).resolves.toBe(rows);
    });

    test("passes the error to the error callback", async () => {
        const failure = new Error("connection lost");
        const { chain } = createFakeConnection(null, failure);
        await expect(runGetKGModel(chain, "pg")).rejects.toBe(failure);
    });
});

describe("getSchemas", () => {
    test("excludes system schemas and keeps the order", async () => {
        const rows = [
            { table_schema: "information_schema" },
            { table_schema: "pg_catalog" },
            { table_schema: "pg_toast" },
            { table_schema: "pg_toast_temp_3" },
            { table_schema: "public" },
            { table_schema: "staging" },
            { table_schema: "sys" },
        ];
        const { chain, calls } = createFakeConnection(rows);
        const schemas = await new Promise((resolve, reject) => {
            getSchemas(
                chain,
                "pg",
                (data) => resolve(data),
                (error) => reject(error),
            );
        });
        expect(schemas).toStrictEqual(["public", "staging"]);
        expect(calls.distinct).toStrictEqual([["table_schema"]]);
        expect(calls.from).toStrictEqual([["information_schema.columns"]]);
        expect(calls.orderBy).toStrictEqual([["table_schema"]]);
    });

    test("excludes only the exact system schema names, in any order", async () => {
        const rows = [
            { table_schema: "pg_toast_temp_1" },
            { table_schema: "Sys" },
            { table_schema: "pg_catalog" },
            { table_schema: "public" },
            { table_schema: "information_schema" },
            { table_schema: "sys" },
        ];
        const { chain } = createFakeConnection(rows);
        const schemas = await new Promise((resolve, reject) => {
            getSchemas(
                chain,
                "pg",
                (data) => resolve(data),
                (error) => reject(error),
            );
        });
        expect(schemas).toStrictEqual(["Sys", "public"]);
    });

    test("reads the camelCase catalog column on sql server", async () => {
        const rows = [{ TABLE_SCHEMA: "dbo" }, { TABLE_SCHEMA: "sys" }, { TABLE_SCHEMA: "staging" }];
        const { chain, calls } = createFakeConnection(rows);
        const schemas = await new Promise((resolve, reject) => {
            getSchemas(
                chain,
                "mssql",
                (data) => resolve(data),
                (error) => reject(error),
            );
        });
        expect(schemas).toStrictEqual(["dbo", "staging"]);
        expect(calls.distinct).toStrictEqual([["TABLE_SCHEMA"]]);
        expect(calls.orderBy).toStrictEqual([["TABLE_SCHEMA"]]);
    });

    test("passes the error to the error callback", async () => {
        const failure = new Error("connection lost");
        const { chain } = createFakeConnection(null, failure);
        const received = await new Promise((resolve) => {
            getSchemas(
                chain,
                "pg",
                () => resolve(null),
                (error) => resolve(error),
            );
        });
        expect(received).toBe(failure);
    });
});

describe("getSampleData", () => {
    function createTableConnection(calls) {
        return (tableRef) => {
            calls.tableRefs.push(tableRef);
            const builder = {
                select: (columns) => {
                    calls.selects.push(columns);
                    return builder;
                },
                limit: async (limit) => {
                    calls.limits.push(limit);
                    return [];
                },
            };
            return builder;
        };
    }

    test("qualifies the table with the given schema", async () => {
        const calls = { tableRefs: [], selects: [], limits: [] };
        await getSampleData(createTableConnection(calls), "assets", 10, "pg", "staging");
        expect(calls.tableRefs).toStrictEqual(['"staging"."assets"']);
        expect(calls.limits).toStrictEqual([10]);
    });

    test("falls back to the driver default schema", async () => {
        const calls = { tableRefs: [], selects: [], limits: [] };
        await getSampleData(createTableConnection(calls), "assets", 10, "mssql");
        expect(calls.tableRefs).toStrictEqual(['"dbo"."assets"']);
    });
});
