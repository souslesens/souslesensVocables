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

/**
 * Get filtered mapping IDs for specific tables (includes both nodes and edges)
 * @param {Object} mappingData - The mapping data structure
 * @param {Array<string>} tables - Array of table names
 * @returns {Array<string>|null} Array of mapping IDs or null
 */
function getFilteredMappingIds(mappingData, tables) {
    if (!tables || tables.length === 0) return null;

    var mappingIds = [];
    var columnsMap = {};

    // First pass: build columnsMap with ALL nodes of the target tables
    // Then add to mappingIds only master nodes or nodes with otherPredicates
    (mappingData.nodes || []).forEach(function (n) {
        if (!n || !n.data || !n.id) return;

        if (MappingParser.columnsMappingsObjects.indexOf(n.data.type) > -1) {
            if (tables.indexOf(n.data.dataTable) > -1) {
                // Add to columnsMap (used for edge filtering)
                columnsMap[n.id] = n;

                // Add to mappingIds only if master node or has otherPredicates
                // Same logic as frontend showFilterMappingsDialog line 812
                if (!n.data.definedInColumn || (n.data.otherPredicates && n.data.otherPredicates.length > 0)) {
                    if (mappingIds.indexOf(n.id) < 0) {
                        mappingIds.push(n.id);
                    }
                }
            }
        }
    });

    // Second pass: collect edges where BOTH endpoints are in columnsMap
    // Same logic as frontend showFilterMappingsDialog line 824
    (mappingData.edges || []).forEach(function (e) {
        if (!e || !e.id) return;

        // Include edge if BOTH from and to are in columnsMap
        if (columnsMap[e.from] && columnsMap[e.to]) {
            if (mappingIds.indexOf(e.id) < 0) {
                mappingIds.push(e.id);
            }
        }
    });

    return mappingIds.length > 0 ? mappingIds : null;
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

    // Get datasource from mappings for the first table
    var datasource = null;
    if (targetTables && targetTables.length > 0) {
        datasource = getDatasourceFromMappings(mappingData, targetTables[0]);
    }

    // Filter mappings for target tables (server-side filtering)
    if (targetTables && targetTables.length > 0 && !options.filterMappingIds) {
        options.filterMappingIds = getFilteredMappingIds(mappingData, targetTables);
    }

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
