var fs = require("fs");
const async = require("async");
var sax = require("sax");
var util = require("../../bin/util.");
var httpProxy = require("../../bin/httpProxy.")


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


var parse = function (sourcePath, targetPath) {
    var saxStream = sax.createStream(false);
    var distinctNodeNames = {}
    var distinctAttrNames = {}
    saxStream.on("error", function (e) {
        console.error("error!", e);
        // clear the error
        this._parser.error = null;
        this._parser.resume();
    });


    getCurrentParentObject = function (nodePath) {
        var ancestors = nodePath.substring(0, currentNodePath.lastIndexOf("/"))
        if (ancestors && currentObjects[ancestors]){
            currentParentObj = currentObjects[ancestors][currentObjects[ancestors].length - 1]
            return currentParentObj
        }
        return null
    }
    var json = {classes: [], generalizations: [], collaborations: [], associations: []}

    saxStream.on("opentag", function (node) {

        currentNodePath = currentNodePath + "/" + node.name



        if (!currentObjects[currentNodePath]) {
            currentObjects[currentNodePath] = []
            console.log(currentNodePath)
        }


        var obj = {value: value, documentation: ""}


        currentNodeName = node.name

        if (!distinctNodeNames[currentNodePath]) {
            distinctNodeNames[currentNodePath] = 1


        }

        line++;
        if (line % 10000 == 0)
            console.log(line)
        //  console.log(node.name)
        var name = node.attributes["NAME"]
        var id = node.attributes["NAME"]
        var value = node.attributes["VALUE"]

      //  currentParentObj =getCurrentParentObject(currentNodePath)

        if (currentNodeName == "XS:SIMPLETYPE") {
            currentObjects[currentNodePath].push({type: node.name, name: name, id: id, children: []})


        }

        if (currentNodePath == "/XS:SCHEMA/XS:SIMPLETYPE/XS:RESTRICTION/XS:ENUMERATION") {
            currentParentObj =getCurrentParentObject(currentNodePath)
             if (currentParentObj) {
                console.log(currentParentObj.name)
                var obj = {type: node.name, name: name, value: value, documentation: ""}
                currentParentObj.children.push(obj);
            }
        }


    });

   /* saxStream.on("text", function (text) {
        var xx = currentNodePath
        if (currentNodePath == "/XS:SIMPLETYPE/XS:ANNOTATION/XS:DOCUMENTATION") {
            currentParentObj = currentObjects["/XS:SIMPLETYPE/XS:ANNOTATION"][currentObjects["/XS:SIMPLETYPE/XS:ANNOTATION"].index]

            if (currentParentObj)
                currentParentObj.documentation += text.trim();
        }
        if (currentNodePath == "/XS:SIMPLETYPE/XS:DOCUMENTATION") {
            currentParentObj = currentObjects["/XS:SIMPLETYPE"][currentObjects["/XS:SIMPLETYPE"].index]
            if (currentParentObj)
                currentParentObj.documentation += text.trim();
        }

    });*/




    saxStream.on("closetag", function (node) {
        currentNodePath=currentNodePath.substring(0,currentNodePath.lastIndexOf(node)-1)
        // var name = node.attributes["NAME"]
        if (node == "XS:SIMPLETYPE") {


        }


    });
    saxStream.on("end", function (node) {
        var xx = currentObjects
        return;
        fs.writeFileSync(targetPath + "Attrs.csv", JSON.stringify(distinctAttrNames, null, 2))
        fs.writeFileSync(targetPath + "Nodes.csv", JSON.stringify(distinctNodeNames, null, 2))

        fs.writeFileSync(targetPath, JSON.stringify(json, null, 2))
    });
    fs.createReadStream(sourcePath).pipe(saxStream);


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


var sourcePath = "D:\\NLP\\importedResources\\energistics\\common\\v2.1\\xsd_schemas\\CommonEnumerations.xsd"
var graphUri = "http://souslesens.org/pdms/ontology/"

var jsonPath = sourcePath + ".json";


parse(sourcePath, jsonPath);
//buildOwl(jsonPath,graphUri)




