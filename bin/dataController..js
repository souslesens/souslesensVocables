var fs = require("fs");
var path = require("path");
var async = require("async");

var DataController = {
    getFilesList: function (dir, callback) {
        var dirPath = path.join(__dirname, "../data/" + dir);
        if (!fs.existsSync(dirPath)) return callback(null, null);

        fs.readdir(dirPath, function (err, result) {
            return callback(null, result);
        });
    },

    saveDataToFile: function (fileName, data, callback) {
        var filePath = path.join(__dirname, "../data/graphs/" + fileName);
        fs.writeFile(filePath, JSON.stringify(data, null, 2), {}, function (err, result) {
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
};

module.exports = DataController;

//DataController.getFilesList("graphs")
//DataController.saveDataToFile("graphs","requirementsGraphXX.json","sdfgdfgdgdfgdf")
