/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var path = require("path");
var fs = require("fs");
var jsonFileStorage = {
    store: function (filePath, json, callback) {
        try {
            //  filePath=path.normalize(filePath);
            fs.writeFileSync(filePath, JSON.stringify(json, undefined, 4));
            callback(null, "file saved");
        } catch (e) {
            callback(e);
        }
    },
    retrieve: function (filePath, callback) {
        try {
            //  filePath=path.normalize(filePath);
            var str = fs.readFileSync(filePath);

            try {
                callback(null, JSON.parse("" + str));
            } catch (e) {
                // in that case return the string content not parsed
                callback(null, str);
            }
        } catch (e) {
            callback(e);
        }
    },
    delete: function (filePath, callback) {
        fs.unlink(filePath, callback);
    },
};
module.exports = jsonFileStorage;
