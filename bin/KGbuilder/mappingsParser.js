const path = require("path");
const async = require("async");
const fs = require("fs");

/**

@module MappingParser

@description Loads Vis.js mapping graphs and derives column-level mapping models.

Exposes: getMappingsData, getColumnsMap, setAllColumnsLabelAndType, setTableColumnsOtherPredicates.

Extracts rdf:type/rdfs:label triples, column-to-column edges (with restriction detection), and other predicates.

Utilities: isConstantUri, isConstantPrefixedUri, getTypeAndLabelMappings, getOtherPredicates.

Builds executable per-column transform functions from strings (getJsFunctionsMap).

Depends on: path, fs, async.
*/
var MappingParser = {
    columnsMappingsObjects: ["Column", "RowIndex", "VirtualColumn", "URI"],
    getMappingsData: function (source, callback) {
        var mappingGraphDir = path.join(__dirname, "../../data/graphs/");
        var file = mappingGraphDir + "mappings_" + source + "_ALL.json";
        var visjsData;
        try {
            visjsData = JSON.parse("" + fs.readFileSync(file));
        } catch (e) {
            return callback(e);
        }
        return callback(null, visjsData);
    },
    /**
     * get the vijsData of the mappings and extract tripleModels  for each Column in the field mappings
     *
     *
     * @param mappingData  nodes and edges at visjs format
     * @param table
     * @param callback
     */
    getColumnsMap: function (mappingData, table, callback) {
        var edgesFromMap = {};
        var nodesMap = {};
        var columnsMap = {};

        mappingData.edges.forEach(function (edge) {
            if (!edgesFromMap[edge.from]) {
                edgesFromMap[edge.from] = [];
            }
            edgesFromMap[edge.from].push(edge);
        });
        mappingData.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
            if (node.data.type == "Column") {
                columnsMap[node.id] = node.data;
            } else if (node.data.type == "RowIndex") {
                columnsMap[node.id] = node.data;
            } else if (node.data.type == "VirtualColumn") {
                columnsMap[node.id] = node.data;
            } else if (node.data.type == "URI") {
                columnsMap[node.id] = node.data;
            }
            if (columnsMap[node.id]) {
                columnsMap[node.id].mappings = [];
            }
        });

        return callback(null, columnsMap);
    },

    /**
     *  add basic mappings : rdf:type(s), label, [subClassOf], to all caolumns ids including  columns  in another column (definedInColumn)
     * @param mappingData
     * @param allColumnsMappings
     */
    setAllColumnsLabelAndType: function (mappingData, allColumnsMappings) {
        var nodesMap = {};
        mappingData.nodes.forEach(function (node) {
            nodesMap[node.id] = node.data;
        });
        mappingData.edges.forEach(function (edge) {
            var fromNodeData = nodesMap[edge.from];
            if (fromNodeData && fromNodeData.definedInColumn) {
                fromNodeData = allColumnsMappings[fromNodeData.definedInColumn];
            }
            if (fromNodeData && fromNodeData.type == "Column") {
                if (allColumnsMappings[edge.from].mappings.length == 0) {
                    var toNodeData = nodesMap[edge.to];

                    if (toNodeData && toNodeData.type == "Class") {
                        mappings = MappingParser.getTypeAndLabelMappings(fromNodeData, toNodeData);
                        mappings.forEach(function (mapping) {
                            mapping.isConstantUri = MappingParser.isConstantUri(mapping.o);
                            mapping.isConstantPrefixedUri = MappingParser.isConstantPrefixedUri(mapping.o);
                        });
                        allColumnsMappings[edge.from].mappings = allColumnsMappings[edge.from].mappings.concat(mappings);
                    } else {
                    }
                }
            }
        });
    },
    /**
     * @function
     * @name setTableColumnsOtherPredicates
     * @memberof module:MappingParser
     * Appends "otherPredicates" triples to each column’s `mappings`, tagging constants (URI or prefixed URI).
     * @param {Object<string,Object>} tablecolumnsMap - Map of columnId → column data; each entry must have a `mappings` array.
     * @returns {void}
     */

    setTableColumnsOtherPredicates: function (tablecolumnsMap) {
        for (var columnId in tablecolumnsMap) {
            var fromNodeData = tablecolumnsMap[columnId];
            mappings = MappingParser.getOtherPredicates(fromNodeData);
            mappings.forEach(function (mapping) {
                mapping.isConstantUri = MappingParser.isConstantUri(mapping.o);
                mapping.isConstantPrefixedUri = MappingParser.isConstantPrefixedUri(mapping.o);
            });

            tablecolumnsMap[columnId].mappings = tablecolumnsMap[columnId].mappings.concat(mappings);
        }
    },
    isConstantUri: function (str) {
        if (str && str.startsWith("http")) {
            return true;
        }
        return false;
    },
    isConstantPrefixedUri: function (str) {
        if (str && str.match(/^[A-Za-z_][A-Za-z0-9._-]*:[A-Za-z_][A-Za-z0-9._-]*$/)) {
            return true;
        }
        return false;
    },
    /**
     *   //if edge is not from rdf, rdfs or owl   and if fome and to are rdf;typeClass the edge represents a restriction
     * @param fromNodeData
     * @param toNodeData
     * @return {*[]}
     */
    getTypeAndLabelMappings: function (fromNodeData, toNodeData) {
        var mappings = [];

        var type = fromNodeData.rdfType == "owl:Class" ? "rdfs:subClassOf" : "rdf:type";

        mappings.push({
            s: fromNodeData.id,
            p: type,
            o: toNodeData.id,
            isConstantUri: true,
        });
        mappings.push({
            s: fromNodeData.id,
            p: "rdf:type",
            o: fromNodeData.rdfType,
            isConstantUri: true,
        });

        if (fromNodeData.rdfsLabel) {
            mappings.push({
                s: fromNodeData.id,
                p: "rdfs:label",
                o: fromNodeData.rdfsLabel,
                isString: true,
            });
        }

        return mappings;
    },
    /**
     * @function
     * @name getColumnToColumnMappings
     * @memberof module:MappingParser
     * Extracts column-to-column edges for a given table, filtering by `filterMappingIds`, and flags OWL restriction edges.
     * @param {{nodes:Array<Object>,edges:Array<Object>}} mappingData - Vis.js graph data (nodes/edges).
     * @param {string} table - Table name; only columns from this table are considered.
     * @param {Array<string>} filterMappingIds - Allowed edge IDs to include.
     * @param {Object<string,Object>} allColumnsMappings - Map of columnId → column data (for `definedInColumn` resolution).
     * @returns {Object<string,Object>} Map of edgeId → edge (with `isRestriction` when both ends are `owl:Class`).
     */

    getColumnToColumnMappings: function (mappingData, table, filterMappingIds, allColumnsMappings) {
        var columnsMap = {};
        var edgeMap = {};
        mappingData.nodes.forEach(function (node) {
            if (node.data && MappingParser.columnsMappingsObjects.includes(node.data.type) && node.data.dataTable == table) {
                columnsMap[node.id] = node;
            }
        });

        mappingData.edges.forEach(function (edge) {
            if (columnsMap[edge.from] && columnsMap[edge.to] && filterMappingIds.indexOf(edge.id) > -1) {
                var fromColumn = columnsMap[edge.from];
                var toColumn = columnsMap[edge.to];
                if (fromColumn.data.definedInColumn) {
                    fromColumn = allColumnsMappings[fromColumn.data.definedInColumn];
                }
                if (toColumn.data.definedInColumn) {
                    toColumn = allColumnsMappings[toColumn.data.definedInColumn];
                }
                //if edge is not from rdf, rdfs or owl   and if fome and to are rdf;typeClass the edge represents a restriction
                if (edge.data.id.indexOf("owl") < 0 && edge.data.id.indexOf("rdf") < 0) {
                    var isRestriction = fromColumn.rdfType == "owl:Class" && toColumn.rdfType == "owl:Class";
                    edge.isRestriction = isRestriction;
                }
                edgeMap[edge.id] = edge;
            }
        });
        return edgeMap;
    },
    /**
     * @function
     * @name getOtherPredicates
     * @memberof module:MappingParser
     * Builds mapping triples from a column’s `otherPredicates` (p/o), adding `dataType` (defaults to `xsd:string` if range includes “Resource”) and `dateFormat`.
     * @param {Object} columnData - Column data with `id` and optional `otherPredicates` items `{property, object, range, dateFormat}`.
     * @returns {Array<{s:string,p:string,o:string,dataType?:string,dateFormat?:string}>} Triples mapped for this column.
     */

    getOtherPredicates: function (columnData) {
        var mappings = [];
        if (columnData.otherPredicates) {
            columnData.otherPredicates.forEach(function (predicate) {
                var triple = {
                    s: columnData.id,
                    p: predicate.property,
                    o: predicate.object,
                };

                if (predicate.range) {
                    if (predicate.range.indexOf("Resource") > -1) {
                        triple.dataType = "xsd:string";
                    } else {
                        triple.dataType = predicate.range;
                    }
                }
                if (predicate.dateFormat) {
                    triple.dateFormat = predicate.dateFormat;
                }

                mappings.push(triple);
            });
        }
        return mappings;
    },

    /**
     *
     * build functions in a  pointers map used to transform data at tripleMaker processe
     *
     */
    getJsFunctionsMap: function (columnMappings, callback) {
        function getFunction(argsArray, fnStr, callback) {
            try {
                fnStr = fnStr.replace(/[/r/n/t]gm/, "");
                var array = /\{(?<body>.*)\}/.exec(fnStr);
                if (!array) {
                    return callback("cannot parse object function " + JSON.stringify(item) + " missing enclosing body into 'function{..}'");
                }
                var fnBody = array.groups["body"];
                fnBody = "try{" + fnBody + "}catch(e){\n\rreturn console.log(e)\n\r}";
                var fn = new Function(argsArray, fnBody);
                return callback(null, fn);
            } catch (err) {
                return callback("error in object function " + fnStr + "\n" + err);
            }
        }

        var jsFunctionsMap = {};
        for (var columnId in columnMappings) {
            var column = columnMappings[columnId];
            if (column.function) {
                getFunction(["row", "mapping"], column.function, function (err, fn) {
                    jsFunctionsMap[columnId] = fn;
                });
            }
            if (column.transform) {
                getFunction(["row", "mapping"], column.transform, function (err, fn) {
                    jsFunctionsMap[columnId] = fn;
                });
            }
        }
        return callback(null, jsFunctionsMap);
    },
};

module.exports = MappingParser;

//MappingParser.getColumnsMap("PAZFLOR_ABOX", null, function (err, result) {
