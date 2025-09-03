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
     * @param source
     * @param table
     * @param callback
     */
    getColumnsMap: function (source, table, callback) {

        MappingParser.getMappingsData("PAZFLOR_ABOX", function (err, data) {


            var edgesFromMap = {}
            var nodesMap = {}
            var columnsMap = {}


            data.edges.forEach(function (edge) {

                if (!edgesFromMap[edge.from]) {
                    edgesFromMap[edge.from] = []
                }
                edgesFromMap[edge.from].push(edge)
            })
            data.nodes.forEach(function (node) {

                nodesMap[node.id] = node
                if (node.data.type == "Column") {
                    if(!table  || node.data.dataTable==table)
                    columnsMap[node.id] = node.data

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
                            mappings = MappingParser.getColumnToColumnMappings(fromNodeData, toNodeData, edge.data)
                            columnMappings = columnMappings.concat(mappings)
                        }

                    })


                }


                mappings = MappingParser.getOtherPredicates(fromNodeData)
                columnMappings = columnMappings.concat(mappings)

                columnsMap[columnId].mappings = columnMappings

            }

            return callback(null, columnsMap)


        })
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

    getColumnToColumnMappings: function (fromNodeData, toNodeData, edgeData) {
        var mappings = []

        var type = fromNodeData.rdfType == "owl;Class" ? "rdfs:subClassOf" : "rdf:type"

        mappings.push({
            s: fromNodeData.id,
            p: edgeData.id,
            o: toNodeData.id,
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
            return mappings
        }

    },

    getGlobalParamsMap:function(columnMappings){
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
                transform:column.transform || null,
                uriType:column.uriType || null,
            }
        }

        return globalParamsMap;

    },


    getTableMappings: function(source,table, callback) {
        MappingParser.getColumnsMap(source, table, function (err, result) {
            if (err) {
                return callback(err);
            }
            var mappings = []
            for (var columnId in result) {
                result[columnId].mappings.forEach(function (mapping) {
                    mappings.push(mapping)
                })
            }
            return callback(null,mappings)
        })

    }




}

module.exports = MappingParser


MappingParser.getColumnsMap("PAZFLOR_ABOX", null, function (err, result) {

})