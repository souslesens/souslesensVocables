const async = require('async')
var fs = require('fs')
var httpProxy = require('./httpProxy.')
var util=require("./skosConverters/util.")
var exportGraph = {
    execute: function (serverUrl, graphUri, filePath) {


        var limit = 2000
        var resultSize = 100
        var offset = 0
        var str = ""
        var query = "select * from <" + graphUri + "> where {?s ?p ?o} limit " + limit + " ";
        async.whilst(
            function (callbackTest) {//test
                var w = resultSize > 0;
                callbackTest(null, w)
            },

            function (callbackWhilst) {//iterate

                var query2 = query + " OFFSET " + offset
                var body = {
                    url: serverUrl,
                    params: {query: query2},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    if (err)
                        return callbackWhilst(err);

                    offset += result.results.bindings.length
                    resultSize = result.results.bindings.length

                    result.results.bindings.forEach(function (item) {
                        var value;
                        if(item.o.type=="uri")
                            value="<" + item.o.value + ">"
                        else {
                            value = "'" + util.formatStringForTriple(item.o.value )+ "'"
                            if(item.o["xml:lang"])
                                value +="@"+item.o["xml:lang"]
                        }

                        str += "<"+item.s.value + "> <" + item.p.value + "> "+value+" .\n"
                    })
                    callbackWhilst()
                })


            },

            function (err) {
                if (err)
                    return console.log(err);
                fs.writeFileSync(filePath, str)
            })
    }
}


module.exports = exportGraph

var serverUrl = "http://51.178.139.80:8890/sparql"

var graphUri = "https://www2.usgs.gov/science/USGSThesaurus/";
var filePath = "D:\\NLP\\rdfs\\USGSThesaurus.nt"


    var graphUri = "http://souslesens.org/oil-gas/upstream/";
var filePath = "D:\\NLP\\rdfs\\upstream.nt"


var graphUri = "http://souslesens.org/oil-gas/upstream/";
var filePath = "D:\\NLP\\rdfs\\upstream.nt"

var graphUri = "http://souslesens/thesaurus/ONE-TAXONOMY/";
var filePath = "D:\\NLP\\rdfs\\ONE-TAXONOMY.nt"


var graphUri = "http://resource.geosciml.org/";
var filePath = "D:\\NLP\\rdfs\\geosciml.nt"



exportGraph.execute(serverUrl, graphUri, filePath)
