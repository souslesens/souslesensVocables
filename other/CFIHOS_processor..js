var fs = require('fs')
var path = require('path')
var csvCrawler = require('../bin/_csvCrawler.')
var async = require('async')
var util = require("../bin/util.")
var httpProxy = require("../bin/httpProxy.")


var rootDir = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS V1.5\\CFIHOS V1.5 RDL"
var CFIHOS_processor = {


    readCsv: function (filePath, callback) {
        csvCrawler.readCsv({filePath: filePath}, 500000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            return callback(null, {headers: headers, data: data});
        });


    },

    getDescription: function () {

        var descriptionMap = {}

        var files = fs.readdirSync(rootDir)
        async.eachSeries(files, function (file, callbackSeries) {

            var filePath = rootDir + path.sep + file
            var array = /CFIHOS (.*) v1.5.csv/.exec(file)
            if (!array)
                return callbackSeries(filePath)
            var fileName = array[1]
            CFIHOS_processor.readCsv(filePath, function (err, result) {
                descriptionMap[fileName] = {filePath: filePath, headers: result.headers, length: result.data[0].length}
                callbackSeries()
            })


        }, function (err) {
            fs.writeFileSync(rootDir + "\\description.json", JSON.stringify(descriptionMap, null, 2))
            //  console.log(JSON.stringify(descriptionMap,null,2))
        })


    },


    processSubClasses: function (mappings) {
        var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/"
        var cfihosPrefix = "https://www.jip36-cfihos.org/vcabulary#"
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var propertiesTypeMap = {
            "rdfs:subClassOf": "uri",
            "_restriction": "uri",
            "rdfs:label": "string",
            "skos:definition": "string",
            "skos:notation": "string",
            "owl:comment": "string",
            "cfihos:status": "string"
        }


        async.eachSeries(mappings, function (mapping, callbackEachMapping) {

            var fileName = mapping.fileName
            var filePath = rootDir + path.sep + fileName
            var lookUpMap = {}
            var triples = [];

            async.series([


                // load Lookups
                function (callbackSeries) {
                    async.eachSeries(mapping.lookups, function (lookup, callbackEachLookup) {
                        var lookupFileName = lookup.fileName
                        var lookupFilePath = rootDir + path.sep + lookupFileName

                        CFIHOS_processor.readCsv(lookupFilePath, function (err, result) {
                            if (err)
                                return callbackEachLookup(err)
                            var lookupLines = result.data[0]
                            lookUpMap[lookup.field] = {}
                            lookupLines.forEach(function (line, index) {
                                if (![line[lookup.sourceColumn]] && line[lookup.targetColumn])
                                    return console.log("missing lookup line" + index + " " + lookupFilePath)
                                lookUpMap[lookup.field][line[lookup.sourceColumn]] = line[lookup.targetColumn]
                            })

                            callbackEachLookup()
                        })
                    }, function (err) {
                        callbackSeries()
                    })


                },

                //build triples
                function (callbackSeries) {
                    CFIHOS_processor.readCsv(filePath, function (err, result) {
                        if (err)
                            return callbackSeries(err)

                        var lines = result.data[0]
                        lines.forEach(function (line) {
                            var hasDirectSuperClass = false
                            var subjectStr
                            mapping.tripleModels.forEach(function (item) {
                                (item.p == "owl:comment")
                                var x = 3
                                if (line[item.s] && line[item.o]) {
                                    var objectStr = line[item.o]

                                    if (line[item.p] == "rdfs:subClassOf")
                                        hasDirectSuperClass = true;


                                    if (lookUpMap[item.o]) {
                                        objectStr = lookUpMap[item.o][objectStr]
                                        if (!objectStr)
                                            console.log("lookup value not found " + item.o + ": " + line[item.o])
                                    }

                                    if (propertiesTypeMap[item.p] == "string")
                                        objectStr = "'" + util.formatStringForTriple(objectStr) + "'"
                                    else if (propertiesTypeMap[item.p] == "uri")
                                        objectStr = "<" + graphUri + objectStr + ">"

                                    if (item.p == "_restriction") {
                                        var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";

                                        triples.push({
                                            s: blankNode,
                                            p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
                                            o: "<http://www.w3.org/2002/07/owl#Restriction>",
                                        });
                                        triples.push({
                                            s: blankNode,
                                            p: "<http://www.w3.org/2002/07/owl#onProperty>",
                                            o: "rdf:type",
                                        });
                                        triples.push({
                                            s: blankNode,
                                            p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                            o: objectStr,
                                        });
                                        triples.push({
                                            s: subjectStr,
                                            p: "rdf:subClassOf",
                                            o: blankNode,
                                        });
                                        objectStr = blankNode
                                        return;

                                    }
                                    // return console.log("missing type " + item.p)


                                    subjectStr = "<" + graphUri + line[item.s] + ">"
                                    triples.push({
                                        s: subjectStr,
                                        p: item.p,
                                        o: objectStr
                                    })
                                }

                            })
                            triples.push({
                                s: subjectStr,
                                p: "rdf:type",
                                o: mapping.type
                            })
                            if (!hasDirectSuperClass && mapping.type == "Class") {
                                triples.push({
                                    s: subjectStr,
                                    p: "rdfs:subClassOf",
                                    o: mapping.topClass
                                })
                            }


                        })


                        var x = triples
                        callbackSeries()
                    })

                },

                //write triples
                function (callbackSeries) {
                    var totalTriples = 0


                    var slices = util.sliceArray(triples, 200)
                    async.eachSeries(slices, function (slice, callbackEach) {

                        var insertTriplesStr = "";
                        slice.forEach(function (triple) {
                            insertTriplesStr += triple.s + " " + triple.p + " " + triple.o + ".";
                        })

                        var queryGraph = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                            "PREFIX cfihos: <" + cfihosPrefix + ">" +
                            "" +
                            "";

                        queryGraph += " WITH GRAPH  <" + graphUri + ">  " +
                            "INSERT DATA" +
                            "  {" +
                            insertTriplesStr +
                            "  }"
                        // console.log(query)
                        var params = {query: queryGraph};

                        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                            if (err) {
                                return callbackEach(err);
                            }
                            totalTriples += triples.length;
                            console.log(totalTriples);
                            return callbackEach(null);
                        });

                    }, function (err) {
                        callbackSeries()
                    })


                }
            ], function (err) {
                callbackEachMapping()
            })
        }, function (err) {

        })
    }


}
CFIHOS_processor.getDescription()


mappingsMap = {
    "TAG_CLASS": {
        type: "owl:Class",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/TAG_CLASS>",
        fileName: "CFIHOS tag class v1.5.csv",
        lookups: [
            {
                field: "parentTagClassName",
                fileName: "CFIHOS tag class v1.5.csv",
                sourceColumn: "tagClassName",
                targetColumn: "cFIHOSUniqueId"
            }
        ],
        tripleModels: [{s: "cFIHOSUniqueId", p: "rdfs:subClassOf", o: "parentTagClassName"},
            {s: "cFIHOSUniqueId", p: "rdfs:label", o: "tagClassName"},
            {s: "cFIHOSUniqueId", p: "rdfs:label", o: "owl:Class"},
            {s: "cFIHOSUniqueId", p: "skos:definition", o: "tagClassDefinition"},
            {s: "cFIHOSUniqueId", p: "cfihos:status", o: "status"},

        ]

    }, "QUANTITATIVE_PROPERTY": {
        type: "owl:Class",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/QUANTITATIVE_PROPERTY>",
        fileName: "CFIHOS unit of measure dimension v1.5.csv",
        lookups: [],
        tripleModels: [
            {s: "cFIHOSUniqueId", p: "rdfs:label", o: "unitOfMeasureDimensionName"},
            {s: "cFIHOSUniqueId", p: "skos:notation", o: "unitOfMeasureDimensionCode"},


        ]

    },

    "QUALITATIVE_PROPERTY": {
        type: "owl:Class",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/QUALITATIVE_PROPERTY>",
        fileName: "CFIHOS property picklist v1.5.csv",
        lookups: [],
        tripleModels: [
            {s: "cFIHOSUniqueId", p: "rdfs:label", o: "picklistName"},
            {s: "cFIHOSUniqueId", p: "cfihos:status", o: "status"},


        ]

    }

    ,
    "PROPERTY_PICKLIST_VALUE": {
        type: "owl:NamedIndividual",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/EAID_D6FDC9AE_59DD_4d99_A4F3_6F8E2127FDB1>",
        fileName: "CFIHOS property picklist value v1.5.csv",
        lookups: [
            {
                field: "picklistName",
                fileName: "CFIHOS property picklist v1.5.csv",
                sourceColumn: "picklistName",
                targetColumn: "cFIHOSUniqueId"
            }
        ],
        tripleModels: [
            {s: "cFIHOSUniqueId", p: "rdfs:label", o: "picklistValue"},
            {s: "cFIHOSUniqueId", p: "_restriction", o: "picklistName"},
            {s: "cFIHOSUniqueId", p: "cfihos:status", o: "status"},
            {s: "cFIHOSUniqueId", p: "owl:comment", o: "picklistValueDescription"},


        ]

    }

}


var mappings = [mappingsMap["PROPERTY_PICKLIST_VALUE"]]


CFIHOS_processor.processSubClasses(mappings)