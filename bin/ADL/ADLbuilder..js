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
        var existingUrisMap = options.existingUrisMap
        var dataArray = []
        var missingTotalSubjects = []
        var missingTotalObjects = []

        function getUriFromValue(value) {
            var uri = existingUrisMap[value]
            if (!uri) {

                if (value && value.indexOf && value.indexOf("TOTAL-") == 0) {

                    uri = totalRdlADLgraphUri + value
                    existingUrisMap[value] = uri;
                    var subjectLabel = options.rdlDictonary[uri];
                    if (!subjectLabel)
                        missingTotalSubjects.push(value)
                    else
                        triples.push({
                            subject: uri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                            object: "'" + util.formatStringForTriple(subjectLabel) + "'"
                        })
                } else {
                    uri = ADLgraphUri + util.getRandomHexaId(options.generateIds)
                    existingUrisMap[value] = uri
                    triples.push({
                        subject: uri,
                        predicate: originalADLproperty,
                        object: "'" + util.formatStringForTriple(value) + "'"
                    })
                }
            }
            return uri;
        }

        data.forEach(function (item, indexItem) {
            mappings.forEach(function (mapping, indexMapping) {

                if(mapping.subject.indexOf("functionalclassid")>-1)
                    var x=3

                if(item[mapping.subject]=="TOTAL-P0000000874")
                    var x=3


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

                var subjectUri = getUriFromValue(subjectValue)


                if (!subjectUri)
                    return;


                if (mapping.object == "Unit")
                    var x = 3


                var objectValue;
                var objectSuffix = ""
                var p;

                if (mapping.object == "xsd:string")
                    var x = 3

                if (mapping.predicate == "rdfs:label")
                    var x = 3

                if (mapping.object instanceof Object) {
                    var value = item[mapping.object.column]
                    if (!value || value.trim() == "")
                        return
                    value = value.trim()
                    if (mapping.object["switch"]) {
                        if (mapping.object["switch"][value])
                            objectValue = mapping.object["switch"][value]
                        else if (mapping.object["switch"].default)
                            objectValue = mapping.object["switch"].default
                        else
                            return;
                        if (options.oneModelDictionary[objectValue]) {
                            triples.push({
                                subject: objectValue,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                object: "'" + options.oneModelDictionary[objectValue] + "'"
                            })
                        }
                    } else if (mapping.object["prefix"]) {
                        objectValue = item[mapping.object.column]
                        if (!objectValue || objectValue.trim() == "")
                            return
                        objectValue = mapping.object["prefix"] + objectValue.trim()
                        if (!options.oneModelDictionary[objectValue])
                            return;
                        else {
                            triples.push({
                                subject: objectValue,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                object: "'" + options.oneModelDictionary[objectValue] + "'"
                            })
                        }


                    } else
                        return callback("bad definition of mapping object")

                } else if ((p = mapping.object.indexOf("^^xsd:")) > -1) {
                    objectValue = "'" + item[mapping.object.substring(0, p)] + "'" + mapping.object.substring(p)


                } else {
                    objectValue = item[mapping.object]

                }


                if (objectValue && objectValue.trim)
                    objectValue = objectValue.trim()


                if (objectValue && objectValue.indexOf && objectValue.indexOf("TOTAL-") == 0) {
                    var totalUri = getUriFromValue(objectValue)
                    if (totalUri)
                        triples.push({subject: subjectUri, predicate: mapping.predicate, object: totalUri})
                    else
                        triples.push({
                            subject: subjectUri,
                            predicate: mapping.predicate,
                            object: "'" + objectValue + "'"
                        })
                } else if (mapping.object.indexOf && mapping.object.indexOf("http") == 0) {

                    triples.push({subject: subjectUri, predicate: mapping.predicate, object: mapping.object})


                } else {

                    if (!objectValue)
                        return;
                    if (mapping.predicate == "http://www.w3.org/2002/07/owl#DatatypeProperty") {
                        if (util.isInt(objectValue)) {
                            objectSuffix = "^^xsd:integer"
                            objectValue = "'" + objectValue + "'" + objectSuffix;
                        } else if (util.isFloat(objectValue)) {
                            objectSuffix = "^^xsd:float"
                            objectValue = "'" + objectValue + "'" + objectSuffix;
                        }

                        triples.push({
                            subject: subjectUri,
                            predicate: mapping.object,
                            object: "'" + util.formatStringForTriple(objectValue) + "'"
                        })

                    } else {
                        if (mapping.predicate == "http://www.w3.org/2000/01/rdf-schema#label") {
                            objectValue = "'" + util.formatStringForTriple(objectValue) + "'"

                        } else {
                            if (existingUrisMap && existingUrisMap[objectValue]) {
                                objectValue = existingUrisMap[objectValue];
                            }
                            if (!objectValue && options.generateIds) {
                                var newUri = false
                                if (!existingUrisMap[objectValue]) {
                                    existingUrisMap[objectValue] = ADLgraphUri + util.getRandomHexaId(options.generateIds)
                                    triples.push({
                                        subject: existingUrisMap[objectValue],
                                        predicate: originalADLproperty,
                                        object: "'" + objectValue + "'"
                                    })

                                    newUri = true
                                }
                                var objectValue = existingUrisMap[objectValue]

                            }
                        }
                        triples.push({subject: subjectUri, predicate: mapping.predicate, object: objectValue})
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
        options.sparqlServerUrl+="?timeout=600000&debug=on"
        var sqlParams = {fetchSize: 5000}
        var existingUrisMap = {}
        var mappingSheets = []
        var dataArray = [];
        var allTriples = [];
        var allSheetsdata = {}
        var mappings
        var rdlDictonary = {}
        var rdlInverseDictonary = {};
        var oneModelDictionary = {}
        var oneModelInverseDictionary = {}
        var sqlTable = "";
        var dbConnection = null;
        var totalTriples = 0


        async.series([


//delete old Graph if options replaceGraph
                function (callbackSeries) {
                    if (!options.replaceGraph)
                        return callbackSeries();
                    /*   var queryDeleteGraph = "with <" + ADLgraphUri + ">" +
                           "delete {" +
                           "  ?sub ?pred ?obj ." +
                           "} " +
                           "where { ?sub ?pred ?obj .}"*/
                    socket.message("ADLbuild", "clearing Graph")
                    var queryDeleteGraph = " CLEAR GRAPH <" + ADLgraphUri + ">"
                    var params = {query: queryDeleteGraph}
                    socket.message("ADLbuild", "delete graph "+ADLgraphUri)
                    httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {

                        callbackSeries(err);

                    })
                },

                // load RDL dictionary
                function (callbackSeries) {

                    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "select ?sub ?subLabel  from <" + options.rdlGraphUri + "> where {" +
                        "  ?sub rdfs:label ?subLabel ." +
                        "} "
                    var params = {query: query}
                    socket.message("ADLbuild", "loading RDL dictionary ")
                    httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {
                        if (err)
                            return callbackSeries(err)

                        result.results.bindings.forEach(function (item) {
                            rdlDictonary[item.sub.value] = item.subLabel.value
                            rdlInverseDictonary[item.subLabel.value] = item.sub.value
                        })


                        callbackSeries(err);

                    })
                },

                // load ONE-MODEL dictionary
                function (callbackSeries) {
                    socket.message("ADLbuild", "loading ONE MODEL graph ")
                    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "select ?sub ?subLabel  from <" + options.oneModelGraphUri + "> where {" +
                        "  ?sub rdfs:label ?subLabel ." +
                        "} "
                    var params = {query: query}
                    httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {
                        if (err)
                            return callbackSeries(err)

                        result.results.bindings.forEach(function (item) {
                            oneModelDictionary[item.sub.value] = item.subLabel.value
                            oneModelInverseDictionary[item.subLabel.value] = item.sub.value
                        })


                        callbackSeries(err);

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


                    var processor = function (data, callbackProcessor) {


                        options.existingUrisMap = existingUrisMap;
                        options.rdlDictonary = rdlDictonary
                        options.rdlInverseDictonary = rdlInverseDictonary,
                            options.oneModelDictionary = oneModelDictionary;
                        options.oneModelInverseDictionary = oneModelInverseDictionary;
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

                                    if (!triple.subject)
                                        var x = 3
                                    if (!triple.object)
                                        var x = 3
                                    if (value.indexOf("http") == 0)
                                        value = "<" + value + ">"
                                    triplesStr += "<" + triple.subject + "> <" + triple.predicate + "> " + value + ".\n"
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

                    var sqlQuery = "select * from  " + sqlTable + " ";
                    if (dbConnection.type == "sql.sqlserver") {
                        SQLserverConnector.processFetchedData(dbConnection, sqlQuery, sqlParams.fetchSize, (options.startOffset || 0), sqlParams.maxOffset, processor, function (err, result) {
                            if (err)
                                return callbackSeries(err);

                            callbackSeries()

                        })
                    } else {
                        sqlConnector.processFetchedData(sqlParams.database, sqlQuery, sqlParams.fetchSize, (options.startOffset || 0), sqlParams.maxOffset, processor, function (err, result) {
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


    buidlADL: function (mappingFileNames, sparqlServerUrl, graphUri, rdlGraphUri, oneModelGraphUri, replaceGraph, callback) {

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

            if(!fs.existsSync(mappingFileName)){
                return callbackEach("file "+mappingFileName+" does not exist")
            }
            var options = {
                generateIds: 15,
                sparqlServerUrl: sparqlServerUrl,
                rdlGraphUri: rdlGraphUri,
                oneModelGraphUri: oneModelGraphUri,
                replaceGraph: replaceGraph,

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


    ADLbuilder.buidlADL(mappingFileNames, sparqlServerUrl, adlGraphUri, rdlGraphUri, oneModelGraphUri, replaceGraph, function (err, result) {
        if (err)
            return socket.message("ADLbuild", err);
        return socket.message("ADLbuild", "ALL DONE");
    })
}


