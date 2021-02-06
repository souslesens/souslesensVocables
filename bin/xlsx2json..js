const XLSX = require('xlsx');
const async=require('async')
var xlsx2json={

    parse: function (filePath, options, callback) {
        if(!options)
            options={}
        var sheets = {};
        var allData = {};
        var allModel = {};
        var jsonArrayQuantum = [];
        async.series([
            function (callbackSeries) {
                var workbook = XLSX.readFile(filePath);

                var sheet_name_list
                if(options.sheets)
                    sheet_name_list=options.sheets
                else
                   sheet_name_list = workbook.SheetNames;

                sheet_name_list.forEach(function (sheetName, sheetIndex) {
                    if (!options.firstSheetNumber || sheetIndex >= options.firstSheetNumber - 1)
                        sheets[sheetName] = workbook.Sheets[sheetName];
                })
                callbackSeries()

            },
            function (callbackSeries) {
                allData = {}



                for (var sheetKey in sheets) {
                    console.log("processing " + sheetKey)
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


                    if (options.firstLineNumber)
                        lineDebut = options.firstLineNumber
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
                        if(options.modelOnly){
                            break;
                        }
                    }

                    for (var key in data) {
                        dataArray.push(data[key]);
                    }


                    allData[sheetKey] = dataArray
                    allModel[sheetKey] = header

               /*     console.log("saving " + filePath.replace(/\.xlsx/i, "json"))
                    var str = JSON.stringify(allData[sheetKey], null, 2)
                    var xx = filePath.replace(/\.xlsx/i, "_") + sheetKey + ".json"
                    fs.writeFileSync(filePath.replace(/\.xlsx/i, "_") + sheetKey + ".json", str)
                    console.log("done")*/

                }
                callbackSeries();

            }
        ], function (err) {
            if (err) {
                if (!callback) {
                    console.log(err)
                } else
                    callback(err);
            }


            if (!callback) {
                console.log("done")
                var x = allData;
                console.log("saving " + filePath.replace(/\.xlsx/i, "model.json"))
                var str = JSON.stringify(allModel, null, 2)

                fs.writeFileSync(filePath.replace(/\.xlsx/i, "model.json"), str)
                console.log("done")
            } else
                return callback(null, {model: allModel, data: allData})


        })

    },
    getWorkbookModel:function(filePath,  callback){
        xlsx2json.parse(filePath,{modelOnly:1},callback)
    }


}

module.exports=xlsx2json
