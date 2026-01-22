import csvCrawler from "../bin/_csvCrawler.js";
import util from "./util.js";
import async from "async";
import sql from "./KG/SQLserverConnector.js";
const Csv2Sql = {
    readCsv: function (filePath, lines, callback) {
        csvCrawler.readCsv({ filePath: filePath }, 500000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            return callback(null, { headers: headers, data: data });
        });
    },

    getColumns: function (filePath, tableName, callback) {
        Csv2Sql.readCsv(filePath, 1000, function (err, result) {
            if (err) return callback(err);
            var fields = {};
            var maxStringLength = 1;

            result.headers.forEach(function (header) {
                if (header != "")
                    if (!fields[header]) {
                        result.data.forEach(function (slice) {
                            slice.forEach(function (line) {
                                if (fields[header]) return;
                                if (util.isFloat(line[header])) fields[header] = { type: "float" };
                                else if (util.isInt(line[header])) fields[header] = { type: "integer" };
                                else
                                    fields[header] = {
                                        type: "string",
                                        length: Math.max(maxStringLength, line[header].length),
                                    };
                            });
                        });
                    }
            });

            result.headers.forEach(function (header) {
                if (header == "") return;
                var colName = header.replace(/ ([a-z])/, "$1");
                colName = util.formatStringForTriple(colName);
                fields[header].colName = colName;
            });

            var sqlSrt = "CREATE TABLE " + tableName + " (";
            var length = 256; //(fields[header].length+5)
            result.headers.forEach(function (header) {
                if (header == "") return;
                sqlSrt += fields[header].colName;
                var type = fields[header].type;
                if (type == "float") sqlSrt += " FLOAT";
                if (type == "integer") sqlSrt += " INT";
                if (type == "string") sqlSrt += " VARCHAR(" + length + ")";

                sqlSrt += ",";
            });

            sqlSrt += ")";

            callback(null, { createSql: sqlSrt, fieldsDecription: fields });
        });
    },

    getInsert: function (filePath, dbName, tableName, fields, callback) {
        Csv2Sql.readCsv(filePath, 1000, function (err, result) {
            if (err) return callback(err);
            var sliceIndex = 0;
            var totalRecords = 0;
            var sliceSize = 100;
            var slices = util.sliceArray(result.data[0], sliceSize);

            async.eachSeries(
                slices,
                function (slice, callbackEach) {
                    //  slices.forEach(function (slice, sliceIndex) {
                    var insertStr = "INSERT INTO " + tableName + " (";
                    result.headers.forEach(function (header, index) {
                        if (header == "") return;
                        if (index > 0) insertStr += ",";
                        insertStr += fields[header].colName;
                    });
                    insertStr += ") ";
                    insertStr += " VALUES  ";

                    slice.forEach(function (line, lineIndex) {
                        if (sliceIndex == 0 && lineIndex == 0) return;

                        insertStr += "(";
                        result.headers.forEach(function (header, headerIndex) {
                            if (header == "") return;
                            if (headerIndex > 0) insertStr += ",";
                            var value = line[header];
                            if (!value) value = "";
                            if (fields[header].type == "string") value = "'" + value.replace(/'/g, "_") + "'";
                            if (!value) value = null;

                            insertStr += value;
                        });
                        insertStr += "),";
                    });
                    insertStr = insertStr.substring(0, insertStr.length - 1);

                    sql.getData(dbName, insertStr, function (err, _result) {
                        if (err) {
                            console.log("error slice " + sliceIndex + "  " + err);
                            return callbackEach();
                        }

                        var totalRecords = sliceIndex * sliceSize;
                        console.log("records inserted :" + totalRecords);

                        sliceIndex += 1;
                        callbackEach();
                    });
                    //   fs.writeFileSync(input.replace(".csv","_"+sliceIndex+"_insert.sql"),insertStr)
                },
                function (err) {
                    if (err) return console.log(err);
                    console.log("DONE " + totalRecords);
                },
            );

            callback(null);
        });
    },
};
/*
var input = "D:\\NLP\\ontologies\\14224\\girassolExtract.csv";
input = "D:\\NLP\\ontologies\\14224\\data\\girassol.csv";

var tableName = "girassol";

input = "D:\\NLP\\ontologies\\14224\\data\\absheron.txt";
tableName = "absheron";

input = "D:\\NLP\\ontologies\\14224\\mappingISO14224-207.txt";
tableName = "mappingISO14224_207";

input = "D:\\NLP\\ontologies\\14224\\data\\20220111_Girassol SAP Notifications failure analysis.txt";
tableName = "Maintenance_girassol";

input = "D:\\NLP\\ontologies\\14224\\data\\20220111_Girassol SAP Work Orders.txt";
tableName = "Wordorder_girassol";

var input = "D:\\NLP\\ontologies\\Evolen_MOHO-NORTH\\Moho_N_instruments.csv";
var tableName = "instruments";

var input = "D:\\NLP\\ontologies\\Evolen_MOHO-NORTH\\Moho_N_lines.txt";
var tableName = "lines";

var dbName = "evolen";

Csv2Sql.getColumns(input, tableName, function (err, result) {
    Csv2Sql.getInsert(input, dbName, tableName, result.fieldsDecription, function (_err, _result) {
        // Pass
    });
});

*/
