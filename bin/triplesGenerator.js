/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var fs = require("fs")

const util = require('./skosConverters/util.')
const xlsx2json = require('./xlsx2json.')
const async = require('async')
var httpProxy = require('./httpProxy.')
var sqlConnector = require('../bin/sqlConnectors/ADLSqlConnector.')
var idsCache = {}


var originalADLproperty = "http://data.total.com/resource/one-model#originalIdOf"
var totalRdlIdProperty = "http://data.total.com/resource/one-model#hasTotalRdlId"
var totalRdlIdProperty = "http://data.total.com/resource/one-model#hasTotalRdlUri"
var totalRdlUriPrefix = "http://data.total.com/resource/one-model/quantum-rdl/"
var triplesGenerator = {

    getJsonModel: function (filePath, callback) {
        var data = JSON.parse(fs.readFileSync(filePath))
        return callback(null, data)

    }

    , getWorkbookModel: function (filePath, callback) {
        xlsx2json.getWorkbookModel(filePath, callback)
    }

    , generateSheetDataTriples(mappings, data, uriPrefix, options, callback) {
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

                    uri = totalRdlUriPrefix + value
                    existingUrisMap[value] = uri;
                    var subjectLabel = options.rdlDictonary[uri];
                    if (!subjectLabel)
                        missingTotalSubjects.push(value)
                    else
                        triples.push({subject: uri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + util.formatStringForTriple(subjectLabel) + "'"})
                } else {
                    uri = uriPrefix + util.getRandomHexaId(options.generateIds)
                    existingUrisMap[value] = uri
                    triples.push({subject: uri, predicate: originalADLproperty, object: "'" + util.formatStringForTriple(value) + "'"})
                }
            }
            return uri;
        }

        data.forEach(function (item, index) {
            mappings.forEach(function (mapping, index) {


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
                            triples.push({subject: objectValue, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + options.oneModelDictionary[objectValue] + "'"})
                        }
                    } else if (mapping.object["prefix"]) {
                        objectValue = item[mapping.object.column]
                        if (!objectValue || objectValue.trim() == "")
                            return
                        objectValue = mapping.object["prefix"] + objectValue.trim()
                        if (!options.oneModelDictionary[objectValue])
                            return;
                        else {
                            triples.push({subject: objectValue, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + options.oneModelDictionary[objectValue] + "'"})
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
                        triples.push({subject: subjectUri, predicate: mapping.predicate, object: "'" + objectValue + "'"})
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

                        triples.push({subject: subjectUri, predicate: mapping.object, object: "'" + util.formatStringForTriple(objectValue) + "'"})

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
                                    existingUrisMap[objectValue] = uriPrefix + util.getRandomHexaId(options.generateIds)
                                    triples.push({subject: existingUrisMap[objectValue], predicate: originalADLproperty, object: "'" + objectValue + "'"})

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

        console.log("missing TOTAL subject IDs " + JSON.stringify(missingTotalSubjects));
        console.log("missing TOTAL objects IDs " + JSON.stringify(missingTotalObjects));
        callback(null, {triples: triples, urisMap: options.existingUrisMap})


    },

    generateAdlSqlTriples: function (mappingsPath, uriPrefix, sqlParams, options, callback) {
        if (!options)
            options = {}
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


        async.series([


//delete old Graph if options replaceGraph
                function (callbackSeries) {
                    if (!options.replaceGraph)
                        return callbackSeries();
                 /*   var queryDeleteGraph = "with <" + uriPrefix + ">" +
                        "delete {" +
                        "  ?sub ?pred ?obj ." +
                        "} " +
                        "where { ?sub ?pred ?obj .}"*/
                    var  queryDeleteGraph = " CLEAR GRAPH <" + uriPrefix + ">"
                    var params = {query: queryDeleteGraph}

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


                function (callbackSeries) {


                    triplesGenerator.getExistingLabelUriMap(options.sparqlServerUrl, options.getExistingUriMappings, null, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        existingUrisMap = result;
                        callbackSeries();
                    })
                }
                //prepare mappings
                , function (callbackSeries) {
            try {
                mappings = JSON.parse(fs.readFileSync(mappingsPath));
            }
            catch(e){
                callbackSeries(e)
            }
                    mappings.mappings.forEach(function (mapping) {
                        if (mapping.subject.indexOf("http") < 0) {
                            var array = mapping.subject.split(".")
                            mapping.subject = array[1]
                            if (!sqlTable)
                                sqlTable = array[0]
                        }
                        if (mapping.object.indexOf && mapping.object.indexOf("http") < 0) {
                            var array = mapping.object.split(".")
                            mapping.object = array[1]
                            if (!sqlTable)
                                sqlTable = array[0]
                        }
                    })

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
                        triplesGenerator.generateSheetDataTriples(mappings.mappings, data, uriPrefix, options, function (err, result) {
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

                                var queryCreateGraph = "with <" + uriPrefix + ">" +
                                    "insert {"
                                queryCreateGraph += triplesStr;

                                queryCreateGraph += "}"

                                var params = {query: queryCreateGraph}

                                httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {
                                    if (err) {
                                        console.log(err)
                                        return callbackEach(err);
                                    }
                                    console.log(JSON.stringify(result))
                                    return callbackEach(null)
                                })

                            }, function (err) {
                                if (err) {
                                    callbackProcessor(err)
                                }
                                return callbackProcessor(null)
                            })

                        })

                    }

                    var sqlQuery = "select * from  " + sqlTable + " ";
                    sqlConnector.processFetchedData(sqlParams.database, sqlQuery, sqlParams.fetchSize, (options.startOffset || 0), sqlParams.maxOffset, processor, function (err, result) {
                        if (err)
                            return callbackSeries(err);

                        callbackSeries()

                    })


                }


            ]

            , function (err) {
                return callback(err)

            })


    },


    generateXlsxBookTriples: function (mappings, source, uriPrefix, options, callback) {
        if (!options)
            options = {}
        var existingUrisMap = {}
        var mappingSheets = []
        var dataArray = [];
        var allTriples = [];
        var allSheetsdata = {}

        async.series([

                // laod existing mappings
                function (callbackSeries) {

                    triplesGenerator.getExistingLabelUriMap(options.sparqlServerUrl, graphUri, null, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        existingUrisMap = result;
                        callbackSeries();
                    })
                },

                //select xlsx sheets from mappings
                function (callbackSeries) {
                    mappings.mappings.forEach(function (mapping) {
                        var sheet = mapping.subject.split(".")[0]
                        if (mappingSheets.indexOf(sheet) < 0) {
                            mappingSheets.push(sheet)
                        }
                        if (!mapping.object)
                            return xx
                        if (mapping.object.indexOf && mapping.object.indexOf("http") < 0) {
                            var sheet = mapping.object.split(".")[0]
                            if (mappingSheets.indexOf(sheet) < 0) {
                                mappingSheets.push(sheet)
                            }
                        }
                    })
                    callbackSeries()
                },


                //xlsxSource
                , function (callbackSeries) {
                    if (!source.xlsxFilePath)
                        return callbackSeries()
                    xlsx2json.parse(source.xlsxFilePath, {sheets: mappingSheets}, function (err, result) {

                        if (err)
                            return callback(err)
                        allSheetsdata = result;
                    })
                },

                , function (callbackSeries) {
                    if (!source.sqlConnection)
                        return callbackSeries()
                    sqlConnector.getData(source.database, {sheets: mappingSheets}, function (err, result) {

                        if (err)
                            return callback(err)
                        allSheetsdata = result;
                    })
                },

                // load Xsls and transform data structure
                , function (callbackSeries) {


                    var dataMap = {};
                    var allCols = []
                    var predicatesMap = {}
                    mappings.mappings.forEach(function (mapping) {

                        var subject = mapping.subject
                        var subjectSheet = subject.split('.')[0]

                        var subjectCol = subject.split('.')[1]
                        var object = mapping.object
                        if (mapping.object.indexOf && object && object.indexOf("http") < 0) {
                            var objectSheet = object.split('.')[0]
                            var objectCol = object.split('.')[1]

                            predicatesMap[subjectCol + "_" + subjectCol] = mapping.predicate

                            allSheetsdata.data[objectSheet].forEach(function (item, index) {

                                var subjectValue = item[subjectCol];
                                var subjectColLinked = subjectCol;
                                if (subjectSheet != objectSheet) {
                                    if (subjectSheet == "TagtoTag")
                                        var x = 3;
                                    if (!subjectValue) {
                                        mappings.sheetJoinColumns[subject].forEach(function (col) {
                                            col = col.split(".")[1]
                                            subjectValue = item[col];
                                            if (subjectValue)
                                                return subjectColLinked = col;
                                        })

                                    }
                                }


                                var objectValue = item[objectCol]
                                if (!dataMap[subjectCol])
                                    dataMap[subjectCol] = {}
                                if (!dataMap[subjectCol][subjectValue])
                                    dataMap[subjectCol][subjectValue] = {}
                                if (!dataMap[subjectCol][subjectValue][objectCol])
                                    dataMap[subjectCol][subjectValue][objectCol] = []
                                dataMap[subjectCol][subjectValue][objectCol].push(objectValue)
                                //  console.log( JSON.stringify(dataMap[subjectCol]))


                            })

                        }

                    })


                    var subjectDataArray = []
                    var uniqueRows = {}
                    for (var subjectCol in dataMap) {
                        for (var subjectValue in dataMap[subjectCol]) {


                            for (var objectCol in dataMap[subjectCol][subjectValue]) {
                                var valuesArray = dataMap[subjectCol][subjectValue][objectCol]

                                valuesArray.forEach(function (value) {
                                    if (!uniqueRows[subjectCol + "_" + subjectValue]) {
                                        uniqueRows[subjectCol + "_" + subjectValue] = 1
                                        var obj = {[subjectCol]: subjectValue}
                                        obj[objectCol] = value
                                        dataArray.push(obj)
                                    }
                                })

                            }
                        }

                    }


                    callbackSeries();

                }

                //prepare mappings
                , function (callbackSeries) {
                    mappings.mappings.forEach(function (mapping) {
                        if (mapping.subject.indexOf("http") < 0)
                            mapping.subject = mapping.subject.split(".")[1]
                        if (mapping.object.indexOf && mapping.object.indexOf("http") < 0)
                            mapping.object = mapping.object.split(".")[1]
                    })

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


                //generate triples
                , function (callbackSeries) {

                    mappingSheets.forEach(function (sheet) {

                        options.existingUrisMap = existingUrisMap;

                        triplesGenerator.generateSheetDataTriples(mappings.mappings, dataArray, uriPrefix, options, function (err, result) {
                            if (err)
                                return callbackSeries(err)


                            allTriples = allTriples.concat(result.triples)


                        })
                    })

                    return callbackSeries(null, allTriples)
                }
            ],
            function (err) {
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                if (options.output && options.output == "ntTriples") {
                    function triplesToNt(triples) {
                        var str = ""
                        triples.forEach(function (item) {
                            str += "<" + item.subject + "> <" + item.predicate + "> "
                            if (item.object.indexOf("http") == 0)
                                str += "<" + item.object + ">"
                            else
                                str += item.object;
                            str += " ."

                        })
                        return str;

                    }

                    var str = triplesToNt(allTriples);
                    return callback(null, str)
                }
                return callback(null, allTriples)
            }
        )

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
                        console.log(err)
                        return callbackWhilst(err);
                    }

                    offset += result.results.bindings.length
                    resultSize = result.results.bindings.length

                    console.log("existing ids retrieved " + offset)

                    result.results.bindings.forEach(function (item) {
                        existingUrisMap[item.oneModelId.value] = item.term.value

                    })
                    callbackWhilst();
                })


            }, function (err) {
                return callbackX(err, existingUrisMap)

            })

    },

    buidlADL: function (mappingsDirPath, mappingFileNames, sparqlServerUrl, graphUri, rdlGraphUri, oneModelGraphUri, dbConnection, replaceGraph, callback) {

        sqlConnector.connection = dbConnection;
        var count = 0;
        async.eachSeries(mappingFileNames, function (mappingFile, callbackEach) {
            if (count++ > 0)
                replaceGraph = false
            var mappingPath = mappingsDirPath + mappingFile


            var options = {
                generateIds: 15,
                sparqlServerUrl: sparqlServerUrl,
                rdlGraphUri: rdlGraphUri,
                oneModelGraphUri: oneModelGraphUri,
                replaceGraph: replaceGraph,

            }

            console.log("creating triples for mapping " + mappingPath)
            triplesGenerator.generateAdlSqlTriples(mappingPath, graphUri, dbConnection, options, function (err, result) {
                return callbackEach(err)
            })


        }, function (err) {
            callback(err)
        })


    }
    , generateRdlTriples: function () {
        var filePath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\mainObjectsRequirements.txt"
        var json = util.csvToJson(filePath)
        var str = ""
        var graphUri = "http://data.total.com/resource/one-model/quantum-rdl/"
        var str = ""
        var typesMap = {

            /*  "attribute": "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute",
              "physicalObject": "http://standards.iso.org/iso/15926/part14/PhysicalObject",
              "functionalObject": "http://standards.iso.org/iso/15926/part14/FunctionalObject",*/
            "discipline": "http://w3id.org/readi/z018-rdl/Discipline",
            /* "requirement": "https://w3id.org/requirement-ontology/rdl/REQ_0011"*/
        }


        var jsonSlices = util.sliceArray(json, 300);
        async.eachSeries(jsonSlices, function (json, callbackEach) {
            var triples = ""
            json.forEach(function (item) {
                if (!item.id)
                    return;
                var subjectUri = graphUri + item.id;


                triples += "<" + subjectUri + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <" + typesMap[item.type] + ">.\n";
                triples += "<" + subjectUri + "> <http://www.w3.org/2000/01/rdf-schema#label> '" + util.formatStringForTriple(item.label) + "'.\n";
                if (item.parent && item.parent != "")
                    triples += "<" + subjectUri + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + graphUri + item.parent + ">.\n";


            })

            var queryCreateGraph = "with <" + graphUri + ">" +
                "insert {"
            queryCreateGraph += triples;

            queryCreateGraph += "}"

            var params = {query: queryCreateGraph}
            var options = {sparqlServerUrl: "http://51.178.139.80:8890/sparql"}

            httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {
                if (err) {
                    console.log(err)
                    return callbackEach(err);
                }
                console.log(JSON.stringify(result))
                return callbackEach(null)
            })
        }, function (err) {
            if (err)
                return console.log(err)
            console.log("done")
        })

    }

    , formatTurboGenTags: function () {

        var filePath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\tagAttributeD.txt"
        var json = util.csvToJson(filePath)
        //   var cols=["ID","TagNumber","FunctionalClassID","ServiceDescription","ValidationStatus","Status","CMMSRequired"]
        var cols = ["ID", "TagId", "TAG_ref", "Tag", "AttributeID", "Attributes", "UnitOfMeasureID", "Status", "Source"]
        // ID	TAG_Ref	Tag	TagID		Attributes	AttributeID	AttributeValue	UnitOfMeasureID	Status	Source
        //  ID	Tag_ID	TAG_Ref	Tag	AttributesID	Attributes	UnitOfMeasureID	Status	Source
        var str = ""
        cols.forEach(function (col, colIndex) {
            if (colIndex > 0)
                str += "\t"
            str += col
        })
        str += "\n"

        json.forEach(function (item, index) {
            cols.forEach(function (col, colIndex) {
                if (colIndex > 0)
                    str += "\t"
                str += item[col] || ""
            })
            str += "\n"


        })
        console.log(str);


    }


}

module.exports = triplesGenerator;


if (true) {
    if (false) {// buildClov


        var mappingsDirPath = "D:\\GitHub\\souslesensVocables\\other\\clov\\"
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var rdlGraphUri = "http://data.total.com/resource/one-model/quantum-rdl/"
        var adlGraphUri = "http://data.total.com/resource/one-model/assets/clov/"
        var mappingFileNames = [
        "tagMapping.json",
            "tagAttributeMapping.json",
            "tag2ModelMapping.json",
           "modelMapping.json",
            "modelAttributeMapping.json",
            "tag2tagMapping.json",
        ]


        var dbConnection = {
            host: "localhost",
            user: "root",
            password: "vi0lon",
            database: 'clov',
            fetchSize: 5000,
         //   maxOffset:100000,
        }
        var replaceGraph = true;

    }

    if (false) {// turbogen


        var mappingsDirPath = "D:\\GitHub\\souslesensVocables\\other\\turbogenerator\\"
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var rdlGraphUri = "http://data.total.com/resource/one-model/quantum-rdl/"
        var oneModelGraphUri = "http://data.total.com/resource/one-model/ontology/0.2/"
        var adlGraphUri = "http://data.total.com/resource/one-model/assets/turbogenerator/"
        var mappingFileNames = [

            "tagMapping.json",
            "tagAttributeMapping.json",
            "tag2ModelMapping.json",
            "modelMapping.json",
            "modelAttributeMapping.json",
            "tag2tagMapping.json",
            "requirementMapping.json",
            "breakdowns.json",
        ]


        var dbConnection = {
            host: "localhost",
            user: "root",
            password: "vi0lon",
            database: 'turbogenerator',
            fetchSize: 5000,
            maxOffset:null,
        }
        var replaceGraph = true;
    }

    if (false) {// SIL


        var mappingsDirPath = "D:\\GitHub\\souslesensVocables\\other\\SIL\\"
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var rdlGraphUri = "http://data.total.com/resource/sil/ontology/0.1/"
        var oneModelGraphUri = "http://data.total.com/resource/one-model/ontology/0.2/"
        var adlGraphUri = "http://data.total.com/resource/one-model/assets/sil/0.2/"
        var mappingFileNames = [
            "failureMapping.json"
        ]


        var dbConnection = {
            host: "localhost",
            user: "root",
            password: "vi0lon",
            database: 'sil',
            fetchSize: 5000,
          //  maxOffset:6000,
        }
        var replaceGraph = true
    }

    if (true) {// quantum_REQ


        var mappingsDirPath = "D:\\GitHub\\souslesensVocables\\other\\quantum\\"
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var rdlGraphUri = "http://data.total.com/resource/one-model/quantum-rdl/"
        var oneModelGraphUri = "http://data.total.com/resource/one-model/ontology/0.2/"
        var adlGraphUri = "http://data.total.com/resource/one-model/assets/quantum/requirements/0.1/"
        var mappingFileNames = [
            "requirementAssembly.json",
            "requirementPattern.json"
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


    triplesGenerator.buidlADL(mappingsDirPath, mappingFileNames, sparqlServerUrl, adlGraphUri, rdlGraphUri, oneModelGraphUri, dbConnection, replaceGraph,function (err, result) {
        if (err)
            return console.log(err);
        return console.log("ALL DONE");
    })
}

if (false) {
    triplesGenerator.generateRdlTriples()
}

if (false) {
    triplesGenerator.formatTurboGenTags()
}
