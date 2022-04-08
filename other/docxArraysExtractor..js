var fs = require("fs");
var sax = require("sax");
var async = require("async");
var docxArraysExtractor = {
    readJson: function (filePath, callback) {
        var headers = [];
        var dataArray = [];
        try {
            var str = "" + fs.readFileSync(filePath);
            dataArray = JSON.parse(str);
        } catch (e) {
            return callback(e);
        }
        dataArray.forEach(function (line) {
            Object.keys(line).forEach(function (key) {
                if (headers.indexOf(key) < 0) headers.push(key);
            });
        });
        return callback(null, { headers: headers, data: dataArray });
    },

    testJson: function (filePath, _callback) {
        docxArraysExtractor.readJson(filePath, function (err, result) {});
    },

    parseXml: function (filePath, options, callback) {
        var saxStream = sax.createStream(false);

        var tables = [];

        var currentTable = null;
        var currentRow = null;
        var currentCell = null;
        var currentTableTitle = "";
        var line = 0;
        saxStream.on("error", function (e) {
            console.error("error!", e);
            // clear the error
            this._parser.error = null;
            this._parser.resume();
        });

        saxStream.on("opentag", function (node) {
            line++;
            if (line % 10000 == 0) console.log(line);
            //  console.log(node.name)
            //  var name = node.attributes["NAME"];

            if (node.name == "W:TBL") {
                currentTable = [];
                if (currentTableTitle) currentTable.title = currentTableTitle;
            }

            if (node.name == "W:TR") {
                if (currentTable) currentRow = [];
            }
            if (node.name == "W:TC") {
                if (currentRow) currentCell = "";
            }

            if (node.name == "W:T") {
                //   currenText="";
            }
        });

        saxStream.on("text", function (text) {
            currentTableTitle = text;

            if (currentCell !== null) {
                if (text && text != "\n" && currentCell.indexOf(text) < 0) currentCell += text;
            }
        });

        saxStream.on("closetag", function (node) {
            // var name = node.attributes["NAME"]

            if (node == "W:TBL") {
                tables.push(currentTable);
            }

            if (node == "W:TR") {
                currentTable.push(currentRow);
                currentRow = null;
            }
            if (node == "W:TC") {
                var str = currentCell.replace(/[\n\t\r]/g, "");
                if (currentRow && currentRow.push) {
                    str = str.trim();
                    str = str.replace(/ {2}/g, "");
                    currentRow.push(str);
                }
            }
        });

        saxStream.on("end", function (_node) {
            callback(null, tables);
        });

        fs.createReadStream(filePath).pipe(saxStream);
    },

    rowsToCSVtable: function (rows) {
        var str = "";
        rows.forEach(function (row) {
            row.forEach(function (cell, indexCell) {
                if (indexCell > 0) str += "\t";
                str += cell; //.replace(/[\n\t\r]/g, "")
                //   str += "\""+cell+"\""
            });
            str += "\n";
        });
        return str;
    },

    //complete les cellules vides des 3 premieres colonnnes
    fillArrayEmptyCells: function (array) {
        array.forEach(function (row, rowIndex) {
            row.forEach(function (cell, indexCell) {
                if (rowIndex > 1 && indexCell < 3) {
                    if (cell == "") array[rowIndex][indexCell] = array[rowIndex - 1][indexCell];
                }
            });
        });
        return array;
    },

    testTextTree: function (filename) {
        const fs = require("fs");
        const readline = require("readline");
        var maxLines = 10000;
        count = 0;
        var start = false;

        async function processLineByLine() {
            const fileStream = fs.createReadStream(filename);

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity,
            });
            // Note: we use the crlfDelay option to recognize all instances of CR LF
            // ('\r\n') in input.txt as a single line break.

            for await (const line of rl) {
                if (line.indexOf("1101-AFRique") > -1) start = true;

                // Each line in input.txt will be successively available here as `line`.
                //   var array=line.split("│");
                if (start) {
                    if (line.indexOf(".") < 0 && line.indexOf("JPG") < 0) console.log(line);
                }
                //console.log(JSON.stringify(array))
                //  console.log(`Line from file: ${line}`);
            }
        }

        processLineByLine();
    },
    buildParts: function (treeDirPath, openXmlFilePath) {
        var tableArray = null;
        var treeDirJson = null;
        var str = "";

        //  var colNames = ['n1', 'n2', 'n3', 'contenu', 'auteur', 'remarques', 'x', 'debut', 'fin', 'C', 'P', 'R']

        async.series(
            [
                //load dirTree
                function (callbackSeries) {
                    docxArraysExtractor.readJson(treeDirPath, function (err, result) {
                        if (err) return callbackSeries(err);
                        callbackSeries();
                    });
                },

                //parse doc arrays
                function (callbackSeries) {
                    docxArraysExtractor.parseXml(openXmlFilePath, function (err, result) {
                        if (err) return callbackSeries(err);
                        tableArray = result;
                        callbackSeries();
                    });
                },

                //make csv
                function (callbackSeries) {
                    tableArray.forEach(function (array, arrayIndex) {
                        str += "\n";
                        str += "-------- " + array.title + "-----------\n";
                        array.forEach(function (line, lineIndex) {
                            str += arrayIndex + "\t";
                            if (!Array.isArray(line)) return;
                            line.forEach(function (cell, cellIndex) {
                                if (lineIndex > 2) {
                                    if (cell == "") cell = array[lineIndex - 1][cellIndex];
                                }
                                str += cell + "\t";
                            });
                            str += "\n";
                        });
                    });

                    fs.writeFileSync(openXmlFilePath + ".csv", str);

                    callbackSeries();
                },
            ],

            function (err) {
                if (err) return console.log(err);
                //  fs.writeFileSync(filePath + ".csv", csv)
                return console.log("DONE");
            }
        );
    },
};

module.exports = docxArraysExtractor;

var openXmlFilePath = "D:\\NLP\\ontologies\\14224\\ISO14224_Datacollection-oilandgas\\word\\document.xml";
//var openXmlFilePath = "D:\\NLP\\ontologies\\ISO 81346\\ISO IEC 81346-1 (1)\\word\\document.xml";

var openXmlFilePath = "D:\\NLP\\ontologies\\ISO 81346\\part10.xml";
var openXmlFilePath = "D:\\NLP\\ontologies\\ISO 81346\\81346-2-2022.xml";
var openXmlFilePath = "D:\\NLP\\ontologies\\ISO 81346\\ISOIEC-81346-2_2019.xml";
var openXmlFilePath = "D:\\NLP\\ontologies\\ISO 81346\\ISOIEC-81346-12_2018.xml";
var openXmlFilePath = "D:\\NLP\\ontologies\\ISO 81346\\RDS-OG Library.xml";

var openXmlFilePath = "D:\\NLP\\ontologies\\15663\\document.xml";

options = {
    rotate: false,
};

docxArraysExtractor.parseXml(openXmlFilePath, options, function (err, result) {
    var str = "";
    if (options.rotate) {
        result.forEach(function (array, _arrayIndex) {
            var colsMap = {};
            array.forEach(function (line, _lineIndex) {
                if (line) {
                    line.forEach(function (cell, cellIndex) {
                        var X = "K" + cellIndex;
                        if (!colsMap[X]) colsMap[X] = "";
                        colsMap[X] = (cell ? cell.trim() : "") + "\t" + colsMap[X];
                    });
                }
            });

            for (var key in colsMap) {
                str += colsMap[key] + "\n";
            }
        });
    } else {
        result.forEach(function (array, arrayIndex) {
            str += "\n";
            str += "-------- " + array.title + "-----------\n";
            array.forEach(function (line, lineIndex) {
                str += arrayIndex + "\t";
                if (!Array.isArray(line)) return;
                line.forEach(function (cell, cellIndex) {
                    if (lineIndex > 2) {
                        if (cell == "" && array[lineIndex - 1]) cell = array[lineIndex - 1][cellIndex];
                    }
                    str += cell ? cell.trim() : "" + "\t";
                });
                str += "\n";
            });
        });
    }

    fs.writeFileSync(openXmlFilePath + "R.csv", str);
});
