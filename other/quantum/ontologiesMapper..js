var fs = require('fs');
const async = require('async');
var httpProxy = require('../../bin/httpProxy.')
var util = require('../../bin/skosConverters/util.')
var distinctTags = {};


var ontologiesMapper = {


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
                        var label =item.label.value.toLowerCase() ;  //id.substring(id.indexOf("#") + 1)
                        if(sourceConfig.labelProcessor)
                        label = sourceConfig.labelProcessor(label)
                        sourceClasses[label] = {sourceId: id, targetIds: [],targetLabels:[]}
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
                      if(label.indexOf("\\")>-1)
                        var x="3"
                        if (index > 0)
                            fitlerStr += "|"
                        fitlerStr += "^" + label.replace(/\\/g,"")+ "$"
                    })
                    var fromStr=""
                    if(targetConfig.graphUri)
                        fromStr=" from <"+targetConfig.graphUri+"> "
                    var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct *  "+
                        fromStr+"where { " +
                        "?concept rdfs:label ?conceptLabel.  filter ( regex(?conceptLabel, '" + fitlerStr + "','i'))}LIMIT 10000";




                    if(targetConfig.  method=="POST"){

                          var params={query: query};
                        var headers={
                            "Accept": "application/sparql-results+json",
                                "Content-Type": "application/x-www-form-urlencoded"

                        }



                        httpProxy.post( targetConfig.sparql_url + "?output=json&format=json&query=", headers,params, function (err, data) {
                            if(err)
                                return callbackEach(err)
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
                                sourceClasses[label].targetLabels.push(item.conceptLabel.value);
                            })

                            callbackEach()

                        })



                    }else if (targetConfig.  method=="GET"){
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
                                sourceClasses[label].targetLabels.push(item.conceptLabel.value);
                            })

                            callbackEach()

                        })
                    }


                }, function (err) {

                    var x = sourceClasses;
                    callbackSeries(err)
                })

            },

            function (callbackSeries) {
                callbackSeries()
            },


        ], function (err) {

            callback(err,sourceClasses);
         //   console.log(JSON.stringify(sourceClasses, null, 2))
        })


    }
    , writeMappings: function (json,filePath) {

    //    var json = JSON.parse(fs.readFileSync(filePath));
        var triples = ""
        var str=""
        for (var key in json) {
            var item = json[key]
            item.targetIds.forEach(function (targetId,index) {
                triples += "<" + item.sourceId + "> <http://www.w3.org/2002/07/owl#sameAs> <" + targetId + ">.\n"
                str+=item.sourceId + key+"\t"+targetId+"\t"+ item.targetLabels[index]+"\n"
            })


        }
        var x=str
        fs.writeFileSync(filePath.replace(".json", "nt"), triples)

    }


}





var sourceConfig = {
    query: "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct * " +
        " from <http://data.total.com/quantum/vocab/>" +
        " where { ?concept rdfs:label ?label." +
      //  "?concept <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.15926.org/dm/Property>" +
        " }LIMIT 10000",
    sparql_url: "http://51.178.139.80:8890/sparql",
    labelProcessor: null,
    filePath : "D:\\NLP\\ontologies\\quantum\\mappingQuantum_Part4.nt"
}

var targetConfig = {

    // sparql_url: "http://staging.data.posccaesar.org/rdl/",
    sparql_url: "http://data.15926.org/cfihos",
   // graphUri: "http://standards.iso.org/iso/15926/part4/",
    //sparql_url: "http://51.178.139.80:8890/sparql",
    labelProcessor: null,
    method:"GET"
}

if(true) {
    module.exports = mapQuatumCfihos;


    mapQuatumCfihos.mapClasses(sourceConfig,targetConfig,function(err,sourceClasses ){
        if(err)
            return console.log(err);
        mapQuatumCfihos.writeMappings(sourceClasses,sourceConfig.filePath)
    });

}if(false){
    var filePath = "D:\\NLP\\ontologies\\quantum\\mappingPart4_PCS.json";
    mapQuatumCfihos.writeMappings(filePath)
}




//mapQuatumCfihos.writeMappings()
