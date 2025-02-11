const httpProxy = require("./httpProxy.");
const rdfParser = require("rdf-parse").default;
var fs = require("fs");
var path = require("path");
const async = require("async");
var util = require("./util.");
const N3 = require("n3");

var graphUrisMap = {};

var sparql_server_url = "";

var RDF_IO = {


        triples2turtle: function (triples, callback) {


            try {

                var prefixes = {
                    owl: "http://www.w3.org/2002/07/owl#",
                    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
                    dcterm: "http://purl.org/dc/terms/",
                    dc: "http://purl.org/dc/elements/1.1/",
                    skos: "http://www.w3.org/2004/02/skos/core#",
                }
                var prefixIndex = 0;
                var dataFactory = N3.DataFactory;

                function addPrefix(uri) {
                    var p = uri.lastIndexOf("#")
                    if (p < 0) {
                        p = uri.lastIndexOf("/")
                    }
                    if (p > 0) {
                        var baseUri = uri.substring(0, p + 1)
                        var isNew = true
                        for (var key in prefixes) {
                            if (baseUri.startsWith(prefixes[key])) {
                                isNew = false
                            }
                        }
                        if (isNew) {
                            prefixes["n" + prefixIndex++] = baseUri
                        }
                    }
                }

                function getRdfElement(elt) {

                    var p
                    var output = null
                    var prefix = elt.split(":")[0]
                    if (prefixes[prefix]){//already prefix
                        output = dataFactory.namedNode(elt)
                    } else if (prefix == "_") {
                        output = dataFactory.blankNode(elt)
                    } else if (elt.indexOf("http") == 0 || elt.valueType == "uri") {
                        addPrefix(elt)
                        output = dataFactory.namedNode(elt)
                    }

                 else if ((p = elt.indexOf("^^")) > 0) {
                    //xsd type
                    var string_number_version = +elt.substring(0, p).replace(/'/gm, "");
                    if (!isNaN(string_number_version)) {
                        output =dataFactory.literal(elt, rdf.xsdns('decimal'))
                    }
                    if (elt.split("^^")[1] == "xsd:dateTime") {
                        output = dataFactory.literal(elt, rdf.xsdns('date'))

                    } else {
                        output = dataFactory.literal(elt)
                    }


                } else {
                        output = dataFactory.literal(elt)
                }

                 return output


                    if (elt.match(/^_:b\d+$/)) {
                        return dataFactory.blankNode(elt)
                    } else if (elt.indexOf("_:b") == 0) {
                        return dataFactory.blankNode(elt)
                    } else if (elt.indexOf("_:") == 0) {
                        return dataFactory.blankNode(elt)
                    } else if (elt.indexOf("http") == 0 || elt.valueType == "uri") {
                        addPrefix(elt)
                        return dataFactory.namedNode(elt)
                    } else if ((p = elt.indexOf("^^")) > 0) {
                        //xsd type
                        var string_number_version = +elt.substring(0, p).replace(/'/gm, "");
                        if (!isNaN(string_number_version)) {
                            return dataFactory.literal(elt, rdf.xsdns('decimal'))
                        }
                        if (elt.split("^^")[1] == "xsd:dateTime") {
                            return dataFactory.literal(elt, rdf.xsdns('date'))

                        } else {
                            return dataFactory.literal(elt)
                        }


                    } else {
                        return dataFactory.literal(elt)
                    }


                }

                var quads = []
                triples.forEach(function (triple) {
                    quads.push(dataFactory.quad(
                        getRdfElement(triple.subject),
                        getRdfElement(triple.predicate),
                        getRdfElement(triple.object)
                    ))

                })

                const writer = new N3.Writer({prefixes: prefixes}); // Create a writer which uses `c` as a prefix for the namespace `http://example.org/cartoons#`
                quads.forEach(function (quad) {
                    writer.addQuad(quad)
                })

                writer.end((error, result) => {
                    console.log(result)
                    return callback(null, result)
                });


                return;


                var graph = new rdf.Graph();

                slsTriples.forEach(function (triple) {
                    graph.add(
                        getRdfElement.triple.subject,
                        getRdfElement.triple.predicate,
                        getRdfElement.triple.object)

                })
                var profile = rdf.environment.createProfile();
                for (var key in prefixes) {
                    profile.setPrefix(key, prefixes[key])
                }

                const turtle = graph
                    .toArray()
                    .sort(function (a, b) {
                        return a.compare(b);
                    })
                    .map(function (stmt) {
                        return stmt.toTurtle(profile);
                    });

                console.log(turtle.join("\n"));


                return turtle;


            } catch (e) {
                return e;
            }


            return;


            const writer = new N3.Writer({
                prefixes: {
                    c: 'http://example.org/cartoons#',
                    foaf: 'http://xmlns.com/foaf/0.1/'
                }
            });
            var dataFactory = N3.DataFactory;
            writer.addQuad(
                writer.blank(
                    dataFactory.namedNode('http://xmlns.com/foaf/0.1/givenName'),
                    dataFactory.literal('Tom', 'en')),
                dataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                dataFactory.namedNode('http://example.org/cartoons#Cat')
            );
            writer.addQuad(dataFactory.quad(
                dataFactory.namedNode('http://example.org/cartoons#Jerry'),
                dataFactory.namedNode('http://xmlns.com/foaf/0.1/knows'),
                writer.blank([{
                    predicate: dataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                    object: dataFactory.namedNode('http://example.org/cartoons#Cat'),
                }, {
                    predicate: dataFactory.namedNode('http://xmlns.com/foaf/0.1/givenName'),
                    object: dataFactory.literal('Tom', 'en'),
                }])
            ));
            writer.addQuad(
                dataFactory.namedNode('http://example.org/cartoons#Mammy'),
                dataFactory.namedNode('http://example.org/cartoons#hasPets'),
                writer.list([
                    dataFactory.namedNode('http://example.org/cartoons#Tom'),
                    dataFactory.namedNode('http://example.org/cartoons#Jerry'),
                ])
            );
            writer.end((error, result) => {
                // console.log(result)
                return callback(null, result)
            });


        },


        getGraphUri: function (sourceLabel) {
            if (graphUrisMap[sourceLabel]) {
                return graphUrisMap[sourceLabel];
            }
            //"D:\\GitHub\\souslesensVocables\\public\\vocables\\config"
            var sourcesFilePath = path.join(__dirname, "../config/sources.json");
            sourcesFilePath = path.resolve(sourcesFilePath);
            try {
                var str = fs.readFileSync(sourcesFilePath);
                var sources = JSON.parse(str);
                if (!sources[sourceLabel]) {
                    return "no source matching";
                }
                if (Array.isArray(sources[sourceLabel].graphUri)) {
                    return sources[sourceLabel].graphUri[0];
                }
                return sources[sourceLabel].graphUri;
            } catch (e) {
                return e;
            }
        },

        getOntology: function (sourceLabel, callback) {
            var graphUri = RDF_IO.getGraphUri(sourceLabel);
            if (graphUri.indexOf("http") != 0) {
                return callback(null, "ERROR reading graphUri :" + sourceLabel + "  " + graphUri);
            }

            var query = "select  ?s ?p ?o  from <" + graphUri + ">  WHERE { ?s ?p ?o  } order by ?s";
            var params = {query: query};

            httpProxy.post(sparql_server_url, null, params, function (err, result) {
                if (err) {
                    return callback(err);
                }

                var writer = new N3.Writer({
                    prefixes: {
                        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
                        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                        owl: "http://www.w3.org/2002/07/owl#",
                        part14: "http://rds.posccaesar.org/ontology/lis14/",
                        one: "http://data.total.com/resource/one-model/ontology/",
                        readi: "http://w3id.org/readi/z018-rdl/",
                    },
                });

                var blanknodesMap = {};

                if (typeof result === "string") {
                    result = JSON.parse(result);
                }

                result.results.bindings.forEach(function (item) {
                    var object;
                    if (item.o.type == "uri") {
                        object = namedNode(item.o.value);
                    } else {
                        object = literal(item.o.value);
                    }

                    if (item.s.value.indexOf("_:b") > -1) {
                        if (!blanknodesMap[item.s.value]) {
                            blanknodesMap[item.s.value] = [];
                        }

                        blanknodesMap[item.s.value].push({
                            predicate: namedNode(item.p.value),
                            object: object,
                        });
                    } else if (item.o.value.indexOf("_:b") > -1) {
                        writer.addQuad(namedNode(item.s.value), namedNode(item.p.value), writer.blank(blanknodesMap[item.o.value]));
                    } else {
                        writer.addQuad(namedNode(item.s.value), namedNode(item.p.value), object);
                    }
                });
                writer.end((error, result) => {
                    result = result.replace(/ a /g, " rdf:type ");
                    callback(null, result);
                });
            });
        },

        uploadOntologyFromOwlFile: function (graphUri, filePath, callback) {
            var triples;
            if (!graphUri || !filePath) {
                return callback("wrong params");
            }
            async.series(
                [
                    // read triples
                    function (callbackSeries) {
                        RDF_IO.rdfXmlToNt(filePath, "File", function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            triples = result;
                            callbackSeries();
                        });
                    },

                    // delete old graph
                    function (callbackSeries) {
                        var queryDeleteGraph = "with <" + graphUri + ">\n" + "delete {\n" + "  ?sub ?pred ?obj .\n" + "} \n" + "where { ?sub ?pred ?obj .}";

                        var params = {query: queryDeleteGraph};

                        httpProxy.post(sparql_server_url, null, params, function (err, result) {
                            if (err) {
                                console.log(err);
                                if (callback) {
                                    return callback(err);
                                }
                            }
                            console.log(result);
                            callbackSeries();
                        });
                    },
                    // create new  graph
                    function (callbackSeries) {
                        var queryCreateGraph = "with <" + graphUri + ">\n" + "insert {\n";
                        queryCreateGraph += triples;

                        queryCreateGraph += "}";
                        console.log(triples);

                        var params = {query: queryCreateGraph};

                        httpProxy.post(sparql_server_url, null, params, function (err, result) {
                            if (err) {
                                console.log(err);
                                return callbackSeries(err);
                            }
                            console.log(result);
                            return callbackSeries(null, result);
                        });
                    },
                ],
                function (err) {
                    callback(err, "done");
                }
            );
        },
        rdfXmlToNt: function (str, sourceType, callback) {
            if (sourceType == "File") {
                str = "" + fs.readFileSync(filePath)
            }
            const textStream = require("streamify-string")(str);
            var triples = "";

            rdfParser
                .parse(textStream, {contentType: "text/turtle", baseIRI: ""})
                .on("data", function (quad) {
                    var objectValue = "<" + quad.object.value + ">";
                    var subjectValue = quad.subject.value;
                    var predicate = quad.predicate.value;

                    if (quad.subject.value.indexOf("n3-") > -1) {
                        subjectValue = "_:b" + quad.subject.value.substring(3) + "";
                    }
                    if (quad.object.value.indexOf("n3-") > -1) {
                        objectValue = "<_:b" + quad.object.value.substring(3) + ">";
                    }
                    if (quad.predicate.value == "http://www.w3.org/2004/02/skos/core#prefLabel") {
                        objectValue = "'" + util.formatStringForTriple(quad.object.value) + "'";
                        predicate = "http://www.w3.org/2000/01/rdf-schema#label";
                    }
                    if (quad.predicate.value == "http://www.w3.org/2000/01/rdf-schema#label") {
                        objectValue = "'" + util.formatStringForTriple(quad.object.value) + "'";
                        predicate = "http://www.w3.org/2000/01/rdf-schema#label";
                    }
                    //  console.log("<" + subjectValue + "> <" + predicate + "> " + objectValue + ".\n")
                    triples += "<" + subjectValue + "> <" + predicate + "> " + objectValue + ".\n";
                })

                .on("error", function (error) {
                    console.error(error);
                    return callback(error);
                })

                .on("end", function () {
                    console.log("All done!");
                    return callback(null, triples);
                });
        },


    }
;

module.exports = RDF_IO;


//test()

