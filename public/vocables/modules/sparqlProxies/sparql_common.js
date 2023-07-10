import common from "../shared/common.js";
import Sparql_OWL from "./sparql_OWL.js";
import Sparql_proxy from "./sparql_proxy.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_common = (function () {
    var self = {};
    self.withoutImports = false;

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

        if (!options) {
            options = {};
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
                        filters.push("?" + varName + "Label  in(" + conceptWordStr + ")");
                    } else {
                        filters.push("regex(?" + varName + 'Label , "' + conceptWordStr + '","i") ');
                    }
                } else {
                    if (words == null) {
                        return "";
                    }

                    if (options.exactMatch) {
                        filters.push(varName + 'Label = "' + words + '"');
                        //filters.push(" regex(?" + varName + 'Label, "^' + words + '$", "i")');
                    } else {
                        filters.push("regex(?" + varName + 'Label, "' + words + '", "i")');
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
                    if (conceptIdsStr != "") {
                        conceptIdsStr += options.useFilterKeyWord ? "," : " ";
                    }

                    id = "" + id;
                    if (id.match(/<.*>/)) {
                        conceptIdsStr += id;
                    } else {
                        conceptIdsStr += "<" + id + ">";
                    }
                });

                if (conceptIdsStr == "") {
                    return "";
                }
                if (options.useFilterKeyWord) {
                    filters.push(" FILTER( ?" + varName + " in (" + conceptIdsStr + "))");
                } else {
                    filters.push(" VALUES ?" + varName + "{" + conceptIdsStr + "}");
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

    self.getVariableLangLabel = function (variable, optional, skosPrefLabel) {
        var pred = "";
        if (skosPrefLabel) {
            pred = "|<http://www.w3.org/2004/02/skos/core#prefLabel>";
        }
        //     var str = "?" + variable + " rdfs:label" + pred + " ?" + variable + "Label. filter( lang(?" + variable + "Label)= '" + Config.default_lang + "' || !lang(?" + variable + "Label))";
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

    self.getSourceFromGraphUri = function (graphUri) {
        if (!self.graphUrisMap) {
            self.graphUrisMap = {};
            for (var source in Config.sources) {
                if (Config.sources[source].graphUri) {
                    self.graphUrisMap[Config.sources[source].graphUri] = source;
                }
            }
        }
        return self.graphUrisMap[graphUri];
    };

    self.getLabelFromURI = function (id) {
        const p = id.lastIndexOf("#");
        if (p > -1) {
            return id.substring(p + 1);
        } else {
            const p = id.lastIndexOf("/");
            return id.substring(p + 1);
        }
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
                    if (!Config.sources[source2]) {
                        return; // console.error(source2 + "not found");
                    }

                    var importGraphUri = Config.sources[source2].graphUri;
                    if (importGraphUri && fromStr.indexOf(importGraphUri) < 0) {
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
                var importGraphUri = Config.sources[source].graphUri;
                if (fromStr.indexOf(importGraphUri) < 0) {
                    fromStr += from + "  <" + importGraphUri + "> ";
                }
            });
        }

        return fromStr;
    };

    self.getSparqlDate = function (date) {
        if (!date) {
            date = new Date();
        }
        var str = JSON.stringify(date);
        return str + "^^xsd:dateTime";
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

    return self;
})();

/*
var str="?prop rdfs:label ?propLabel} ?prop rdf:type rdf:ObjectProperty. ?value rdf:type ?valueType filter (?valueType in (owl:Class,owl:NamedIndividual))}}"
var prefixes={
    rdfs:"<http://www.w3.org/2000/01/rdf-schema#>",
    rdf: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>"
}
Sparql_common.replaceSparqlPrefixByUri(str,prefixes)
*/

export default Sparql_common;

window.Sparql_common = Sparql_common;
