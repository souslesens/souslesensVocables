var fs = require("fs");
var path = require("path");
var async = require("async");
var csvCrawler = require("../bin/_csvCrawler.");

var DataController = {
    getFilesList: function (dir, callback) {
        var dirPath = path.join(__dirname, "../data/" + dir);
        if (!fs.existsSync(dirPath)) return callback(null, null);

        fs.readdir(dirPath, function (err, result) {
            return callback(null, result);
        });
    },

    saveDataToFile: function (dir, fileName, data, callback) {
        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        fs.writeFile(filePath, data, {}, function (err, result) {
            return callback(err, "file saved");
        });
    },
    readfile: function (dir, fileName, callback) {
        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        if (!fs.existsSync(filePath)) return callback("file does not exist", null);
        fs.readFile(filePath, function (err, result) {
            var data = "" + result;
            return callback(err, data);
        });
    },

    readCsv: function (dir, fileName, options, callback) {
        if (!options) options = {};

        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        if (!fs.existsSync(filePath)) return callback("file " + filePath + "does not exist", null);
        csvCrawler.readCsv({ filePath: filePath }, options.lines || 100000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            return callback(null, { headers: headers, data: data });
        });
    },
};

module.exports = DataController;

//DataController.getFilesList("graphs")
//DataController.saveDataToFile("graphs","requirementsGraphXX.json","sdfgdfgdgdfgdf")
