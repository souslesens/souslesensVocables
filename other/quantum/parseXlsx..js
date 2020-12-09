var fs = require('fs');

const async = require('async');
const XLSX = require('xlsx');
const util=require('../../bin/skosConverters/util.')


var parseXlsx = {

    parse: function (filePath) {
        var sheets = {};
        var allData = {};
        var allModel = {};
        var jsonArrayQuantum = [];
        async.series([
            function (callbackSeries) {
                var workbook = XLSX.readFile(filePath);

                var sheet_name_list = workbook.SheetNames;

                sheet_name_list.forEach(function (sheetName) {
                    sheets[sheetName] = workbook.Sheets[sheetName];
                })
                callbackSeries(null, sheetNames)

            },
            function (callbackSeries) {

                for (var sheetKey in sheets) {
                    var worksheet = sheets[sheetKey];
                    var dataArray = [];

                    var header = [];
                    var data = [];
                    var ref = worksheet["!ref"];
                    var range = (/([A-Z])+([0-9]+):([A-Z]+)([0-9]+)/).exec(ref);

                    if (!range || range.length < 2)// feuille vide
                        return callbackSeries(null, null);
                    var lineDebut = range[2];
                    var lineFin = range[4];
                    var colDebut = range[1]
                    var colFin = range[3]
                    var alphabet = "A,";
                    var dbleLetterColName = colFin.length > 1
                    var colNames = [];
                    for (var j = 65; j < 120; j++) {
                        var colName
                        if (j <= 90)
                            colName = String.fromCharCode(j);
                        else
                            colName = "A" + String.fromCharCode(j - 26);


                        colNames.push(colName);
                        if (colName == colFin)
                            break;

                    }

                    for (var i = lineDebut; i <= lineFin; i++) {
                        for (var j = 0; j < colNames.length; j++) {


                            var key = colNames[j] + i;

                            if (!worksheet[key]) {
                                continue;
                            }
                            var value = worksheet[key].v;
                            if (i == lineDebut)
                                header.push(value);
                            else {
                                if (j == 0) {
                                    data[i] = {}
                                }

                                if (!data[i]) {
                                    continue;
                                }
                                data[i][header[j]] = value;

                            }

                        }
                    }

                    for (var key in data) {
                        dataArray.push(data[key]);
                    }


                    if (sheetKey != "tblMappingSourceDetails")
                        allData[sheetKey] = dataArray
                    allModel[sheetKey] = header

                }
                callbackSeries()

            }
        ], function (err) {
            var x = allData;
            var str = JSON.stringify(allData, null, 2)
            fs.writeFileSync(filePath.replace("xlsx", "json"), str)
            var str = JSON.stringify(allModel, null, 2)
            fs.writeFileSync(filePath.replace("xlsx", "model.json"), str)

        })

    }
    , loadSheet: function (filePath, callback) {


    }
    , generateTriples: function ( sheetNames) {
        var graphUrisMap = {
            quantumUri: "http://data.total.com/resource/quantum/vocab#"
        }
        var triplesPath="D:\\NLP\\ontologies\\quantum\\quantumVocabTriples.nt"
        var graphUri = graphUrisMap["quantumUri"]
        var prefixesMap = {
            "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
            "owl": "http://www.w3.org/2002/07/owl#"


        }

        function getUri(str,item,literal) {
            if (str.indexOf("<") == 0)
                return str;
            if (str.indexOf(":") > 0) {
                var array = str.split(":")
                return "<" + prefixesMap[array[0]] + array[1] + ">"

            } else {
                if(literal){
                    return "'"+util.formatStringForTriple(item[str])+"'"
                }else
                return "<" + graphUri + item[str] + ">"
            }

        }

        var configPath = "D:\\GitHub\\souslesensVocables\\other\\quantum\\xlsxQuantumMappings.json"
        var dataJsonPath = "D:\\NLP\\ontologies\\quantum\\MDM Rev 4 SQL export_03122020.json"
        var config = JSON.parse(fs.readFileSync(configPath));

        var data = JSON.parse(fs.readFileSync(dataJsonPath));

        var triples = "";
        async.eachSeries(sheetNames, function (sheetName, callbackEach) {
            var mappings = config[sheetName];
            var sheetData = data[sheetName]

            sheetData.forEach(function (item) {

                for (var field in mappings) {
                    var mapping = mappings[field]
                    if(mapping) {

                        if (typeof mapping === "object") {
                            var s, p, o;


                            if (mapping.s) {
                                s = getUri(mapping.s, item);

                            } else {
                                s = getUri(field, item);
                            }

                            if (mapping.o) {
                                o = getUri(mapping.o, item,mapping.literal);
                            } else {
                                o = getUri(field, item,mapping.literal);
                            }

                            p = getUri(mapping.p, item);

                            triples += s + " " + p + " " + o + ".\n"


                        }
                    }
                }
            })
            callbackEach();

        }, function (err) {

     //  triples+="<http://data.15926.org/lci/ClassOfPhysicalObject> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://www.w3.org/2002/07/owl#Thing>."
         //   triples+="<http://data.15926.org/dm/ClassOfFunctionalObject> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://www.w3.org/2002/07/owl#Thing>"

            fs.writeFileSync(triplesPath,triples)
        })
    }
}


module.exports = parseXlsx
//parseXlsx.parse("D:\\NLP\\ontologies\\quantum\\MDM Rev 4 SQL export_03122020.xlsx")
var sheets = [
    "tblFunctionalClass"
]
parseXlsx.generateTriples(["tblFunctionalClass","tblPhysicalClass"])
