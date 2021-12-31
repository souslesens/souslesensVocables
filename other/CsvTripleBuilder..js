var fs = require("fs");
var path = require("path");
var csvCrawler = require("../bin/_csvCrawler.");
var async = require("async");
var util = require("../bin/util.");
var httpProxy = require("../bin/httpProxy.");
var UML2OWLparser = require("./UML2OWLparser");

//var rootDir = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS V1.5\\CFIHOS V1.5 RDL";

var processor = {
    readCsv: function (filePath, callback) {
        csvCrawler.readCsv({ filePath: filePath }, 500000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            console.log(filePath);
            return callback(null, { headers: headers, data: data });
        });
    },

    getDescription: function (filePath) {
        var descriptionMap = {};

        processor.readCsv(filePath, function (err, result) {
            descriptionMap = { filePath: filePath, headers: result.headers, length: result.data[0].length };

            fs.writeFileSync(filePath.replace(".txt", "description.json"), JSON.stringify(descriptionMap, null, 2));
            //  console.log(JSON.stringify(descriptionMap,null,2))
        });
    },

    processSubClasses: function (mappings, graphUri, sparqlServerUrl) {
        //  var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/test/"

        var existingNodes = {};
        var propertiesTypeMap = {
            "rdfs:label": "string",
            "skos:definition": "string",
            "skos:notation": "string",
            "owl:comment": "string",
            "skos:prefLabel": "string",
            //   "cfihos:status": "string",
            "iso14224:priority": "string",

            "rdf:type": "uri",
            "part14:functionalPartOf": "uri",
            "part14:assembledPartOf": "uri",
            "part14:hasFunctionalPart": "uri",
            "part14:hasAssembledPart": "uri",
            "part14:concretizes": "uri",
            "req:REQ_0020": "uri",
            "req:REQ_0021": "uri",
            "req:REQ_0022": "uri",
            "rdfs:subClassOf": "uri",
            _restriction: "uri",
        };

        async.eachSeries(
            mappings,
            function (mapping, callbackEachMapping) {
                var fileName = mapping.fileName;
                var filePath = fileName;
                var lookUpMap = {};
                var triples = [];

                async.series(
                    [
                        // load Lookups
                        function (callbackSeries) {
                            if (mapping.lookups.length == 0) return callbackSeries();

                            async.eachSeries(
                                mapping.lookups,
                                function (lookup, callbackEachLookup) {
                                    var lookupFileName = lookup.fileName;
                                    var lookupFilePath = rootDir + path.sep + lookupFileName;

                                    processor.readCsv(lookupFilePath, function (err, result) {
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
                                    callbackSeries(err);
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

                            processor.readCsv(filePath, function (err, result) {
                                if (err) return callbackSeries(err);

                                var lines = result.data[0];
                                var emptyMappings = 0;
                                lines.forEach(function (line, indexLine) {
                                    if (false && indexLine > 2) return;
                                    var hasDirectSuperClass = false;
                                    var subjectStr = null;
                                    var objectStr = null;

                                    mapping.tripleModels.forEach(function (item) {
                                        subjectStr = null;
                                        objectStr = null;

                                        if (item.s_type == "fixed") subjectStr = item.s;
                                        else if (item.s.match(/.+:.+|http.+/)) subjectStr = item.s;
                                        else subjectStr = line[item.s];
                                        if (item.o_type == "fixed")
                                            objectStr = item.o;
                                        else if (item.o.match(/.+:.+|http.+/))
                                            objectStr = item.o;
                                        else objectStr = line[item.o];

                                        if (item.p == "rdfs:subClassOf") hasDirectSuperClass = true;

                                        if (!subjectStr || (!objectStr && item.p!="_restriction") ) return;

                                        if (item.lookup_S) {
                                            subjectStr = getLookupValue(item.lookup_S, subjectStr);
                                            if (!subjectStr) {
                                                // console.log(line[item.s])
                                                return;
                                            }
                                        }
                                        if (subjectStr.indexOf("http") == 0)
                                            subjectStr = "<" + subjectStr + ">";
                                        else if (subjectStr.indexOf(":") > -1)
                                            subjectStr = subjectStr;
                                        else
                                            subjectStr = "<" + graphUri + util.formatStringForTriple(subjectStr, true) + ">";

                                        if (!objectStr)
                                           var x=3;// objectStr = line[item.o];

                                        if (item.lookup_O) {
                                            objectStr = getLookupValue(item.lookup_O, objectStr);
                                            if (!objectStr) {
                                                // console.log(line[item.o])
                                                return;
                                            }
                                        }

                                        if (mapping.transform && mapping.transform[item.o]) objectStr = mapping.transform[item.o](objectStr);

                                        if (propertiesTypeMap[item.p] == "string") {
                                            objectStr = "'" + util.formatStringForTriple(objectStr) + "'";
                                        } else if (true || propertiesTypeMap[item.p] == "uri") {
                                            if (objectStr.indexOf("http") == 0)
                                                objectStr = "<" + objectStr + ">";
                                            else if (objectStr.indexOf(":") > -1)
                                                objectStr = objectStr;
                                            else if (objectStr=="")
                                                objectStr="owl:Thing"
                                            else objectStr = "<" + graphUri + util.formatStringForTriple(objectStr, true) + ">";
                                        }
                                        if (item.p == "_restriction") {
                                            if (!item.prop) {
                                                return callbackSeries("no prop defined for restriction");
                                            }
                                            var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";
                                            var prop = item.prop;
                                            if (prop.indexOf("$") == 0)
                                                prop = line[prop.substring(1)]
                                            if (prop.indexOf("http") == 0)
                                                prop = "<" + prop + ">";


                                            triples.push({
                                                s: blankNode,
                                                p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
                                                o: "<http://www.w3.org/2002/07/owl#Restriction>",
                                            });
                                            triples.push({
                                                s: blankNode,
                                                p: "<http://www.w3.org/2002/07/owl#onProperty>",
                                                o: prop,
                                            });
                                            if (objectStr){
                                                triples.push({
                                                    s: blankNode,
                                                    p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                                    o: objectStr,
                                                });
                                        }else{
                                                var x=5
                                            }
                                            triples.push({
                                                s: subjectStr,
                                                p: "rdfs:subClassOf",
                                                o: blankNode,
                                            });
                                            objectStr = blankNode;
                                            return;
                                        }
                                        if (subjectStr && objectStr) {
                                            // return console.log("missing type " + item.p)
                                            if (!existingNodes[subjectStr + "_" + objectStr]) {
                                                existingNodes[subjectStr + "_" + objectStr]=1
                                                triples.push({
                                                    s: subjectStr,
                                                    p: item.p,
                                                    o: objectStr,
                                                });
                                            }
                                        }
                                    });

                                /*    var lastTriples=triples[triples.length-1]
                                    var tripleHashcode=lastTriples.s+"_"+lastTriples.p+"_"+lastTriples.o
                                    if (!lastTriples.s || !lastTriples.p || !lastTriples.o) {
                                       return  console.log(subjectStr + "  " + objectStr);
                                    }
                                    if (lastTriples && objectStr && !existingNodes[subjectStr + "_" + objectStr]) {
                                        existingNodes[subjectStr + "_" + objectStr]=1
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
                                    }*/
                                    var x = triples;
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
                                    processor.writeTriples(slice, graphUri, sparqlServerUrl, function (err, result) {
                                        if (err) return callbackEach(err);
                                        totalTriples += result;

                                        callbackEach();
                                    });
                                },
                                function (err) {
                                    console.log("------------" + filePath + " " + totalTriples);
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
    writeTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        var insertTriplesStr = "";
        var totalTriples = 0;
        triples.forEach(function (triple) {
            var str = triple.s + " " + triple.p + " " + triple.o + ". ";
            //   console.log(str)
            insertTriplesStr += str;
        });

        var queryGraph =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "PREFIX iso14224: <http://data.total.com/resource/tsf/iso_14224#>" +
            "PREFIX req: <https://w3id.org/requirement-ontology/rdl/>" +
            "PREFIX part14: <http://standards.iso.org/iso/15926/part14/>" +
            "";

        queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
        // console.log(query)

        //  queryGraph=Buffer.from(queryGraph, 'utf-8').toString();
        var params = { query: queryGraph };

        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
            if (err) {
                var x = queryGraph;
                return callback(err);
            }
            totalTriples += triples.length;
            console.log(totalTriples);
            return callback(null, totalTriples);
        });
    },

    clearGraph: function (graphUri, sparqlServerUrl, callback) {
        var query = "clear graph   <" + graphUri + ">";
        var params = { query: query };

        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null);
        });
    },
};

module.exports = processor;
