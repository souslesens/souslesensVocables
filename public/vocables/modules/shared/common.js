/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import Sparql_common from "../sparqlProxies/sparql_common.js";

var common = (function () {
    var self = {};

    self.StringArrayToIdLabelObjectArray = function (data) {
        var data2 = [];
        if (data.length == 0) {
            return data;
        }
        if (typeof data[0] === "object") {
            return data;
        }
        data.forEach(function (item) {
            data2.push({ id: item, label: item });
        });
        return data2;
    };

    self.fillSelectOptions = function (selectId, data, withBlanckOption, textfield, valueField, selectedValue) {
        $("#" + selectId)
            .find("option")
            .remove()
            .end();
        if (withBlanckOption) {
            $("#" + selectId).append(
                $("<option>", {
                    text: "",
                    value: "",
                }),
            );
        }

        if (Array.isArray(data)) {
            data.forEach(function (item, _index) {
                var text, value;
                if (textfield) {
                    if (item[textfield] && item[textfield].value && item[valueField].value) {
                        text = item[textfield].value;
                        value = item[valueField].value;
                    } else {
                        text = item[textfield];
                        value = item[valueField];
                    }
                } else {
                    text = item;
                    value = item;
                }
                var selected;
                if (selectedValue && value == selectedValue) {
                    selected = "selected";
                }
                $("#" + selectId).append(
                    $("<option>", {
                        text: text,
                        value: value,
                        selected: selected,
                    }),
                );
            });
        } else {
            for (var key in data) {
                var item = data[key];
                $("#" + selectId).append(
                    $("<option>", {
                        text: item[textfield] || item,
                        value: item[valueField] || item,
                    }),
                );
            }
        }
    };

    self.fillSelectWithColorPalette = function (selectId, colors) {
        if (!colors) {
            colors = common.paletteIntense;
        }
        var array = [];
        colors.forEach(function (color) {
            array.push();
        });
        common.fillSelectOptions(selectId, colors, true);

        $("#" + selectId + " option").each(function () {
            $(this).css("background-color", $(this).val());
        });
    };

    self.getAllsourcesWithType = function (type) {
        var sources = [];
        Object.keys(Config.sources)
            .sort()
            .forEach(function (item) {
                if (!type || Config.sources[item].schemaType.indexOf(type) > -1) {
                    sources.push(item);
                }
            });
        return sources;
    };

    self.array = {
        slice: function (array, sliceSize) {
            var slices = [];
            var slice = [];
            array.forEach(function (item) {
                if (slice.length >= sliceSize) {
                    slices.push(slice);
                    slice = [];
                }
                slice.push(item);
            });
            slices.push(slice);
            return slices;
        },

        distinctValues: function (array, key) {
            var distinctValues = {};
            var array2 = [];
            var value = "";
            array.forEach(function (item) {
                if (!key) {
                    value = item;
                } else {
                    value = item[key];
                    if (value && value.value) {
                        value = value.value;
                    }
                }
                if (!distinctValues[value]) {
                    distinctValues[value] = 1;
                    array2.push(item);
                }
            });
            return array2;
        },

        sort: function (array, key, order) {
            var x = order == "desc" ? -1 : 1;
            array.sort(function (a, b) {
                var valueA;
                var valueB;
                if (!key) {
                    valueA = a;
                    valueB = b;
                } else {
                    valueA = a[key];
                    if (valueA && valueA.value) {
                        valueA = valueA.value;
                    }
                    valueB = b[key];
                    if (valueB && valueB.value) {
                        valueB = valueB.value;
                    }
                }
                if (valueA > valueB) {
                    return x;
                }
                if (valueA < valueB) {
                    return -x;
                }
                return 0;
            });
            return array;
        },

        moveItem: function (arr, fromIndex, toIndex) {
            var element = arr[fromIndex];
            arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, element);
        },
        sortObjectArray: function (array, field, _options) {
            array.sort(function (a, b) {
                var aValue = a[field] ? a[field] : "";
                var bValue = b[field] ? b[field] : "";
                if (aValue > bValue) {
                    return 1;
                }
                if (aValue < bValue) {
                    return -1;
                }
                return 0;
            });
            return array;
        },

        unduplicateArray: function (array, key) {
            var uniqueItems = [];
            var uniqueIds = {};
            array.forEach(function (item) {
                if (!uniqueIds[item[key]]) {
                    uniqueIds[item[key]] = 1;
                    uniqueItems.push(item);
                }
            });
            return uniqueItems;
        },
        //to be finished ???
        pivotTable: function (array) {
            var matrix = [];
            var countCols = 0;
            var countLines = array.length;
            array.forEach(function (line, _lineIndex) {
                var mLine = [];
                countCols = Math.max(countCols, line.length);
                line.forEach(function (cell, _lineIndex) {
                    mLine.push(cell);
                });
                matrix.push(mLine);
            });

            var x = matrix;
            var matrix2 = [];
            for (var i = 0; i < countCols; i++) {
                var col = [];
                for (var j = 0; j < countLines; j++) {
                    col.push(matrix[j][i]);
                }
                matrix2.push(col);
            }

            return matrix2;
        },

        intersection: function (a, b) {
            var aa = {};
            a.forEach(function (v) {
                aa[v] = 1;
            });
            var c = [];
            b.forEach(function (v) {
                if (aa[v]) {
                    c.push(v);
                }
            });
            return c;
        },

        union: function (a, b) {
            var c = [];
            var aa = {};
            a.forEach(function (v) {
                aa[v] = 1;
                c.push(v);
            });

            b.forEach(function (v) {
                if (!aa[v]) {
                    c.push(v);
                }
            });
            return c;
        },
        difference: function (a, b) {
            var bb = {};
            b.forEach(function (v) {
                bb[v] = 1;
            });
            var c = [];

            a.forEach(function (v) {
                if (!bb[v]) {
                    c.push(v);
                }
            });
            return c;
        },
        toMap: function (array, key) {
            var map = {};
            array.forEach(function (item) {
                if (item[key]) map[item[key]] = item;
            });
            return map;
        },
        moveItemToFirst: function (array, first) {
            let index = array.indexOf(first);
            if (index > -1) {
                array.splice(index, 1);
                array.unshift(first);
            }
        },
    };

    self.concatArraysWithoutDuplicate = function (array, addedArray, key) {
        var filteredArray = JSON.parse(JSON.stringify(array));
        addedArray.forEach(function (addedItem) {
            var refuse = false;
            array.forEach(function (item) {
                if (key) {
                    refuse = item[key] == addedItem[key];
                } else {
                    refuse = item == addedItem;
                }
            });
            if (!refuse) {
                filteredArray.push(addedItem);
            }
        });
        return filteredArray;
    };

    self.removeDuplicatesFromArray = function (array, key, uniques) {
        if (!uniques) {
            uniques = [];
        }
        var cleanedArray = [];
        array.forEach(function (item) {
            var value;
            if (key) {
                value = item[key];
            } else {
                value = item;
            }
            if (!uniques[value]) {
                uniques[value] = 1;
                cleanedArray.push(item);
            }
        });
        return cleanedArray;
    };
    self.formatStringForTriple = function (str, forUri) {
        if (!str) {
            return str;
        }
        str = str.trim();
        if (str.indexOf("http://") == 0) {
            return str;
        }
        if (!str || !str.replace) {
            return null;
        }
        str = str.trim();
        str = str.replace(/\\/gm, "");
        str = str.replace(/"/gm, '\\"');
        // str = str.replace(/;/gm, "\\\;")
        //  str = str.replace(/\n/gm, "\\\\n")
        str = str.replace(/\n/gm, "\\\\n");
        //  str = str.replace(/\r/gm, "\\\\r")
        str = str.replace(/\r/gm, "");
        str = str.replace(/\t/gm, "\\\\t");
        str = str.replace(/\\xa0/gm, " ");
        str = str.replace(/'/gm, "");
        str = str.replace(/\\/gm, "");
        str = str.replace(/—/gm, " ");
        str = str.replace(/:/gm, "");
        str = str.replace(/\:/gm, "");

        if (forUri) {
            str = str.replace(/ /gm, "_");
            //  str = str.replace(/\-/gm, "_");
            str = str.replace(/:/gm, "_");
            str = str.replace(/\(/gm, "_");
            str = str.replace(/\)/gm, "_");

            str = str.replace(/[^a-zA-Z0-9-_]/g, "");
            /*  str = encodeURIComponent(str);
str = str.replace(/%2F/gm, "/");*/
        }

        return str;
    };

    self.escapeNonASCIIstring = function (string) {
        function padWithLeadingZeros(string) {
            return new Array(5 - string.length).join("0") + string;
        }

        function unicodeCharEscape(charCode) {
            return "\\u" + padWithLeadingZeros(charCode.toString(16));
        }

        function unicodeEscape(string) {
            return string
                .split("")
                .map(function (char) {
                    var charCode = char.charCodeAt(0);
                    return charCode > 127 ? unicodeCharEscape(charCode) : char;
                })
                .join("");
        }

        return unicodeEscape(string);
    };

    self.formatUriToJqueryId = function (uri) {
        var str = uri.toLowerCase().replace("http://", "_");
        return str.replace(/\//g, "_").replace(/\./g, "_");
    };
    self.encodeToJqueryId = function (myId) {
        return myId.replace(/\./g, "__e__");
    };
    self.decodeFromJqueryId = function (jqueryId) {
        var str = jqueryId.toLowerCase().replace(/__e__/g, ".");
        return str;
    };

    self.decapitalizeLabel = function (label) {
        if (!label.match(/[a-z]/)) {
            return label;
        }
        var altLabel = label.replace(/[A-Z]/g, function (maj) {
            if (label.indexOf(" ") > -1) {
                return "" + maj;
            }
            return " " + maj;
        });
        return altLabel.trim();
    };

    /**
     * https://stackoverflow.com/questions/58325771/how-to-generate-random-hex-string-in-javascript
     *
     * @param length
     * @return {string}
     */
    self.getRandomHexaId = function (length) {
        const str = Math.floor(Math.random() * Math.pow(16, length)).toString(16);
        return "0".repeat(length - str.length) + str;
    };

    self.getRandomInt = function () {
        return Math.floor(Math.random() * 100000);
    };
    self.getItemLabel = function (item, varName, _lang) {
        if (item[varName + "Label"]) {
            return item[varName + "Label"].value;
        } else {
            var p = item[varName].value.lastIndexOf("#");
            if (p < 0) {
                p = item[varName].value.lastIndexOf("/");
            }
            return item[varName].value.substring(p + 1);
        }
    };
    self.getUriLabel = function (uri) {
        var p = uri.lastIndexOf("#");
        if (p < 0) {
            p = uri.lastIndexOf("/");
        }
        if (p > -1) {
            return uri.substring(p + 1);
        } else {
            return uri;
        }
    };
    self.getNewUri = function (sourceLabel, length) {
        if (!length) {
            length = 10;
        }
        var sourceUri = Config.sources[sourceLabel].graphUri;
        if (sourceUri.lastIndexOf("/") != sourceUri.length - 1) {
            sourceUri += "/";
        }
        var nodeId = sourceUri + common.getRandomHexaId(length);
        return nodeId;
    };
    self.getNewId = function (prefix, length) {
        if (!length) {
            length = 10;
        }
        return prefix + common.getRandomHexaId(length);
    };

    self.copyTextToClipboard = function (text, callback) {
        async function copy() {
            if (navigator.clipboard && window.isSecureContext) {
                // navigator clipboard api method'
                try {
                    navigator.clipboard.writeText(text);
                    if (callback) {
                        return callback(null, "graph copied in clipboard");
                    } else {
                        return alert("graph copied in clipboard");
                    }
                } catch (err) {
                    UI.message("graph copy failed");
                    if (callback) {
                        return callback(err);
                    }
                }
            } else {
                // text area method
                let textArea = document.createElement("textarea");
                textArea.value = text;
                // make the textarea out of viewport
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.trigger("focus");
                textArea.select();
                return new Promise((res, rej) => {
                    // here the magic happens
                    var ok = document.execCommand("copy");
                    if (ok) {
                        if (callback) {
                            return callback(null, "graph copied in clipboard");
                        } else {
                            return alert("graph copied in clipboard");
                        }
                    } else {
                        UI.message("graph copy failed");
                        if (callback) {
                            return callback(err);
                        }
                    }
                    textArea.remove();
                });
            }

            /*  try {
await navigator.clipboard.writeText(text);

if (callback) {
return callback(null, "graph copied in clipboard");
} else return alert("graph copied in clipboard");
} catch (err) {
UI.message("graph copy failed");
if (callback) return callback(err);
}*/
        }

        copy();
        return;

        // var textArea = document.createElement("textarea");
        // textArea.style.position = "fixed";
        // textArea.style.top = 0;
        // textArea.style.left = 0;

        // // Ensure it has a small width and height. Setting to 1px / 1em
        // // doesn't work as this gives a negative w/h on some browsers.
        // textArea.style.width = "2em";
        // textArea.style.height = "2em";

        // // We don't need padding, reducing the size if it does flash render.
        // textArea.style.padding = 0;

        // // Clean up any borders.
        // textArea.style.border = "none";
        // textArea.style.outline = "none";
        // textArea.style.boxShadow = "none";

        // // Avoid flash of the white box if rendered for any reason.
        // textArea.style.background = "transparent";

        // textArea.value = text;
        // document.body.appendChild(textArea);
        // textArea .trigger( "focus" );
        // textArea.select();

        // try {
        //     var successful = document.execCommand("copy");
        //     var msg = successful ? "successful" : "unsuccessful";
        //     document.body.removeChild(textArea);
        //     if (successful) return "graph copied in clipboard";
        //     else return "graph copy failed";
        // } catch (err) {
        //     console.log(err);
        //     return "graph copy faild";
        // }
    };

    self.pasteTextFromClipboard = function (callback) {
        async function paste() {
            if (navigator.clipboard) {
                const text = await navigator.clipboard.readText();
                callback(text);
                //  alert('Pasted text: ', text);
            } else {
                let textArea = document.createElement("textarea");

                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.trigger("focus");
                try {
                    var successful = document.execCommand("paste");
                    var text = textArea.value;
                    callback(text);
                } catch (e) {
                    console.log(e);
                    return callback(null);
                }
            }
        }

        paste();
    };

    self.createBGColorCssClasses = function (classPrefix, values, palette) {
        values.forEach(function (item, index) {
            var html = classPrefix + item + " :  { background-color:" + palette[index] + "}";

            $("<style>").prop("type", "text/css").html(html).appendTo("head");
        });
    };

    self.deconcatSQLTableColumn = function (str, removeSchema) {
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
            if (!removeSchema) {
                return { table: array[0] + "." + array[1], column: array[2] };
            } else {
                return { table: array[1], column: array[2] };
            }
        } else {
            return null;
        }
    };

    (self.convertNumStringToNumber = function (value) {
        if (value.match && value.match(/.*[a-zA-Z/\\$].*/)) {
            return value;
        }
        if (self.isInt(value)) {
            return parseInt(value);
        }
        if (self.isFloat(value)) {
            return parseFloat(value);
        }
        if (value == "true") {
            return true;
        }
        if (value == "false") {
            return false;
        }
        return value;
    }),
        (self.dateToSQlserverString = function (date) {
            var str = "";
            var dateArray = date.toLocaleString("en-US").split(" ");
            if (date instanceof Date && isFinite(date)) {
                var month = "" + (date.getMonth() + 1);
                if (month.length == 1) {
                    month = "0" + month;
                }
                var day = "" + date.getDate();
                if (day.length == 1) {
                    day = "0" + day;
                }
                str = date.getFullYear() + "" + month + "" + day + " " + dateArray[1] + " " + dateArray[2];
            } else {
                str = "";
            }
            return str;
        });
    self.ISODateStrToRDFString = function (date) {
        if (date) {
            date = date.replace(/-/g, ".");
            date = date.replace("T", " ");
            date = date.replace("Z", "");
        }
        return date;
    };
    // var dateTime='2000-01-15T00:00:00'

    self.dateToRDFString = function (date, time) {
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
    };

    self.isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    self.isInt = function (value) {
        return /-?[0-9]+/.test("" + value);
    };
    self.isFloat = function (value) {
        return /-?[0-9]+[.,]+[0-9]?/.test("" + value);
    };
    self.palette = [
        "#b96af4",
        "#00ae8d",
        "#799b79",
        "#fbb27b",
        "#b51d8c",
        "#2abb9e",
        "#a0ba8a",
        "#fec693",
        "#b382ba",
        "#97d5ca",
        "#95cc79",
        "#fef200",
        "#d3b5d7",
        "#e5f2e8",
        "#afd46b",
        "#fff9af",
        "#e86549",
        "#fdb39a",
        "#fcf0d6",
        "#b51d8c",
        "#f05978",
        "#f27c96",
    ];

    self.paletteIntense = [
        "#8f52a0",
        "#00ae8d",
        "#799b79",
        "#fbb27b",
        "#b51d8c",
        "#2abb9e",
        "#a0ba8a",
        "#fec693",
        "#b382ba",
        "#97d5ca",
        "#95cc79",
        "#fef200",
        "#d3b5d7",
        "#e5f2e8",
        "#afd46b",
        "#fff9af",
        "#e86549",
        "#fdb39a",
        "#fcf0d6",
        "#b51d8c",
        "#f05978",
        "#f27c96",
    ];

    self.paletteIntense = [
        "#8f52a0",
        "#00ae8d",
        "#799b79",
        "#fbb27b",
        "#b51d8c",
        "#2abb9e",
        "#a0ba8a",
        "#fec693",
        "#b382ba",
        "#97d5ca",
        "#95cc79",
        "#fef200",
        "#d3b5d7",
        "#e5f2e8",
        "#afd46b",
        "#fff9af",
        "#e86549",
        "#fdb39a",
        "#fcf0d6",
        "#b51d8c",
        "#f05978",
        "#f27c96",
    ];

    self.resourceColorPalettes = {};
    self.quantumModelmappingSources = {
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalQuantity": "ISO_15926-part-14",
        "http://data.posccaesar.org/dm/ClassOfQuantity": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/D101001516": "CFIHOS_READI",
        "http://data.posccaesar.org/rdl/RDS2216440288": "ISO_15926-PCA",
        "http://data.15926.org/rdl/RDS2216440288": "CFIHOS-ISO",
        "http://data.posccaesar.org/rdl/Discipline": "ISO_15926-PCA",
        "http://w3id.org/readi/z018-rdl/Discipline": "CFIHOS_READI",
        "http://data.posccaesar.org/rdl/RDS1138994": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/D101001188": "CFIHOS_READI",
        "http://data.15926.org/rdl/RDS1138994": "CFIHOS-ISO",
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/FunctionalObject": "ISO_15926-part-14",
        "http://data.posccaesar.org/rdl/RDS11984375": "ISO_15926-PCA",
        "http://data.15926.org/rdl/RDS11984375": "CFIHOS-ISO",
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalObject": "ISO_15926-part-14",
        "http://w3id.org/readi/rdl/CFIHOS-60001285": "CFIHOS_READI",
        "http://data.15926.org/cfihos/60001285": "CFIHOS-ISO",
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/UnitOfMeasure": "ISO_15926-part-14",
        "http://data.posccaesar.org/dm/PhysicalQuantity": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/CFIHOS-50000112": "CFIHOS_READI",
        "http://data.posccaesar.org/dm/DocumentType": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/D101001447": "CFIHOS_READI",
        "http://data.posccaesar.org/rdl/RDS332864": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/CFIHOS-70000406": "CFIHOS_READI",
        "http://standards.iso.org/iso/15926/part14#purchase_order": "ISO_15926-part-4",
        "http://standards.iso.org/iso/15926/part14#document": "ISO_15926-part-4",
        "http://w3id.org/readi/rdl/D101001535": "CFIHOS_READI",
        "http://data.15926.org/cfihos/Picklist": "CFIHOS-ISO",
    };

    self.colorToRgba = function (hex, alpha) {
        if (!alpha) {
            alpha = 1;
        }

        if (alpha > 1) {
            alpha = 1;
        }
        if (alpha < 0) {
            alpha = 0;
        }
        var c;
        if (!hex) {
            return;
        }
        if (hex.indexOf("rgba") == 0) {
            return hex.replace(/,\d(\.\d)*\)/, "," + alpha + ")");
        }
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split("");
            if (c.length == 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = "0x" + c.join("");
            return "rgba(" + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") + "," + alpha + ")";
        }
        return hex;
    };

    self.RGBtoHexColor = function (color) {
        function rgbToHex(r, g, b) {
            return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
        }

        var rgbColor = /\((\d+),(\d+),(\d+)/.exec(color);
        if (rgbColor) {
            var r = rgbColor[1];
            var g = rgbColor[2];
            var b = rgbColor[3];
            var hexColor = rgbToHex(r, g, b);
            return hexColor;
        } else {
            return color;
        }
    };

    self.getResourceColor = function (resourceType, resourceId, palette) {
        if (!palette) {
            palette = "paletteIntense";
        }
        if (!self.resourceColorPalettes[resourceType]) {
            self.resourceColorPalettes[resourceType] = {};
        }
        var color = self.resourceColorPalettes[resourceType][resourceId];
        if (!color) {
            color = common[palette][Object.keys(self.resourceColorPalettes[resourceType]).length];
            self.resourceColorPalettes[resourceType][resourceId] = color;
        }
        return color;
    };

    self.getInputSelection = function () {
        var userSelection;
        if (window.getSelection) {
            userSelection = window.getSelection();
        } else if (document.selection) {
            // Opera
            userSelection = document.selection.createRange();
        }
        return userSelection;
    };

    self.getStackTrace = function (title) {
        return;
        var callback = function (stackframes) {
            var stringifiedStack = stackframes
                .map(function (sf) {
                    return sf.toString();
                })
                .join("\n");
            console.log(stringifiedStack);
        };

        var errback = function (err) {
            console.log(err.message);
        };

        StackTrace.get().then(callback).catch(errback);
        return;
    };

    self.getUrlParamsMap = function () {
        var paramsMap = {};
        var paramsStr = window.location.search.substring(1);
        var params = paramsStr.split("&");
        params.forEach(function (param) {
            var array = param.split("=");

            paramsMap[array[0]] = array[1];
        });
        return paramsMap;
    };

    self.getURI = function (label, source, uriType, specific) {
        var uri = null;
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        let graphUri = Config.sources[source].graphUri;

        if (!uriType || uriType == "fromLabel") {
            uri = graphUri + common.formatStringForTriple(label, true);
        } else if (uriType == "randomHexaNumber") {
            uri = graphUri + common.getRandomHexaId(10);
        } else if (uriType == "specific") {
            if (specificUri) {
                uri = specificUri;
            } else {
                return alert("no specific uri");
            }
        }
        return uri;
    };

    self.countStringsInString = (string, char) => {
        const array = string.match(new RegExp(char, "g"));
        if (!array) {
            return 0;
        }
        return array.length;
    };

    self.ISODateStrToRDFString = function (isoStringdate) {
        // isoString 2022-12-31T230000.000Z
        //  internal virtuoso date YYYY.MM.DD hh:mm.ss
        //   var regex = /(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})/;
        var regex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/; //escape msec

        var array = isoStringdate.match(regex);
        if (!array) {
            return null;
        }
        var str = array[1] + "-" + array[2] + "-" + array[3];
        if (array.length > 4) {
            str += " " + array[4];
        }
        if (array.length > 5) {
            str += ":" + array[5];
        }
        if (array.length > 6) {
            str += ":" + array[6];
        }
        return str;
    };
    self.RDFStringToISODateStr = function (RDFString) {
        // isoString 2022-12-31T230000.000Z
        //  internal virtuoso date YYYY.MM.DD hh:mm.ss
        var regex = /(\d{4}).(\d{2}).(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
        var array = RDFString.match(regex);
        if (!array) {
            return null;
        }
        var str = array[1] + "-" + array[2] + "-" + array[3];
        if (array.length > 4) {
            str += "T" + array[4];
        }
        if (array.length > 5) {
            str += ":" + array[5];
        }
        if (array.length > 6) {
            str += ":" + array[6] + "Z";
        }
        return str;
    };

    self.getSimpleDateStrFromDate = function (date) {
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        if (day < 10) day = "0" + day;
        if (month < 10) month = "0" + month;
        return year + "-" + month + "-" + day;
    };
    self.storeLocally = function (stringToStore, localStorageVar, satckSize) {
        var Varcontent = JSON.parse(localStorage.getItem(localStorageVar));
        if (!Varcontent) {
            Varcontent = [];
            Varcontent.push(stringToStore);
            localStorage.setItem(localStorageVar, JSON.stringify(Varcontent));
        }
        if (Varcontent && !Varcontent.includes(stringToStore)) {
            if (Varcontent.length >= satckSize) {
                Varcontent.shift();
            }
            Varcontent.push(stringToStore);

            localStorage.setItem(localStorageVar, JSON.stringify(Varcontent));
        }
    };
    self.getVocabularyFromURI = function (uri) {
        var result = null;
        uri = uri.replace("https:", "http:");
        Object.keys(Config.ontologiesVocabularyModels).forEach(function (vocabulary) {
            var graphURI = Config.ontologiesVocabularyModels[vocabulary].graphUri.replace("https:", "http:");

            var spliting = uri.split(graphURI);
            if (spliting.length > 1) {
                result = [vocabulary, spliting[1].replace(/^\W/, "")];
            }
        });
        return result;
    };

    self.getpointCoordinatesAtAngle = function (x, y, angle, distance) {
        var result = {};

        result.x = Math.round(Math.cos((angle * Math.PI) / 180) * distance + x);
        result.y = Math.round(Math.sin((angle * Math.PI) / 180) * distance + y);

        return result;
    };
    self.getRestrictionCardinalityLabel = function (type, value) {
        var str = "";
        if (type && type.indexOf("ardinality") > -1 && value) {
            var typeStr = Sparql_common.getLabelFromURI(type).toLowerCase().replace("cardinality", "");
            var valueStr = value.split("^")[0];
            str = typeStr + " " + valueStr;
        }

        return str;
    };

    return self;
})();

export default common;

window.common = common;
