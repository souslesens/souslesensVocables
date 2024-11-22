/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var fs = require("fs");

var util = {
    sliceArray: function(array, sliceSize) {
        var slices = [];
        var slice = [];
        array.forEach(function(item) {
            if (slice.length >= sliceSize) {
                slices.push(slice);
                slice = [];
            }
            slice.push(item);
        });
        slices.push(slice);
        return slices;
    },
    deconcatSQLTableColumn: function(str) {
        if (str.indexOf(":") > -1) {
            return null;
        }
        var array = str.split(".");
        if (array.length < 2) {
            return null;
        }
        if (array.length == 2) {
            return { table: array[0], column: array[1] };
        } else if (array.length == 3) {
            return { table: array[0] + "." + array[1], column: array[2] };
        } else {
            return null;
        }
    },

    /**
     * https://stackoverflow.com/questions/58325771/how-to-generate-random-hex-string-in-javascript
     *
     * @param length
     * @return {string}
     */
    getRandomHexaId: function(length) {
        const str = Math.floor(Math.random() * Math.pow(16, length)).toString(16);
        return "0".repeat(length - str.length) + str;
    },

    getStringHash: function(str) {
        var hash = 5381,
            i = str.length;

        while (i) {
            hash = (hash * 33) ^ str.charCodeAt(--i);
        }

        /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
         * integers. Since we want the results to be always positive, convert the
         * signed int to an unsigned by doing an unsigned bitshift. */
        return hash >>> 0;
    },
    dateToRDFString: function(date, time) {
        var str = "";
        if (date instanceof Date && isFinite(date)) {
            var month = "" + (date.getMonth() + 1);
            if (month.length == 1) {
                month = "0" + month;
            }
            var day = "" + date.getDate();
            if (day.length == 1) {
                day = "0" + day;
            }
            var hour = "" + date.getHours();
            if (day.hour == 1) {
                hour = "0" + hour;
            }
            var min = "" + date.getMinutes();
            if (min.length == 1) {
                min = "0" + min;
            }
            var sec = "" + date.getSeconds();
            if (sec.length == 1) {
                sec = "0" + sec;
            }
            str = date.getFullYear() + "-" + month + "-" + day;
            if (time) {
                str += "T" + hour + ":" + min + ":" + sec;
            }
        } else {
            str = "";
        }
        return str;
    },

    prepareJsonForsource: function(obj) {
        /*  if (!(typeof obj === "object"))
     obj = JSON.parse(obj);*/

        for (var key in obj) {
            var value = obj[key];
            if (!(typeof value === "object")) {
                if (key == "_id") {
                    /*  if(ObjectID.isValid(value))
           obj[key] = new ObjectID(id);*/
                    var id = "" + obj[key];
                    if (id.length > 24) {
                        id = id.substring(id.length - 24);
                    }

                    while (id.length < 24) {
                        id = "F" + id;
                    }
                    console.log(id);
                    obj[key] = new ObjectID.createFromHexString(id);
                    // obj[key] = new ObjectID(id);
                } else if (!isNaN(value) && value.indexOf) {
                    if (value.indexOf(".") > -1) {
                        value = parseFloat(value);
                    } else {
                        value = parseInt(value);
                    }
                    obj[key] = value;
                }
            }
        }
        return obj;
    },

    hashCode: function(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = ~~((hash << 5) - hash + str.charCodeAt(i));
        }
        return hash;
    },
    base64_encodeFile: function(file) {
        // read binary data
        var bitmap = fs.readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString("base64");
    },
    convertNumStringToNumber: function(value) {
        if (value.match && value.match(/.*[a-zA-Z/\\$].*/)) {
            return value;
        }
        if (util.isInt(value)) {
            return parseInt(value);
        }
        if (util.isFloat(value)) {
            return parseFloat(value);
        }
        if (value == "true") {
            return true;
        }
        if (value == "false") {
            return false;
        }
        return value;
    },
    isNumber: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    isInt: function(value) {
        return /^-?[0-9]+$/.test("" + value);
    },
    isFloat: function(value) {
        return /^-?[0-9]+[.,]?[0-9]+$/.test("" + value);
    },

    cleanFieldsForNeo: function(obj) {
        var obj2 = {};
        for (var key in obj) {
            var key2 = key.replace(/-/g, "_");

            key2 = key2.replace(/ /g, "_");
            if (key2 != "") {
                var valueObj = obj[key];
                if (valueObj) {
                    if (isNaN(valueObj) && valueObj.indexOf && valueObj.indexOf("http") == 0) {
                        value = encodeURI(valueObj);
                    } else {
                        var value = "" + valueObj;
                        if (isNaN(valueObj)) {
                            //escape non ascii
                            /*  var str = "";
                for (var i = 0; i < value.length; i++) {
                    var c = value.charCodeAt(i);
                    var s=value.charAt(i)
                    if (c < 48 || (c > 57 && c < 65) || c > 122) {
                        str += '\\' + s;
                    }
                    else
                        str += s;
                }
                value=str;*/

                            value = value.replace(/[\n|\r|\t]+/g, " ");
                            value = value.replace(/&/g, " and ");
                            value = value.replace(/"/g, "'");
                            value = value.replace(/,/g, "\\,");
                            value = value.replace(/\[/g, "\\,");
                            // value = value.replace(/\//g, "%2F");
                            value = value.replace(/\\/g, "");
                            //  value = value.replace(/:/g, "")
                        } else if (value.indexOf(".") > -1) {
                            value = parseFloat(value);
                        } else {
                            value = parseInt(value);
                        }
                    }

                    obj2[key2] = value;
                }
            }
        }

        return obj2;
    },
    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    formatStringForTriple: function(str, forUri) {
        if (!str) {
            return str;
        }
        str = str.trim();
        if (str.indexOf("http://") == 0 || str.indexOf("https://") == 0 ) {
            return str;
        }
        if (!str || !str.replace) {
            return null;
        }
        
        str = str.trim();
       
        str = str.replace(/\\/gm, "_");
        str = str.replace(/\n/gm, "\\\\n");

        str = str.replace(/\r/gm, "");
        str = str.replace(/\t/gm, "\\\\t");
        str = str.replace(/\\xa0/gm, " ");
        str = str.replace(/'/gm, "");
        str = str.replace(/\\/gm, "");
        str = str.replace(/—/gm, " ");
        str = str.replace(/:/gm, "");
        str = str.replace(/\:/gm, "");
        str = str.replace(/"/gm, "\\\"");
        if (forUri) {
            str = str.replace(/ /gm, "_");

            str = str.replace(/:/gm, "_");
            str = str.replace(/\(/gm, "_");
            str = str.replace(/\)/gm, "_");

            str = str.replace(/[^a-zA-Z0-9-_]/g, "");
            //str = str.replace(/-/g, "_");

        }

        return str;
    },
    getCsvFileSeparator: function(file, callback) {
        var readStream = fs.createReadStream(file, { start: 0, end: 5000, encoding: "utf8" });
        var line = "";
        var separators = ["\t", ";", ","];
        readStream
            .on("data", function(chunk) {
                line += chunk;

                var match = null;
                if ((match = line.match(/[\n\r]/))) {
                    /*   var p = line.indexOf("\n");
          if (p < 0) p = chunk.indexOf("\r");
          if (p < 0) {
              readStream.destroy();
              console.log("no line break or return in file");
              return null;*/

                    var firstLine = line.substring(0, match.index);
                    for (var k = 0; k < separators.length; k++) {
                        if (firstLine.indexOf(separators[k]) > -1) {
                            callback(separators[k]);
                        }
                    }

                    readStream.destroy();
                }
            })
            .on("end", function() {
                return;
            })
            .on("close", function() {
                return;
            });
    },

    normalizeHeader: function(headerArray, s) {
        var r = s;
        r = r.replace(/[()'.]/g, "");
        r = r.replace(/[\s-]+\w/g, function(txt) {
            return txt.charAt(txt.length - 1).toUpperCase();
        });
        r = r.replace(new RegExp("\\s", "g"), "");
        r = r.replace(new RegExp("[àáâãäå]", "g"), "a");
        r = r.replace(new RegExp("æ", "g"), "ae");
        r = r.replace(new RegExp("ç", "g"), "c");
        r = r.replace(new RegExp("[èéêë]", "g"), "e");
        r = r.replace(new RegExp("[ìíîï]", "g"), "i");
        r = r.replace(new RegExp("ñ", "g"), "n");
        r = r.replace(new RegExp("[òóôõö]", "g"), "o");
        r = r.replace(new RegExp("œ", "g"), "oe");
        r = r.replace(new RegExp("[ùúûü]", "g"), "u");
        r = r.replace(new RegExp("[ýÿ]", "g"), "y");
        r = r.replace(new RegExp("\\W", "g"), "");
        //  r = "" + r.charAt(0).toLowerCase() + r.substring(1);
        headerArray.push(r);
        return r;
    },

    csvToJson: function(filePath) {
        var str = "" + fs.readFileSync(filePath);
        str = str.replace(/[\u{0080}-\u{FFFF}]/gu, ""); //charactrese vides
        var lines = str.split("\n");
        var pagesJson = [];
        var cols = [];

        lines[0].split("\t").forEach(function(cell) {
            cols.push(cell.trim());
        });

        lines.forEach(function(line, lineIndex) {
            var cells = line.trim().split("\t");
            var obj = {};
            cells.forEach(function(cell, index) {
                if (lineIndex == 0) {
                } else {
                    // cols.push(cell.trim())
                    obj[cols[index]] = cell.trim();
                }
            });
            pagesJson.push(obj);
        });
        return pagesJson;
    },
    getFilesInDirRecursively: function(dirPath, options, callback) {
        var path = require("path");
        var dirsArray = [];
        var dirFilesMap = {};
        var _message = "";
        if (!options) {
            options = {};
        }

        function recurse(parent) {
            parent = path.normalize(parent);
            if (!fs.existsSync(parent)) {
                return "dir doesnt not exist :" + parent;
            }
            if (parent.charAt(parent.length - 1) != path.sep) {
                parent += path.sep;
            }

            var files = fs.readdirSync(parent);
            for (var i = 0; i < files.length; i++) {
                var fileName = parent + files[i];
                var stats = fs.statSync(fileName);
                var infos = { lastModified: stats.mtimeMs }; //fileInfos.getDirInfos(dir);

                if (stats.isDirectory()) {
                    dirFilesMap[fileName + "\\"] = [];
                    dirsArray.push({ type: "dir", name: files[i], parent: parent });
                    recurse(fileName);
                } else {
                    var p = fileName.lastIndexOf(".");
                    if (p < 0) {
                        continue;
                    }
                    var extension = fileName.substring(p + 1).toLowerCase();
                    if (options.acceptedExtensions && options.acceptedExtensions.indexOf(extension) < 0) {
                        message += "!!!!!!  refusedExtension " + fileName;
                        continue;
                    }
                    if (options.maxDocSize && stats.size > options.maxDocSize) {
                        message += "!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ";
                        continue;
                    }
                    if (!dirFilesMap[parent]) {
                        dirFilesMap[parent] = [];
                    }
                    dirFilesMap[parent].push({
                        type: "file",
                        parent: parent,
                        name: files[i],
                        infos: infos
                    });
                    // dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})
                }
            }
        }

        recurse(dirPath, dirPath);

        return callback(null, dirFilesMap);
    },
    decapitalizeLabel: function(label) {
        var altLabel = label.replace(/[A-Z]/g, function(maj) {
            return " " + maj;
        });
        return altLabel.trim();
    },
    getSparqlDate: function(date) {
        if (!date) {
            date = new Date();
        }
        var str = JSON.stringify(date);
        return str + "^^xsd:dateTime ";
    },

    convertFrDateStr2Date: function(dateStr) {
        //try convert french date
        var array = dateStr.split("/");
        if (array.length == 3) {
            var date = new Date(array[2], array[1] - 1, array[0]);

            return date;
        }
        return null;
    },

    replaceSparqlPrefixByUri: function(str, prefixes) {
        for (var key in prefixes) {
            prefixes[key] = prefixes[key].replace("<", "");
            prefixes[key] = prefixes[key].replace(">", "");
            var regex = new RegExp(key + ":([\\S\\d]+)", "gm");

            str = str.replace(regex, function(match, capture, offset) {
                return "<" + prefixes[key] + capture + ">";
            });
        }
        return str;
    },

    getDateFromSLSformat: function(formatCode, dateStr) {
        var formats = {
            "FR": "27/05/2024",
            "ISO": "2024-05-27",
            "USA": "05/27/2024",
            "EUR": "27. 05. 2024",
            "JIS": "2024-05-27",
            "ISO-time": "2022-09-27 18:00:00.000"
        };

        if (!dateStr) {
            dateStr = formats[formatCode];
        }

        function getMonth(str) {
            try {
                var number = parseInt(str);
                number -= 1;

                return number;
            } catch (err) {
                return null;
            }
        }

        function getDay(str) {
            try {
                var number = parseInt(str);

                return number;
            } catch (err) {
                return null;
            }
        }

        function getYear(str) {
            try {
                var number = parseInt(str);
                if (number < 1900) {
                    return (2000 + number);
                }
                return number;
            } catch (err) {
                return null;
            }
        }

        var day, mont, year;
        if (formatCode == "FR") {
            var array = dateStr.split("/");
            if (array.length != 3) {
                return null;
            }
            day = getDay(array[0]);
            month = getMonth(array[1]);
            year = getYear(array[2]);

        } else if (formatCode == "ISO") {
            var array = dateStr.split("-");
            if (array.length < 3) {
                return null;
            }
            day = getDay(array[2]);
            month = getMonth(array[1]);
            year = getYear(array[0]);

        } else if (formatCode == "USA") {
            var array = dateStr.split("/");
            if (array.length < 3) {
                return null;
            }
            day = getDay(array[1]);
            month = getMonth(array[0]);
            year = getYear(array[2]);

        } else if (formatCode == "EUR") {
            var array = dateStr.split(".");
            if (array.length < 3) {
                return null;
            }
            day = getDay(array[0].trim());
            month = getMonth(array[1].trim());
            year = getYear(array[2].trim());

        } else if (formatCode == "JIS") {
            var array = dateStr.split("-");
            if (array.length < 3) {
                return null;
            }
            day = getDay(array[2]);
            month = getMonth(array[1]);
            year = getYear(array[0]);

        } else if (formatCode == "ISO-time") {
            try {
                var date = new Date(dateStr);
                return date.toISOString();
            } catch (e) {
                return null;
            }

        }


        if (!year || (!month && month != 0) || !day) {
            return null;
        }

        var date = new Date(Date.UTC(year, month, day));
        return date.toISOString();
        // return date.toISOString()


    },

    convertISOStringDateForTriple:function(isoStringdate){
       // isoString 2022-12-31T230000.000Z
      //  internal virtuoso date YYYY.MM.DD hh:mm.ss
        var regex=/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})/
        var array=isoStringdate.match(regex)
        if(!array)
            return null;
        var str=array[1]+"-"+array[2]+"-"+array[3]

        if(array.length>4){
            str+=" "+array[4]
        }
        if(array.length>5){
            str+=":"+array[5]
        }
        if(array.length>6){
            str+=":"+array[6]
        }
        return str




    },

    /** Retrieve the authorization scheme and token from the HTTP header
     *
     * @param  {string} header
     *         The content of the HTTP header
     * @return {(Array|null)}
     *         The scheme and token from the header
     */
    parseAuthorizationFromHeader: function(header) {
        const regex = new RegExp(/^(?<scheme>[^\s]+)\s+(?<token>[^$]+)/);

        const output = regex.exec(header);
        if (output !== null) {
            return [output.groups.scheme, output.groups.token];
        }
    }

      ,  getLabelFromURI: function (id) {
            const p = id.lastIndexOf("#");
            if (p > -1) {
                return id.substring(p + 1);
            } else {
                const p = id.lastIndexOf("/");
                return id.substring(p + 1);
            }

    },
};

module.exports = util;

util.convertISOStringDateForTriple("2022-12-31T230000.000Z")


