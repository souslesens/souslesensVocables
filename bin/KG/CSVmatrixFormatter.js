import fs from "fs";
import async from "async";
import csv from "csv-parser";

var CSVmatrixFormatter = {
    transform: function (filePath, columnsFields, callback) {
        var data, headers;
        async.series(
            [
                // load csv
                function (callbackSeries) {
                    CSVmatrixFormatter.readCsv(filePath, ";", 500000, function (err, result) {
                        if (err) return callbackSeries(err);
                         data = result.data;
                         headers = result.headers;
                        console.log(filePath);
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var allArray = [];

                    data[0].forEach(function (line, lineIndex) {
                        var lineStr = "";
                        columnsFields.forEach(function (col) {
                            lineStr += line[col] + "\t";
                        });
                        allArray.push(lineStr);
                    });

                    var allArray2 = [];
                    data[0].forEach(function (line, lineIndex) {
                        headers.forEach(function (header, headerIndex) {
                            if (columnsFields.indexOf(header) < 0) {
                                if (header && line[header]) allArray2.push(allArray[lineIndex] + header);
                            }
                        });
                    });
                    var str = "";
                    columnsFields.forEach(function (col) {
                        str += col + "\t";
                    });
                    str += "value+\n";
                    allArray2.forEach(function (line) {
                        str += line + "\n";
                    });
                    fs.writeFileSync(filePath.replace(".csv", "_normalized.csv"), str);

                    var x = allArray2;
                },
            ],
            function (err) {
                return callback(err);
            },
        );
    },
    readCsv: function (filePath, separator, lines, callback) {
        if (!fs.existsSync(filePath)) return callback("file does not exists :" + filePath);

        var headers = [];
        var jsonData = [];
        var jsonDataFetch = [];
        fs.createReadStream(filePath).pipe(
            csv({
                separator: separator,
                mapHeaders: function (header, index) {
                    headers.push(header.header);
                    return header.header;
                },
            })
                .on("header", function (header) {
                    //  headers.push(header);
                })

                .on("data", function (data) {
                    var emptyLine = true;
                    for (var i = 0; i < headers.length; i++) {
                        if (data[headers[i]]) {
                            emptyLine = false;
                            break;
                        }
                    }
                    if (emptyLine) return;

                    jsonDataFetch.push(data);

                    if (lines && jsonDataFetch.length >= lines) {
                        jsonData.push(jsonDataFetch);
                        jsonDataFetch = [];
                    }
                })
                .on("end", function () {
                    jsonData.push(jsonDataFetch);
                    return callback(null, { headers: headers, data: jsonData });
                })
                .on("error", function (error) {
                    var x = error;
                    return callback(error);
                }),
        );
    },
};

export default CSVmatrixFormatter;
CSVmatrixFormatter.transform("D:\\webstorm\\souslesensVocables\\data\\CSV\\UNIK\\fluidDesignCapacities.csv", ["fluid", "designCapacity"], function (err) {});
