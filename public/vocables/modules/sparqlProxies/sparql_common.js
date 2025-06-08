import common from "../shared/common.js";
import Sparql_OWL from "./sparql_OWL.js";
import Sparql_proxy from "./sparql_proxy.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modifUNDEF valuesy, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Sparql_common = (function () {
    var self = {};
    self.withoutImports = false;

    self.basicPrefixes = {
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        owl: "http://www.w3.org/2002/07/owl#",
    };

    var checkClosingBrackets = function (str) {
        var c1 = (str.match(/\(/g) || []).length;
        var c2 = (str.match(/\)/g) || []).length;
        return c1 == c2;
    };

    self.getLangFilter = function (source, conceptName) {
        var sourceObj = Config.sources[source];
        if (!sourceObj) {
            return "";
        }
        var pref_lang = sourceObj.pref_lang;
        if (!pref_lang) {
            return "";
        }
        return " FILTER (lang(?" + conceptName + ")='" + pref_lang + "')";
    };

    self.getBindingsValues = function (bindings) {
        var values = [];
        bindings.forEach(function (item) {
            var obj = {};
            for (var key in item) {
                obj[key] = item[key].value;
            }
            values.push(obj);
        });
        return values;
    };

    self.setFilter = function (varName, ids, words, options) {
        if (!options) {
            options = {};
        }
        if (!ids && !words) {
            return "";
        }

        if (!words && ids.length == 0) {
            return "";
        }
        if (!ids && words.length == 0) {
            return "";
        }

        function formatWord(str) {
            if (!checkClosingBrackets(str)) {
                str = str.replace(/[()]/g, "");
            }
            return self.formatStringForTriple(str);
        }

        var labelSuffix = options.labelSuffix || "Label";

        if (!options) {
            options = {};
        }

        options.useFilterKeyWord = 1; // !!!!Problems with values : ne ramene rien si des valeurs manquent

        if (options.values) {
            options.useFilterKeyWord = 0;
        }

        var filter = ";";

        var varNames;
        if (!Array.isArray(varName)) {
            varNames = [varName];
        } else {
            varNames = varName;
        }

        var filters = [];
        varNames.forEach(function (varName) {
            if (words) {
                if (Array.isArray(words)) {
                    if (words.length == 0) {
                        return "";
                    }
                    if (words[0] == null) {
                        return "";
                    }
                    var conceptWordStr = "";
                    words.forEach(function (word, _index) {
                        if (word.length > 1) {
                            if (options.exactMatch) {
                                if (conceptWordStr != "") {
                                    // conceptWordStr += "|";
                                    conceptWordStr += ",";
                                }
                                //conceptWordStr += "^" + formatWord(word) + "$";
                                conceptWordStr += '"' + formatWord(word) + '"';
                            } else {
                                if (conceptWordStr != "") {
                                    conceptWordStr += "|";
                                }
                                conceptWordStr += "" + formatWord(word) + "";
                            }
                        }
                    });
                    if (options.exactMatch) {
                        filters.push(" FILTER(?" + varName + labelSuffix + "  in(" + conceptWordStr + "))");
                    } else {
                        filters.push(" FILTER(regex(?" + varName + labelSuffix + ' , "' + conceptWordStr + '","i")) ');
                    }
                } else {
                    if (words == null) {
                        return "";
                    }

                    if (options.exactMatch) {
                        filters.push(" FILTER(?" + varName + labelSuffix + " = '" + words + "')");
                        //filters.push(" regex(?" + varName + 'Label, "^' + words + '$", "i")');
                    } else {
                        filters.push(" FILTER(regex(?" + varName + labelSuffix + ', "' + words + '", "i"))');
                    }
                }
            } else if (ids) {
                if (!Array.isArray) {
                    return;
                }
                if (!Array.isArray(ids)) {
                    ids = [ids];
                }
                if (ids.length == 0) {
                    return "";
                }

                var conceptIdsStr = "";

                var uriIds = [];
                ids.forEach(function (id, _index) {
                    if (true || ("" + id).indexOf(":") > -1) {
                        // literal
                        uriIds.push(id);
                    }
                });

                uriIds.forEach(function (id, _index) {
                    if (!id) {
                        return;
                    }

                    if (id.startsWith("_:") && !options.useFilterKeyWord) {
                        // The use of blank nodes in VALUES is not allowed by SPARQL 1.1 specification at '_:b1d86e2d604'
                        return;
                    }

                    if (conceptIdsStr != "") {
                        conceptIdsStr += options.useFilterKeyWord ? "," : " ";
                    }

                    id = "" + id;
                    if (id.startsWith("_:")) {
                        conceptIdsStr += "<" + id + ">";
                    } else if (!id.startsWith("http") && id.match(/^.{1,5}:.{3,}$/)) {
                        // prefix
                        conceptIdsStr += id;
                    } else if (id.match(/<.*>/)) {
                        conceptIdsStr += id;
                    } else {
                        conceptIdsStr += "<" + id + ">";
                    }
                });

                if (conceptIdsStr == "") {
                    return "";
                }

                if (options.useFilterKeyWord) {
                    if (ids.length == 1) {
                        filters.push(" FILTER( ?" + varName + " =" + conceptIdsStr + ")");
                    } else {
                        filters.push(" FILTER( ?" + varName + " in (" + conceptIdsStr + "))");
                    }
                } else {
                    filters.push(" VALUES ?" + varName + "{  " + conceptIdsStr + "}");
                }
            } else {
                return "";
            }
        });

        return filters[0];

        var filter = "";
        filters.forEach(function (filterStr, index) {
            if (index > 0) {
                filter += "  ";
            }
            filter += filterStr;
        });

        return filter;
    };

    self.setSparqlResultPropertiesLabels = function (sourceLabel, SparqlResults, propVariable, callback) {
        if (SparqlResults.length == 0) {
            return callback(null, SparqlResults);
        }
        var propIds = [];
        SparqlResults.forEach(function (item) {
            if (!item[propVariable + "Label"]) {
                if (propIds.indexOf(item[propVariable].value) < 0) {
                    propIds.push(item[propVariable].value);
                }
            }
        });

        if (propIds.length == 0) {
            return callback(null, SparqlResults);
        }

        //get props labels
        var filter = Sparql_common.setFilter("property", propIds);
        Sparql_OWL.getObjectProperties(sourceLabel, { filter: filter }, function (err, resultProps) {
            if (err) {
                return callback(err);
            }
            var labelsMap = {};
            resultProps.forEach(function (item) {
                labelsMap[item.property.value] = item.propertyLabel ? item.propertyLabel.value : Sparql_common.getLabelFromURI(item.property.value);
            });

            SparqlResults.forEach(function (item) {
                if (labelsMap[item[propVariable].value]) {
                    item[propVariable + "Label"] = { type: "literal", value: labelsMap[item[propVariable].value] };
                }
            });

            return callback(null, SparqlResults);
        });
    };

    self.getVariableLangLabel = function (variable, optional, skosPrefLabel, filterStr) {
        //lang doesnt ot work whern filter contains var label

        var pred = "";
        if (skosPrefLabel) {
            pred = "|<http://www.w3.org/2004/02/skos/core#prefLabel>";
        }
        if (filterStr && filterStr.indexOf(variable + "Label") > -1) {
            return " OPTIONAL {?" + variable + " rdfs:label" + pred + " ?" + variable + "Label.}";
        }

        var str = "?" + variable + " rdfs:label" + pred + " ?" + variable + "Label. filter(regex( lang(?" + variable + "Label), '" + Config.default_lang + "') || !lang(?" + variable + "Label))";

        if (optional) {
            return " OPTIONAL {" + str + "} ";
        }
        return str;
    };

    self.getUriFilter = function (varName, values) {
        if (values.value) {
            if (values.isString) {
                var lang = values.lang ? "@" + values.lang : "";
                str = '"' + values.value.replace(/"/g, "'") + '"';
                return "filter( ?" + varName + "=" + str + lang + ").";
            }
        }

        if (!Array.isArray(values)) {
            values = [values];
        }

        var str = "";
        var filterStr = "";
        values.forEach(function (item, index) {
            if (index > 0) {
                str += ",";
            }

            let isLiteral = true;
            if (item.indexOf("http") == 0 || (item.indexOf(":") > 0 && item.indexOf(" ") < 0)) {
                isLiteral = false;
            }

            if (isLiteral) {
                str += '"' + item.replace(/"/g, "'") + '"';
            } else {
                str += "<" + item + ">";
            }
        });

        if (values.length > 1) {
            filterStr = "filter (?" + varName + " in (" + str + "))";
        } else {
            filterStr += "filter( ?" + varName + "=" + str + ").";
        }

        return filterStr;
    };

    self.formatString = function (str, forUri) {
        return self.formatStringForTriple(str, forUri);
    };

    self.formatStringForTriple = function (str, forUri) {
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
        str = str.replace(/\$/gm, "\\$");
        //   str = str.replace(/\(/gm, "\\\(")
        //   str = str.replace(/\)/gm, "\\\)")

        str = str.replace(/\\xa0/gm, " ");
        str = str.replace(/@/gm, "_");
        str = str.replace(/'/gm, "\\'");
        if (forUri) {
            str = str.replace(/ /gm, "_");
            str = str.replace(/-/gm, "_");
            str = str.replace(/\//gm, "_");
        }

        return str;
    };

    self.formatUrl = function (str) {
        str = str.replace(/%\d*/gm, "_");

        return str;
    };

    self.getSourceGraphUrisMap = function (sourceLabel) {
        //set graphUrisMap
        var graphUrisMap = {};
        var sources = [sourceLabel];
        var imports = Config.sources[sourceLabel].imports;
        if (imports) {
            imports.forEach(function (importSource) {
                sources.push(importSource);
            });
        }
        sources.forEach(function (source) {
            var graphUri = Config.sources[source].graphUri;
            graphUrisMap[graphUri] = source;
        });

        return graphUrisMap;
    };

    self.getSourceFromUri = function (uri, mainSource) {
        var p = uri.lastIndexOf("#");
        if (p < 0) {
            p = uri.lastIndexOf("/");
        }
        if (p < 0) {
            return null;
        }

        return self.getSourceFromGraphUri(uri.substring(0, p + 1), mainSource);
    };

    self.getSourceFromGraphUris = function (graphUris, mainSource) {
        if (graphUris.indexOf(Config.sources[mainSource].graphUri) > -1) {
            return mainSource;
        }

        var sources = [mainSource];
        if (Config.sources[mainSource].imports) {
            sources = sources.concat(Config.sources[mainSource].imports);
        }

        var targetSource = mainSource;
        sources.forEach(function (source) {
            var graphUri = Config.sources[source].graphUri;
            if (graphUris.indexOf(graphUri) > -1) {
                targetSource = source;
            }
        });
        return targetSource;
    };

    self.getSourceFromGraphUri = function (graphUri, mainSource) {
        if (mainSource) {
            if (!Config.sources[mainSource].imports) {
                Config.sources[mainSource].imports = [];
            }

            var sourcesInScope = JSON.parse(JSON.stringify(Config.sources[mainSource].imports));
            sourcesInScope.push(mainSource);
            var graphUrisMap = [];
            sourcesInScope.forEach(function (source) {
                graphUrisMap[Config.sources[source].graphUri] = source;
            });
            return graphUrisMap[graphUri];
        } else {
            // search in allsources
            if (!self.graphUrisMap) {
                self.graphUrisMap = {};
                for (var source in Config.sources) {
                    if (Config.sources[source].graphUri) {
                        self.graphUrisMap[Config.sources[source].graphUri] = source;
                    }
                }
            }
            return self.graphUrisMap[graphUri];
        }
    };

    self.getLabelFromURI = function (id) {
        if (!id || !id.indexOf) {
            return;
        }

        const p = id.lastIndexOf("#");
        if (p > -1) {
            return id.substring(p + 1);
        } else {
            const p = id.lastIndexOf("/");
            return id.substring(p + 1);
        }
    };

    self.setFilterGraph = function (source, filter) {
        var graphUri;
        if (Config.basicVocabularies[source]) {
            graphUri = Config.basicVocabularies[source].graphUri;
        } else if (Config.sources[source]) {
            graphUri = Config.sources[source].graphUri;
        } else {
            return filter;
        }
        return "GRAPH <" + graphUri + "> {" + filter + "}";
    };

    self.getFromStr = function (source, named, withoutImports, options) {
        if (!options) {
            options = {};
        }
        var from = " FROM ";
        if (named) {
            from += " NAMED";
        }

        var fromStr = "";
        var graphUris;
        if (Config.basicVocabularies[source]) {
            graphUris = Config.basicVocabularies[source].graphUri;
        } else if (Config.sources[source]) {
            graphUris = Config.sources[source].graphUri;
        } else {
            return "XXX no graphUri";
        }

        if (!graphUris || graphUris == "") {
            return "";
        }
        if (!Array.isArray(graphUris)) {
            graphUris = [graphUris];
        }

        graphUris.forEach(function (graphUri, _index) {
            fromStr += from + "  <" + graphUri + "> ";
        });
        if (withoutImports === undefined) {
            withoutImports = self.withoutImports;
        }
        if (Config.sources[source]) {
            var imports = Config.sources[source].imports;
            if (Lineage_sources.fromAllWhiteboardSources) {
                for (var source2 in Lineage_sources.loadedSources) {
                    if (source2 != source) {
                        var graphUri = Config.sources[source2].graphUri;
                        if (graphUri) {
                            if (graphUri && fromStr.indexOf(graphUri) < 0) {
                                fromStr += from + "  <" + graphUri + "> ";
                            }
                        }
                    }
                }
            }
        }

        if (!withoutImports || self.includeImports) {
            if (imports) {
                imports.forEach(function (source2) {
                    if (options.excludeImports && options.excludeImports.indexOf(source2) > -1) {
                        return;
                    }
                    if (!Config.sources[source2]) {
                        return; // console.error(source2 + "not found");
                    }

                    var importGraphUri = Config.sources[source2].graphUri;
                    if (importGraphUri && fromStr.indexOf( "<" + importGraphUri + ">") < 0) {
                        fromStr += from + "  <" + importGraphUri + "> ";
                    }
                });
            }
        }

        if (self.includeImports) {
            for (var source in Config.sources) {
                if (from.indexOf(Config.sources[source].graphUri) < 0) {
                    if (Config.sources[source].isDictionary) {
                        fromStr += from + "  <" + Config.sources[source].graphUri + "> ";
                    }
                }
            }
        }
        if (options.includeSources) {
            if (!Array.isArray(options.includeSources)) {
                options.includeSources = [options.includeSources];
            }
            options.includeSources.forEach(function (source) {
                if (Config.sources[source] && Config.sources[source].graphUri) {
                    var importGraphUri = Config.sources[source].graphUri;
                    if (fromStr.indexOf("<" + importGraphUri + ">") < 0) {
                        fromStr += from + "  <" + importGraphUri + "> ";
                    }
                }
            });
        }

        return fromStr;
    };

    self.getSparqlDate = function (date) {
        if (!date) {
            date = new Date();
        }

        var str = '"' + common.dateToRDFString(date) + '"^^xsd:dateTime';
        return str;
        //   return  "\"" + date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + "\"^^xsd:date"

        //error in JSON.stringify(date) wrong day !!!!!!!!!!!!!!!
        /*   var str = JSON.stringify(date);
        return str + "^^xsd:dateTime";*/
    };

    self.getSourceFromUriInDefaultServer = function (uri, callback) {
        var query = "select ?g where  {graph ?g {<" + uri + "> ?p ?o}} limit 1";
        var graph;
        Sparql_proxy.querySPARQL_GET_proxy("_default", query, "", {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            var data = result.results.bindings;
            if (data.length == 0) {
                return null;
            }
            var source;
            var graphUri = data[0].g.value;
            for (var _source in Config.sources) {
                if (Config.sources[_source].graphUri == graphUri) {
                    source = _source;
                }
            }
            return callback(null, source);
        });
    };

    self.replaceSparqlPrefixByUri = function (str, prefixes) {
        for (var key in prefixes) {
            prefixes[key] = prefixes[key].replace("<", "");
            prefixes[key] = prefixes[key].replace(">", "");
            var regex = new RegExp(key + ":([\\S\\d]+)", "gm");

            str = str.replace(regex, function (match, capture, offset) {
                var p = capture.indexOf(".");
                if (p == capture.length - 1) {
                    return "<" + prefixes[key] + capture.substring(0, capture.length - 1) + ">.";
                }
                return "<" + prefixes[key] + capture + ">";
            });
        }
        return str;
    };
    self.getSpecificPredicates = function (options) {
        var str = " ";

        if (options.specificPredicates) {
            if (!Array.isArray(options.specificPredicates)) {
                options.specificPredicates = [options.specificPredicates];
            }
            options.specificPredicates.forEach(function (predicate, index) {
                if (index > 0) {
                    str += "|";
                }
                str += predicate;
            });
            if (options.memberPredicate) {
                str += "|^rdfs:member";
            }
            return str;
        }
        return null;
    };

    self.setDateRangeSparqlFilter = function (varName, startDate, endDate, options) {
        if (!options) {
            options = {};
        }

        if (options.precision && !endDate) {
            endDate = new Date(startDate);
            if (options.precision != "sec") {
                //min
                endDate.setHours(startDate.getHours(), startDate.getMinutes(), 59);
                startDate.setHours(startDate.getHours(), startDate.getMinutes(), 0);

                if (options.precision != "min") {
                    //hour
                    endDate.setHours(startDate.getHours(), 59);
                    startDate.setHours(startDate.getHours(), 0);

                    if (options.precision != "hour") {
                        //day
                        endDate.setHours(23, 59, 59);
                        startDate.setHours(0, 0, 0, 0);

                        if (options.precision != "day") {
                            //month
                            var daysInMonth = new Date(startDate.getYear(), startDate.getMonth(), 0).getDate();
                            endDate.setDate(daysInMonth);
                            startDate.setDate(1);
                            if (options.precision != "month") {
                                //year
                                endDate.setMonth(11), endDate.setDate(31);
                                startDate.setMonth(0), startDate.setDate(1);
                            }
                        }
                    }
                }
            }
        }

        var startDateStr = "'" + common.dateToRDFString(startDate) + "'^^xsd:dateTime";
        var endDateStr = "'" + common.dateToRDFString(endDate) + "'^^xsd:dateTime";
        var filter = "";

        if (startDate || endDate) {
            filter += "?" + varName + "  owl:hasValue ?dateValue. ";
            //  filter += "?" + varName + " ?d ?date.?date owl:hasValue ?dateValue. ";
            if (startDate) {
                filter += "filter(?dateValue>=" + startDateStr + ")";
            }
            if (endDate) {
                filter += "filter(?dateValue<=" + endDateStr + ")";
            }
        }
        return filter;
    };

    self.isTripleObjectString = function (property, object) {
        if (property.toLowerCase().indexOf("label") > -1) {
            return true;
        }
        if (property.toLowerCase().indexOf("definedby") > -1) {
            return true;
        }
        if (property.toLowerCase().indexOf("comment") > -1) {
            return true;
        }
        if (property.toLowerCase().indexOf("example") > -1) {
            return true;
        }
        if (object && object.indexOf("http://") == 0) {
            return false;
        }
        if (object && object.indexOf(":") > 2 && object.indexOf(":") < 5) {
            return false;
        }

        return false;
    };

    self.setPrefixesInSelectQuery = function (query) {
        var whereIndex = query.toLowerCase().indexOf("where");

        var strWhere = query.substring(whereIndex);
        var str0 = query.substring(0, query.toLowerCase().indexOf("select"));
        // var regex = /^[^@].*<([^>]*)/gm;
        var regex = /[^@].*<([^>]*)/gm;
        var regex = /<([^>]*)>/gm;
        var array = [];
        var urisMap = {};
        while ((array = regex.exec(strWhere)) != null) {
            var uri = array[1];
            if (str0.indexOf(uri) < 0) {
                var lastSep = uri.lastIndexOf("#");
                if (lastSep < 0) {
                    lastSep = uri.lastIndexOf("/");
                }

                if (lastSep == uri.length - 1) {
                    return;
                }

                var prefixStr = uri.substring(0, lastSep + 1);
                if (!urisMap[prefixStr]) {
                    urisMap[prefixStr] = 1;
                }
            }
        }

        var prefixStr = "";
        var index = 1;
        for (var uri in urisMap) {
            var prefix = "ns" + index++;
            prefixStr += "PREFIX " + prefix + ": <" + uri + "> \n";
            strWhere = strWhere.replaceAll(uri, prefix + ":");
        }
        strWhere = strWhere.replace(/[<>]/gm, "");
        query = prefixStr + query.substring(0, whereIndex) + strWhere;

        return query;
    };

    self.addBasicVocabulariesPrefixes = function (query) {
        var whereIndex = query.toLowerCase().indexOf("where");
        var prefixesStr = query.substring(0, whereIndex);
        var whereStr = query.substring(whereIndex);

        for (var prefix in self.basicPrefixes) {
            if (prefixesStr.indexOf(self.basicPrefixes[prefix]) < 0) {
                var newPrefix = "PREFIX " + prefix + ": <" + self.basicPrefixes[prefix] + ">\n";
                prefixesStr = newPrefix + prefixesStr;
            }
        }

        query = prefixesStr + whereStr;
        return query;
    };

    self.getIntFromTypeLiteral = function (value) {
        var valueStr = value.split("^")[0];
        return parseInt(valueStr);
    };

    return self;
})();

export default Sparql_common;

window.Sparql_common = Sparql_common;
