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
    readAndProcessData: function (tableInfos, columnMappings, globalParamsMap, options, callback) {


        var totalTriples = 0
        var blankNodesMap = {}

        if (tableInfos.csvDataFilePath) {
            KGbuilder_socket.message(options.clientSocketId, "loading data from csv file " + tableInfos.table, false);
            TriplesMaker.readCsv(tableInfos.csvDataFilePath, options.sampleSize, function (err, result) {
                if (err) {
                    KGbuilder_socket.message(options.clientSocketId, err, true);
                    return callback(err);
                }
                KGbuilder_socket.message(options.clientSocketId, " data loaded from " + tableInfos.table, false);
                //  tableData = result.data[0];
                async.eachSeries(result.data, function (data, callbackEach) {
                    TriplesMaker.processTableTriples(data, columnMappings, globalParamsMap, blankNodesMap, options, function (err, result) {
                        totalTriples += result.triplesCreated
                        KGbuilder_socket.message(options.clientSocketId, " processed  from " + tableInfos.table + " : " + totalTriples + " triples", false);

                        callbackEach()
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
                            TriplesMaker.processTableTriples(data, columnMappings, globalParamsMap, options, function (err, result) {
                                if (err) {
                                    return callbackWhilst(err)
                                }
                                resultSize = data.length;
                                totalSize += resultSize;
                                offset += resultSize;
                                KGbuilder_socket.message(options.clientSocketId, " processed  from " + tableInfos.table + " : " + totalSize + " triples", false);

                                callbackWhilst()
                            })


                        })
                        .catch((err) => {
                            return callbackWhilst(err);
                        });
                }, function (err) {
                    return callback(err, totalTriples)
                })
        }
    },

    processTableTriples: function (data, columnMappings, globalParamsMap, blankNodesMap, options, callback) {
        var graphUri = globalParamsMap.graphUri
        data.forEach(function (line, rowIndex) {
            var lineColumnUrisMap = {}

            KGbuilder_triplesMaker.blankNodesMap = {};
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
                    columnUri = TriplesMaker.getColumnUri(globalParamsMap.graphUri, line, columnId, columnMappings, rowIndex, blankNodesMap)
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

                    var objStr = line[mapping.o]
                    if (!objStr) {
                        return;
                    }

                    var object = null

                    if (columnMappings[mapping.o]) {// if object is a column
                        var object = TriplesMaker.getColumnUri(globalParamsMap, line, columnId, columnMappings, rowIndex, blankNodesMap)


                    }else if (mapping.transform) {
                        var objStr = line[mapping.o]
                           object=tableMappings.transform[mapping.s](objStr, "o", mapping.p, line, mapping);

                    } else if (mapping.dataType) {//literal
                        TriplesMaker.getDataType
                    }
                    else if (mapping.isString) {

                        object = "\"" + util.formatStringForTriple(objStr) + "\""

                    }else{
                        object = "\"" + util.formatStringForTriple(objStr) + "\""
                    }

                    var triple=columnUri+" "+mapping.p+" "+object
                })


            }



            function getFunction(argsArray, fnStr, callback) {
                try {
                    fnStr = fnStr.replace(/[/r/n/t]gm/, "");
                    var array = /\{(?<body>.*)\}/.exec(fnStr);
                    if (!array) {
                        return callbackSeries("cannot parse object function " + JSON.stringify(item) + " missing enclosing body into 'function{..}'");
                    }
                    var fnBody = array.groups["body"];
                    fnBody = "try{" + fnBody + "}catch(e){\n\rreturn console.log(e)\n\r}";
                    var fn = new Function(argsArray, fnBody);
                    return callback(null, fn);
                } catch (err) {
                    return callback("error in object function " + fnStr + "\n" + err);
                }
            }



        })


    },


    /**
     *
     * build an URI for the column
     *
     * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!a completer avec tous les types de colonnes
     * @param dataItem
     * @param columnId
     * @param globalParamsMap
     */
    getColumnUri: function (graphUri, dataItem, columnId, columnMappings, rowIndex, blankNodesMap) {
        var columnParams = columnMappings[columnId]







        if (node.data.type == "URI") {// same fixed uri for all amappings
            return "<" + graphUri + util.formatStringForTriple(mapping.o, true) + ">"
        } else if (columnParams.uriType == "blankNode" || columnParams.uriType == "VirtualColumn") {
            var value = columnId + ":" + dataItem[columnId];
            if (!value) {
                return
            }
            var bNode = blankNodesMap[value]
            if (bNode) {
                return bNode;
            } else {
                bNode = "<_:b" + util.getRandomHexaId(10) + ">";
                blankNodesMap[value] = bNode;
                return bNode;
            }


        } else if (node.data.type == "RowIndex") {// unique uri for the line
            var value =  "_row_" + rowIndex;
            var rowUri = blankNodesMap[value]
            if (rowUri) {
                return rowUri;
            } else {
                rowUri = "<_:b" + util.getRandomHexaId(10) + ">";
                blankNodesMap[value] = rowUri;
                return rowUri;
            }
        }

/*******************************/

        var id = null;


      if (columnParams.uriType == "fromLabel") {// cross lines value for the column
            if (columnParams.rdfsLabel) {
                if (dataItem[columnParams.rdfsLabel]) {
                    id = util.formatStringForTriple(dataItem[columnParams.rdfsLabel], true)
                }

            }
        } else if (columnParams.uriType == "randomIdentifier") {
            if (columnParams.rdfsLabel) {
                if (dataItem[columnParams.rdfsLabel]) {
                    id = util.formatStringForTriple(dataItem[columnParams.rdfsLabel], true)
                }

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

    getFormatedLiteral: function (dataItem, columnMappings) {
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