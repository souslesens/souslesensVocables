var fs = require('fs');
const async = require('async');
var httpProxy = require('../../bin/httpProxy.')
var util = require('../../bin/skosConverters/util.')
var distinctTags = {};


var mapQuatumCfihos = {


    mapClasses: function (sourceConfig, targetConfig,callback) {
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


        var sourceClasses = {}
        async.series([
            function (callbackSeries) {
                var query =sourceConfig.query;
                var body = {
                    url: sourceConfig.sparql_url,
                    params: {query: query},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    result.results.bindings.forEach(function (item) {
                        var id = item.concept.value
                        var label =item.label.value ;  //id.substring(id.indexOf("#") + 1)
                        if(sourceConfig.labelProcessor)
                        label = sourceConfig.labelProcessor(label)
                        sourceClasses[label] = {sourceId: id, targetIds: []}
                    })
                    callbackSeries()
                })


            },

            function (callbackSeries) {
                var quantumLabels = Object.keys(sourceClasses);
                var slices = util.sliceArray(quantumLabels, 100);
                async.eachSeries(slices, function (labels, callbackEach) {
                    var fitlerStr = ""
                    labels.forEach(function (label, index) {
                        if (index > 0)
                            fitlerStr += "|"
                        fitlerStr += "^" + label + "$"
                    })
                    var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct *  where { " +
                        "?concept rdfs:label ?conceptLabel.  filter ( regex(?conceptLabel, '" + fitlerStr + "','i'))}LIMIT 10000";


                    var query2 = encodeURIComponent(query);
                    query2 = query2.replace(/%2B/g, "+").trim()

                    var body = {


                        url: targetConfig.sparql_url + "?output=json&format=json&query=" + query2,
                        params: {query: query},
                        headers: {
                            "Accept": "application/sparql-results+json",
                            "Content-Type": "application/x-www-form-urlencoded"

                        }
                    }
                    httpProxy.get(body.url, body, function (err, data) {
                        if (typeof data === "string")
                            data = JSON.parse(data.trim())
                        else if (data.result && typeof data.result != "object")//cas GEMET
                            data = JSON.parse(data.result.trim())

                        data.results.bindings.forEach(function (item) {
                            var x = item;
                            var id = item.concept.value;
                            var label = item.conceptLabel.value.toLowerCase();
                            if (!sourceClasses[label])
                                return console.log(label)

                            sourceClasses[label].targetIds.push(id);
                        })
                        callbackEach()
                    })


                }, function (err) {
                    var x = sourceClasses;
                    callbackSeries()
                })

            },

            function (callbackSeries) {
                callbackSeries()
            },


        ], function (err) {
            callback(null,sourceClasses);
         //   console.log(JSON.stringify(sourceClasses, null, 2))
        })


    }
    , writeMappings: function (json,filePath) {

    //    var json = JSON.parse(fs.readFileSync(filePath));
        var triples = ""
        for (var key in json) {
            var item = json[key]
            item.targetIds.forEach(function (targetId) {
                triples += "<" + item.sourceId + "> <http://www.w3.org/2002/07/owl#sameAs> <" + targetId + ">.\n"
            })


        }
        fs.writeFileSync(filePath.replace(".json", "nt"), triples)

    }


}

var sourceConfig = {
    query: "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct * " +
        " from <http://standards.iso.org/iso/15926/part4/>" +
        " where { ?concept rdfs:label ?label. }LIMIT 10000",
    sparql_url: "http://51.178.139.80:8890/sparql",
    labelProcessor: null,
    filePath : "D:\\NLP\\ontologies\\quantum\\mappingPart4_PCS.nt"
}

var targetConfig = {

    sparql_url: "http://staging.data.posccaesar.org/rdl/",
    labelProcessor: null
}

if(true) {
    module.exports = mapQuatumCfihos;


    mapQuatumCfihos.mapClasses(sourceConfig,targetConfig,function(err,sourceClasses ){
        mapQuatumCfihos.writeMappings(sourceClasses,sourceConfig.filePath)
    });

}if(false){
    var filePath = "D:\\NLP\\ontologies\\quantum\\mappingPart4_PCS.json";
    mapQuatumCfihos.writeMappings(filePath)
}




//mapQuatumCfihos.writeMappings()
