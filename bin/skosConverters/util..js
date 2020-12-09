var fs=require('fs');

var util = {

    sliceArray :function (array, sliceSize) {
        var slices = [];
        var slice = []
        array.forEach(function (item) {
            if (slice.length >= sliceSize) {
                slices.push(slice);
                slice = [];
            }
            slice.push(item)
        })
        slices.push(slice);
        return slices;ormat


    },
    formatStringForTriple: function (str, forUri) {
        if (!str || !str.replace)
            return null;


        str = str.replace(/"/gm, "\\\"")
        str = str.replace(/;/gm, " ")
        str = str.replace(/\n/gm, "\\\\n")
        str = str.replace(/\r/gm, "")
        str = str.replace(/\t/gm, " ")
        str = str.replace(/\(/gm, "\\\\(")
        str = str.replace(/\)/gm, "\\\\)")
        str = str.replace(/\\xa0/gm, " ")
        str = str.replace(/'/gm, "\\\'")
        if (forUri)
            str = str.replace(/ /gm, "_")


        return str;
    },


    /**
     * https://stackoverflow.com/questions/58325771/how-to-generate-random-hex-string-in-javascript
     *
     * @param length
     * @return {string}
     */
   getRandomHexaId : function (length) {
        const str = Math.floor(Math.random() * Math.pow(16, length)).toString(16);
        return "0".repeat(length - str.length) + str;

    },

    getStringHash: function (str) {

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

    base64_encodeFile: function (file) {
        // read binary data
        var bitmap = fs.readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString('base64');
    }
    ,
    prepareJsonForsource: function (obj) {
        /*  if (!(typeof obj === "object"))
         obj = JSON.parse(obj);*/

        for (var key in obj) {

            var value = obj[key];
            if (!(typeof value === "object")) {
                if (key == "_id") {
                    /*  if(ObjectID.isValid(value))
                     obj[key] = new ObjectID(id);*/
                    var id = "" + obj[key];
                    if (id.length > 24)
                        id = id.substring(id.length - 24);


                    while (id.length < 24) {
                        id = "F" + id;
                    }
                    console.log(id);
                    obj[key] = new ObjectID.createFromHexString(id);
                    // obj[key] = new ObjectID(id);

                }

                else if (!isNaN(value) && value.indexOf) {
                    if (value.indexOf(".") > -1)
                        value = parseFloat(value)
                    else
                        value = parseInt(value)
                    obj[key] = value;
                }
            }
        }
        return obj;
    }
    ,
    base64_encodeFile: function (file) {
        // read binary data
        var bitmap = fs.readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString('base64');
    }
    ,
    convertNumStringToNumber: function (value) {
        if (value.match && value.match(/.*[a-zA-Z\/\\$].*/))
            return value;
        if (Util.isInt(value))
            return parseInt(value)
        if (Util.isFloat(value))
            return parseFloat(value)
        if (value == "true")
            return true;
        if (value == "false")
            return false;
        return value;

    },
    isNumber: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
    ,

    isInt: function (value) {
        return /-?[0-9]+/.test("" + value);

    },
    isFloat: function (value) {
        return /-?[0-9]+[.,]+[0-9]?/.test("" + value);

    },

    cleanFieldsForNeo: function (obj) {
        var obj2 = {};
        for (var key in obj) {

            var key2 = key.replace(/-/g, "_");

            key2 = key2.replace(/ /g, "_");
            if (key2 != "") {
                var valueObj = obj[key];
                if (valueObj) {

                    if (isNaN(valueObj) && valueObj.indexOf && valueObj.indexOf("http") == 0) {
                        value = encodeURI(valueObj)
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
                            value = value.replace(/\\/g, "")
                            //  value = value.replace(/:/g, "")
                        }
                        else if (value.indexOf(".") > -1)
                            value = parseFloat(value)
                        else
                            value = parseInt(value)
                    }

                    obj2[key2] = value;
                }
            }
        }

        return obj2;

    },
    capitalizeFirstLetter: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },


    getCsvFileSeparator: function (file, callback) {
        var readStream = fs.createReadStream(file, {start: 0, end: 5000, encoding: 'utf8'});
        var separator = ",";
        readStream.on('data', function (chunk) {
            var separators = [",", "\t", ";"];
            var p = chunk.indexOf("\n")
            if (p < 0)
                p = chunk.indexOf("\r")
            if (p < 0) {
                readStream.destroy();
                console.log("no line break or return in file")
                return null;
            }
            var firstLine = chunk.substring(0, p)
            for (var k = 0; k < separators.length; k++) {
                if (firstLine.indexOf(separators[k]) > 0)
                    callback(separators[k]);
            }


            readStream.destroy();
        }).on('end', function () {
            var xx = 3
            return;
        })
            .on('close', function () {
                return;
            })
        ;

    },

    normalizeHeader: function (headerArray, s) {
        //   var   r = s.toLowerCase();
        var r = s;
        r = r.replace(/[\(\)'.]/g, "")
        r = r.replace(/[\s-_]+\w/g, function (txt) {
            return txt.charAt(txt.length - 1).toUpperCase()
        });
        r = r.replace(new RegExp("\\s", 'g'), "");
        r = r.replace(new RegExp("[àáâãäå]", 'g'), "a");
        r = r.replace(new RegExp("æ", 'g'), "ae");
        r = r.replace(new RegExp("ç", 'g'), "c");
        r = r.replace(new RegExp("[èéêë]", 'g'), "e");
        r = r.replace(new RegExp("[ìíîï]", 'g'), "i");
        r = r.replace(new RegExp("ñ", 'g'), "n");
        r = r.replace(new RegExp("[òóôõö]", 'g'), "o");
        r = r.replace(new RegExp("œ", 'g'), "oe");
        r = r.replace(new RegExp("[ùúûü]", 'g'), "u");
        r = r.replace(new RegExp("[ýÿ]", 'g'), "y");
        r = r.replace(new RegExp("\\W", 'g'), "");
        r = "" + r.charAt(0).toLowerCase() + r.substring(1);
        headerArray.push(r);
        return r;
    }





}

module.exports = util;
