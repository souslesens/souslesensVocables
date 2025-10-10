const path = require("path");
const async = require("async");
const fs = require("fs");

/**
 * MappingParser module.
 * Parses VisJS mapping graphs into executable mapping artifacts:
 * - Loads a source’s consolidated graph JSON.
 * - Extracts per-column mapping definitions (Columns/RowIndex/VirtualColumn/URI) with their triple models.
 * - Builds type/label assertions from class links and collects non-type predicates (datatype, date formats).
 * - Detects constant IRIs / prefixed IRIs and annotates mappings accordingly.
 * - Derives column-to-column relation edges for a given table (with optional filtering).
 * - Compiles embedded JS `function{...}` / `transform{...}` bodies into callable functions.
 * Outputs structures consumed by the triples maker during RDF generation.
 * @module MappingParser
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var MappingParser = {
    columnsMappingsObjects: ["Column", "RowIndex", "VirtualColumn"],
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
            if (node.data.type == "Class") {
                nodesMap[node.id] = node;
            }
            if (true || !table || node.data.dataTable == table) {
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
            }
        });

        for (var columnId in columnsMap) {
            var fromNodeData = columnsMap[columnId];
            var columnMappings = [];
            var edges = edgesFromMap[columnId];
            if (edges) {
                edges.forEach(function (edge) {
                    var toNode = nodesMap[edge.to];
                    var toNodeData = toNode ? toNode.data : {};
                    if (toNodeData.type == "Class") {
                        mappings = MappingParser.getTypeAndLabelMappings(fromNodeData, toNodeData);
                        columnMappings = columnMappings.concat(mappings);
                    } else {
                    }
                });
            }

            mappings = MappingParser.getOtherPredicates(fromNodeData);
            columnMappings = columnMappings.concat(mappings);

            columnMappings.forEach(function (mapping) {
                mapping.isConstantUri = MappingParser.isConstantUri(mapping.o);
                mapping.isConstantPrefixedUri = MappingParser.isConstantPrefixedUri(mapping.o);
            });

            columnsMap[columnId].mappings = columnMappings;
        }

        return callback(null, columnsMap);
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


    /* Builds triples linking `from` to `to`: rdfs:subClassOf if from.rdfType is owl:Class, else rdf:type.
    Always asserts the subject’s own rdf:type and optionally an rdfs:label when provided.
    Inputs: fromNodeData {id, rdfType, rdfsLabel}, toNodeData {id}; returns an array of {s,p,o,isString?}.
    Used to serialize type hierarchy and labels during mapping generation. */

    /**  Builds triples linking `from` to `to`: rdfs:subClassOf if from.rdfType is owl:Class, else rdf:type.
    Always asserts the subject’s own rdf:type and optionally an rdfs:label when provided.
    Inputs: fromNodeData {id, rdfType, rdfsLabel}, toNodeData {id}; returns an array of {s,p,o,isString?}.
    Used to serialize type hierarchy and labels during mapping generation. */
    getTypeAndLabelMappings: function (fromNodeData, toNodeData) {
        var mappings = [];

        var type = fromNodeData.rdfType == "owl;Class" ? "rdfs:subClassOf" : "rdf:type";

        mappings.push({
            s: fromNodeData.id,
            p: type,
            o: toNodeData.id,
        });
        mappings.push({
            s: fromNodeData.id,
            p: "rdf:type",
            o: fromNodeData.rdfType,
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
/** Extract column-to-column candidates for a specific table from the mapping graph.
   Builds a columnsMap keyed by node id for nodes whose type is in columnsMappingsObjects
   and whose dataTable equals the provided table; edgeMap will hold links discovered later.
   Intended as the first pass before computing inter-column edges (optionally filtered by IDs). */
    getColumnToColumnMappings: function (mappingData, table, filterMappingIds) {
        var columnsMap = {};
        var edgeMap = {};
        mappingData.nodes.forEach(function (node) {
            if (node.data && MappingParser.columnsMappingsObjects.includes(node.data.type) && node.data.dataTable == table) {
                columnsMap[node.id] = node;
            }
        });

        mappingData.edges.forEach(function (edge) {
            if (columnsMap[edge.from] && columnsMap[edge.to] && filterMappingIds.indexOf(edge.id) > -1) {
                var isRestriction = columnsMap[edge.from].data.rdfType == "owl:Class" && columnsMap[edge.to].data.rdfType == "owl:Class";
                edge.isRestriction = isRestriction;
                edgeMap[edge.id] = edge;
            }
        });
        return edgeMap;
    },

    /**  Build triples from a column’s `otherPredicates` array (non-type properties).
   @param {Object} columnData  Column mapping object; needs `id` and optionally `otherPredicates[]`.
   @returns {Array<Object>}    List of triples {s,p,o, dataType?, dateFormat?} derived from predicates.
   If a predicate.range contains "Resource", dataType is normalized to "xsd:string"; else the range is kept. */
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

    /*  getGlobalParamsMap:function(columnMappings){
          var globalParamsMap= {
              functions: {},
              lookups: {},
              prefixURIs: {},
              baseURIs: {}
          }

          for (var columnId in columnMappings){
              var column=columnMappings[columnId]
              globalParamsMap[columnId] ={
                  baseURI:column.baseURI || null,
                  prefixURI:column.prefixURI || null,
                  transform:column.transform || null,// clarifier différence entre function at transform
                  function:column.function || null,
                  uriType:column.uriType || null,
              }
          }

          return globalParamsMap;

      }*/

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
