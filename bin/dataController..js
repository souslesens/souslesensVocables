var fs = require("fs");
var path = require("path");
var csvCrawler = require("../bin/_csvCrawler.");
var xpath = require('xpath');

var dom = require('xmldom').DOMParser;
var DataController = {
    /**
     * Gets the list of files in a sub-directory of `data`
     * @param {string} dir - directory in which to look for files
     * @param {(err: NodeJS.ErrnoException | null, data: string[] | null) => void} callback -
     *   function to be called once the file has been saved
     */
    getFilesList: function (dir, callback) {
        var dirPath = path.join(__dirname, "../data/" + dir + "");
        if (!fs.existsSync(dirPath)) return callback(null, null);

        fs.readdir(dirPath, function (err, result) {
            return callback(err, result);
        });
    },

    /**
     * Saves a file in a sub-directory of `data`
     * @param {string} dir - directory the file must be saved in
     * @param {string} fileName - name of the file to create
     * @param {string} data - file content
     * @param {(err: NodeJS.ErrnoException | null, data: "file saved" | null) => void} callback -
     *   function to be called once the file has been saved
     */
    saveDataToFile: function (dir, fileName, data, callback) {
        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        fs.writeFile(filePath, data, {}, function (err) {
            return callback(err, "file saved");
        });
    },

    /**
     * Reads a file in a sub-directory of `data`
     * @param {string} dir - directory path under data
     * @param {string} fileName - name of the file to read
     * @param {(err: Error | string | null, data: string | null) => void} callback -
     *   function to be called with the file content as second argument
     */
    readFile: function (dir, fileName, callback) {
        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        if (!fs.existsSync(filePath)) return callback("file does not exist", null);
        fs.readFile(filePath, function (err, result) {
            var data = "" + result;
            return callback(err, data);
        });
    },

    /**
     * Create a directory in a sub-directory of `data`
     * @param {string} dir - directory path under data
     * @param {string} newDirName - name of the directory to create
     * @param {(err: Error | string | null, data: "dir created" | null) => void} callback -
     *   function to be called after dir creation
     */
    createDirectory: function (dir, newDirName, callback) {
        const dirPath = path.join(__dirname, "../data/" + dir + "/" + newDirName);
        fs.mkdir(dirPath, { recursive: false }, function (err) {
            return callback(err, "dir created");
        });
    },

    /**
     * @typedef {Object} ReadCsvOptions
     * @prop {number=} lines - only read the first `lines` lines of the file
     */

    /**
     * @typedef {Object} ReadCsvResult
     * @prop {string[]} headers - name of the columns
     * @prop {Record<string, string>[]} data - rows as objects with column names as keys
     */

    /**
     * Reads a file in the data directory
     * @param {string} dir - directory path under data
     * @param {string} fileName - name of the file to read
     * @param {ReadCsvOptions| undefined} options -
     * @param {(err: Error | string | null, result: ReadCsvResult | null) => void} callback -
     *   function to be called with the file content as second argument
     */
    readCsv: function (dir, fileName, options, callback) {
        if (!options) options = {};

        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        if (!fs.existsSync(filePath)) return callback("file " + filePath + "does not exist", null);
        csvCrawler.readCsv({ filePath: filePath }, options.lines || 1000000, function (err, result) {
            if (err) return callback(err, null);
            var data = result.data;
            var headers = result.headers;
            return callback(null, { headers: headers, data: data });
        });
    },

    readJson: function (dir, fileName, callback) {
        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        if (!fs.existsSync(filePath)) return callback("file " + filePath + "does not exist", null);
        
        fs.readFile(filePath, 'utf8', function(err, fileData) {
            if(err) return callback(err, null);
            try {
                var jsonData = JSON.parse(fileData);
                return callback(null, jsonData);
            } catch(parseErr) {
                return callback(parseErr, null);
            }
        });
    },
    
    readXml: function (dir, fileName, callback) {
        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        if (!fs.existsSync(filePath)) return callback("file " + filePath + "does not exist", null);
        
        fs.readFile(filePath, 'utf8', function(err, fileData) {
            if(err) return callback(err, null);
            return callback(null, fileData);
        });
    },

    /**
     * Parse XML using XPath
     * @param {string} dir - directory path under data
     * @param {string} fileName - name of the file to read
     * @param {string} xpathExpr - XPath expression to select data from the XML
     * @param {(err: Error | string | null, result: string[] | null) => void} callback -
     *   function to be called with the file content as second argument
     */
    parseXmlWithXPath: function (dir, fileName, xpathExpr, callback) {
        this.readFile(dir, fileName, function(err, fileData) {
            if (err) return callback(err, null);
    
            try {
                var doc = new dom().parseFromString(fileData);
                var nodes = xpath.select(xpathExpr, doc);
                var result = nodes.map(function (node) {
                    return node.toString();
                });
                return callback(null, result);
            } catch (error) {
                return callback({ message: "Invalid XPath expression" }, null);
            }
        });
    }
    


    
    
};

module.exports = DataController;

//DataController.getFilesList("graphs")
//DataController.saveDataToFile("graphs","requirementsGraphXX.json","sdfgdfgdgdfgdf")
