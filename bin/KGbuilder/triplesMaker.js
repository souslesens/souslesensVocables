const KGbuilder_socket = require("./KGbuilder_socket.js");
const { databaseModel } = require("../../model/databases.js");
const csvCrawler = require("../_csvCrawler..js");
const async = require("async");
const sqlServerProxy = require("../KG/SQLserverConnector..js");
const util = require("../util..js");
const KGbuilder_triplesWriter = require("./KGbuilder_triplesWriter.js");
const KGbuilder_triplesMaker = require("./KGbuilder_triplesMaker.js");

const dataController = require("../dataController..js");
const path = require("path");
const MappingParser = require("./mappingsParser.js");
/**
 * TriplesMaker module.
 * Orchestrates end-to-end triple production from tabular sources (CSV or DB) using
 * VisJS-derived column/edge mappings:
 *  - Streams rows in batches, builds RDF triples per row/column, and (optionally) writes them
 *    to a SPARQL endpoint via `KGbuilder_triplesWriter`.
 *  - Resolves subjects/objects from column definitions (fixed URI, prefixed URI, fromLabel,
 *    blank nodes, virtual columns, row index) with per-table scoping for random ids and bnodes.
 *  - Applies per-column transforms, typed literal formatting (xsd:string/int/float/date/dateTime),
 *    and safe-string encoding for IRIs/literals.
 *  - Emits additional column→column relation triples from mapping edges.
 *  - De-duplicates triples within a batch and appends provenance metadata
 *    (`dcterms:created`, mapping table via `mappingFilePredicate`).
 *  - Reports progress/timings through `KGbuilder_socket`; supports sampling mode (no writes).
 
 * Inputs/Context:
 *  - tableProcessingParams: {
 *      sourceInfos: { graphUri, sparqlServerUrl }, tableInfos: { table, csvDataFilePath?, dbID? },
 *      tableColumnsMappings, allColumnsMappings, columnToColumnEdgesMap, jsFunctionsMap,
 *      uniqueTriplesMap (per-run), randomIdentiersMap (per-table), blankNodesMap (per-table)
 *    }
 *  - options: { sampleSize?, filterMappingIds?, clientSocketId?, currentBatchRowIndex? }
 *
 * Output:
 *  - In sampling mode: { sampleTriples } (no writes).
 *  - In write mode: total written triple count aggregated across batches.
 *
 * @module TriplesMaker
 * @see [Tutorial: Overview]{@tutorial overview}
 */

var TriplesMaker = {
    batchSize: 1000000,
    mappingFilePredicate: "http://souslesens.org/KGcreator#mappingFile",
    uniqueSubjects: {},

    /**
     *
     *     read data in batches then create triples from mappings then write them in tripleStore eventually
     * @param tableInfos defines parameters to connect to the table
     * @param options
     * @param processor function that create the triples
     * @param callback
     */
    readAndProcessData: function (tableProcessingParams, options, callback) {
        var totalTriplesCount = 0;
        sampleTriples = [];
        var processedRecords = 0;
        var tableInfos = tableProcessingParams.tableInfos;
        TriplesMaker.uniqueSubjects = {};

        tableProcessingParams.randomIdentiersMap = {}; // identifiers with scope the whole table
        tableProcessingParams.blankNodesMap = {}; // identifiers with scope the whole table
        tableProcessingParams.isSampleData = options.sampleSize;

        var message = {
            table: tableInfos.table,
            tableTotalRecords: tableProcessingParams.tableInfos.tableTotalRecords || 0,
            processedRecords: 0,
            totalTriples: 0,
            batchTriples: 0,
            operation: "startProcessing",
            operationDuration: 0,
            totalDuration: 0,
        };
        var oldTime = new Date();
        var startTime = oldTime;
        var currentBatchRowIndex = 0;
        if (tableProcessingParams.tableInfos.csvDataFilePath) {
            KGbuilder_socket.message(options.clientSocketId, "loading data from csv file " + tableInfos.table, false);
            TriplesMaker.readCsv(tableInfos.csvDataFilePath, options.sampleSize, function (err, result) {
                if (err) {
                    KGbuilder_socket.message(options.clientSocketId, err, true);
                    return callback(err);
                }

                var currentTime = new Date();
                message.tableTotalRecords = result.data[0].length;
                message.operation = "records";
                message.processedRecords += 0;
                message.operationDuration = currentTime - oldTime;
                message.totalDuration += message.operationDuration;
                KGbuilder_socket.message(options.clientSocketId, message);
                oldTime = new Date();

                async.eachSeries(
                    result.data,
                    function (data, callbackEach) {
                      
                        options.currentBatchRowIndex = currentBatchRowIndex;
                        
                        TriplesMaker.buildTriples(data, tableProcessingParams, options, function (err, batchTriples) {
                            //  totalTriplesCount += batchTriples.length;
                            var currentTime = new Date();
                            currentBatchRowIndex += data.length;
                            message.operation = "buildTriples";
                            message.totalTriples = totalTriplesCount;
                            message.batchTriples = batchTriples.length;
                            message.operationDuration = currentTime - oldTime;
                            message.totalDuration += message.operationDuration;
                            KGbuilder_socket.message(options.clientSocketId, message);
                            oldTime = new Date();

                            if (options.sampleSize) {
                                // sample dont write triples return batchTriples
                                sampleTriples = batchTriples;
                                callbackEach();
                            } else {
                                KGbuilder_socket.message(
                                    options.clientSocketId,
                                    " writing " + processedRecords + " records  from " + tableInfos.table + " : " + batchTriples.length + " triples",
                                    false,
                                );

                                KGbuilder_triplesWriter.writeTriples(
                                    batchTriples,
                                    tableProcessingParams.sourceInfos.graphUri,
                                    tableProcessingParams.sourceInfos.sparqlServerUrl,
                                    function (err, writtenTriples) {
                                        if (err) {
                                            return callbackEach(err);
                                        }
                                        totalTriplesCount += writtenTriples;
                                        var currentTime = new Date();

                                        message.operation = "writeTriples";
                                        message.operationDuration = currentTime - oldTime;
                                        message.totalDuration += message.operationDuration;
                                        KGbuilder_socket.message(options.clientSocketId, message);
                                        oldTime = new Date();
                                        return callbackEach();
                                    },
                                );
                            }
                        });
                    },
                    function (err) {
                        message.operation = "finished";
                        message.totalTriples = totalTriplesCount;
                        KGbuilder_socket.message(options.clientSocketId, message);
                        // KGbuilder_socket.message(options.clientSocketId, " DONE " + processedRecords + "records  from " + tableInfos.table + " : " + (totalTriplesCount) + " triples", false);

                        return callback(err, { sampleTriples: sampleTriples, totalTriplesCount: totalTriplesCount });
                    },
                );
            });
        } else if (true) {
            /// tedmporary fix batchselect problem
            //!!!!!!!!!! temporary to cure batchselect bug
            //  var slices=common.array.slice(data,300)
            databaseModel
                .batchSelect(tableInfos.dbID, tableInfos.table, {
                    limit: TriplesMaker.batchSize,
                    noRecurs: true,
                    //  offset: offset,
                    select: select,
                })
                .then((result) => {
                    //  async.eachSeries(slices,function(data,callbackEachDataSlice){
                    KGbuilder_socket.message(options.clientSocketId, "loading data from database table " + tableInfos.table, false);

                    var slices = util.sliceArray(result, 300);
                    var currentTime = new Date();
                    message.tableTotalRecords = slices[0].length;
                    message.operation = "records";
                    message.processedRecords += 0;
                    message.operationDuration = currentTime - oldTime;
                    message.totalDuration += message.operationDuration;
                    KGbuilder_socket.message(options.clientSocketId, message);
                    oldTime = new Date();

                    async.eachSeries(
                        slices,
                        function (data, callbackEach) {
                           
                            options.currentBatchRowIndex = currentBatchRowIndex;
                            
                            TriplesMaker.buildTriples(data, tableProcessingParams, options, function (err, batchTriples) {
                                //  totalTriplesCount += batchTriples.length;
                                var currentTime = new Date();
                                currentBatchRowIndex += data.length;
                                message.operation = "buildTriples";
                                message.totalTriples = totalTriplesCount;
                                message.batchTriples = batchTriples.length;
                                message.operationDuration = currentTime - oldTime;
                                message.totalDuration += message.operationDuration;
                                KGbuilder_socket.message(options.clientSocketId, message);
                                oldTime = new Date();

                                if (options.sampleSize) {
                                    // sample dont write triples return batchTriples
                                    sampleTriples = batchTriples;
                                    callbackEach();
                                } else {
                                    KGbuilder_socket.message(
                                        options.clientSocketId,
                                        " writing " + processedRecords + " records  from " + tableInfos.table + " : " + batchTriples.length + " triples",
                                        false,
                                    );

                                    KGbuilder_triplesWriter.writeTriples(
                                        batchTriples,
                                        tableProcessingParams.sourceInfos.graphUri,
                                        tableProcessingParams.sourceInfos.sparqlServerUrl,
                                        function (err, writtenTriples) {
                                            if (err) {
                                                return callbackEach(err);
                                            }
                                            totalTriplesCount += writtenTriples;
                                            var currentTime = new Date();

                                            message.operation = "writeTriples";
                                            message.operationDuration = currentTime - oldTime;
                                            message.totalDuration += message.operationDuration;
                                            KGbuilder_socket.message(options.clientSocketId, message);
                                            oldTime = new Date();
                                            return callbackEach();
                                        },
                                    );
                                }
                            });
                        },
                        function (err) {
                            message.operation = "finished";
                            message.totalTriples = totalTriplesCount;
                            KGbuilder_socket.message(options.clientSocketId, message);
                            // KGbuilder_socket.message(options.clientSocketId, " DONE " + processedRecords + "records  from " + tableInfos.table + " : " + (totalTriplesCount) + " triples", false);

                            return callback(err, { sampleTriples: sampleTriples, totalTriplesCount: totalTriplesCount });
                        },
                    );
                })
                .catch((err) => {
                    console.log(err);
                    if (databaseErrors < 5) {
                        databaseErrors += 1;
                        databaseModel.refreshConnection(tableInfos.dbID, function () {
                            callback();
                        });
                    } else {
                        return callback(err);
                    }
                });
        }

        // usual case for DB temporay disabled because pb with batchSelect
        else if (tableInfos.dbID) {
            KGbuilder_socket.message(options.clientSocketId, "loading data from database table " + tableInfos.table, false);

            var totalSize = 0;
            var resultSize = 1;
            var limitSize = options.sampleSize || TriplesMaker.batchSize;

            var offset = options.offset || 0;

            var select = [];
            var databaseErrors = 0;

            for (var columnId in tableProcessingParams.tableColumnsMappings) {
                var column = tableProcessingParams.tableColumnsMappings[columnId];
                if (column.type == "Column") {
                    select.push(column.id);
                }
                if (MappingParser.columnsMappingsObjects.includes(column.type)) {
                    if (column.otherPredicates) {
                        column.otherPredicates.forEach(function (predicate) {
                            select.push(predicate.object);
                        });
                    }
                }
            }
            var message = {
                table: tableInfos.table,
                tableTotalRecords: tableProcessingParams.tableInfos.tableTotalRecords,
                processedRecords: 0,
                totalTriples: 0,
                batchTriples: 0,
                operation: "startProcessing",
                operationDuration: 0,
                totalDuration: 0,
            };

            databaseModel.refreshConnection(tableInfos.dbID, function () {
                async.whilst(
                    function (callbackTest) {
                        // implementation different in node js and  web browser  !!
                        oldTime = new Date();
                        return callbackTest(null, resultSize > 0);
                    },

                    function (callbackWhilst) {
                        databaseModel
                            .batchSelect(tableInfos.dbID, tableInfos.table, {
                                limit: limitSize,
                                noRecurs: true,
                                offset: offset,
                                select: select,
                            })
                            .then((result) => {
                                // console.log("select time " + duration)
                                data = result;
                                resultSize = data.length;
                                //offset += resultSize;
                                offset += limitSize;

                                var currentTime = new Date();

                                message.operation = "records";
                                message.processedRecords += data.length;
                                message.operationDuration = currentTime - oldTime;
                                message.totalDuration += message.operationDuration;
                                //   KGbuilder_socket.message(options.clientSocketId, message);
                                oldTime = new Date();

                                if (currentBatchRowIndex && options) {
                                    options.currentBatchRowIndex = currentBatchRowIndex;
                                }

                                // KGbuilder_socket.message(options.clientSocketId, processedRecords + "  records loaded from table " + tableInfos.table, false);
                                TriplesMaker.buildTriples(data, tableProcessingParams, options, function (err, batchTriples) {
                                    if (err) {
                                        if (err == "!!!") {
                                            offset -= limitSize;
                                            throw new Error(err);
                                        }
                                        return callbackWhilst(err);
                                    }

                                    currentBatchRowIndex = offset;
                                    var currentTime = new Date();

                                    message.operation = "buildTriples";
                                    message.totalTriples = totalTriplesCount;
                                    message.batchTriples = batchTriples.length;
                                    message.operationDuration = currentTime - oldTime;
                                    message.totalDuration += message.operationDuration;
                                    KGbuilder_socket.message(options.clientSocketId, message);
                                    oldTime = new Date();

                                    if (options.sampleSize) {
                                        // sample dont write triples return batchTriples
                                        resultSize = 0; // stop iterate
                                        sampleTriples = batchTriples;
                                        return callbackWhilst();
                                    } else {
                                        return callbackWhilst();

                                        KGbuilder_triplesWriter.writeTriples(
                                            batchTriples,
                                            tableProcessingParams.sourceInfos.graphUri,
                                            tableProcessingParams.sourceInfos.sparqlServerUrl,
                                            function (err, batchTriplesCount) {
                                                if (err) {
                                                    console.log(err);
                                                    console.log("offest " + offset);
                                                    return callbackWhilst(err);
                                                }

                                                var currentTime = new Date();
                                                totalTriplesCount += batchTriplesCount;
                                                message.totalTriples = batchTriplesCount;
                                                message.operation = "writeTriples";
                                                message.operationDuration = currentTime - oldTime;
                                                message.totalDuration += message.operationDuration;
                                                KGbuilder_socket.message(options.clientSocketId, message);
                                                oldTime = new Date();

                                                return callbackWhilst();
                                            },
                                        );
                                    }
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                if (databaseErrors < 5) {
                                    databaseErrors += 1;
                                    databaseModel.refreshConnection(tableInfos.dbID, function () {
                                        callbackWhilst();
                                    });
                                } else {
                                    return callbackWhilst(err);
                                }
                            });
                    },
                    function (err) {
                        message.operation = "finished";
                        message.totalTriples = totalTriplesCount;
                        KGbuilder_socket.message(options.clientSocketId, message);
                        // KGbuilder_socket.message(options.clientSocketId, " DONE " + processedRecords + "records  from " + tableInfos.table + " : " + (totalTriplesCount) + " triples", false);

                        return callback(err, { sampleTriples: sampleTriples, totalTriplesCount: totalTriplesCount });
                    },
                );
            });
        }
    },
/**  Build RDF triples for a batch of rows using the table’s column mappings.
   @param {Array} data  Array of row objects; values are coerced to strings/ISO dates.
   @param {Object} tableProcessingParams  Context: tableColumnsMappings, uniqueTriplesMap, blankNodesMap, tableInfos, jsFunctionsMap.
   @param {Object} options  Batch options: currentBatchRowIndex, filterMappingIds; @param {Function} callback(err, triples).
   For each row: compute subject URIs per column, emit mapped triples (constants/prefixed URIs, column URIs, transforms, typed literals), then add metadata.
   Also generate column→column relation triples from edges and de-duplicate via uniqueTriplesMap before returning. 
   */
    buildTriples: function (data, tableProcessingParams, options, callback) {
        var columnMappings = tableProcessingParams.tableColumnsMappings;

        var batchTriples = [];

        data.forEach(function (line, index) {
            if (line.functionallocation == "PAZ/FPSOH/GAS/FLARE/16-VE-HU86139-B063") {
                var x = 3;
            } else {
                // return
            }

            var lineColumnUrisMap = {};
            var rowIndex = index + options.currentBatchRowIndex;
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
                // filter columns
                if (options.filterMappingIds && options.filterMappingIds.indexOf(columnId) < 0) {
                    continue;
                }

                var columnUri = lineColumnUrisMap[columnId];
                if (!columnUri) {
                    columnUri = TriplesMaker.getColumnUri(line, columnId, columnMappings, rowIndex, tableProcessingParams);
                    if (columnId) {
                        lineColumnUrisMap[columnId] = columnUri;
                    }
                }
                if (!columnUri) {
                    continue;
                }

                var mappings = columnMappings[columnId].mappings;
                mappings.forEach(function (mapping) {
                    if (!mapping) {
                        return;
                    }
                    if (!columnId) {
                        return;
                    }

                    var object = null;
                    // if no matching item for mapping.o  and no fixed uri return
                    // the other cases need a value for the mapping object
                    // no value case should implements blank nodes,virtual columns,rowIndex ...
                    // getColumnUri function handle all cases
                    if (!line[mapping.o]) {
                        if (mapping.isConstantUri) {
                            // uri
                            object = "<" + mapping.o + ">";
                        } else if (mapping.isConstantPrefixedUri) {
                            //prefix
                            object = mapping.o;
                        } else {
                            object = TriplesMaker.getColumnUri(line, mapping.objColId, columnMappings, rowIndex, tableProcessingParams);
                            if (!object) {
                                return;
                            }
                        }
                    } else if (columnMappings[mapping.objColId]) {
                        // if object is a column
                        object = TriplesMaker.getColumnUri(line, mapping.objColId, columnMappings, rowIndex, tableProcessingParams);
                    } else if (mapping.transform) {
                        var objStr = line[mapping.o];
                        object = tableProcessingParams.jsFunctionsMap[mapping.s](objStr, "o", mapping.p, line, mapping);
                    } else if (mapping.isString) {
                        var objStr = line[mapping.o];
                        object = '"' + util.formatStringForTriple(objStr) + '"';
                    } else {
                        object = TriplesMaker.getFormatedLiteral(line, mapping);
                    }

                    var property = TriplesMaker.getPropertyUri(mapping.p);

                    if (columnUri && property && object) {
                        var triple = columnUri + " " + property + " " + object;

                        var triplelHashCode = TriplesMaker.stringToNumber(triple);
                        if (true || !tableProcessingParams.uniqueTriplesMap[triplelHashCode]) {
                            tableProcessingParams.uniqueTriplesMap[triplelHashCode] = 1;
                            batchTriples.push(triple);
                        } else {
                            var x = 5;
                        }
                    } else {
                        var x = 3;
                    }
                });
                // add metadata if not sample
                if (!tableProcessingParams.isSampleData && !TriplesMaker.uniqueSubjects[columnUri]) {
                    TriplesMaker.uniqueSubjects[columnUri] = 1;
                    var metaDataTriples = TriplesMaker.getMetaDataTriples(columnUri, tableProcessingParams.tableInfos.table, {});
                    batchTriples = batchTriples.concat(metaDataTriples);
                }
            }
            // process columnToColumnMappings
            for (var edgeId in tableProcessingParams.columnToColumnEdgesMap) {
                var edge = tableProcessingParams.columnToColumnEdgesMap[edgeId];
                var subjectUri = TriplesMaker.getColumnUri(line, edge.from, columnMappings, rowIndex, tableProcessingParams);
                var objectUri = TriplesMaker.getColumnUri(line, edge.to, columnMappings, rowIndex, tableProcessingParams);
                var property = TriplesMaker.getPropertyUri(edge.data.id);

                if (subjectUri && property && objectUri) {
                    var triple = subjectUri + " " + property + " " + objectUri;

                    // var triplelHashCode = TriplesMaker.stringToNumber(triple);
                    var triplelHashCode = triple;
                    if (!tableProcessingParams.uniqueTriplesMap[triplelHashCode]) {
                        tableProcessingParams.uniqueTriplesMap[triplelHashCode] = 1;
                        batchTriples.push(triple);
                    } else {
                        var x = 5;
                    }
                } else {
                    var x = 5;
                }
            }
        });
        /*  if (batchTriples.length < (data.length / 5)) {
            var x = 3
            return callback("!!!")
        }*/

        return callback(null, batchTriples);
    },

    stringToNumber: function (str) {
        let hash = BigInt(0); 
        const big31 = BigInt("31"); 
 
        for (let i = 0; i < str.length; i++) {
            hash = (hash * big31 + BigInt(str.charCodeAt(i))) % BigInt(Number.MAX_SAFE_INTEGER);
        }
 
        return Number(hash);
     },

    /**
     *
     * build an URI for the column
     *
     * if definedInColumn : substitute basic column params to those of the definedInColumn for the same class if !columnParams.isMainColumn
     * graphUri
     * @param dataItem
     * @param columnId
     * @param globalParamsMap
     */
    getColumnUri: function (dataItem, columnId, columnMappings, rowIndex, tableProcessingParams) {
        var columnParams = columnMappings[columnId];
        if (!columnParams) {
            return null;
        }
        //substitute column params to those of the definedInColumn for the same class if !columnParams.isMainColumn
        if (!columnParams.isMainColumn && columnParams.definedInColumn) {
            var definedInColumn = tableProcessingParams.allColumnsMappings[columnParams.definedInColumn];
            columnParams.rdfType = definedInColumn.rdfType;
            columnParams.uriType = definedInColumn.uriType;
            columnParams.rdfsLabel = definedInColumn.rdfsLabel;
            columnParams.baseURI = definedInColumn.baseURI;
            columnParams.prefixURI = definedInColumn.prefixURI;
        }

        var graphUri = tableProcessingParams.sourceInfos.graphUri;

        if (columnParams.type == "URI") {
            // same fixed uri for all amappings
            return "<" + graphUri + util.formatStringForTriple(columnParams.id, true) + ">";
        } else if (columnParams.uriType == "blankNode" || columnParams.type == "VirtualColumn") {
            /*
              don't work
              var value = dataItem[columnId];

              if (!value) {
                  return
              }
              value = columnId + ":" + value
              var bNode = tableProcessingParams.blankNodesMap[value]
              */

            var bNode;
            var value;
            // blank nodes uriType should have an associated data column so a value
            if (columnParams.uriType == "blankNode") {
                value = dataItem[columnParams.id];
                if (!value) {
                    return;
                }
                value = columnId + ":" + value;
                bNode = tableProcessingParams.blankNodesMap[value];
            } else {
                // virtual columns hasn't associated data column so we use rowIndex as value with the id of the virtual column
                value = columnParams.id + ":" + rowIndex;
                bNode = tableProcessingParams.blankNodesMap[value];
            }

            if (bNode) {
                return bNode;
            } else {
                bNode = "<_:b" + util.getRandomHexaId(10) + ">";
                tableProcessingParams.blankNodesMap[value] = bNode;
                return bNode;
            }
        } else if (columnParams.type == "RowIndex") {
            // unique uri for the line
            var value = "_row_" + rowIndex;
            var rowUri = tableProcessingParams.blankNodesMap[value];
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

        if (columnParams.uriType == "fromLabel") {
            // cross lines value for the column

            if (dataItem[columnParams.id]) {
                id = util.formatStringForTriple(dataItem[columnParams.id], true);
            }
        } else if (columnParams.uriType == "randomIdentifier") {
            var value = dataItem[columnId];

            if (!value) {
                return;
            }
            value = columnId + ":" + value;
            id = tableProcessingParams.randomIdentiersMap[value];
            if (!bNode) {
                id = "" + util.getRandomHexaId(10);
                tableProcessingParams.randomIdentiersMap[value] = id;
                return bNode;
            }
        } else {
            id = util.formatStringForTriple(dataItem[columnParams.id], true);
        }

        if (!id) {
            return null;
        }

        var baseUri = columnParams.baseURI || graphUri;
        if (!baseUri.endsWith("/")) {
            baseUri += "/";
        }

        //var prefix = columnParams.prefixURI ? (columnParams.prefixURI + "-") : ""
        // this force using '-' as prefix seperator,
        // new version authorize others separators caracters if there is already one
        var prefix = columnParams.prefixURI ? columnParams.prefixURI : "";
        if (prefix) {
            if (!util.hasURISeparator(prefix)) {
                prefix += "-";
            }
        }
        var uri = "<" + baseUri + prefix + id + ">";
        return uri;
    },

    getPropertyUri: function (property, rowIndex) {
        if (property.startsWith("http")) {
            return "<" + property + ">";
        } //prefix
        else {
            return property;
        }
    },

     /** @function getFormatedLiteral
     * Formats a literal value from a row according to the mapping’s datatype.
     * Handles xsd:date/xsd:dateTime (incl. custom dateFormat), strings, floats and ints,
     * converting values to valid RDF literals with datatype annotations.
     * NOTE: this function references `callback` but does not receive it; it currently returns the string/null.
     * @param {Object} dataItem   Row object; value is usually taken from dataItem[mapping.o].
     * @param {Object} mapping    Mapping info: { o, dataType, dateFormat, isString, transform, objColId }.
     * @returns {string|null}     N-Triples literal (e.g. "\"2024-01-01\"^^xsd:date") or null if no usable value.
     */
    getFormatedLiteral: function (dataItem, mapping) {
        var objectStr = null;
        if (mapping.dataType) {
            var str = dataItem[mapping.o];
            if (!str || str == "null") {
                return callback(null, null);
            }
            if (mapping.dataType.startsWith("xsd:date")) {
                if (mapping.dateFormat) {
                    str = util.getDateFromSLSformat(mapping.dateFormat, str);
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
                if (str) {
                    if (str.length > 11) {
                        str = '"' + str + '"^^' + "xsd:dateTime";
                    } else {
                        str = '"' + str + '"^^' + "xsd:date";
                    }
                }
            }

            if (!mapping.dataType.startsWith("xsd:")) {
                mapping.dataType = "xsd:string";
            }
            if (!str || str == "null") {
                return null;
            }
            if (mapping.dataType == "xsd:string") {
                str = '"' + util.formatStringForTriple(str, false) + '"^^' + mapping.dataType;
            }
            if (mapping.dataType == "xsd:float") {
                if (str == "0") {
                    str = "0.0";
                }
                str = str.replace(",", ".");
                if (util.isFloat(str)) {
                    str = '"' + str + '"^^' + mapping.dataType;
                } else {
                    str = '"' + util.formatStringForTriple(str, false) + '"^^' + "xsd:string";
                    // str = null
                }
            }
            if (mapping.dataType == "xsd:int") {
                if (util.isInt(str)) {
                    str = '"' + str + '"^^' + mapping.dataType;
                } else {
                    str = '"' + util.formatStringForTriple(str, false) + '"^^' + "xsd:string";
                    //   str = null
                }
            }
            // format after to apply transformations
            objectStr = str;
        }
        return objectStr;
    },
    getMetaDataTriples: function (subjectUri, table, options) {
        var creator = "KGcreator";
        var dateTime = "'" + util.dateToRDFString(new Date(), true) + "'^^xsd:dateTime";

        if (!options) {
            options = {};
        }
        var metaDataTriples = [];
        metaDataTriples.push(subjectUri + " " + "<http://purl.org/dc/terms/created>" + " " + dateTime);
        metaDataTriples.push(subjectUri + " <" + TriplesMaker.mappingFilePredicate + "> '" + table + "'");

        if (options.customMetaData) {
            for (var predicate in options.customMetaData) {
                metaDataTriples.push(subjectUri + " " + predicate + " " + options.customMetaData[predicate]);
            }
        }

        return metaDataTriples;
    },

    readCsv: function (filePath, maxLines, callback) {
        csvCrawler.readCsv({ filePath: filePath }, maxLines, function (err, result) {
            if (err) {
                return callback(err);
            }
            var data = result.data;
            var headers = result.headers;

            return callback(null, { headers: headers, data: data });
        });
    },
};

module.exports = TriplesMaker;
