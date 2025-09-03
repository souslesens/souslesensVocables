const KGbuilder_socket = require("./KGbuilder_socket.js");
const {databaseModel} = require("../../model/databases.js");
const csvCrawler = require("../_csvCrawler..js");
const async = require("async");
const sqlServerProxy = require("../KG/SQLserverConnector.");
const util = require("../util.");
const KGbuilder_triplesWriter = require("./KGbuilder_triplesWriter");
const KGbuilder_triplesMaker=require("./KGbuilder_triplesMaker")

const dataController = require("../dataController.");
const path = require("path");


var TriplesMaker = {



    processTableTriples: function (data, tableMappings, options, callback) {

        async.eachSeries(data, function (line, callbackEachLine) {
                //   lines.forEach(function (line, _indexLine) {
                //clean line content

                var subjectStr = null;
                var objectStr = null;
                var propertyStr = null;
                var lineError = "";
                KGbuilder_triplesMaker.blankNodesMap = {};
                for (var key in line) {
                    if (line[key]) {
                        if (!KGbuilder_triplesMaker.allColumns[key]) {
                            KGbuilder_triplesMaker.allColumns[key] = 1;
                        }
                        if (line[key] instanceof Date) {
                            line[key] = line[key].toISOString();
                        } else {
                            line[key] = "" + line[key];
                        }
                    }
                }

                async.eachSeries(
                    tableMappings.tripleModels,
                    function (mapping, callbackEachMapping) {
                        //tableMappings.tripleModels.forEach(function(mapping) {

                        if (line[mapping.s] == "null") {
                            line[mapping.s] = null;
                        }
                        if (line[mapping.o] == "null") {
                            line[mapping.o] = null;
                        }

                        if (mapping["if_column_value_not_null"]) {
                            var value = line[mapping["if_column_value_not_null"]];
                            if (!value || value == "null") {
                                return callbackEachMapping();
                            }
                        }

                        async.series(
                            [
                                function (callbackSeries) {
                                    KGbuilder_triplesMaker.getTripleSubject(tableMappings, mapping, line, function (err, result) {
                                        if (err) {
                                            if (err.indexOf("no mapping.subject") > -1) {
                                                return callbackEachMapping();
                                            }
                                            return callbackSeries(err);
                                        }
                                        subjectStr = result;
                                        return callbackSeries();
                                    });
                                },
                                function (callbackSeries) {
                                    KGbuilder_triplesMaker.getTriplePredicate(tableMappings, mapping, line, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }
                                        propertyStr = result;
                                        return callbackSeries();
                                    });
                                },
                                function (callbackSeries) {
                                    KGbuilder_triplesMaker.getTripleObject(tableMappings, mapping, line, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }

                                        objectStr = result;
                                        return callbackSeries();
                                    });
                                },

                                function (callbackSeries) {
                                    if (mapping.isRestriction) {
                                        KGbuilder_triplesMaker.getRestrictionTriples(mapping, subjectStr, propertyStr, objectStr, function (err, restrictionTriples) {
                                            if (err) {
                                                return callbackSeries();
                                            }
                                            triples = triples.concat(restrictionTriples);
                                            return callbackSeries();
                                        });
                                    } else {
                                        if (subjectStr && propertyStr && objectStr) {
                                            if (!KGbuilder_triplesMaker.existingTriples[subjectStr + "_" + propertyStr + "_" + objectStr]) {
                                                KGbuilder_triplesMaker.existingTriples[subjectStr + "_" + propertyStr + "_" + objectStr] = 1;
                                                triples.push({
                                                    s: subjectStr,
                                                    p: propertyStr,
                                                    o: objectStr,
                                                });
                                            } else {
                                                var x = 3;
                                            }
                                        }
                                        return callbackSeries();
                                    }
                                },
                            ],
                            function (err) {
                                callbackEachMapping(err);
                            },
                        );
                    },
                    function (err) {
                        callbackEachLine(err);
                    },
                );
            },
            function (err) {

                callback(err, triples);
            },
        );









},


/**
 *
 *     read data in batches then create triples from mappings then write them in tripleStore eventually
 * @param tableInfos defines parameters to connect to the table
 * @param options
 * @param processor function that create the triples
 * @param callback
 */
readAndProcessData: function ( tableInfos, columnMappings,options, callback) {


    var totalTriples = 0




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
                TriplesMaker.processTableTriples(data, columnMappings,options,function( err, result){
                    totalTriples+=result.triplesCreated
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
                return callbackTest(null, resultSize > 0 );
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
                        TriplesMaker.processTableTriples(data, columnMappings,options,function( err, result){
                            if(err){
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
}
,

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