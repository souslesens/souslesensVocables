const httpProxy = require("../../bin/httpProxy.")
const rdfParser = require("rdf-parse").default;
const fs = require('fs')
const async = require("async")


var sparql_server_url = "http://51.178.139.80:8890/sparql"

var OneModelManager = {

    refreshOntology: function (graphUri, filePath, callback) {
        var triples
        async.series([
            // read triples
            function (callbackSeries) {
                OneModelManager.rdfXmlToNt(filePath, function (err, result) {
                    if (err) {
                        return callbackSeries(err);
                    }
                    triples = result
                    callbackSeries()
                })

            },

            // delete old graph
            function (callbackSeries) {
                var queryDeleteGraph = "with <" + graphUri + ">\n" +
                    "delete {\n" +
                    "  ?sub ?pred ?obj .\n" +
                    "} \n" +
                    "where { ?sub ?pred ?obj .}"

                var params = {query: queryDeleteGraph}

                httpProxy.post(sparql_server_url, null, params, function (err, result) {
                    if (err) {
                        console.log(err)
                        if (callback)
                            return callback(err);
                    }
                    console.log(result)
                    callbackSeries()
                })
            },
            // create new  graph
            function (callbackSeries) {
                var queryCreateGraph = "with <" + graphUri + ">\n" +
                    "insert {\n"
                queryCreateGraph += triples;

                queryCreateGraph += "}"


                var params = {query: queryCreateGraph}

                httpProxy.post(sparql_server_url, null, params, function (err, result) {
                    if (err) {
                        console.log(err)
                        return callbackSeries(err);
                    }
                    console.log(result)
                    return callbackSeries(null, result)
                })

            }


        ], function (err) {

            if (err) {

            }

        })


    },

    rdfXmlToNt: function (filePath, callback) {
        const textStream = require('streamify-string')("" + fs.readFileSync(filePath));
        var triples = "";


        rdfParser.parse(textStream, {contentType: 'text/turtle', baseIRI: ''})
            .on('data', function (quad) {
                if (!quad)
                    var x = 3;
                var objectValue = "<" + quad.object.value + ">"
                var subjectValue = quad.subject.value;
                var predicate = quad.predicate.value

                if (quad.subject.value.indexOf("n3-") > -1) {
                    subjectValue = "_:b" + quad.subject.value.substring(3) + ""
                }
                if (quad.object.value.indexOf("n3-") > -1) {
                    objectValue = "<_:b" + quad.object.value.substring(3) + ">"
                }
                if (quad.predicate.value == "http://www.w3.org/2004/02/skos/core#prefLabel") {
                    objectValue = "'" + quad.object.value + "'"
                    predicate = "http://www.w3.org/2000/01/rdf-schema#label"
                }
                if (quad.predicate.value == "http://www.w3.org/2000/01/rdf-schema#label") {
                    objectValue = "'" + quad.object.value + "'"
                    predicate = "http://www.w3.org/2000/01/rdf-schema#label"
                }
              //  console.log("<" + subjectValue + "> <" + predicate + "> " + objectValue + ".\n")
                triples += "<" + subjectValue + "> <" + predicate + "> " + objectValue + ".\n"
            })


            .on('error', function (error) {
                console.error(error)
                return callback(error)
            })

            .on('end', function () {
                console.log('All done!')
                return callback(null, triples)

            });


    }


}

module.exports = OneModelManager;

OneModelManager.refreshOntology("http://data.total.com/resource/one-model/ontology/0.2/","D:\\NLP\\ontologies\\ONE MODEL\\TOTAL_OneModel4.ttl2.owl")

//OneModelManager.rdfXmlToNt("D:\\NLP\\ontologies\\ONE MODEL\\TOTAL_OneModel4.ttl2.owl")
