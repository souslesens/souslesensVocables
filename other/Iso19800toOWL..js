var fs = require("fs");
const async = require("async");
var util = require("../bin/util.");
var httpProxy = require("../bin/httpProxy.")
const csvCrawler = require("../bin/_csvCrawler.");
const SPARQLutil = require("../bin/SPARQLutil.")

var Iso19800toOWL = {


    parse: function (sourcePath, callback) {
        var data;
        var headers
        var triples = []
        var triples = []
        var classesMap = {}
        var graphUri = "http://souslesens.org/iso19008/sab/"
        var topClassUri = "http://souslesens.org/iso19008/pbs/Iso_19008_SAB"


        async.series(
            [
                // read csv
                function (callbackSeries) {
                    csvCrawler.readCsv({filePath: sourcePath}, 5000000, function (err, result) {
                        if (err)
                            return callbackseries(err);
                        data = result.data;
                        headers = result.headers;
                        return callbackSeries();
                    });
                },


                function (callbackSeries) {

                    triples.push({
                        subject: topClassUri,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "owl:Class",
                    });

                    triples.push({
                        subject: topClassUri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: "'" + util.formatStringForTriple('Iso_19008_SAB') + "'",
                    });


                    // generates classes
                    data[0].forEach(function (item) {
                        var uri = graphUri + util.formatStringForTriple(item.sABCode, true)
                        classesMap[item.sABCode] = uri

                        triples.push({
                            subject: uri,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "owl:Class",
                        });

                        triples.push({
                            subject: uri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                            object: "'" + util.formatStringForTriple(item.sABName) + "'",
                        });
                        if (item.sABDescription) {
                            triples.push({
                                subject: uri,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                                object: "'" + util.formatStringForTriple(item.sABDescription) + "'",
                            });
                        }

                    })
                    return callbackSeries();
                }
                , function (callbackSeries) {
                var existingCodes = {}
                data[0].forEach(function (item) {
                    //hierarchy

                    if (!existingCodes[item.sABCode]) {
                        existingCodes[item.sABCode] = 1
                        var uri = classesMap[item.sABCode]
                        var parentUri;
                        if (item.sABCode.length == 1)
                            parentUri = topClassUri
                        else {
                            var parentCode = item.sABCode.substring(0, item.sABCode.length - 1)
                            parentUri = classesMap[parentCode]
                        }
                        triples.push({
                            subject: uri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                            object: parentUri
                        })


                    }
                })

                return callbackSeries();
            },
                function (callbackSeries) {
                    SPARQLutil.generateTriples(graphUri, triples, true,function (err, result) {
                        if (err)
                            return console.log(err)
                        console.log(result)
                    })
                }
            ]
            ,

            function (err) {
                if (err)
                    return console.log(err)
                var x = triples
                console.log("DONE")
            }
        )
    }


}
module.exports = Iso19800toOWL

var sourcePath = "D:\\NLP\\ontologies\\19008\\annexeB.csv"
Iso19800toOWL.parse(sourcePath)