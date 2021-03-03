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
        var missingTotalSubjects = []
        var missingTotalObjects = []

        function getUriFromValue(value) {
            var uri = idsMap[value]
            if (!uri) {

                if (value && value.indexOf("TOTAL-") == 0) {

                    uri = totalRdlUriPrefix + value
                    idsMap[value] = uri;
                    var subjectLabel = options.rdlDictonary[uri];
                    if (!subjectLabel)
                        missingTotalSubjects.push(value)
                    else
                        triples.push({subject: uri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + util.formatStringForTriple(subjectLabel) + "'"})
                } else {
                    uri = uriPrefix + util.getRandomHexaId(options.generateIds)
                    idsMap[value] = uri
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
                subjectValue = subjectValue.trim()

                var subjectUri = getUriFromValue(subjectValue)


                if (!subjectUri)
                    return;


                var objectValue;
                var objectSuffix = ""
                var objectValue = item[mapping.object]

                if (objectValue)
                    objectValue = objectValue.trim()


                if (objectValue && objectValue.indexOf("TOTAL-") == 0) {
                    var totalUri = getUriFromValue(objectValue)
                    triples.push({subject: subjectUri, predicate: mapping.predicate, object: totalUri})
                } else if (mapping.object.indexOf("http") == 0) {

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

                if (!subjectUri || subjectUri == "undefined")
                    x = 3
            })
        })

        console.log("missing TOTAL subject IDs " + JSON.stringify(missingTotalSubjects));
        console.log("missing TOTAL objects IDs " + JSON.stringify(missingTotalObjects));
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
        var rdlInverseDictonary = {}


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
                            rdlInverseDictonary[item.subLabel.value] = item.sub.value
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
                        options.rdlInverseDictonary = rdlInverseDictonary
                        triplesGenerator.generateSheetDataTriples(mappings.mappings, data, uriPrefix, options, function (err, result) {
                            if (err)
                                return callbackProcessor(err)

                            for (var key in result.urisMap) {
                                labelUrisMap[key] = result.urisMap[key]
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


                    sqlConnector.processFetchedData(sqlParams.dbName, sqlParams.query, sqlParams.fetchSize, (options.startOffset || 0), processor, function (err, result) {
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
            " select ?term ?oneModelId  FROM <" + graphUri + ">   WHERE " +
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

                    console.log( "existing ids retrieved "+offset)

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
        var filePath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\mainObjectsMISSING.txt"
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


if (false) {
    var sqlParams = {
        dbName: "turbogenerator",
        //   query: " select * from breakdown ",
        query: "select * from model",
        query: "select * from breakdown",
        fetchSize: 1000
    }

    var uriPrefix = "http://data.total.com/resource/one-model/assets/turbogenerator/"


    var options = {
        generateIds: 15,
        output: "ntTriples",
        getExistingUriMappings: uriPrefix,
        sparqlServerUrl: "http://51.178.139.80:8890/sparql",
        rdlGraphUri: "http://data.total.com/resource/one-model/quantum-rdl/",
        replaceGraph: false
    }


    // var mappings = "D:\\GitHub\\souslesensVocables\\other\\oneModel\\breakdownLabels.json"
    var mappings = "D:\\GitHub\\souslesensVocables\\other\\turbogenerator\\TurboGenTagAttrMappings.json"
    var mappings = "D:\\GitHub\\souslesensVocables\\other\\turbogenerator\\breakdowns.json"
    triplesGenerator.generateAdlSqlTriples(mappings, uriPrefix, sqlParams, options, function (err, result) {

    })
}

if (true) {
    var sqlParams = {
        dbName: "clov",
        //   query: " select * from breakdown ",
        query: "select * from tag2tag",
        //  query: "select * from breakdown",
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


    var mappings = "D:\\GitHub\\souslesensVocables\\other\\clov\\tag2tagMapping.json"
    //  var mappings = "D:\\GitHub\\souslesensVocables\\other\\turbogenerator\\TurboGenTagAttrMappings.json"
    //  var mappings = "D:\\GitHub\\souslesensVocables\\other\\turbogenerator\\breakdowns.json"
    triplesGenerator.generateAdlSqlTriples(mappings, uriPrefix, sqlParams, options, function (err, result) {

    })
}

if (false) {
    triplesGenerator.generateRdlTriples()
}

if (false) {
    triplesGenerator.formatTurboGenTags()
}
