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
        var idsMap = options.labelUrisMap
        var dataArray = []
        data.forEach(function (item, index) {
            mappings.forEach(function (mapping, index) {

                var subjectValue = item[mapping.subject];

                if (!subjectValue)
                    return;


                var subjectUri
                if (idsMap && idsMap[subjectValue]) {
                    subjectUri = idsMap[subjectValue];
                }
                if (!subjectUri && options.generateIds) {
                    var newUri = false
                    if (!idsMap[subjectValue]) {
                        idsMap[subjectValue] = uriPrefix + util.getRandomHexaId(options.generateIds)
                        triples.push({subject: idsMap[subjectValue], predicate: originalADLproperty, object: "'" + subjectValue + "'"})
                        newUri = true
                    }
                    subjectUri = idsMap[subjectValue]
                    /*   if (newUri)
                           options.labelUrisMap[subjectValue] = subjectUri;
                       triples.push({subject: subjectUri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + subjectValue + "'"})*/

                }

                if (!subjectUri)
                    var x = 3


                var objectValue;

                if (mapping.object.indexOf("http") == 0) {
                    objectValue = mapping.object;
                    triples.push({subject: subjectUri, predicate: mapping.predicate, object: objectValue})
                } else {

                    var objectValue = item[mapping.object]

                    if (mapping.predicate == "http://standards.iso.org/iso/15926/part14/hasFunctionalPart")
                        var x = 3
                    if (!objectValue)
                        return;

                    var objectSuffix = ""
                    // if(util.isInt(objectValue))
                    if (objectValue.indexOf("TOTAL-") == 0) {
                        var objectValueUri = totalRdlUriPrefix + objectValue
                        triples.push({subject: subjectUri, predicate: totalRdlIdProperty, object: "<" + objectValueUri + ">"})
                        var labelValue = options.rdlDictonary[objectValueUri];
                        if (!labelValue)
                          ;//  triples.push({subject: objectValueUri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + objectValue + "'"})
                        else
                            triples.push({subject: objectValueUri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + util.formatStringForTriple(labelValue )+ "'"})


                    }

                    if (mapping.predicate == "http://www.w3.org/2002/07/owl#DatatypeProperty") {
                        triples.push({subject: subjectUri, predicate: mapping.object, object: "'" + objectValue + "'"})

                    } else {
                        if (mapping.predicate == "http://www.w3.org/2000/01/rdf-schema#label")
                            objectValue = "'" + util.formatStringForTriple(objectValue) + "'"
                        else if (!isNaN(objectValue)) {
                            objectSuffix = "^^xsd:integer"
                            objectValue = "'" + objectValue + "'" + objectSuffix;
                        } else if (util.isFloat(objectValue)) {
                            objectSuffix = "^^xsd:float"
                            objectValue = "'" + objectValue + "'" + objectSuffix;
                        } else {
                            if (idsMap && idsMap[objectValue]) {
                                objectValue = idsMap[objectValue];
                            }
                            if (!objectValue && options.generateIds) {
                                var newUri = false
                                if (!idsMap[objectValue]) {
                                    idsMap[objectValue] = uriPrefix + util.getRandomHexaId(options.generateIds)
                                    triples.push({subject: idsMap[objectValue], predicate: originalADLproperty, object: "'" + objectValue + "'"})

                                    newUri = true
                                }
                                var objectValue = idsMap[objectValue]

                            }
                        }
                        triples.push({subject: subjectUri, predicate: mapping.predicate, object: objectValue})
                    }

                }


            })
        })
        callback(null, {triples: triples, urisMap: options.labelUrisMap})


    },

    generateAdlSqlTriples: function (mappingsPath, uriPrefix, sqlParams, options, callback) {
        if (!options)
            options = {}
        var labelUrisMap = {}
        var mappingSheets = []
        var dataArray = [];
        var allTriples = [];
        var allSheetsdata = {}
        var mappings
        var rdlDictonary = {}


        async.series([


//delete old Graph if options replaceGraph
                function (callbackSeries) {
                    if (!options.replaceGraph)
                        return callbackSeries();
                    var queryDeleteGraph = "with <" + uriPrefix + ">" +
                        "delete {" +
                        "  ?sub ?pred ?obj ." +
                        "} " +
                        "where { ?sub ?pred ?obj .}"

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
                        })

                        callbackSeries(err);

                    })
                },


                function (callbackSeries) {

                    if (!options.getExistingUriMappings)
                        return callbackSeries();
                    triplesGenerator.getExistingLabelUriMap(options.sparqlServerUrl, options.getExistingUriMappings, null, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        labelUrisMap = result;
                        callbackSeries();
                    })
                }
                //prepare mappings
                , function (callbackSeries) {
                    mappings = JSON.parse(fs.readFileSync(mappingsPath));
                    mappings.mappings.forEach(function (mapping) {
                        if (mapping.subject.indexOf("http") < 0)
                            mapping.subject = mapping.subject.split(".")[1]
                        if (mapping.object.indexOf("http") < 0)
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
                ,

                //generate triples and write in triple store
                function (callbackSeries) {


                    var processor = function (data, callbackProcessor) {

                        if (options.getExistingUriMappings)
                            options.labelUrisMap = labelUrisMap;
                        options.rdlDictonary = rdlDictonary
                        triplesGenerator.generateSheetDataTriples(mappings.mappings, data, uriPrefix, options, function (err, result) {
                            if (err)
                                return callbackProcessor(err)

                            for (var key in result.urisMap) {
                                labelUrisMap[key] = result.urisMap[key]
                            }

                            // create new  triples in graph

                            var slicedTriples = util.sliceArray(result.triples, 1000)

                            async.eachSeries(slicedTriples, function (triples, callbackEach) {
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
                                if( err){
                                    callbackProcessor(err)
                                }
                                return callbackProcessor(null)
                            })

                        })

                    }


                    sqlConnector.processFetchedData(sqlParams.dbName, sqlParams.query, sqlParams.fetchSize,(options.startOffset ||0), processor, function (err, result) {
                        if (err)
                            return callbackSeries(err);

                        callbackSeries()

                    })


                }


            ]

            , function (err) {
                console.log("ALL DONE")

            })


    },


    generateXlsxBookTriples: function (mappings, source, uriPrefix, options, callback) {
        if (!options)
            options = {}
        var labelUrisMap = {}
        var mappingSheets = []
        var dataArray = [];
        var allTriples = [];
        var allSheetsdata = {}

        async.series([

                // laod existing mappings
                function (callbackSeries) {
                    if (!options.getExistingUriMappings)
                        return callbackSeries();
                    triplesGenerator.getExistingLabelUriMap(options.sparqlServerUrl, options.getExistingUriMappings, null, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        labelUrisMap = result;
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
                        if (mapping.object.indexOf("http") < 0) {
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
                        if (object && object.indexOf("http") < 0) {
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
                        if (mapping.object.indexOf("http") < 0)
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
                        if (options.getExistingUriMappings)
                            options.labelUrisMap = labelUrisMap;

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
            " select distinct ?term ?oneModelId  FROM <" + graphUri + ">   WHERE " +
            "{?term <" + originalADLproperty + "> ?oneModelId"

        query += "} limit " + fetchLimit + " "

        var offset = 0
        var resultSize = 1
        var labelUrisMap = {}
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
                    if (err)
                        return callbackWhilst(err);

                    offset += result.results.bindings.length
                    resultSize = result.results.bindings.length


                    result.results.bindings.forEach(function (item) {
                        labelUrisMap[item.oneModelId.value] = item.term.value

                    })
                    callbackWhilst();
                })


            }, function (err) {
                return callbackX(err, labelUrisMap)

            })

    }

    , generateRdlTriples: function () {
        var filePath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\mainObjects.txt"
        var json = util.csvToJson(filePath)
        var str = ""
        var graphUri = "http://data.total.com/resource/one-model/quantum-rdl/"
        var str = ""
        var typesMap = {

            "attribute": "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute",
            "physicalObject": "http://standards.iso.org/iso/15926/part14/PhysicalObject",
            "functionalObject": "http://standards.iso.org/iso/15926/part14/FunctionalObject",
            "discipline": "http://w3id.org/readi/z018-rdl/Discipline"
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


}

module.exports = triplesGenerator;

if (false) {

    var mappings = {

        "mappings": [{
            "subject": "Tag.TagNumber",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        }, {
            "subject": "TagtoTag.LinkTagID_Lookup",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        }, {
            "subject": "TagtoAttributes.AttributeID",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute"
        }, {
            "subject": "Tag.FunctionalClassName_Lookup",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://standards.iso.org/iso/15926/part14/FunctionalObject"
        },
            {
                "subject": "Tag.TagNumber",
                "predicate": "http://standards.iso.org/iso/15926/part14/represents",
                "object": "Tag.FunctionalClassName_Lookup"
            },

            {
                "subject": "Tag.TagNumber",
                "predicate": "http://data.total.com/resource/one-model/ontology#TOTAL-hasAttribute",
                "object": "TagtoAttributes.AttributeID"
            }, {"subject": "Tag.TagNumber", "predicate": "http://standards.iso.org/iso/15926/part14/functionalPartOf", "object": "TagtoTag.LinkTagID_Lookup"}],
        "sheetJoinColumns": {
            "Tag.TagNumber": ["TagtoTag.PrimaryTagID_Lookup", "TagtoAttributes.TAG_Ref"],
            "TagtoTag.PrimaryTagID_Lookup": ["Tag.TagNumber"],
            "TagtoAttributes.TAG_Ref": ["Tag.TagNumber"]
        }

    }


    var mappings = {
        "mappings": [{
            "subject": "data.TAG1",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        }, {"subject": "data.TAG2", "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "object": "http://data.total.com/resource/one-model/ontology#Tag"}, {
            "subject": "data.TAG3",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        }, {"subject": "data.TAG4", "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "object": "http://data.total.com/resource/one-model/ontology#Tag"}, {
            "subject": "data.TAG",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        }, {
            "subject": "data.FunctionalClass1",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://standards.iso.org/iso/15926/part14/FunctionalObject"
        }, {
            "subject": "data.FunctionalClass2",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://standards.iso.org/iso/15926/part14/FunctionalObject"
        }, {
            "subject": "data.FunctionalClass3",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://standards.iso.org/iso/15926/part14/FunctionalObject"
        }, {
            "subject": "data.FunctionalClass4",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://standards.iso.org/iso/15926/part14/FunctionalObject"
        }, {"subject": "data.TAG1", "predicate": "http://standards.iso.org/iso/15926/part14/represents", "object": "data.FunctionalClass1"}, {
            "subject": "data.TAG2",
            "predicate": "http://standards.iso.org/iso/15926/part14/represents",
            "object": "data.FunctionalClass2"
        }, {"subject": "data.FunctionalClass2", "predicate": "http://standards.iso.org/iso/15926/part14/functionalPartOf", "object": "data.FunctionalClass1"}, {
            "subject": "data.TAG3",
            "predicate": "http://standards.iso.org/iso/15926/part14/represents",
            "object": "data.FunctionalClass3"
        }, {"subject": "data.FunctionalClass3", "predicate": "http://standards.iso.org/iso/15926/part14/functionalPartOf", "object": "data.FunctionalClass2"}, {
            "subject": "data.TAG4",
            "predicate": "http://standards.iso.org/iso/15926/part14/represents",
            "object": "data.FunctionalClass4"
        }, {"subject": "data.FunctionalClass4", "predicate": "http://standards.iso.org/iso/15926/part14/functionalPartOf", "object": "data.FunctionalClass3"}], "sheetJoinColumns": {}
    }

    var uriPrefix = "http://data.total.com/resource/one-model/assets/turbognerator/"

    if (false) {
        var xlsxPath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\TO-G-6010A FJ-BC.XLSX"

        var options = {
            generateIds: 15,
            output: "ntTriples",
            getExistingUriMappings: "http://data.total.com/resource/one-model/assets/turbognerator/",
            sparqlServerUrl: "http://51.178.139.80:8890/sparql"
        }
        triplesGenerator.generateXlsxBookTriples(mappings, {xlsxFilePath: xlsxPath}, uriPrefix, options, function (err, result) {
            if (err)
                return console.log(err);
            return fs.writeFileSync(xlsxPath + "_triples.nt", result)

        })
    }
}

if (false) {


    var sqlParams = {
        dbName: "clov",
        query: " select * from view_adl_tagmodelattribute ",
        fetchSize: 1000
    }

    var uriPrefix = "http://data.total.com/resource/one-model/assets/clov/"


    var options = {
        generateIds: 15,
        output: "ntTriples",
        startOffset:138500,
        getExistingUriMappings: uriPrefix,
        sparqlServerUrl: "http://51.178.139.80:8890/sparql",
        replaceGraph: true
    }


    var mappings = "D:\\GitHub\\souslesensVocables\\other\\oneModel\\ClovMappings.json"
    triplesGenerator.generateAdlSqlTriples(mappings, uriPrefix, sqlParams, options, function (err, result) {

    })


}

if (true) {
    var sqlParams = {
        dbName: "clov",
     //   query: " select * from breakdown ",
        query: "select * from view_adl_tagmodelattribute",
        fetchSize: 1000
    }

    var uriPrefix = "http://data.total.com/resource/one-model/assets/clov/"


    var options = {
        generateIds: 15,
        output: "ntTriples",
        getExistingUriMappings: uriPrefix,
        sparqlServerUrl: "http://51.178.139.80:8890/sparql",
        rdlGraphUri: "http://data.total.com/resource/one-model/quantum-rdl/",
        replaceGraph: false
    }


   // var mappings = "D:\\GitHub\\souslesensVocables\\other\\oneModel\\breakdownLabels.json"
    var mappings = "D:\\GitHub\\souslesensVocables\\other\\oneModel\\ClovMappings.json"
    triplesGenerator.generateAdlSqlTriples(mappings, uriPrefix, sqlParams, options, function (err, result) {

    })
}

if (false) {
    triplesGenerator.generateRdlTriples()
}
