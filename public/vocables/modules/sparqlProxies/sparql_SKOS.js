import Sparql_common from "./sparql_common.js";
import Sparql_generic from "./sparql_generic.js";
import Sparql_proxy from "./sparql_proxy.js";

//biblio
//https://www.iro.umontreal.ca/~lapalme/ift6281/sparql-1_1-cheat-sheet.pdf
/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_SKOS = (function () {
    self.getTopConcepts = function (sourceLabel, options, callback) {
        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>";
        query += sourceVariables.prefixesStr;
        query += " select distinct ?topConcept ?topConceptLabel " + sourceVariables.fromStr + "  WHERE {";
        query += sourceVariables.topConceptFilter;
        query += "?topConcept " + sourceVariables.prefLabelPredicate + " ?topConceptLabel.";
        if (sourceVariables.lang && !options.noLang) query += "filter(lang(?topConceptLabel )='" + sourceVariables.lang + "')";

        if (options.filterCollections) query += "?collection skos:member ?aconcept. ?aConcept skos:broader* ?topConcept." + Sparql_common.getUriFilter("collection", options.filterCollections);

        query += "  } ORDER BY ?topConceptLabel ";
        query += "limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept");
            return callback(null, result.results.bindings);
        });
    };

    /**
         *
         * request example with collection filtering
         PREFIX  terms:<http://purl.org/dc/terms/> PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> PREFIX  elements:<http://purl.org/dc/elements/1.1/>  select distinct ?child1,?child1Label, ?subjectLabel,?collLabel  FROM <http://souslesens/thesaurus/TEST/>   WHERE {?child1 skos:broader ?subject.

  ?subject skos:prefLabel ?subjectLabel.

  OPTIONAL{ ?child1 skos:prefLabel ?child1Label. } .filter( ?subject =<http://souslesens/thesaurus/TEST/9d53e3925c>)OPTIONAL{?child1 rdf:type ?child1Type.}

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

        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var filterStr = Sparql_common.setFilter("subject", ids, words, options);
        if (filterStr == "") return alert("no parent specified for getNodeChildren ");
        if (!options) {
            options = { depth: 0 };
        }

        var query = "";
        query += sourceVariables.prefixesStr;
        query += " select distinct * " + sourceVariables.fromStr + "  WHERE {";

        query += "?child1 " + sourceVariables.broaderPredicate + " ?subject." + "OPTIONAL{ ?child1 " + sourceVariables.prefLabelPredicate + " ?child1Label. ";
        if (sourceVariables.lang && !options.noLang) query += 'filter( lang(?child1Label)="' + sourceVariables.lang + '")';
        query += "}";
        query += filterStr;
        query += "OPTIONAL{?child1 rdf:type ?child1Type.}";

        descendantsDepth = Math.min(descendantsDepth, sourceVariables.optionalDepth);
        for (var i = 1; i < descendantsDepth; i++) {
            query +=
                "OPTIONAL { ?child" +
                (i + 1) +
                " " +
                sourceVariables.broaderPredicate +
                " ?child" +
                i +
                "." +
                "OPTIONAL{?child" +
                (i + 1) +
                " " +
                sourceVariables.prefLabelPredicate +
                "  ?child" +
                (i + 1) +
                "Label.";
            if (sourceVariables.lang && !options.noLang) query += "filter( lang(?child" + (i + 1) + 'Label)="' + sourceVariables.lang + '")';
            query += "}";
            query += "OPTIONAL {?child" + (i + 1) + " rdf:type ?child" + (i + 1) + "Type.}";
        }
        for (i = 1; i < descendantsDepth; i++) {
            query += "} ";
        }

        query += "} ";
        query += "limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "child"]);

            result.results.bindings = Sparql_generic.sortBindings(result.results.bindings, "child1Label");
            return callback(null, result.results.bindings);
        });
    };

    self.getCollectionNodes = function (sourceLabel, collection, options, callback) {
        $("#waitImg").css("display", "block");

        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var filterStr = "";
        if (options && options.filter) {
            if (options.filter.predicates) {
                filterStr = Sparql_common.setFilter("predicate", options.filter.predicates);
            }
        }

        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
            " select  distinct * " +
            sourceVariables.fromStr +
            "   WHERE { " +
            " ?subject ?predicate ?object. " +
            filterStr +
            "?subject rdf:type ?type. filter( not exists {?subject rdf:type skos:Collection})";

        if (!collection || collection == "") {
            query += "}";
            query += " limit " + sourceVariables.limit + " ";
        } else {
            query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                " select  distinct *  " +
                sourceVariables.fromStr +
                "   WHERE { " +
                " ?subject ?predicate ?object.  FILTER ( ?predicate in( skos:prefLabel,skos:broader) )" +
                "  ?subject rdf:type ?type. filter( not exists {?subject rdf:type skos:Collection}) " +
                "  ?collection skos:member* ?acollection. " +
                Sparql_common.getUriFilter("collection", collection) +
                "?acollection rdf:type skos:Collection.    ?acollection skos:member ?subject0. " +
                " ?subject (^skos:broader+|skos:broader?) ?subject0." +
                "   ?collection skos:prefLabel ?collectionLabel. " +
                "  ?acollection skos:prefLabel ?acollectionLabel. " +
                "  ?subject skos:prefLabel ?subjectLabel." +
                "filter( lang(?subjectLabel)='en')" +
                "} limit 10000";
            /*    query += "   ?collection skos:member* ?acollection. " + Sparql_common.getUriFilter("collection", collection) +
                    "?acollection rdf:type skos:Collection.    ?acollection skos:member/(^skos:broader+|skos:broader*) ?subject.  " +
                    "   ?collection skos:prefLabel ?collectionLabel." +
                    "   ?acollection skos:prefLabel ?acollectionLabel." +
                    "   ?subject skos:prefLabel ?subjectLabel." +//"filter(lang(?subjectLabel)='en')"+


                    "}"
                     query += " limit " + sourceVariables.limit + " ";*/
        }

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "predicate"]);
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        $("#waitImg").css("display", "block");

        if (!options) {
            options = { depth: 0 };
        }

        options.source = sourceLabel;
        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var filterStr = Sparql_common.setFilter("subject", ids, words, options);
        var query = "";
        query += sourceVariables.prefixesStr;
        query += " select distinct * " + sourceVariables.fromStr + "  WHERE {{";

        var labelPredicate = sourceVariables.prefLabelPredicate;
        if (options.searchAltLabels) labelPredicate = sourceVariables.prefLabelPredicate + "|skos:altLabel";
        query += "?subject " + labelPredicate + " ?subjectLabel. ";
        if (sourceVariables.lang && sourceVariables.lang != "" && !options.noLang) query += 'filter( lang(?subjectLabel)="' + sourceVariables.lang + '")';
        query += filterStr;
        query += "OPTIONAL{?subject rdf:type ?type.}";

        ancestorsDepth = Math.min(ancestorsDepth, sourceVariables.optionalDepth);
        for (var i = 1; i <= ancestorsDepth; i++) {
            if (i == 1) {
                query += "  OPTIONAL{?subject " + sourceVariables.broaderPredicate + " ?broader" + i + "." + "?broader" + i + " " + sourceVariables.prefLabelPredicate + " ?broader" + i + "Label.";
                if (sourceVariables.lang) query += "filter(lang(?broader" + i + 'Label)="' + sourceVariables.lang + '")';
            } else {
                query +=
                    "OPTIONAL { ?broader" +
                    (i - 1) +
                    " " +
                    sourceVariables.broaderPredicate +
                    " ?broader" +
                    i +
                    "." +
                    "?broader" +
                    i +
                    " " +
                    sourceVariables.prefLabelPredicate +
                    " ?broader" +
                    i +
                    "Label.";
                if (sourceVariables.lang && !options.noLang) query += "filter( lang(?broader" + i + 'Label)="' + sourceVariables.lang + '")';
            }
            query += "?broader" + i + " rdf:type ?type.";
        }

        for (i = 0; i < ancestorsDepth; i++) {
            query += "} ";
        }

        query += "  }";

        if (options.filterCollections) {
            query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections);
        }
        var limit = options.limit || Config.queryLimit;
        query += "}limit " + limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "broader"]);
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) options = {};
        options.source = sourceLabel;
        if (Config.sources[sourceLabel].controllerName != "Sparql_SKOS") {
            Config.sources[sourceLabel].controller.getNodeInfos(sourceLabel, conceptId, options, function (err, result) {
                callback(err, result);
            });
            return;
        }

        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var filter = Sparql_common.getUriFilter("id", conceptId);
        if (options.propertyFilter) {
            filter += Sparql_common.getUriFilter("prop", options.propertyFilter);
        }

        var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" + " select distinct * " + sourceVariables.fromStr + "  WHERE {" + " ?id ?prop ?value. ";
        if (options.getValuesLabels) query += "  Optional {?value skos:prefLabel ?valueLabel filter(lang(?valueLabel)='en')} Optional {?prop skos:prefLabel ?propLabel } ";
        query += filter + "} limit 10000";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getItems = function (sourceLabel, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }

        if (Config.sources[sourceLabel].controllerName != "Sparql_SKOS") {
            Config.sources[sourceLabel].controller.getItems(sourceLabel, options, function (err, result) {
                callback(err, result);
            });
            return;
        }

        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var query = "";
        query += sourceVariables.prefixesStr;
        query += " select distinct * " + sourceVariables.fromStr + "  WHERE {  ?subject ?x ?y. ";
        query += "OPTIONAL {?subject " + sourceVariables.prefLabelPredicate + " ?subjectLabel.}";

        if (options.filter) query += options.filter;

        if (sourceVariables.lang) query += "filter(lang(?subjectLabel )='" + sourceVariables.lang + "')";

        if (options.filterCollections) query += "?collection skos:member ?subject. " + Sparql_common.getUriFilter("collection", options.filterCollections);

        query += "  } ";
        query += "limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "subject");
            return callback(null, result.results.bindings);
        });
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
            "  ?subject " +
            sourceVariables.broaderPredicate +
            "* ?broader." +
            "filter (?subject=<" +
            id +
            ">) " +
            "?broader " +
            sourceVariables.prefLabelPredicate +
            " ?broaderLabel." +
            "?broader rdf:type ?type.";
        query += "  }";
        query += "limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
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
            "  ?subject ^" +
            sourceVariables.broaderPredicate +
            "*|" +
            sourceVariables.narrowerPredicate +
            "* ?narrower." +
            "filter (?subject=<" +
            id +
            ">) " +
            "?narrower " +
            sourceVariables.prefLabelPredicate +
            " ?narrowerLabel." +
            "?narrower rdf:type ?type.";
        query += "  }";
        query += "limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
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
            "?subject   rdf:type   ?type." +
            "?subject " +
            sourceVariables.prefLabelPredicate +
            " ?subjectLabel." +
            "filter (?subject=<" +
            id +
            ">) ";
        if (sourceVariables.lang) query += 'filter( lang(?subjectLabel)="' + sourceVariables.lang + '")';

        query += "}limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
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
                Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    triples = triples.concat(result.results.bindings);
                    return callbackEach();
                });
            },
            function (err) {
                return callback(err, triples);
            },
        );
    };

    self.deleteTriples = function (sourceLabel, subjectUri, predicateUri, objectUri, callback) {
        if (!subjectUri && !subjectUri && !subjectUri) return call("no subject predicate and object filter : cannot delete");

        var filterStr = "";
        if (subjectUri) filterStr += Sparql_common.getUriFilter("s", subjectUri);
        if (predicateUri) filterStr += Sparql_common.getUriFilter("p", predicateUri);
        if (objectUri) filterStr += Sparql_common.getUriFilter("o", objectUri);

        var query = "with <" + Config.sources[sourceLabel].graphUri + "> " + " DELETE {?s ?p ?o} WHERE{ ?s ?p ?o " + filterStr + "}";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.triplesObjectToString = function (item) {
        var valueStr = "";
        if (item.valueType == "uri") valueStr = "<" + item.object + ">";
        else {
            var langStr = "";
            if (item.sourceVariables.lang) langStr = "@" + item.sourceVariables.lang;
            valueStr = "'" + item.object + "'" + langStr;
        }

        var p = item.predicate.indexOf("^");
        if (p == 0) {
            var predicate = item.predicate.substring(1);
            return valueStr + " <" + predicate + "> <" + item.subject + ">. ";
        } else return "<" + item.subject + "> <" + item.predicate + "> " + valueStr + ". ";
    };

    self.insertTriples = function (sourceLabel, triples, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;
        var insertTriplesStr = "";
        triples.forEach(function (item, _index) {
            insertTriplesStr += self.triplesObjectToString(item);
        });

        var query = " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";

        // console.log(query)
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            return callback(err);
        });
    };

    self.update = function (sourceLabel, triples, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;
        var _deleteTriplesStr = "";
        var insertTriplesStr = "";
        var subject;
        triples.forEach(function (item, _index) {
            if (!subject) subject = item.subject;
            insertTriplesStr += self.triplesObjectToString(item);
        });
        var query =
            " WITH GRAPH  <" +
            graphUri +
            ">  " +
            "DELETE" +
            "{  " +
            "?s ?p ?o." +
            "  }" +
            "WHERE" +
            "  {" +
            "?s ?p ?o. filter (?s=<" +
            subject +
            ">)" +
            "  };" +
            "" +
            "INSERT DATA" +
            "  {" +
            insertTriplesStr +
            "  }";

        // console.log(query)
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            return callback(err);
        });
    };

    self.deleteGraph = function (sourceLabel, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;

        var query = " WITH <" + graphUri + "> DELETE {?s ?p ?o}";
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            return callback(err);
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

    self.setBindingsOptionalProperties = function (bindings, _field, options) {
        if (!options) options = {};
        bindings.forEach(function (item) {
            for (var i = 0; i < 20; i++) {
                var iStr = "" + i;
                if (i == 0) iStr = "";
                var field = _field + "" + iStr;
                if (!item[field]) {
                    break;
                }
                if (!item[field + "Type"]) {
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
        return bindings;
    };

    self.getSourceLangsList = function (sourceLabel, callback) {
        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
            " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " PREFIX  skos:<http://www.w3.org/2004/02/skos/core#>" +
            "  select  distinct ?language " +
            sourceVariables.fromStr +
            "   WHERE" +
            " { ?p skos:prefLabel ?o.   BIND( LANG(?o) AS ?language). } limit 1000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, result) {
            if (err) return callback(err);
            var langs = [];
            result.results.bindings.forEach(function (item) {
                langs.push(item.language.value);
            });
            return callback(null, langs);
        });
    };

    var defaultPredicates = {
        prefixes: [
            " terms:<http://purl.org/dc/terms/>",
            " rdfs:<http://www.w3.org/2000/01/rdf-schema#>",
            " rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            " skos:<http://www.w3.org/2004/02/skos/core#>",
            " elements:<http://purl.org/dc/elements/1.1/>",
        ],
        //  sourceVariables.topConceptFilter: "?topConcept rdf:type ?type. filter(?type in( <http://www.w3.org/2004/02/skos/core#ConceptScheme>,<http://www.w3.org/2004/02/skos/core#Collection>))"

        topConceptFilter: "?topConcept rdf:type ?topConceptType. filter(?topConceptType in( <http://www.w3.org/2004/02/skos/core#ConceptScheme>))",

        broaderPredicate: "skos:broader",
        narrowerPredicate: "skos:narrower",
        broader: "skos:broader",
        prefLabel: "skos:prefLabel",
        altLabel: "skos:altLabel",
        limit: 10000,
        optionalDepth: 5,
    };
    self.defaultPredicates = defaultPredicates;

    return self;
})();

export default Sparql_SKOS;

window.Sparql_SKOS = Sparql_SKOS;
