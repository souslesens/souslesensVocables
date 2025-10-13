const fs = require("fs");
const csv = require("csv-parser");
const util = require("./util.");

var SQLutil = {
    csvToJson: function (csvFilePath, sliceLength, callback) {
        if (!fs.existsSync(csvFilePath)) return callback("file does not exists :" + csvFilePath);
        util.getCsvFileSeparator(csvFilePath, function (separator) {
            if (!separator) return callback("unable to determine column separator");
            //  var separator="\t"
            var headers = [];
            var jsonData = [];
            var jsonDataFetch = [];
            var linesCount = 0;
            fs.createReadStream(csvFilePath).pipe(
                csv({
                    separator: separator,
                    mapHeaders: ({ header }) => util.normalizeHeader(headers, header),
                })
                    .on("header", function (header) {
                        headers.push(header);
                    })

                    .on("data", function (data) {
                        if (linesCount++ % 1000 == 0) console.log(linesCount);

                        jsonDataFetch.push(data);

                        if (sliceLength && jsonDataFetch.length >= sliceLength) {
                            jsonData.push(jsonDataFetch);
                            jsonDataFetch = [];
                        }
                    })
                    .on("end", function () {
                        jsonData.push(jsonDataFetch);
                        return callback(null, { headers: headers, data: jsonData });
                    })
                    .on("error", function (error) {
                        callback(error);
                    }),
            );
        });
    },

    createTableFromCsv: function (connection, dbName, tableName, csvFilePath) {
        SQLutil.csvToJson(csvFilePath, 1000, function (err, result) {
            var columns = {};

            var insertStr = "";
            result.data[0].forEach(function (item, index) {
                if (index > 0) insertStr += ",";
                insertStr += "(";
                result.headers.forEach(function (header, indexHeader) {
                    if (indexHeader > 0) insertStr += ",";
                    var value = item[header];
                    var type;
                    if (!value || value == "") {
                        insertStr += "NULL";
                    }

                    if (util.isInt(value)) {
                        type = "int";
                        insertStr += value;
                    } else if (util.isFloat(value)) {
                        type = "float";
                        insertStr += value;
                    } else {
                        type = "varchar";
                        if (value && value != "") insertStr += "'" + value.replace(/'/g, "") + "'";
                    }
                    if (!columns[header]) columns[header] = { type: type, length: 0 };
                    else if (type != columns[header].type) {
                        console.log(type + "#" + columns[header].type + "------ line " + index);
                    }
                    if (columns[header].type == "varchar") {
                        var length = Math.max(value.length, columns[header].length);
                        columns[header].length = length;
                    }
                });
                insertStr += ")\n";
            });
            var CreateTableStr = "CREATE TABLE " + tableName + " (";
            var index = 0;
            for (var key in columns) {
                var column = columns[key];
                if (index++ > 0) CreateTableStr += ",";
                var typeStr = column.type;
                if (column.type == "varchar") typeStr += "(" + (column.length + 10) + ")";
                CreateTableStr += key + " " + typeStr + "\n";
            }
            CreateTableStr += ")";

            insertStr = "INSERT into " + tableName + " VALUES \n" + insertStr + "\n";
            var str = "";
            var dropTable = true;
            if (dropTable) str = "DROP TABLE " + tableName + ";";
            str += CreateTableStr + ";\n" + insertStr + ";";

            fs.writeFileSync(csvFilePath + ".sql", str);
            //  console.log(CreateTableStr+"\n"+insertStr)
            //
        });
    },

    escapeMySqlChars: function (str) {
        //console.log(str)
        if (typeof str != "string") return str;

        str = str.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, function (char) {
            switch (char) {
                case "\0":
                    return "\\0";
                case "\x08":
                    return "\\b";
                case "\x09":
                    return "\\t";
                case "\x1a":
                    return "\\z";
                case "\n":
                    return "\\n";
                case "\r":
                    return "\\r";
                case '"':
                case "'":
                case "\\":
                case "%":
                    return "\\" + char; // prepends a backslash to backslash, percent,
                // and double/single quotes
            }
        });

        str = str.replace(/[«»<=>]/g, function (char) {
            return "\\" + char;
        });
        //  console.log(str)
        return str;
    },
    getFieldType: function (table, _field) {
        var type = "";
        if (!table || !context.dataModel[table]) return "string";

        if (!table) table = context.currentTable;

        context.dataModel[table].forEach(function (field) {
            if (field.name == _field) type = field.dataType;
        });

        if (numberTypes.indexOf(type) > -1) return "number";

        if (stringTypes.indexOf(type) > -1) return "string";

        return type;
    },
};

module.exports = SQLutil;

// SQLutil.createTableFromCsv(null, "", "testX", "C:\\Users\\claud\\Downloads\\TAG_PI&FL_CLV_2.csv", function (err, result) {});
if (true) {
    SQLutil.createTableFromCsv(null, "", "TEPDK_ADL_tblTag", "D:\\NLP\\ontologies\\TEPDK2\\OnePulse\\TEPDK_ADL_tblTag.csv", function (err, result) {});
}
