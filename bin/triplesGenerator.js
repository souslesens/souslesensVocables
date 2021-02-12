var fs = require("fs")

const util = require('./skosConverters/util.')
const xlsx2json = require('./xlsx2json.')

var idsCache = {}

var triplesGenerator = {

    getJsonModel: function (filePath, callback) {
        var data = JSON.parse(fs.readFileSync(filePath))
        return callback(null, data)

    }


    , generateSheetDataTriples(mappings, data, uriPrefix, options, callback) {
        if (!options)
            options = {}


        var triples = [];
        var idsMap = {}
        data.forEach(function (item, index) {
            mappings.forEach(function (mapping, index) {
                var subjectValue = item[mapping.subject];



                if (!subjectValue)
                    return ;

                var subjectUri
                if (options.generateIds) {
                    var newUri=false
                    if (!idsMap[subjectValue]) {
                        idsMap[subjectValue] = util.getRandomHexaId(options.generateIds)
                        newUri=true
                    }
                        subjectUri = uriPrefix + idsMap[subjectValue]
                    if(newUri)
                        triples.push({subject: subjectUri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'"+subjectValue+"'"})

                } else {
                    subjectUri = uriPrefix + util.formatStringForTriple(subjectUri, true)
                }


                var objectValue;

                if (mapping.object.indexOf("http") == 0) {
                    objectValue = mapping.object;
                } else {

                    var objectValue = item[mapping.object]
                    if(!objectValue)
                        return;

                    var objectSuffix = ""
                    // if(util.isInt(objectValue))
                    if (!isNaN(objectValue)) {
                        objectSuffix = "^^xsd:integer"
                        objectValue = "'" + objectValue + "'" + objectSuffix;
                    }else if (util.isFloat(objectValue)) {
                        objectSuffix = "^^xsd:float"
                        objectValue = "'" + objectValue + "'" + objectSuffix;
                    }else{
                        if (options.generateIds) {
                            var newUri = false
                            if (!idsMap[objectValue]) {
                                idsMap[objectValue] = util.getRandomHexaId(options.generateIds)
                                newUri = true
                            }
                            var objectUri = uriPrefix + idsMap[objectValue]
                            objectValue = objectUri
                            if (newUri)
                                triples.push({subject: objectUri, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: "'" + objectValue + "'"})
                        }
                    }

                }
                var predicateUri = mapping.predicate
                triples.push({subject: subjectUri, predicate: predicateUri, object: objectValue})

            })
        })
        callback(null, triples)


    },

    generateXlsxBookTriples: function (mappings, xlsxFilePath, uriPrefix, options, callback) {
        if (!options)
            options = {}

        var mappingSheets = []
        mappings.mappings.forEach(function (mapping) {
            var sheet = mapping.subject.split(".")[0]
            if (mappingSheets.indexOf(sheet) < 0) {
                mappingSheets.push(sheet)
            }
            if (!mapping.object)
                return xx
            if (mapping.object.indexOf("http") < 0) {
                var sheet = mapping.object.split(".")[0]
                if (mappingSheets.indexOf(sheet) < 0) {
                    mappingSheets.push(sheet)
                }
            }
        })
        xlsx2json.parse(xlsxFilePath, {sheets: mappingSheets}, function (err, result) {

                if (err)
                    return callback(err)
                var allTriples = [];

                var dataMap = {};
                var allCols = []
           var  predicatesMap={}
                mappings.mappings.forEach(function (mapping) {

                    var subject = mapping.subject
                    var subjectSheet = subject.split('.')[0]

                    var subjectCol = subject.split('.')[1]
                    var object = mapping.object
                    if (object && object.indexOf("http") < 0) {
                        var objectSheet = object.split('.')[0]
                        var objectCol = object.split('.')[1]

                        predicatesMap[subjectCol+"_"+subjectCol]=mapping.predicate

                        result.data[objectSheet].forEach(function (item, index) {

                            var subjectValue = item[subjectCol];
                            var subjectColLinked = subjectCol;
                            if (subjectSheet != objectSheet) {
                                if (subjectSheet == "TagtoTag")
                                    var x = 3;
                                if (!subjectValue) {
                                    mappings.sheetJoinColumns[subject].forEach(function (col) {
                                        col = col.split(".")[1]
                                        subjectValue = item[col];
                                        if (subjectValue)
                                            return subjectColLinked = col;
                                    })

                                }
                            }


                            var objectValue = item[objectCol]
                            if (!dataMap[subjectCol])
                                dataMap[subjectCol] = {}
                            if (!dataMap[subjectCol][subjectValue])
                                dataMap[subjectCol][subjectValue] = {}
                            if (!dataMap[subjectCol][subjectValue][objectCol])
                                dataMap[subjectCol][subjectValue][objectCol] = []
                            dataMap[subjectCol][subjectValue][objectCol].push(objectValue)
                            //  console.log( JSON.stringify(dataMap[subjectCol]))


                        })

                    }

                })

            //    console.log(JSON.stringify(dataMap, null, 2))
                var dataArray = [];
                /*   for( var subjectCol in dataMap){
                       var cols=[]
                       for( var subjectValue in dataMap[subjectCol]){
                          Object.keys(dataMap[subjectCol][subjectValue]).forEach(function(col){
                              if(cols.indexOf(col)<0)
                                  cols.push(col)
                           })
                   }*/

                var subjectDataArray = []
                for (var subjectCol in dataMap) {
                    for (var subjectValue in dataMap[subjectCol]) {


                        for (var objectCol in dataMap[subjectCol][subjectValue]) {
                            var valuesArray = dataMap[subjectCol][subjectValue][objectCol]

                                valuesArray.forEach(function (value) {
                                    var obj = {[subjectCol]: subjectValue}
                                    obj[objectCol] = value
                                    dataArray.push(obj)
                                })

                        }
                    }

                }


            mappings.mappings.forEach(function(mapping){
                if(mapping.subject.indexOf("http")<0)
                    mapping.subject=mapping.subject.split(".")[1]
                if(mapping.object.indexOf("http")<0)
                    mapping.object=mapping.object.split(".")[1]
            })

            mappings.mappings.sort(function(a,b){
                var p=a.predicate.indexOf("#type");
                var q=b.predicate.indexOf("#type");
                if(p<q)
                    return 1;
                if(p>q)
                    return -1;
                return 0;

            })


            mappingSheets.forEach(function (sheet) {
                    triplesGenerator.generateSheetDataTriples(mappings.mappings, dataArray, uriPrefix, options, function (err, triples) {
                        if (err)
                            return callback(err)


                        allTriples = allTriples.concat(triples)

                        function triplesToNt(triples) {
                            var str = ""
                            triples.forEach(function (item) {
                                str += "<" + item.subject + "> <" + item.predicate + "> "
                                if (item.object.indexOf("http") == 0)
                                    str += "<" + item.object + ">"
                                else
                                    str += item.object;
                                str += " .\n"

                            })
                            return str;
                        }


                        if (options.output && options.output == "ntTriples") {
                            return callback(null, triplesToNt(allTriples))
                        }
                        return callback(null, allTriples)


                    })
                })
            }
        )


    }
    , getWorkbookModel: function (filePath, callback) {
        xlsx2json.getWorkbookModel(filePath, callback)
    }


}

module.exports = triplesGenerator;

if (true) {
    var xlsxPath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\TO-G-6010A FJ-BC.XLSX"
    var mappings = {

        "mappings": [{
            "subject": "Tag.TagNumber",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        }, {
            "subject": "TagtoTag.LinkTagID_Lookup",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        }, {
            "subject": "TagtoAttributes.AttributeID",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute"
        }, {
            "subject": "Tag.FunctionalClassID",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://standards.iso.org/iso/15926/part14/FunctionalObject"
        }, {"subject": "Tag.TagNumber", "predicate": "http://standards.iso.org/iso/15926/part14/represents", "object": "Tag.FunctionalClassID"}, {
            "subject": "Tag.TagNumber",
            "predicate": "http://data.total.com/resource/one-model/ontology#TOTAL-hasAttribute",
            "object": "TagtoAttributes.AttributeID"
        }, {"subject": "Tag.TagNumber", "predicate": "http://standards.iso.org/iso/15926/part14/functionalPartOf", "object": "TagtoTag.LinkTagID_Lookup"}],
        "sheetJoinColumns": {
            "Tag.TagNumber": ["TagtoTag.PrimaryTagID_Lookup", "TagtoAttributes.TAG_Ref"],
            "TagtoTag.PrimaryTagID_Lookup": ["Tag.TagNumber"],
            "TagtoAttributes.TAG_Ref": ["Tag.TagNumber"]
        }

    }
    var options = {generateIds: 15, output: "ntTriples"}
    var uriPrefix = "http://data.total.com/resource/one-model/ontology#"
    triplesGenerator.generateXlsxBookTriples(mappings, xlsxPath, uriPrefix, options, function (err, result) {
        if (err)
            return console.log(err);
        return fs.writeFileSync(xlsxPath + "_triples.nt", result)

    })
}
