const lineBreakRegex = /\s*[\r\n]+\s*/g;
const sampleValueMaxLength = 100;
// YYYY-MM-DD
const dateTextLength = 10;

// the database as the ontology prompts read it: per table its comments, its rows, its columns with their profile, its keys and its sample rows
// tableInspections: { table: { profile, profileError, sampleTexts, sampleError } }, as the runs save them in databaseChecks.json; a schema file gives none of them
function describeDatabase(database, schema, columnsByTable, tableInspections) {
    const primaryKeyColumnsByTable = {};
    schema.primaryKeys.forEach(function (keyColumn) {
        if (!primaryKeyColumnsByTable[keyColumn.table_name]) {
            primaryKeyColumnsByTable[keyColumn.table_name] = [];
        }
        primaryKeyColumnsByTable[keyColumn.table_name].push(keyColumn.column_name);
    });
    const foreignKeysByTable = {};
    schema.foreignKeys.forEach(function (keyColumn) {
        if (!foreignKeysByTable[keyColumn.table_name]) {
            foreignKeysByTable[keyColumn.table_name] = {};
        }
        if (!foreignKeysByTable[keyColumn.table_name][keyColumn.constraint_name]) {
            foreignKeysByTable[keyColumn.table_name][keyColumn.constraint_name] = { columns: [], referencedTable: keyColumn.referenced_table, referencedColumns: [] };
        }
        const foreignKey = foreignKeysByTable[keyColumn.table_name][keyColumn.constraint_name];
        foreignKey.columns.push(keyColumn.column_name);
        foreignKey.referencedColumns.push(keyColumn.referenced_column);
    });
    const tableCommentByTable = {};
    const columnCommentTextsByTable = {};
    schema.comments.forEach(function (objectComment) {
        const commentText = objectComment.comment.replace(lineBreakRegex, " ");
        if (!objectComment.column_name) {
            tableCommentByTable[objectComment.table_name] = commentText;
            return;
        }
        if (!columnCommentTextsByTable[objectComment.table_name]) {
            columnCommentTextsByTable[objectComment.table_name] = [];
        }
        columnCommentTextsByTable[objectComment.table_name].push(objectComment.column_name + ": " + commentText);
    });

    let databaseDescription = "Database " + database.database + " (" + database.driver + ")\n";
    for (const tableName of Object.keys(columnsByTable)) {
        const inspection = tableInspections[tableName];
        const columnTexts = columnsByTable[tableName].map(function (column) {
            const nullability = column.is_nullable == "NO" ? ", NOT NULL" : "";
            const columnProfile = inspection.profile ? inspection.profile.columnsByName[column.column_name] : null;
            const profileText = columnProfile ? ", " + columnProfile.distinctCount + " distinct, " + (inspection.profile.rowCount - columnProfile.filledCount) + " null" : "";
            return column.column_name + " (" + column.data_type + nullability + profileText + ")";
        });
        databaseDescription += "\nTable " + tableName + "\n";
        if (tableCommentByTable[tableName]) {
            databaseDescription += "Comment: " + tableCommentByTable[tableName] + "\n";
        }
        // the description read by the link candidates step is written before the profiles are counted
        if (inspection.profile) {
            databaseDescription += "Rows: " + inspection.profile.rowCount + "\n";
        } else if (inspection.profileError) {
            databaseDescription += "Rows: not counted (" + inspection.profileError + ")\n";
        }
        databaseDescription += "Columns: " + columnTexts.join(", ") + "\n";
        if (columnCommentTextsByTable[tableName]) {
            databaseDescription += "Column comments:\n" + columnCommentTextsByTable[tableName].join("\n") + "\n";
        }
        if (primaryKeyColumnsByTable[tableName]) {
            databaseDescription += "Primary key: (" + primaryKeyColumnsByTable[tableName].join(", ") + ")\n";
        }
        const foreignKeys = foreignKeysByTable[tableName] || {};
        for (const [constraintName, foreignKey] of Object.entries(foreignKeys)) {
            databaseDescription +=
                "Foreign key " + constraintName + ": (" + foreignKey.columns.join(", ") + ") -> " + foreignKey.referencedTable + "(" + foreignKey.referencedColumns.join(", ") + ")\n";
        }

        if (inspection.sampleTexts) {
            databaseDescription += "Sample rows:\n" + inspection.sampleTexts.join("\n") + "\n";
        } else if (inspection.sampleError) {
            databaseDescription += "Sample rows: unavailable (" + inspection.sampleError + ")\n";
        }
    }
    return databaseDescription;
}

// one line per sample row, values as the prompt shows them: saved as text, they read the same at every run
function getSampleTexts(rows, columns) {
    const columnTypes = {};
    columns.forEach(function (column) {
        columnTypes[column.column_name] = column.data_type;
    });
    return rows.map(function (row) {
        const values = Object.entries(row).map(function ([columnName, value]) {
            if (value === null || value === undefined) {
                return "NULL";
            }
            if (Buffer.isBuffer(value)) {
                return "<binary>";
            }
            let valueText;
            if (value instanceof Date) {
                // pg reads a stored date in the server time zone: its local fields are the stored value
                valueText = value.toLocaleString("sv-SE");
                if (columnTypes[columnName] == "date") {
                    valueText = valueText.substring(0, dateTextLength);
                }
            } else if (typeof value == "object") {
                valueText = JSON.stringify(value);
            } else {
                valueText = String(value);
            }
            valueText = valueText.replace(lineBreakRegex, " ");
            if (valueText.length > sampleValueMaxLength) {
                valueText = valueText.substring(0, sampleValueMaxLength) + "...";
            }
            return valueText;
        });
        return values.join(" | ");
    });
}

export { describeDatabase, getSampleTexts };
