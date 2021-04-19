/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Sparql_common = (function () {


    var self = {};


    var checkClosingBrackets=function(str){
        var c1=(str.match(/\(/g) || []).length
        var c2=(str.match(/\)/g) || []).length
        return c1==c2
    }

    self.setFilter = function (varName, ids, words, options) {
        if (!ids && !words)
            return "";

        if (!words && ids.length == 0)
            return "";
        if (!ids && words.length == 0)
            return "";

        function formatWord(str) {
           if(!checkClosingBrackets(str)){
               str=str.replace(/[\(\)]/g,"")
           }
           return self.formatStringForTriple(str)
         /*   var str = str.replace(/\\/g, "")
            str = str.replace(/\(/gm, "")
            str = str.replace(/\)/gm, "")
            str = str.replace(/\[/gm, "")
            str = str.replace(/\]/gm, "")*/

            return str
        }


        if (!options)
            options = {}
        var filter = ";"


        var varNames
        if (!Array.isArray(varName)) {
            varNames = [varName]
        } else {
            varNames = varName
        }

        var filters = []
        varNames.forEach(function (varName) {
            if (words) {
                if (Array.isArray(words)) {
                    if (words.length == 0)
                        return "";
                    if (words[0] == null)
                        return ""
                    var conceptWordStr = ""
                    words.forEach(function (word, index) {

                        if (word.length > 1) {
                            if (conceptWordStr != "")
                                conceptWordStr += "|"
                            if (options.exactMatch)
                                conceptWordStr += "^" + formatWord(word) + "$";
                            else
                                conceptWordStr += "" + formatWord(word) + "";
                        }
                    })
                    filters.push("regex(?" + varName + "Label , \"" + conceptWordStr + "\",\"i\") ");
                } else {
                    if (words == null)
                        return "";

                    if (!options.exactMatch) {
                        filters.push("regex(?" + varName + "Label, \"" + words + "\", \"i\")");
                    } else {
                        filters.push(" regex(?" + varName + "Label, \"^" + words + "$\", \"i\")");
                    }
                }
            } else if (ids) {


                if (Array.isArray(ids)) {
                    if (ids.length == 0)
                        return "";
                    var p = ids.indexOf("#")
                    if (p > -1)
                        ids.splice(p, 1)
                    if (ids[0] == null)
                        return ""
                    var conceptIdsStr = ""
                    ids.forEach(function (id, index) {
                        if (id != "") {
                            if (conceptIdsStr != "")
                                conceptIdsStr += ","
                            if (id.indexOf("http") >-1 || id.indexOf("nodeID://")>-1)
                                conceptIdsStr += "<" + id + ">"
                            else
                                conceptIdsStr += id
                        }
                    })

                    filters.push(" ?" + varName + " in( " + conceptIdsStr + ")");
                } else {
                    if (ids == null)
                        return "";
                    if (ids.indexOf("http") >-1 || ids.indexOf("nodeID://")>-1)
                        filters.push(" ?" + varName + " =<" + ids + ">");
                    else
                        filters.push(" ?" + varName + " =" + ids);

                }


            } else {
                return "";
            }
        })

        filter = " FILTER ("
        filters.forEach(function (filterStr, index) {
            if (index > 0)
                filter += " || "
            filter += filterStr

        })
        filter += " ) "

        return filter;
    }


    self.getUriFilter = function (varName, uri) {
        var filterStr = ""
        if (Array.isArray(uri)) {
            var str = ""
            uri.forEach(function (item, index) {
                if (index > 0)
                    str += ","
                str += "<" + item + ">"
            })
            filterStr = "filter (?" + varName + " in (" + str + "))"

        } else {
            filterStr += "filter( ?" + varName + "=<" + uri + ">)."
        }
        return filterStr;
    }


    self.getFromStr = function (source) {
        var fromStr = ""
        var graphUris = Config.sources[source].graphUri
        if (!graphUris || graphUris == "")
            return ""
        if (!Array.isArray(graphUris))
            graphUris = [graphUris]


        graphUris.forEach(function (graphUri, index) {
            fromStr += " from <" + graphUri + "> "
        })
        return fromStr;
    }

    self.formatString = function (str, forUri) {
        return self.formatStringForTriple(str, forUri);
    }


    self.formatStringForTriple = function (str, forUri) {
        if (!str || !str.replace)
            return null;
        if(str.indexOf('$')>-1)
            var x=3
        str = str.trim()
        str = str.replace(/\\/gm, "")
        str = str.replace(/"/gm, "\\\"")
        // str = str.replace(/;/gm, "\\\;")
        //  str = str.replace(/\n/gm, "\\\\n")
        str = str.replace(/\n/gm, "\\\\n")
        //  str = str.replace(/\r/gm, "\\\\r")
        str = str.replace(/\r/gm, "")
        str = str.replace(/\t/gm, "\\\\t")
        str = str.replace(/\$/gm, "\\\$")
     //   str = str.replace(/\(/gm, "\\\(")
     //   str = str.replace(/\)/gm, "\\\)")

        str = str.replace(/\\xa0/gm, " ")
        str = str.replace(/'/gm, "\\\'")
        if (forUri)
            str = str.replace(/ /gm, "_")


        return str;
    }


    self.formatUrl = function (str) {
        str = str.replace(/%\d*/gm, "_")
        return str;
    }

    self.getLabelFromId = function (id) {

        if (OwlSchema.currentSourceSchema.labelsMap[id])
            return OwlSchema.currentSourceSchema.labelsMap[id];

        var p = id.lastIndexOf("#")
        if (p > -1)
            return id.substring(p + 1)
        else {
            var p = id.lastIndexOf("/")
            return id.substring(p + 1)
        }


    }

    self.getFromGraphStr = function (graphUris) {
        if (!graphUris || graphUris == "")
            return "";
        if (Array.isArray(graphUris)) {
            var fromStr = ""
            graphUris.forEach(function (item) {
                fromStr += " FROM <" + item + "> "

            })
            return fromStr;
        } else {
            return " FROM <" + graphUris + ">"
        }

    }


    return self;


})()
