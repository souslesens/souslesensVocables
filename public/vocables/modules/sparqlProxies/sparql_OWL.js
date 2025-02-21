/** @module myModule */

import Sparql_common from "./sparql_common.js";
import Sparql_generic from "./sparql_generic.js";
import Sparql_proxy from "./sparql_proxy.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Sparql_OWL = (function () {
    var self = {};

    self.ancestorsDepth = 6;
    /** @function
     * @param source
     * @returns sparql (composed) predicate defining chilhood relation for a source depending on its natrue (OWL ,SKOS) and sourceConfig.taxonomyPredicates
     *
     * @options
     *    memberPredicate
     *    specificPredicates
     *
     */
    self.getSourceTaxonomyPredicates = function (source, options) {
        if (!options) {
            options = {};
        }
        var defaultTaxonomyPredicates = " <http://www.w3.org/2000/01/rdf-schema#subClassOf> ";

        if (!source) {
            return defaultTaxonomyPredicates;
        }
        var sourceConfig = Config.sources[source];

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

        if (!sourceConfig || !sourceConfig.taxonomyPredicates) {
            return defaultTaxonomyPredicates;
        }

        if (sourceConfig.taxonomyPredicates && sourceConfig.taxonomyPredicates.length == 0) {
            return defaultTaxonomyPredicates;
        }
        sourceConfig.taxonomyPredicates.forEach(function (item, index) {
            if (index > 0) {
                str += "|";
            }
            if (item.indexOf("http://") == 0) {
                str += " <" + item + "> ";
            } else {
                str += " " + item + " ";
            }
        });
        if (options.memberPredicate) {
            str += "|^rdfs:member";
        }

        return str;
    };
    /**
     *
     * @param sourceLabel
     * @param options
     *  .selectGraph -> includes the graph of each triple
     *  .withoutImports -> excludes imports from query
     * @param callback returns triples matching  source.topClassFilter field value or _default topClassFilter
     *  variables : [?subjectGraph] ?topConcept  ?topConceptLabel  ?subjectGraph
     */

    self.getTopConcepts = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = "";

        var strFilterTopConcept = "";
        if (!options.skipTopClassFilter) {
            var topClassFilter = Config.sources[sourceLabel].topClassFilter;
            if (topClassFilter && topClassFilter != "" && topClassFilter != "_default") {
                strFilterTopConcept = topClassFilter;
            } else {
                strFilterTopConcept = "?topConcept rdf:type  owl:Class. filter(NOT EXISTS {?topConcept " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) + " ?z}) ";
            }
        }

        if (options.filter) {
            strFilterTopConcept += options.filter;
        }

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        //fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports);
        fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports);

        if (Config.sources[sourceLabel].topClass) {
            self.topClass = Config.sources[sourceLabel].topClass;
        }

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "prefix owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "select   distinct ?topConcept  ?topConceptLabel  ?subjectGraph  " +
            fromStr +
            "  where {";
        if (options.selectGraph) {
            query += " GRAPH ?subjectGraph {";
        }
        if (Config.sources[sourceLabel].schemaType != "KNOWLEDGE_GRAPH") {
            query += "?topConcept rdf:type owl:Class.";
        }
        query += strFilterTopConcept + " OPTIONAL{?topConcept rdfs:label ?topConceptLabel.}" + "filter (!isBlank( ?topConcept))";
        if (options.filterCollections) {
            query +=
                "?collection skos:member ?aConcept. ?aConcept " +
                Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) +
                " ?topConcept." +
                Sparql_common.setFilter("collection", options.filterCollections, null, options);
        }

        query += Sparql_common.getLangFilter(sourceLabel, "topConceptLabel");
        if (options.selectGraph) {
            query += "}";
        }
        query += "}order by ?topConceptLabel ";
        (" }");

        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;
        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", {
                type: "http://www.w3.org/2002/07/owl#Class",
                source: sourceLabel,
            });

            return callback(null, result.results.bindings);
        });
    };

    /**
     *
     * @param sourceLabel
     * @param words word or array of words or letters( fuzzy match)
     * @param ids uri or array of uris
     * @param descendantsDepth depth  of recursivity
     * @param options
     *  .selectGraph -> includes the graph of each triple
     *  .exactMatch -->if words param determine the the regex filter on word
     * @param callback returns triples of matching nodes and descendants
     *   variables [?subjectGraph] ?subject (parent) ?subjectLabel ?child[X] ?shild[X]label
     *
     */

    self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
        if (!options) {
            options = {};
        }

        var fromStr = "";

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var strFilter = "";
        if (words) {
            strFilter = Sparql_common.setFilter("subject", null, words, options);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("subject", ids, null, options);
        }
        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        if (options.filter) {
            strFilter += options.filter;
        }

        fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports, options);

        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "select   distinct * " + fromStr + " where {";
        if (options.selectGraph) {
            query += " GRAPH ?child1Graph {";
        }
        query +=
            "?child1 " +
            Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel, options) +
            " ?subject.  FILTER (!isBlank(?subject)) " +
            strFilter +
            "OPTIONAL {?subject rdfs:label ?subjectLabel." +
            Sparql_common.getLangFilter(sourceLabel, "conceptLabel") +
            "}" +
            "OPTIONAL {?child1 rdfs:label ?child1Label." +
            Sparql_common.getLangFilter(sourceLabel, "child1Label") +
            "}" +
            "OPTIONAL {?child1 rdf:type ?child1Type.}";

        for (let i = 1; i < descendantsDepth; i++) {
            query +=
                "OPTIONAL { ?child" +
                (i + 1) +
                Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel, options) +
                " ?child" +
                i +
                "." +
                "OPTIONAL {?child" +
                (i + 1) +
                " rdfs:label  ?child" +
                (i + 1) +
                "Label.}";
        }

        for (let i = 1; i < descendantsDepth; i++) {
            query += "} ";
        }

        if (options.selectGraph) {
            query += "} "; // query += " GRAPH ?subjectGraph {?subject rdf:type ?o}";
        }
        query += "} ";

        // query +=" }";

        if (options.filterCollections) {
            fromStr = Sparql_common.getFromStr(sourceLabel);

            query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                " select  distinct * " +
                fromStr +
                "   WHERE { " +
                "  ?child1 " +
                Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) +
                " ?subject.   " +
                strFilter +
                "   ?collection skos:member* ?acollection. " +
                Sparql_generic.Sparql_common.getUriFilter("collection", options.filterCollections) +
                "?acollection rdf:type skos:Collection.    ?acollection skos:member/(" +
                Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) +
                "*) ?child1.  " +
                "  " +
                "   ?collection skos:prefLabel ?collectionLabel." +
                "   ?acollection skos:prefLabel ?acollectionLabel." +
                "   optional{?subject rdfs:label ?subjectLabel.}" +
                "   ?child1 rdfs:label ?child1Label." +
                "   ?child1 rdf:type ?child1Type." +
                "}";
        }
        if (options.sort) {
            query += " order by ?" + options.sort + " ";
        }
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "child"], { source: sourceLabel });
            return callback(null, result.results.bindings);
        });
    };

    self.getNodesDescendants = function (sourceLabel, ids, options, callback) {
        var predicateStr = Sparql_common.getSpecificPredicates(options) || "rdfs:subClassOf";
        var filterStr = Sparql_common.setFilter("parentClass", ids, null, { useFilterKeyWord: 1 });
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.selectGraph, options);

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "select   distinct ?subject " +
            fromStr +
            " where {?subject  (" +
            predicateStr +
            ")+ ?parentClass " +
            filterStr +
            "} order by ?subject limit 10000";

        var url = self.sparql_url + "?format=json&query=";
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result.results.bindings);
        });
    };

    self.getNodesGraphUri = function (sourceLabel, ids, options, callback) {
        var filterStr = Sparql_common.setFilter("s", ids, null, {});

        var query = " SELECT distinct ?g ?s WHERE {" + " Graph ?g {?s ?p ?o} " + filterStr + "} LIMIT  10000";
        var url = self.sparql_url + "?format=json&query=";
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result.results.bindings);
        });
    };

    /**
     *
     * @param sourceLabel
     * @param conceptId uri subject of triples
     * @param options
     *    .selectGraph
     *    .getValuesLabels  adds labels of objects in triples
     *    .inverseProperties union with   triples where conceptId is object in triples
     *    .limit  default limit if not set
     *
     *
     * @param callback returns triples matching query
     *   variables [?subjectGraph] ?prop ?value [?propLabel] [?valueLabel]
     */
    self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = "";

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph);

        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "select distinct * " +
            fromStr +
            " where {";
        if (options.selectGraph && Config.sources[sourceLabel].graphUri) {
            query += "graph ?g ";
        }
        query += "{<" + conceptId + "> ?prop ?value.  ";

        if (options.getValuesLabels) {
            query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} ";
        }
        if (query.excludeBlankNodes) {
            query += "    filter( !isBlank(?value))";
        }
        query += "}";

        if (options.inverseProperties) {
            query += "UNION {?value  ?prop <" + conceptId + "> .  ";
            if (options.getValuesLabels) {
                query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} ";
            }
            query += "}";
        }
        if (options.noRestrictions) {
            query += "  FILTER (!exists{?value rdf:type owl:Restriction} )";
        }

        query += " }";
        var limit = options.limit || Config.queryLimit;
        query += " LIMIT " + limit;

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        if (Config.sources[sourceLabel].imports && Config.sources[sourceLabel].imports.length > 0) {
            //limit at 4 ancestorsDepth when imports
            if (!ancestorsDepth) {
                ancestorsDepth = 1;
            }
            ancestorsDepth = Math.min(ancestorsDepth, 4);
        }

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        if (!options) {
            options = {};
        }
        var strFilter = "";
        if (words) {
            strFilter = Sparql_common.setFilter("subject", null, words, options);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("subject", ids, null, options);
        }
        options.selectGraph = false;
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports);

        var selectStr = " * ";
        if (true || options.excludeType) {
            selectStr = ' ?subject ?subjectLabel (GROUP_CONCAT(?subjectType;SEPARATOR=",") AS ?subjectTypes)';
            for (var i = 1; i <= ancestorsDepth; i++) {
                selectStr += '(GROUP_CONCAT(?broaderGraph1;SEPARATOR=",") AS ?broaderGraphs' + i + " ) ?broader" + i + " ?broader" + i + "Label";
            }
        }
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " select distinct " +
            selectStr +
            fromStr +
            "  WHERE {";

        query += "{GRAPH ?subjectGraph" + i + "{";
        query += "?subject rdf:type  ?subjectType. filter (?subjectType not in(owl:Restriction)) ";
        if (words) {
            query += " ?subject rdfs:label ?subjectLabel.";
        } else {
            query += " OPTIONAL { ?subject rdfs:label ?subjectLabel.}";
        }
        query += " }}\n";

        ancestorsDepth = Math.min(ancestorsDepth, self.ancestorsDepth);

        for (var i = 1; i <= ancestorsDepth; i++) {
            if (i == 1) {
                //  query += "  OPTIONAL{?subject " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) + "  ?broader" + i + ".";
                //   query += "  ?subject " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel, options) + "  ?broader" + i + ".";
                query += "  ?subject rdfs:subClassOf|rdf:type ?broader" + i + ".";
                query += "{GRAPH ?broaderGraph" + i + "{";
                query += "  ?broader1 rdf:type ?broaderType. filter(?broaderType !=owl:Restriction)} " + "filter (?broader1 !=owl:Class)";
                query += Sparql_common.getVariableLangLabel("broader" + i, true);
                query += "}\n";
                // query += " OPTIONAL{?broader" + i + " rdfs:label ?broader" + i + "Label.}";
            } else {
                query += "OPTIONAL { ?broader" + (i - 1) + " rdfs:subClassOf|rdf:type" + " ?broader" + i + ".";
                //   "?broader" + i + " rdf:type owl:Class."
                query += " ?broader" + i + " rdf:type ?broaderType" + i + ". filter(?broaderType" + i + " !=owl:Restriction) ";
                // query += "OPTIONAL{?broader" + i + " rdfs:label ?broader" + i + "Label."
                // + Sparql_common.getLangFilter(sourceLabel, "broader" + i + "Label") + "}";
                query += Sparql_common.getVariableLangLabel("broader" + i, true);
            }
        }

        for (let i = 1; i < ancestorsDepth; i++) {
            query += "} ";
        }
        query += " FILTER (!isBlank(?subject))" + strFilter;
        query += "  }";
        if (options.selectGraph) {
            query += " GRAPH ?broader1Graph {?broader1 ?p ?o}}";
        }

        if (options.filterCollections) {
            query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections);
        }

        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "broader"], { source: sourceLabel });
            return callback(null, result.results.bindings);
        });
    };

    self.getEntityAncestorsArray = function (sourceLabel, id, options, callback) {
        if (!options) {
            options = {};
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports, true);

        var typePredicate = "";
        if (options.individuals) {
            typePredicate = "|rdf:type*";
        }
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct *  " +
            fromStr +
            "WHERE {?subject rdfs:subClassOf*" +
            typePredicate +
            " ?ancestor ." +
            "FILTER (?subject=<" +
            id +
            ">) " +
            "?ancestor  rdf:type owl:Class. " +
            "?ancestor  rdfs:subClassOf ?parent. " +
            "?parent  rdf:type owl:Class. ";

        if (options.withLabels) {
            query += "OPTIONAL {?subject rdfs: label subjectLabel } OPTIONAL {?parent rdfs: label parentLabel }";
        }

        query += "} LIMIT 10000";

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "parent"], { source: sourceLabel });

            var parentsArray = [];

            if (options.orderAncestors) {
                // manage only one parentClass
                recurse = function (childId) {
                    result.results.bindings.forEach(function (item) {
                        if (item.ancestor.value == childId) {
                            var p = parentsArray.indexOf(item.ancestor.value);

                            if (p < 0) {
                                parentsArray.push(item.ancestor.value);
                                recurse(item.parent.value);
                            }
                        }
                    });
                };
                recurse(id);
            } else {
                parentsArray = [id];
                result.results.bindings.forEach(function (item) {
                    parentsArray.push(item.parent.value);
                });
            }
            return callback(null, parentsArray);
        });
    };

    self.getNodesAncestorsOrDescendantsOld = function (sourceLabel, classIds, options, callback) {
        if (!options) {
            options = {};
        }
        if (!Array.isArray(classIds)) {
            classIds = [classIds];
        }
        var filterStr = Sparql_common.setFilter("class", classIds);

        var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports, true);
        var modifier = "*";
        if (options.excludeItself) {
            modifier = "+";
        }
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            //  "SELECT distinct ?class ?type ?classLabel ?subClass ?subClassType ?subClassLabel ?superClass ?superClassType  ?superClassLabel " +
            "SELECT distinct ?class ?type ?classLabel ?subClass ?subClassType ?subClassLabel ?superClass ?superClassType  ?superClassLabel " +
            fromStr +
            " WHERE {" +
            " ?class rdf:type ?type." +
            " ?class rdfs:subClassOf" +
            modifier +
            "|rdf:type" +
            modifier +
            " ?superClass." +
            " ?superClass ^rdfs:subClassOf ?subClass." +
            " ?subClass rdf:type ?subClassType. ?superClass rdf:type ?superClassType" +
            filterStr +
            " filter (?superClassType !=owl:Restriction)";

        if (options.filter) {
            query += options.filter;
        }
        if (options.withLabels) {
            query += "OPTIONAL {?class rdfs: label classLabel }OPTIONAL {?subClass rdfs: label subClassLabel } OPTIONAL {?superClass rdfs: label superClassLabel }";
        }
        query += filterStr;

        query += "} LIMIT 1000";

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = true;
        if (Config.sources[sourceLabel]) {
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
            if (self.no_params) {
                url = self.sparql_url;
            }
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["class", "superClass", "subClass"], { source: sourceLabel });

            var map = {};
            result.results.bindings.forEach(function (item) {
                map[item.subClass.value] = item;
            });
            var hierarchyArray = [];

            function recurse(array, itemId) {
                if (map[itemId] && array.indexOf(itemId) < 0) {
                    array.push(itemId);
                    if (map[itemId].superClass && map[itemId].superClass.value) {
                        recurse(array, map[itemId].superClass.value);
                    }
                }
            }

            var hierarchies = {};
            classIds.forEach(function (id) {
                hierarchies[id] = [];
                recurse(hierarchies[id], id);
            });
            for (var key in hierarchies) {
                hierarchies[key].forEach(function (item, index) {
                    hierarchies[key][index] = map[item];
                });
            }

            return callback(null, { hierarchies: hierarchies, rawResult: result.results.bindings });
        });
    };

    /**
     * in this version (see getNodesAncestorsOrDescendantsOld ) hierarchy is not ordered , manages multiple hierarchy
     *
     * @param sourceLabel
     * @param classIds
     * @param options
     * @param callback
     */
    self.getNodesAncestorsOrDescendants = function (sourceLabel, classIds, options, callback) {
        if (!options) {
            options = {};
        }
        if (!Array.isArray(classIds)) {
            classIds = [classIds];
        }
        var filterStr = Sparql_common.setFilter("class", classIds, null, { values: 1 });

        var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports, true);
        var modifier = "*";
        if (options.excludeItself) {
            modifier = "+";
        }

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "SELECT distinct ?subject ?class ?type ?classLabel " +
            ' ?superClass ?superClassType ?superClassSubClass ?superClassLabel (GROUP_CONCAT(?subjectType;SEPARATOR=",") AS ?subjectTypes) ' +
            fromStr;
        var filterStr;
        if (!options.descendants) {
            filterStr = Sparql_common.setFilter("subject", classIds, null, { values: 1 });
            query +=
                "  WHERE {" +
                "  ?superClass ^rdfs:subClassOf ?superClassSubClass\n" +
                "  OPTIONAL {?superClassSubClass rdfs:label ?superClassSubClassLabel }" +
                "  OPTIONAL {?superClass rdfs:label ?superClassLabel }" +
                " { SELECT * where {" +
                "  ?class rdf:type ?type. ?class rdfs:subClassOf* ?superClass.\n" +
                "    ?superClass rdf:type ?superClassType filter (?superClassType !=owl:Restriction)\n" +
                "  ?subject  rdfs:subClassOf|rdf:type ?class. ?subject rdf:type ?subjectType ";
        } else {
            filterStr = Sparql_common.setFilter("superClass", classIds, null, { values: 1 });
            query +=
                "  WHERE {" +
                "   ?superClassSubClass  rdfs:subClassOf ?class" +
                "  \n" +
                " { SELECT * where {" +
                "  ?class rdf:type ?type. ?class rdfs:subClassOf* ?superClass.\n" +
                "    ?superClass rdf:type ?superClassType filter (?superClassType !=owl:Restriction)\n" +
                "   OPTIONAL {?class rdfs:label ?classLabel }" +
                "  ?subject  rdfs:subClassOf|rdf:type ?class. ?subject rdf:type ?subjectType ";
        }

        if (options.filter) {
            query += options.filter;
        }

        query += filterStr;

        //   query+="filter(!isBlank(?superClassSubClass))"

        query += "}}} LIMIT 1000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        self.no_params = true;
        if (Config.sources[sourceLabel]) {
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
            if (self.no_params) {
                url = self.sparql_url;
            }
        }
        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: sourceLabel,
                dontCacheCurrentQuery: true,
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }

                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["class", "superClass", "superClassSubClass"], { source: sourceLabel });

                var hierarchies = {};

                if (!options.descendants) {
                    classIds.forEach(function (id) {
                        hierarchies = {};
                        if (id == "http://tsf/resources/ontology/DEXPIProcess_gfi_2/AmbientTemperature") {
                            var x = 3;
                        }

                        hierarchies[id] = [];

                        result.results.bindings.forEach(function (item) {
                            if (item.superClass.type == "bnode") {
                                // if superClass is bnode  it causes problem !!
                                return;
                            }

                            if (item.subject.value == id) {
                                hierarchies[id].push(item);
                            }
                        });

                        for (var baseClassId in hierarchies) {
                            var hierarchy = hierarchies[baseClassId];
                            var parentsMap = {};
                            hierarchy.forEach(function (item) {
                                if (item.superClassSubClass) {
                                    parentsMap[item.superClassSubClass.value] = item;
                                }
                            });
                            var uniqueClass = {};
                            var orderedHierarchy = [];

                            function recurse(classId) {
                                if (parentsMap[classId] && !uniqueClass[classId]) {
                                    uniqueClass[classId] = 1;
                                    orderedHierarchy.push(parentsMap[classId]);
                                    if (parentsMap[classId].superClass.value) {
                                        recurse(parentsMap[classId].superClass.value);
                                    }
                                }
                            }

                            recurse(baseClassId);
                            hierarchies[baseClassId] = orderedHierarchy;
                        }
                        // tions.descendants
                    });
                } else {
                    //options.descendants

                    classIds.forEach(function (baseClassId) {
                        var childrenMap = {};
                        result.results.bindings.forEach(function (item) {
                            if (item.superClass.value == baseClassId) {
                                childrenMap[item.superClassSubClass.value] = item;
                            }
                        });

                        var orderedHierarchy = [];

                        function recurse(classId) {
                            for (var key in childrenMap) {
                                if (childrenMap[key].class.value == classId) {
                                    orderedHierarchy.push(childrenMap[key]);
                                    recurse(childrenMap[key].superClassSubClass.value);
                                }
                            }
                        }

                        recurse(baseClassId);
                        hierarchies[baseClassId] = orderedHierarchy;
                    });
                }

                return callback(null, { hierarchies: hierarchies, rawResult: result.results.bindings });
            },
        );
    };

    self.getNodesTypesMap = function (sourceLabel, ids, options, callback) {
        if (!options) {
            options = {};
        }
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        var filterStr = Sparql_common.setFilter("id", ids);

        var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports, true);

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            'select ?id (GROUP_CONCAT( distinct ?type;separator=";;")as ?types)   ' +
            fromStr +
            " where" +
            " { ?id rdf:type|rdfs:subClassOf  ?type." +
            "  filter (?type !=owl:Class && !isblank(?type)) " +
            filterStr +
            " }" +
            "GROUP  BY ?id " +
            "limit 10000";

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = true;
        if (Config.sources[sourceLabel]) {
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
            if (self.no_params) {
                url = self.sparql_url;
            }
        }
        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: sourceLabel,
                dontCacheCurrentQuery: true,
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                var map = {};
                result.results.bindings.forEach(function (item) {
                    map[item.id.value] = item.types.value;
                });
                return callback(null, map);
            },
        );
    };

    self.getFilteredTriples2 = function (sourceLabel, subjectIds, propertyIds, objectIds, options, callback) {
        var filterStr = "";

        if (subjectIds) {
            filterStr += Sparql_common.setFilter("subject", subjectIds, null, options);
        }
        if (objectIds) {
            filterStr += Sparql_common.setFilter("object", objectIds, null, options);
        }
        if (propertyIds) {
            filterStr += Sparql_common.setFilter("prop", propertyIds, null, options);
        }
        var fromStr = "";
        if (sourceLabel) {
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            fromStr = Sparql_common.getFromStr(sourceLabel, false, !options.withImports, options);
        } else {
            // to be  implemented
        }
        var sourceGraphUri = Config.sources[sourceLabel].graphUri;

        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>";

        var selectStr = "select distinct * ";
        if (options.distinct) {
            selectStr = "select distinct " + options.distinct + " ";
        }

        if (options.filter) {
            filterStr += " " + options.filter;
        }

        var query =
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            selectStr +
            fromStr +
            " WHERE{\n" +
            "  { graph ?g{ ?object rdf:type ?objectType. OPTIONAL { ?object rdfs:label ?objectLabel.}}}\n" +
            "   { graph ?g{  ?subject rdf:type ?subjectType. OPTIONAL { ?subject rdfs:label ?subjectLabel.}}}\n" +
            "   { graph ?g{ ?prop ?x ?propType. OPTIONAL { ?prop rdfs:label ?propLabel.}}}\n" +
            // "    { graph ?g{ ?prop rdf:type ?propType. OPTIONAL {?prop rdfs:label ?propLabel.}}\n" +
            "  \n" +
            "  {graph <" +
            sourceGraphUri +
            ">" +
            "{?subject ?prop ?object.  " +
            filterStr +
            "  } " +
            "}" +
            "} ";
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    /**
     *
     *
     * query triples fitered by subjectIds and/or propertyIds and/or objectIds
     * @param sourceLabel
     * @param subjectIds
     * @param propertyIds
     * @param objectIds
     * @param options
     *  - filter
     *  - onlyObjectProperties
     *  - distinct : variables string ?prop ?subject ?object
     *  - limit
     * @param callback returns  triples with variables ?subject ?prop ?object and associated labels
     */
    self.getFilteredTriples = function (sourceLabel, subjectIds, propertyIds, objectIds, options, callback) {
        if (!options) {
            options = {};
        }

        if (subjectIds && !Array.isArray(subjectIds)) {
            subjectIds = [subjectIds];
        }
        if (propertyIds && !Array.isArray(propertyIds)) {
            propertyIds = [propertyIds];
        }
        if (objectIds && !Array.isArray(objectIds)) {
            objectIds = [objectIds];
        }

        function query(subjectIds, propertyIds, objectIds, callbackQuery) {
            var filterStr = "";

            if (subjectIds) {
                filterStr += Sparql_common.setFilter("subject", subjectIds, null, options);
            }
            if (objectIds) {
                filterStr += Sparql_common.setFilter("object", objectIds, null, options);
            }
            if (propertyIds) {
                filterStr += Sparql_common.setFilter("prop", propertyIds, null, options);
            }
            var fromStr = "";
            if (sourceLabel) {
                self.graphUri = Config.sources[sourceLabel].graphUri;
                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

                fromStr = Sparql_common.getFromStr(sourceLabel, false, !options.withImports, options);
            } else {
                // to be  implemented
            }
            var sourceGraphUri = Config.sources[sourceLabel].graphUri;

            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>";

            if (options.distinct) {
                query += "select distinct " + options.distinct + " ";
            } else {
                query += "select distinct * ";
            }

            if (options.filter) {
                filterStr += " " + options.filter;
            }

            query +=
                fromStr +
                " WHERE {?subject ?prop ?object. " +
                filterStr +
                " " +
                "OPTIONAL {?subject rdf:type ?subjectType.} " +
                "OPTIONAL {?object rdf:type ?objectType.} " +
                "OPTIONAL {?object owl:hasValue ?objectValue.} " +
                Sparql_common.getVariableLangLabel("prop", true, null, filterStr) +
                Sparql_common.getVariableLangLabel("subject", true, null, filterStr) +
                Sparql_common.getVariableLangLabel("object", true, null, filterStr);
            /* "OPTIONAL{?prop rdfs:label ?propertyLabel.}  " +
" OPTIONAL{?subject rdfs:label ?subjectLabel.}  " +
" OPTIONAL{?object rdfs:label ?objectLabel.}  ";*/
            if (options.onlyObjectProperties) {
                (" ?prop rdf:type owl:ObjectProperty.");
            }

            if (!options.includeLiterals && !(options.filter && options.filter.indexOf("?object") > -1)) {
                query += " filter (!isLiteral(?object) )";
            }
            query += " } order by ?propLabel ";
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit;

            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
            if (self.no_params) {
                url = self.sparql_url;
            }
            Sparql_proxy.querySPARQL_GET_proxy(
                url,
                query,
                "",
                {
                    source: sourceLabel,
                    caller: "getFilteredTriples",
                },
                function (err, result) {
                    if (err) {
                        return callbackQuery(err);
                    }
                    result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["object", "prop", "subject"], {
                        source: sourceLabel,
                        caller: "getFilteredTriples",
                    });
                    return callbackQuery(null, result.results.bindings);
                },
            );
        }

        var slicedSubjectIds = null;
        var slicedObjectIds = null;

        var allResults = [];
        if (subjectIds) {
            slicedSubjectIds = common.array.slice(subjectIds, Sparql_generic.slicesSize);
            async.eachSeries(
                slicedSubjectIds,
                function (subjectIds, callbackEach) {
                    query(subjectIds, propertyIds, objectIds, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        allResults = allResults.concat(result);
                        callbackEach();
                    });
                },
                function (err) {
                    return callback(err, allResults);
                },
            );
        } else if (objectIds) {
            slicedObjectIds = common.array.slice(objectIds, Sparql_generic.slicesSize);

            async.eachSeries(
                slicedObjectIds,
                function (objectIds, callbackEach) {
                    query(subjectIds, propertyIds, objectIds, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        allResults = allResults.concat(result);
                        callbackEach();
                    });
                },
                function (err) {
                    return callback(err, allResults);
                },
            );
        } else {
            query(subjectIds, propertyIds, objectIds, function (err, result) {
                return callback(err, result);
            });
        }
    };

    /**
     *
     * @param sourceLabel
     * @param options
     *      -selectGraph
     *      -filter
     *      -lang
     *      -limit
     *
     *
     * @param callback return ?subject ?p ?o [?subjectLabel] [?subjectType] [?superClass]
     */
    self.getItems = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports);

        var query = "";
        query += "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

        var selectStr = "*";
        if (options.distinct) {
            selectStr = options.distinct;
        }

        query += " select distinct " + selectStr + " " + fromStr + "  WHERE {";

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        if (options.selectGraph) {
            query += " GRAPH ?g ";
        }
        query += "{ ?subject ?p ?o.";
        if (!options.includeBlankNodes) {
            query += "FILTER (!isBlank(?subject))";
        }
        query += "OPTIONAL {?subject rdfs:label ?subjectLabel.}";
        query += "OPTIONAL {?subject rdf:type ?subjectType.}";
        query += "OPTIONAL {?subject " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) + " ?superClass. }";

        if (options.filter) {
            query += options.filter;
        }
        if (options.lang) {
            query += "filter(lang(?subjectLabel )='" + options.lang + "')";
        }

        query += "  }} ";

        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "subject", { source: sourceLabel });
            return callback(null, result.results.bindings);
        });
    };
    self.listObjectProperties = function (sourceLabel, options, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel, false, true);
        var query =
            "PREFIX type: <http://info.deepcarbon.net/schema/type#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct * " +
            fromStr +
            " WHERE   {?prop rdf:type owl:ObjectProperty. OPTIONAL{?prop rdfs:label ?propLabel.} " +
            " OPTIONAL {?prop rdfs:subPropertyOf ?superProp. OPTIONAL{?superProp rdfs:label ?superPropLabel. }} " +
            " OPTIONAL {?prop rdfs:domain ?domain. OPTIONAL{?domain rdfs:label ?domainLabel. }} " +
            " OPTIONAL {?prop rdfs:range ?range. OPTIONAL{?range rdfs:label ?rangeLabel. }} " +
            "}  limit " +
            Config.queryLimit;

        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "superPropLabel"], { source: sourceLabel });
            return callback(null, result.results.bindings);
        });
    };
    /**
     *
     *
     *  get the rnage and domains of ObjectProperties
     * @domainIds array of ads or null
     * @options
     *  - inverseRestriction
     *  - propIds
     *  - subPropIds
     *  - filter
     *  - selectGraph
     *  - inheritedProperties
     *  - justPropertyAndLabel
     *  - limit
     *  - addInverseRestrictions
     *
     *
     *
     *
     *  returns ?domain ?prop ?range ?domainLabel ?propLabel ?rangeLabel ?subProp ?subPropLabel ?inverseProp ?inversePropLabel
     */
    self.getObjectPropertiesDomainAndRange = function (sourceLabel, domainIds, options, callback) {
        if (!options) {
            options = {};
        }

        var filterStr = "";
        if (domainIds) {
            filterStr = Sparql_common.setFilter("domain", domainIds, null, options);
        }
        if (options.inverseRestriction) {
            filterStr = Sparql_common.setFilter("range", domainIds, null, options);
        }
        if (options.propIds) {
            filterStr = Sparql_common.setFilter("prop", options.propIds, null, options);
        }
        if (options.subPropIds) {
            filterStr = Sparql_common.setFilter("subProp", options.subPropIds, null, options);
        }
        if (options.filter) {
            filterStr = options.filter;
        }
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.whitoutImports);

        var optionalLabelStr = "";
        if (options.filter && options.filter.indexOf("proplabel") < 0) {
            optionalLabelStr = " OPTIONAL ";
        }

        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct ?domain ?prop ?range ?domainLabel ?propLabel ?rangeLabel ?subProp ?subPropLabel ?inverseProp ?inversePropLabel" +
            fromStr +
            " WHERE {";

        if (options.selectGraph) {
            query += " GRAPH ?g ";
        }
        if (options.inheritedProperties) {
            query += "  { ?prop rdfs:subPropertyOf*/rdf:type owl:ObjectProperty ";
        } else {
            query +=
                "   {?prop rdf:type owl:ObjectProperty. " +
                optionalLabelStr +
                "{?prop rdfs:label ?propLabel.  " +
                Sparql_common.getLangFilter(sourceLabel, "propLabel") +
                "}" +
                "OPTIONAL{?prop owl:inverseOf ?inverseProp. " +
                "OPTIONAL{?inverseProp rdfs:label ?inversePropLabel.  " +
                Sparql_common.getLangFilter(sourceLabel, "inversePropLabel") +
                "}}";
        }

        if (!options.searchType) {
            query +=
                "OPTIONAL {?prop rdfs:range ?range. ?range rdf:type ?rangeType." +
                " OPTIONAL{?range rdfs:label ?rangeLabel.} } " +
                "OPTIONAL { ?prop rdfs:domain ?domain.  ?domain rdf:type ?domainType. " +
                "OPTIONAL{?domain rdfs:label ?domainLabel.}} " +
                " OPTIONAL {?prop rdfs:subPropertyOf ?subProp. OPTIONAL{?subProp rdfs:label ?subPropLabel. " +
                Sparql_common.getLangFilter(sourceLabel, "subPropLabel") +
                "}}";
        } else if (options.searchType == "property") {
            query += "?prop rdfs:label ?propLabel." + Sparql_common.getLangFilter(sourceLabel, "propLabel");
            query += Sparql_common.setFilter("prop", null, options.words, null);
        } else if (options.searchType == "domain") {
            query += "?prop rdfs:domain ?domain.  ?domain rdf:type ?domainType. ?domain rdfs:label ?domainLabel.";
            query += Sparql_common.setFilter("domain", null, options.words, null);
        } else if (options.searchType == "range") {
            query += "?prop rdfs:range ?range.  ?range rdf:type ?rangeType. ?range rdfs:label ?rangeLabel.";
            query += Sparql_common.setFilter("range", null, options.words, null);
        }

        query += filterStr + " }}";
        var limit = options.limit || Config.queryLimit;
        query += "  limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "inverseProp", "domain", "range"], { source: sourceLabel });
            if (options.addInverseRestrictions) {
                delete options.addInverseRestrictions;
                options.inverseRestriction = true;
                self.getObjectPropertiesDomainAndRange(sourceLabel, domainIds, options, function (err, resultInverse) {
                    result = result.results.bindings.concat(resultInverse);
                    return callback(null, result);
                });
            } else {
                return callback(null, result.results.bindings);
            }

            return callback(null, result.results.bindings);
        });
    };

    self.getObjectSubProperties = function (sourceLabel, propertyIds, options, callback) {
        if (!options) {
            options = {};
        }

        var filterStr = "";

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph);
        var filterStr = Sparql_common.setFilter("property", propertyIds);
        var query =
            "PREFIX type: <http://info.deepcarbon.net/schema/type#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct ?property ?propertyLabel ?subProperty ?subPropertyLabel " +
            fromStr +
            " WHERE {?subProperty rdfs:subPropertyOf+ ?property . " +
            " OPTIONAL{?subProperty rdfs:label ?subPropertyLabel.}  " +
            " OPTIONAL{?property rdfs:label ?propertyLabel.}  " +
            filterStr +
            "} limit 10000";

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["property", "subProperty"], { source: sourceLabel });
            return callback(null, result.results.bindings);
        });
    };

    /**
     *
     * gets restrictions
     *
     * @param sourceLabel
     * @param ids of domain or range depending on option inverseRestriction
     * @param options
     *  -inverseRestriction
     *  -selectGraph
     *  -listPropertiesOnly
     *  -withoutBlankNodes
     *  -someValuesFrom | allValuesFrom | aValueFrom
     *  -getMetadata
     *  -filter
     *  -limit
     *
     * @param callback return depending on options
     *  - ?g ?subject  ?prop ?propLabel ?subjectLabel  ?value ?valueLabel ?node
     */

    self.getObjectRestrictions = function (sourceLabel, subClassIds, options, callback) {
        if (!options) {
            options = {};
        }

        var filterStr = "";
        if (subClassIds) {
            var filteredClasses = subClassIds; //OntologyModels.filterClassIds(sourceLabel, subClassIds);
            if (filteredClasses.length != 0) {
                subClassIds = filteredClasses;
            }

            if (options.inverseRestriction) {
                filterStr = Sparql_common.setFilter("value", subClassIds, null, options);
            } else {
                filterStr = Sparql_common.setFilter("subject", subClassIds, null, options);
            }
        } else if (options.restrictionIds) {
            filterStr = Sparql_common.setFilter("value", options.restrictionIds, null, options);
        }
        var fromStr = "";
        if (sourceLabel) {
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            options.selectGraph = false; //!!!!!!!!!!!!!!PB cannot have graph when concept ands value are not in the same graph

            //   fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports)
            fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports, options);
        } else {
            fromStr = "";
        }

        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";

        if (options.turtle) {
            query += " CONSTRUCT {?subject  ?prop  ?value  ?constraintType}";
        } else if (options.listPropertiesOnly) {
            query += " SELECT distinct ?prop ?propLabel ";
        } else if (options.withoutBlankNodes) {
            query += " SELECT distinct ?subject  ?subjectLabel  ?prop ?propLabel ?value ?valueLabel ?constraintType";
        } else {
            query += "SELECT distinct * ";
        }
        query += "" + fromStr + " WHERE {";
        if (options.selectGraph) {
            query += " GRAPH ?g ";
        }
        query +=
            "{ ?subject rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction." +
            filterStr +
            " ?node owl:onProperty ?prop ." +
            Sparql_common.getVariableLangLabel("prop", true, null, filterStr) +
            Sparql_common.getVariableLangLabel("subject", true, null, filterStr);

        query += "    ?node ?constraintType ?value. ";

        query += "optional {?node ?cardinalityType ?cardinalityValue filter (?cardinalityType in (owl:maxCardinality,owl:minCardinality,owl:cardinality ))}";

        if (options.someValuesFrom) {
            query += " filter (?constraintType in (owl:someValuesFrom, owl:onClass))";
        } else if (options.allValuesFrom) {
            query += " filter (?constraintType in (owl:allValuesFrom,owl:onClass))";
        } else if (options.hasValue) {
            query += " filter (?constraintType in (owl:hasValue,owl:onClass))";
        } else {
            query += "  filter (?constraintType in (owl:someValuesFrom, owl:allValuesFrom,owl:hasValue,owl:onClass))";
        }

        query += Sparql_common.getVariableLangLabel("value", true);

        if (options.getMetadata) {
            query +=
                " ?node  <https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status>" +
                " ?status.?node <http://purl.org/dc/terms/created> ?creationDate. " +
                "?node  <http://purl.org/dc/terms/creator> ?creator." +
                "?node  <http://purl.org/dc/terms/source> ?provenance." +
                "?node <http://data.souslesens.org/property#domainSourceLabel> ?domainSourceLabel." +
                "?node <http://data.souslesens.org/property#rangeSourceLabel> ?rangeSourceLabel.";
        }

        var filter2 = options.filter;
        if (filter2) {
            filter2 = filter2.replace(/object/g, "value");
            query += " " + filter2 + " ";
        }

        query += "} }";
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: sourceLabel,
                caller: "getObjectRestrictions",
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                Sparql_common.setSparqlResultPropertiesLabels(sourceLabel, result.results.bindings, "prop", function (err, result2) {
                    if (err) {
                        return callback(err);
                    }
                    result2 = Sparql_generic.setBindingsOptionalProperties(result2, ["prop", "node", "subject", "value"], { source: sourceLabel });
                    return callback(null, result2);
                });
            },
        );
    };

    self.getInverseRestriction = function (sourceLabel, restrictionId, callback) {
        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
        query += "SELECT distinct *";
        query += Sparql_common.getFromStr(sourceLabel);
        query += "where";
        query += "{ graph ?g {?subject owl:inverseOf <" + restrictionId + ">." + "?subject ?predicate ?object.}}";
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: sourceLabel,
                caller: "getInverseRestrictions",
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.results.bindings);
            },
        );
    };

    self.getNamedIndividuals = function (sourceLabel, ids, options, callback) {
        if (!options) {
            options = {};
        }

        var filterStr = Sparql_common.setFilter("node", ids, null, options);
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph);

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT * " +
            fromStr +
            " WHERE ";
        if (options.selectGraph) {
            query += " GRAPH ?g ";
        }
        query += "{ ?subject rdf:type ?node. " + filterStr + " OPTIONAL {?subject rdfs:label ?subjectLabel}" + " OPTIONAL {?node rdfs:label ?nodeLabel}";
        query += " ?subject rdf:type owl:NamedIndividual .";
        query += " }";
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["node", "subject"], { source: sourceLabel });
            return callback(null, result.results.bindings);
        });
    };

    self.getCollectionNodes = function (sourceLabel, collection, options, callback) {
        $("#waitImg").css("display", "block");

        var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
        var filterStr = "";
        if (options && options.filter) {
            if (options.filter.predicates) {
                filterStr = Sparql_common.setFilter("predicate", options.filter.predicates, null, options);
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
        } else {
            query +=
                "   ?collection skos:member* ?acollection. " +
                Sparql_common.getUriFilter("collection", collection) +
                "?acollection rdf:type skos:Collection.    ?acollection skos:member/(^skos:broader+|skos:broader*) ?subject.  " +
                "   ?collection skos:prefLabel ?collectionLabel." +
                "   ?acollection skos:prefLabel ?acollectionLabel." +
                "   ?subject skos:prefLabel ?subjectLabel." +
                "filter(lang(?subjectLabel)='en')" +
                "}";
        }

        query += " limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "predicate"], { source: sourceLabel });
            return callback(null, result.results.bindings);
        });
    };

    /**
     *
     * @param source
     * @param ids
     * @param callback
     */
    self.getNodesTypes = function (source, ids, callback) {
        var slices = common.array.slice(ids, 200);
        var allData = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var filterStr = Sparql_common.setFilter("subject", slice, null, options);
                var query = " select  distinct *   WHERE { GRAPH ?g{ " + " ?subject rdf:type ?type. " + filterStr + " }}";

                query += " limit " + 10000 + " ";
                self.sparql_url = Config.sources[source].sparql_server.url;
                var url = self.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: source }, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    allData = allData.concat(result.results.bindings);
                    callbackEach();
                });
            },
            function (err) {
                return callback(err, allData);
            },
        );
    };
    self.getNodesOwlTypeMap = function (source, ids, callback) {
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        var slices = common.array.slice(ids, 200);
        var typesMap = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var filterStr = Sparql_common.setFilter("subject", slice);
                var fromStr = Sparql_common.getFromStr(source);
                var query =
                    " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                    "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                    ' select  distinct ?subject (GROUP_CONCAT( distinct ?type;separator=",") as ?types) ' +
                    fromStr +
                    "   WHERE { ?subject rdf:type ?type. " +
                    filterStr +
                    " }";

                query += " limit " + 10000 + " ";
                self.sparql_url = Config.sources[source].sparql_server.url;
                var url = self.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: source }, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    result.results.bindings.forEach(function (item) {
                        var type = null;
                        if (item.types.value.indexOf("NamedIndividual") > -1) {
                            type = "NamedIndividual";
                        }
                        if (item.types.value.indexOf("Class") > -1) {
                            type = "Class";
                        }
                        if (item.types.value.indexOf("Restriction") > -1) {
                            type = "Restriction";
                        }
                        typesMap[item.subject.value] = type;
                    });
                    callbackEach();
                });
            },
            function (err) {
                return callback(err, typesMap);
            },
        );
    };

    /**
     *
     * @param sourceLabel
     * @param propIds
     * @param options
     *  - subPropIds
     *  - filter
     *  - selectGraph
     *  - limit
     * @param callback retutns triples with variables
     *  -?prop
     *  - ?restriction
     *  - ?sourceClass
     *  - ?targetClass
     *
     *
     */

    self.getPropertiesRestrictionsDescription = function (sourceLabel, propIds, options, callback) {
        if (!options) {
            options = {};
        }
        var filterStr = "";
        filterStr = Sparql_common.setFilter("prop", propIds, null, options);
        if (options.subPropIds) {
            filterStr = Sparql_common.setFilter("subProp", options.subPropIds, null, options);
        }
        if (options.filter) {
            filterStr = options.filter;
        }
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph);

        var query =
            "PREFIX type: <http://info.deepcarbon.net/schema/type#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct * " +
            fromStr +
            " WHERE {";

        query +=
            " ?restriction <http://www.w3.org/2002/07/owl#onProperty> ?prop." +
            filterStr +
            "  ?sourceClass " +
            Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) +
            " ?restriction." +
            "  OPTIONAL {?restriction ?constraintType ?targetClass. filter (?constraintType in (owl:someValuesFrom, owl:allValuesFrom,owl:hasValue,owl:maxCardinality,owl:minCardinality,owl:cardinality))}";
        "  OPTIONAL {?targetClass rdfs:label ?targetClassLabel}}" + "  OPTIONAL {?sourceClass rdfs:label ?sourceClassLabel}" + "  OPTIONAL {?prop rdfs:label ?propLabel}";
        var limit = options.limit || Config.queryLimit;
        query += " }";
        query += "  limit " + limit;

        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setMissingLabels(result.results.bindings, ["prop", "subProp", "sourceClass", "targetClass"]);
            return callback(null, result.results.bindings);
        });
    };

    self.getNodesLabelTypesAndGraph = function (sourceLabel, ids, options, callback) {
        var filterStr = Sparql_common.setFilter("subject", ids, null);
        if (!options) {
            options = {};
        }

        var fromStr = (fromStr = Sparql_common.getFromStr(sourceLabel));

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            'SELECT distinct ?subject ?subjectLabel  (GROUP_CONCAT( distinct ?subjectType;separator=",") as ?sTypes)' +
            '(GROUP_CONCAT( distinct ?g;separator=", ") as ?graphs)' +
            fromStr +
            " WHERE {GRAPH ?g{" +
            "?subject rdf:type ?subjectType. " +
            Sparql_common.getVariableLangLabel("subject", false, true) +
            filterStr +
            " }";

        query += "}" + "GROUP BY ?subject ?subjectLabel  ";
        if (options.orderBy) {
            query += " ORDER BY " + options.orderBy;
        } else {
            query += " ORDER BY ?subjectLabel";
        }
        query += " LIMIT 10000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            // _result.results.bindings=   Sparql_generic.setBindingsOptionalProperties(_result.results.bindings, ["subject"]);

            callback(null, _result.results.bindings);
        });
    };

    /**
     * returns all URIs,labels and graph (option selectGraph) of classes a source
     *
     * @param sourceLabel
     * @param options
     *  -lang
     *  -filter
     *  -selectGraph
     *  -limit
     * @param processor function
     * @param callback
     *  returns ?id ?label [?g]
     */
    self.getDictionary = function (sourceLabel, options, processor, callback) {
        if (!options) {
            options = {};
        }
        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "SELECT distinct  ?id ?type ?label " +
            fromStr +
            " WHERE {";
        if (options.selectGraph) {
            query += " GRAPH ?g ";
        }

        var langFilter = "";
        if (options.lang) {
            langFilter = " FILTER (lang(?label)='" + options.lang + "' || !lang(?label))  ";
        } else {
            // langFilter= Sparql_common.getVariableLangLabel("label", true);
        }
        var filter = "";
        if (options.filter) {
            filter = options.filter;
        }
        if (!options.includeBlankNodes) {
            filter += " FILTER (!isblank(?id))";
        }

        var typeFilterStr = "";
        if (options.type) {
            typeFilterStr = "?id rdf:type ?type. FILTER (?type =" + options.type + ")";
        }
        else if (options.filter) {
            typeFilterStr = options.filter
        } else {
            typeFilterStr = "";
        }

        var optionalLabel = "OPTIONAL";
        if (options.filter && options.filter.indexOf("?label") > -1) {
            optionalLabel = "";
        }
        var skosPrefLabel = "";
        if (options.skosPrefLabel) {
            skosPrefLabel = "OPTIONAL {?id skos:prefLabel ?skosPrefLabel}";
        }

        query += "{ " + typeFilterStr + " " + optionalLabel + " {?id rdfs:label ?label " + langFilter + "}" + filter + " }" + skosPrefLabel + "}";

        var allData = [];
        var resultSize = 1;
        var limitSize = 2000;
        if (options.processorFectchSize) {
            limitSize = options.processorFectchSize;
        }
        var totalLimit = options.limit || Config.queryLimit;
        var offset = 0;
        async.whilst(
            function (_test) {
                return resultSize > 0 && allData.length < totalLimit;
            },
            function (callbackWhilst) {
                var query2 = "" + query;

                query2 += " limit " + limitSize + " offset " + offset;

                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                var url = self.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", { source: sourceLabel }, function (err, result) {
                    if (err) {
                        return callbackWhilst(err);
                    }
                    result = result.results.bindings; // Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["label"], { source: sourceLabel });
                    resultSize = result.length;
                    offset += limitSize;
                    if (processor) {
                        processor(result, function (err, _result) {
                            if (err) {
                                return callbackWhilst(err);
                            }
                            callbackWhilst();
                        });
                    } else {
                        allData = allData.concat(result);
                        callbackWhilst();
                    }
                });
            },
            function (err) {
                callback(err, allData);
            },
        );
    };

    self.getPredicates = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = "";
        if (options.withoutImports) {
            fromStr = Sparql_common.getFromStr(sourceLabel, false, true);
        } else {
            fromStr = Sparql_common.getFromStr(sourceLabel, true, false);
        }

        var query =
            "PREFIX owl: <https://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?g ?property  " +
            fromStr +
            "WHERE {\n";
        if (!options.withoutImports) {
            query += "  GRAPH ?g";
        }
        query += "" + "{ ?sub ?property ?obj ." + Sparql_common.getVariableLangLabel("property", true, true) + "}" + "} LIMIT 10000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result.results.bindings);
        });
    };
    self.getObjectProperties = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.withGraph, options.withoutImports);
        var query =
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct *  " +
            fromStr +
            " WHERE {" +
            (options.withGraph ? " GRAPH ?g{" : "") +
            "?property rdf:type owl:ObjectProperty. " +
            Sparql_common.getVariableLangLabel("property", null, options.skosLabels);
        if (options.filter) {
            query += options.filter;
        }
        query += options.withGraph ? " }" : "";
        query += "  }   limit 10000";
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result.results.bindings);
        });
    };

    self.getUrisNamedGraph = function (sourceLabel, ids, options, callback) {
        if (!options) {
            options = {};
        }

        var allResults = [];
        var sliceSize = 200;
        var slices = common.array.slice(ids, sliceSize);
        async.eachSeries(
            slices,
            function (ids, callbackEach) {
                var filter = Sparql_common.setFilter("id", ids);
                if (options.onlySourceAndImports) {
                    var sources = Config.sources[sourceLabel].imports;
                    sources.push(sourceLabel);
                    var graphUris = [];
                    sources.forEach(function (source) {
                        graphUris.push(Config.sources[source].graphUri);
                    });
                    filter += Sparql_common.setFilter("g", graphUris);
                }
                var fromStr = Sparql_common.getFromStr(sourceLabel, options.withGraph, options.withoutImports);
                var query = "SELECT distinct ?id ?g " + fromStr + "WHERE {GRAPH ?g{?id ?p ?o. " + filter + "}} limit 10000";

                self.sparql_url = Config.sparql_server.url;
                var url = self.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {}, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    allResults = allResults.concat(result.results.bindings);
                    return callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, allResults);
            },
        );
    };

    self.getGraphsByRegex = function (pattern, callback) {
        var query = "SELECT * " + "WHERE {" + '  ?s <http://www.w3.org/2002/07/owl#versionIRI> ?graph. filter (regex(str(?graph),"' + pattern + '"))' + " ?graph ?p ?value." + "}";

        self.sparql_url = Config.sparql_server.url;
        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.generateInverseRestrictions = function (source, propId, inversePropId, cardinality, callback) {
        var filter = "filter (?prop=<" + propId + ">)";
        self.getObjectRestrictions(source, null, { filter: filter }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var triples = [];
            result.forEach(function (item) {
                if (item.value && item.subject) {
                    triples = triples.concat(Lineage_createRelation.getRestrictionTriples(item.value.value, item.subject.value, null, inversePropId));
                }
            });
            var totalItems = 0;
            var sliceSize = 200;
            var slices = common.array.slice(triples, sliceSize);
            async.eachSeries(
                slices,
                function (slice, callbackEach) {
                    Sparql_generic.insertTriples(source, slice, null, function (err, _result) {
                        if (err) {
                            return callbackEach(err);
                        }
                        UI.message((totalItems += slice.length) + " done ");
                        callbackEach();
                    });
                },
                function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(err, totalItems);
                },
            );
        });
    };

    self.getPropertiesInheritedConstraints = function (sourceLabel, properties, options, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.withGraph, options.withoutImports);
        var filterProps = Sparql_common.setFilter("prop0", properties, null, { useFilterKeyWord: 1 });
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?prop0 ?prop ?domain ?range" +
            fromStr +
            " WHERE {" +
            "{?prop0 rdfs:subPropertyOf+ ?prop . ?prop rdfs:domain ?domain optional {?prop rdfs:range ?range } }" + //optional {?domain rdfs:label ?domainLabel}"+ filterProps+"}"+
            " UNION " +
            "{?prop0 rdfs:subPropertyOf+ ?prop . ?prop rdfs:range ?range  optional {?prop rdfs:domain ?domain }}" + //optional {?range rdfs:label ?rangeLabel}"+ filterProps+"}"+
            "} LIMIT 10000";

        /*   var query=  "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
 "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
 "SELECT distinct * " +
 fromStr +
 "WHERE {?prop0 rdfs:subPropertyOf+ ?prop." +
 "  optional { ?prop rdfs:domain ?domain}" +
 "  optional{ ?prop rdfs:range ?range }" +
 filterProps +
 "} LIMIT 10000"*/

        var url;
        if (!Config.sources[sourceLabel]) {
            url = Config.sparql_server.url + "?format=json&query=";
        } else {
            url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "propRange", "domain", "range", "subProp", "inverseProp"], {
                source: sourceLabel,
            });

            var propsMap = {};

            result.results.bindings.forEach(function (item) {
                var obj = {};
                for (var key in item) {
                    obj[key] = item[key].value;
                }
                propsMap[obj.prop0] = {
                    parentProp: obj.prop,
                    prop: obj.prop0,
                    domain: obj.domain,
                    range: obj.range,
                    domainLabel: obj.domainLabel || obj.domain ? Sparql_common.getLabelFromURI(obj.domain) : null,
                    rangeLabel: obj.rangeLabel || obj.range ? Sparql_common.getLabelFromURI(obj.range) : null,
                };
            });

            return callback(null, propsMap);
        });
    };

    /**
     * calculates also ranges and domains for inverse properties
     *
     *
     * returns map of object, example :
     *  "http://rds.posccaesar.org/ontology/lis14/rdl/hasArrangedPart": {
     *         "prop": "http://rds.posccaesar.org/ontology/lis14/rdl/hasArrangedPart",
     *         "propLabel": "hasArrangedPart",
     *         "subProps": [
     *             "http://rds.posccaesar.org/ontology/lis14/rdl/hasAssembledPart",
     *             "http://rds.posccaesar.org/ontology/lis14/rdl/hasFeature"
     *         ],
     *         "domain": "http://rds.posccaesar.org/ontology/lis14/rdl/PhysicalObject",
     *         "domainLabel": "PhysicalObject",
     *          "range": "http://rds.posccaesar.org/ontology/lis14/rdl/xx",
     *         "rangeLabel": "xx",
     *         "inverseProp": "http://rds.posccaesar.org/ontology/lis14/rdl/arrangedPartOf",
     *         "inversePropLabel": "arrangedPartOf"
     *     },
     *
     *
     *
     *
     */

    self.getInferredPropertiesDomainsAndRanges = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var labelProperty = "rdfs:label";
        if (options.prefLabelAlso) {
            labelProperty = "rdfs:label|skos:prefLabel";
        }
        var filter = options.filter || "";

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>SELECT  distinct *  " +
            fromStr +
            "  WHERE {" +
            "   {" +
            "     ?prop " +
            labelProperty +
            " ?propLabel .   filter( lang(?propLabel)= '" +
            Config.default_lang +
            "' || !lang(?propLabel))" +
            "    ?prop rdf:type owl:ObjectProperty. " +
            filter +
            "  }" +
            " UNION " +
            "   {" +
            "    ?prop rdf:type owl:ObjectProperty. " +
            "     ?prop rdfs:domain  ?propDomain.    ?propDomain " +
            labelProperty +
            "  ?propDomainLabel.   FILTER (lang(?propDomainLabel)='en' || !lang(?propDomainLabel))" +
            filter +
            "  }" +
            " UNION " +
            "  {" +
            "    ?prop rdf:type owl:ObjectProperty. " +
            "     ?prop rdfs:range  ?propRange.    ?propRange " +
            labelProperty +
            "  ?propRangeLabel.   FILTER (lang(?propRangeLabel)='en' || !lang(?propRangeLabel))" +
            filter +
            "}" +
            "   UNION " +
            "   {?prop rdf:type owl:ObjectProperty. " +
            "  ?subProp rdfs:subPropertyOf ?prop .   ?subProp " +
            labelProperty +
            "  ?subPropLabel     filter(   lang(?subPropLabel)= 'en' || !lang(?subPropLabel))" +
            filter +
            "  }" +
            "  UNION " +
            "   {?prop rdf:type owl:ObjectProperty." +
            "  ?prop owl:inverseOf|^owl:inverseOf ?inverseProp optional {?inverseProp " +
            labelProperty +
            ' ?inversePropLabel    {filter( langMatches( lang(?inversePropLabel), "en" ))} ' +
            "  }" +
            filter +
            "  } " +
            "} LIMIT 10000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["propDomain", "propRange", "domain", "range", "subProp", "inverseProp"], {
                source: sourceLabel,
            });

            var propsMap = {};

            var domainsMap = {};
            var rangesMap = {};
            result.results.bindings.forEach(function (item) {
                if (!propsMap[item.prop.value]) {
                    propsMap[item.prop.value] = {
                        prop: item.prop.value,
                        propLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                        subProps: [],
                    };
                }
                if (item.propDomain) {
                    propsMap[item.prop.value].domain = item.propDomain.value;
                    propsMap[item.prop.value].domainLabel = item.propDomainLabel.value;
                }
                if (item.propRange) {
                    propsMap[item.prop.value].range = item.propRange.value;
                    propsMap[item.prop.value].rangeLabel = item.propRangeLabel.value;
                }
                if (item.subProp) {
                    propsMap[item.prop.value].subProps.push(item.subProp.value);
                }
                if (item.inverseProp) {
                    propsMap[item.prop.value].inverseProp = item.inverseProp.value;
                    propsMap[item.prop.value].inversePropLabel = item.inversePropLabel.value;
                }
            });

            return callback(null, propsMap);
        });
    };

    self.getInferredPropertiesDomainsAndRangesOld = function (sourceLabel, options, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "SELECT distinct * " +
            fromStr +
            " WHERE {{" +
            "   ?prop rdf:type owl:ObjectProperty. " +
            "   optional { ?subProp rdfs:subPropertyOf ?prop  optional { ?subProp rdfs:label|skos:prefLabel  ?subPropLabel}} " +
            "   optional { ?prop rdfs:label|skos:prefLabel ?propLabel} " + // filter(?prop in (<http://rds.posccaesar.org/ontology/lis14/rdl/hasResident>,<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn>))" +
            " optional { ?prop rdfs:domain ?propDomain. ?domain  rdfs:subClassOf* ?propDomain  filter ( isIRI(?propDomain))  optional { ?propDomain rdfs:label|skos:prefLabel  ?propDomainLabel}} " +
            "    optional { ?prop rdfs:range ?propRange. ?range  rdfs:subClassOf* ?propRange. filter ( isIRI(?propRange))  optional { ?propRange rdfs:label|skos:prefLabel  ?propRangeLabel}}" +
            "      optional { ?prop owl:inverseOf|^owl:inverseOf ?inverseProp optional {?inverseProp rdfs:label|skos:prefLabel ?inversePropLabel}  " +
            "       optional { ?inverseProp rdfs:range ?propDomain. ?domain  rdfs:subClassOf* ?propDomain  filter (isIRI(?propDomain))} " +
            "     optional{ ?inverseProp rdfs:domain ?propRange. ?range  rdfs:subClassOf* ?propRange. filter (isIRI(?propRange))}" +
            "    }";
        if (options.filter) {
            query += options.filter;
        }
        query += "  }" + "} LIMIT 10000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            if (err) {
                return callback(err);
            }

            _result.results.bindings = _result.results.bindings; // Sparql_generic.setBindingsOptionalProperties(_result.results.bindings, ["propDomain", "propRange", "domain", "range", "subProp", "inverseProp"]);
            return callback(null, _result.results.bindings);
        });
    };

    self.getPropertiesWithoutDomainsAndRanges = function (sourceLabel, options, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "SELECT distinct * " +
            fromStr +
            " WHERE {{" +
            "  ?prop rdf:type owl:ObjectProperty. " +
            "     ?prop rdfs:label|skos:prefLabel ?propLabel .   filter( lang(?propLabel)= 'en' || !lang(?propLabel))" +
            "}" +
            "    minus {" +
            "    ?prop rdf:type owl:ObjectProperty.?prop rdfs:subPropertyOf* ?superProp. ?superProp (rdfs:domain|rdfs:range) ?x  filter ( isIRI(?x)) " +
            " optional { ?prop rdfs:label|skos:prefLabel  ?propLabel}" +
            "  }" +
            "   minus {" +
            "    ?prop rdf:type owl:ObjectProperty.?prop (owl:inverseOf|^owl:inverseOf)/rdfs:subPropertyOf* ?superProp. ?superProp (rdfs:domain|rdfs:range) ?x filter ( isIRI(?x))  " +
            " optional { ?prop rdfs:label|skos:prefLabel  ?propLabel}" +
            "  }" +
            "} LIMIT 20000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            _result.results.bindings = Sparql_generic.setBindingsOptionalProperties(_result.results.bindings, ["prop", "superProp"], { source: sourceLabel });

            return callback(null, _result.results.bindings);
        });
    };

    self.getAllTriples = function (sourceLabel, role, ids, options, callback) {
        if (!options) {
            options = {};
        }

        var fromStr = "";
        if (options.source) {
            sourceLabel = options.source;
            options.graphUri = Config.sources[options.source].graphUri;
        }

        if (!sourceLabel) {
            if (!options.graphUri && options.source) {
                return callback("no source or graphUri specified");
            } else {
                fromStr = "FROM <" + options.graphUri + "> ";
            }
        } else {
            fromStr = Sparql_common.getFromStr(sourceLabel);
        }

        var slices = [[]];
        if (role && ids) {
            slices = common.array.slice(ids, Sparql_generic.slicesSize);
        }
        var allResults = [];
        async.eachSeries(
            slices,
            function (sliceIds, callbackEach) {
                var query =
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "SELECT  * " +
                    fromStr +
                    " WHERE { ?subject ?predicate ?object." +
                    "OPTIONAL {?subject rdfs:label ?subjectLabel.}" +
                    "OPTIONAL {?predicate rdfs:label ?predicateLabel.}" +
                    "OPTIONAL {?object rdfs:label ?objectLabel.}" +
                    "";

                if (role && ids) {
                    query += Sparql_common.setFilter(role, sliceIds);
                }
                if (options.removeBlankNodesObjects) {
                    query += " FILTER (!isBlank(?object)) ";
                }

                query += "}LIMIT 10000";

                var url = Config.sources[sourceLabel || "_defaultSource"].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    allResults = allResults.concat(_result.results.bindings);
                    callbackEach();
                });
            },
            function (err) {
                return callback(null, allResults);
            },
        );
    };

    self.getTriples = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr;
        if (!sourceLabel) {
            if (options.graphUri) {
                fromStr = " FROM <" + options.graphUri + "> ";
            } else {
                return callback("no graphUri or source");
            }
        } else {
            fromStr = Sparql_common.getFromStr(sourceLabel);
        }

        var selectStr = "*";
        if (options.selectVars) {
            selectStr = options.selectVars;
        }

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT   " +
            selectStr +
            " " +
            fromStr +
            " WHERE { ?s ?p ?o.";
        if (options.filter) {
            query += options.filter;
        }

        query += "}";
        if (options.orderBy) {
            query += " ORDER BY " + options.orderBy;
        }
        query += " LIMIT 10000";

        var url = Config.sources[sourceLabel] ? Config.sources[sourceLabel].sparql_server.url : Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            var allResults = _result.results.bindings;
            callback(null, allResults);
        });
    };

    self.getStoredQueries = function (source, scope, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source);

        var query = "PREFIX slsv:<" + Config.storedQueries_graphUri + "> \nselect * " + fromStr + ' where {?s ?p ?o.?s slsv:hasScope "' + scope + '"}order by ?label';

        var url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: source }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            return calback(null, _result.results.bindings);
        });
    };

    self.generateOWL = function (sourceLabel, options, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;

        var fromStr = Sparql_common.getFromStr(sourceLabel, false, true);
        if (!options) {
            options = {};
        }
        var filterStr = "";
        if (options.filter) {
            filterStr = options.filter;
        }

        var resultSize = 1;
        var offset = 0;
        var size = 1000;
        var url = Config.sources[sourceLabel].sparql_server.url + "?query=";
        var str = "";
        var prefixesStr = "";
        async.whilst(
            function (_test) {
                return resultSize < 16;
            },

            function (callbackWhilst) {
                var query = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } offset " + offset + " limit " + size + "";

                Sparql_proxy.querySPARQL_GET_proxy(
                    url,
                    query,
                    null,
                    {
                        source: sourceLabel,
                        acceptHeader: "text/turtle",
                        // acceptHeader: "application/rdf+xml",
                    },

                    function (err, result) {
                        if (err) {
                            return callbackWhilst(err);
                        }
                        offset += size;
                        resultSize = result.result.length;

                        var lines = result.result.split("\n");
                        lines.forEach(function (line) {
                            if (line.indexOf("@prefix") == 0) {
                                line = line.replace("/[\t\r]/g", "");
                                //  line = line.replace(/\./g, "") + "\n";
                                prefixesStr += line + "\n";
                            } else {
                                str += line + "\n";
                            }
                        });

                        callbackWhilst(null, result.result);
                    },
                );
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, prefixesStr + str);
            },
        );
    };

    self.getDistinctClassLabels = function (sourceLabel, classIds, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var filterStr = Sparql_common.setFilter("type", classIds);
        var labelProperty = "rdfs:label";
        if (options.otherProperty) {
            labelProperty = "<" + options.otherProperty + ">";
        }
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct ?label ?id" +
            fromStr +
            "" +
            " WHERE {{ ?id rdf:type ?type. " +
            filterStr +
            "?id " +
            labelProperty +
            " ?label  }} limit 10000";
        var url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            return callback(null, _result.results.bindings);
        });
    };

    self.getDataTypePropertyValues = function (sourceLabel, propertyUri, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel);

        var query =
            "" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            " Select distinct ?o    " +
            fromStr +
            " where { ?s  <" +
            propertyUri +
            "> ?o } LIMIT 10000";
        var url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            return callback(null, _result.results.bindings);
        });
    };

    self.getClassIndividuals = function (sourceLabel, classIds, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var filterStr = Sparql_common.setFilter("type", classIds);

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct ?label ?id" +
            fromStr +
            "" +
            " WHERE {{ ?id rdf:type ?type.?id rdf:type ?type2. " +
            filterStr +
            "  FILTER (?type2=owl:NamedIndividual) " +
            "?id rdfs:label ?label  }} limit 10000";
        var url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            return callback(null, _result.results.bindings);
        });
    };

    self.getLabelsMapFromLabelsGraph = function (ids, callback) {
        var filter = Sparql_common.setFilter("sub", ids);
        var query =
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT    distinct ?sub ?label from  <" +
            Config.labelsGraphUri +
            "> " +
            " WHERE {?sub rdfs:label ?label " +
            filter +
            "  } limit 10000";
        var url = Config.sparql_server.url + "?query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: Config._defaultSource }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var labelsMap = {};
            result.results.bindings.forEach(function (item) {
                labelsMap[item.sub.value] = item.label.value;
            });
            ids.forEach(function (id) {
                if (!labelsMap[id]) {
                    labelsMap[id] = Sparql_common.getLabelFromURI(id);
                }
            });

            return callback(null, labelsMap);
        });
    };

    self.clearGraph = function (graphUri, callback) {
        // return callbackSeries();
        const payload = { graphUri: graphUri };
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/clearGraph`,
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                UI.message("graph deleted " + Config.labelsGraphUri);
                callback();
            },
            error(err) {
                callback(err);
            },
        });
    };

    self.getClassIndividualsDistinctProperties = function (sourceLabel, classId, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var query =
            "" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            " Select distinct ?p ?pType   " +
            fromStr +
            " where {\n" +
            " ?s  rdf:type " +
            "<" +
            classId +
            ">. " +
            " ?s  ?p ?o.   ?o rdf:type ?oType";
    };

    self.copyUriTriplesFromSourceToSource = function (fromSource, toSource, subjectUri, callback) {
        self.getNodeInfos(fromSource, subjectUri, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            if (result.length == 0) {
                return callback("nothing to copy");
            }
            var toStr = Sparql_common.getFromStr(toSource);

            var triples = [];
            result.forEach(function (item) {
                triples.push({
                    subject: subjectUri,
                });
            });
        });
    };

    self.getAllDescendants = function (source, resourcesIds, taxonomyPredicate, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source, false, false, options);
        var filter = options.filter || "";
        if (resourcesIds) {
            // needs options.useFilterKeyWord because VALUES dont work
            filter += Sparql_common.setFilter("parent", resourcesIds, null, { useFilterKeyWord: 1 });
        }

        var pathOperator = "+";

        if (options.includeParent) {
            pathOperator = "*";
        }
        if (options.depth) {
            pathOperator = "{0," + options.depth + "}";
        }
        if (!taxonomyPredicate) {
            taxonomyPredicate = "rdfs:subClassOf";
        }
        if (taxonomyPredicate == "rdfs:subClassOf") {
            filter += " ?parent rdf:type owl:Class.  ?descendant rdf:type owl:Class.";
        }

        var inverseTaxonomyPredicate = taxonomyPredicate;
        if (taxonomyPredicate.indexOf("^") < 0) {
            inverseTaxonomyPredicate = "^" + inverseTaxonomyPredicate;
        } else {
            inverseTaxonomyPredicate = inverseTaxonomyPredicate.replace("^", "");
        }

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
            "SELECT distinct ?descendant ?descendantParent ?descendantLabel ?descendantParentLabel " +
            fromStr +
            " WHERE {\n" +
            "?descendant " +
            taxonomyPredicate +
            " ?descendantParent.\n" +
            "  OPTIONAL{?descendant rdfs:label ?descendantLabel}   \n" +
            "  OPTIONAL{?descendantParent rdfs:label ?descendantParentLabel}  \n" +
            "  ?parent " +
            inverseTaxonomyPredicate +
            pathOperator +
            " ?descendant.\n" +
            filter +
            "} " +
            "      ";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getGraphsWithSameClasses = function (sourceLabel, filter, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT  distinct  ?g  WHERE {GRAPH ?g{\n" +
            "   ?sub ?p ?obj .\n" +
            "    {select ?sub where{ GRAPH  <" +
            graphUri +
            "> {\n" +
            "       ?sub ?p2 ?obj2.\n" +
            (filter || "") +
            "   }\n" +
            "  } limit 10000\n" +
            "  }\n" +
            " }\n" +
            "}";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    return self;
})();

export default Sparql_OWL;

window.Sparql_OWL = Sparql_OWL;
