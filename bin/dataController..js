import fs from 'fs';
import path from 'path';
import csvCrawler from '../bin/_csvCrawler.';

var DataController = {
    /**
     * Gets the list of files in a sub-directory of `data`
     * @param {string} dir - directory in which to look for files
     * @param {(err: NodeJS.ErrnoException | null, data: string[] | null) => void} callback -
     *   function to be called once the file has been saved
     */
    getFilesList: function (dir, callback) {
        var dirPath = path.join(__dirname, "../data/" + dir + "");
        if (!fs.existsSync(dirPath)) {
            return callback(null, null);
        }

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
        if (fileName.indexOf(".png") > -1) {
            const jsonData = JSON.parse(data);

            // Décoder les données Base64
            const base64Data = jsonData.data;

            // Convertir les données Base64 en buffer
            const bufferData = Buffer.from(base64Data, "base64");
            data = bufferData;
        }
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
        if (!options) {
            options = {};
        }

        var filePath = path.join(__dirname, "../data/" + dir + "/" + fileName);
        if (false && !fs.existsSync(filePath)) {
            return callback("file " + filePath + "does not exist", null);
        }
        csvCrawler.readCsv({ filePath: filePath }, options.lines || 1000000, function (err, result) {
            if (err) {
                return callback(err, null);
            }
            var data = result.data;
            var headers = result.headers;
            return callback(null, { headers: headers, data: data });
        });
    },
};

module.exports = DataController;

//DataController.getFilesList("graphs")
//DataController.saveDataToFile("graphs","requirementsGraphXX.json","sdfgdfgdgdfgdf")
