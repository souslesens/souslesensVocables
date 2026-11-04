import { parse } from "pgsql-ast-parser";

// the first bytes of a dump in the custom format of pg_dump
const customDumpSignature = "PGDMP";
const postgresDefaultSchema = "public";

// pg_dump writes the rows of a table between "COPY ... FROM stdin;" and a line holding \.
const copyBlockRegex = /^COPY\s[^\n]*FROM stdin;\r?\n[\s\S]*?^\\\.\r?$/gm;
// psql commands as \restrict, which no SQL parser reads
const psqlCommandLineRegex = /^\\[^\n]*$/gm;
// a semicolon ends a statement, unless one of the other alternatives holds it
const statementTokenRegex = /'[^']*'|"[^"]*"|--[^\n]*|\/\*[\s\S]*?\*\/|\$(\w*)\$[\s\S]*?\$\1\$|;/g;
const domainStatementRegex = /^CREATE\s+DOMAIN\s+(?:"?\w+"?\.)?"?([^"\s]+)"?\s+AS\s+(.+?)(\s+NOT\s+NULL)?(?:\s+(?:DEFAULT|CONSTRAINT|CHECK)\b.*)?$/is;
const typeLengthRegex = /\s*\(.*\)/s;
const viewStatementRegex = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\b/i;
// the parser fails on the other statements of a dump, none of which the description needs
const readStatementRegex = /^(?:CREATE\s+(?:UNLOGGED\s+)?TABLE|ALTER\s+TABLE\s[^;]*?\sADD\s+(?:CONSTRAINT\s+\S+\s+)?(?:PRIMARY|FOREIGN)\s+KEY|COMMENT\s+ON\s+(?:TABLE|COLUMN))\b/i;
const shownUnreadStatementLength = 100;
const shownUnreadStatementCount = 5;

function getSqlStatements(sqlText) {
    const sqlWithoutRows = sqlText.replace(copyBlockRegex, "");
    const sqlWithoutCommands = sqlWithoutRows.replace(psqlCommandLineRegex, "");
    const sqlWithoutComments = sqlWithoutCommands.replace(statementTokenRegex, function (token) {
        return token.startsWith("--") || token.startsWith("/*") ? " " : token;
    });
    const statements = [];
    let statementStart = 0;
    for (const token of sqlWithoutComments.matchAll(statementTokenRegex)) {
        if (token[0] == ";") {
            statements.push(sqlWithoutComments.slice(statementStart, token.index).trim());
            statementStart = token.index + 1;
        }
    }
    return statements;
}

function isInDefaultSchema(tableReference) {
    return !tableReference.schema || tableReference.schema == postgresDefaultSchema;
}

// a domain reads as the type it wraps, as information_schema gives it; the length of a type is not part of data_type either
function getColumnTypeName(dataType, domainsByName) {
    if (dataType.kind == "array") {
        return getColumnTypeName(dataType.arrayOf, domainsByName) + "[]";
    }
    return domainsByName[dataType.name]?.typeName ?? dataType.name;
}

function addKeyConstraint(schema, tableName, constraint) {
    if (constraint.type == "primary key") {
        constraint.columns.forEach(function (keyColumn) {
            schema.primaryKeys.push({ table_name: tableName, column_name: keyColumn.name });
        });
    }
    if (constraint.type == "foreign key") {
        const localColumnNames = constraint.localColumns.map((localColumn) => localColumn.name);
        // the name postgres gives a foreign key declared without one
        const constraintName = constraint.constraintName?.name ?? tableName + "_" + localColumnNames.join("_") + "_fkey";
        localColumnNames.forEach(function (columnName, columnPosition) {
            schema.foreignKeys.push({
                constraint_name: constraintName,
                table_name: tableName,
                column_name: columnName,
                referenced_table: constraint.foreignTable.name,
                referenced_column: constraint.foreignColumns[columnPosition].name,
            });
        });
    }
}

function addTable(schema, tableStatement, domainsByName) {
    const tableName = tableStatement.name.name;
    tableStatement.columns.forEach(function (column) {
        if (column.kind != "column") {
            return;
        }
        const columnConstraints = column.constraints || [];
        const isPrimaryKey = columnConstraints.some((constraint) => constraint.type == "primary key");
        const isNotNull = columnConstraints.some((constraint) => constraint.type == "not null");
        schema.columns.push({
            table_name: tableName,
            column_name: column.name.name,
            data_type: getColumnTypeName(column.dataType, domainsByName),
            is_nullable: isPrimaryKey || isNotNull || domainsByName[column.dataType.name]?.isNotNull ? "NO" : "YES",
        });
        if (isPrimaryKey) {
            schema.primaryKeys.push({ table_name: tableName, column_name: column.name.name });
        }
        const inlineReference = columnConstraints.find((constraint) => constraint.type == "reference");
        if (inlineReference) {
            addKeyConstraint(schema, tableName, { ...inlineReference, type: "foreign key", localColumns: [column.name] });
        }
    });
    (tableStatement.constraints || []).forEach(function (constraint) {
        addKeyConstraint(schema, tableName, constraint);
    });
}

// the public schema only, as getSchemaDescription; a view declares no columns: it is left out
function readSchemaFile(sqlText) {
    if (sqlText.startsWith(customDumpSignature)) {
        return { error: "this file is a binary pg_dump: export the schema again with the format Plain" };
    }
    const schema = { columns: [], primaryKeys: [], foreignKeys: [], comments: [] };
    const domainsByName = {};
    const leftOutTables = [];
    const unreadStatements = [];
    const parsedComments = [];
    let leftOutViewCount = 0;
    for (const statement of getSqlStatements(sqlText)) {
        const domainMatch = statement.match(domainStatementRegex);
        if (domainMatch) {
            const [, domainName, domainType, notNullClause] = domainMatch;
            const typeWithoutLength = domainType.replace(typeLengthRegex, "");
            domainsByName[domainName] = { typeName: typeWithoutLength.toLowerCase(), isNotNull: Boolean(notNullClause) };
            continue;
        }
        if (viewStatementRegex.test(statement)) {
            leftOutViewCount++;
            continue;
        }
        if (!readStatementRegex.test(statement)) {
            continue;
        }
        let parsedStatement;
        try {
            [parsedStatement] = parse(statement);
        } catch (_parseError) {
            unreadStatements.push(statement.slice(0, shownUnreadStatementLength));
            continue;
        }
        if (parsedStatement.type == "create table") {
            if (isInDefaultSchema(parsedStatement.name)) {
                addTable(schema, parsedStatement, domainsByName);
            } else {
                leftOutTables.push(parsedStatement.name.schema + "." + parsedStatement.name.name);
            }
        } else if (parsedStatement.type == "alter table" && isInDefaultSchema(parsedStatement.table)) {
            parsedStatement.changes.forEach(function (tableChange) {
                if (tableChange.type == "add constraint") {
                    addKeyConstraint(schema, parsedStatement.table.name, tableChange.constraint);
                }
            });
        } else if (parsedStatement.type == "comment") {
            parsedComments.push(parsedStatement);
        }
    }
    // a table or a key missing would silently change the ontology
    if (unreadStatements.length > 0) {
        const shownStatements = unreadStatements.slice(0, shownUnreadStatementCount);
        return { error: unreadStatements.length + " statements could not be read, only a plain SQL dump of a Postgres database can be: " + shownStatements.join(" | ") };
    }
    if (schema.columns.length == 0) {
        return { error: "no table found in the public schema of this file: only a plain SQL dump of a Postgres database can be read" };
    }
    // a comment may be on a view or on a table left out
    const readTableNames = new Set(schema.columns.map((column) => column.table_name));
    parsedComments.forEach(function (parsedComment) {
        const isColumnComment = parsedComment.on.type == "column";
        const commentedColumn = parsedComment.on.column;
        const tableName = isColumnComment ? commentedColumn.table : parsedComment.on.name.name;
        const tableSchema = isColumnComment ? commentedColumn.schema : parsedComment.on.name.schema;
        if (readTableNames.has(tableName) && isInDefaultSchema({ schema: tableSchema })) {
            schema.comments.push({ table_name: tableName, column_name: isColumnComment ? commentedColumn.column : null, comment: parsedComment.comment });
        }
    });
    return { schema: schema, leftOutViewCount: leftOutViewCount, leftOutTables: leftOutTables };
}

export { readSchemaFile };
