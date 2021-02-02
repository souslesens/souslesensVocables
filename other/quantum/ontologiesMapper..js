var fs = require('fs');
const async = require('async');
var httpProxy = require('../../bin/httpProxy.')
var util = require('../../bin/skosConverters/util.')
var distinctTags = {};
var sliceSize = 50


var ontologiesMapper = {

    formatLabel: function (str, forUri) {
        if (!str)
            var x = 3

        str = str.trim().toLowerCase().replace(/['$]/g, "")
        str = str.replace(/\\/g, "")
        str = str.replace(/\(/gm, "")
        str = str.replace(/\)/gm, "")
        str = str.replace(/\[/gm, "")
        str = str.replace(/\]/gm, "")

        if (forUri)
            str = str.replace(/ /gm, "_")
        return str
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


        var sourceClassesLabels = {}
        var sourceClassesIds = {}
        async.series([


            //************************************* query sparql source*************************
            function (callbackSeries) {
                if (sourceConfig.type != "sparql")
                    return callbackSeries();
                var query = sourceConfig.query;
                var body = {
                    url: sourceConfig.sparql_server.url,
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

                        var label = ontologiesMapper.formatLabel(item[sourceConfig.labelKey])
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
                                    var label = ontologiesMapper.formatLabel(item.conceptLabel.value)
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
            if (mappingLabelItem.parent)
                triplesSubClassOf += "<http://data.total.com/resource/quantum/" + mappingLabelItem.sourceId + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.total.com/resource/quantum/" + mappingLabelItem.parent + ">.\n"
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

        var triples = triplesMapping + triplesLabel + triplesSubClassOf + triplesType
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


    }


    , normalizeMappingSources: function () {


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

    , getQuantumAttributesSuperclassesTriples: function () {
        var dimensionsMap = {
            'TOTAL-UD0000000035': 'CFIHOS-45000001',
            'TOTAL-UD0000000114': 'CFIHOS-45000002',
            'TOTAL-UD0000000043': 'CFIHOS-45000004',
            'TOTAL-UD0000000044': 'CFIHOS-45000005',
            'TOTAL-UD0000000050': 'CFIHOS-45000007',
            'TOTAL-UD0000000074': 'CFIHOS-45000009',
            'TOTAL-UD0000000082': 'CFIHOS-45000010',
            'TOTAL-UD0000000083': 'CFIHOS-45000011',
            'TOTAL-UD0000000051': 'CFIHOS-45000012',
            'TOTAL-UD0000000107': 'CFIHOS-45000013',
            'TOTAL-UD0000000113': 'CFIHOS-45000014',
            'TOTAL-UD0000000112': 'CFIHOS-45000015',
            'TOTAL-UD0000000130': 'CFIHOS-45000016',
            'TOTAL-UD0000000134': 'CFIHOS-45000017',
            'TOTAL-UD0000000135': 'CFIHOS-45000018',
            'TOTAL-UD0000000143': 'CFIHOS-45000019',
            'TOTAL-UD0000000055': 'CFIHOS-45000020',
            'TOTAL-UD0000000093': 'CFIHOS-45000021',
            'TOTAL-UD0000000064': 'CFIHOS-45000022',
            'TOTAL-UD0000000156': 'CFIHOS-45000023',
            'TOTAL-UD0000000088': 'CFIHOS-45000025',
            'TOTAL-UD0000000028': 'CFIHOS-45000026',
            'TOTAL-UD0000000072': 'CFIHOS-45000027',
            'TOTAL-UD0000000165': 'CFIHOS-45000028',
            'TOTAL-UD0000000162': 'CFIHOS-45000029',
            'TOTAL-UD0000000163': 'CFIHOS-45000030',
            'TOTAL-UD0000000166': 'CFIHOS-45000031',
            'TOTAL-UD0000000171': 'CFIHOS-45000033',
            'TOTAL-UD0000000178': 'CFIHOS-45000034',
            'TOTAL-UD0000000024': 'CFIHOS-45000036',
            'TOTAL-UD0000000037': 'CFIHOS-45000037',
            'TOTAL-UD0000000054': 'CFIHOS-45000038',
            'TOTAL-UD0000000068': 'CFIHOS-45000039',
            'TOTAL-UD0000000120': 'CFIHOS-45000041',
            'TOTAL-UD0000000179': 'CFIHOS-45000044',

        }
        var sourceConfig = {
            type: "jsonMap",
            filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json",
            // filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__objects.json",
            table: "tblAttribute",
        }

        var data = JSON.parse(fs.readFileSync(sourceConfig.filePath))
        var tableData = data[sourceConfig.table]
        if (!tableData)
            return callbackSeries("no key " + sourceConfig.table)
        var triples = ""
        tableData.forEach(function (item) {


            var id = item.ID;
            var dimension = item.UnitOfMeasureDimensionID
            if (dimension && dimensionsMap[dimension]) {
                triples += "<http://data.total.com/resource/quantum/" + id + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> " +
                    "<http://w3id.org/readi/rdl/" + dimensionsMap[dimension] + ">.\n"


            }


        })


        for (var key in dimensionsMap) {
            triples += "<http://w3id.org/readi/rdl/" + dimensionsMap[key] + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> " +
                " <http://standards.iso.org/iso/15926/part14/PhysicalQuantity>.\n"
        }


        //   http://standards.iso.org/iso/15926/part14/hasPhysicalQuantity


        fs.writeFileSync("D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\attributesSubClassOf.nt", triples)

    }
    , getQuantumPickListSuperclassesTriples: function () {
        var dimensionsMap = {
            'TOTAL-UD0000000035': 'CFIHOS-45000001',
            'TOTAL-UD0000000114': 'CFIHOS-45000002',
            'TOTAL-UD0000000043': 'CFIHOS-45000004',
            'TOTAL-UD0000000044': 'CFIHOS-45000005',
            'TOTAL-UD0000000050': 'CFIHOS-45000007',
            'TOTAL-UD0000000074': 'CFIHOS-45000009',
            'TOTAL-UD0000000082': 'CFIHOS-45000010',
            'TOTAL-UD0000000083': 'CFIHOS-45000011',
            'TOTAL-UD0000000051': 'CFIHOS-45000012',
            'TOTAL-UD0000000107': 'CFIHOS-45000013',
            'TOTAL-UD0000000113': 'CFIHOS-45000014',
            'TOTAL-UD0000000112': 'CFIHOS-45000015',
            'TOTAL-UD0000000130': 'CFIHOS-45000016',
            'TOTAL-UD0000000134': 'CFIHOS-45000017',
            'TOTAL-UD0000000135': 'CFIHOS-45000018',
            'TOTAL-UD0000000143': 'CFIHOS-45000019',
            'TOTAL-UD0000000055': 'CFIHOS-45000020',
            'TOTAL-UD0000000093': 'CFIHOS-45000021',
            'TOTAL-UD0000000064': 'CFIHOS-45000022',
            'TOTAL-UD0000000156': 'CFIHOS-45000023',
            'TOTAL-UD0000000088': 'CFIHOS-45000025',
            'TOTAL-UD0000000028': 'CFIHOS-45000026',
            'TOTAL-UD0000000072': 'CFIHOS-45000027',
            'TOTAL-UD0000000165': 'CFIHOS-45000028',
            'TOTAL-UD0000000162': 'CFIHOS-45000029',
            'TOTAL-UD0000000163': 'CFIHOS-45000030',
            'TOTAL-UD0000000166': 'CFIHOS-45000031',
            'TOTAL-UD0000000171': 'CFIHOS-45000033',
            'TOTAL-UD0000000178': 'CFIHOS-45000034',
            'TOTAL-UD0000000024': 'CFIHOS-45000036',
            'TOTAL-UD0000000037': 'CFIHOS-45000037',
            'TOTAL-UD0000000054': 'CFIHOS-45000038',
            'TOTAL-UD0000000068': 'CFIHOS-45000039',
            'TOTAL-UD0000000120': 'CFIHOS-45000041',
            'TOTAL-UD0000000179': 'CFIHOS-45000044',

        }
        var sourceConfig = {
            type: "jsonMap",
            filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json",
            // filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__objects.json",
            table: "tblAttribute",
        }

        var data = JSON.parse(fs.readFileSync(sourceConfig.filePath))
        var tableData = data[sourceConfig.table]
        if (!tableData)
            return callbackSeries("no key " + sourceConfig.table)
        var triples = ""

        var pickListMap = {
            'TOTAL-G0000000043': 'LOV',
            'TOTAL-G0000000047': 'LOV',
            'TOTAL-G0000000187': 'LOV',
            'TOTAL-G0000000100': 'LOV',
            'TOTAL-G0000000185': 'LOV',
            'TOTAL-G0000000130': 'LOV',
            'TOTAL-G0000000184': 'LOV',
            'TOTAL-G0000000191': 'LOV',
            'TOTAL-G0000000192': 'LOV',
            'TOTAL-G0000000053': 'LOV',
            'TOTAL-G0000000199': 'LOV',
            'TOTAL-G0000000268': 'LOV',
            'TOTAL-G0000000017': 'LOV',
            'TOTAL-G0000000176': 'LOV',
            'TOTAL-G0000000186': 'LOV',
            'TOTAL-G0000000233': 'LOV',
            'TOTAL-G0000000188': 'LOV',
            'TOTAL-G0000000279': 'LOV',
            'TOTAL-G0000000234': 'LOV',
            'TOTAL-G0000000001': 'LOV',
            'TOTAL-G0000000002': 'LOV',
            'TOTAL-G0000000003': 'LOV',
            'TOTAL-G0000000004': 'LOV',
            'TOTAL-G0000000005': 'LOV',
            'TOTAL-G0000000006': 'LOV',
            'TOTAL-G0000000007': 'LOV',
            'TOTAL-G0000000008': 'LOV',
            'TOTAL-G0000000009': 'LOV',
            'TOTAL-G0000000010': 'LOV',
            'TOTAL-G0000000011': 'LOV',
            'TOTAL-G0000000012': 'LOV',
            'TOTAL-G0000000013': 'LOV',
            'TOTAL-G0000000014': 'LOV',
            'TOTAL-G0000000015': 'LOV',
            'TOTAL-G0000000016': 'LOV',
            'TOTAL-G0000000018': 'LOV',
            'TOTAL-G0000000019': 'LOV',
            'TOTAL-G0000000020': 'LOV',
            'TOTAL-G0000000021': 'LOV',
            'TOTAL-G0000000022': 'LOV',
            'TOTAL-G0000000023': 'LOV',
            'TOTAL-G0000000024': 'LOV',
            'TOTAL-G0000000025': 'LOV',
            'TOTAL-G0000000026': 'LOV',
            'TOTAL-G0000000027': 'LOV',
            'TOTAL-G0000000028': 'LOV',
            'TOTAL-G0000000029': 'LOV',
            'TOTAL-G0000000030': 'LOV',
            'TOTAL-G0000000031': 'LOV',
            'TOTAL-G0000000032': 'LOV',
            'TOTAL-G0000000033': 'LOV',
            'TOTAL-G0000000034': 'LOV',
            'TOTAL-G0000000035': 'LOV',
            'TOTAL-G0000000036': 'LOV',
            'TOTAL-G0000000037': 'LOV',
            'TOTAL-G0000000038': 'LOV',
            'TOTAL-G0000000039': 'LOV',
            'TOTAL-G0000000040': 'LOV',
            'TOTAL-G0000000041': 'LOV',
            'TOTAL-G0000000042': 'LOV',
            'TOTAL-G0000000044': 'LOV',
            'TOTAL-G0000000045': 'LOV',
            'TOTAL-G0000000046': 'LOV',
            'TOTAL-G0000000048': 'LOV',
            'TOTAL-G0000000049': 'LOV',
            'TOTAL-G0000000050': 'LOV',
            'TOTAL-G0000000051': 'LOV',
            'TOTAL-G0000000052': 'LOV',
            'TOTAL-G0000000054': 'LOV',
            'TOTAL-G0000000055': 'LOV',
            'TOTAL-G0000000056': 'LOV',
            'TOTAL-G0000000057': 'LOV',
            'TOTAL-G0000000058': 'LOV',
            'TOTAL-G0000000059': 'LOV',
            'TOTAL-G0000000060': 'LOV',
            'TOTAL-G0000000061': 'LOV',
            'TOTAL-G0000000062': 'LOV',
            'TOTAL-G0000000063': 'LOV',
            'TOTAL-G0000000064': 'LOV',
            'TOTAL-G0000000065': 'LOV',
            'TOTAL-G0000000066': 'LOV',
            'TOTAL-G0000000067': 'LOV',
            'TOTAL-G0000000068': 'LOV',
            'TOTAL-G0000000069': 'LOV',
            'TOTAL-G0000000070': 'LOV',
            'TOTAL-G0000000071': 'LOV',
            'TOTAL-G0000000072': 'LOV',
            'TOTAL-G0000000073': 'LOV',
            'TOTAL-G0000000074': 'LOV',
            'TOTAL-G0000000075': 'LOV',
            'TOTAL-G0000000076': 'LOV',
            'TOTAL-G0000000077': 'LOV',
            'TOTAL-G0000000078': 'LOV',
            'TOTAL-G0000000079': 'LOV',
            'TOTAL-G0000000080': 'LOV',
            'TOTAL-G0000000081': 'LOV',
            'TOTAL-G0000000082': 'LOV',
            'TOTAL-G0000000083': 'LOV',
            'TOTAL-G0000000084': 'LOV',
            'TOTAL-G0000000085': 'LOV',
            'TOTAL-G0000000086': 'LOV',
            'TOTAL-G0000000087': 'LOV',
            'TOTAL-G0000000088': 'LOV',
            'TOTAL-G0000000089': 'LOV',
            'TOTAL-G0000000090': 'LOV',
            'TOTAL-G0000000091': 'LOV',
            'TOTAL-G0000000092': 'LOV',
            'TOTAL-G0000000093': 'LOV',
            'TOTAL-G0000000094': 'LOV',
            'TOTAL-G0000000095': 'LOV',
            'TOTAL-G0000000096': 'LOV',
            'TOTAL-G0000000097': 'LOV',
            'TOTAL-G0000000098': 'LOV',
            'TOTAL-G0000000099': 'LOV',
            'TOTAL-G0000000101': 'LOV',
            'TOTAL-G0000000102': 'LOV',
            'TOTAL-G0000000103': 'LOV',
            'TOTAL-G0000000104': 'LOV',
            'TOTAL-G0000000105': 'LOV',
            'TOTAL-G0000000106': 'LOV',
            'TOTAL-G0000000107': 'LOV',
            'TOTAL-G0000000108': 'LOV',
            'TOTAL-G0000000109': 'LOV',
            'TOTAL-G0000000110': 'LOV',
            'TOTAL-G0000000111': 'LOV',
            'TOTAL-G0000000112': 'LOV',
            'TOTAL-G0000000113': 'LOV',
            'TOTAL-G0000000114': 'LOV',
            'TOTAL-G0000000115': 'LOV',
            'TOTAL-G0000000116': 'LOV',
            'TOTAL-G0000000117': 'LOV',
            'TOTAL-G0000000118': 'LOV',
            'TOTAL-G0000000119': 'LOV',
            'TOTAL-G0000000120': 'LOV',
            'TOTAL-G0000000121': 'LOV',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000157',
            'TOTAL-G0000000137': 'CFIHOS-10000001',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000106': 'CFIHOS-10000147',
            'TOTAL-G0000000106': 'CFIHOS-10000147',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000106': 'CFIHOS-10000147',
            'TOTAL-G0000000134': 'CFIHOS-10000003',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000135': 'CFIHOS-10000157',
            'TOTAL-G0000000135': 'CFIHOS-10000005',
            'TOTAL-G0000000137': 'CFIHOS-10000001',
            'TOTAL-G0000000135': 'CFIHOS-10000005',

        }
        tableData.forEach(function (item) {


            var id = item.ID;
            var pickListGroup = item.PickListValueGroupingID
            if (pickListGroup && pickListMap[pickListGroup]) {
                triples += "<http://data.total.com/resource/quantum/" + id + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> "
                if (pickListMap[pickListGroup] == "LOV")
                    triples += "<http://data.total.com/resource/quantum/pickList#LOV>.\n"
                else
                    triples += "<http://w3id.org/readi/rdl/" + pickListMap[pickListGroup] + ">.\n"


            }


        })

        var uniques = {}
        for (var key in pickListMap) {
            if (!uniques[pickListMap[key]]) {
                uniques[pickListMap[key]] = 1

                if (pickListMap[key] == "LOV")
                    triples += "<http://data.total.com/resource/quantum/pickList#LOV>"
                else
                    triples += "<http://w3id.org/readi/rdl/" + pickListMap[key] + ">"
                triples += " <http://www.w3.org/2000/01/rdf-schema#subClassOf> " +
                    " <http://standards.iso.org/iso/15926/part14/PhysicalQuantity>.\n"
            }
        }

        //   http://standards.iso.org/iso/15926/part14/hasPhysicalQuantity


        fs.writeFileSync("D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\pickListSubClassOf.nt", triples)

    }

    , getQuantumClassToAttributeTriples: function () {

        var sourceConfig = {
            type: "jsonMap",
            filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__relations.json",
            table: "tblPhysicalClassToAttribute",
        }


        var data = JSON.parse(fs.readFileSync(sourceConfig.filePath))
        var tableData = data[sourceConfig.table]
        if (!tableData)
            return callbackSeries("no key " + sourceConfig.table)
        var triples = ""


        var objectPropertiesArray = JSON.parse(fs.readFileSync("D:\\NLP\\ontologies\\readi\\PropertiesAndRestrictions._objectProperties.json"))
        var rangeMap = {}
        objectPropertiesArray.forEach(function (item) {
            if (!item.range)
                return
            rangeMap[item.range] = item
        })


        var attrsSourceMappingsArray = JSON.parse(fs.readFileSync("D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\Quantum_Cfihos_AttrMapping.json"))
        var mappingMap = {}
        attrsSourceMappingsArray.forEach(function (item) {
            if (!item.QuantumId)
                return
            if (!item.CFIHOS_READI)
                return
            mappingMap[item.QuantumId] = item
        })


        var propLabelTriples = ""
        var propIds = {}
        tableData.forEach(function (item) {


            var objIdF = item.FunctionalClassID;
            var objIdP = item.PhysicalClassID;
            var attrId = item.AttributeID;

            var predicate = null;//   var predicate='http://data.total.com/resource/quantum#hasAttribute'
            var propLabel = 'unMappedAttributeProperty'
            var quantumMappedId = mappingMap[attrId]
            if (quantumMappedId) {
                var readiId = quantumMappedId.CFIHOS_READI
                if (!readiId)
                    readiId = quantumMappedId.CFIHOS_READI2
                if (readiId && rangeMap[readiId]) {
                    predicate = rangeMap[readiId].prop
                    if (!propIds[predicate]) {
                        propIds[predicate] = 1
                        propLabel = rangeMap[readiId].propLabel
                        propLabelTriples += "<" + predicate + "> <http://www.w3.org/2000/01/rdf-schema#label> '" + propLabel + "'.\n"
                    }

                }
            }

            if (predicate && objIdF && attrId) {
                triples += "<http://data.total.com/resource/quantum/" + objIdF +
                    "> <" + predicate + "> " +
                    "<http://data.total.com/resource/quantum/" + attrId + ">.\n"

            }
            if (predicate && objIdP && attrId) {
                triples += "<http://data.total.com/resource/quantum/" + objIdP +
                    "> <" + predicate + "> " +
                    "<http://data.total.com/resource/quantum/" + attrId + ">.\n"

            }


        })
        triples += propLabelTriples


        fs.writeFileSync("D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\" + sourceConfig.table + "2Attribute.nt", triples)

    }








    // donne aux attributs de Quantum les attributs parents d'une classe de la sources
    , setQuantumAttributesParents: function (sourceLabel) {

        var readiPhysicalQuantities = {
            "http://w3id.org/readi/rdl/CFIHOS-45000001": "Capacitance",
            "http://w3id.org/readi/rdl/CFIHOS-45000002": "Density",
            "http://w3id.org/readi/rdl/CFIHOS-45000004": "Dynamic Viscosity",
            "http://w3id.org/readi/rdl/CFIHOS-45000005": "Electrical Charge",
            "http://w3id.org/readi/rdl/CFIHOS-45000007": "Electrical Current / Amperage",
            "http://w3id.org/readi/rdl/CFIHOS-45000009": "Frequency",
            "http://w3id.org/readi/rdl/CFIHOS-45000010": "Kinematic Viscosity",
            "http://w3id.org/readi/rdl/CFIHOS-45000011": "Length",
            "http://w3id.org/readi/rdl/CFIHOS-45000012": "Linear Electric Current Density",
            "http://w3id.org/readi/rdl/CFIHOS-45000013": "Mass / Weight",
            "http://w3id.org/readi/rdl/CFIHOS-45000014": "Mass Flow Rate",
            "http://w3id.org/readi/rdl/CFIHOS-45000015": "Mass Proportion",
            "http://w3id.org/readi/rdl/CFIHOS-45000016": "Power",
            "http://w3id.org/readi/rdl/CFIHOS-45000017": "Pressure",
            "http://w3id.org/readi/rdl/CFIHOS-45000018": "Pressure Rate Change",
            "http://w3id.org/readi/rdl/CFIHOS-45000019": "Ratio",
            "http://w3id.org/readi/rdl/CFIHOS-45000020": "Resistance",
            "http://w3id.org/readi/rdl/CFIHOS-45000021": "Sound",
            "http://w3id.org/readi/rdl/CFIHOS-45000022": "Specific Energy",
            "http://w3id.org/readi/rdl/CFIHOS-45000023": "Specific Heat Capacity",
            "http://w3id.org/readi/rdl/CFIHOS-45000025": "Speed",
            "http://w3id.org/readi/rdl/CFIHOS-45000026": "Surface / area",
            "http://w3id.org/readi/rdl/CFIHOS-45000027": "Surface Tension",
            "http://w3id.org/readi/rdl/CFIHOS-45000028": "Temperature",
            "http://w3id.org/readi/rdl/CFIHOS-45000029": "Thermal Conductivity",
            "http://w3id.org/readi/rdl/CFIHOS-45000030": "Thermal Insulation",
            "http://w3id.org/readi/rdl/CFIHOS-45000031": "Time",
            "http://w3id.org/readi/rdl/CFIHOS-45000033": "Volume",
            "http://w3id.org/readi/rdl/CFIHOS-45000034": "Volume Flow Rate",
            "http://w3id.org/readi/rdl/CFIHOS-45000036": "Angular velocity",
            "http://w3id.org/readi/rdl/CFIHOS-45000037": "Count",
            "http://w3id.org/readi/rdl/CFIHOS-45000038": "Electrical Tension / Voltage",
            "http://w3id.org/readi/rdl/CFIHOS-45000039": "Force",
            "http://w3id.org/readi/rdl/CFIHOS-45000041": "Moment of force",
            "http://w3id.org/readi/rdl/CFIHOS-45000044": "Volume proportion",

        }


        var sourceConfig = ontologiesMapper.sources[sourceLabel]
        var quantumConfig = ontologiesMapper.sources["QUANTUM"]
        var map = {}
        async.series([


            // Quantum attr sameAs
            function (callbackSeries) {

                var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct *  FROM <http://data.total.com/resource/quantum/> from <http://standards.iso.org/iso/15926/part14/>   WHERE {" +
                    "  ?concept <http://data.total.com/resource/quantum/mappings/" + sourceLabel + "#sameAs> ?similar. " +
                    "?concept rdfs:label ?conceptLabel" +
                    "} limit 100"


                var body = {
                    url: quantumConfig.sparql_server.url,
                    params: {query: query},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    if (err)
                        return console.log(err)
                    result.results.bindings.forEach(function (item) {
                        if (!map[item.similar.value])
                            map[item.similar.value] = {quantumId: item.concept.value, quantumLabel: item.conceptLabel.value}


                    })
                    callbackSeries()
                })
            },
            function (callbackSeries) {

                function processResult(bindings) {
                    bindings.forEach(function (item) {

                    })
                }

                var filter = ""
                var slices = util.sliceArray(Object.keys(map), 40)
                async.eachSeries(slices, function (ids, callbackEach) {
                    ids.forEach(function (item, index) {
                        if (index > 0)
                            filter += ","
                        filter += "<" + item + ">"
                    })
                    filter = "filter (?concept in(" + filter + "))"


                    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct *   WHERE {" +
                        "?concept rdfs:subClassOf ?parent. ?parent rdfs:label ?parentLabel " +
                        filter +
                        "} limit 100"

                    if (sourceConfig.method == "GET") {
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
                                return callbackEach(err)
                            if (typeof data === "string")
                                data = JSON.parse(data.trim())
                            else if (data.result && typeof data.result != "object")//cas GEMET
                                data = JSON.parse(data.result.trim())

                            processResult(result.results.bindings)


                            callbackEach()

                        })
                    } else {
                        var body = {
                            url: sourceConfig.sparql_server.url,
                            params: {query: query},
                            headers: {
                                "Accept": "application/sparql-results+json",
                                "Content-Type": "application/x-www-form-urlencoded"

                            }
                        }
                        httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                            if (err)
                                return console.log(err)
                            processResult(result.results.bindings)
                            callbackEach()
                        })
                    }
                }, function (err) {
                    callbackSeries()
                })
            }


        ], function (err) {
            var x = map
            console.log(err);
        })


    }


    , getTurboGenTriples: function (filePath) {
        var data = JSON.parse(fs.readFileSync(filePath))
        var existingNodes = {}
        var triples = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> "
        var tripleTags = ""
        data.forEach(function (item) {
            for (var i = 1; i < 4; i++) {
                var id = item["FunctionalClass" + i];
                if (!id)
                    return
                if (!existingNodes[id]) {
                    console.log(id)
                    existingNodes[id] = 1


                    var idUri = "<http://data.total.com/resource/one-model/assets/turbognerator/" + ontologiesMapper.formatLabel(id, true) + ">";
                    triples += idUri + " rdfs:label '" + ontologiesMapper.formatLabel(id) + "'.\n"
                    triples += idUri + " rdf:type <http://standards.iso.org/iso/15926/part14/FunctionalObject>.\n"
                    if (i == 1) {
                        triples += idUri + " rdfs:subClassOf <http://w3id.org/readi/rdl/CFIHOS-30000168>.\n"
                    } else {
                        var parentUri = "<http://data.total.com/resource/one-model/assets/turbognerator/" + ontologiesMapper.formatLabel(item["FunctionalClass" + (i - 1)], true) + ">";
                        triples += parentUri + " <http://standards.iso.org/iso/15926/part14/hasArrangedPart> " + idUri + ".\n"
                        triples += idUri + " rdfs:subClassOf " + parentUri + ".\n"
                    }

                    var tag = item["TAG" + i];
                    if (tag) {
                        var tagUri = "<http://data.total.com/resource/one-model/assets/turbognerator/" + ontologiesMapper.formatLabel(tag, true) + ">";
                        tripleTags += tagUri + " rdf:type <http://data.15926.org/rdl/RDS2222036>.\n"
                        tripleTags += idUri + " <http://standards.iso.org/iso/15926/part14/installedAs> " + tagUri + ".\n"


                    }

                }


            }
            /*     var tag = item["TAG"];
                 if (tag) {
                     var tagUri = "<http://data.total.com/resource/one-model/assets/turbognerator/" + ontologiesMapper.formatLabel(tag, true) + ">";
                     tripleTags+=tagUri +" rdf:type <http://data.15926.org/cfihos/33330003>\n"
                     tripleTags+=tagUri +" <http://standards.iso.org/iso/15926/part14/concretizes> "+ "<http://data.total.com/resource/one-model/assets/turbognerator/PIPoint"+".\n"


                 }*/


        })
        console.log(triples + tripleTags)

    }
    , getTurboGenAttrsTriples: function (filePath) {
        var data = JSON.parse(fs.readFileSync(filePath))
        var existingNodes = {}
        var triples = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> "
        var tripleTags = ""
        var str = ""
        data.forEach(function (item) {
            // var id=item["AttributeID"]
            var tagRef = ontologiesMapper.formatLabel(item["TAG_Ref"], true)
            var tagId = item["TagID"]
            var totalId = item["AttributeValue"]
            if (!existingNodes[tagRef]) {
                existingNodes[tagRef] = 1
                //    console.log(id+","+item["AttributeValue"])

                str += "<http://data.total.com/resource/one-model/assets/turbognerator/" + tagRef + "> <http://data.total.com/resource/one-model/assets#hasTagID>   '" + tagId + "'.\n"

                str += "<http://data.total.com/resource/one-model/assets/turbognerator/" + tagRef + "> <http://data.total.com/resource/one-model/assets#hasTOTAL-ID>   <http://data.total.com/resource/quantum/" + totalId + ">.\n"
            }


        })
        console.log(str);
        //    console.log(triples+tripleTags)

    }

    , getTurboGenTagToTagTriples: function (filePath) {
        var data = JSON.parse(fs.readFileSync(filePath))
        var existingNodes = {}
        var triples = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> "
        var tripleTags = ""
        var str = ""
        data.forEach(function (item) {
            // var id=item["AttributeID"]
            var tagRef = ontologiesMapper.formatLabel(item["TAG_Ref"], true)
            var tagId = item["TagID"]
            var totalId = item["AttributeValue"]
            if (!existingNodes[tagRef]) {
                existingNodes[tagRef] = 1
                //    console.log(id+","+item["AttributeValue"])

                str += "<http://data.total.com/resource/one-model/assets/turbognerator/" + tagRef + "> <http://data.total.com/resource/one-model/assets#hasTagID>   '" + tagId + "'.\n"

                str += "<http://data.total.com/resource/one-model/assets/turbognerator/" + tagRef + "> <http://data.total.com/resource/one-model/assets#hasTOTAL-ID>   <http://data.total.com/resource/quantum/" + totalId + ">.\n"
            }


        })
        console.log(str);
        //    console.log(triples+tripleTags)

    }


    , sources: {
        "QUANTUM": {
            "graphUri": ["http://data.total.com/resource/quantum/> from <http://standards.iso.org/iso/15926/part14/"],
            "sparql_server": {
                "url": "http://51.178.139.80:8890/sparql"
            },
            "controller": "Sparql_OWL",
            "topClassFilter": "?topConcept rdfs:subClassOf <http://www.w3.org/2002/07/owl#Thing>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
        }, "ISO_15926-part-14": {
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

        "ISO_15926-PCA": {
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
        },

        "CFIHOS_READI": {
            "graphUri": "http://w3id.org/readi/rdl/",
            "sparql_server": {
                "url": "http://51.178.139.80:8890/sparql"
            },
            "controller": "Sparql_OWL",
            "topClassFilter": " ?topConcept rdfs:subClassOf <http://standards.iso.org/iso/15926/part14/InanimatePhysicalObject>",
            "schemaType": "OWL",
            "schema": null,
            "color": "#bcbd22"
        },

        "CFIHOS-ISO": {
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


        "CFIHOS_equipment": {
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

        "ISO_15926-org": {
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
        "ISO_15926-part-4": {
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
        "ISO_15926-part-12": {
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

    }
}
module.exports = ontologiesMapper;


if (false) {//mapClasses
    var sourceConfig = {
        type: "jsonMap",
        filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__mainObjects.json",
        // filePath: "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\__objects.json",

        // table: "tblPhysicalClass",
        //  table: "tblPickListValueGrouping",
        // table: "tblAttributePickListValue",
        //  table: "tblFunctionalClass",
        //  table: "tblAttribute",
        //table: "tblDiscipline",
        //table: "tblTag",

        table: "tblUnitOfMeasureDimension",


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

        {
            name: "ISO_15926-part-4",
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
        {
            name: "ISO_15926-part-12",
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
        {
            name: "ISO_15926-org",
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

if (false) {
    ontologiesMapper.setQuantumAttributesParents("CFIHOS_READI")
}

if (false) {
    ontologiesMapper.getQuantumAttributesSuperclassesTriples()
}
if (false) {
    ontologiesMapper.getQuantumClassToAttributeTriples()
}
if (false) {
    ontologiesMapper.getQuantumPickListSuperclassesTriples()
}

if (false) {
    var data = JSON.parse(fs.readFileSync("D:\\NLP\\ontologies\\14224\\docx14224data.json"));
    var str = "";
    var nodeIds = {}
    data.forEach(function (item) {
        var objectUri = "<http://standards.iso.org/iso/14224/" + item.Object.replace(/ /g, "_") + ">"
        if (!nodeIds[item.Object]) {

            nodeIds[item.Object] = 1

            str += objectUri + " <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://www.w3.org/2002/07/owl#Thing>.\n"
            str += objectUri + " <http://www.w3.org/2000/01/rdf-schema#label> '" + item.Object.replace(/_/g, " ") + "'.\n"
        }
        if (item["Attribute Name"]) {
            var attrUri = "<http://standards.iso.org/iso/14224/" + item["Attribute Name"].replace(/ /g, "_") + ">"
            var attrPropUri = "<http://standards.iso.org/iso/14224/Has" + item["Attribute Name"].replace(/ /g, "_") + ">"
            if (!nodeIds[item["Attribute Name"]]) {
                nodeIds[item["Attribute Name"]] = 1
                str += attrPropUri + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2002/07/owl#ObjectProperty>.\n"
                str += attrPropUri + " <http://www.w3.org/2000/01/rdf-schema#label> 'has" + item.Definition.replace() + "'.\n"
                str += attrPropUri + " <http://www.w3.org/2000/01/rdf-schema#subPropertyOf> <http://standards.iso.org/iso/15926/part14/hasPhysicalQuantity>.\n"

                str += attrUri + " <http://www.w3.org/2000/01/rdf-schema#label> '" + item.Definition.replace(/_/g, " ") + "'.\n"
            }
            str += objectUri + " " + attrPropUri + " " + attrUri + ".\n"
        }
    })
}


//getTurboGenTriples
if (false) {
    var filePath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\turboGeneratorA_data.json"
    ontologiesMapper.getTurboGenTriples(filePath)
}


//getTurboGenTriplesAttrs
if (false) {
    var filePath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\turboGeneratorA_TagtoAttributes.json"
    ontologiesMapper.getTurboGenAttrsTriples(filePath,)
}

if (true) {
    var mapping = [
        {
            subject: "oneModel:PrimaryTagID_Lookup",
            predicate: "part14:contains",
            object: "oneModel:LinkTagID_Lookup"
        },
        {
            subject: "_:",
            predicate: "rdf:type",
            object: " owl:Restriction"
        },
        {

        }
    ]
    rdf:type owl:Restriction ;
    owl:onProperty npdv:operatorForField ;
    owl:someValuesFrom npdv:Field

  /*  xx = {
       "ID": "2cbd25fd-7774-4913-b226-0af1ee4ba776",
    "PrimaryTagID": "7519ecc8-8b5d-4be7-a602-994dbd487297",
    "PrimaryTagID_Lookup": "TO-DT-6010A",
    "Ref_PrimaryTagID_Lookup": "TO-DT-6010A",
    "FunctionalClassID": "TOTAL-F0000000417",
    "LinkTagID": "987f7188-c0d5-411b-af26-4020d7b3f6a3",
    "LinkTagID_Lookup": "TO-G_-6010A",
    "Ref_LinkTagID_Lookup": "TO-G-6010A",
    "FunctinalClassID": "TOTAL-F0000000287",
    "FunctinalClassName": "Electrical Generation Package",
    "Remark": "0-1",
    "LinkType": "Parent",
    "XXXrequirementCompositeTagKey": "7519ecc8-8b5d-4be7-a602-994dbd487297987f7188-c0d5-411b-af26-4020d7b3f6a3",
    "XXX": 1,
    "XXXrequirementCompositeFunctionalKey": "TOTAL-F0000000417TOTAL-F0000000287",
    "RequirementID": "TOTAL-RB0000000028"
    }*/


    var filePath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\turboGeneratorA_TagtoAttributes.json"
    ontologiesMapper.getTurboGenAttrsTriples(filePath,)
}


console.log(str)


//mapQuatumCfihos.writeMappings()
