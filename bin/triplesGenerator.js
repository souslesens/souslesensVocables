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
var sqlConnector=require('../bin/sqlConnectors/ADLSqlConnector.')
var idsCache = {}

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
        var idsMap = {}
        var dataArray = []
        data.forEach(function (item, index) {
            mappings.forEach(function (mapping, index) {
                var subjectValue = item[mapping.subject];

                if (!subjectValue)
                    return;


                var subjectUri
                if (options.labelUrisMap && options.labelUrisMap[subjectValue]) {
                    subjectValue = options.labelUrisMap[subjectValue];
                } else if (options.generateIds) {
                    var newUri = false
                    if (!idsMap[subjectValue]) {
                        idsMap[subjectValue] = util.getRandomHexaId(options.generateIds)
                        newUri = true
                    }
                    subjectUri = uriPrefix + idsMap[subjectValue]
                    if (newUri)
                        triples.push({subject: subjectUri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + subjectValue + "'"})

                } else {
                    subjectUri = uriPrefix + util.formatStringForTriple(subjectUri, true)
                }


                var objectValue;

                if (mapping.object.indexOf("http") == 0) {
                    objectValue = mapping.object;
                } else {

                    var objectValue = item[mapping.object]
                    if (!objectValue)
                        return;

                    var objectSuffix = ""
                    // if(util.isInt(objectValue))
                    if (!isNaN(objectValue)) {
                        objectSuffix = "^^xsd:integer"
                        objectValue = "'" + objectValue + "'" + objectSuffix;
                    } else if (util.isFloat(objectValue)) {
                        objectSuffix = "^^xsd:float"
                        objectValue = "'" + objectValue + "'" + objectSuffix;
                    } else {
                        if (options.labelUrisMap && options.labelUrisMap[objectValue]) {
                            objectValue = options.labelUrisMap[objectValue];
                        } else if (options.generateIds) {
                            var newUri = false
                            if (!idsMap[objectValue]) {
                                idsMap[objectValue] = util.getRandomHexaId(options.generateIds)
                                newUri = true
                            }
                            var objectUri = uriPrefix + idsMap[objectValue]
                            objectValue = objectUri
                            if (newUri)
                                triples.push({subject: objectUri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + objectValue + "'"})
                        }
                    }

                }
                var predicateUri = mapping.predicate
                triples.push({subject: subjectUri, predicate: predicateUri, object: objectValue})

            })
        })
        callback(null, triples)


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

                        triplesGenerator.generateSheetDataTriples(mappings.mappings, dataArray, uriPrefix, options, function (err, triples) {
                            if (err)
                                return callbackSeries(err)


                            allTriples = allTriples.concat(triples)


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
                            str += " .\n"

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


    , getExistingLabelUriMap: function (serverUrl, graphUri, type, callback) {

        var fetchLimit = 5000
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " select distinct ?concept ?conceptLabel  FROM <" + graphUri + ">   WHERE " +
            "{?concept rdfs:label ?conceptLabel. FILTER (!isBlank(?concept))"
        if (type)
            query += " FILTER (?concept rdf:type <" + type + "> "
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
                        labelUrisMap[item.conceptLabel.value] = item.concept.value

                    })
                    callbackWhilst();
                })


            }, function (err) {
                return callback(err, labelUrisMap)

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
            {"subject": "Tag.TagNumber",
            "predicate": "http://standards.iso.org/iso/15926/part14/represents",
            "object": "Tag.FunctionalClassName_Lookup"},

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

    var options = {generateIds: 15, output: "ntTriples", getExistingUriMappings: "http://data.total.com/resource/one-model/assets/turbognerator/", sparqlServerUrl: "http://51.178.139.80:8890/sparql"}
    triplesGenerator.generateXlsxBookTriples(mappings, {xlsxFilePath:xlsxPath}, uriPrefix, options, function (err, result) {
        if (err)
            return console.log(err);
        return fs.writeFileSync(xlsxPath + "_triples.nt", result)

    })
}if( true){
        sqlConnector.connection.database="clov";





    }



}
