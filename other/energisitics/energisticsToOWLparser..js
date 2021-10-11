var fs = require("fs");
const async = require("async");
var sax = require("sax");
var util = require("../../bin/util.");
var httpProxy = require("../../bin/httpProxy.")


var xml2js = require('xml2js');


var topParentTag;
var triples = "";
var currentTriple = "";
var currentUri = "";

var line = 0


var currentParent;
var currentAttr;
var currentX
var currentNodeName;

var currentNodePath = ""
var currentObjects = {}
var currentParentObj


var parse = function (sourcePath, targetPath,callback) {
    var parser = new xml2js.Parser();
    fs.readFile(sourcePath, function (err, data) {
        parser.parseString(data, function (err, result) {
            if(err)
                return callback(err)
            var json = []
            var schema= result["xs:schema"];
            if(!schema)
                 schema= result["xsd:schema"];
            if(! schema)
                return callback()
            var simpleTypes = schema["xs:simpleType"];
            if (simpleTypes) {
                simpleTypes.forEach(function (item) {
                    var documentation = "";
                    if (item["xs:annotation"] && item["xs:annotation"][0]["xs:documentation"])
                        documentation = item["xs:annotation"][0]["xs:documentation"][0]
                    var simpleTypeObj = {name: item.$.name, documentation: documentation, enumerations: []}

                    var enumerations = []
                    if (item["xs:restriction"] && item["xs:restriction"][0]["xs:enumeration"])
                        enumerations = item["xs:restriction"][0]["xs:enumeration"]
                    enumerations.forEach(function (enumeration) {
                        var documentation = "";
                        if (enumeration["xs:annotation"] && enumeration["xs:annotation"][0]["xs:documentation"])
                            documentation = enumeration["xs:annotation"][0]["xs:documentation"][0]
                        simpleTypeObj.enumerations.push({value: enumeration.$.value, documentation: documentation})
                    })


                    json.push(simpleTypeObj)
                })
            }


            var complexTypes = schema["xs:complexType"];
            if (complexTypes) {
                complexTypes.forEach(function (item) {
                    var documentation = "";
                    if (item["xs:annotation"] && item["xs:annotation"][0]["xs:documentation"])
                        documentation = item["xs:annotation"][0]["xs:documentation"][0]
                    var complexTypeObj = {name: item.$.name, documentation: documentation, elements: []}



                  var sequences = []
                    var extensionBase=null;
                    if (item["xs:complexContent"] && item["xs:complexContent"][0]["xs:extension"]&& item["xs:complexContent"][0]["xs:extension"][0]["xs:sequence"]){
                        extensionBase=item["xs:complexContent"][0]["xs:extension"][0].$["base"]
                        sequences= item["xs:complexContent"][0]["xs:extension"][0]["xs:sequence"]
                    }  else if (item["xs:complexContent"] && item["xs:complexContent"][0]["eml:extension"]&& item["xs:complexContent"][0]["eml:extension"][0]["xs:sequence"]){
                        extensionBase=item["xs:complexContent"][0]["eml:extension"][0].$["base"]
                        sequences= item["xs:complexContent"][0]["eml:extension"][0]["xs:sequence"]
                    }
                    else   if (item["xs:complexContent"] && item["xs:complexContent"][0] && item["xs:complexContent"][0]["xs:sequence"]) {
                        sequences=item["xs:complexContent"][0]["xs:sequence"]
                    }

                    if(!sequences ){
                       var x=item
                    }else {
                        sequences.forEach(function (sequence) {
                        var elements = sequence["xs:element"]
                            if(!elements ){
                                var x=item
                            }else {
                                elements.forEach(function (element) {

                                    var documentation = "";
                                    if (element["xs:annotation"] && element["xs:annotation"][0]["xs:documentation"])
                                        documentation = element["xs:annotation"][0]["xs:documentation"][0]
                                    var elementObj = element.$
                                    elementObj.documentation = documentation
                                    elementObj.extensionBase = extensionBase
                                    complexTypeObj.elements.push(elementObj)
                                })
                            }
                        })

                    }
                    json.push(complexTypeObj)
                })
                }



            //   console.dir(JSON.stringify(result,null,2));
            fs.writeFileSync(sourcePath + ".json", JSON.stringify(json, null, 2))
            console.log('Done');
            callback(err)
        });
    });

}


var buildOwl = function (jsonPath, graphUri) {
    var triples = []
    var classesMap = {}
    var json = JSON.parse("" + fs.readFileSync(jsonPath));


    var packages = {}
    json.classes.forEach(function (aClass) {

        var uri = graphUri + util.formatStringForTriple(aClass.id, true)
        var className = aClass.name.toLowerCase()
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
                object: "'" + util.formatStringForTriple(aClass.name) + "'",
            });
            if (aClass.documentation) {
                triples.push({
                    subject: uri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                    object: "'" + util.formatStringForTriple(aClass.documentation) + "'",
                });
            }
        }
        if (aClass.package_name) {
            var packageUri = packages[aClass.package_name]
            if (!packageUri) {
                packageUri = graphUri + util.formatStringForTriple(aClass.package_name, true)
                packages[aClass.package_name] = packageUri
                triples.push({
                    subject: packageUri,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "owl:Class",
                });

                triples.push({
                    subject: packageUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                    object: "'" + util.formatStringForTriple(aClass.package_name) + "'",
                });
                /* triples.push({
                     subject: aClassUri,
                     predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                     object: packageUri
                 })*/
            }


            triples.push({
                subject: uri,
                predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                object: packageUri
            })

        }


    })
    var objectPropertiesTriples = []
    var dataTypePropertiesTriples = []
    var restrictionsTriples = []
    var propertiesMap = {}
    var blankNodeIndex = 0;
    json.classes.forEach(function (aClass) {
        var className = aClass.name.toLowerCase()
        var aClassUri = classesMap[className]
        aClass.attributes.forEach(function (attr) {

            var propUri = propertiesMap[attr.name]
            var propLabel = util.formatStringForTriple("has" + attr.name)
            if (attr.ref) {
                var targetClass = classesMap[attr.ref]
            }
            if (!targetClass) {
                var attrName = attr.name.toLowerCase()
                targetClass = classesMap[attrName]
            }


            if (targetClass) {
                if (!propertiesMap[attr.name]) {
                    propUri = graphUri + "has" + util.formatStringForTriple(attr.name, true)
                    propertiesMap[attr.name] = propUri

                    objectPropertiesTriples.push({
                        subject: propUri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "owl:ObjectProperty",

                    });
                    objectPropertiesTriples.push({
                        subject: propUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + propLabel + "'",
                    })
                }


                //restrictions
                var blankNode = "_:b" + (blankNodeIndex++)
                restrictionsTriples.push({
                    subject: aClassUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    object: blankNode
                })
                restrictionsTriples.push({
                    subject: blankNode,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "http://www.w3.org/2002/07/owl#Restriction"
                })
                restrictionsTriples.push({
                    subject: blankNode,
                    predicate: "http://www.w3.org/2002/07/owl#onProperty",
                    object: propUri
                })
                restrictionsTriples.push({
                    subject: blankNode,
                    predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                    object: targetClass
                })


            } else {//dataType property if no class
                //   return;
                if (!propertiesMap[attr.name]) {
                    propUri = graphUri + "has" + util.formatStringForTriple(attr.name, true)
                    propertiesMap[attr.name] = propUri

                    dataTypePropertiesTriples.push({
                        subject: propUri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                    })

                    dataTypePropertiesTriples.push({
                        subject: propUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + util.formatStringForTriple("has" + attr.name) + "'",
                    })

                }
                //restrictions

                var blankNode = "_:b" + (blankNodeIndex++)
                restrictionsTriples.push({
                    subject: aClassUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    object: blankNode
                })
                restrictionsTriples.push({
                    subject: blankNode,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "http://www.w3.org/2002/07/owl#Restriction"
                })
                restrictionsTriples.push({
                    subject: blankNode,
                    predicate: "http://www.w3.org/2002/07/owl#onProperty",
                    object: propUri
                })


            }


        })
    })

    var subClassTriples = [];
    json.generalizations.forEach(function (item) {
        var subClassUri = classesMap[item.source]
        var superClassUri = classesMap[item.target]

        if (!subClassUri) {
            subClassUri = graphUri + util.formatStringForTriple(item.source, true)

            triples.push({
                subject: subClassUri,
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                object: "owl:Class",
            });

            triples.push({
                subject: subClassUri,
                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                object: "'" + util.formatStringForTriple(item.source) + "'",
            });
            /* triples.push({
                 subject: aClassUri,
                 predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                 object: packageUri
             })*/
        }

        if (!superClassUri) {
            superClassUri = graphUri + util.formatStringForTriple(item.target, true)

            triples.push({
                subject: superClassUri,
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                object: "owl:Class",
            });

            triples.push({
                subject: superClassUri,
                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                object: "'" + util.formatStringForTriple(item.target) + "'",
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
                object: superClassUri
            })

        } else {
            var x = 3
        }


    })


//return;
    var allTriples = []
    allTriples = allTriples.concat(triples)
    allTriples = allTriples.concat(objectPropertiesTriples)
    allTriples = allTriples.concat(dataTypePropertiesTriples)
    allTriples = allTriples.concat(restrictionsTriples)
    allTriples = allTriples.concat(subClassTriples)


    var slicedTriples = util.sliceArray(allTriples, 1000);
    var uniqueTriples = {}


    var totalTriples = 0
    var sparqlServerUrl = "http://51.178.139.80:8890/sparql"


    async.series([
        function (callbackSeries) {

            var queryGraph = "CLEAR GRAPH <" + graphUri + ">"
            var params = {query: queryGraph};
            httpProxy.post(
                sparqlServerUrl,
                null,
                params,
                function (err, result) {
                    return callbackSeries(err)
                }
            );
        },
        function (callbackSeries) {


            async.eachSeries(
                slicedTriples,
                function (triples, callbackEach) {
                    //    return callbackEach();
                    var triplesStr = "";
                    triples.forEach(function (triple) {
                        var subject = triple.subject
                        if (subject.indexOf("_:b") == 0)
                            ;
                        else
                            subject = "<" + subject + ">"

                        var value = triple.object;
                        if (value.indexOf("_:b") == 0)
                            ;
                        else if (value.indexOf("http") == 0)
                            value = "<" + value + ">";
                        var tripleStr =
                            subject + " <" +
                            triple.predicate +
                            "> " +
                            value +
                            ".\n";
                        var tripleHash = util.hashCode(tripleStr);
                        if (uniqueTriples[tripleHash]) return;
                        else {
                            uniqueTriples[tripleHash] = 1;
                            triplesStr += tripleStr;
                        }
                    });
                    var queryGraph =
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#> "
                    queryGraph += "with <" + graphUri + ">" + "insert {";
                    queryGraph += triplesStr;

                    queryGraph += "}";

                    var params = {query: queryGraph};


                    httpProxy.post(
                        sparqlServerUrl,
                        null,
                        params,
                        function (err, result) {
                            if (err) {
                                var x = queryGraph
                                return callbackEach(err);
                            }
                            totalTriples += triples.length;
                            console.log(totalTriples)
                            return callbackEach(null);
                        }
                    );
                },
                function (err) {
                    return callbackSeries(err)
                }
            )
        }
    ], function (err) {
        if (err) {
            console.log(err)
        }
        return console.log("DONE " + totalTriples);
    })


}


var sourcePath = "D:\\NLP\\ontologies\\energistics\\common\\v2.1\\xsd_schemas\\CommonEnumerations.xsd"
var graphUri = "http://souslesens.org/pdms/ontology/"

var jsonPath = sourcePath + ".json";


var dirPathCommon = "D:\\NLP\\ontologies\\energistics\\common\\v2.1\\xsd_schemas\\"
var dirPathWitsml = "D:\\NLP\\ontologies\\energistics\\witsml\\v2.0\\xsd_schemas\\"
var dirPathProdml = "D:\\NLP\\ontologies\\energistics\\prodml\\v2.1\\xsd_schemas\\"
var dirPathResqml = "D:\\NLP\\ontologies\\energistics\\resqmlv2\\v2.0.1\\xsd_schemas\\"

if(false) {
    var dirPath = dirPathResqml;
    var files = fs.readdirSync(dirPath)
    async.eachSeries(files, function (file, callbackEach) {
        if (file.endsWith(".xsd")) {
            parse(dirPath + file, jsonPath, function (err) {
                if (err)
                    console.log(err)
                callbackEach()

            });
        } else
            callbackEach()

    }, function (err) {
        if (err)
            return console.log(err)
        console.log("done")
    })
}
if(false){

    var dirPaths =[dirPathCommon,dirPathResqml];
    var globalJson=[]
    async.eachSeries(dirPaths, function (dirPath, callbackEachDir) {
        var files = fs.readdirSync(dirPath)
        async.eachSeries(files, function (file, callbackEach) {

            if (file.endsWith(".json")) {
               var jsonFile=JSON.parse(fs.readFileSync(dirPath+file))
                globalJson=globalJson.concat(jsonFile)
                    callbackEach()


            } else
                callbackEach()

        }, function (err) {
          callbackEachDir()
        })
    },function(err){
        if (err)
            return console.log(err)
        fs.writeFileSync(dirPaths[1]+"global.json",JSON.stringify(globalJson,null,2))
        console.log("done")
    })





}

if(true){
    var dirPath=dirPathResqml
    var graphUri="http://souslesens.org/energistics/ontology/resqml/"
    var filePath=dirPath+"global.json"
    var json=JSON.parse(fs.readFileSync(filePath))
    var distinctClasses={}
    var triples=[]
    var propertiesMap=[]
    var restrictionsTriples=[]
    var objectPropertiesTriples=[]
    var enumTriples=[]
    var blankNodeIndex=0;

    json.forEach(function(item) {
        if (!distinctClasses[item.name]) {
            var className = item.name
            var classUri = distinctClasses[className]
            if (!classUri) {

                var classUri = graphUri + util.getRandomHexaId(10)
                distinctClasses[className] = classUri
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

            var x = 3
        }
    })
    json.forEach(function(item) {
        var classUri =distinctClasses[item.name]
        if( item.elements) {

            item.elements.forEach(function (element) {

                var propUri = propertiesMap[element.name]


                var target = element.type;
                var p
                if ((p = target.indexOf(":")) > -1)
                    target = target.substring(p + 1)

                var targetClass = distinctClasses[target];




                if (!propUri) {
                    propUri = graphUri + "has" + util.formatStringForTriple(element.name, true)
                   if(element.name =="length")
                       element.name ="Length"
                        console.log(element.name)
                    propertiesMap[element.name] = propUri

                    if (targetClass) {
                        objectPropertiesTriples.push({
                            subject: propUri,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "owl:ObjectProperty",

                        });
                    }else{
                        objectPropertiesTriples.push({
                            subject: propUri,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "http://www.w3.org/2002/07/owl#DatatypeProperty"
                        })
                    }
                    objectPropertiesTriples.push({
                        subject: propUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + "has" + util.formatStringForTriple(element.name) + "'",
                    })
                    if (element.documentation) {
                        triples.push({
                            subject: propUri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                            object: "'" + util.formatStringForTriple(element.documentation) + "'",
                        });
                    }
                }



                    var blankNode = "_:b" + (blankNodeIndex++)
                    restrictionsTriples.push({
                        subject: classUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                        object: blankNode
                    })
                    restrictionsTriples.push({
                        subject: blankNode,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "http://www.w3.org/2002/07/owl#Restriction"
                    })
                    restrictionsTriples.push({
                        subject: blankNode,
                        predicate: "http://www.w3.org/2002/07/owl#onProperty",
                        object: propUri
                    })
                if (targetClass) {
                    restrictionsTriples.push({
                        subject: blankNode,
                        predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                        object: targetClass
                    })
                } else {
                   ;
                }

            })
        }

        if(item.enumerations){
            var enumsMap={}

            item.enumerations.forEach(function(itemEnum){
                var enumLabel=itemEnum.value
                if(!enumsMap[enumLabel]) {
                    enumsMap[enumLabel]=1;
                    var enumUri = graphUri + util.getRandomHexaId(10)
                    enumTriples.push({
                        subject: enumUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + util.formatStringForTriple(enumLabel) + "'",
                    })
                    enumTriples.push({
                        subject: enumUri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: classUri,
                    });
                    enumTriples.push({
                        subject: enumUri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "http://www.w3.org/2002/07/owl:NamedIndividual"
                    });


                    if (itemEnum.documentation) {
                        enumTriples.push({
                            subject: enumUri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                            object: "'" + util.formatStringForTriple(itemEnum.documentation) + "'",
                        });
                    }
                }





            })




        }

      //  console.log(item.name)





    })

    var allTriples = []
    allTriples = allTriples.concat(triples)
    allTriples = allTriples.concat(objectPropertiesTriples)
    allTriples = allTriples.concat(restrictionsTriples)
    allTriples = allTriples.concat(enumTriples)



    var sparqlServerUrl = "http://51.178.139.80:8890/sparql"
var slicedTriples=util.sliceArray(allTriples,1000)
    var totalTriples=0
    var uniqueTriples={}

    async.series([
        function (callbackSeries) {

            var queryGraph = "CLEAR GRAPH <" + graphUri+">"
            var params = {query: queryGraph};
            httpProxy.post(
                sparqlServerUrl,
                null,
                params,
                function (err, result) {
                    return callbackSeries(err)
                }
            );
        },
        function (callbackSeries) {


            async.eachSeries(
                slicedTriples,
                function (triples, callbackEach) {
                    //    return callbackEach();
                    var triplesStr = "";
                    triples.forEach(function (triple) {
                        var subject = triple.subject
                        if (subject.indexOf("_:b") == 0)
                            ;
                        else
                            subject = "<" + subject + ">"

                        var value = triple.object;
                        if (value.indexOf("_:b") == 0)
                            ;
                        else if (value.indexOf("http") == 0)
                            value = "<" + value + ">";
                        var tripleStr =
                            subject + " <" +
                            triple.predicate +
                            "> " +
                            value +
                            ".\n";
                        var tripleHash = util.hashCode(tripleStr);
                        if (uniqueTriples[tripleHash]) return;
                        else {
                            uniqueTriples[tripleHash] = 1;
                            triplesStr += tripleStr;
                        }
                    });
                    var queryGraph =
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#> "
                    queryGraph += "with <" + graphUri + ">" + "insert {";
                    queryGraph += triplesStr;

                    queryGraph += "}";

                    var params = {query: queryGraph};


                    httpProxy.post(
                        sparqlServerUrl,
                        null,
                        params,
                        function (err, result) {
                            if (err) {
                                var x = queryGraph
                                return callbackEach(err);
                            }
                            totalTriples += triples.length;
                            console.log(totalTriples)
                            return callbackEach(null);
                        }
                    );
                },
                function (err) {
                    return callbackSeries(err)
                }
            )
        }
    ], function (err) {
        if (err) {
            console.log(err)
        }
        return console.log("DONE " + totalTriples);
    })

}




//buildOwl(jsonPath,graphUri)




