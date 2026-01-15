"use strict";

const path = require("path");

const KGbuilder_main = require(path.resolve("bin/KGbuilder/KGbuilder_main.js"));
const MappingParser = require(path.resolve("bin/KGbuilder/mappingsParser.js"));

function deleteKGBuilderTriplesAsync(source, tables, options) {
    return new Promise(function (resolve, reject) {
        try {
            KGbuilder_main.deleteKGBuilderTriples(source, tables, options || {}, function (err, result) {
                if (err) return reject(err);
                return resolve(result);
            });
        } catch (e) {
            return reject(e);
        }
    });
}

function getMappingsDataAsync(source) {
    return new Promise(function (resolve, reject) {
        MappingParser.getMappingsData(source, function (err, data) {
            if (err) return reject(err);
            return resolve(data);
        });
    });
}

function getOptionsFromBody(body) {
    var options = {};
    if (!body || body.options == null) return options;

    if (typeof body.options === "string") {
        var str = body.options.trim();
        if (!str) return options;

        try {
            var parsed = JSON.parse(str);
            if (parsed && typeof parsed === "object") {
                return parsed;
            }
        } catch (e) {
            options.clientSocketId = str;
            return options;
        }
        return options;
    }

    if (typeof body.options === "object") {
        return body.options || {};
    }

    return options;
}

function getDatasourceFromMappings(mappingData, table) {
    if (!table) return null;

    const tableNode = (mappingData.nodes || []).find(function (n) {
        return n && n.data && n.data.type === "Table" && n.data.dataTable === table;
    });

    if (tableNode && tableNode.data && tableNode.data.datasource) {
        return tableNode.data.datasource;
    }
    return null;
}

function getAllTablesFromMappings(mappingData) {
    var tables = [];
    var tablesWithColumns = {};

    (mappingData.nodes || []).forEach(function (n) {
        if (!n || !n.data) return;
        if (MappingParser.columnsMappingsObjects.indexOf(n.data.type) > -1 && n.data.dataTable) {
            tablesWithColumns[n.data.dataTable] = 1;
        }
    });

    (mappingData.nodes || []).forEach(function (n) {
        if (!n || !n.data) return;
        if (n.data.type === "Table" && n.data.dataTable) {
            if (tablesWithColumns[n.data.dataTable]) {
                if (tables.indexOf(n.data.dataTable) < 0) {
                    tables.push(n.data.dataTable);
                }
            }
        }
    });

    return tables;
}

function importAsync(user, source, datasource, table, options) {
    return new Promise(function (resolve, reject) {
        KGbuilder_main.importTriplesFromCsvOrTable(
            user,
            source,
            datasource,
            table ? [table] : null,
            options,
            function (err, result) {
                if (err) return reject(err);
                return resolve(result);
            }
        );
    });
}

async function recreateGraphTriples(params) {
    var user = params.user;
    var source = params.source;
    var table = params.table;
    var body = params.body || {};

    var skipDelete = body.skipDelete === true;

    let options = getOptionsFromBody(body);
    options.filterMappingIds = null;

    const mappingData = await getMappingsDataAsync(source);

    // DELETE
    var deleteResult = null;
    if (!skipDelete) {
        // IMPORTANT: null => delete ALL
        var tablesArg = table ? [table] : null;
        deleteResult = await deleteKGBuilderTriplesAsync(source, tablesArg, options);
    }

    // RECREATE
    if (table) {
        let datasource = getDatasourceFromMappings(mappingData, table);
        const importResult = await importAsync(user, source, datasource, table, options);
        return {
            deleteResult: deleteResult,
            result: importResult,
            mode: "ONE_TABLE",
            table: table,
        };
    }

    const tables = getAllTablesFromMappings(mappingData);

    var resultsByTable = {};
    for (var i = 0; i < tables.length; i++) {
        var t = tables[i];
        let datasource = getDatasourceFromMappings(mappingData, t);
        const r = await importAsync(user, source, datasource, t, options);
        resultsByTable[t] = r;
    }

    return {
        deleteResult: deleteResult,
        result: resultsByTable,
        mode: "ALL_TABLES",
        table: "ALL",
    };
}

module.exports = {
    deleteKGBuilderTriplesAsync: deleteKGBuilderTriplesAsync,
    getMappingsDataAsync: getMappingsDataAsync,
    getOptionsFromBody: getOptionsFromBody,
    getDatasourceFromMappings: getDatasourceFromMappings,
    getAllTablesFromMappings: getAllTablesFromMappings,
    importAsync: importAsync,
    recreateGraphTriples: recreateGraphTriples,
};
