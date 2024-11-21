const httpProxy = require("./httpProxy.");
const rdfParser = require("rdf-parse").default;
var fs = require("fs");
var path = require("path");
const async = require("async");
var util = require("./util.");
const N3 = require("n3");
const {DataFactory} = N3;
const {namedNode, literal} = DataFactory;
var graphUrisMap = {};

var sparql_server_url = "";

var RDF_IO = {
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

        instantiateShacl: function (str, sourceType, callback) {
            if (sourceType == "File") {
                str = "" + fs.readFileSync(filePath)
            }
            const textStream = require("streamify-string")(str);
            var triples = [];

            var prefixMap = {}
            async.series([

                function (callbackSeries) {
                    rdfParser.parse(textStream, {contentType: "text/turtle", baseIRI: ""})
                        .on("data", function (quad) {
                            var obj = {
                                o: quad.object.value,
                                s: quad.subject.value,
                                p: quad.predicate.value,
                            }
                            triples.push(obj)
                        })
                        .on('prefix', (prefix, iri) => {
                            console.log(prefix + ':' + iri)
                        })
                        .on("error", function (error) {
                            console.error(error);
                            return callbackSeries(error);
                        })

                        .on("end", function () {
                            console.log("All done!");
                            return callbackSeries(null, triples);
                        });
                },


                function (callbackSeries) {
                    var nodes = {}
                    var edges = []

                    triples.forEach(function (triple) {
                        if (triple.o == "http://www.w3.org/ns/shacl#NodeShape") {
                            nodes[triple.s] = {predicates:{}}
                        }
                        if (triple.o == "http://www.w3.org/ns/shacl#path") {
                            nodes[triple.s].predicates[tr]
                        }
                        if (triple.o == "http://www.w3.org/ns/shacl#node") {
                            nodes[triple.s].properties={}
                        }


                    })


                }


            ], function (err) {


                return callback(err)
            })


        }
    }
;

module.exports = RDF_IO;


var test = function () {

    var str = "<http://ex.org/s> <http://ex.org/p> <http://ex.org/o1>, <http://ex.org/o2>.`);\n"

    var str = "@prefix cfihos: <http://w3id.org/readi/rdl/>.\n" +
        "@prefix ido: <http://rds.posccaesar.org/ontology/lis14/rdl/>.\n" +
        "@prefix dash: <http://datashapes.org/dash#>.\n" +
        "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.\n" +
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n" +
        "@prefix sh: <http://www.w3.org/ns/shacl#>.\n" +
        "@prefix dexp: <http://tsf/resources/ontology/DEXPIProcess_gfi_2/specific/>.\n" +
        "@prefix ns7: <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>.\n" +
        "\n" +
        "ns7:MaterialPortIn\n" +
        "    a sh:NodeShape ;\n" +
        "  sh:property [\n" +
        " sh:path ns7:flowsIn ;\n" +
        "        sh:node ns7:Stream ;].\n" +
        "\n" +
        "ns7:MaterialPortOut\n" +
        "    a sh:NodeShape ;\n" +
        "  sh:property [\n" +
        " sh:path ido:directlyConnectedTo ;\n" +
        "        sh:node ns7:MaterialProcessConnection ;];\n" +
        "  sh:property [\n" +
        " sh:path ns7:flowsOut ;\n" +
        "        sh:node ns7:Stream ;].\n" +
        "\n" +
        "ns7:TransportingFluidsInChannelProcess\n" +
        "    a sh:NodeShape ;\n" +
        "  sh:property [\n" +
        " sh:path ido:hasPrimaryParticipant ;\n" +
        "        sh:node ns7:TransportingFluidsInChannel ;].\n" +
        "\n" +
        "ns7:TransportingFluidsInChannel\n" +
        "    a sh:NodeShape ;\n" +
        "  sh:property [\n" +
        " sh:path ido:hasPhysicalQuantity ;\n" +
        "        sh:node ns7:Width ;];\n" +
        "  sh:property [\n" +
        " sh:path ns7:hasPortIn ;\n" +
        "        sh:node ns7:MaterialPortIn ;];\n" +
        "  sh:property [\n" +
        " sh:path ido:hasPhysicalQuantity ;\n" +
        "        sh:node ns7:Depth ;];\n" +
        "  sh:property [\n" +
        " sh:path ns7:hasPortOut ;\n" +
        "        sh:node ns7:MaterialPortOut ;].\n" +
        "\n" +
        "ns7:MaterialProcessConnection\n" +
        "    a sh:NodeShape ;\n" +
        "  sh:property [\n" +
        " sh:path ido:contains ;\n" +
        "        sh:node ns7:Stream ;];\n" +
        "  sh:property [\n" +
        " sh:path ido:directlyConnectedTo ;\n" +
        "        sh:node ns7:MaterialPortIn ;].\n"

    RDF_IO.instantiateShacl(str, "String")
}
test()

