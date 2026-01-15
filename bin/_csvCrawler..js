import async from 'async';
import util from './util.';
import socket from './socketManager.';
import request from 'request';
import fs from 'fs';
import csv from 'csv-parser';
import common from './util.';

var csvCrawler = {
    indexSource: function (config, callback) {
        var data = [];
        var headers = [];
        var bulkStr = "";
        var t0 = new Date();

        var elacticIdsfromHash = false;

        async.series(
            [
                // read csv
                function (callbackseries) {
                    csvCrawler.readCsv(config.connector, 5000000, function (err, result) {
                        if (err) return callbackseries(err);
                        data = result.data;
                        headers = result.headers;
                        return callbackseries();
                    });
                },
                //prepare payload
                function (callbackseries) {
                    var totalLines = 0;
                    async.eachSeries(
                        data,
                        function (dataFetch, callbackEach) {
                            totalLines += dataFetch.length;
                            dataFetch.forEach(function (line, _indexedLine) {
                                var lineContent = "";
                                var record = {};
                                headers.forEach(function (header) {
                                    var key = header;
                                    var value = line[header];
                                    if (!value) return;
                                    if (value == "0000-00-00") return;
                                    lineContent += "[#" + key + "] " + value + " [/#]";
                                    record[key] = value;
                                });
                                record[config.schema.contentField] = lineContent;
                                var incrementRecordId;
                                if (elacticIdsfromHash) incrementRecordId = util.getStringHash(lineContent);
                                else incrementRecordId = common.getRandomHexaId(10);
                                record.incrementRecordId = incrementRecordId;
                                var id = "R" + incrementRecordId;

                                if (config.incrementRecordIds.indexOf(incrementRecordId) < 0) {
                                    bulkStr +=
                                        JSON.stringify({
                                            index: {
                                                _index: config.general.indexName,
                                                _type: config.general.indexName,
                                                _id: id,
                                            },
                                        }) + "\r\n";
                                    bulkStr += JSON.stringify(record) + "\r\n";
                                }
                            });

                            var options = {
                                method: "POST",
                                body: bulkStr,
                                encoding: null,
                                timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                                headers: {
                                    "content-type": "application/json",
                                },
                                url: config.indexation.elasticUrl + "_bulk?refresh=wait_for",
                            };

                            request(options, function (error, response, body) {
                                if (error) {
                                    return callbackEach(error);
                                }
                                const elasticRestProxy = require("./elasticRestProxy..js");
                                elasticRestProxy.checkBulkQueryResponse(body, function (err, _result) {
                                    if (err) return callbackEach(err);
                                    var message = "indexed " + totalLines + " records ";
                                    socket.message(message);
                                    setTimeout(function () {
                                        elasticRestProxy.refreshIndex(config, function (err, _result) {
                                            if (err) return callbackEach(err);
                                            return callbackEach();
                                        });
                                    }, 5000);
                                });
                            });
                        },
                        function (err) {
                            if (err) return callbackseries(err);
                            return callbackseries();
                        },
                    );
                },
            ],
            function (err) {
                if (err) return callback(err);

                var duration = new Date().getTime() - t0;
                var message = "*** indexation done : " + data.length + " records  in " + duration + " msec.";
                socket.message(message);
                callback(null, "done");
            },
        );
    },

    generateDefaultMappingFields: function (connector, callback) {
        csvCrawler.readCsv(connector, 1000000, function (err, result) {
            if (err) return callback(err);
            var fields = {};
            result.headers.forEach(function (header) {
                if (header != "")
                    if (!fields[header]) {
                        result.data.forEach(function (line) {
                            if (util.isFloat(line[header])) fields[header] = { type: "float" };
                            else if (util.isInt(line[header])) fields[header] = { type: "integer" };
                            else fields[header] = { type: "text" };
                        });
                    }
            });

            return callback(null, fields);
        });
    },

    readCsv: function (connector, maxLines, callback) {
        if (!fs.existsSync(connector.filePath)) return callback("file does not exists :" + connector.filePath);
        util.getCsvFileSeparator(connector.filePath, function (separator) {
            if (!separator) return callback("unable to determine column separator");
            // separator=";"
            var headers = [];
            var jsonData = [];
            var jsonDataFetch = [];
            var fetchSize = 1000;
            var stream = fs.createReadStream(connector.filePath);

            var parser = csv({
                separator: separator,
                mapHeaders: ({ header }) => util.normalizeHeader(headers, header),
            });
            stream.pipe(
                parser
                    .on("header", function (header) {
                        headers.push(header);
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
                        if (maxLines && jsonData.length > maxLines / fetchSize) {
                            jsonDataFetch = [];
                        } else if (fetchSize && jsonDataFetch.length >= fetchSize) {
                            jsonData.push(jsonDataFetch);

                            jsonDataFetch = [];
                        }
                    })
                    .on("end", function () {
                        if (jsonDataFetch.length > 0) jsonData.push(jsonDataFetch);
                        return callback(null, { headers: headers, data: jsonData });
                    })
                    .on("error", function (error) {
                        return callback(error);
                    }),
            );
        });
    },
};
module.exports = csvCrawler;
