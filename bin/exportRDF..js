var fs = require('fs')
var httpProxy = require('./httpProxy.')
var async = require('async')
var exportRDF = {

    export: function (sparql_url, graphUri, filePath) {

        var fromStr = "";
        if (graphUri)
            fromStr = " FROM <" + graphUri + "> "
        var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct * " +
            fromStr +
            " where { ?subject ?predicate ?object.}"


        exportRDF.POST_cursor(sparql_url, query, function (err, result) {
            if (err)
                return console.log(err);
            var str = ""

            result.sort(function(a,b){
                if(a.subject.value>b.subject.value)
                    return 1
                if(a.subject.value<b.subject.value)
                    return -1
                return 0
            })

            result.forEach(function (item) {
                var objectStr = ""
                if (item.object.type != "uri") {
                    objectStr = "'" + item.object.value + "'"
                    if (item.object.lang)
                        objectStr += "@" + item.object.lang
                }
                else{
                    objectStr ="<"+item.object.value+">"
                }

                str += "<" + item.subject.value + "> <" + item.predicate.value+"> "+objectStr+".\n"
            })
            fs.writeFileSync(filePath,str)
        })

    }
    , POST_cursor: function (url, query, callback) {
        var offset = 0;
        var limit = 5000;
        var resultSize = 1;
        var allData = []

        var p = query.toLowerCase().indexOf("limit")
        if (p > -1)
            var query = query.substring(0, p)
        query += " LIMIT " + limit;


        async.whilst(
            function (callbackTest) {//test
                return (callbackTest(null, resultSize > 0));
            },
            function (callbackWhilst) {//iterate

                var queryCursor = query + " OFFSET " + offset


                var body = {
                    params: {query: queryCursor},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.post(url, body.headers, body.params, function (err, data) {
                    if (err)
                        return callbackWhilst(err);
                    var xx = data;
                    resultSize = data.results.bindings.length
                    allData = allData.concat(data.results.bindings);
                    offset += limit;
                    callbackWhilst(null, data);

                })

            }, function (err) {
                callback(err, allData)
            }
        )
    }


}
module.exports = exportRDF
var graphUri = "http://data.total.com/quantum/vocab/";
var sparql_url = "http://51.178.139.80:8890/sparql";
var filePath = "D:\\NLP\\ontologies\\quantum\\export.nt"
exportRDF.export(sparql_url, graphUri, filePath)
