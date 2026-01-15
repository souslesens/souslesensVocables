/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import fs from 'fs';

import XLSX from 'xlsx';
import async from 'async';
var xlsx2json = {
    parse: function (filePath, options, callback) {
        if (!options) options = {};
        var sheets = {};
        var allData = {};
        var allModel = {};
        async.series(
            [
                function (callbackSeries) {
                    var workbook = XLSX.readFile(filePath);

                    var sheet_name_list;
                    if (options.sheets) sheet_name_list = options.sheets;
                    else sheet_name_list = workbook.SheetNames;

                    sheet_name_list.forEach(function (sheetName, sheetIndex) {
                        if (!options.firstSheetNumber || sheetIndex >= options.firstSheetNumber - 1) sheets[sheetName] = workbook.Sheets[sheetName];
                    });
                    callbackSeries();
                },
                function (callbackSeries) {
                    allData = {};

                    for (var sheetKey in sheets) {
                        console.log("processing " + sheetKey);
                        var worksheet = sheets[sheetKey];
                        var dataArray = [];

                        var header = [];
                        var data = [];
                        var ref = worksheet["!ref"];
                        var range = /([A-Z])+([0-9]+):([A-Z]+)([0-9]+)/.exec(ref);

                        if (!range || range.length < 2)
                            // feuille vide
                            return callbackSeries(null, null);
                        var lineDebut = range[2];
                        var lineFin = range[4];
                        var colFin = range[3];
                        var colNames = [];
                        for (let j = 65; j < 120; j++) {
                            var colName;
                            if (j <= 90) colName = String.fromCharCode(j);
                            else colName = "A" + String.fromCharCode(j - 26);

                            colNames.push(colName);
                            if (colName == colFin) break;
                        }

                        if (options.firstLineNumber) lineDebut = options.firstLineNumber;
                        for (let i = lineDebut; i <= lineFin; i++) {
                            for (let j = 0; j < colNames.length; j++) {
                                var key = colNames[j] + i;

                                if (!worksheet[key]) {
                                    continue;
                                }
                                var value = worksheet[key].v;
                                if (i == lineDebut) header.push(value);
                                else {
                                    if (j == 0) {
                                        data[i] = {};
                                    }

                                    if (!data[i]) {
                                        continue;
                                    }
                                    data[i][header[j]] = value;
                                }
                            }
                            if (options.modelOnly) {
                                break;
                            }
                        }

                        for (var akey in data) {
                            dataArray.push(data[akey]);
                        }

                        allData[sheetKey] = dataArray;
                        allModel[sheetKey] = header;

                        /*     console.log("saving " + filePath.replace(/\.xlsx/i, "json"))
                    var str = JSON.stringify(allData[sheetKey], null, 2)
                    var xx = filePath.replace(/\.xlsx/i, "_") + sheetKey + ".json"
                    fs.writeFileSync(filePath.replace(/\.xlsx/i, "_") + sheetKey + ".json", str)
                    console.log("done")*/
                    }
                    callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    if (!callback) {
                        console.log(err);
                    } else callback(err);
                }

                if (!callback) {
                    console.log("done");
                    console.log("saving " + filePath.replace(/\.xlsx/i, "model.json"));
                    var str = JSON.stringify(allModel, null, 2);

                    fs.writeFileSync(filePath.replace(/\.xlsx/i, "model.json"), str);
                    console.log("done");
                } else return callback(null, { model: allModel, data: allData });
            },
        );
    },
    getWorkbookModel: function (filePath, callback) {
        xlsx2json.parse(filePath, { modelOnly: 1 }, callback);
    },
};

export default xlsx2json;