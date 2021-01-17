var fs = require('fs');
const async = require('async');
var httpProxy = require('../../bin/httpProxy.')
var util = require('../../bin/skosConverters/util.')
var distinctTags = {};
var sliceSize = 50


var ontologiesMapper = {


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

        function formatLabel(str) {
            str = str.trim().toLowerCase().replace(/['$]/g, "")
            str = str.replace(/\\/g, "")
            str = str.replace(/\(/gm, "")
            str = str.replace(/\)/gm, "")
            str = str.replace(/\[/gm, "")
            str = str.replace(/\]/gm, "")

            return str
        }

        // var x=  decapitalize("FibreOpticPatchPanelsCabinet")


        var sourceClassesLabels = {}
        var sourceClassesIds = {}
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
                        sourceClassesLabels[label] = {label: label, sourceId: id, targetIds: [], targetLabels: []}
                        sourceClassesIds[label] = {label: label, sourceId: id, sourceLabel: item[sourceConfig.labelKey].trim(), targets: {}}
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

                        var label = formatLabel(item[sourceConfig.labelKey])
                        var id = item[sourceConfig.idKey]
                        if (id == "TOTAL-P0000002823")
                            var x = 3
                        var parent = item[sourceConfig.table.replace("tbl", "Parent") + "ID"]
                        if (!parent)
                            parent = null;
                        sourceClassesLabels[label] = {label: label, sourceId: id, parent: parent, sourceLabel: item[sourceConfig.labelKey].trim(), targets: {}}
                        sourceClassesIds[label] = {label: label, sourceId: id, parent: parent, sourceLabel: item[sourceConfig.labelKey].trim(), targets: {}}
                        targetConfigs.forEach(function (target) {
                            sourceClassesLabels[label].targets[target.name] = []
                            sourceClassesIds[label].targets[target.name] = []
                        })

                    })
                return callbackSeries()


            },
            //************************************* slice labels and get same labels in target*************************
            function (callbackSeries) {
                var quantumLabels = [];
                Object.keys(sourceClassesLabels);
                for (var id in sourceClassesIds) {
                    quantumLabels.push(sourceClassesIds[id].label)
                }
                var slices = util.sliceArray(quantumLabels, sliceSize);


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


                            function setTargetValues(source, bindings) {
                                bindings.forEach(function (item) {
                                    var x = item;
                                    var id = item.concept.value;
                                    var label = formatLabel(item.conceptLabel.value)
                                    for (var id2 in sourceClassesIds)
                                        if (sourceClassesIds[id2].label == label)

                                            sourceClassesIds[id2].targets[source].push({id: id, label: item.conceptLabel.value})
                                    // sourceClassesLabels[label].targets[source].push({id: id, label: item.conceptLabel.value});

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

                                    setTargetValues(targetConfig.name, data.results.bindings)

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
                                    if (err)
                                        return callbackEachSlice(err)
                                    if (typeof data === "string")
                                        data = JSON.parse(data.trim())
                                    else if (data.result && typeof data.result != "object")//cas GEMET
                                        data = JSON.parse(data.result.trim())
                                    setTargetValues(targetConfig.name, data.results.bindings)

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

            callback(err, sourceClassesIds);
            //   console.log(JSON.stringify(sourceClassesLabels, null, 2))
        })

    }


    , writeMappings: function (sources, table, json, mappingSourceArray, filePath,) {

        //    var json = JSON.parse(fs.readFileSync(filePath));
        var typesMap = {
            "tblPhysicalClass": "http://standards.iso.org/iso/15926/part14/PhysicalObject",
            "tblFunctionalClass": "http://standards.iso.org/iso/15926/part14/FunctionalObject",
            "tblAttribute": "http://standards.iso.org/iso/15926/part14/PhysicalQuantity",
            "tblAttributePickListValue": "http://standards.iso.org/iso/15926/part14/PhysicalQuantity",
            "tblPickListValueGrouping": "http://standards.iso.org/iso/15926/part14/PhysicalQuantity",
            // table: "tblDiscipline",
            // table: "tblTag",
        }
        var originMap = {
            'TOTAL-SA0000000004': 'CFIHOS',
            'TOTAL-SA0000000005': 'CFIHOS',
            'TOTAL-SA0000000006': 'CFIHOS',
            'TOTAL-SA0000000007': 'CFIHOS',
            'TOTAL-SA0000000008': 'CFIHOS',
            'TOTAL-SA0000000009': 'CFIHOS',
            'TOTAL-SA0000000010': 'CFIHOS',
            'TOTAL-SA0000000011': 'CFIHOS',
            'TOTAL-SA0000000012': 'CFIHOS',
            'TOTAL-SA0000000037': 'CFIHOS',
            'TOTAL-SA0000000038': 'CFIHOS',
            'TOTAL-SA0000000039': 'CFIHOS',
            'TOTAL-SA0000000040': 'CFIHOS',
            'TOTAL-SA0000000041': 'CFIHOS',
            'TOTAL-SA0000000048': 'CFIHOS',
            'TOTAL-SA0000000042': 'TOTAL-CTG',
            'TOTAL-SA0000000001': 'TOTAL-GS',
            'TOTAL-SA0000000002': 'TOTAL-GS',
            'TOTAL-SA0000000013': 'TOTAL-GS',
            'TOTAL-SA0000000036': 'TOTAL-GS',
            'TOTAL-SA0000000049': 'TOTAL-GS',
            'TOTAL-SA0000000050': 'TOTAL-GS',
            'TOTAL-SA0000000051': 'TOTAL-GS',
            'TOTAL-SA0000000052': 'TOTAL-GS',
            'TOTAL-SA0000000003': 'ICAPS',
            'TOTAL-SA0000000014': 'ICAPS',
            'TOTAL-SA0000000053': 'ISO-14224',
            'TOTAL-SA0000000054': 'ISO-14224',
            'TOTAL-SA0000000055': 'ISO-14224',
            'TOTAL-SA0000000017': 'ISO-14926-Part4',
            'TOTAL-SA0000000019': 'ISO-14926-Part4',
            'TOTAL-SA0000000025': 'ISO-14926-Part4',
            'TOTAL-SA0000000028': 'ISO-14926-Part4',
            'TOTAL-SA0000000043': 'MEL',
            'TOTAL-SA0000000044': 'MEL',
            'TOTAL-SA0000000045': 'MEL',
            'TOTAL-SA0000000046': 'MEL',
            'TOTAL-SA0000000047': 'MEL'

        }
        var mappingSourceFields = [
            'SourceCode',
            'SourceDescription',
            'MappingSourceOriginID',
            'ChangeRequestNumber',
            'ItemStatus'
        ]


        var matchingFieldsMap = {
            "tblPhysicalClass": "PhysicalClassID",
            "tblPickListValueGrouping": "PickListValueGroupingID",
            "tblAttributePickListValue": "AttributePickListValueID",
            "tblFunctionalClass": "FunctionalClassID",
            "tblAttribute": "AttributeID",
            "tblDiscipline": "DisciplineID",
            "tblTag": "TagId",

        }
        var mappingSourceEntityFields = []
        for (var key in matchingFieldsMap) {
            mappingSourceEntityFields.push(matchingFieldsMap[key])
        }

        var triplesMapping = ""
        var triplesLabel = ""
        var triplesSubClassOf = ""
        var triplesType = ""


        var mappingLabelMap = {}
        for (var key in json) {
            var id = json[key].sourceId
            mappingLabelMap[id] = json[key]

        }


        var mappingSourceNormalMap = {} // keys =sum of all tables id fields
        var entityIdField = matchingFieldsMap[table]


        mappingSourceArray.forEach(function (item) {
            var obj = {}

            mappingSourceEntityFields.forEach(function (entityField) {

                if (item[entityField]) {
                    var obj = {entityId: item[entityField]}

                    mappingSourceFields.forEach(function (sourceField) {
                        obj[sourceField] = item[sourceField]
                    })
                    mappingSourceNormalMap[obj.entityId] = obj
                }
            })

        })


        var orphans = 'table\tQuantumId\tQuantumLabel'
        sources.forEach(function (source) {
            orphans += "\t" + source.name;
        })
        orphans += 'entityId' +
            '\tSourceCode' +
            '\tSourceDescription' +
            '\tMappingSourceOriginID' +
            '\tChangeRequestNumber' +
            '\tItemStatus' +
            "\tMappingSourceOriginType\t"


        orphans += "\n"
        var tableType = "http://data.total.com/resource/quantum/table/" + table + "";
        for (var id in mappingLabelMap) {


            var mappingLabelItem = mappingLabelMap[id];
            var mappingSourceItem = mappingSourceNormalMap[id];


            orphans += table + '\t' + mappingLabelItem.sourceId + "\t" + mappingLabelItem.sourceLabel + "\t"
          if(mappingLabelItem.parent)
                triplesSubClassOf += "<http://data.total.com/resource/quantum/" + mappingLabelItem.sourceId + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.total.com/resource/quantum/"+ mappingLabelItem.parent+">.\n"
            else
                triplesSubClassOf += "<http://data.total.com/resource/quantum/" + mappingLabelItem.sourceId + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + typesMap[table] + "> .\n"
            triplesType += "<http://data.total.com/resource/quantum/" + mappingLabelItem.sourceId + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <" + tableType + "> .\n"


            triplesLabel += "<http://data.total.com/resource/quantum/" + mappingLabelItem.sourceId + "> <http://www.w3.org/2000/01/rdf-schema#label> '" + mappingLabelItem.sourceLabel + "'.\n"

            sources.forEach(function (source, indexSource) {
                var orphansMatch = ""
                if (mappingLabelItem.targets[source.name].length == 0) {
                    orphans += orphansMatch + "\t"
                } else {

                    mappingLabelItem.targets[source.name].forEach(function (target, index) {
                        triplesMapping += "<http://data.total.com/resource/quantum/" + mappingLabelItem.sourceId + "> <http://data.total.com/resource/quantum/mappings/" + source.name + "#sameAs> <" + target.id + ">.\n"


                        if (index > 0)
                            orphans += "|"
                        orphans += target.id + ""
                    })
                    orphans += "\t"
                }
            })


            if (mappingSourceItem) {


                mappingSourceFields.forEach(function (field) {
                    orphans += "" + (mappingSourceItem[field].replace(/[\n\r\t]/g, " ")) + "\t";
                })
                orphans += originMap[mappingSourceItem["MappingSourceOriginID"]] + "\t"


            } else {
                sources.forEach(function (source, indexSource) {
                    orphans += "\t"
                })
            }
            orphans += "\n"


        }

        var triples = triplesMapping + triplesLabel + triplesSubClassOf+triplesType
        fs.writeFileSync(filePath.replace(".json", "_" + table + ".nt"), triples)
        fs.writeFileSync(filePath.replace(".json", "_" + table + "_orphans.txt"), orphans)
    }


    , setMappingsSourceAttrs: function (labelsMap, filePath, table) {

        var sourceConfig = {
            type: "jsonMap",
            filePath: filePath,//"D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json",
            //  filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__objects.json",
            table: table,//"tblPhysicalClass",
            //table: "tblFunctionalClass",
            //  table: "tblAttribute",
            //  table: "tblDiscipline",
            //   table: "tblPickListValueGrouping",
            //  table:  "tblAttributePickListValue",
            //  table: "tblTag",
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

        var originMap = {
            'TOTAL-SA0000000004': 'CFIHOS',
            'TOTAL-SA0000000005': 'CFIHOS',
            'TOTAL-SA0000000006': 'CFIHOS',
            'TOTAL-SA0000000007': 'CFIHOS',
            'TOTAL-SA0000000008': 'CFIHOS',
            'TOTAL-SA0000000009': 'CFIHOS',
            'TOTAL-SA0000000010': 'CFIHOS',
            'TOTAL-SA0000000011': 'CFIHOS',
            'TOTAL-SA0000000012': 'CFIHOS',
            'TOTAL-SA0000000037': 'CFIHOS',
            'TOTAL-SA0000000038': 'CFIHOS',
            'TOTAL-SA0000000039': 'CFIHOS',
            'TOTAL-SA0000000040': 'CFIHOS',
            'TOTAL-SA0000000041': 'CFIHOS',
            'TOTAL-SA0000000048': 'CFIHOS',
            'TOTAL-SA0000000042': 'TOTAL-CTG',
            'TOTAL-SA0000000001': 'TOTAL-GS',
            'TOTAL-SA0000000002': 'TOTAL-GS',
            'TOTAL-SA0000000013': 'TOTAL-GS',
            'TOTAL-SA0000000036': 'TOTAL-GS',
            'TOTAL-SA0000000049': 'TOTAL-GS',
            'TOTAL-SA0000000050': 'TOTAL-GS',
            'TOTAL-SA0000000051': 'TOTAL-GS',
            'TOTAL-SA0000000052': 'TOTAL-GS',
            'TOTAL-SA0000000003': 'ICAPS',
            'TOTAL-SA0000000014': 'ICAPS',
            'TOTAL-SA0000000053': 'ISO-14224',
            'TOTAL-SA0000000054': 'ISO-14224',
            'TOTAL-SA0000000055': 'ISO-14224',
            'TOTAL-SA0000000017': 'ISO-14926-Part4',
            'TOTAL-SA0000000019': 'ISO-14926-Part4',
            'TOTAL-SA0000000025': 'ISO-14926-Part4',
            'TOTAL-SA0000000028': 'ISO-14926-Part4',
            'TOTAL-SA0000000043': 'MEL',
            'TOTAL-SA0000000044': 'MEL',
            'TOTAL-SA0000000045': 'MEL',
            'TOTAL-SA0000000046': 'MEL',
            'TOTAL-SA0000000047': 'MEL'

        }

        var matchingFieldsMap = {
            "tblPhysicalClass": "PhysicalClassID",
            "tblPickListValueGrouping": "PickListValueGroupingID",
            "tblAttributePickListValue": "AttributePickListValueID",
            "tblFunctionalClass": "FunctionalClassID",
            "tblAttribute": "AttributeID",
            "tblDiscipline": "DisciplineID",
            "tblTag": "TagId",

        }

        var sourceData = JSON.parse(fs.readFileSync(sourceConfig.filePath))
        var targetData = JSON.parse(fs.readFileSync(targetConfig.filePath))
        var targetMap = {}
        var idField = sourceConfig.table.substring(3) + "ID"


        var idsMap = {}
        for (var key in labelsMap) {
            idsMap[labelsMap[key].sourceId] = labelsMap[key];
        }
        var matchingField = matchingFieldsMap[table]
        targetData.forEach(function (item) {
            if (idsMap[item[matchingField]])
                item.CFmappings = idsMap[item[matchingField]]
            targetMap[item[idField]] = item
        })

        var tableData = sourceData[sourceConfig.table]
        var str = ""


        var outputArray = []
        tableData.forEach(function (item) {

            var id
            var id = item[sourceConfig.idKey];
            str += id
            var target = targetMap[id]
            if (target) {

                str += "\t" + target.ID + "\t" +
                    target.SourceCode.replace(/[\n\r\t]/g, " ") + "\t" +
                    target.SourceDescription.replace(/[\n\r\t]/g, " ") + "\t" +
                    target.ChangeRequestNumber.replace(/[\n\r\t]/g, " ") + "\t" +
                    target.MappingSourceOriginID + "\t" +
                    target.ItemStatus.replace(/[\n\r\t]/g, " ") + "\t"

                var originType = originMap[target.MappingSourceOriginID];
                if (originType)
                    str += originType + "\t"
                else
                    str += "" + "\t"

            }
            str += "\n"
        })


        if (false) {
            tableData.forEach(function (item) {
                var id = item[sourceConfig.idKey];
                str += id
                var target = targetMap[id]
                if (target) {

                    str += "\t" + target.ID + "\t" +
                        target.SourceCode.replace(/[\n\r\t]/g, " ") + "\t" +
                        target.SourceDescription.replace(/[\n\r\t]/g, " ") + "\t" +
                        target.ChangeRequestNumber.replace(/[\n\r\t]/g, " ") + "\t" +
                        target.MappingSourceOriginID + "\t" +
                        target.ItemStatus.replace(/[\n\r\t]/g, " ") + "\t"

                    var originType = originMap[target.MappingSourceOriginID];
                    if (originType)
                        str += originType + "\t"
                    else
                        str += "" + "\t"

                }
                str += "\n"
            })

            fs.writeFileSync(targetConfig.filePath.replace(".json", "_" + sourceConfig.table + ".txt"), str)

        }


    },


    normalizeMappingSources: function () {


        var tableFields = [
            'FunctionalClassID',
            'PhysicalClassID',
            'AttributeID',
            'AttributePickListValueID',
            'AttributeID2',
            'AttributePickListValueID2',
            'PickListValueGroupingID',
            'UnitOfMeasureID',
            /*     'UnitOfMeasureDimensionID',
                 'DisciplineID',
                 'DocumentTypeID',
                 'DisciplineDocumentTypeID',
                 'FunctionalClassToPhysicalClassID',
                 'FunctionalClassToAttributeID',
                 'PhysicalClassToAttributeID',
                 'FunctionalClassToDisciplineDocumentTypeID',
                 'PhysicalClassToDisciplineDocumentTypeID',*/


        ]
        var mappedFields = ['ID',
            'SourceCode',
            'SourceDescription',
            'MappingSourceOriginID',
            'ChangeRequestNumber',
            'ItemStatus',
        ]

        var multipleFields = ["PhysicalClassID", "FunctionalClassID", "AttributeID", "AttributePickListValueID", "PickListValueGroupingID"]
        var filePath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\20210107_MDM_Rev04._tblMappingSource.json"
        var data = JSON.parse(fs.readFileSync(filePath))


        var data2 = []
        data.forEach(function (item) {
            tableFields.forEach(function (field, fieldIndex) {
                if (item[field]) {
                    if (item[field].indexOf('-F00') > -1)
                        var x = 3;
                    if (fieldIndex == 6)
                        var x = 3
                    if ((fieldIndex < tableFields.length - 1 && !item[tableFields[fieldIndex + 1]])) {
                        if (multipleFields.indexOf(field) > -1) {
                            var obj = {entityId: item[field]}

                            mappedFields.forEach(function (field2) {
                                if (item[field2])
                                    obj[field2] = item[field2]
                            })

                            data2.push(obj)

                        } else {
                            var x = 3
                        }
                    }
                }
            })


        })
        fs.writeFileSync(filePath.replace(".json", "._normal.json"), JSON.stringify(data2, null, 2))


    }
}
module.exports = ontologiesMapper;


if (true) {//mapClasses
    var sourceConfig = {
        type: "jsonMap",
        filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json",
        // filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__objects.json",

     // table: "tblPhysicalClass",
     //  table: "tblPickListValueGrouping",
      table: "tblAttributePickListValue",
 //  table: "tblFunctionalClass",
    //  table: "tblAttribute",
        //table: "tblDiscipline",
        //table: "tblTag",


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

        {name:"ISO_15926-part-4",
        "editable": true,
            "graphUri": "http://standards.iso.org/iso/15926/part4/",
            "sparql_server": {
            "url": "http://51.178.139.80:8890/sparql"
        },
        "topClassFilter": "?topConcept rdfs:subClassOf <http://standards.iso.org/iso/15926/part14#class>",
            "controller": "Sparql_OWL",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
    },
        {name:"ISO_15926-part-12",
        "editable": true,
            "graphUri": "http://standards.iso.org/iso/15926/-12/tech/ontology/v-4/",
            "sparql_server": {
            "url": "http://51.178.139.80:8890/sparql"
        },
        "controller": "Sparql_OWL",
            "topClassFilter": "?topConcept rdfs:subClassOf <http://www.w3.org/2002/07/owl#Thing>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
    },
        {name:"ISO_15926-org",
        "graphUri": "",
            "sparql_server": {
            "url": "http://192.236.179.169/sparql",
                "method": "GET"
        },
        "controller": "Sparql_OWL",
            "topClassFilter": "?topConcept rdfs:subClassOf <http://data.15926.org/dm/Thing>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
    },

]


    sourceConfig.filePath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json"
    if (sourceConfig.table == "tblAttributePickListValue") {
        sourceConfig.filePath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__objects.json"
    }

    ontologiesMapper.mapClasses(sourceConfig, targetConfigs, function (err, result) {
        if (err)
            return console.log(err);


        // ontologiesMapper.setMappingsSourceAttrs(result.labelsMap, sourceConfig.filePath, sourceConfig.table)

        var mappingSourceArrayPath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\20210107_MDM_Rev04._tblMappingSource.json"
        var mappingSourceArray = JSON.parse(fs.readFileSync(mappingSourceArrayPath))

        ontologiesMapper.writeMappings(
            targetConfigs,
            sourceConfig.table,
            result,
            mappingSourceArray,
            sourceConfig.filePath.replace(".json", "_mappings.json"))


    });

}


//mapQuatumCfihos.writeMappings()
