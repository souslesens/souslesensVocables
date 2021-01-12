var fs = require('fs');
const async = require('async');
var httpProxy = require('../../bin/httpProxy.')
var util = require('../../bin/skosConverters/util.')
var distinctTags = {};


var ontologiesMapper = {


    loadCsvFile: function (file, sep) {


        var str = "" + fs.readFileSync(file);
        var lines = str.split("\n")

        var headers = lines[0].trim().split(sep)


        var jsonArray = []
        lines.forEach(function (line) {
            var values = line.trim().split(sep)
            if (values.length > headers.length)
                return "error"
            var obj = {}
            values.forEach(function (value, index) {
                obj[headers[index]] = value
            })
            jsonArray.push(obj)


        })
        return {headers: headers, data: jsonArray}

    },


    mapClasses: function (sourceConfig, targetConfigs, callback) {
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


            //************************************* query sparql source*************************
            function (callbackSeries) {
                if (sourceConfig.type != "sparql")
                    return callbackSeries();
                var query = sourceConfig.query;
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
                        var label = item.label.value.toLowerCase();  //id.substring(id.indexOf("#") + 1)
                        if (sourceConfig.labelProcessor)
                            label = sourceConfig.labelProcessor(label)
                        sourceClasses[label] = {sourceId: id, targetIds: [], targetLabels: []}
                    })
                    callbackSeries()
                })


            },
            function (callbackSeries) {
                if (sourceConfig.type != "jsonMap")
                    return callbackSeries();
                var data = JSON.parse(fs.readFileSync(sourceConfig.filePath))
                var tableData = data[sourceConfig.table]
                if (!tableData)
                    return callbackSeries("no key " + sourceConfig.table)
                var labels =
                    tableData.forEach(function (item) {
                        var label = item[sourceConfig.labelKey].trim().toLowerCase()
                        var id = item[sourceConfig.idKey]
                        sourceClasses[label] = {sourceId: id, sourceLabel: item[sourceConfig.labelKey].trim(),targets:{}}
                        targetConfigs.forEach(function(target){
                            sourceClasses[label].targets[target.name]=[]
                        })

                    })
                return callbackSeries()


            },
            //************************************* slice labels and get same labels in target*************************
            function (callbackSeries) {
                var quantumLabels = Object.keys(sourceClasses);
                var slices = util.sliceArray(quantumLabels, 100);






                async.eachSeries(targetConfigs, function (targetConfig, callbackEachSource) {
                    console.log("processing target source " + targetConfig.name)
                    async.eachSeries(slices, function (labels, callbackEachSlice) {




                            var fitlerStr = ""
                            labels.forEach(function (label, index) {
                                if (label.indexOf("\\") > -1)
                                    var x = "3"
                                if (index > 0)
                                    fitlerStr += "|"
                                fitlerStr += "^" + label.replace(/\\/g, "") + "$"
                            })


                            var fromStr = ""
                            if (targetConfig.graphUri)
                                fromStr = " from <" + targetConfig.graphUri + "> "
                            var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct *  " +
                                fromStr + "where { " +
                                "?concept rdfs:label ?conceptLabel.  filter ( regex(?conceptLabel, '" + fitlerStr + "','i'))}LIMIT 10000";


                            function setTargetValues(source,bindings){
                                bindings.forEach(function (item) {
                                    var x = item;
                                    var id = item.concept.value;
                                    var label = item.conceptLabel.value.toLowerCase();
                                    if (!sourceClasses[label])
                                        return console.log(label)

                                    sourceClasses[label].targets[source].push({id:id,label:item.conceptLabel.value});

                                })
                            }


                            if (!targetConfig.sparql_server.method || targetConfig.sparql_server.method == "POST") {

                                var params = {query: query};
                                var headers = {
                                    "Accept": "application/sparql-results+json",
                                    "Content-Type": "application/x-www-form-urlencoded"

                                }


                                httpProxy.post(targetConfig.sparql_server.url + "?output=json&format=json&query=", headers, params, function (err, data) {
                                    if (err)
                                        return callbackEachSlice(err)
                                    if (typeof data === "string")
                                        data = JSON.parse(data.trim())
                                    else if (data.result && typeof data.result != "object")//cas GEMET
                                        data = JSON.parse(data.result.trim())

                                    setTargetValues(targetConfig.name,data.results.bindings)

                                    callbackEachSlice()

                                })


                            } else if (targetConfig.sparql_server.method == "GET") {
                                var query2 = encodeURIComponent(query);
                                query2 = query2.replace(/%2B/g, "+").trim()

                                var body = {
                                    url: targetConfig.sparql_server.url + "?output=json&format=json&query=" + query2,
                                    params: {query: query},
                                    headers: {
                                        "Accept": "application/sparql-results+json",
                                        "Content-Type": "application/x-www-form-urlencoded"

                                    }
                                }
                                httpProxy.get(body.url, body, function (err, data) {
                                    if(err)
                                        return callbackEachSlice(err)
                                    if (typeof data === "string")
                                        data = JSON.parse(data.trim())
                                    else if (data.result && typeof data.result != "object")//cas GEMET
                                        data = JSON.parse(data.result.trim())
                                    setTargetValues(targetConfig.name,data.results.bindings)

                                    callbackEachSlice()

                                })
                            }
                        }
                        , function (err) {

                            callbackEachSource(err)

                        })
                }, function (err) {

                    callbackSeries()


                })
            }



        ], function (err) {

            callback(err, sourceClasses);
            //   console.log(JSON.stringify(sourceClasses, null, 2))
        })


    }
    , writeMappings: function (sources, table, json, filePath,) {

        //    var json = JSON.parse(fs.readFileSync(filePath));
        var triples = ""
        var str = ""
        var orphans = ''
        orphans +="QuantumId" + "\tQuantumLabel"
        sources.forEach(function(source) {
            orphans +="\t"+source.name;
        })
        orphans +="\n"
        for (var key in json) {

            var item = json[key]
            orphans += item.sourceId + "\t" + item.sourceLabel + "\t"
          sources.forEach(function(source,indexSource) {
              var orphansMatch = "-"
              if (item.targets[source.name].length == 0) {
                  orphans += orphansMatch + "\t"
              } else {


                  item.targets[source.name].forEach(function (target, index) {
                      triples += "<http://data.total.com/resource/quantum/" + item.sourceId + "> <http://data.total.com/resource/quantum/mappings/" + source.name + "#sameAs> <" + target.id + ">.\n"
                      str += item.sourceId + key + "\t" + target.id + "\t" + item.label + "\n"
                      if (index > 0)
                          orphans += "|"
                      orphans += target.id + ""
                  })
                  orphans += "\t"
              }
          })
            orphans +="\n"



        }

        fs.writeFileSync(filePath.replace(".json", "_" + table + ".nt"), triples)
        fs.writeFileSync(filePath.replace(".json", "_" + table + "_orphans.txt"), orphans)


    }
    , extractlabelsFromJsonData: function (filePath) {

        var json = JSON.parse(fs.readFileSync(filePath));
        var str = ""
        for (var table in json) {

            json[table].forEach(function (item) {
                for (var key in item) {
                    if (key.toLowerCase().indexOf("name") > -1) {
                        str += table + "\t" + key + "\t" + item[key] + "\n"
                    }
                }

            })
        }
        fs.writeFileSync(filePath.replace(".json", "Labels.txt"), str)


    }

    , extractMappingsFromMDM: function () {
        var totalFields = [
            "FunctionalClassID",
            "PhysicalClassID",
            "AttributeID",
            "AttributePickListValueID",
            "AttributeID2",
            "AttributePickListValueID2",
            "PickListValueGroupingID",
            "UnitOfMeasureID",
            "UnitOfMeasureDimensionID",
            "DisciplineID",
            "DocumentTypeID",
            "DisciplineDocumentTypeID",
            "FunctionalClassToPhysicalClassID",
            "FunctionalClassToAttributeID",
            "PhysicalClassToAttributeID",
            "FunctionalClassToDisciplineDocumentTypeID",
            "PhysicalClassToDisciplineDocumentTypeID"
        ]

        var json = JSON.parse(fs.readFileSync(filePath))
        var data = json["tblMappingSource"];

        var triples = "";
        data.forEach(function (item) {
            var sourceCode = item["SourceCode"]
            if (sourceCode && sourceCode.indexOf("CFIHOS") < 0)
                return
            totalFields.forEach(function (field) {

                if (item[field] && item[field] != "") {
                    var cfhosArrray = sourceCode.split("|")
                    cfhosArrray.forEach(function (code, indexCode) {
                        code = code.replace("CFIHOS-", "")
                        triples += "<http://data.total.com/resource/quantum/" + item[field] + ">  <http://data.total.com/resource/quantum/mappings#mappingSourceCode" + (indexCode + 1) + "> <http://data.15926.org/cfihos/" + code + ">.\n"
                    })
                }


            })
        })

        fs.writeFileSync(filePath.replace(".json", "mappingCFIHOS.nt"), triples)

    }
    ,

    generateMDMtablesMappings: function (filePath) {
        var json = ontologiesMapper.loadCsvFile(filePath, "\t")


        var sources = json.headers.slice(2)
        var triples = ""
        var sourcesMap = ""
        triples += " <http://data.total.com/resource/quantum/model/table/> <http://www.w3.org/2000/01/rdf-schema#label> 'TABLE'.\n"
        triples += " <http://data.total.com/resource/quantum/model/table/> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.total.com/resource/quantum/model/>.\n"

        json.data.forEach(function (item) {
            if (item.type != "mainObj")
                return;
            triples += "  <http://data.total.com/resource/quantum/model/table/" + item["QuantumTable"] + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.total.com/resource/quantum/model/table/> .\n"

            triples += "  <http://data.total.com/resource/quantum/model/table/" + item["QuantumTable"] + "> <http://www.w3.org/2000/01/rdf-schema#label> '" + item["QuantumTable"] + "'.\n"


            sources.forEach(function (source) {
                if (item[source] && item[source] != "") {

                    triples += "<" + item[source] + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf>  <http://data.total.com/resource/quantum/model/table/" + item["QuantumTable"] + ">.\n"
                    triples += "<http://data.total.com/resource/quantum/model/table/" + item["QuantumTable"] + "> <http://data.total.com/resource/quantum/model/mapping#" + source + "> <" + item[source] + ">.\n"
                    sourcesMap += "'" + item[source] + "': '" + source + "',\n"

                }

            })
        })
        console.log(sourcesMap)


    }


}
module.exports = ontologiesMapper;


var sourceConfig = {
    type: "sparql",
    query: "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct * " +
        " from <http://data.total.com/quantum/vocab/>" +
        " where { ?concept rdfs:label ?label." +
        //  "?concept <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.15926.org/dm/Property>" +
        " }LIMIT 10000",
    sparql_url: "http://51.178.139.80:8890/sparql",
    labelProcessor: null,
    filePath: "D:\\NLP\\ontologies\\quantum\\mappingQuantum_Part4.nt"
}


var targetConfig = {

    // sparql_url: "http://staging.data.posccaesar.org/rdl/",
    "sparql_server": {url: "http://data.15926.org/cfihos"},
    // graphUri: "http://standards.iso.org/iso/15926/part4/",
    //sparql_url: "http://51.178.139.80:8890/sparql",
    labelProcessor: null,
    method: "GET"
}

if (true) {
    var sourceConfig = {
        type: "jsonMap",
        filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json",
      table: "tblPhysicalClass",
       // table: "tblFunctionalClass",
       // table: "tblAttribute",
       // table: "tblDiscipline",
     // table: "tblTag",


        labelKey: "Name",
        idKey: "ID"
    }

    var targetConfigs = [{
        name: "CFIHOS_READI",
        "graphUri": "http://w3id.org/readi/rdl/",
        "sparql_server": {
            "url": "http://51.178.139.80:8890/sparql"
        },
        "controller": "Sparql_OWL",
        "topClassFilter": " ?topConcept rdfs:subClassOf <http://standards.iso.org/iso/15926/part14/InanimatePhysicalObject>",
        "schemaType": "OWL",
        "schema": null,
        "color": "#bcbd22",
    },
        {
            name: "ISO_15926-part-14",
            "graphUri": "http://standards.iso.org/iso/15926/part14/",
            "sparql_server": {
                "url": "http://51.178.139.80:8890/sparql"
            },
            "controller": "Sparql_OWL",
            "topClassFilter": "?topConcept rdfs:subClassOf <http://www.w3.org/2002/07/owl#Thing>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
        },

        {
            name: "ISO_15926-PCA",
            "graphUri": "",
            "sparql_server": {
                "url": "http://staging.data.posccaesar.org/rdl/",
                "method": "GET"
            },
            "controller": "Sparql_OWL",
            "topClassFilter": "?topConcept rdfs:subClassOf <http://data.posccaesar.org/dm/Thing>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
        }, {
            name: "CFIHOS-ISO",
            "graphUri": "",
            "sparql_server": {
                "url": "http://data.15926.org/cfihos",
                "method": "GET"
            },
            "controller": "Sparql_OWL",
            "topClassFilter": "  ?topConcept rdfs:subClassOf <http://data.15926.org/dm/Thing>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
        },
        {
            name: "CFIHOS_equipment",
            "graphUri": "http://w3id.org/readi/ontology/CFIHOS-equipment/0.1/",
            "sparql_server": {
                "url": "http://51.178.139.80:8890/sparql"
            },
            "controller": "Sparql_OWL",
            "topClassFilter": " ?topConcept rdfs:subClassOf <http://standards.iso.org/iso/15926/part14/InanimatePhysicalObject>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
        },
    ]



    ontologiesMapper.mapClasses(sourceConfig, targetConfigs, function (err, sourceClasses) {
        if (err)
            return console.log(err);
        ontologiesMapper.writeMappings(
          targetConfigs,
            sourceConfig.table,
            sourceClasses,
            sourceConfig.filePath.replace(".json", "_mappings.json"))
    });

}


if (false) {
    var filePath = "D:\\NLP\\ontologies\\quantum\\MDM Rev 4 SQL export_03122020.json";
    var filePath = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS RDL\\Reference Data Library\\CFIHOS - Reference Data Library V1.4.json";


    ontologiesMapper.extractlabelsFromJsonData(filePath)
}


if (false) {

    var filePath = "D:\\NLP\\ontologies\\quantum\\MDM Rev 4 SQL export_03122020.json"
    ontologiesMapper.extractMappingsFromMDM()


}


if (false) {

    var filePath = "D:\\NLP\\ontologies\\quantum\\mappings\\MDMablesMapping.txt"
    ontologiesMapper.generateMDMtablesMappings(filePath)


}

if(false) {
    var sourceConfig = {
        type: "jsonMap",
        filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json",
    // table: "tblPhysicalClass",
 // table: "tblFunctionalClass",
   //  table: "tblAttribute",
    //  table: "tblDiscipline",
     table: "tblTag",
        labelKey: "Name",
        idKey: "ID"
    }
    var targetConfig = {
        type: "jsonMap",
        filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\20210107_MDM_Rev04._tblMappingSource.json",
        table: "tblPhysicalClass",
        labelKey: "Name",
        idKey: "ID"
    }

    var originMap={
        'TOTAL-SA0000000004':'CFIHOS',
        'TOTAL-SA0000000005':'CFIHOS',
        'TOTAL-SA0000000006':'CFIHOS',
        'TOTAL-SA0000000007':'CFIHOS',
        'TOTAL-SA0000000008':'CFIHOS',
        'TOTAL-SA0000000009':'CFIHOS',
        'TOTAL-SA0000000010':'CFIHOS',
        'TOTAL-SA0000000011':'CFIHOS',
        'TOTAL-SA0000000012':'CFIHOS',
        'TOTAL-SA0000000037':'CFIHOS',
        'TOTAL-SA0000000038':'CFIHOS',
        'TOTAL-SA0000000039':'CFIHOS',
        'TOTAL-SA0000000040':'CFIHOS',
        'TOTAL-SA0000000041':'CFIHOS',
        'TOTAL-SA0000000048':'CFIHOS',
        'TOTAL-SA0000000042':'TOTAL-CTG',
        'TOTAL-SA0000000001':'TOTAL-GS',
        'TOTAL-SA0000000002':'TOTAL-GS',
        'TOTAL-SA0000000013':'TOTAL-GS',
        'TOTAL-SA0000000036':'TOTAL-GS',
        'TOTAL-SA0000000049':'TOTAL-GS',
        'TOTAL-SA0000000050':'TOTAL-GS',
        'TOTAL-SA0000000051':'TOTAL-GS',
        'TOTAL-SA0000000052':'TOTAL-GS',
        'TOTAL-SA0000000003':'ICAPS',
        'TOTAL-SA0000000014':'ICAPS',
        'TOTAL-SA0000000053':'ISO-14224',
        'TOTAL-SA0000000054':'ISO-14225',
        'TOTAL-SA0000000055':'ISO-14226',
        'TOTAL-SA0000000017':'ISO-14926-Part4',
        'TOTAL-SA0000000019':'ISO-14926-Part5',
        'TOTAL-SA0000000025':'ISO-14926-Part6',
        'TOTAL-SA0000000028':'ISO-14926-Part7',
        'TOTAL-SA0000000043':'MEL',
        'TOTAL-SA0000000044':'MEL',
        'TOTAL-SA0000000045':'MEL',
        'TOTAL-SA0000000046':'MEL',
        'TOTAL-SA0000000047':'MEL'

    }

    var sourceData = JSON.parse(fs.readFileSync(sourceConfig.filePath))
    var targetData = JSON.parse(fs.readFileSync(targetConfig.filePath))
    var targetMap = {}
    var idField=sourceConfig.table.substring(3)+"ID"
    targetData.forEach(function (item) {

        targetMap[item[idField]] = item
    })


    var tableData = sourceData[sourceConfig.table]

    var str = ""
    tableData.forEach(function (item) {
        var id = item[sourceConfig.idKey];
        str += id
        var target = targetMap[id]
        if (target) {

            str += "\t" + target.ID + "\t" +
                target.SourceCode.replace(/[\n\r\t]/g," ") + "\t" +
                target.SourceDescription.replace(/[\n\r\t]/g," ") + "\t" +
                target.ChangeRequestNumber.replace(/[\n\r\t]/g," ") + "\t" +
                target.MappingSourceOriginID + "\t" +
                target.ItemStatus.replace(/[\n\r\t]/g," ") + "\t"

            var originType=originMap[ target.MappingSourceOriginID];
            if(originType)
                str+=originType+"\t"
            else
                str+=""+"\t"

        }
        str+="\n"
    })

    fs.writeFileSync(targetConfig.filePath.replace(".json","_"+sourceConfig.table+".txt"),str)





}


//mapQuatumCfihos.writeMappings()
