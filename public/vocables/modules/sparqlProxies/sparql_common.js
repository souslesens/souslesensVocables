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

/**
 * Sparql_common Module
 * Shared helpers for building SPARQL query fragments and parsing results, used by
 * every controller (Sparql_OWL, Sparql_SKOS, Sparql_generic). Provides string/URI
 * escaping, FILTER / VALUES clause builders, `FROM <graph>` clause assembly from a
 * source and its imports, prefix injection, date filters and source↔graphUri lookups.
 * It builds SPARQL text fragments; it does not execute queries (that is {@link module:Sparql_proxy}).
 * @module Sparql_common
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

    /**
     * Builds a `FILTER (lang(?var)='xx')` clause restricting a label variable to the
     * source's preferred language (`Config.sources[source].pref_lang`).
     * @function
     * @name getLangFilter
     * @memberof module:Sparql_common
     * @param {string} sourceLabel - Source name used to read `pref_lang`
     * @param {string} conceptName - Variable name (without `?`) the language filter applies to
     * @returns {string} A ` FILTER (lang(?conceptName)='lang')` clause, or `""` if the source or `pref_lang` is missing
     */
    self.getLangFilter = function (sourceLabel, conceptName) {
        var sourceObj = Config.sources[sourceLabel];
        if (!sourceObj) {
            return "";
        }
        var pref_lang = sourceObj.pref_lang;
        if (!pref_lang) {
            return "";
        }
        return " FILTER (lang(?" + conceptName + ")='" + pref_lang + "')";
    };

    /**
     * Flattens SPARQL JSON result bindings into plain objects, replacing each
     * `{type, value}` cell with its `.value` string.
     * @function
     * @name getBindingsValues
     * @memberof module:Sparql_common
     * @param {Array<Object>} bindings - `results.bindings` array from a SPARQL JSON response
     * @returns {Array<Object>} One plain object per binding, mapping each variable name to its string value
     */
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

    /**
     * Builds a SPARQL restriction clause for a variable, either from a list of identifiers
     * (URIs/prefixed names/blank nodes) or from a list of label words.
     * - With `ids`: emits a `FILTER(?var in (...))` / `FILTER(?var = ...)` clause, or a
     *   `VALUES ?var { ... }` block when `options.values` is set. URIs are deduplicated and
     *   capped at 100 entries; blank nodes are excluded from `VALUES` (SPARQL 1.1 restriction).
     * - With `words`: emits a `FILTER(regex(?varLabel, "...", "i"))` clause, or an exact-match
     *   `FILTER(?varLabel in (...))` / equality when `options.exactMatch` is set.
     *
     * Note: although `varName` accepts an array, only the clause for the **first** variable is
     * returned (the multi-variable joining code is currently unreachable).
     * @function
     * @name setFilter
     * @memberof module:Sparql_common
     * @param {(string|string[])} varName - Variable name(s) (without `?`) the filter applies to
     * @param {(string|string[])} ids - Identifier(s) to match; ignored when `words` is provided
     * @param {(string|string[])} words - Label word(s) to match by regex/exact match
     * @param {Object} [options] - Filter options
     * @param {boolean} [options.exactMatch] - Match labels/ids exactly instead of by regex
     * @param {boolean} [options.values] - Emit a `VALUES` block instead of a `FILTER ... in` clause
     * @param {(boolean|number)} [options.useFilterKeyWord] - Force `FILTER(... in ...)` form instead of `VALUES` (set automatically; pass `1` to require it)
     * @param {string} [options.labelSuffix="Label"] - Suffix appended to the variable name for label matching
     * @returns {string} A SPARQL FILTER/VALUES fragment, or `""` when no ids/words are supplied
     */
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
                        if (word.length > 0) {
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

                var seenIds = {};
                var uriIds = [];
                ids.forEach(function (id, _index) {
                    var idStr = "" + id;
                    var isUri = idStr.startsWith("http://") || idStr.startsWith("https://");
                    var isPrefixedUri = /^[a-zA-Z][a-zA-Z0-9_]*:[^\s]+$/.test(idStr);
                    var isBlankNode = idStr.startsWith("_:");
                    if ((isUri || isPrefixedUri || isBlankNode) && !seenIds[id]) {
                        seenIds[id] = true;
                        uriIds.push(id);
                    }
                });

                var maxInClauseSize = 100;
                var chunkedUriIds = uriIds.slice(0, maxInClauseSize);

                chunkedUriIds.forEach(function (id, _index) {
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
                    if (chunkedUriIds.length == 1) {
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

    /**
     * Pretty-prints a SPARQL query by inserting line breaks before the main keywords
     * (`PREFIX`, `SELECT`, `FROM`, `WHERE`, `LIMIT`) and upper-casing them.
     * @function
     * @name formatSparqlQuery
     * @memberof module:Sparql_common
     * @param {string} query - SPARQL query to reformat
     * @returns {string} The query with keywords placed on their own lines
     */
    self.formatSparqlQuery = function (query) {
        return query.replace(/PREFIX|SELECT|FROM|WHERE|LIMIT/gim, function (value) {
            if (query.indexOf("\n" + value) < 0) {
                // we do it only once
                return "\n" + value.toUpperCase();
            }
            return value;
        });
    };

    /**
     * Enriches SPARQL results with property labels: collects the property URIs missing a
     * `<propVariable>Label`, fetches their labels via {@link module:Sparql_OWL.getObjectProperties}
     * (using a `setFilter` clause), and injects a literal `<propVariable>Label` cell into each
     * result row. Falls back to the URI fragment when no label is found.
     * @function
     * @name setSparqlResultPropertiesLabels
     * @memberof module:Sparql_common
     * @param {string} sourceLabel - Source name queried for the property labels
     * @param {Array<Object>} SparqlResults - Result bindings to enrich in place
     * @param {string} propVariable - Variable name holding the property URI (its label goes to `propVariable + "Label"`)
     * @param {Function} callback - Error-first callback `(err, SparqlResults)` returning the enriched results
     * @returns {err|Array} Throws an error or returns the enriched `SparqlResults` bindings with `<propVariable>Label` {string} cells filled in.
     * @expose
     */
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

    /**
     * Builds the triple pattern that fetches a variable's `rdfs:label` (optionally also
     * `skos:prefLabel`) into a `<variable>Label` variable, with a language filter favouring
     * `Config.default_lang` or untagged literals. Returns a plain pattern, an `OPTIONAL {...}`
     * block, or a filter-free `OPTIONAL` when the caller already filters on the label variable.
     * @function
     * @name getVariableLangLabel
     * @memberof module:Sparql_common
     * @param {string} variable - Variable name (without `?`) whose label is fetched into `<variable>Label`
     * @param {boolean} [optional] - Wrap the pattern in an `OPTIONAL { ... }` block
     * @param {boolean} [skosPrefLabel] - Also match `skos:prefLabel` in addition to `rdfs:label`
     * @param {string} [filterStr] - Existing filter string; if it references `<variable>Label`, the language filter is dropped to avoid conflicts
     * @returns {string} A SPARQL triple pattern (optionally wrapped in `OPTIONAL`) binding the label variable
     */
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

    /*self.getUriFilter = function (varName, values) {
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
    };*/

    // new version that handles blank nodes (nodeID://)
    function escapeSparqlStringLiteral(str) {
        return str.replace(/\\/g, "\\\\").replace(/"/g, "'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
    }

    /**
     * Builds a `FILTER` clause matching a variable against URIs, literals and/or Virtuoso
     * blank nodes (`nodeID://`). A single string-typed `{value, isString, lang, datatype}`
     * object yields an equality filter with optional language tag or `^^<datatype>`. Arrays
     * are split into standard values (compared directly, `in (...)` when several) and blank
     * nodes (compared via `str(?var)`), combined with `||`.
     * @function
     * @name getUriFilter
     * @memberof module:Sparql_common
     * @param {string} varName - Variable name (without `?`) the filter applies to
     * @param {(string|string[]|Object)} values - URI/literal string(s), or a `{value, isString, lang, datatype}` literal descriptor
     * @returns {string} A SPARQL `filter (...)` clause terminated with `.`
     */
    self.getUriFilter = function (varName, values) {
        if (values.value) {
            if (values.isString) {
                var str = '"' + escapeSparqlStringLiteral(values.value) + '"';
                if (values.datatype) {
                    return "filter( ?" + varName + "=" + str + "^^<" + values.datatype + ">).";
                }
                var lang = values.lang ? "@" + values.lang : "";
                return "filter( ?" + varName + "=" + str + lang + ").";
            }
        }

        if (!Array.isArray(values)) {
            values = [values];
        }

        // Separate blank nodes (nodeID://) from standard values (URIs/literals)
        var blankNodeValues = [];
        var standardValues = [];

        values.forEach(function (item) {
            if (item.indexOf("nodeID://") === 0) {
                blankNodeValues.push(item);
            } else {
                standardValues.push(item);
            }
        });

        var filterConditions = [];

        // Handle standard values with direct comparison
        if (standardValues.length > 0) {
            var standardValuesStr = "";
            standardValues.forEach(function (item, index) {
                if (index > 0) {
                    standardValuesStr += ",";
                }
                let isLiteral = true;
                if (item.indexOf("http") == 0 || (item.indexOf(":") > 0 && item.indexOf(" ") < 0)) {
                    isLiteral = false;
                }
                if (isLiteral) {
                    standardValuesStr += '"' + escapeSparqlStringLiteral(item) + '"';
                } else {
                    standardValuesStr += "<" + item + ">";
                }
            });

            if (standardValues.length > 1) {
                filterConditions.push("?" + varName + " in (" + standardValuesStr + ")");
            } else {
                filterConditions.push("?" + varName + "=" + standardValuesStr);
            }
        }

        // Handle blank nodes with str() comparison
        if (blankNodeValues.length > 0) {
            var blankNodeValuesStr = "";
            blankNodeValues.forEach(function (blankNode, index) {
                if (index > 0) {
                    blankNodeValuesStr += ",";
                }
                blankNodeValuesStr += '"' + blankNode + '"';
            });

            if (blankNodeValues.length > 1) {
                filterConditions.push("str(?" + varName + ") in (" + blankNodeValuesStr + ")");
            } else {
                filterConditions.push("str(?" + varName + ') = "' + blankNodeValues[0] + '"');
            }
        }

        // Combine conditions
        var filterStr = "";
        if (filterConditions.length > 1) {
            filterStr = "filter (" + filterConditions.join(" || ") + ")";
        } else if (filterConditions.length === 1) {
            filterStr = "filter (" + filterConditions[0] + ")";
        }

        return filterStr + ".";
    };

    /**
     * Alias of {@link module:Sparql_common.formatStringForTriple}.
     * @function
     * @name formatString
     * @memberof module:Sparql_common
     * @param {string} str - String to escape
     * @param {boolean} [forUri] - When true, also replace spaces/`-`/`/` with `_` for use in a URI
     * @returns {?string} The escaped string, or `null` if the input is not a string
     */
    self.formatString = function (str, forUri) {
        return self.formatStringForTriple(str, forUri);
    };

    /**
     * Escapes a string so it can be embedded safely as a SPARQL triple literal: trims,
     * removes backslashes, escapes quotes, newlines, tabs and `$`, normalises `@`→`_` and
     * non-breaking spaces. With `forUri`, also replaces spaces, hyphens and slashes with `_`.
     * @function
     * @name formatStringForTriple
     * @memberof module:Sparql_common
     * @param {string} str - String to escape
     * @param {boolean} [forUri] - When true, also make the string URI-safe (spaces/`-`/`/` → `_`)
     * @returns {?string} The escaped string, or `null` if the input is falsy/non-string
     */
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

    /**
     * Replaces URL percent-escape sequences (`%xx`) with `_` to produce a clean identifier.
     * @function
     * @name formatUrl
     * @memberof module:Sparql_common
     * @param {string} str - URL string to clean
     * @returns {string} The string with `%...` sequences replaced by `_`
     */
    self.formatUrl = function (str) {
        str = str.replace(/%\d*/gm, "_");

        return str;
    };

    /**
     * Builds a map from graph URI to source name covering a source and all of its imports.
     * @function
     * @name getSourceGraphUrisMap
     * @memberof module:Sparql_common
     * @param {string} sourceLabel - Source name whose own graph and imports are included
     * @returns {Object<string,string>} Map keyed by graph URI, valued by source name
     */
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

    /**
     * Resolves the source name owning a resource URI by stripping the local name (after the
     * last `#` or `/`) and looking the resulting namespace up among a source's import scope.
     * @function
     * @name getSourceFromUri
     * @memberof module:Sparql_common
     * @param {string} uri - Resource URI to resolve
     * @param {string} [mainSource] - Source providing the import scope to search; if omitted, all sources are searched
     * @returns {?string} The owning source name, or `null` if the URI has no namespace separator
     */
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

    /**
     * Given a list of graph URIs, returns the matching source within `mainSource`'s import
     * scope; defaults to `mainSource` when none of the imports match.
     * @function
     * @name getSourceFromGraphUris
     * @memberof module:Sparql_common
     * @param {string[]} graphUris - Graph URIs to look up
     * @param {string} mainSource - Source whose own graph and imports define the search scope
     * @returns {string} The matching source name, or `mainSource` as fallback
     */
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

    /**
     * Resolves a single graph URI to its source name. With `mainSource`, searches only that
     * source plus its imports; without it, searches (and caches) all sources in `Config.sources`.
     * @function
     * @name getSourceFromGraphUri
     * @memberof module:Sparql_common
     * @param {string} graphUri - Graph URI to resolve
     * @param {string} [mainSource] - Source defining the import scope; when omitted, all sources are searched via the cached `self.graphUrisMap`
     * @returns {(string|undefined)} The matching source name, or `undefined` if no source uses that graph
     */
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

    /**
     * Extracts the local name of a URI: the substring after the last `#`, or after the last
     * `/` when there is no `#`.
     * @function
     * @name getLabelFromURI
     * @memberof module:Sparql_common
     * @param {string} id - URI to extract the local name from
     * @returns {(string|undefined)} The local name, or `undefined` if the input has no `.indexOf` (not a string)
     */
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

    /**
     * Wraps a SPARQL pattern fragment in a `GRAPH <graphUri> { ... }` block targeting the
     * source's named graph (looked up in `Config.basicVocabularies` then `Config.sources`).
     * @function
     * @name setFilterGraph
     * @memberof module:Sparql_common
     * @param {string} sourceLabel - Source name whose `graphUri` scopes the pattern
     * @param {string} filter - SPARQL pattern fragment to wrap
     * @returns {string} The fragment wrapped in `GRAPH <...> {}`, or the unchanged fragment if the source is unknown
     */
    self.setFilterGraph = function (sourceLabel, filter) {
        var graphUri;
        if (Config.basicVocabularies[sourceLabel]) {
            graphUri = Config.basicVocabularies[sourceLabel].graphUri;
        } else if (Config.sources[sourceLabel]) {
            graphUri = Config.sources[sourceLabel].graphUri;
        } else {
            return filter;
        }
        return "GRAPH <" + graphUri + "> {" + filter + "}";
    };

    /**
     * Assembles the `FROM <graphUri>` (or `FROM NAMED <graphUri>`) clauses for a SPARQL query,
     * covering the source's own graph plus, unless suppressed, all of its imported sources'
     * graphs. Also honours `Lineage_sources.fromAllWhiteboardSources`, dictionary sources when
     * `self.includeImports` is set, and any `options.includeSources` / `options.excludeImports`.
     * This is the canonical way to scope a query to a source and is used pervasively.
     * @function
     * @name getFromStr
     * @memberof module:Sparql_common
     * @param {string} sourceLabel - Source name to scope the query to
     * @param {boolean} [named] - Emit `FROM NAMED` instead of `FROM`
     * @param {boolean} [withoutImports] - Exclude imported graphs (defaults to `self.withoutImports`)
     * @param {Object} [options] - Extra scoping options
     * @param {string[]} [options.excludeImports] - Import source names to skip
     * @param {(string|string[])} [options.includeSources] - Additional source names whose graphs to add
     * @returns {string} A concatenation of `FROM`/`FROM NAMED` clauses, `""` when the source has no graph, or `"XXX no graphUri"` when the source is unknown
     */
    self.getFromStr = function (sourceLabel, named, withoutImports, options) {
        if (!options) {
            options = {};
        }
        var from = " FROM ";
        if (named) {
            from += " NAMED";
        }

        var fromStr = "";
        var graphUris;
        if (Config.basicVocabularies[sourceLabel]) {
            graphUris = Config.basicVocabularies[sourceLabel].graphUri;
        } else if (Config.sources[sourceLabel]) {
            graphUris = Config.sources[sourceLabel].graphUri;
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
        if (Config.sources[sourceLabel]) {
            var imports = Config.sources[sourceLabel].imports;
            if (Lineage_sources.fromAllWhiteboardSources) {
                for (var source2 in Lineage_sources.loadedSources) {
                    if (source2 != sourceLabel) {
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
                    if (importGraphUri && fromStr.indexOf("<" + importGraphUri + ">") < 0) {
                        fromStr += from + "  <" + importGraphUri + "> ";
                    }
                });
            }
        }

        if (options.includeSources) {
            if (!Array.isArray(options.includeSources)) options.includeSources = [options.includeSources];
            options.includeSources.forEach(function (source) {
                var importGraphUri = Config.sources[source].graphUri;
                if (importGraphUri && from.indexOf(importGraphUri) < 0) {
                    fromStr += from + "  <" + Config.sources[source].graphUri + "> ";
                }
            });
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

    /**
     * Formats a date as a SPARQL `"..."^^xsd:dateTime` typed literal.
     * @function
     * @name getSparqlDate
     * @memberof module:Sparql_common
     * @param {Date} [date] - Date to format; defaults to now
     * @param {boolean} [withHours] - Include the time component in the RDF string
     * @returns {string} A `"<rdf-date>"^^xsd:dateTime` literal
     */
    self.getSparqlDate = function (date, withHours) {
        if (!date) {
            date = new Date();
        }

        var str = '"' + common.dateToRDFString(date, withHours) + '"^^xsd:dateTime';
        return str;
        //   return  "\"" + date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + "\"^^xsd:date"

        //error in JSON.stringify(date) wrong day !!!!!!!!!!!!!!!
        /*   var str = JSON.stringify(date);
        return str + "^^xsd:dateTime";*/
    };

    /**
     * Finds which source owns a URI by querying the default server for the named graph
     * containing it: `SELECT ?g WHERE { graph ?g { <uri> ?p ?o } } LIMIT 1`, then matching
     * the returned graph URI against `Config.sources`.
     * @function
     * @name getSourceFromUriInDefaultServer
     * @memberof module:Sparql_common
     * @param {string} uri - Resource URI to locate
     * @param {Function} callback - Error-first callback `(err, source)`; `source` is the owning source name, or `null` if the URI is in no graph
     * @returns {err|string} Throws an error or returns the owning source name, or `null` if the URI is in no graph.
     * @expose
     */
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

    /**
     * Expands prefixed names (`prefix:local`) in a SPARQL string into full `<uri>` form using
     * the supplied prefix→namespace map, handling a trailing `.` after the local name.
     * @function
     * @name replaceSparqlPrefixByUri
     * @memberof module:Sparql_common
     * @param {string} str - SPARQL string containing prefixed names
     * @param {Object<string,string>} prefixes - Map of prefix to namespace URI
     * @returns {string} The string with prefixed names replaced by full `<uri>` references
     */
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
    /**
     * Builds a SPARQL property-path alternation (`p1|p2|...`) from a list of custom predicates,
     * optionally appending `^rdfs:member` for member-based hierarchies.
     * @function
     * @name getSpecificPredicates
     * @memberof module:Sparql_common
     * @param {Object} options - Predicate options
     * @param {(string|string[])} options.specificPredicates - Predicate(s) to combine into the property path
     * @param {boolean} [options.memberPredicate] - Append `^rdfs:member` to the path
     * @returns {?string} The property-path alternation string, or `null` if no `specificPredicates` are provided
     */
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

    /**
     * Builds a SPARQL date-range filter on a variable's `owl:hasValue` date. When only a
     * start date and a `precision` (sec/min/hour/day/month/year) are given, derives the end
     * date by widening the start to that precision's boundaries, then emits
     * `filter(?dateValue >= start)` / `filter(?dateValue <= end)` clauses.
     * @function
     * @name setDateRangeSparqlFilter
     * @memberof module:Sparql_common
     * @param {string} varName - Variable name (without `?`) carrying the date value
     * @param {Date} startDate - Range start (mutated when `precision` is used)
     * @param {Date} [endDate] - Range end; derived from `startDate` + `precision` when omitted
     * @param {Object} [options] - Filter options
     * @param {string} [options.precision] - One of `sec`, `min`, `hour`, `day`, `month`, `year` to derive the end date
     * @returns {string} A SPARQL pattern binding `?dateValue` {string} plus the range `filter(...)` clauses
     */
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

    /**
     * Heuristically decides whether a triple's object should be treated as a string literal,
     * based mainly on the property name (label/comment/definition/description/example); the
     * `object`-based branches all fall through to `false`, so the decision is effectively
     * property-driven.
     *
     * Used by the predicate widgets/bots to drive both UI and SPARQL generation: showing String
     * operators and hiding the vocabulary/class selector (`predicatesSelectorWidget`), quoting the
     * value in the generated `Filter(...)` (`individualValuefilterWidget`), and formatting the value
     * as a plain literal rather than a URI/typed literal (`predicates_bot`).
     * @function
     * @name isTripleObjectString
     * @memberof module:Sparql_common
     * @param {string} property - Property URI or name of the triple
     * @param {string} [object] - Object value of the triple
     * @returns {boolean} `true` when the object is a textual literal property, `false` otherwise
     */
    self.isTripleObjectString = function (property, object) {
        if (property.toLowerCase().indexOf("label") > -1) {
            return true;
        }
        if (property.toLowerCase().indexOf("comment") > -1) {
            return true;
        }
        if (property.toLowerCase().indexOf("definition") > -1) {
            return true;
        }
        if (property.toLowerCase().indexOf("description") > -1) {
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

    /**
     * Rewrites a SELECT query to declare PREFIX clauses for every namespace used as a full
     * `<uri>` in the WHERE clause: collects distinct namespaces, assigns generated `ns1`, `ns2`
     * … prefixes, replaces the full URIs with prefixed names and prepends the PREFIX block.
     * @function
     * @name setPrefixesInSelectQuery
     * @memberof module:Sparql_common
     * @param {string} query - SELECT query whose WHERE clause contains full `<uri>` references
     * @returns {string} The query with generated `PREFIX nsN: <...>` declarations and prefixed names in the WHERE clause
     */
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

    /**
     * Prepends PREFIX declarations for the basic vocabularies (`rdfs`, `rdf`, `owl`) to a query
     * when they are not already declared before the WHERE clause.
     * @function
     * @name addBasicVocabulariesPrefixes
     * @memberof module:Sparql_common
     * @param {string} query - SPARQL query to augment
     * @returns {string} The query with any missing rdfs/rdf/owl PREFIX declarations prepended
     */
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

    /**
     * Parses the integer part of a typed literal value of the form `"42"^^xsd:integer`.
     * @function
     * @name getIntFromTypeLiteral
     * @memberof module:Sparql_common
     * @param {string} value - Typed literal string (value optionally followed by `^^datatype`)
     * @returns {number} The integer value parsed from the literal's lexical part
     */
    self.getIntFromTypeLiteral = function (value) {
        var valueStr = value.split("^")[0];
        return parseInt(valueStr);
    };

    /**
     * Builds a short prefixed label for a URI of the form `xxx:localName`, where `xxx` is the
     * first three characters of the source name and `localName` is the URI's local part.
     * @function
     * @name getPrefixedLabelFromURI
     * @memberof module:Sparql_common
     * @param {string} sourceLabel - Source name whose first 3 characters form the prefix
     * @param {string} uri - URI whose local name is used
     * @returns {string} `"<prefix>:<localName>"`, the bare `uri` if no source, or `""` if no uri
     */
    self.getPrefixedLabelFromURI = function (sourceLabel, uri) {
        if (!uri) {
            return "";
        }
        if (!sourceLabel) {
            return uri;
        }

        var sourcePrefix = sourceLabel.substring(0, 3);
        var label = self.getLabelFromURI(uri);
        return sourcePrefix + ":" + label;
    };

    return self;
})();

export default Sparql_common;

window.Sparql_common = Sparql_common;
