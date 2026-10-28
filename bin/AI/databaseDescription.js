// the database as the ontology prompts read it: per table its rows, its columns with their profile, its keys and its sample rows
// tableInspections: { table: { profile, profileError, sampleTexts, sampleError } }, as the runs save them in databaseChecks.json
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
        // the description read by the link candidates step is written before the profiles are counted
        if (inspection.profile) {
            databaseDescription += "Rows: " + inspection.profile.rowCount + "\n";
        } else if (inspection.profileError) {
            databaseDescription += "Rows: not counted (" + inspection.profileError + ")\n";
        }
        databaseDescription += "Columns: " + columnTexts.join(", ") + "\n";
        if (primaryKeyColumnsByTable[tableName]) {
            databaseDescription += "Primary key: (" + primaryKeyColumnsByTable[tableName].join(", ") + ")\n";
        }
        const foreignKeys = foreignKeysByTable[tableName] || {};
        for (const [constraintName, foreignKey] of Object.entries(foreignKeys)) {
            databaseDescription +=
                "Foreign key " + constraintName + ": (" + foreignKey.columns.join(", ") + ") -> " + foreignKey.referencedTable + "(" + foreignKey.referencedColumns.join(", ") + ")\n";
        }

        if (!inspection.sampleTexts) {
            databaseDescription += "Sample rows: unavailable (" + inspection.sampleError + ")\n";
            continue;
        }
        databaseDescription += "Sample rows:\n" + inspection.sampleTexts.join("\n") + "\n";
    }
    return databaseDescription;
}

export { describeDatabase };
