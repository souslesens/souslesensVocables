import fs from "fs";
import csvParser from "csv-parser";

const reservedWords = new Set(["insert", "delete", "update", "select", "drop", "and", "or", "from", "create", "join", "limit", "table", "order", "user", "not", "where", "group"]);

// Mirrors csv-to-db-py's TYPE_MAP for the two supported dialects (knex client names).
const typeMap = {
    pg: { int: "INTEGER", float: "FLOAT", bool: "BOOLEAN", datetime: "TIMESTAMP", str: "TEXT" },
    mssql: { int: "INTEGER", float: "FLOAT", bool: "BIT", datetime: "DATETIME2", str: "NVARCHAR(MAX)" },
};

// Native driver type name -> inferred category, used to detect type drift on an existing table.
const dbTypeCategories = {
    pg: {
        integer: "int",
        bigint: "int",
        smallint: "int",
        "double precision": "float",
        real: "float",
        numeric: "float",
        decimal: "float",
        boolean: "bool",
        "timestamp without time zone": "datetime",
        "timestamp with time zone": "datetime",
        date: "datetime",
        text: "str",
        "character varying": "str",
        character: "str",
    },
    mssql: {
        int: "int",
        bigint: "int",
        smallint: "int",
        tinyint: "int",
        float: "float",
        real: "float",
        decimal: "float",
        numeric: "float",
        money: "float",
        bit: "bool",
        datetime2: "datetime",
        datetime: "datetime",
        datetimeoffset: "datetime",
        date: "datetime",
        smalldatetime: "datetime",
        text: "str",
        nvarchar: "str",
        varchar: "str",
        nchar: "str",
        char: "str",
    },
};

const intRegex = /^[+-]?\d+$/;
const floatRegex = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const boolValues = new Set(["true", "false"]);

// Date formats tried in the same order as csv-to-db-py's `common_formats`.
// Each entry's `parts` maps the regex groups to a date component; `frac` is fractional seconds.
const dateFormats = [
    { re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parts: ["y", "m", "d"] },
    { re: /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/, parts: ["y", "m", "d", "H", "M", "S"] },
    { re: /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})\.(\d+)$/, parts: ["y", "m", "d", "H", "M", "S", "frac"] },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parts: ["d", "m", "y"] },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/, parts: ["d", "m", "y", "H", "M", "S"] },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, parts: ["d", "m", "y2"] },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parts: ["m", "d", "y"] },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/, parts: ["m", "d", "y", "H", "M", "S"] },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{1,2}):(\d{1,2}) ([AP]M)$/i, parts: ["m", "d", "y", "H", "M", "S", "ampm"] },
    { re: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, parts: ["d", "m", "y"] },
    { re: /^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/, parts: ["d", "m", "y", "H", "M", "S"] },
    { re: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parts: ["d", "m", "y"] },
    { re: /^(\d{1,2})-(\d{1,2})-(\d{4})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/, parts: ["d", "m", "y", "H", "M", "S"] },
    { re: /^(\d{1,2})-(\d{1,2})-(\d{2})$/, parts: ["d", "m", "y2"] },
    { re: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, parts: ["y", "m", "d"] },
    { re: /^(\d{4})\/(\d{1,2})\/(\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/, parts: ["y", "m", "d", "H", "M", "S"] },
];

const isUseful = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const pad = (value, length = 2) => String(value).padStart(length, "0");

const normalizeColumn = (name) => {
    let normalized = name
        .trim()
        .toLowerCase()
        .replace(/[^0-9a-zA-Z_]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (reservedWords.has(normalized)) {
        normalized = `${normalized}_1`;
    }
    return normalized;
};

const normalizeColumns = (headers) => {
    const seen = new Map();
    return headers.map((header) => {
        const base = normalizeColumn(header);
        const count = (seen.get(base) ?? 0) + 1;
        seen.set(base, count);
        return count === 1 ? base : `${base}_${count}`;
    });
};

// Returns the value as a naive "YYYY-MM-DD HH:MM:SS[.fff]" string (no timezone), or null.
// A naive string keeps the stored wall-clock independent of the server timezone and mirrors
// csv-to-db-py, which stores naive datetimes.
const parseWithFormat = (value, format) => {
    const match = format.re.exec(value);
    if (!match) return null;
    const parts = {};
    format.parts.forEach((part, index) => {
        parts[part] = match[index + 1];
    });
    let year = parts.y !== undefined ? parseInt(parts.y, 10) : parseInt(parts.y2, 10);
    if (parts.y2 !== undefined) year = year <= 68 ? 2000 + year : 1900 + year;
    const month = parseInt(parts.m, 10);
    const day = parseInt(parts.d, 10);
    let hour = parts.H !== undefined ? parseInt(parts.H, 10) : 0;
    const minute = parts.M !== undefined ? parseInt(parts.M, 10) : 0;
    const second = parts.S !== undefined ? parseInt(parts.S, 10) : 0;
    if (parts.ampm) {
        const upper = parts.ampm.toUpperCase();
        if (hour === 12) hour = upper === "AM" ? 0 : 12;
        else if (upper === "PM") hour += 12;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    const stamp = `${pad(year, 4)}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
    return parts.frac ? `${stamp}.${parts.frac}` : stamp;
};

// Returns the first date format parsing every useful value, or null. Mirrors csv-to-db-py's
// `detect_and_parse_datetime_column` with a 1.0 threshold (the default when the route sets none).
const detectDatetime = (values, threshold = 1) => {
    const useful = values.filter(isUseful).map(String);
    if (useful.length === 0) return null;
    for (const format of dateFormats) {
        const parsed = useful.filter((value) => parseWithFormat(value, format) !== null).length;
        if (parsed / useful.length >= threshold) return format;
    }
    return null;
};

const inferColumnType = (values) => {
    let hasInt = false;
    let hasFloat = false;
    let hasBool = false;
    let hasStr = false;
    for (const value of values) {
        if (!isUseful(value)) continue;
        const text = String(value);
        if (boolValues.has(text.toLowerCase())) hasBool = true;
        else if (intRegex.test(text)) hasInt = true;
        else if (floatRegex.test(text)) hasFloat = true;
        else hasStr = true;
    }
    if (hasStr || (hasBool && (hasInt || hasFloat))) return "str";
    if (hasFloat) return "float";
    if (hasInt) return "int";
    if (hasBool) return "bool";
    return "str";
};

const toTypedValue = (value, type, format) => {
    if (!isUseful(value)) return null;
    switch (type) {
        case "int":
            return parseInt(value, 10);
        case "float":
            return parseFloat(value);
        case "bool":
            return String(value).toLowerCase() === "true";
        case "datetime":
            return format ? parseWithFormat(String(value), format) : null;
        default:
            return String(value);
    }
};

const parseCsv = (csvPath, delimiter) =>
    new Promise((resolve, reject) => {
        const rows = [];
        let headers = [];
        fs.createReadStream(csvPath)
            .pipe(csvParser({ separator: delimiter }).on("headers", (parsedHeaders) => (headers = parsedHeaders)))
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve({ headers, rows }))
            .on("error", reject);
    });

const buildColumnPlan = (headers, rows) => {
    const normalized = normalizeColumns(headers);
    const originalToNormalized = new Map(headers.map((header, index) => [header, normalized[index]]));
    const types = {};
    const formats = {};
    normalized.forEach((name, index) => {
        const values = rows.map((row) => row[headers[index]]);
        let type = inferColumnType(values);
        let format = null;
        if (type === "str") {
            format = detectDatetime(values);
            if (format) type = "datetime";
        }
        types[name] = type;
        formats[name] = format;
    });
    return { originalToNormalized, types, formats };
};

const buildRows = (rows, originalToNormalized, types, formats) =>
    rows
        .map((row) => {
            const typed = {};
            for (const [original, name] of originalToNormalized) {
                typed[name] = toTypedValue(row[original], types[name], formats[name]);
            }
            return typed;
        })
        .filter((row) => Object.values(row).some((value) => value !== null));

const sameColumnSet = (left, right) => {
    const a = [...left].sort();
    const b = [...right].sort();
    return a.length === b.length && a.every((name, index) => name === b[index]);
};

const driftError = (table, columns, kind) => {
    const error = new Error(`${kind} drift on table "${table}" for columns: ${columns.join(", ")}`);
    error.status = 400;
    return error;
};

/**
 * Loads a CSV file into a Postgres or SQLServer table, mirroring csv-to-db-py:
 * creates the table with inferred column types when missing, truncates it when
 * it exists with the same columns and types, and refuses on column or type drift.
 *
 * @param {object} params
 * @param {any} params.connection - knex connection (pg or mssql client)
 * @param {string} params.client - knex client name ("pg" or "mssql")
 * @param {string} params.table - target table name
 * @param {string} params.csvPath - path to the CSV file
 * @param {string} params.delimiter - CSV delimiter
 * @param {number} [params.batchSize] - rows per insert batch
 */
const loadCsvToDatabase = async ({ connection, client, table, csvPath, delimiter = ",", batchSize = 1000 }) => {
    if (!typeMap[client]) {
        const error = new Error(`Unsupported database driver: ${client}`);
        error.status = 400;
        throw error;
    }

    const { headers, rows } = await parseCsv(csvPath, delimiter);
    if (headers.length === 0) {
        const error = new Error("The CSV file has no header row");
        error.status = 400;
        throw error;
    }

    const { originalToNormalized, types, formats } = buildColumnPlan(headers, rows);

    if (await connection.schema.hasTable(table)) {
        const existingColumns = await connection(table).columnInfo();
        const expected = Object.keys(types);
        const existing = Object.keys(existingColumns);
        if (!sameColumnSet(existing, expected)) {
            const mismatched = existing.filter((name) => !expected.includes(name)).concat(expected.filter((name) => !existing.includes(name)));
            throw driftError(table, mismatched, "Column");
        }
        const typeDrift = expected.filter((name) => {
            const actual = dbTypeCategories[client]?.[String(existingColumns[name].type).toLowerCase()];
            return actual !== undefined && actual !== types[name];
        });
        if (typeDrift.length > 0) {
            throw driftError(table, typeDrift, "Type");
        }
        await connection(table).truncate();
    } else {
        await connection.schema.createTable(table, (builder) => {
            for (const [name, type] of Object.entries(types)) {
                builder.specificType(name, typeMap[client][type]);
            }
        });
    }

    const data = buildRows(rows, originalToNormalized, types, formats);
    if (data.length > 0) {
        await connection.batchInsert(table, data, batchSize);
    }
    return { table, rowCount: data.length };
};

export { normalizeColumn, normalizeColumns, inferColumnType, toTypedValue, detectDatetime, parseWithFormat, loadCsvToDatabase };
