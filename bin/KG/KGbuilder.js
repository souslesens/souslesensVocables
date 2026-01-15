/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import fs from 'fs';

import util from '../util.js';
import async from 'async';
import httpProxy from '../httpProxy.js';
import sqlConnector from './KGSqlConnector.js';
import SQLserverConnector from './SQLserverConnector.js';
import socket from '../socketManager.js';
import { databaseModel } from '../../model/databases.js';
import KGcontroller from './KGcontroller.js';

var originalKGproperty = "http://data.total.com/resource/one-model#originalIdOf";
// var totalRdlIdProperty = "http://data.total.com/resource/one-model#hasTotalRdlId";
// var totalRdlIdProperty = "http://data.total.com/resource/one-model#hasTotalRdlUri";
// var totalRdlKGgraphUri = "http://data.total.com/resource/one-model/quantum-rdl/";

var triplesFetchtLength = 1000;

var KGbuilder = {
    getJsonModel: function (filePath, callback) {
        var data = JSON.parse(fs.readFileSync(filePath));
        return callback(null, data);
    },

    generateMappingFileTriples(mappings, data, KGgraphUri, options, callback) {
        if (!options) options = {};

        var existingUrisMap = options.existingUrisMap;
        var ARDLdictionary = options.ARDLdictionary;
        var oneModelReferenceDictionary = options.oneModelReferenceDictionary;
        var oneModelSuperClasses = options.oneModelSuperClasses;

        function getItemSubjectValue(mapping, item) {
            var item2 = {};
            for (var key in item) {
                item2[key.toLowerCase()] = item[key];
            }
            item = item2;
            var subjectValue = item[mapping.subject];
            if (!subjectValue) return null;
            if (subjectValue.trim) subjectValue = subjectValue.trim();
            return subjectValue;
        }

        //decode mappings
        mappings.forEach(function (mapping, _indexMapping) {
            var obj = util.deconcatSQLTableColumn(mapping.subject);
            if (obj && obj.column) mapping.subject = obj.column;
            obj = util.deconcatSQLTableColumn(mapping.object);
            if (obj && obj.column) mapping.object = obj.column;
        });

        ///process type and label
        var rejectedItems = [];
        var triples = [];
        data.forEach(function (item, _indexItem) {
            mappings.forEach(function (mapping, _indexMapping) {
                if (mapping.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    var subjectValue = getItemSubjectValue(mapping, item);
                    if (!subjectValue) return;
                    var objectClass = mapping.object;

                    var classType = oneModelSuperClasses[objectClass];
                    var processAsNoSubclass = false;
                    var uri = "";
                    if (classType == "ARDL-SPECIFIC") {
                        uri = KGgraphUri + subjectValue;
                        if (ARDLdictionary[subjectValue]) {
                            triples.push({
                                subject: uri,
                                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                object: objectClass,
                            });
                            triples.push({
                                subject: uri,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                object: "'" + util.formatStringForTriple(ARDLdictionary[subjectValue]) + "'",
                            });

                            existingUrisMap[subjectValue] = uri;
                        } else {
                            if (options.skipLocalDictionaryOrphans) rejectedItems.push(item);
                            else processAsNoSubclass = true;
                        }
                    } else if (classType == "REFERENCE") {
                        var obj = oneModelReferenceDictionary[objectClass][subjectValue];
                        if (!obj) {
                            if (options.skipOneModelOrphans) rejectedItems.push(item);
                            else processAsNoSubclass = true;
                        } else {
                            triples.push({
                                subject: obj.classUri,
                                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                object: objectClass,
                            });
                            triples.push({
                                subject: obj.classUri,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                object: "'" + util.formatStringForTriple(obj.classLabel) + "'",
                            });
                            existingUrisMap[subjectValue] = obj.classUri;
                        }
                    }

                    if (classType == "NO-SUBCLASSES" || processAsNoSubclass) {
                        uri = existingUrisMap[subjectValue];
                        if (!uri) {
                            uri = KGgraphUri + util.getRandomHexaId(options.generateIds);
                            existingUrisMap[subjectValue] = uri;
                            triples.push({
                                subject: uri,
                                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                object: objectClass,
                            });
                            triples.push({
                                subject: uri,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                object: "'" + util.formatStringForTriple(subjectValue) + "'",
                            });
                            triples.push({
                                subject: uri,
                                predicate: originalKGproperty,
                                object: "'" + subjectValue + "'",
                            });
                        }
                    }
                }
            });
        });

        //process ObjectProperties

        data.forEach(function (item, _indexItem) {
            mappings.forEach(function (mapping, _indexMapping) {
                if (mapping.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") return;

                var subjectValue = item[mapping.subject];
                if (!subjectValue) return;

                var subjectUri = existingUrisMap[subjectValue];
                if (!subjectUri) return;
                var objectValue = null;
                if (mapping.object instanceof Object) {
                    var p;
                    if ((p = mapping.object.indexOf("^^xsd:")) > -1) {
                        objectValue = "'" + item[mapping.object.substring(0, p)] + "'" + mapping.object.substring(p);
                    }
                } else {
                    objectValue = item[mapping.object];
                }
                if (!objectValue) return;
                if (objectValue.trim) objectValue = objectValue.trim();
                let objectSuffix = "";
                if (mapping.predicate == "http://www.w3.org/2002/07/owl#DatatypeProperty") {
                    if (util.isInt(objectValue)) {
                        const objectSuffix = "^^xsd:integer";
                        objectValue = "'" + objectValue + "'" + objectSuffix;
                    } else if (util.isFloat(objectValue)) {
                        const objectSuffix = "^^xsd:float";
                        objectValue = "'" + objectValue + "'" + objectSuffix;
                    }

                    triples.push({
                        subject: subjectUri,
                        predicate: mapping.object,
                        object: "'" + util.formatStringForTriple(objectValue) + "'",
                    });
                } else {
                    //item[object] is object

                    var objectUri = existingUrisMap[objectValue];
                    if (!objectUri) return rejectedItems.push(item);

                    triples.push({
                        subject: subjectUri,
                        predicate: mapping.predicate,
                        object: objectUri,
                    });
                }
            });
        });

        //  console.log("missing TOTAL subject IDs " + JSON.stringify(missingTotalSubjects));
        //  console.log("missing TOTAL objects IDs " + JSON.stringify(missingTotalObjects));
        callback(null, { triples: triples, urisMap: options.existingUrisMap });
    },
    generateAdlSqlTriples: function (mappingFilePath, KGgraphUri, options, callback) {
        if (!options) options = {};
        options.sparqlServerUrl += "?timeout=600000&debug=on";
        var sqlParams = { fetchSize: 2000 };
        var existingUrisMap = {};
        var mappings;
        var ARDLdictionary = {};
        var oneModelReferenceDictionary = {};
        var oneModelSuperClasses = {};
        var sqlTable = "";
        var dbConnection = null;
        var totalTriples = 0;
        var uniqueTriples = {};

        async.series(
            [
                //delete old Graph if options replaceGraph
                function (callbackSeries) {
                    if (!options.replaceGraph) return callbackSeries();

                    socket.message("KGbuild", "clearing Graph");
                    var queryDeleteGraph = " CLEAR GRAPH <" + KGgraphUri + ">";
                    var params = { query: queryDeleteGraph };
                    socket.message("KGbuild", "delete graph " + KGgraphUri);
                    httpProxy.post(options.sparqlServerUrl, null, params, function (err, _result) {
                        callbackSeries(err);
                    });
                },

                // load ARDL dictionary
                function (callbackSeries) {
                    if (options.dataSource.local_dictionary) {
                        socket.message("KGbuild", "loading KG local_dictionary ");

                        var sqlQuery =
                            "select " + options.dataSource.local_dictionary.idColumn + "," + options.dataSource.local_dictionary.labelColumn + " from " + options.dataSource.local_dictionary.table;

                        databaseModel
                            .query(options.dataSource.dbName, sqlQuery)
                            .then((result) => {
                                result.rows.forEach(function (item) {
                                    ARDLdictionary[item[options.dataSource.local_dictionary.idColumn]] = item[options.dataSource.local_dictionary.labelColumn];
                                });
                                return callbackSeries();
                            })
                            .catch((err) => {
                                return callbackSeries(err);
                            });
                    } else {
                        return callbackSeries();
                    }
                },

                // load reference dictionary
                function (callbackSeries) {
                    socket.message("KGbuild", "loading ONE MODEL reference dictionary ");

                    var sqlQuery = "select term,superClassUri,superClassLabel,classLabel,classUri,source from reference_dictionary ";
                    SQLserverConnector.getData("onemodel", sqlQuery, function (err, result) {
                        if (err) return callbackSeries(err);

                        // set uniqueItems with source priority
                        var sources = ["pca", "cfihos", "readi"];
                        result.sort(function (a, b) {
                            var aIndex = sources.indexOf(a.source);
                            var bIndex = sources.indexOf(b.source);
                            if (aIndex < bIndex) return 1;
                            if (bIndex < aIndex) return -1;
                            return 0;
                        });

                        result.forEach(function (item) {
                            if (!oneModelReferenceDictionary[item.superClassUri]) oneModelReferenceDictionary[item.superClassUri] = {};
                            if (!oneModelReferenceDictionary[item.superClassUri][item.term]) {
                                oneModelReferenceDictionary[item.superClassUri][item.term] = {
                                    classUri: item.classUri,
                                    classLabel: item.classLabel,
                                    source: item.source,
                                };
                            }
                        });
                        return callbackSeries();
                    });
                },

                // load reference dictionary
                function (callbackSeries) {
                    socket.message("KGbuild", "loading ONE MODEL superClasses ");

                    var sqlQuery = "select * from superClasses ";
                    SQLserverConnector.getData("onemodel", sqlQuery, function (err, result) {
                        if (err) return callbackSeries(err);
                        result.forEach(function (item) {
                            oneModelSuperClasses[item.superClassUri] = item.type;
                        });
                        return callbackSeries();
                    });
                },

                // get previously created uris
                function (callbackSeries) {
                    if (options.replaceGraph) return callbackSeries();
                    socket.message("KGbuild", "loading KG existing IDS ");
                    KGbuilder.getExistingLabelUriMap(options.sparqlServerUrl, KGgraphUri, null, function (err, result) {
                        if (err) return callbackSeries(err);
                        existingUrisMap = result;
                        callbackSeries();
                    });
                },

                //get uniqueTriples map // TO IMPLEMENT
                function (callbackSeries) {
                    return callbackSeries();
                },

                //prepare mappings
                function (callbackSeries) {
                    try {
                        var str = fs.readFileSync(mappingFilePath);
                        mappings = JSON.parse(str);
                    } catch (e) {
                        callbackSeries(e);
                    }
                    sqlTable = mappings.data.adlTable;
                    dbConnection = mappings.data.adlSource;

                    mappings.mappings.sort(function (a, b) {
                        var p = a.predicate.indexOf("#type");
                        var q = b.predicate.indexOf("#type");
                        if (p < q) return 1;
                        if (p > q) return -1;
                        return 0;
                    });
                    callbackSeries();
                },
                //generate triples and write in triple store
                function (callbackSeries) {
                    var processor = function (data, uniqueTriples, fetchedCount, callbackProcessor) {
                        options.existingUrisMap = existingUrisMap;
                        options.ARDLdictionary = ARDLdictionary;
                        options.oneModelReferenceDictionary = oneModelReferenceDictionary;
                        options.oneModelSuperClasses = oneModelSuperClasses;
                        options.existingUrisMap = existingUrisMap;

                        KGbuilder.generateMappingFileTriples(mappings.mappings, data, KGgraphUri, options, function (err, result) {
                            if (err) return callbackProcessor(err);

                            for (var key in result.urisMap) {
                                existingUrisMap[key] = result.urisMap[key];
                            }

                            // create new  triples in graph

                            var slicedTriples = util.sliceArray(result.triples, triplesFetchtLength);

                            async.eachSeries(
                                slicedTriples,
                                function (triples, callbackEach) {
                                    //    return callbackEach();
                                    var triplesStr = "";
                                    triples.forEach(function (triple) {
                                        var value = triple.object;

                                        if (value.indexOf("http") == 0) value = "<" + value + ">";
                                        var tripleStr = "<" + triple.subject + "> <" + triple.predicate + "> " + value + ".\n";
                                        var tripleHash = util.hashCode(tripleStr);
                                        if (uniqueTriples[tripleHash]) return;
                                        else {
                                            uniqueTriples[tripleHash] = 1;
                                            triplesStr += tripleStr;
                                        }
                                    });

                                    var queryGraph = "with <" + KGgraphUri + ">" + "insert {";
                                    queryGraph += triplesStr;

                                    queryGraph += "}";

                                    var params = { query: queryGraph };

                                    httpProxy.post(options.sparqlServerUrl, null, params, function (err, _result) {
                                        if (err) {
                                            socket.message(err);
                                            return callbackEach(err);
                                        }
                                        socket.message("KGbuild", "rows processed :" + fetchedCount + "  triples created: " + totalTriples);
                                        totalTriples += triples.length;
                                        return callbackEach(null);
                                    });
                                },
                                function (err) {
                                    if (err) {
                                        callbackProcessor(err);
                                    }
                                    return callbackProcessor(null, totalTriples);
                                },
                            );
                        });
                    };
                    var selectStr = "";
                    for (var _mapping in mappings.mappings) {
                        mappings.mappings.forEach(function (mapping) {
                            var column = mapping.subject;
                            column = column.substring(column.lastIndexOf(".") + 1);
                            if (selectStr.indexOf(column) < 0) {
                                if (selectStr != "") selectStr += ",";
                                selectStr += column;
                            }
                        });
                    }

                    if (dbConnection.type == "sql.sqlserver") {
                        var sqlQuery = "select count(*) as count from  " + dbConnection.dbName + "." + sqlTable + " ";

                        databaseModel
                            .query(dbConnection.dbName, sqlQuery)
                            .then((result) => {
                                socket.message("KGbuild", "tableSize_" + result.rows[0].count);

                                var sqlQuery = "select distinct " + selectStr + " from  " + dbConnection.dbName + "." + sqlTable + " ";

                                //sqlQuery += " ORDER BY " + selectStr + " "
                                SQLserverConnector.getFetchedData(dbConnection.dbName, sqlQuery, processor, sqlParams.fetchSize, uniqueTriples, function (err, _result) {
                                    //  SQLserverConnector.processFetchedData(dbConnection, sqlQuery, sqlParams.fetchSize, (options.startOffset || 0), sqlParams.maxOffset, processor, uniqueTriples, function (err, result.rows) {
                                    if (err) return callbackSeries(err);

                                    callbackSeries();
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                return callback(err);
                            });
                    } else {
                        sqlConnector.processFetchedData(
                            sqlParams.database,
                            sqlQuery,
                            sqlParams.fetchSize,
                            options.startOffset || 0,
                            sqlParams.maxOffset,
                            processor,
                            uniqueTriples,
                            function (err, _result) {
                                if (err) return callbackSeries(err);
                                callbackSeries();
                            },
                        );
                    }
                },
                // updateMappingFileInfo
                function (callbackSeries) {
                    try {
                        var str = fs.readFileSync(mappingFilePath);
                        var mappings = JSON.parse(str);
                        mappings.data.build = {
                            createdDate: new Date(),
                            triples: totalTriples,
                            graphUri: KGgraphUri,
                        };
                    } catch (e) {
                        return callbackSeries(e);
                    }
                    fs.writeFile(mappingFilePath, JSON.stringify(mappings, null, 2), function (err, _result) {
                        return callbackSeries(err);
                    });
                },
            ],

            function (err) {
                return callback(err);
            },
        );
    },

    getExistingLabelUriMap: function (sparqlUrl, graphUri, type, callbackX) {
        var fetchLimit = 10000;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " select ?term ?oneModelId  FROM <" +
            graphUri +
            ">   WHERE " +
            "{?term <" +
            originalKGproperty +
            "> ?oneModelId";

        query += "} limit " + fetchLimit + " ";

        var offset = 0;
        var resultSize = 1;
        var existingUrisMap = {};
        async.whilst(
            function (callbackTest) {
                //test
                var w = resultSize > 0;
                callbackTest(null, w);
            },
            function (callbackWhilst) {
                //iterate
                var query2 = query + " OFFSET " + offset;
                var body = {
                    url: sparqlUrl,
                    params: { query: query2 },
                    headers: {
                        Accept: "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                };
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    if (err) {
                        console.log(query2);
                        socket.message("KGbuild", err);
                        return callbackWhilst(err);
                    }

                    offset += result.results.bindings.length;
                    resultSize = result.results.bindings.length;

                    socket.message("KGbuild", "existing ids retrieved " + offset);

                    result.results.bindings.forEach(function (item) {
                        existingUrisMap[item.oneModelId.value] = item.term.value;
                    });
                    callbackWhilst();
                });
            },
            function (err) {
                return callbackX(err, existingUrisMap);
            },
        );
    },
    buidlKG: function (mappingFilePaths, sparqlServerUrl, graphUri, replaceGraph, dataSource, _options, callback) {
        var count = 0;
        async.eachSeries(
            mappingFilePaths,
            function (mappingFilePath1, callbackEach) {
                if (count++ > 0) replaceGraph = false;
                socket.message("KGbuild", "-----------Processing " + mappingFilePath1 + "--------------");

                mappingFilePath = KGcontroller.getMappingsDirPath() + mappingFilePath;

                if (mappingFilePath.indexOf(".json") < 0) mappingFilePath += ".json";
                //   mappingFilePath = path.resolve(mappingFilePath);*/

                if (!fs.existsSync(mappingFilePath)) {
                    return callbackEach("file " + mappingFilePath + " does not exist");
                }
                var options = {
                    generateIds: 15,
                    sparqlServerUrl: sparqlServerUrl,
                    replaceGraph: replaceGraph,
                    dataSource: dataSource,
                    _options: _options,
                };

                socket.message("KGbuild", "creating triples for mapping " + mappingFilePath);
                KGbuilder.generateAdlSqlTriples(mappingFilePath, graphUri, options, function (err, _result) {
                    if (err) return callbackEach(err);
                    //  totalTriples += result.length
                    return callbackEach();
                });
            },
            function (err) {
                if (err) callback(err);
                //   socket.message("KGbuild", "total triples created " + totalTriples)
                callback();
            },
        );
    },
};

module.exports = KGbuilder;
/*
if (false) {
    // eslint-disable-next-line no-constant-condition
    if (false) {
        // AFtwin UK


        var replaceGraph = true;
    }

    KGbuilder.buidlKG(mappingFilePaths, sparqlServerUrl, adlGraphUri, replaceGraph, function (err, _result) {
        if (err) return socket.message("KGbuild", err);
        return socket.message("KGbuild", "ALL DONE");
    });
}*/
