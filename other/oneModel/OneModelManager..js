const httpProxy = require("../../bin/httpProxy.");
const rdfParser = require("rdf-parse").default;
var fs = require("fs");
var path = require("path");
const async = require("async");
var util = require("../../bin/util.");
const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
var graphUrisMap = {};

var sparql_server_url = "http://51.178.139.80:8890/sparql";

var OneModelManager = {
    getGraphUri: function (sourceLabel) {
        if (graphUrisMap[sourceLabel]) return graphUrisMap[sourceLabel];
        //"D:\\GitHub\\souslesensVocables\\public\\vocables\\config"
        var sourcesFilePath = path.join(__dirname, "../../public/vocables/config/sources.json");
        sourcesFilePath = path.resolve(sourcesFilePath);
        try {
            var str = fs.readFileSync(sourcesFilePath);
            var sources = JSON.parse(str);
            if (!sources[sourceLabel]) return "no source matching";
            if (Array.isArray(sources[sourceLabel].graphUri))
                return sources[sourceLabel].graphUri[0];
            return sources[sourceLabel].graphUri;
        } catch (e) {
            return e;
        }
    },

    getOntology: function (sourceLabel, callback) {
        var graphUri = OneModelManager.getGraphUri(sourceLabel);
        if (graphUri.indexOf("http") != 0)
            return callback(null, "ERROR reading graphUri :" + sourceLabel + "  " + graphUri);

        var query = "select  ?s ?p ?o  from <" + graphUri + ">  WHERE { ?s ?p ?o  } order by ?s";
        var params = { query: query };

        httpProxy.post(sparql_server_url, null, params, function (err, result) {
            if (err) {
                return callback(err);
            }

            var writer = new N3.Writer({
                prefixes: {
                    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
                    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                    owl: "http://www.w3.org/2002/07/owl#",
                    part14: "http://standards.iso.org/iso/15926/part14/",
                    one: "http://data.total.com/resource/one-model/ontology/",
                    readi: "http://w3id.org/readi/z018-rdl/",
                },
            });

            var blanknodesMap = {};

            result.results.bindings.forEach(function (item) {
                var object;
                if (item.o.type == "uri") object = namedNode(item.o.value);
                else object = literal(item.o.value);

                if (item.s.value.indexOf("_:b") > -1) {
                    if (!blanknodesMap[item.s.value]) blanknodesMap[item.s.value] = [];

                    blanknodesMap[item.s.value].push({
                        predicate: namedNode(item.p.value),
                        object: object,
                    });
                } else if (item.o.value.indexOf("_:b") > -1) {
                    writer.addQuad(
                        namedNode(item.s.value),
                        namedNode(item.p.value),
                        writer.blank(blanknodesMap[item.o.value])
                    );
                } else {
                    writer.addQuad(namedNode(item.s.value), namedNode(item.p.value), object);
                }
            });
            writer.end((error, result) => {
                result = result.replace(/ a /g, " rdf:type ");
                callback(null, result);
                //  console.log(result)
            });
        });
    },

    uploadOntologyFromOwlFile: function (graphUri, filePath, callback) {
        var triples;
        if (!graphUri || !filePath) return callback("wrong params");
        async.series(
            [
                // read triples
                function (callbackSeries) {
                    OneModelManager.rdfXmlToNt(filePath, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        triples = result;
                        callbackSeries();
                    });
                },

                // delete old graph
                function (callbackSeries) {
                    var queryDeleteGraph =
                        "with <" +
                        graphUri +
                        ">\n" +
                        "delete {\n" +
                        "  ?sub ?pred ?obj .\n" +
                        "} \n" +
                        "where { ?sub ?pred ?obj .}";

                    var params = { query: queryDeleteGraph };

                    httpProxy.post(sparql_server_url, null, params, function (err, result) {
                        if (err) {
                            console.log(err);
                            if (callback) return callback(err);
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

                    var params = { query: queryCreateGraph };

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
    rdfXmlToNt: function (filePath, callback) {
        const textStream = require("streamify-string")("" + fs.readFileSync(filePath));
        var triples = "";

        rdfParser
            .parse(textStream, { contentType: "text/turtle", baseIRI: "" })
            .on("data", function (quad) {
                if (!quad) var x = 3;
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
};

module.exports = OneModelManager;

//OneModelManager.uploadOntologyFromOwlFile("http://data.total.com/resource/one-model/ontology/0.2/","D:\\NLP\\ontologies\\ONE MODEL\\TOTAL_OneModel4.ttl2.owl")
//OneModelManager.uploadOntologyFromOwlFile("http://data.total.com/resource/sil/ontology/0.1/","D:\\NLP\\ontologies\\OntoSIL\\SIL.owl-ttl.owl")

//OneModelManager.getOntology("http://data.total.com/resource/one-model/ontology/0.2/> from <http://standards.iso.org/iso/15926/part14/",function(err, result){
/*OneModelManager.getOntology("http://data.total.com/resource/one-model/ontology/0.2/", function (err, result) {

})*/
//OneModelManager.getGraphUri("ISO_15926-part-14")
