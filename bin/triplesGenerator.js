var fs = require("fs")

const util = require('./skosConverters/util.')
const xlsx2json = require('./xlsx2json.')

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
                var predicateUri = item[mapping.predicate]
                var objectValue = item[mapping.object]


                if (!subjectValue )
                    return console.log("missing   field at line " + index);

                var subjectUri
                if (options.generateIds) {
                    if (!idsMap[subjectValue])
                        idsMap[subjectValue] = util.getRandomHexaId(options.generateIds)
                    subjectUri = uriPrefix + idsMap[subjectValue]
                } else {
                    subjectUri = uriPrefix + util.formatStringForTriple(subjectUri, true)
                }


                var objectValue;
                if(mapping.object=="TagtoAttributes.Attributes")
                    var x=3
                if (mapping.object.indexOf("http") == 0) {
                    objectValue = mapping.object;
                } else {
                    objectValue = item[mapping.object]
                    var objectSuffix = ""
                    // if(util.isInt(objectValue))
                    if (!isNaN(objectValue))
                        objectSuffix = "^^xsd:integer"
                    if (util.isFloat(objectValue))
                        objectSuffix = "^^xsd:float"
                    objectValue = "'" + objectValue + "'" + objectSuffix;
                }

                triples.push({subject: subjectUri, predicate: predicateUri, object: objectValue})

            })
        })
        callback(null, triples)


    },

    generateXlsxBookTriples: function (mappings, xlsxFilePath, uriPrefix, options, callback) {
        if (!options)
            options = {}

     var mappingSheets = []
        mappings.forEach(function (mapping) {
            var sheet = mapping.subject.split(".")[0]
            if (mappingSheets.indexOf(sheet) < 0) {
                mappingSheets.push(sheet)
            }
        })
        xlsx2json.parse(xlsxFilePath, {sheets: mappingSheets}, function (err, result) {

            if (err)
                return callback(err)
            var allTriples = [];
          ///  var mappingData=[]

            /*    result.data[sheet].forEach(function (line) {
                    var prefixedLine = {}
                    for (var key in line) {
                        prefixedLine[sheet + "." + key] = line[key]
                    }
                    mappingData.push(prefixedLine)

                })
            })*/
                mappingSheets.forEach(function (sheet) {
                triplesGenerator.generateSheetDataTriples(mappings, result[sheet], uriPrefix, options, function (err, triples) {
                    if (err)
                        return callback(err)


                    allTriples = allTriples.concat(triples)

                    function triplesToNt(triples) {
                        var str = ""
                        triples.forEach(function (item) {
                            str += "<" + item.subject + " <" + item.predicate + "> "
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
        })

    }
    , getWorkbookModel: function (filePath, callback) {
        xlsx2json.getWorkbookModel(filePath, callback)
    }


}

module.exports = triplesGenerator;

if (false) {

    var model = [
        {
            "subject": "Tag.ID",
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "object": "http://data.total.com/resource/one-model/ontology#Tag"
        },
        {
            "subject": "Tag.ID",
            "predicate": "http://www.w3.org/2000/01/rdf-schema#label",
            "object": "Tag.TagNumber"
        },
        {
            "subject": "Tag.ID",
            "predicate": "http://data.total.com/resource/one-model/ontology#concretize",
            "object": "http://data.total.com/resource/one-model/ontology#Equipment"
        }
    ]

    var dataPath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\TO-G-6010A FJ-BC_Tag.json"
    var data = JSON.parse(fs.readFileSync(dataPath));
    var options = {generateIds: 15}
    var uriPrefix = "http://data.total.com/resource/one-model/ontology#"
    triplesGenerator.generateTriples(model, data, uriPrefix, options, function (err, result) {
        if (err)
            return console.log(err)
        var x = result;

    })


}
if (false) {
    var xlsxPath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\TO-G-6010A FJ-BC.XLSX"
    var mappings = [{
        "subject": "Tag.ID",
        "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        "object": "http://data.total.com/resource/one-model/ontology#Tag"
    }, {
        "subject": "TagtoAttributes.Attributes",
        "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        "object":  "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute"
    },
        {"subject": "Tag.ID", "predicate": "http://data.total.com/resource/one-model/ontology#TOTAL-hasAttribute", "object": "TagtoAttributes.Attributes"}]
    var options = {generateIds: 15, output: "ntTriples"}
    var uriPrefix = "http://data.total.com/resource/one-model/ontology#"
    triplesGenerator.generateXlsxBookTriples(mappings, xlsxPath, uriPrefix, options, function (err, result) {
        if (err)
            return console.log(err);
        return fs.writeFileSync(xlsxPath + "_triples.nt", result)

    })
}
