var fs = require('fs');

const async = require('async');
const XLSX = require('xlsx');


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
                callbackSeries(null, sheets)

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


                    if(sheetKey!="tblMappingSourceDetails")
                    allData[sheetKey]=dataArray
                    allModel[sheetKey]=header

                }
                callbackSeries()

            }
        ], function (err) {
            var x = allData;
            var str=JSON.stringify(allData,null,2)
            fs.writeFileSync(filePath.replace("xlsx","json"),str)
            var str=JSON.stringify(allModel,null,2)
            fs.writeFileSync(filePath.replace("xlsx","model.json"),str)

        })

    }


}
module.exports = parseXlsx
parseXlsx.parse("D:\\NLP\\ontologies\\quantum\\MDM Rev 4 SQL export_03122020.xlsx")
