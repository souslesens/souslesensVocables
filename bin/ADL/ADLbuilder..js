/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var fs = require("fs")
var path = require("path")
const util = require('../util.')
const xlsx2json = require('../xlsx2json.')
const async = require('async')
var httpProxy = require('../httpProxy.')
var sqlConnector = require('./ADLSqlConnector.')
var SQLserverConnector = require('./SQLserverConnector.')
var socket = require('../../routes/socket.js');

var idsCache = {}


var originalADLproperty = "http://data.total.com/resource/one-model#originalIdOf"
var totalRdlIdProperty = "http://data.total.com/resource/one-model#hasTotalRdlId"
var totalRdlIdProperty = "http://data.total.com/resource/one-model#hasTotalRdlUri"
var totalRdlADLgraphUri = "http://data.total.com/resource/one-model/quantum-rdl/"


var ADLbuilder = {

    getJsonModel: function (filePath, callback) {
        var data = JSON.parse(fs.readFileSync(filePath))
        return callback(null, data)

    }


    , generateMappingFileTriples(mappings, data, ADLgraphUri, options, callback) {
        if (!options)
            options = {}


        var triples = [];

        var dataArray = []
        var missingTotalSubjects = []
        var missingTotalObjects = []
        var existingUrisMap = options.existingUrisMap;
        var ARDLdictionary = options.ARDLdictionary;
        var oneModelReferenceDictionary = options.oneModelReferenceDictionary;
        var oneModelSuperClasses = options.oneModelSuperClasses;

        function getUriFromValue(classUri, value) {
            var classType = oneModelSuperClasses[classUri];
            if (classType == "ARDL-SPECIFIC") {
                var uri = ADLgraphUri + value;
                if (ARDLdictionary[value]) {
                    triples.push({
                        subject: uri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: ARDLdictionary[value]
                    })
                }
                return uri;

            } else if (classType == "REFERENCE") {
                var obj = oneModelReferenceDictionary[classUri][value]
                if (!obj)
                    return null;
                triples.push({
                    subject: obj.classUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                    object: obj.classLabel
                })
                return obj.classUri;


            } else if (classType == "NO-SUBCLASSES") {
               var uri= existingUrisMap[value]
                if(!uri) {
                    uri = ADLgraphUri + util.getRandomHexaId(options.generateIds)
                    existingUrisMap[value] = uri
                    triples.push({
                        subject: uri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + util.formatStringForTriple(value) + "'"
                    })
                }
                return uri;

            }
            else{

                return null;
            }



        }

        data.forEach(function (item, indexItem) {
            mappings.forEach(function (mapping, indexMapping) {


                if (indexItem == 0) {
                    var obj = util.deconcatSQLTableColumn(mapping.subject)
                    if (obj && obj.column)
                        mapping.subject = obj.column
                    var obj = util.deconcatSQLTableColumn(mapping.object)
                    if (obj && obj.column)
                        mapping.object = obj.column
                }
                var item2 = {}
                for (var key in item) {
                    item2[key.toLowerCase()] = item[key]
                }
                item = item2

                var subjectValue = item[mapping.subject]

                if (!subjectValue)
                    return;
                if (subjectValue.trim)
                    subjectValue = subjectValue.trim()

               if(mapping.predicate== "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
                  var typeUri= getUriFromValue(mapping.object, subjectValue)
                   existingUrisMap[subjectValue]=typeUri
                   return
               }else {


                   var objectValue;
                   var objectRawValue;
                   var objectSuffix = ""
                   var p;


                   if (mapping.object instanceof Object) {
                       var value = item[mapping.object.column]
                       if (!value || value.trim() == "")
                           return


                   } else if ((p = mapping.object.indexOf("^^xsd:")) > -1) {
                       objectRawValue = "'" + item[mapping.object.substring(0, p)] + "'" + mapping.object.substring(p)


                   } else {
                       objectRawValue = item[mapping.object]

                   }


                   if (objectRawValue && objectRawValue.trim)
                       objectRawValue = objectValue.trim()


                   if (objectRawValue) {
                  //     var objectValue = getUriFromValue("xxx", objectValue)
  /*                     objectValue=existingUrisMap[objectRawValue]
if(!objectValue)
    return;*/
                       triples.push({
                           subject: subjectUri,
                           predicate: mapping.predicate,
                           object: "'" + objectValue + "'"
                       })
                   } else if (mapping.object.indexOf && mapping.object.indexOf("http") == 0) {

                       triples.push({subject: subjectUri, predicate: mapping.predicate, object: mapping.object})


                   } else {

                       if (!objectRawValue)
                           return;
                       if (mapping.predicate == "http://www.w3.org/2002/07/owl#DatatypeProperty") {
                           if (util.isInt(objectRawValue)) {
                               objectSuffix = "^^xsd:integer"
                               objectValue = "'" + objectRawValue + "'" + objectSuffix;
                           } else if (util.isFloat(objectRawValue)) {
                               objectSuffix = "^^xsd:float"
                               objectValue = "'" + objectRawValue + "'" + objectSuffix;
                           }else
                               objectValue= objectRawValue

                           triples.push({
                               subject: subjectUri,
                               predicate: mapping.object,
                               object: "'" + util.formatStringForTriple(objectValue) + "'"
                           })

                       } else {
                           if (mapping.predicate == "http://www.w3.org/2000/01/rdf-schema#label") {
                               objectValue = "'" + util.formatStringForTriple(objectRawValue) + "'"

                           } else {
                               if (existingUrisMap && existingUrisMap[objectRawValue]) {
                                   objectValue = existingUrisMap[objectRawValue];
                               }
                               if (!objectValue && options.generateIds) {
                                   var newUri = false
                                   if (!existingUrisMap[objectRawValue]) {
                                       existingUrisMap[objectRawValue] = ADLgraphUri + util.getRandomHexaId(options.generateIds)
                                       triples.push({
                                           subject: existingUrisMap[objectRawValue],
                                           predicate: originalADLproperty,
                                           object: "'" + objectValue + "'"
                                       })

                                       newUri = true
                                   }
                                   objectValue = existingUrisMap[objectRawValue]

                               }
                           }
                           triples.push({subject: subjectUri, predicate: mapping.predicate, object: objectValue})
                       }

                   }
               }

                if (!subjectUri || subjectUri == "undefined")
                    x = 3
            })
        })

        //  console.log("missing TOTAL subject IDs " + JSON.stringify(missingTotalSubjects));
        //  console.log("missing TOTAL objects IDs " + JSON.stringify(missingTotalObjects));
        callback(null, {triples: triples, urisMap: options.existingUrisMap})


    },

    generateAdlSqlTriples: function (mappingFilePath, ADLgraphUri, options, callback) {
        if (!options)
            options = {}
        options.sparqlServerUrl += "?timeout=600000&debug=on"
        var sqlParams = {fetchSize: 5000}
        var existingUrisMap = {}
        var mappingSheets = []
        var dataArray = [];
        var allTriples = [];
        var allSheetsdata = {}
        var mappings
        var ARDLdictionary = {}
        var oneModelReferenceDictionary = {}
        var oneModelSuperClasses = {}
        var sqlTable = "";
        var dbConnection = null;
        var totalTriples = 0;
        var selectColumns = []
        var uniqueTriples = {};


        async.series([


//delete old Graph if options replaceGraph
                function (callbackSeries) {
                    if (!options.replaceGraph)
                        return callbackSeries();

                    socket.message("ADLbuild", "clearing Graph")
                    var queryDeleteGraph = " CLEAR GRAPH <" + ADLgraphUri + ">"
                    var params = {query: queryDeleteGraph}
                    socket.message("ADLbuild", "delete graph " + ADLgraphUri)
                    httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {

                        callbackSeries(err);

                    })
                },


                // load ARDL dictionary
                function (callbackSeries) {

                    if (options.dataSource.local_dictionary) {

                        socket.message("ADLbuild", "loading ADL local_dictionary ")

                        var sqlQuery = "select " + options.dataSource.local_dictionary.idColumn + "," + options.dataSource.local_dictionary.labelColumn

                            + " from " + options.dataSource.local_dictionary.table
                        SQLserverConnector.getData(options.dataSource.dbName, sqlQuery, function (err, result) {
                            if (err)
                                return callbackSeries(err)
                            result.forEach(function (item) {
                                ARDLdictionary[item[options.dataSource.local_dictionary.idColumn]] = item[options.dataSource.local_dictionary.labelColumn]

                            })
                            return callbackSeries();

                        })
                    } else {
                        return callbackSeries();
                    }

                },

                // load reference dictionary
                function (callbackSeries) {
                    socket.message("ADLbuild", "loading ONE MODEL reference dictionary ")


                    var sqlQuery = "select term,superClassUri,superClassLabel,classLabel,classUri from reference_dictionary "
                    SQLserverConnector.getData("onemodel", sqlQuery, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        result.forEach(function (item) {
                            if (!oneModelReferenceDictionary[item.superClassUri])
                                oneModelReferenceDictionary[item.superClassUri] = {}
                            oneModelReferenceDictionary[item.superClassUri][item.term] = {
                                classUri: item.classUri,
                                classLabel: item.classLabel
                            }


                        })
                        return callbackSeries();

                    })


                },

                // load reference dictionary
                function (callbackSeries) {
                    socket.message("ADLbuild", "loading ONE MODEL superClasses ")


                    var sqlQuery = "select * from superClasses "
                    SQLserverConnector.getData("onemodel", sqlQuery, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        result.forEach(function (item) {

                            oneModelSuperClasses[item.superClassUri] = item.type;


                        })
                        return callbackSeries();

                    })


                },

// get previously created uris
                function (callbackSeries) {
                    if (options.replaceGraph)
                        return callbackSeries();
                    socket.message("ADLbuild", "loading ADL existing IDS ")
                    ADLbuilder.getExistingLabelUriMap(options.sparqlServerUrl, ADLgraphUri, null, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        existingUrisMap = result;
                        callbackSeries();
                    })
                },


                //get uniqueTriples map // TO IMPLEMENT
                function (callbackSeries) {
                    return callbackSeries()

                }



                //prepare mappings
                , function (callbackSeries) {
                    try {

                        var str = fs.readFileSync(mappingFilePath)
                        mappings = JSON.parse(str);
                    } catch (e) {
                        callbackSeries(e)
                    }
                    sqlTable = mappings.data.adlTable
                    dbConnection = mappings.data.adlSource

                    mappings.mappings.sort(function (a, b) {
                        var p = a.predicate.indexOf("#type");
                        var q = b.predicate.indexOf("#type");
                        if (p < q)
                            return 1;
                        if (p > q)
                            return -1;
                        return 0;

                    })
                    callbackSeries();
                }
                ,

                //generate triples and write in triple store
                function (callbackSeries) {


                    var processor = function (data, uniqueTriples, callbackProcessor) {


                        options.existingUrisMap = existingUrisMap;
                        options.ARDLdictionary = ARDLdictionary
                        options.oneModelReferenceDictionary = oneModelReferenceDictionary;
                        options.oneModelSuperClasses = oneModelSuperClasses;
                        options.existingUrisMap = existingUrisMap;

                        ADLbuilder.generateMappingFileTriples(mappings.mappings, data, ADLgraphUri, options, function (err, result) {
                            if (err)
                                return callbackProcessor(err)

                            for (var key in result.urisMap) {
                                existingUrisMap[key] = result.urisMap[key]
                            }

                            // create new  triples in graph

                            var slicedTriples = util.sliceArray(result.triples, 1000)

                            async.eachSeries(slicedTriples, function (triples, callbackEach) {
                                //    return callbackEach();
                                var triplesStr = ""
                                triples.forEach(function (triple) {
                                    var value = triple.object


                                    if (value.indexOf("http") == 0)
                                        value = "<" + value + ">"
                                    var tripleStr = "<" + triple.subject + "> <" + triple.predicate + "> " + value + ".\n"
                                    var tripleHash = util.hashCode(tripleStr)
                                    if (uniqueTriples[tripleHash])
                                        return;
                                    else {
                                        uniqueTriples[tripleHash] = 1
                                        triplesStr += tripleStr
                                    }
                                })

                                var queryGraph = "with <" + ADLgraphUri + ">" +
                                    "insert {"
                                queryGraph += triplesStr;

                                queryGraph += "}"

                                var params = {query: queryGraph}

                                httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {
                                    if (err) {
                                        socket.message(err)
                                        return callbackEach(err);
                                    }
                                    socket.message("ADLbuild", "triples created: " + totalTriples)
                                    totalTriples += triples.length
                                    return callbackEach(null)
                                })

                            }, function (err) {
                                if (err) {
                                    callbackProcessor(err)
                                }
                                return callbackProcessor(null, totalTriples)
                            })

                        })

                    }
                    var selectStr = ""
                    for (var mapping in mappings.mappings) {
                        mappings.mappings.forEach(function (mapping) {
                            var column = mapping.subject;
                            column = column.substring(column.lastIndexOf(".") + 1)
                            if (selectStr.indexOf(column) < 0) {
                                if (selectStr != "")
                                    selectStr += ","
                                selectStr += column
                            }
                        })
                    }


                    var sqlQuery = "select distinct " + selectStr + " from  " + sqlTable + " ";
                    if (dbConnection.type == "sql.sqlserver") {
                        sqlQuery += " ORDER BY " + selectStr + " "
                        SQLserverConnector.processFetchedData(dbConnection, sqlQuery, sqlParams.fetchSize, (options.startOffset || 0), sqlParams.maxOffset, processor, uniqueTriples, function (err, result) {
                            if (err)
                                return callbackSeries(err);

                            callbackSeries()

                        })
                    } else {
                        sqlConnector.processFetchedData(sqlParams.database, sqlQuery, sqlParams.fetchSize, (options.startOffset || 0), sqlParams.maxOffset, processor, uniqueTriples, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                            callbackSeries()

                        })
                    }


                },
                // updateMappingFileInfo
                function (callbackSeries) {
                    try {
                        var str = fs.readFileSync(mappingFilePath)
                        var mappings = JSON.parse(str);
                        mappings.data.build = {
                            createdDate: new Date(),
                            triples: totalTriples,
                            graphUri: ADLgraphUri,
                        }
                    } catch (e) {
                        return callbackSeries(e)
                    }
                    fs.writeFile(mappingFilePath, JSON.stringify(mappings, null, 2), function (err, result) {
                        return callbackSeries(err)
                    })
                }


            ]

            , function (err) {

                return callback(err)

            })


    }


    , getExistingLabelUriMap: function (serverUrl, graphUri, type, callbackX) {

        var fetchLimit = 5000
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " select ?term ?oneModelId  FROM <" + graphUri + ">   WHERE " +
            "{?term <" + originalADLproperty + "> ?oneModelId"

        query += "} limit " + fetchLimit + " "

        var offset = 0
        var resultSize = 1
        var existingUrisMap = {}
        async.whilst(
            function (callbackTest) {//test
                var w = resultSize > 0;
                callbackTest(null, w)
            },
            function (callbackWhilst) {//iterate
                var query2 = query + " OFFSET " + offset
                var body = {
                    url: serverUrl,
                    params: {query: query2},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    if (err) {
                        socket.message("ADLbuild", err)
                        return callbackWhilst(err);
                    }

                    offset += result.results.bindings.length
                    resultSize = result.results.bindings.length

                    socket.message("ADLbuild", "existing ids retrieved " + offset)

                    result.results.bindings.forEach(function (item) {
                        existingUrisMap[item.oneModelId.value] = item.term.value

                    })
                    callbackWhilst();
                })


            }, function (err) {
                return callbackX(err, existingUrisMap)

            })

    },


    buidlADL: function (mappingFileNames, sparqlServerUrl, graphUri, replaceGraph, dataSource, callback) {

        var totalTriples = 0
        var count = 0;
        async.eachSeries(mappingFileNames, function (mappingFileName, callbackEach) {
            if (count++ > 0)
                replaceGraph = false
            socket.message("ADLbuild", "-----------Processing " + mappingFileName + "--------------")
            var dir = path.join(__dirname, "data/")
            dir = path.resolve(dir)
            var mappingFilePath = dir + "/" + mappingFileName
            if (mappingFilePath.indexOf(".json") < 0)
                mappingFilePath += ".json"
            mappingFileName = path.resolve(mappingFilePath)

            if (!fs.existsSync(mappingFileName)) {
                return callbackEach("file " + mappingFileName + " does not exist")
            }
            var options = {
                generateIds: 15,
                sparqlServerUrl: sparqlServerUrl,
                rdlGraphUri: rdlGraphUri,
                oneModelGraphUri: oneModelGraphUri,
                replaceGraph: replaceGraph,
                dataSource: dataSource

            }

            socket.message("ADLbuild", "creating triples for mapping " + mappingFileName)
            ADLbuilder.generateAdlSqlTriples(mappingFilePath, graphUri, options, function (err, result) {
                if (err)
                    return callbackEach(err)
                //  totalTriples += result.length
                return callbackEach()

            })


        }, function (err) {
            if (err)
                callback(err)
            //   socket.message("ADLbuild", "total triples created " + totalTriples)
            callback()
        })


    }


}

module.exports = ADLbuilder;


if (false) {


    if (false) {// AFtwin UK


        var mappingsDirPath = "D:\\webstorm\\souslesensVocables\\bin\\ADL\\data\\"
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var rdlGraphUri = "http://data.total.com/resource/one-model/quantum-rdl/"
        var oneModelGraphUri = "http://data.total.com/resource/one-model/ontology/0.2/"
        var adlGraphUri = "http://data.total.com/resource/one-model/assets/aftwin-uk/0.1/"
        var mappingFileNames = [
            "MDM_2.3_AFTWIN_adl.tblModel.json",
            "MDM_2.3_AFTWIN_adl.tblModelAttribute.json"
        ]


        var dbConnection = {
            host: "localhost",
            user: "root",
            password: "vi0lon",
            database: 'quantum',
            fetchSize: 5000,
            //  maxOffset:6000,
        }
        var replaceGraph = true
    }


    ADLbuilder.buidlADL(mappingFileNames, sparqlServerUrl, adlGraphUri, replaceGraph, function (err, result) {
        if (err)
            return socket.message("ADLbuild", err);
        return socket.message("ADLbuild", "ALL DONE");
    })
}


