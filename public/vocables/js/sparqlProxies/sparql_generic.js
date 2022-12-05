//biblio
//https://www.iro.umontreal.ca/~lapalme/ift6281/sparql-1_1-cheat-sheet.pdf

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Sparql_generic = (function () {
    var self = {};
    self.slicesSize = 25;
    var sourcesVariables = {};

    self.getSourceVariables = function (sourceLabel) {
        source = Config.sources[sourceLabel];
        if (!sourcesVariables[sourceLabel]) {
            var defaultPredicates;
            if (source.schemaType == "SKOS") {
                defaultPredicates = Sparql_SKOS.defaultPredicates;
            }

            var predicates = "";

            var obj = {};
            var source = Config.sources[sourceLabel];
            obj.graphUri = source.graphUri;
            predicates = defaultPredicates;
            if (source.predicates) predicates = source.predicates;

            var prefixes = predicates.prefixes || defaultPredicates.prefixes;
            obj.prefixesStr = "";
            prefixes.forEach(function (item) {
                obj.prefixesStr += "PREFIX " + item + " ";
            });
            obj.fromStr = Sparql_common.getFromStr(sourceLabel);
            obj.topConceptFilter = predicates.topConceptFilter || defaultPredicates.topConceptFilter;
            obj.broaderPredicate = predicates.broaderPredicate || defaultPredicates.broaderPredicate;
            obj.narrowerPredicate = predicates.narrowerPredicate || defaultPredicates.narrowerPredicate;
            obj.prefLabelPredicate = predicates.prefLabel || defaultPredicates.prefLabel;
            obj.lang = predicates.lang;
            obj.limit = predicates.limit || defaultPredicates.limit;
            obj.optionalDepth = predicates.optionalDepth || defaultPredicates.optionalDepth;
            obj.url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
            obj.queryOptions = "";
            sourcesVariables[sourceLabel] = obj;
        }
        return sourcesVariables[sourceLabel];
    };
    /**********************************************************************************************************************************/
    /**********************************************************************************************************************************/

    self.getTopConcepts = function (sourceLabel, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        Config.sources[sourceLabel].controller.getTopConcepts(sourceLabel, options, function (err, result) {
            callback(err, result);
        });
    };

    self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) options = {};
        Config.sources[sourceLabel].controller.getNodeInfos(sourceLabel, conceptId, options, function (err, result) {
            callback(err, result);
        });
    };

    self.getItems = function (sourceLabel, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        Config.sources[sourceLabel].controller.getItems(sourceLabel, options, function (err, result) {
            callback(err, result);
        });
    };
    self.getCollectionNodes = function (sourceLabel, collection, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        Config.sources[sourceLabel].controller.getCollectionNodes(sourceLabel, collection, options, function (err, result) {
            callback(err, result);
        });
    };

    /**
   *
   * request example with collection filtering
   PREFIX  terms:<http://purl.org/dc/terms/> PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> PREFIX  elements:<http://purl.org/dc/elements/1.1/>  select distinct ?child1,?child1Label, ?conceptLabel,?collLabel  FROM <http://souslesens/thesaurus/TEST/>   WHERE {?child1 skos:broader ?concept.

  ?concept skos:prefLabel ?conceptLabel.

  OPTIONAL{ ?child1 skos:prefLabel ?child1Label. } .filter( ?concept =<http://souslesens/thesaurus/TEST/9d53e3925c>)OPTIONAL{?child1 rdf:type ?child1Type.}

  ?collection skos:member* ?acollection. ?acollection rdf:type skos:Collection.   ?collection skos:prefLabel ?collLabel.  ?acollection skos:prefLabel ?acollLabel.filter (?collection= <http://souslesens/thesaurus/TEST/5d97abb964> )
   ?acollection skos:member ?aconcept. ?aconcept rdf:type skos:Concept.?aconcept skos:prefLabel ?aconceptLabel.
  ?childX skos:broader ?aconcept.?childX skos:prefLabel ?childLabel.  ?childX skos:broader* ?child1

}ORDER BY ?child1Label limit 1000

   *
   * @param
    sourceLabel
   * @param
    words
   * @param
    ids
   * @param
    descendantsDepth
   * @param
    options
   * @param
    callback
   */

    self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = { depth: 0 };
        }
        options.source = sourceLabel;
        var fitlerType;
        var slices;
        if (ids) {
            if (!Array.isArray(ids)) ids = [ids];
            fitlerType = "ids";
            slices = common.array.slice(ids, self.slicesSize);
        }
        if (words && !Array.isArray(words)) {
            words = [words];
            fitlerType = "words";
            slices = common.array.slice(words, self.slicesSize);
        }

        var bulkResult = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var words = null;
                var ids = null;
                if (fitlerType == "ids") ids = slice;
                else if (fitlerType == "words") words = slice;
                Config.sources[sourceLabel].controller.getNodeChildren(sourceLabel, words, ids, descendantsDepth, options, function (err, result) {
                    if (err) return callbackEach(err);
                    bulkResult = bulkResult.concat(result);
                    callbackEach(null, result);
                });
            },
            function (err) {
                return callback(err, bulkResult);
            }
        );
    };

    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        if (!Config.sources[sourceLabel] || !Config.sources[sourceLabel].controller) return callback(null, []);
        $("#waitImg").css("display", "block");
        if (!options) {
            options = { depth: 0 };
        }
        options.source = sourceLabel;

        var fitlerType;
        var slices;
        if (ids) {
            if (!Array.isArray(ids)) ids = [ids];
            fitlerType = "ids";
            slices = common.array.slice(ids, self.slicesSize);
        }
        if (words) {
            if (!Array.isArray(words)) words = [words];
            fitlerType = "words";
            slices = common.array.slice(words, self.slicesSize);
        }

        var bulkResult = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var words = null;
                var ids = null;
                if (fitlerType == "ids") ids = slice;
                else if (fitlerType == "words") words = slice;
                Config.sources[sourceLabel].controller.getNodeParents(sourceLabel, words, ids, ancestorsDepth, options, function (err, result) {
                    if (err) return callbackEach(err);
                    bulkResult = bulkResult.concat(result);
                    callbackEach(null, result);
                });
            },
            function (err) {
                return callback(err, bulkResult);
            }
        );
    };

    /*******************************************end basic requests (mode read) **************************************************************/

    self.getSingleNodeAllGenealogy = function (sourceLabel, id, callback) {
        if (Config.sources[sourceLabel].controllerName != "Sparql_SKOS") {
            Config.sources[sourceLabel].controller.getTopConcepts(sourceLabel, { source: sourceLabel }, function (err, result) {
                callback(err, result);
            });
            return;
        }
        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var query = "";
        query += sourceVariables.prefixesStr;
        query += " select distinct * " + sourceVariables.fromStr + "  WHERE {";
        query +=
            "  ?concept " +
            sourceVariables.broaderPredicate +
            "* ?broader." +
            "filter (?concept=<" +
            id +
            ">) " +
            "?broader " +
            sourceVariables.prefLabelPredicate +
            " ?broaderLabel." +
            "?broader rdf:type ?type.";
        query += "  }";
        query += "limit " + sourceVariables.limit + " ";

        var url = sourceVariables.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getSingleNodeAllDescendants = function (sourceLabel, id, callback) {
        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var query = "";
        query += sourceVariables.prefixesStr;
        query += " select distinct * " + sourceVariables.fromStr + "  WHERE {";
        query +=
            "  ?concept ^" +
            sourceVariables.broaderPredicate +
            "*|" +
            sourceVariables.narrowerPredicate +
            "* ?narrower." +
            "filter (?concept=<" +
            id +
            ">) " +
            "?narrower " +
            sourceVariables.prefLabelPredicate +
            " ?narrowerLabel." +
            "?narrower rdf:type ?type.";
        query += "  }";
        query += "limit " + sourceVariables.limit + " ";

        var url = sourceVariables.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeLabel = function (sourceLabel, id, callback) {
        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var query = "";
        query += sourceVariables.prefixesStr;
        query +=
            " select distinct * " +
            sourceVariables.fromStr +
            "  WHERE {" +
            "?concept   rdf:type   ?type." +
            "?concept " +
            sourceVariables.prefLabelPredicate +
            " ?conceptLabel." +
            "filter (?concept=<" +
            id +
            ">) ";
        if (lang) query += 'filter( lang(?conceptLabel)="' + lang + '")';

        query += "}limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getNodesAllTriples = function (sourceLabel, subjectIds, callback) {
        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var sliceSize = 2000;
        var slices = common.array.slice(subjectIds, sliceSize);
        var triples = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var filterStr = "(";
                slice.forEach(function (item, index) {
                    if (index > 0) filterStr += ",";
                    filterStr += "<" + item + ">";
                });
                filterStr += ")";

                var query = " select    distinct * " + sourceVariables.fromStr + "  WHERE {" + "?subject ?prop ?value. FILTER (?subject in" + filterStr + ")} limit " + sliceSize + 1;
                let url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    triples = triples.concat(result.results.bindings);
                    return callbackEach();
                });
            },
            function (err) {
                return callback(err, triples);
            }
        );
    };

    self.deleteTriples = function (sourceLabel, subjectUri, predicateUri, objectUri, callback) {
        if (!subjectUri && !predicateUri && !objectUri) return callback("no subject predicate or object filter : cannot delete");

        var filterStr = "";
        if (subjectUri) filterStr += Sparql_common.getUriFilter("s", subjectUri);
        if (predicateUri) filterStr += Sparql_common.getUriFilter("p", predicateUri);
        if (objectUri) filterStr += Sparql_common.getUriFilter("o", objectUri);
        var graphUri = Config.sources[sourceLabel].graphUri;
        if (Array.isArray(graphUri)) graphUri = graphUri[0];
        var query = self.getDefaultSparqlPrefixesStr();
        query += "with <" + graphUri + "> " + " DELETE {?s ?p ?o} WHERE{ ?s ?p ?o " + filterStr + "}";
        var queryOptions = "";
        let url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.triplesObjectToString = function (item) {
        var allowedPrefixes = Object.keys(Config.defaultSparqlPrefixes);

        function setElementSyntax(elt) {
            if (elt.indexOf("_:b") == 0) {
                return "<" + elt + ">";
            }
            if (elt.indexOf("http") == 0 || item.valueType == "uri") {
                return "<" + elt + ">";
            }

            if ((p = elt.indexOf("^^")) > 0)
                //xsd type
                return "'" + item.object.substring(0, p) + "'" + item.object.substring(p);

            var array = elt.split(":");
            if (array.length > 1 && allowedPrefixes.indexOf(array[0])) {
                return elt;
            }

            return "'" + elt + "'";
        }

        var subjectStr = setElementSyntax(item.subject);

        var objectStr;

        if (item.lang) {
            langStr = "@" + item.lang;
            objectStr = "'" + item.object + "'" + langStr;
        } else objectStr = setElementSyntax(item.object);

        var p = item.predicate.indexOf("^");
        if (p == 0) {
            var predicate = item.predicate.substring(1);
            return objectStr + " " + setElementSyntax(predicate) + " <" + item.subject + ">. ";
        } else return subjectStr + " " + setElementSyntax(item.predicate) + " " + objectStr + ". ";
    };

    self.getDefaultSparqlPrefixesStr = function () {
        var str = "";
        for (var key in Config.defaultSparqlPrefixes) {
            str += "PREFIX " + key + ": " + Config.defaultSparqlPrefixes[key] + " ";
        }
        return str;
    };

    self.insertTriples = function (sourceLabel, _triples, options, callback) {
        if (!options) options = {};
        var graphUri = Config.sources[sourceLabel].graphUri;
        if (Array.isArray(graphUri)) graphUri = graphUri[0];

        var slices = common.array.slice(_triples, 200);
        var uniqueTriples = {};
        async.eachSeries(
            slices,
            function (triples, callbackEach) {
                var insertTriplesStr = "";
                triples.forEach(function (item, _index) {
                    var tripleStr = self.triplesObjectToString(item);
                    if (options.sparqlPrefixes) tripleStr = Sparql_common.replaceSparqlPrefixByUri(tripleStr, options.sparqlPrefixes);
                    if (!uniqueTriples[tripleStr]) {
                        // suppress duplicate if any
                        uniqueTriples[tripleStr] = 1;
                        insertTriplesStr += tripleStr;
                    }
                });

                var query = self.getDefaultSparqlPrefixesStr();
                query += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";

                if (options.getSparqlOnly) return callback(null, query);
                // console.log(query)
                var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
                    return callbackEach(err);
                });
            },
            function (err) {
                return callback(err, _triples.length);
            }
        );
    };

    self.update = function (_sourceLabel, _triples, _callback) {
        /*

PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
with <http://data.total.com/resource/tsf/maintenance/romain_14224/>
DELETE {
?id rdfs:label ?oldLabel .
}
INSERT {
?id rdfs:label ?newLabel .
}
WHERE {
?id rdfs:label ?oldLabel .
filter (regex(?oldLabel,"Class.*"))
bind (replace(?oldLabel,"Class","Class-") as ?newLabel)
}




*/

        return;
    };

    self.deleteTriplesWithFilter = function (sourceLabel, filter, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;

        var query = " WITH <" + graphUri + "> DELETE {?s ?x ?y} ";

        if (filter) query += " WHERE {?s ?x ?y.?s ?p ?o. filter(" + filter + ")}";

        if (!filter) if (!confirm("Do you really want to delete all triples of source " + sourceLabel)) return;
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            return callback(err, _result);
        });
    };

    self.copyGraph = function (fromSourceLabel, toGraphUri, callback) {
        var fromGraphUri = Config.sources[fromSourceLabel].graphUri;
        var query = " COPY <" + fromGraphUri + "> TO <" + toGraphUri + ">;";
        var url = Config.sources[fromSourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: fromSourceLabel }, function (err, _result) {
            return callback(err);
        });
    };
    self.getDistinctPredicates = function (sourceLabel, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var query =
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "select distinct ?p  ?pLabel" +
            fromStr +
            " WHERE {?s ?p ?o. optional{?p ?x ?pLabel. filter(?x in (skos:prefLabel,rdfs:label))}}";
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (_err, result) {
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["p"]);
            return callback(null, result.results.bindings);
        });
    };

    self.copyNodes = function (fromSourceLabel, toGraphUri, sourceIds, options, callback) {
        if (!options) {
            options = {};
        }
        var newTriplesSets = [];
        var newTriples = [];

        var setSize = 100;

        if (toGraphUri.charAt(toGraphUri.length - 1) != "/") toGraphUri += "/";
        var targetSchemaType = Config.sources[fromSourceLabel].schemaType;
        var urisMap = {};

        function getTargetUri(sourceUri, _sourceItem) {
            var targetUri = urisMap[sourceUri];
            if (!targetUri) {
                if (!options.keepOriginalUris) {
                    targetUri = " <" + toGraphUri + common.getRandomHexaId(10) + ">";
                    urisMap[sourceUri] = targetUri;
                    if (options.addExactMatchPredicate) {
                        var exactMatchPredicate;
                        if (targetSchemaType == "SKOS") exactMatchPredicate = "http://www.w3.org/2004/02/skos/core#exactMatch";
                        else exactMatchPredicate = "http://www.w3.org/2000/01/rdf-schema#sameAs";
                        var triple = targetUri + " <" + exactMatchPredicate + "> <" + sourceUri + "> .";
                        newTriples.push(triple);
                    }
                    if (options.setParentNode && options.setParentNode.sourceUri == sourceUri) {
                        var parentPredicate;
                        if (targetSchemaType == "SKOS") parentPredicate = "http://www.w3.org/2004/02/skos/core#broader";
                        else parentPredicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
                        triple = targetUri + " <" + parentPredicate + "> <" + options.setParentNode.targetUri + "> .";
                        newTriples.push(triple);
                    }
                    var newTargetType = null;
                    if (targetSchemaType == "SKOS") {
                        newTargetType = "http://www.w3.org/2004/02/skos/core#Concept";
                    } else if (targetSchemaType == "OWL") {
                        newTargetType = "http://www.w3.org/2002/07/owl#Class";
                    }
                    if (newTargetType) {
                        triple = targetUri + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <" + newTargetType + "> .";
                        newTriples.push(triple);
                    }
                } else {
                    urisMap[sourceUri] = targetUri = "<" + sourceUri + ">";
                }
            }
            return targetUri;
        }

        async.series(
            [
                // get sources nodes properties
                function (callbackSeries) {
                    self.getNodeInfos(fromSourceLabel, sourceIds, null, function (err, result) {
                        if (err) return callbackSeries(err);

                        result.forEach(function (item) {
                            if (options.setSubjectFn) options.setSubjectFn(item);
                            if (options.setPredicateFn) options.setPredicateFn(item);

                            if (options.setObjectFn) options.setObjectFn(item);

                            subject = getTargetUri(item.id.value, item);
                            prop = item.prop.value;
                            if (options.excludedProperties && options.excludedProperties.indexOf(prop) > -1) return;
                            if (!options.properties || options.properties.indexOf(item.prop.value) > -1) {
                                var valueStr = null;
                                if (item.prop.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                                    valueStr = "<" + item.value.value + ">";
                                } else if (item.value.type == "uri") {
                                    valueStr = getTargetUri(item.value.value, item);
                                } else {
                                    var langStr = "";
                                    if (item.value["xml:lang"]) langStr = "@" + item.value["xml:lang"];
                                    valueStr = "'" + Sparql_common.formatStringForTriple(item.value.value) + "'" + langStr;
                                }

                                var triple = "" + subject + " <" + prop + "> " + valueStr + ".";
                                newTriples.push(triple);

                                if (newTriples.length >= setSize) {
                                    newTriplesSets.push(newTriples);
                                    newTriples = [];
                                }
                            }
                        });
                        newTriplesSets.push(newTriples);
                        return callbackSeries();
                    });
                },
                // add additionalTriplesNt
                function (callbackSeries) {
                    if (options.additionalTriplesNt) {
                        options.additionalTriplesNt.forEach(function (triple) {
                            if (newTriples.indexOf(triple) < 0) newTriples.push(triple);
                        });
                    }
                    return callbackSeries();
                },
                //write new triples
                function (callbackSeries) {
                    async.eachSeries(
                        newTriplesSets,
                        function (newTriples, callbackEach) {
                            var insertTriplesStr = "";
                            newTriples.forEach(function (item) {
                                insertTriplesStr += item;
                            });
                            var query = " WITH GRAPH  <" + toGraphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";

                            var url = Config.sources[fromSourceLabel].sparql_server.url + "?format=json&query=";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: fromSourceLabel }, function (err, _result) {
                                return callbackEach(err);
                            });
                        },
                        function (err) {
                            callbackSeries(err);
                        }
                    );
                },
            ],
            function (err) {
                return callback(err, newTriples.length);
            }
        );
    };

    self.sortBindings = function (bindings, field, _options) {
        bindings.sort(function (a, b) {
            var aValue = a[field] ? a[field].value : "";
            var bValue = b[field] ? b[field].value : "";
            if (aValue > bValue) return 1;
            if (aValue < bValue) return -1;
            return 0;
        });
        return bindings;
    };

    self.setMissingLabels = function (bindings, _fields, options) {
        if (!options) options = {};
        if (!Array.isArray(_fields)) _fields = [_fields];
        _fields.forEach(function (_field) {
            bindings.forEach(function (item) {
                if (item[_field] && !item[_field + "Label"]) {
                    item[_field + "Label"] = { value: Sparql_common.getLabelFromURI(item[_field].value) };
                }

                //   item.child1Label={value:id.substring(id.lastIndexOf("#")+1)}
            });
        });
        return bindings;
    };

    self.setBindingsOptionalProperties = function (bindings, _fields, options) {
        if (!options) options = {};
        if (!Array.isArray(_fields)) _fields = [_fields];
        _fields.forEach(function (_field) {
            bindings.forEach(function (item) {
                for (var i = 0; i < 20; i++) {
                    var iStr = "" + i;
                    if (i == 0) iStr = "";
                    var field = _field + "" + iStr;
                    if (!item[field]) {
                        continue;
                    }
                    if (!options.noType && !item[field + "Type"]) {
                        if (options.type) item[field + "Type"] = { value: options.type };
                        else item[field + "Type"] = { value: "http://www.w3.org/2004/02/skos/core#Concept" };
                    }
                    var id = item[field].value;

                    if (!item[field + "Label"]) {
                        var p = id.lastIndexOf("#");
                        if (p > -1) item[field + "Label"] = { value: id.substring(p + 1) };
                        else {
                            p = id.lastIndexOf("/");
                            item[field + "Label"] = { value: id.substring(p + 1) };
                        }
                    }
                }

                //   item.child1Label={value:id.substring(id.lastIndexOf("#")+1)}
            });
        });
        return bindings;
    };

    /**
     * Obsolete
     * replaced by getSourceTaxonomy
     * taxonomy is not used
     *
     *
     *
     *
     */
    self.getSourceTaxonomyFromTop = function (sourceLabel, options, callback) {
        var rawData = [];
        var topClasses = [];
        var taxonomy = {};

        var allClassesMap = {};
        async.series(
            [
                function (callbackSeries) {
                    //get topClasse
                    Sparql_OWL.getTopConcepts(sourceLabel, {}, function (err, result) {
                        if (err) return callbackSeries(err);
                        if (result.length == 0) return callbackSeries("no top classes found  in source" + sourceLabel + ". cannot organize classes lineage");
                        topClasses = result;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    //get raw data subclasses
                    if (!options) options = {};
                    var totalCount = 0;
                    var resultSize = 1;
                    var limitSize = 2000;
                    var offset = 0;
                    var fromStr = Sparql_common.getFromStr(sourceLabel);
                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                        "SELECT distinct * " +
                        fromStr +
                        " WHERE {\n" +
                        " ?sub rdfs:subClassOf+ ?obj .\n" +
                        "   ?sub rdfs:label ?subLabel .\n" +
                        "   ?obj rdfs:label ?objLabel .\n" +
                        "   ?sub rdf:type owl:Class.\n" +
                        " ?obj rdf:type owl:Class.\n" +
                        "} ";
                    async.whilst(
                        function (_test) {
                            return resultSize > 0;
                        },
                        function (callbackWhilst) {
                            var query2 = "" + query;
                            query2 += " limit " + limitSize + " offset " + offset;

                            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                            var url = self.sparql_url + "?format=json&query=";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", { source: sourceLabel }, function (err, result) {
                                if (err) return callbackWhilst(err);
                                result = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "domain", "range"]);
                                rawData = rawData.concat(result);
                                resultSize = result.length;
                                totalCount += result.length;
                                MainController.UI.message(sourceLabel + "retreived triples :" + totalCount);
                                offset += resultSize;
                                callbackWhilst();
                            });
                        },
                        function (_err) {
                            // eslint-disable-next-line no-console
                            console.log(totalCount);
                            callbackSeries();
                        }
                    );
                },

                function (callbackSeries) {
                    //set each class parent

                    var parentChildrenMap = {};
                    rawData.forEach(function (item) {
                        if (!allClassesMap[item.sub.value]) {
                            allClassesMap[item.sub.value] = {
                                id: item.sub.value,
                                label: item.subLabel.value,
                                children: [],
                                parents: "",
                            };
                        }
                        if (!parentChildrenMap[item.obj.value]) parentChildrenMap[item.obj.value] = [];
                        parentChildrenMap[item.obj.value].push(item.sub.value);
                    });

                    var x = Object.keys(allClassesMap).length;

                    taxonomy = {
                        id: sourceLabel,
                        label: sourceLabel,
                        children: [],
                    };

                    parentChildrenMap[sourceLabel] = [];

                    topClasses.forEach(function (item) {
                        parentChildrenMap[sourceLabel].push(item.topConcept.value);
                    });

                    function recurseChildren(str, classId) {
                        if (parentChildrenMap[classId]) {
                            str += classId + "|";
                            parentChildrenMap[classId].forEach(function (childId) {
                                if (allClassesMap[childId]) {
                                    allClassesMap[childId].parents = str;
                                }
                                recurseChildren(str, childId);
                            });
                        }
                    }

                    recurseChildren("", sourceLabel);

                    //  recurseChildren("", "http://w3id.org/readi/rdl/CFIHOS-30000311")

                    callbackSeries();
                },
            ],
            function (err) {
                return callback(err, { tree: taxonomy, classesMap: allClassesMap });
            }
        );
    };

    self.getLangFilterStr = function (options, variable) {
        var langFilter = "";
        if (!options || !options.lang) return "";
        return " FILTER (lang(" + variable + ")='" + options.lang + "' || !lang(" + variable + "))  ";
    };

    self.getSourceTaxonomy = function (sourceLabel, options, callback) {
        if (!options) options = {};
        var parentType;
        var conceptType;
        if (Config.sources[sourceLabel].schemaType == "OWL") {
            parentType = Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel);

            conceptType = "owl:Class|owl:NamedIndividual";
        } else if (Config.sources[sourceLabel].schemaType == "KNOWLEDGE_GRAPH") {
            parentType = "rdf:type";
            conceptType = "owl:NamedIndividual";
        } else if (Config.sources[sourceLabel].schemaType == "SKOS") {
            parentType = "skos:broader";
            conceptType = "skos:Concept";
        } else if (options.parentType) {
            parentType = options.parentType;
            if (parentType == "rdfs:subPropertyOf") conceptType: "owl:ObjectProperty";
        } else {
            return alert("no schema type");
        }
        if (options.ids) {
            var idFilter = Sparql_common.setFilter("concept", options.ids);
            if (!options.filter) options.filter = "";
            options.filter += " " + idFilter;
        }

        var allClassesMap = {};
        var allLabels = {};
        var allData = [];

        async.series(
            [
                function (callbackSeries) {
                    //get raw data subclasses
                    if (!options) options = {};
                    var totalCount = 0;
                    var resultSize = 1;
                    var limitSize = 500;
                    var offset = 0;

                    var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports, true);

                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                        "SELECT distinct * " +
                        fromStr +
                        " WHERE {" +
                        "  ?concept " +
                        parentType +
                        " ?firstParent." +
                        Sparql_common.getVariableLangLabel("concept", false, true) +
                        "OPTIONAL{?concept skos:altLabel ?skosAltLabel " +
                        Sparql_common.getVariableLangLabel("skosAlt", true) +
                        "}.";

                    //   "OPTIONAL{?concept <http://souslesens.org/resource/vocabulary/hasCode> ?code}. ";

                    if (options.filter) query += " " + options.filter + " ";

                    query += "filter (?firstParent not in (owl:Restriction, owl:Class))";

                    query += " FILTER NOT EXISTS {?firstParent rdf:type owl:Restriction}";

                    query += "}";

                    async.whilst(
                        function (_test) {
                            return resultSize > 0;
                        },
                        function (callbackWhilst) {
                            var query2 = "" + query;
                            query2 += " limit " + (limitSize + 1) + " offset " + offset;

                            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                            var url = self.sparql_url + "?format=json&timeout=20000&debug=off&query=";
                            Sparql_proxy.querySPARQL_GET_proxy(
                                url,
                                query2,
                                "",
                                {
                                    source: sourceLabel,
                                    skipCurrentQuery: true,
                                },
                                function (err, result) {
                                    if (err) {
                                        console.log(query2);
                                        return callbackWhilst(err);
                                    }
                                    result = result.results.bindings;
                                    allData = allData.concat(result);
                                    resultSize = result.length;
                                    totalCount += result.length;
                                    MainController.UI.message(sourceLabel + "retreived triples :" + totalCount);
                                    offset += limitSize;
                                    callbackWhilst();
                                }
                            );
                        },
                        function (_err) {
                            callbackSeries();
                        }
                    );
                },

                //format result
                function (callbackSeries) {
                    var skosLabelsMap = {};

                    function getConceptLabel(item) {
                        var conceptLabel = null;
                        if (item.conceptLabel) conceptLabel = item.conceptLabel.value;
                        else if (item.skosLabel) conceptLabel = item.skosLabel.value;
                        else if (item.skosAltLabel) conceptLabel = item.skosAltLabel.value;
                        else conceptLabel = Sparql_common.getLabelFromURI(item.concept.value);
                        return conceptLabel;
                    }

                    allData.forEach(function (item) {
                        if (!skosLabelsMap[item.concept.value]) skosLabelsMap[item.concept.value] = [];
                        if (item.concept.value == "http://www.eionet.europa.eu/gemet/concept/4254") var x = 3;
                        var conceptLabel = getConceptLabel(item);

                        if (!conceptLabel) return;
                        var decapitalizedLabel = common.decapitalizeLabel(conceptLabel);
                        if (decapitalizedLabel != conceptLabel) {
                            skosLabelsMap[item.concept.value].push(conceptLabel);
                            conceptLabel = decapitalizedLabel;
                        }
                        if (!allLabels[item.concept.value]) {
                            allLabels[item.concept.value] = conceptLabel;
                        }

                        if (item.skosLabel) if (skosLabelsMap[item.concept.value].indexOf(item.skosLabel.value) < 0) skosLabelsMap[item.concept.value].push(item.skosLabel.value);
                        if (item.code) if (skosLabelsMap[item.concept.value].indexOf(item.code.value) < 0) skosLabelsMap[item.concept.value].push(item.code.value);
                        if (item.skosAltLabel) if (skosLabelsMap[item.concept.value].indexOf(item.skosAltLabel.value) < 0) skosLabelsMap[item.concept.value].push(item.skosAltLabel.value);
                    });

                    allData.forEach(function (item) {
                        var conceptLabel = getConceptLabel(item);
                        if (!conceptLabel) return;
                        var decapitalizedLabel = common.decapitalizeLabel(conceptLabel);
                        if (decapitalizedLabel != conceptLabel) {
                            conceptLabel = decapitalizedLabel;
                        }
                        if (!allClassesMap[item.concept.value]) {
                            allClassesMap[item.concept.value] = {
                                id: item.concept.value,
                                label: conceptLabel,
                                skoslabels: skosLabelsMap[item.concept.value],
                                parent: item.firstParent.value,
                                parents: [],
                                type: conceptType,
                            };
                        }
                    });
                    callbackSeries();
                },

                // set ancestors
                function (callbackSeries) {
                    function recurse(nodeId, parents) {
                        var obj = allClassesMap[nodeId];
                        if (!obj) return;
                        if (obj.parent && parents.indexOf(obj.parent) < 0) {
                            parents.push(obj.parent);
                            recurse(obj.parent, parents);
                        }
                    }

                    // chain parents
                    for (var key in allClassesMap) {
                        recurse(key, allClassesMap[key].parents);
                    }
                    //format parents
                    for (var key in allClassesMap) {
                        var obj = allClassesMap[key];
                        var parentArray = obj.parents;
                        parentArray.push(sourceLabel);
                        parentArray = parentArray.reverse();

                        //   delete allClassesMap[key].parent;
                        allClassesMap[key].parents = parentArray;
                    }
                    callbackSeries();
                },

                // add orphan parents to all data
                function (callbackSeries) {
                    //  return   callbackSeries()
                    var topNodesToAdd = [];
                    for (var key in allClassesMap) {
                        var parent = allClassesMap[key].parent;
                        if (parent && parent != sourceLabel) {
                            if (!allClassesMap[parent]) {
                                allClassesMap[parent] = {
                                    id: parent,
                                    label: Sparql_common.getLabelFromURI(parent),
                                    skoslabels: [],
                                    parent: sourceLabel,
                                    parents: [sourceLabel],
                                    type: "owl:class",
                                };
                            }
                        }
                    }
                    callbackSeries();
                },
            ],
            function (err) {
                return callback(err, { classesMap: allClassesMap, labels: allLabels });
            }
        );
    };

    self.createDecapitalizedLabelTriples = function (source, callback) {
        Sparql_generic.getItems(source, {}, function (err, result) {
            if (err) return callback(err);
            var total = 0;
            var slices = common.array.slice(result, 100);
            async.eachSeries(
                slices,
                function (slice, callbackEach) {
                    var triples = [];

                    slice.forEach(function (item) {
                        if (item.conceptLabel) {
                            var decapitalizedLabel = common.decapitalizeLabel(item.conceptLabel.value);
                            if (decapitalizedLabel == item.conceptLabel.value) return;

                            triples.push({
                                subject: item.concept.value,
                                predicate: "http://www.w3.org/2004/02/skos/core#altLabel",
                                object: decapitalizedLabel,
                            });
                        }
                    });

                    if (triples.length == 0) return callbackEach;
                    self.insertTriples(source, triples, null, function (err, result) {
                        total += result;
                        // eslint-disable-next-line no-console
                        console.log(total + " inserted");

                        callbackEach(err);
                    });
                },
                function (err) {
                    if (err) return callback(err);
                    return callback(err, total);
                }
            );
        });
    };

    return self;
})();
