var fs = require("fs");
var path = require("path");
var csvCrawler = require("../_csvCrawler.");
var async = require("async");
var util = require("../util.");
var httpProxy = require("../httpProxy.");
var UML2OWLparser = require("../../other/UML2OWLparser");
var sqlServerProxy = require("./SQLserverConnector.");

var ConfigManager = require('../configManager.')

//var rootDir = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS V1.5\\CFIHOS V1.5 RDL";

var CsvTripleBuilder = {
    readCsv: function (filePath, callback) {
        csvCrawler.readCsv({filePath: filePath}, 500000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            console.log(filePath);
            return callback(null, {headers: headers, data: data});
        });
    },

    getDescription: function (filePath) {
        var descriptionMap = {};

        CsvTripleBuilder.readCsv(filePath, function (err, result) {
            descriptionMap = {filePath: filePath, headers: result.headers, length: result.data[0].length};

            fs.writeFileSync(filePath.replace(".txt", "description.json"), JSON.stringify(descriptionMap, null, 2));
            //  console.log(JSON.stringify(descriptionMap,null,2))
        });
    },

    createTriples: function (mappings, graphUri, sparqlServerUrl, options, callback) {
        //  var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/test/"

        var existingNodes = {};
        var propertiesTypeMap = {
            "rdfs:label": "string",
            "rdfs:comment": "string",

            "dcterms:format":"string",
            "owl:comment": "string",
            "skos:prefLabel": "string",
            "skos:definition": "string",
            "skos:notation": "string",
            "skos:example": "string",
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
        var totalTriplesCount = 0
        async.eachSeries(
            mappings,
            function (mapping, callbackEachMapping) {
                var fileName = mapping.fileName;
                var filePath = fileName;
                var lookUpMap = {};
                var triples = [];

                var lines = [];
                var dataSource = mapping.dataSource;
                if (mapping.graphUri) graphUri = mapping.graphUri;
                async.series(
                    [
                        // load Lookups
                        function (callbackSeries) {
                            if (mapping.lookups.length == 0) return callbackSeries();

                            async.eachSeries(
                                mapping.lookups,
                                function (lookup, callbackEachLookup) {
                                    var lookupFilePath = lookup.filePath;

                                    CsvTripleBuilder.readCsv(lookupFilePath, function (err, result) {
                                        if (err) return callbackEachLookup(err);
                                        var lookupLines = result.data[0];
                                        lookUpMap[lookup.name] = {dictionary: {}, transformFn: lookup.transformFn};
                                        lookupLines.forEach(function (line, index) {
                                            if (![line[lookup.sourceColumn]] && line[lookup.targetColumn])
                                                return console.log("missing lookup line" + index + " " + lookupFilePath);
                                            lookUpMap[lookup.name].dictionary[line[lookup.sourceColumn]] = line[lookup.targetColumn];
                                        });

                                        callbackEachLookup();
                                    });
                                },
                                function (err) {
                                    callbackSeries(err);
                                }
                            );
                        },

                        //load csv
                        function (callbackSeries) {
                            if (!filePath) return callbackSeries();

                            CsvTripleBuilder.readCsv(filePath, function (err, result) {
                                if (err) {
                                    console.log(err);
                                    return callbackSeries(err);
                                }

                                lines = result.data[0];
                                callbackSeries();
                            });
                        },

                        //load SQL dataSource
                        function (callbackSeries) {
                            if (!dataSource) return callbackSeries();
                            sqlServerProxy.getData(dataSource.dbName, dataSource.sql, function (err, result) {
                                if (err) return callbackSeries(err);
                                lines = result;
                                callbackSeries();
                            });
                        },
                        //fileProcessing
                        function (callbackSeries) {
                            if (!mapping.dataProcessing)
                                return callbackSeries();
                            mapping.dataProcessing(lines, function (err, result) {
                                if (err)
                                    return callbackSeries(err);
                                lines = result;
                                callbackSeries();
                            });
                        },


                        function (callbackSeries) {
                            function getLookupValue(lookupName, value) {
                                if (!lookUpMap[lookupName])
                                    return "badLookupName"
                                var target = lookUpMap[lookupName].dictionary[value]
                                if (target && lookUpMap[lookupName].transformFn)
                                    target = lookUpMap[lookupName].transformFn(target)
                                return target;


                            }

                            var emptyMappings = 0;
                            lines.forEach(function (line, indexLine) {

                                var hasDirectSuperClass = false;
                                var subjectStr = null;
                                var objectStr = null;

                                mapping.tripleModels.forEach(function (item) {
                                    subjectStr = null;
                                    objectStr = null;


                                    if (line[item.s] == "CFIHOS-30000310")
                                        var x = 3
                                    //get value for Subject
                                    {
                                        if (item.s_type == "fixed") subjectStr = item.s;

                                        else if (typeof item.s === "function") {
                                            subjectStr = item.s(line, item);
                                        } else if (mapping.transform && line[item.s] && mapping.transform[item.s]) {
                                            subjectStr = mapping.transform[item.s](line[item.s], "s", item.p, line);
                                        } else if (item.s.match(/.+:.+|http.+/)) {
                                            subjectStr = item.s;
                                        } else {
                                            subjectStr = line[item.s];
                                        }

                                        if (item.lookup_s) {
                                            if (subjectStr == "IT and telecom equipment")
                                                var x = 3
                                            var lookupValue = getLookupValue(item.lookup_s, subjectStr);
                                            if (!lookupValue) {
                                                console.log("missing lookup_s: " + line[item.s]);
                                            } else if (lookupValue == "badLookupName")
                                                ;
                                            else
                                                subjectStr = lookupValue

                                        }
                                        if (!subjectStr) {
                                            return;
                                        }
                                    }

                                    //get value for Object
                                    {
                                        if (item.o_type == "fixed") {
                                            objectStr = item.o;
                                        }
                                        if (typeof item.o === "function") {
                                            objectStr = item.o(line, item);
                                        } else if (mapping.transform && line[item.o] && mapping.transform[item.o]) {
                                            objectStr = mapping.transform[item.o](line[item.o], "o", item.p, line);
                                        } else if (item.o.match(/.+:.+|http.+/)) {
                                            objectStr = item.o;
                                        } else objectStr = line[item.o];


                                        if (item.lookup_o) {

                                            var lookupValue = getLookupValue(item.lookup_o, objectStr);

                                            if (!lookupValue)
                                                console.log("missing lookup_o: " + line[item.o]);
                                            else if (lookupValue == "badLookupName")
                                                ;
                                            else
                                                objectStr = lookupValue
                                        }
                                    }
                                    if (!objectStr) {
                                        ; // console.log(line[item.o]);
                                        return;
                                    }


                                    //format subject
                                    {
                                        subjectStr = subjectStr.trim()
                                        if (typeof item.s === "function") subjectStr = subjectStr;

                                        if (subjectStr.indexOf && subjectStr.indexOf("http") == 0) subjectStr = "<" + subjectStr + ">";
                                        else if (subjectStr.indexOf && subjectStr.indexOf(":") > -1) subjectStr = subjectStr;
                                        else subjectStr = "<" + graphUri + util.formatStringForTriple(subjectStr, true) + ">";
                                    }

                                    //format object
                                    {
                                        objectStr = objectStr.trim()
                                        if (!objectStr || !objectStr.indexOf) {
                                            var x = line;
                                            var y = item;
                                        }
                                        if (typeof item.o === "function")
                                            objectStr = objectStr;

                                        if (objectStr.indexOf && objectStr.indexOf("http") == 0) objectStr = "<" + objectStr + ">";
                                        else if (objectStr.indexOf && objectStr.indexOf(":") > -1 && objectStr.indexOf(" ") < 0) {
                                            objectStr = objectStr;
                                        } else if (propertiesTypeMap[item.p] == "string" || item.isString) objectStr = "'" + util.formatStringForTriple(objectStr, false) + "'";
                                        else objectStr = "<" + graphUri + util.formatStringForTriple(objectStr, true) + ">";
                                    }

                                    if (!item.p.match(/.+:.+|http.+/)) {
                                        item.p = "<" + graphUri + util.formatStringForTriple(item.p, true) + ">";
                                    }
                                    if (item.isRestriction) {

                                        var propStr = item.p;
                                        if (typeof item.p === "function") {
                                            propStr = item.p(line, item);
                                        }
                                        var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";
                                        var prop = propStr;
                                        if (prop.indexOf("$") == 0) prop = line[prop.substring(1)];
                                        if (prop.indexOf("http") == 0) prop = "<" + prop + ">";

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
                                        if (objectStr) {
                                            triples.push({
                                                s: blankNode,
                                                p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                                o: objectStr,
                                            });
                                        } else {
                                            var x = 5;
                                        }
                                        triples.push({
                                            s: subjectStr,
                                            p: "rdfs:subClassOf",
                                            o: blankNode,
                                        });


                                        if (item.inverseRestrictionProperty) {
                                            var propStr = item.inverseRestrictionProperty;

                                            var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";
                                            var prop = propStr;
                                            if (prop.indexOf("$") == 0) prop = line[prop.substring(1)];
                                            if (prop.indexOf("http") == 0) prop = "<" + prop + ">";

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
                                            if (objectStr) {
                                                triples.push({
                                                    s: blankNode,
                                                    p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                                    o: subjectStr,
                                                });
                                            } else {
                                                var x = 5;
                                            }
                                            triples.push({
                                                s: objectStr,
                                                p: "rdfs:subClassOf",
                                                o: blankNode,
                                            });


                                        }

                                        return;
                                    }

                                    //not restriction
                                    else {
                                        // get value for property
                                        var propertyStr = item.p;
                                        if (item.p.indexOf("$") == 0) propertyStr = line[item.p.substring(1)];
                                        else if (typeof item.p === "function") {
                                            propertyStr = item.p(line, line);
                                        }

                                        if (subjectStr && objectStr) {
                                            // return console.log("missing type " + item.p)
                                            if (!existingNodes[subjectStr + "_" + objectStr]) {
                                                existingNodes[subjectStr + "_" + objectStr] = 1;
                                                triples.push({
                                                    s: subjectStr,
                                                    p: propertyStr,
                                                    o: objectStr,
                                                });
                                            }
                                        }
                                    }
                                });

                                var x = triples;
                            });

                            var x = triples;
                            callbackSeries();
                        }

                        ,

                        //write triples
                        function (callbackSeries) {
                            var totalTriples = 0;
                            if (options.sampleSize) {
                                var sampleTriples = triples.slice(0, options.sampleSize)
                                return callback(null, sampleTriples)
                            }


                            totalTriplesCount += triples.length;

                            var slices = util.sliceArray(triples, 200);
                            async.eachSeries(
                                slices,
                                function (slice, callbackEach) {
                                    CsvTripleBuilder.writeTriples(slice, graphUri, sparqlServerUrl, function (err, result) {
                                        if (err) {


                                            var x = sparqlServerUrl
                                            return callbackEach(err);
                                        }
                                        totalTriples += result;

                                        callbackEach();
                                    });
                                },
                                function (err) {
                                    console.log("------------" + filePath + " " + totalTriples);
                                    callbackSeries();
                                }
                            );
                        }

                        ,
                    ],

                    function (err) {
                        callbackEachMapping();
                    }
                );
            },
            function (err) {
                if (callback)
                    return callback(null, totalTriplesCount)
            }
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
            "PREFIX xs: <http://www.w3.org/2001/XMLSchema#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "PREFIX iso14224: <http://data.total.com/resource/tsf/iso_14224#>" +
            "PREFIX req: <https://w3id.org/requirement-ontology/rdl/>" +
            "PREFIX part14: <http://standards.iso.org/iso/15926/part14/>" +
            "PREFIX iso81346: <http://data.total.com/resource/tsf/IEC_ISO_81346/>" +
            "PREFIX slsv: <http://souslesens.org/resource/vocabulary/>" +
            "PREFIX dcterms: <http://purl.org/dc/terms/>" +



            "";

        queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
        // console.log(query)

        //  queryGraph=Buffer.from(queryGraph, 'utf-8').toString();
        var params = {query: queryGraph};

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


        async.series([

            function (callbackSeries) {
                if (sparqlServerUrl) {
                    sparqlServerUrl = options.sparqlServerUrl
                    return callbackSeries()
                }
                ConfigManager.getGeneralConfig(function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    sparqlServerUrl = result.default_sparql_url
                    callbackSeries()
                })
            },
            function (callbackSeries) {
                var query = "clear graph   <" + graphUri + ">";
                var params = {query: query};

                httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null);
                });
            }], function (err) {
            return callback(err, "graph cleared")
        })
    }
    ,

    createTriplesFromCsv: function (dirName, mappingFileName, options, callback) {


        var sparqlServerUrl;
        var output = ""
        async.series([

            function (callbackSeries) {
                if (options.sparqlServerUrl) {
                    sparqlServerUrl = options.sparqlServerUrl
                    return callbackSeries()
                }
                ConfigManager.getGeneralConfig(function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    sparqlServerUrl = result.default_sparql_url
                    callbackSeries()
                })
            },


            function (callbackSeries) {
                if (!options.deleteOldGraph) {
                    return callbackSeries()
                }
                CsvTripleBuilder.clearGraph(options.graphUri, sparqlServerUrl, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    console.log("graph deleted")
                    callbackSeries()
                })

            },

            function (callbackSeries) {
                var mappingsFilePath = path.join(__dirname, "../../data/" + dirName + "/" + mappingFileName);
                var mappings = "" + fs.readFileSync(mappingsFilePath)
                mappings = JSON.parse(mappings)
                mappings.fileName = mappingsFilePath.replace(".json", "")


                function getFunction(argsArray, fnStr) {
                    try {
                        fnStr = fnStr.replace(/[\/r\/n\/t]gm/, "")
                        var array = /\{(?<body>.*)\}/.exec(fnStr)
                        if (!array) {
                            return callbackSeries("cannot parse object function " + JSON.stringify(item))
                        }
                        var fnBody = array.groups["body"]
                        var fn = new Function(argsArray, fnBody)
                        return fn;
                    } catch (err) {
                        return callbackSeries("error in object function " + fnStr)
                    }
                }

                // format functions
                mappings.tripleModels.forEach(function (item) {
                    if (item.s.indexOf("function") > -1) {
                        var fn = getFunction(["row", "mapping"], item.s)
                        item.s = fn
                    }
                    if (item.o.indexOf("function") > -1) {
                        var fn = getFunction(["row", "mapping"], item.o)
                        item.o = fn

                    }

                })
                for (var key in mappings.transform) {
                    var fnStr = mappings.transform[key]
                    if (fnStr.indexOf("function") > -1) {
                        var fn = getFunction(["value", "role", "prop", "row"], fnStr)
                        mappings.transform[key] = fn

                    }
                }

                // format lookups
                mappings.lookups.forEach(function (item) {
                    var lookupFilePath = path.join(__dirname, "../../data/" + dirName + "/" + item.fileName);
                    item.filePath = lookupFilePath
                    if (item.transformFn) {

                        var fn = getFunction(["value", "role", "prop", "row"], item.transformFn)
                        item.transformFn = fn

                    }
                })

                var mappingsMap = {[mappings.fileName]: mappings}

                CsvTripleBuilder.createTriples(mappingsMap, mappings.graphUri, sparqlServerUrl, options, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    if (options.sampleSize)
                        output = result
                    else
                        output = {countCreatedTriples: result}
                    callbackSeries()


                })
            },


            function (callbackSeries) {
                callbackSeries()
            },


        ], function (err) {
            return callback(err, output)
        })


    }
};

module.exports = CsvTripleBuilder;

if (false) {
    var options = {
        deleteOldGraph: true,
        sampleSize: 500
    }
    CsvTripleBuilder.createTriplesFromCsv("D:\\webstorm\\souslesensVocables\\data\\CSV\\CFIHOS_V1.5_RDL", "CFIHOS tag class v1.5.csv.json", options, function (err, result) {

    })
}
