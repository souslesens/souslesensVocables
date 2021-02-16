/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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


var graphUri = "http://www.w3.org/2004/02/skos/core/";
var filePath = "D:\\NLP\\rdfs\\skos.nt"

var graphUri = "https://www2.usgs.gov/science/USGSThesaurus/";
var filePath = "D:\\NLP\\rdfs\\USGSThesaurus.nt"


exportGraph.execute(serverUrl, graphUri, filePath)
