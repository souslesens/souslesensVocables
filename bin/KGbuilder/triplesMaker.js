const KGbuilder_socket = require("./KGbuilder_socket.js");
const {databaseModel} = require("../../model/databases.js");
const csvCrawler = require("../_csvCrawler..js");
const async = require("async");
const sqlServerProxy = require("../KG/SQLserverConnector.");
const util = require("../util.");
const KGbuilder_triplesWriter = require("./KGbuilder_triplesWriter");
const KGbuilder_triplesMaker = require("./KGbuilder_triplesMaker")

const dataController = require("../dataController.");
const path = require("path");


var TriplesMaker = {


    /**
     *
     *     read data in batches then create triples from mappings then write them in tripleStore eventually
     * @param tableInfos defines parameters to connect to the table
     * @param options
     * @param processor function that create the triples
     * @param callback
     */
    readAndProcessData: function (tableProcessingParams, options, callback) {


        var totalTriplesCount = 0
        sampleTriples = []
        var tableInfos = tableProcessingParams.tableInfos;

        tableProcessingParams.randomIdentiersMap = {};// identifiers with scope the whole table
        tableProcessingParams.blankNodesMap = {};// identifiers with scope the whole table

        if (tableProcessingParams.tableInfos.csvDataFilePath) {
            KGbuilder_socket.message(options.clientSocketId, "loading data from csv file " + tableInfos.table, false);
            TriplesMaker.readCsv(tableInfos.csvDataFilePath, options.sampleSize, function (err, result) {
                if (err) {
                    KGbuilder_socket.message(options.clientSocketId, err, true);
                    return callback(err);
                }
                KGbuilder_socket.message(options.clientSocketId, " data loaded from " + tableInfos.table, false);
                //  tableData = result.data[0];
                async.eachSeries(result.data, function (data, callbackEach) {
                    TriplesMaker.buildTriples(data, tableProcessingParams, options, function (err, batchTriples) {
                        KGbuilder_socket.message(options.clientSocketId, " processed  from " + tableInfos.table + " : " + totalTriples + " triples", false);

                        if (options.sampleSize) {// sample dont write triples return batchTriples
                            sampleTriples = batchTriples
                            callbackEach()

                        } else {
                            KGbuilder_triplesWriter.writeTriples(batchTriples, tableProcessingParams.graphUri, sparqlServerUrl, function (err, result) {
                                if (err) {
                                    return callbackEach(err)
                                }
                                totalTriplesCount += batchTriples.length
                                return callbackEach()
                            })
                        }
                    })


                }, function (err) {
                    return callback(err, totalTriples)
                })
            })


        } else if (tableInfos.dbID) {
            KGbuilder_socket.message(options.clientSocketId, "loading data from database table " + tableInfos.table, false);


            var totalSize = 0;
            var resultSize = 1;
            var limitSize = options.sampleSize || 500;
            var offset = 0;

            async.whilst(
                function (callbackTest) {// implementation different in node js and  web browser  !!
                    return callbackTest(null, resultSize > 0);
                },
                function (callbackWhilst) {
                    databaseModel.batchSelect(tableInfos.dbID, tableInfos.table, {
                        limit: limitSize,
                        noRecurs: true,// Boolean(options.sampleSize),
                        offset: offset
                    })
                        .then((result) => {
                            data = result;

                            KGbuilder_socket.message(options.clientSocketId, " data loaded ,table " + tableInfos.table, false);
                            TriplesMaker.buildTriples(data, tableProcessingParams, options, function (err, batchTriples) {
                                if (err) {
                                    return callbackWhilst(err)
                                }
                                resultSize = data.length;
                                totalSize += resultSize;
                                offset += resultSize;
                                KGbuilder_socket.message(options.clientSocketId, " processed  from " + tableInfos.table + " : " + totalSize + " triples", false);

                                if (options.sampleSize) {// sample dont write triples return batchTriples
                                    resultSize = 0;// stop iterate
                                    sampleTriples = batchTriples
                                    callbackWhilst()

                                } else {

                                    KGbuilder_triplesWriter.writeTriples(batchTriples, tableProcessingParams.graphUri, sparqlServerUrl, function (err, result) {
                                        if (err) {
                                            return callbackWhilst(err)
                                        }
                                        totalTriplesCount += batchTriples.length
                                        return callbackWhilst()
                                    })
                                }


                            })


                        })
                    /*   .catch((err) => {
                           return callbackWhilst(err);
                       });*/
                }, function (err) {
                    return callback(err, {sampleTriples: sampleTriples, totalTriplesCount: totalTriplesCount})
                })
        }
    },

    buildTriples: function (data, tableProcessingParams, options, callback) {

        var columnMappings = tableProcessingParams.columnsMappings;
        var batchTriples = [];
        data.forEach(function (line, rowIndex) {
            var lineColumnUrisMap = {}

            var blankNodesMap = {};
            for (var key in line) {
                if (line[key]) {

                    if (line[key] instanceof Date) {
                        line[key] = line[key].toISOString();
                    } else {
                        line[key] = "" + line[key];
                    }
                }
            }


            for (var columnId in columnMappings) {

                var columnUri = lineColumnUrisMap[columnId]
                if (!columnUri) {
                    columnUri = TriplesMaker.getColumnUri(line, columnId, columnMappings, rowIndex, tableProcessingParams)
                    if (columnId) {
                        lineColumnUrisMap[columnId] = columnUri
                    }
                }


                var mappings = columnMappings[columnId].mappings
                mappings.forEach(function (mapping) {

                    if (!mapping) {
                        return;
                    }
                    if (!columnId) {
                        return;
                    }


                    var object = null
                    // if no matching item for mapping.o  and no fixed uri return
                    // the other cases need a value for the mapping object
                    if (!line[mapping.o]) {
                        if (mapping.isConstantUri) {// uri
                            object = "<" + mapping.o + ">"
                        }
                        else if (mapping.isConstantPrefixedUri) {//prefix
                            object = mapping.o
                        } else {
                            return;

                        }
                    }


                   else if (columnMappings[mapping.objColId]) {// if object is a column
                        object = TriplesMaker.getColumnUri(line, mapping.objColId, columnMappings, rowIndex, tableProcessingParams)


                    } else if (mapping.transform) {
                        var objStr = line[mapping.o]
                        object = tableProcessingParams.jsFunctionsMap[mapping.s](objStr, "o", mapping.p, line, mapping);

                    } else if (mapping.isString) {
                        var objStr = line[mapping.o]
                        object = "\"" + util.formatStringForTriple(objStr) + "\""

                    } else {
                        object = TriplesMaker.getFormatedLiteral(line, mapping)
                    }

                    var property = TriplesMaker.getPropertyUri(mapping.p)


                    if (property && object) {
                        var triple = columnUri + " " + property + " " + object


                        var triplelHashCode = TriplesMaker.stringToNumber(triple)
                        if (!tableProcessingParams.uniqueTriplesMap[triplelHashCode]) {
                            tableProcessingParams.uniqueTriplesMap[triplelHashCode] = 1
                            batchTriples.push(triple)
                        }
                    } else {
                        var x = property;
                        var y = object
                    }
                })


            }


        })

        return callback(null, batchTriples)

    },

    stringToNumber: function (str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; // Convert to 32-bit integer
        }
        return hash;
    },


    /**
     *
     * build an URI for the column
     *
     * graphUri
     * @param dataItem
     * @param columnId
     * @param globalParamsMap
     */
    getColumnUri: function (dataItem, columnId, columnMappings, rowIndex, tableProcessingParams) {
        var columnParams = columnMappings[columnId]
        var graphUri = tableProcessingParams.sourceInfos.graphUri


        if (columnParams.type == "URI") {// same fixed uri for all amappings
            return "<" + graphUri + util.formatStringForTriple(columnParams.id, true) + ">"
        } else if (columnParams.uriType == "blankNode" || columnParams.uriType == "VirtualColumn") {
            var value = dataItem[columnId];

            if (!value) {
                return
            }
            value = columnId + ":" + value
            var bNode = tableProcessingParams.blankNodesMap[value]
            if (bNode) {
                return bNode;
            } else {
                bNode = "<_:b" + util.getRandomHexaId(10) + ">";
                tableProcessingParams.blankNodesMap[value] = bNode;
                return bNode;
            }


        } else if (columnParams.type == "RowIndex") {// unique uri for the line
            var value = "_row_" + rowIndex;
            var rowUri = tableProcessingParams.blankNodesMap[value]
            if (rowUri) {
                return rowUri;
            } else {
                rowUri = "<_:b" + util.getRandomHexaId(10) + ">";
                tableProcessingParams.blankNodesMap[value] = rowUri;
                return rowUri;
            }
        }

        /*******************************/

        var id = null;


        if (columnParams.uriType == "fromLabel") {// cross lines value for the column


            if (dataItem[columnParams.id]) {
                id = util.formatStringForTriple(dataItem[columnParams.id], true)
            }

        } else if (columnParams.uriType == "randomIdentifier") {

            var value = dataItem[columnId];

            if (!value) {
                return
            }
            value = columnId + ":" + value
            id = tableProcessingParams.randomIdentiersMap[value]
            if (!bNode) {

                id = "" + util.getRandomHexaId(10);
                tableProcessingParams.randomIdentiersMap[value] = id;
                return bNode;
            }


        } else {
            id = util.formatStringForTriple(dataItem[columnParams.id], true)
        }

        if (!id) {
            return null;
        }


        var baseUri = columnParams.baseURI || graphUri
        if (!baseUri.endsWith("/")) {
            baseUri += "/"
        }
        var prefix = columnParams.prefixURI ? (columnParams.prefixURI + "-") : ""

        var uri = "<" + baseUri + prefix + id + ">"
        return uri

    },

    getPropertyUri: function (property, rowIndex) {
        if (property.startsWith("http")) {
            return "<" + property + ">"
        } else //prefix
        {
            return property
        }
    },


    getFormatedLiteral: function (dataItem, mapping) {
        var objectStr = null
        if (mapping.dataType) {
            var str = dataItem[mapping.o];
            if (!str || str == "null") {
                return callback(null, null);
            }
            if (mapping.dataType.startsWith("xsd:date")) {
                if (mapping.dateFormat) {
                    str = util.getDateFromSLSformat(mapping.dateFormat, str);
                    if (!str) {
                        return callback(null, null);
                    }
                } else if (str.match(/[.-]*Z/)) {
                    //ISO string format (coming from database)
                    // is relevant dates coming from dataBases have mapping.dateFormat=ISO-time?
                    str = util.formatStringForTriple(str);
                    str = util.convertISOStringDateForTriple(str);
                } else {
                    var isDate = function (date) {
                        return new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ? true : false;
                    };
                    var formatDate = function (date) {
                        str = new Date(date).toISOString(); //.slice(0, 10);
                    };
                    if (!isDate(str)) {
                        var date = util.convertFrDateStr2Date(str);
                        if (!date) {
                            return;
                        } else {
                            str = date.toISOString();
                        }
                    } else {
                        str = formatDate(str);
                    }
                }
            }
            if (!str) {
                objectStr = "";
            }

            if (!mapping.dataType.startsWith("xsd:")) {
                mapping.dataType = "xsd:string";
            }
            if (!str || str == "null") {
                return callback(null, null);
            }
            if (mapping.dataType == "xsd:string") {
                str = util.formatStringForTriple(str, false);
            }
            if (mapping.dataType == "xsd:float") {
                if (str == "0") {
                    return callback(null, null);
                }
                str = str.replace(",", ".");
                str = str.replace(" ", "");
                if (!util.isFloat(str)) {
                    return callback(null, null);
                } else {
                }
            }
            if (mapping.dataType == "xsd:int") {
                str = str.replace(" ", "");
                if (!util.isInt(str)) {
                    return callback(null, null);
                } else {
                }
            }
            // format after to apply transformations
            objectStr = str;
        }
        return objectStr;
    },


    readCsv: function (filePath, maxLines, callback) {
        csvCrawler.readCsv({filePath: filePath}, maxLines, function (err, result) {
            if (err) {
                return callback(err);
            }
            var data = result.data;
            var headers = result.headers;

            return callback(null, {headers: headers, data: data});
        });
    }
    ,


}


module.exports = TriplesMaker