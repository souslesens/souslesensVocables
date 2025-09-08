const path = require("path");
const async = require("async");
const fs = require("fs");


var MappingParser = {

    getMappingsData: function (source, callback) {

        var mappingGraphDir = path.join(__dirname, "../../data/graphs/");
        var file = mappingGraphDir + "mappings_" + source + "_ALL.json"
        var visjsData
        try {
            visjsData = JSON.parse("" + fs.readFileSync(file));
        } catch (e) {
            return callback(e)
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


        var edgesFromMap = {}
        var nodesMap = {}
        var columnsMap = {}


        mappingData.edges.forEach(function (edge) {

            if (!edgesFromMap[edge.from]) {
                edgesFromMap[edge.from] = []
            }
            edgesFromMap[edge.from].push(edge)
        })
        mappingData.nodes.forEach(function (node) {
            if (node.data.type == "Class") {
                nodesMap[node.id] = node
            }
            if (!table || node.data.dataTable == table) {
                nodesMap[node.id] = node
                if (node.data.type == "Column") {
                    columnsMap[node.id] = node.data
                } else if (node.data.type == "RowIndex") {
                    columnsMap[node.id] = node.data
                } else if (node.data.type == "VirtualColumn") {
                    columnsMap[node.id] = node.data
                } else if (node.data.type == "URI") {
                    columnsMap[node.id] = node.data
                }
            }
        })


        for (var columnId in columnsMap) {

            var fromNodeData = columnsMap[columnId]
            var columnMappings = []
            var edges = edgesFromMap[columnId]
            if (edges) {
                edges.forEach(function (edge) {
                    var toNode = nodesMap[edge.to]
                    var toNodeData = toNode ? toNode.data : {}
                    if (toNodeData.type == "Class") {
                        mappings = MappingParser.getTypeAndLabelMappings(fromNodeData, toNodeData)
                        columnMappings = columnMappings.concat(mappings)
                    } else if (toNodeData.type == "Column") {
                        mappings = MappingParser.getColumnToColumnMappings(fromNodeData, toNodeData, edge)
                        columnMappings = columnMappings.concat(mappings)
                    } else {
                        var x = 3;
                    }

                })


            }


            mappings = MappingParser.getOtherPredicates(fromNodeData)
            columnMappings = columnMappings.concat(mappings)

            columnMappings.forEach(function (mapping) {
                mapping.isConstantUri = MappingParser.isConstantUri(mapping.o)
                mapping.isConstantPrefixedUri = MappingParser.isConstantPrefixedUri(mapping.o)
            })


            columnsMap[columnId].mappings = columnMappings

        }


        return callback(null, columnsMap)


    },


    isConstantUri: function (str) {
        if (str.startsWith("http")) {
            return true;
        }
        return false

    },
    isConstantPrefixedUri: function (str) {
        if (str.match(/^[A-Za-z_][A-Za-z0-9._-]*:[A-Za-z_][A-Za-z0-9._-]*$/)) {
            return true;

        }
        return false
    },


    getTypeAndLabelMappings: function (fromNodeData, toNodeData) {
        var mappings = []

        var type = fromNodeData.rdfType == "owl;Class" ? "rdfs:subClassOf" : "rdf:type"

        mappings.push({
            s: fromNodeData.id,
            p: type,
            o: toNodeData.id,
        })
        mappings.push({
            s: fromNodeData.id,
            p: "rdf:type",
            o: fromNodeData.rdfType,
        })

        if (fromNodeData.rdfsLabel) {
            mappings.push({
                s: fromNodeData.id,
                p: "rdfs:label",
                o: fromNodeData.rdfsLabel,
                isString: true,
            })
        }


        return mappings
    },

    getColumnToColumnMappings: function (fromNodeData, toNodeData, edge) {
        var mappings = []


        mappings.push({
            s: fromNodeData.id,
            p: edge.data.id,
            o: toNodeData.id,
            objColId: edge.to
        })
        return mappings
    },
    getOtherPredicates: function (columnData) {

        var mappings = []
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
            })

        }
        return mappings

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

        var jsFunctionsMap = {}
        for (var columnId in columnMappings) {
            var column = columnMappings[columnId]
            if (column.function) {
                getFunction(["row", "mapping"], column.function, function (err, fn) {
                    jsFunctionsMap[columnId] = fn
                })
            }
            if (column.transform) {
                getFunction(["row", "mapping"], column.transform, function (err, fn) {
                    jsFunctionsMap[columnId] = fn
                })
            }
        }
        return callback(null, jsFunctionsMap)
    }


}

module.exports = MappingParser


//MappingParser.getColumnsMap("PAZFLOR_ABOX", null, function (err, result) {
