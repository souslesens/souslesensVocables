var fs = require('fs')
var path = require('path')
var csvCrawler = require('../bin/_csvCrawler.')
var async = require('async')


var rootDir = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS V1.5\\CFIHOS V1.5 RDL"
var CFIHOS_processor = {


    readCsv: function (filePath, callback) {
        csvCrawler.readCsv({filePath: filePath}, 500000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            return callback(null, {headers: headers, data: data});
        });


    },

    getDescription: function () {

        var descriptionMap = {}

        var files = fs.readdirSync(rootDir)
        async.eachSeries(files, function (file, callbackSeries) {

            var filePath = rootDir + path.sep + file
            var array = /CFIHOS (.*) v1.5.csv/.exec(file)
            if (!array)
                return callbackSeries(filePath)
            var fileName = array[1]
            CFIHOS_processor.readCsv(filePath, function (err, result) {
                descriptionMap[fileName] = {filePath: filePath, headers: result.headers, length: result.data[0].length}
                callbackSeries()
            })


        }, function (err) {
            fs.writeFileSync(rootDir + "\\description.json", JSON.stringify(descriptionMap, null, 2))
            //  console.log(JSON.stringify(descriptionMap,null,2))
        })


    },


    processSubClasses: function ([mappings]) {
        async.eachSeries(mappings, function (mapping, callbackEach) {

            var fileName = mapping.fileName
            var filePath = rootDir + path.sep + fileName
            CFIHOS_processor.readCsv(filePath, function (err, result) {
                var triples = [];
                var lines = result.data[0]
                lines.forEach(function (line) {
                    mapping.tripleModels.forEach(function (item) {
                        if (line[item.s] && line[item.o]) {
                            triples.push({
                                s: line[s],
                                p: item.p,
                                o: line[o]
                            })


                        }
                    })


                })
                var x= triples
                callbackEach()
            })


        }, function (err) {

        })
    }




}
CFIHOS_processor.getDescription()


var mappings = []
mappings.push({
    superClass: "https://www.jip36-cfihos.org/ontology/cfihos_1_5/EAID_5268652B_AF60_42ad_B623_1B3550E747BA",
    fileName: "CFIHOS tag class v1.5.csv",
    tripleModels: [{s: "tagClassName", p: "rdfs:subClassOf", o: "parentTagClassName"},
        {s: "cFIHOSUniqueId", p: "rdfs:label", o: "tagClassName"},
        {s: "cFIHOSUniqueId", p: "http://www.w3.org/2004/02/skos/core#definition", o: "tagClassDefinition"},
        {s: "cFIHOSUniqueId", p: "rdfs:subClassOf:", o: "tagClassDefinition"},
    ]

})

CFIHOS_processor.processSubClasses(mappings)