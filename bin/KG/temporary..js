const xlsx2json = require("../xlsx2json.");
const fs = require("fs");

var xlsxFilePath = "D:\\NLP\\ontologies\\ONE MODEL\\dictionary2.xlsx";
//var xlsxFilePath="D:\\NLP\\ontologies\\dictionaryExample.xlsx"
xlsx2json.parse(xlsxFilePath, null, function (_err, result) {
    var columns = result.model["disciplines"];
    var str = "";
    for (var sheet in result.data) {
        result.data[sheet].forEach(function (line) {
            var lineStr = "";
            columns.forEach(function (column, _index) {
                if (lineStr != "") lineStr += "\t";
                var value = line[column];
                if (!value) value = "";
                lineStr += value;
            });
            str += lineStr + "\n";
        });
    }
    fs.writeFileSync(xlsxFilePath.replace("xlsx", "txt"), str);
});
