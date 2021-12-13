var fs = require("fs");
var path = require("path");
var csvCrawler = require("../bin/_csvCrawler.");
var async = require("async");
var util = require("../bin/util.");
var httpProxy = require("../bin/httpProxy.");
var UML2OWLparser = require("./UML2OWLparser");

var rootDir = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS V1.5\\CFIHOS V1.5 RDL";
var CFIHOS_processor = {
    readCsv: function (filePath, callback) {
        csvCrawler.readCsv({ filePath: filePath }, 500000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            return callback(null, { headers: headers, data: data });
        });
    },

    getDescription: function () {
        var descriptionMap = {};

        var files = fs.readdirSync(rootDir);
        async.eachSeries(
            files,
            function (file, callbackSeries) {
                var filePath = rootDir + path.sep + file;
                var array = /CFIHOS (.*) v1.5.csv/.exec(file);
                if (!array) return callbackSeries(filePath);
                var fileName = array[1];
                CFIHOS_processor.readCsv(filePath, function (err, result) {
                    descriptionMap[fileName] = { filePath: filePath, headers: result.headers, length: result.data[0].length };
                    callbackSeries();
                });
            },
            function (err) {
                fs.writeFileSync(rootDir + "\\description.json", JSON.stringify(descriptionMap, null, 2));
                //  console.log(JSON.stringify(descriptionMap,null,2))
            }
        );
    },

    processSubClasses: function (mappings, graphUri) {
        //  var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/test/"
        var cfihosPrefix = "https://www.jip36-cfihos.org/vcabulary#";
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var propertiesTypeMap = {
            "rdfs:subClassOf": "uri",
            _restriction: "uri",
            "rdfs:label": "string",
            "skos:definition": "string",
            "skos:notation": "string",
            "owl:comment": "string",
            "cfihos:status": "string",
            "rdf:type": "uri",
        };

        async.eachSeries(
            mappings,
            function (mapping, callbackEachMapping) {
                var fileName = mapping.fileName;
                var filePath = rootDir + path.sep + fileName;
                var lookUpMap = {};
                var triples = [];

                async.series(
                    [
                        // load Lookups
                        function (callbackSeries) {
                            async.eachSeries(
                                mapping.lookups,
                                function (lookup, callbackEachLookup) {
                                    var lookupFileName = lookup.fileName;
                                    var lookupFilePath = rootDir + path.sep + lookupFileName;

                                    CFIHOS_processor.readCsv(lookupFilePath, function (err, result) {
                                        if (err) return callbackEachLookup(err);
                                        var lookupLines = result.data[0];
                                        lookUpMap[lookup.name] = {};
                                        lookupLines.forEach(function (line, index) {
                                            if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) return console.log("missing lookup line" + index + " " + lookupFilePath);
                                            lookUpMap[lookup.name][line[lookup.sourceColumn]] = line[lookup.targetColumn];
                                        });

                                        callbackEachLookup();
                                    });
                                },
                                function (err) {
                                    callbackSeries();
                                }
                            );
                        },

                        //build triples
                        function (callbackSeries) {
                            function getLookupValue(lookupSequence, value) {
                                var lookupItem = lookupSequence.split("|");
                                var target = value;
                                lookupItem.forEach(function (lookupItem) {
                                    if (lookUpMap[lookupItem]) {
                                        target = lookUpMap[lookupItem][target];
                                        if (!target) {
                                            console.log("lookup value not found " + value + ": ");
                                            return "";
                                        }
                                    } else return target;
                                });

                                return target;
                            }
                            CFIHOS_processor.readCsv(filePath, function (err, result) {
                                if (err) return callbackSeries(err);

                                var lines = result.data[0];
                                lines.forEach(function (line, indexLine) {
                                    if (false && indexLine > 2) return;
                                    var hasDirectSuperClass = false;
                                    var subjectStr;
                                    mapping.tripleModels.forEach(function (item) {
                                        if (item.p == "rdfs:subClassOf") hasDirectSuperClass = true;

                                        if (line[item.s] && line[item.o]) {
                                            subjectStr = line[item.s];
                                            if (item.lookup_S) {
                                                subjectStr = getLookupValue(item.lookup_S, subjectStr);
                                                if (!subjectStr) {
                                                    // console.log(line[item.s])
                                                    return;
                                                }
                                            }

                                            subjectStr = "<" + graphUri + subjectStr + ">";
                                            var objectStr = line[item.o];

                                            if (item.lookup_O) {
                                                objectStr = getLookupValue(item.lookup_O, objectStr);
                                                if (!objectStr) {
                                                    // console.log(line[item.o])
                                                    return;
                                                }
                                            }

                                            if (propertiesTypeMap[item.p] == "string") objectStr = "'" + util.formatStringForTriple(objectStr) + "'";
                                            else if (propertiesTypeMap[item.p] == "uri") objectStr = "<" + graphUri + objectStr + ">";

                                            if (item.p == "_restriction") {
                                                if (!item.prop) {
                                                    return callbackSeries("no prop defined for restriction");
                                                }
                                                var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";

                                                triples.push({
                                                    s: blankNode,
                                                    p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
                                                    o: "<http://www.w3.org/2002/07/owl#Restriction>",
                                                });
                                                triples.push({
                                                    s: blankNode,
                                                    p: "<http://www.w3.org/2002/07/owl#onProperty>",
                                                    o: "<" + item.prop + ">",
                                                });
                                                triples.push({
                                                    s: blankNode,
                                                    p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                                    o: objectStr,
                                                });
                                                triples.push({
                                                    s: subjectStr,
                                                    p: "rdfs:subClassOf",
                                                    o: blankNode,
                                                });
                                                objectStr = blankNode;
                                                return;
                                            }
                                            // return console.log("missing type " + item.p)

                                            triples.push({
                                                s: subjectStr,
                                                p: item.p,
                                                o: objectStr,
                                            });
                                        }
                                    });
                                    if (mapping.type) {
                                        triples.push({
                                            s: subjectStr,
                                            p: "rdf:type",
                                            o: mapping.type,
                                        });
                                    }

                                    if (mapping.topClass && !hasDirectSuperClass && mapping.type == "owl:Class") {
                                        triples.push({
                                            s: subjectStr,
                                            p: "rdfs:subClassOf",
                                            o: mapping.topClass,
                                        });
                                    }
                                });

                                var x = triples;
                                callbackSeries();
                            });
                        },

                        //write triples
                        function (callbackSeries) {
                            var totalTriples = 0;

                            var slices = util.sliceArray(triples, 200);
                            async.eachSeries(
                                slices,
                                function (slice, callbackEach) {
                                    var insertTriplesStr = "";
                                    slice.forEach(function (triple) {
                                        insertTriplesStr += triple.s + " " + triple.p + " " + triple.o + ".";
                                    });

                                    var queryGraph =
                                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                        "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                        "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                                        "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                                        "PREFIX cfihos: <" +
                                        cfihosPrefix +
                                        ">" +
                                        "" +
                                        "";

                                    queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
                                    // console.log(query)
                                    var params = { query: queryGraph };

                                    httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                                        if (err) {
                                            return callbackEach(err);
                                        }
                                        totalTriples += triples.length;
                                        console.log(totalTriples);
                                        return callbackEach(null);
                                    });
                                },
                                function (err) {
                                    callbackSeries();
                                }
                            );
                        },
                    ],
                    function (err) {
                        callbackEachMapping();
                    }
                );
            },
            function (err) {}
        );
    },
};
CFIHOS_processor.getDescription();

mappingsMap = {
    TAG_CLASS: {
        type: "owl:Class",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/TAG_CLASS>",
        fileName: "CFIHOS tag class v1.5.csv",
        lookups: [
            {
                name: "parentTagClassName",
                fileName: "CFIHOS tag class v1.5.csv",
                sourceColumn: "tagClassName",
                targetColumn: "cFIHOSUniqueId",
            },
        ],
        tripleModels: [
            { s: "cFIHOSUniqueId", p: "rdfs:subClassOf", o: "parentTagClassName", lookup_O: "parentTagClassName" },
            { s: "cFIHOSUniqueId", p: "rdfs:label", o: "tagClassName" },
            { s: "cFIHOSUniqueId", p: "skos:definition", o: "tagClassDefinition" },
            { s: "cFIHOSUniqueId", p: "cfihos:status", o: "status" },
        ],
    },
    QUANTITATIVE_PROPERTY: {
        type: "owl:Class",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/QUANTITATIVE_PROPERTY>",
        fileName: "CFIHOS unit of measure dimension v1.5.csv",
        lookups: [],
        tripleModels: [
            { s: "cFIHOSUniqueId", p: "rdfs:label", o: "unitOfMeasureDimensionName" },
            { s: "cFIHOSUniqueId", p: "skos:notation", o: "unitOfMeasureDimensionCode" },
        ],
    },

    QUALITATIVE_PROPERTY: {
        type: "owl:Class",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/QUALITATIVE_PROPERTY>",
        fileName: "CFIHOS property picklist v1.5.csv",
        lookups: [],
        tripleModels: [
            { s: "cFIHOSUniqueId", p: "rdfs:label", o: "picklistName" },
            { s: "cFIHOSUniqueId", p: "cfihos:status", o: "status" },
        ],
    },
    QUALITATIVE_PROPERTY: {
        type: "owl:Class",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/QUALITATIVE_PROPERTY>",
        fileName: "CFIHOS property picklist v1.5.csv",
        lookups: [],
        tripleModels: [
            { s: "cFIHOSUniqueId", p: "rdfs:label", o: "picklistName" },
            { s: "cFIHOSUniqueId", p: "cfihos:status", o: "status" },
        ],
    },

    PROPERTY_PICKLIST_VALUE: {
        type: "owl:NamedIndividual",
        topClass: "<https://www.jip36-cfihos.org/ontology/cfihos_1_5/EAID_D6FDC9AE_59DD_4d99_A4F3_6F8E2127FDB1>",
        fileName: "CFIHOS property picklist value v1.5.csv",
        lookups: [{ name: "property_picklistNameToPropertyId", fileName: "CFIHOS tag class properties v1.5.csv", sourceColumn: "tagPropertyName", targetColumn: "tagPropertyCFIHOSUniqueId" }],
        tripleModels: [
            { s: "cFIHOSUniqueId", p: "rdfs:label", o: "picklistValue" },
            { s: "picklistName", p: "_restriction", o: "cFIHOSUniqueId", lookup_S: "property_picklistNameToPropertyId", prop: "rdfs:range" },
            { s: "cFIHOSUniqueId", p: "cfihos:status", o: "status" },
            { s: "cFIHOSUniqueId", p: "owl:comment", o: "picklistValueDescription" },
            { s: "cFIHOSUniqueId", p: "rdf:type", o: "picklistName", lookup_O: "property_picklistNameToPropertyId" },
        ],
    },
    TAG_PROPERTIES: {
        type: null,
        fileName: "CFIHOS tag class properties v1.5.csv",
        lookups: [
            { name: "tagClassNameToId", fileName: "CFIHOS tag class v1.5.csv", sourceColumn: "tagClassName", targetColumn: "cFIHOSUniqueId" },
            { name: "propertyNameToId", fileName: "CFIHOS property v1.5.csv", sourceColumn: "propertyName", targetColumn: "cFIHOSUniqueId" },
        ],
        tripleModels: [
            { s: "tagPropertyCFIHOSUniqueId", p: "rdfs:label", o: "tagPropertyName" },
            { s: "tagClassName", p: "_restriction", o: "tagPropertyName", lookup_S: "tagClassNameToId", lookup_O: "propertyNameToId", prop: "http://standards.iso.org/iso/15926/part14/hasQuality" },
            { s: "tagPropertyCFIHOSUniqueId", p: "cfihos:status", o: "status" },
        ],
    },
};

var mappingNames = ["TAG_CLASS", "QUANTITATIVE_PROPERTY", "QUALITATIVE_PROPERTY", "PROPERTY_PICKLIST_VALUE", "TAG_PROPERTIES"];

//var mappingNames =["TAG_CLASS"]
var mappings = [];
mappingNames.forEach(function (mappingName) {
    mappings.push(mappingsMap[mappingName]);
});

var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/";

if (false) {
    CFIHOS_processor.processSubClasses(mappings, graphUri);
}

if (true) {
    var sourcePath = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS 1.5.xml";

    var jsonPath = sourcePath + ".json";

    UML2OWLparser.parseXMI(sourcePath, jsonPath, function () {
        UML2OWLparser.buildOwl(jsonPath, graphUri, function (err, result) {
            if (err) return console.lg(err);
            CFIHOS_processor.processSubClasses(mappings, graphUri);
        });
    });
}
