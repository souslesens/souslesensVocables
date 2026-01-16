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
    let options = {};
    if (!body || !body.options) return options;

    if (typeof body.options === "string") {
        try {
            var parsed = JSON.parse(body.options);
            if (parsed && typeof parsed === "object") {
                options = parsed;
            } else {
                options.clientSocketId = body.options;
            }
        } catch (e) {
            options.clientSocketId = body.options;
        }
    } else if (typeof body.options === "object") {
        options = body.options;
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

function normalizeTablesParam(tableParam) {
 
    if (!tableParam) return [];
    if (Array.isArray(tableParam)) return tableParam;
    return [tableParam];
}

function importAsync(user, source, datasource, tablesArray, options) {
    return new Promise(function (resolve, reject) {
        KGbuilder_main.importTriplesFromCsvOrTable(user, source, datasource, tablesArray, options, function (err, result) {
            if (err) return reject(err);
            return resolve(result);
        });
    });
}

/**
 * Recreate triples:
 * - body.table = [] ou absent => delete all + recreate all tables
 * - body.table = ["t1","t2"]  => delete t1,t2 + recreate t1,t2
 */
async function recreateGraphTriples(params) {
    var user = params.user;
    var source = params.source;
    var body = params.body || {};
    var skipDelete = body.skipDelete === true;

  
    let options = getOptionsFromBody(body);


    if (typeof options.filterMappingIds === "undefined") {
        options.filterMappingIds = null;
    } else {
        options.filterMappingIds = options.filterMappingIds || null;
    }

    // mappings
    const mappingData = await getMappingsDataAsync(source);

    
    var requestedTables = normalizeTablesParam(body.table);

    
    var targetTables = requestedTables;
    if (!targetTables || targetTables.length === 0) {
        targetTables = getAllTablesFromMappings(mappingData);
    }

    // DELETE
    var deleteResult = null;
    if (!skipDelete) {
        var tablesArgForDelete = requestedTables && requestedTables.length > 0 ? targetTables : [];
        deleteResult = await deleteKGBuilderTriplesAsync(source, tablesArgForDelete, options);
    }

 
    var datasource = null;

    const importResult = await importAsync(user, source, datasource, targetTables, options);

    return {
        deleteResult: deleteResult,
        result: importResult,
        mode: requestedTables && requestedTables.length > 0 ? "SELECTED_TABLES" : "ALL_TABLES",
        table: requestedTables && requestedTables.length > 0 ? targetTables : "ALL",
        tablesProcessed: targetTables,
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
