var fs = require("fs");
const async = require("async");
var sax = require("sax");
var util = require("../../bin/util.");
var httpProxy = require("../../bin/httpProxy.");
var SPARQLutil = require("../../bin/SPARQLutil.");

var xml2js = require("xml2js");

var topParentTag;
var triples = "";
var currentTriple = "";
var currentUri = "";

var line = 0;

var currentParent;
var currentAttr;
var currentX;
var currentNodeName;

var currentNodePath = "";
var currentObjects = {};
var currentParentObj;

var parse = function (sourcePath, prefix, callback) {
    var parser = new xml2js.Parser();
    fs.readFile(sourcePath, function (err, data) {
        parser.parseString(data, function (err, result) {
            if (err) return callback(err);
            var json = [];
            var schema = result["xs:schema"];
            if (!schema) schema = result["xsd:schema"];
            if (!schema) return callback();
            var simpleTypes = schema["xs:simpleType"];
            if (simpleTypes) {
                simpleTypes.forEach(function (item) {
                    var documentation = "";
                    if (item["xs:annotation"] && item["xs:annotation"][0]["xs:documentation"]) documentation = item["xs:annotation"][0]["xs:documentation"][0];
                    var simpleTypeObj = {name: item.$.name, documentation: documentation, enumerations: []};

                    var enumerations = [];
                    if (item["xs:restriction"] && item["xs:restriction"][0]["xs:enumeration"]) enumerations = item["xs:restriction"][0]["xs:enumeration"];
                    enumerations.forEach(function (enumeration) {
                        var documentation = "";
                        if (enumeration["xs:annotation"] && enumeration["xs:annotation"][0]["xs:documentation"]) documentation = enumeration["xs:annotation"][0]["xs:documentation"][0];
                        simpleTypeObj.enumerations.push({value: enumeration.$.value, documentation: documentation});
                    });

                    json.push(simpleTypeObj);
                });
            }

            var complexTypes = schema["xs:complexType"];
            if (complexTypes) {
                complexTypes.forEach(function (item) {
                    var documentation = "";
                    if (item["xs:annotation"] && item["xs:annotation"][0]["xs:documentation"]) documentation = item["xs:annotation"][0]["xs:documentation"][0];
                    var complexTypeObj = {name: item.$.name, documentation: documentation, elements: []};

                    var sequences = [];
                    var extensionBase = null;
                    if (item["xs:complexContent"] && item["xs:complexContent"][0]["xs:extension"] && item["xs:complexContent"][0]["xs:extension"][0]["xs:sequence"]) {
                        extensionBase = item["xs:complexContent"][0]["xs:extension"][0].$["base"];
                        sequences = item["xs:complexContent"][0]["xs:extension"][0]["xs:sequence"];
                    } else if (item["xs:complexContent"] && item["xs:complexContent"][0]["eml:extension"] && item["xs:complexContent"][0]["eml:extension"][0]["xs:sequence"]) {
                        extensionBase = item["xs:complexContent"][0]["eml:extension"][0].$["base"];
                        sequences = item["xs:complexContent"][0]["eml:extension"][0]["xs:sequence"];
                    } else if (item["xs:complexContent"] && item["xs:complexContent"][0] && item["xs:complexContent"][0]["xs:sequence"]) {
                        sequences = item["xs:complexContent"][0]["xs:sequence"];
                    }

                    if (!sequences) {
                        var x = item;
                    } else {
                        sequences.forEach(function (sequence) {
                            var elements = sequence["xs:element"];
                            if (!elements) {
                                var x = item;
                            } else {
                                elements.forEach(function (element) {
                                    var documentation = "";
                                    var attrs = element.$

                                    if (element["xs:annotation"] && element["xs:annotation"][0]["xs:documentation"]) documentation = element["xs:annotation"][0]["xs:documentation"][0];
                                    var elementObj = element.$;

                                    elementObj.documentation = documentation;
                                    elementObj.extensionBase = extensionBase;
                                    complexTypeObj.elements.push(elementObj);
                                });
                            }
                        });
                    }
                    json.push(complexTypeObj);
                });
            }

            //   console.dir(JSON.stringify(result,null,2));
            fs.writeFileSync(sourcePath + ".json", JSON.stringify(json, null, 2));
            console.log("Done");
            callback(err);
        });
    });
};

var buildOwl = function (json, graphUri) {
        var triples = [];
        var classesMap = {};
        var objectPropertiesTriples = [];
        var partOfTriples = [];
        var dataTypePropertiesTriples = [];
        var restrictionsTriples = [];
        var propertiesMap = {};
        var blankNodeIndex = 0;

        // var json = JSON.parse("" + fs.readFileSync(jsonPath));
        for (var topClassKey in json) {
            var topClassUri = graphUri + util.formatStringForTriple(topClassKey, true);
            triples.push({
                subject: topClassUri,
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                object: "owl:Class",
            });

            triples.push({
                subject: topClassUri,
                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                object: "'" + util.formatStringForTriple(util.decapitalizeLabel(topClassKey)) + "'",
            });

            triples.push({
                subject: topClassUri,
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                object: "http://souslesens.org/resource/vocabulary/TopConcept",
            });


            var items = json[topClassKey]
            var packages = {};
            items.forEach(function (aClass) {
                var uri = graphUri + util.formatStringForTriple(aClass.name, true);
                var className = aClass.name.toLowerCase();
                if (!classesMap[className]) {
                    classesMap[className] = uri;

                    triples.push({
                        subject: uri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "owl:Class",
                    });

                    triples.push({
                        subject: uri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + util.formatStringForTriple(util.decapitalizeLabel(aClass.name)) + "'",
                    });
                    if (aClass.documentation) {
                        triples.push({
                            subject: uri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                            object: "'" + util.formatStringForTriple(aClass.documentation) + "'",
                        });
                    }
                }

                triples.push({
                    subject: uri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    object: topClassUri,
                });


                var className = aClass.name.toLowerCase();
                if (aClass.elements) {
                    aClass.elements.forEach(function (element) {
                        var propUri = propertiesMap[element.name];
                        var propLabel = util.formatStringForTriple("has" + element.name);
                        var type = element.type;

                        if (type.indexOf(prefix + ":") == 0) {
                            var objUri = graphUri + type.split(":")[1]
                            partOfTriples.push({
                                subject: uri,
                                predicate: "http://standards.iso.org/iso/15926/part14/partOf",
                                object: objUri,

                            })

                        } else {

                            if (element.type) {
                                type = classesMap[element.type];
                            }
                            if (!type) {
                                var attrName = element.name.toLowerCase();
                                targetClass = classesMap[attrName];
                            }

                            if (targetClass) {
                                if (!propertiesMap[attr.name]) {
                                    propUri = graphUri + "has" + util.formatStringForTriple(attr.name, true);
                                    propertiesMap[attr.name] = propUri;

                                    objectPropertiesTriples.push({
                                        subject: propUri,
                                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                        object: "owl:ObjectProperty",
                                    });
                                    objectPropertiesTriples.push({
                                        subject: propUri,
                                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                        object: "'" + propLabel + "'",
                                    });
                                }

                                //restrictions
                                var blankNode = "_:b" + blankNodeIndex++;
                                restrictionsTriples.push({
                                    subject: aClassUri,
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                    object: blankNode,
                                });
                                restrictionsTriples.push({
                                    subject: blankNode,
                                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    object: "http://www.w3.org/2002/07/owl#Restriction",
                                });
                                restrictionsTriples.push({
                                    subject: blankNode,
                                    predicate: "http://www.w3.org/2002/07/owl#onProperty",
                                    object: propUri,
                                });
                                restrictionsTriples.push({
                                    subject: blankNode,
                                    predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                                    object: targetClass,
                                });
                            } else {
                                //dataType property if no class
                                //   return;
                                if (!propertiesMap[element.name]) {
                                    propUri = graphUri + "has" + util.formatStringForTriple(element.name, true);
                                    propertiesMap[element.name] = propUri;

                                    dataTypePropertiesTriples.push({
                                        subject: propUri,
                                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                        object: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                                    });

                                    dataTypePropertiesTriples.push({
                                        subject: propUri,
                                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                        object: "'" + util.formatStringForTriple("has" + element.name) + "'",
                                    });
                                }
                                //restrictions

                                var blankNode = "_:b" + blankNodeIndex++;
                                restrictionsTriples.push({
                                    subject: aClassUri,
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                    object: blankNode,
                                });
                                restrictionsTriples.push({
                                    subject: blankNode,
                                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    object: "http://www.w3.org/2002/07/owl#Restriction",
                                });
                                restrictionsTriples.push({
                                    subject: blankNode,
                                    predicate: "http://www.w3.org/2002/07/owl#onProperty",
                                    object: propUri,
                                });
                            }

                        }
                        ;
                    });

                    var subClassTriples = [];
                    if (json.generalizations) {
                        json.generalizations.forEach(function (item) {
                            var subClassUri = classesMap[item.source];
                            var superClassUri = classesMap[item.target];

                            if (!subClassUri) {
                                subClassUri = graphUri + util.formatStringForTriple(item.source, true);

                                triples.push({
                                    subject: subClassUri,
                                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    object: "owl:Class",
                                });

                                triples.push({
                                    subject: subClassUri,
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                    object: "'" + util.formatStringForTriple(util.decapitalizeLabel(item.source)) + "'",
                                });
                                /* triples.push({
                                     subject: aClassUri,
                                     predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                     object: packageUri
                                 })*/
                            }

                            if (!superClassUri) {
                                superClassUri = graphUri + util.formatStringForTriple(item.target, true);

                                triples.push({
                                    subject: superClassUri,
                                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    object: "owl:Class",
                                });

                                triples.push({
                                    subject: superClassUri,
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                    object: "'" + util.formatStringForTriple(util.decapitalizeLabel(item.target)) + "'",
                                });
                                /* triples.push({
                                     subject: aClassUri,
                                     predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                     object: packageUri
                                 })*/
                            }
                            if (subClassUri && superClassUri) {
                                subClassTriples.push({
                                    subject: subClassUri,
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                    object: superClassUri,
                                });
                            } else {
                                var x = 3;
                            }
                        });
                    }
                }

//return;
                var allTriples = [];
                allTriples = allTriples.concat(triples);
                allTriples = allTriples.concat(objectPropertiesTriples);
                allTriples = allTriples.concat(dataTypePropertiesTriples);
                allTriples = allTriples.concat(restrictionsTriples);
                allTriples = allTriples.concat(subClassTriples);

                var slicedTriples = util.sliceArray(allTriples, 1000);
                var uniqueTriples = {};

                var totalTriples = 0;
                var sparqlServerUrl = "http://51.178.139.80:8890/sparql";

                async.series(
                    [
                        function (callbackSeries) {
                            var queryGraph = "CLEAR GRAPH <" + graphUri + ">";
                            var params = {query: queryGraph};
                            httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                                return callbackSeries(err);
                            });
                        },
                        function (callbackSeries) {
                            async.eachSeries(
                                slicedTriples,
                                function (triples, callbackEach) {
                                    //    return callbackEach();
                                    var triplesStr = "";
                                    triples.forEach(function (triple) {
                                        var subject = triple.subject;
                                        if (subject.indexOf("_:b") == 0) ;
                                        else subject = "<" + subject + ">";

                                        var value = triple.object;
                                        if (value.indexOf("_:b") == 0) ;
                                        else if (value.indexOf("http") == 0) value = "<" + value + ">";
                                        var tripleStr = subject + " <" + triple.predicate + "> " + value + ".\n";
                                        var tripleHash = util.hashCode(tripleStr);
                                        if (uniqueTriples[tripleHash]) return;
                                        else {
                                            uniqueTriples[tripleHash] = 1;
                                            triplesStr += tripleStr;
                                        }
                                    });
                                    var queryGraph =
                                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#> ";
                                    queryGraph += "with <" + graphUri + ">" + "insert {";
                                    queryGraph += triplesStr;

                                    queryGraph += "}";

                                    var params = {query: queryGraph};

                                    httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                                        if (err) {
                                            var x = queryGraph;
                                            return callbackEach(err);
                                        }
                                        totalTriples += triples.length;
                                        console.log(totalTriples);
                                        return callbackEach(null);
                                    });
                                },
                                function (err) {
                                    return callbackSeries(err);
                                }
                            );
                        },
                    ],
                    function (err) {
                        if (err) {
                            console.log(err);
                        }
                        return console.log("DONE " + totalTriples);
                    }
                );

            })
        }
    }
;


/***********************************************************************************************************************************************/
/***********************************************************************************************************************************************/


var sourcePath = "D:\\NLP\\ontologies\\energistics\\common\\v2.1\\xsd_schemas\\CommonEnumerations.xsd";
var graphUri = " \"http://souslesens.org/energistics/ontology/witsml/";


var dirPathCommon = {dir: "D:\\NLP\\ontologies\\energistics\\common\\v2.1\\xsd_schemas\\", prefix: "eml"};
var dirPathWitsml = {dir: "D:\\NLP\\ontologies\\energistics\\witsml\\v2.0\\xsd_schemas\\", prefix: "witsml"};
var dirPathProdml = {dir: "D:\\NLP\\ontologies\\energistics\\prodml\\v2.1\\xsd_schemas\\", prefix: "prodml"};
var dirPathResqml = {dir: "D:\\NLP\\ontologies\\energistics\\resqmlv2\\v2.0.1\\xsd_schemas\\", prefix: "resqml"};


if (true) {
    var currentDir = dirPathWitsml
    var dirPath = currentDir.dir;
    var prefix = currentDir.prefix;
    var commonDir = dirPathCommon.dir
    async.series([

            // parse each xsd to json
            function (callbackSeries) {
                return callbackSeries();

                var files = fs.readdirSync(dirPath);
                async.eachSeries(
                    files,
                    function (file, callbackEach) {
                        if (file.endsWith(".xsd")) {
                            parse(dirPath + file, prefix, function (err) {
                                if (err) console.log(err);
                                callbackEach();
                            });
                        } else callbackEach();
                    },
                    function (err) {
                        callbackSeries(err)
                    }
                );
            },

            //concat all json together
            function (callbackSeries) {


                return callbackSeries();


                var globalJson = {};
                var dirPaths = [dirPath]
                async.eachSeries(
                    dirPaths,
                    function (dirPath, callbackEachDir) {
                        var files = fs.readdirSync(dirPath);
                        async.eachSeries(
                            files,
                            function (file, callbackEach) {
                                if (file.endsWith(".json")) {
                                    var json = JSON.parse(fs.readFileSync(dirPath + file))
                                    var objName = file.substring(0, file.indexOf("."))
                                    var obj = globalJson[objName] = json
                                    // globalJson = globalJson.concat(jsonFile);
                                    callbackEach();
                                } else callbackEach();
                            },
                            function (err) {
                                callbackEachDir(err);
                            }
                        );
                    },
                    function (err) {
                        if (err) return callbackSeries(err)
                        fs.writeFileSync(dirPath + prefix + "merged.json", JSON.stringify(globalJson, null, 2));
                        callbackSeries(err)
                        console.log("done");
                    }
                );
            },
            //concat all json together
            function (callbackSeries) {
                var json = JSON.parse(fs.readFileSync(dirPath + prefix + "merged.json"))
                buildOwl(json, graphUri)
            }

        ], function (err) {

        }
    )
}
/*if (false) {
    var dirPath = dirPathResqml;
    var graphUri = "http://souslesens.org/energistics/ontology/resqml/";
    var filePath = dirPath + "global.json";
    var json = JSON.parse(fs.readFileSync(filePath));
    var distinctClasses = {};
    var triples = [];
    var propertiesMap = [];
    var restrictionsTriples = [];
    var objectPropertiesTriples = [];
    var enumTriples = [];
    var blankNodeIndex = 0;

    json.forEach(function (item) {
        if (!distinctClasses[item.name]) {
            var className = item.name;
            var classUri = distinctClasses[className];
            if (!classUri) {
                var classUri = graphUri + util.getRandomHexaId(10);
                distinctClasses[className] = classUri;
                triples.push({
                    subject: classUri,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "owl:Class",
                });

                triples.push({
                    subject: classUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                    object: "'" + util.formatStringForTriple(className) + "'",
                });
                if (item.documentation) {
                    triples.push({
                        subject: classUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                        object: "'" + util.formatStringForTriple(item.documentation) + "'",
                    });
                }
            }
        } else {
            var x = 3;
        }
    });
    json.forEach(function (item) {
        var classUri = distinctClasses[item.name];
        if (item.elements) {
            item.elements.forEach(function (element) {
                var propUri = propertiesMap[element.name];

                var target = element.type;
                var p;
                if ((p = target.indexOf(":")) > -1) target = target.substring(p + 1);

                var targetClass = distinctClasses[target];

                if (!propUri) {
                    propUri = graphUri + "has" + util.formatStringForTriple(element.name, true);
                    if (element.name == "length") element.name = "Length";
                    console.log(element.name);
                    propertiesMap[element.name] = propUri;

                    if (targetClass) {
                        objectPropertiesTriples.push({
                            subject: propUri,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "owl:ObjectProperty",
                        });
                    } else {
                        objectPropertiesTriples.push({
                            subject: propUri,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                        });
                    }
                    objectPropertiesTriples.push({
                        subject: propUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + "has" + util.formatStringForTriple(element.name) + "'",
                    });
                    if (element.documentation) {
                        triples.push({
                            subject: propUri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                            object: "'" + util.formatStringForTriple(element.documentation) + "'",
                        });
                    }
                }

                var blankNode = "_:b" + blankNodeIndex++;
                restrictionsTriples.push({
                    subject: classUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    object: blankNode,
                });
                restrictionsTriples.push({
                    subject: blankNode,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "http://www.w3.org/2002/07/owl#Restriction",
                });
                restrictionsTriples.push({
                    subject: blankNode,
                    predicate: "http://www.w3.org/2002/07/owl#onProperty",
                    object: propUri,
                });
                if (targetClass) {
                    restrictionsTriples.push({
                        subject: blankNode,
                        predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                        object: targetClass,
                    });
                } else {
                }
            });
        }

        if (item.enumerations) {
            var enumsMap = {};

            item.enumerations.forEach(function (itemEnum) {
                var enumLabel = itemEnum.value;
                if (!enumsMap[enumLabel]) {
                    enumsMap[enumLabel] = 1;
                    var enumUri = graphUri + util.getRandomHexaId(10);
                    enumTriples.push({
                        subject: enumUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + util.formatStringForTriple(enumLabel) + "'",
                    });
                    enumTriples.push({
                        subject: enumUri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: classUri,
                    });
                    enumTriples.push({
                        subject: enumUri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "http://www.w3.org/2002/07/owl:NamedIndividual",
                    });

                    if (itemEnum.documentation) {
                        enumTriples.push({
                            subject: enumUri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                            object: "'" + util.formatStringForTriple(itemEnum.documentation) + "'",
                        });
                    }
                }
            });
        }

        //  console.log(item.name)
    });

    var allTriples = [];
    allTriples = allTriples.concat(triples);
    allTriples = allTriples.concat(objectPropertiesTriples);
    allTriples = allTriples.concat(restrictionsTriples);
    allTriples = allTriples.concat(enumTriples);

    SPARQLutil.generateTriples(graphUri, allTriples, true, function (err, result) {
        if (err) return console.log(err);
        console.log(result);
    });
}*/

/*if (false) {
    var queryGraph =
        "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT ?label " +
        " FROM   <http://souslesens.org/energistics/ontology/witsml/>  WHERE {{ ?concept \n" +
        "      rdfs:label ?label .?concept rdf:type owl:Class}}   order by ?label limit 10000";

    var params = { query: queryGraph };

    var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
    httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
        if (err) {
            var x = queryGraph;
        }
        var str = "";
        var data = result.results.bindings;
        data.forEach(function (item) {
            if (!item.label) return;
            var str2 = "";
            var array = item.label.value.match(/[A-Z][a-z]+|[0-9]+/g);
            if (array && array.length > 0) str2 = array.join(" ");

            str += item.label.value + "\t" + str2 + "\n";
        });
        fs.writeFileSync("D:\\NLP\\ontologies\\dictionaries\\WITSMlabels.txt", str);
    });
}*/


