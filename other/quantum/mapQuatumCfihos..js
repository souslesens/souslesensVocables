var fs = require('fs');
const async = require('async');
var httpProxy = require('../../bin/httpProxy.')
var util = require('../../bin/skosConverters/util.')
var distinctTags = {};


var mapQuatumCfihos = {


    mapClasses: function () {
        function decapitalize(str) {
            var str2 = "";
            for (var i = 0; i < str.length; i++) {
                var code = str.charCodeAt(i)
                var char = str.charAt(i)
                if (code > 64 && code < 91)
                    str2 += " " + String.fromCharCode(code + 32)
                else
                    str2 += char;
            }

            return str2.trim();
        }

        // var x=  decapitalize("FibreOpticPatchPanelsCabinet")


        var quantumClasses = {}
        async.series([
            function (callbackSeries) {
                var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct *  from <http://data.total.com/resource/GS_EP_DEV/vocab/> where { ?child1 rdfs:subClassOf ?concept. }LIMIT 10000";
                var body = {

                    url: "http://51.178.139.80:8890/sparql",
                    params: {query: query},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    result.results.bindings.forEach(function (item) {
                        var id = item.child1.value
                        var label = id.substring(id.indexOf("#") + 1)
                        label = decapitalize(label)
                        quantumClasses[label] ={quantumId: id,cfihosIds:[]}
                    })
                    callbackSeries()
                })


            },

            function (callbackSeries) {
            var quantumLabels=Object.keys(quantumClasses);
            var slices=util.sliceArray(quantumLabels,10);
            async.eachSeries(slices,function(labels,callbackEach){
                var fitlerStr=""
                labels.forEach(function(label,index){
                    if(index>0)
                        fitlerStr+="|"
                    fitlerStr+="^"+label+"$"
                })
                var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct *  where { " +
                    "?concept rdfs:label ?conceptLabel.  filter ( regex(?conceptLabel, '"+fitlerStr+"','i'))}LIMIT 10000";



                var query2 = encodeURIComponent(query);
                query2 = query2.replace(/%2B/g, "+").trim()

                var body = {


                    url: "http://192.236.179.169/sparql" + "?output=json&format=json&query=" + query2,
                    params: {query: query},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.get(body.url, body, function (err, data) {
                    if(typeof data==="string")
                        data=JSON.parse(data.trim())
                    else if (data.result && typeof data.result != "object")//cas GEMET
                        data = JSON.parse(data.result.trim())

                   data.results.bindings.forEach(function(item){
                        var x=item;
                        var id=item.concept.value;
                        var label=item.conceptLabel.value.toLowerCase();
                        if(!quantumClasses[label])
                           return console.log(label)

                       quantumClasses[label].cfihosIds.push(id);
                    })
                    callbackEach()
                })


            },function(err){
                var x=quantumClasses;
                callbackSeries()
            })

            },

            function (callbackSeries) {
                callbackSeries()
            },


        ], function (err) {
            console.log(JSON.stringify(quantumClasses, null, 2))
        })


    }


}

module.exports = mapQuatumCfihos
mapQuatumCfihos.mapClasses();
