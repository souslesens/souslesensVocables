/**
 * Sparql_OWL Module
 * OWL controller: builds and runs the SPARQL queries for sources whose `schemaType` is
 * `"OWL"` (and KNOWLEDGE_GRAPH). Navigates class hierarchies via `rdfs:subClassOf`, reads
 * `owl:Class`/`owl:ObjectProperty`/`owl:DatatypeProperty`/`owl:NamedIndividual`, resolves OWL
 * restrictions (`owl:onProperty` + `owl:someValuesFrom`/`allValuesFrom`/cardinality) and
 * property domains/ranges. It is selected per source through `Config.sources[source].controller`
 * and invoked by {@link module:Sparql_generic}; query fragments come from
 * {@link module:Sparql_common} and execution from {@link module:Sparql_proxy}.
 * @module Sparql_OWL
 */

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
    /**
     * Builds the SPARQL property path expressing the parent/child (taxonomy) relation for a
     * source. Uses `options.specificPredicates` if provided, otherwise the source's configured
     * `taxonomyPredicates`, falling back to `rdfs:subClassOf`. Multiple predicates are joined
     * with `|`; `options.memberPredicate` appends `^rdfs:member`.
     * @function
     * @name getSourceTaxonomyPredicates
     * @memberof module:Sparql_OWL
     * @param {string} source - Source name whose `taxonomyPredicates` are read (null → default `rdfs:subClassOf`)
     * @param {Object} [options] - Predicate options
     * @param {(string|string[])} [options.specificPredicates] - Predicate(s) to use instead of the source config
     * @param {boolean} [options.memberPredicate] - Append `^rdfs:member` to the path
     * @returns {string} A SPARQL property-path string defining the taxonomy relation
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
     * Returns the top-level classes of an OWL source: `owl:Class` instances that have no parent
     * via the source's taxonomy predicates (or that match the source's configured
     * `topClassFilter`). Blank nodes are excluded; labels are fetched optionally and language-filtered.
     * @function
     * @name getTopConcepts
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Query options
     * @param {boolean} [options.selectGraph] - Also bind each triple's named graph (`?subjectGraph`)
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {boolean} [options.skipTopClassFilter] - Do not apply the top-class filter
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {(string|string[])} [options.filterCollections] - Restrict to top concepts reachable from these collections
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?topConcept`/`?topConceptLabel`(/`?subjectGraph`)
     * @returns {void}
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
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "prefix owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
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

        var limit = 300; //options.limit || Config.queryLimit;
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
     * Returns the children of node(s) down to a given depth in an OWL class hierarchy. Matches
     * `?child1 <taxonomyPredicate> ?subject` for the parent (`ids` or `words`), then chains
     * nested `OPTIONAL` blocks `?childN+1 <taxonomyPredicate> ?childN` with their labels. A
     * `filterCollections` option switches to a SKOS-collection-scoped variant.
     * @function
     * @name getNodeChildren
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} words - Label word(s) for fuzzy/exact parent match; mutually exclusive with `ids`
     * @param {(string|string[])} ids - Parent class URI(s) whose children are fetched
     * @param {number} descendantsDepth - Number of taxonomy levels to expand
     * @param {Object} [options] - Query options
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {boolean} [options.exactMatch] - Treat `words` as exact rather than regex matches
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {(string|string[])} [options.specificPredicates] - Override taxonomy predicate(s) used for the parent/child relation
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {(string|string[])} [options.filterCollections] - Restrict children to members of these SKOS collections
     * @param {string} [options.sort] - Variable name to order results by
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?child1…`(labels), label-enriched
     * @returns {void}
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

        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> " + "select   distinct * " + fromStr + " where {";
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
            "OPTIONAL {?child1 rdf:type ?child1Type.}" +
            "OPTIONAL {?child1 rdfs:subClassOf ?child1SuperClass.}";

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

    /**
     * Returns the full set of descendant classes of given parent class(es) via the transitive
     * closure of the taxonomy predicate (`?subject (predicate)+ ?parentClass`).
     * @function
     * @name getNodesDescendants
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} ids - Parent class URI(s) whose descendants are fetched
     * @param {Object} [options] - Query options
     * @param {(string|string[])} [options.specificPredicates] - Override taxonomy predicate (defaults to `rdfs:subClassOf`)
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {Function} callback - Error-first callback `(err, bindings)` with the `?subject` descendants
     * @returns {void}
     */
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

    /**
     * Returns the named graph(s) each given resource lives in
     * (`SELECT ?g ?s WHERE { GRAPH ?g { ?s ?p ?o } <filter> }`).
     * @function
     * @name getNodesGraphUri
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - Source name whose endpoint is queried
     * @param {(string|string[])} ids - Resource URI(s) to locate
     * @param {Object} [options] - Reserved options object
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?g`/`?s` pairs
     * @returns {void}
     */
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
     * Returns all triples describing a resource (`<conceptId> ?prop ?value`), optionally also
     * the inverse triples where it is the object, with property/value labels. Can exclude
     * blank nodes and OWL restrictions.
     * @function
     * @name getNodeInfos
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {string} conceptId - URI of the resource to describe
     * @param {Object} [options] - Query options
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {boolean} [options.getValuesLabels] - Add `rdfs:label` of properties and values
     * @param {boolean} [options.inverseProperties] - Also return triples where the resource is the object
     * @param {boolean} [options.noRestrictions] - Exclude values that are `owl:Restriction`
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?prop`/`?value`(/labels/graph)
     * @returns {void}
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
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
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

    /**
     * Returns the ancestors of node(s) up to a given depth in an OWL hierarchy. Builds nested
     * `OPTIONAL` blocks chaining `?broaderN-1 rdfs:subClassOf|rdf:type ?broaderN` (excluding
     * `owl:Restriction`/`owl:Class`), grouping each node's types/superclasses/graphs via
     * `GROUP_CONCAT`. Depth is capped (4 when the source has imports, else `self.ancestorsDepth`).
     * @function
     * @name getNodeParents
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} words - Label word(s) identifying the start node; mutually exclusive with `ids`
     * @param {(string|string[])} ids - Start class URI(s) whose ancestors are fetched
     * @param {number} ancestorsDepth - Number of levels to climb (capped as described above)
     * @param {Object} [options] - Query options
     * @param {boolean} [options.selectGraph] - Bind broader nodes' named graphs
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {boolean} [options.excludeType] - Reserved flag to drop type variables from the SELECT clause
     * @param {(string|string[])} [options.filterCollections] - Exclude ancestors that are members of these collections
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?broader1…` (labels, grouped types)
     * @returns {void}
     */
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
        const matches = fromStr.match(/<[^>]+>/g);
        if (!matches) {
            return "()";
        }
        var fromList = `( ${matches.join(" , ")} )`;

        var selectStr = " * ";
        if (true || options.excludeType) {
            selectStr = ' ?subject ?subjectLabel (GROUP_CONCAT(?subjectType;SEPARATOR=",") AS ?subjectTypes) (GROUP_CONCAT(?subjectSuperClass;SEPARATOR=",") AS ?subjectSuperClasses)';
            for (var i = 1; i <= ancestorsDepth; i++) {
                selectStr += '(GROUP_CONCAT(?broaderGraph1;SEPARATOR=",") AS ?broaderGraphs' + i + " ) ?broader" + i + " ?broader" + i + "Label";
            }
        }
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            " select distinct " +
            selectStr +
            fromStr +
            "  WHERE {";

        query += "{GRAPH ?subjectGraph" + i + "{";
        //query+="{";
        query += "?subject rdf:type  ?subjectType. filter (?subjectType not in(owl:Restriction)) ";
        if (words) {
            query += " ?subject rdfs:label ?subjectLabel.";
        } else {
            query += " OPTIONAL { ?subject rdfs:label ?subjectLabel.}";
        }
        query += " }}\n";
        query += " filter( ?subjectGraph" + i + " in " + fromList + " ).\n";
        query += " OPTIONAL {?subject rdfs:subClassOf ?subjectSuperClass.}\n";
        //query += " }\n";
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
                query += " filter( ?broaderGraph" + i + " in " + fromList + " ).\n";

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
            query += " filter( ?broader1Graph" + i + " in " + fromList + " ).\n";
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

    /**
     * Returns the ordered array of ancestor class URIs of an entity, by querying
     * `?subject rdfs:subClassOf*[|rdf:type*] ?ancestor` then walking the parent chain in JS
     * (ordered when `options.orderAncestors`, otherwise flat).
     *
     * Historical: no remaining caller in the codebase (kept for backward compatibility / plugins).
     * @function
     * @name getEntityAncestorsArray
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {string} id - URI of the entity whose ancestors are fetched
     * @param {Object} [options] - Query options
     * @param {boolean} [options.individuals] - Also climb `rdf:type*` (for individuals)
     * @param {boolean} [options.orderAncestors] - Return the chain ordered from the entity upward
     * @param {boolean} [options.withLabels] - Also fetch subject/parent labels
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, parentsArray)` with the ancestor URI array
     * @returns {void}
     */
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
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
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

    /**
     * Legacy version of {@link module:Sparql_OWL.getNodesAncestorsOrDescendants}: returns
     * ordered single-line hierarchies for each class via `?class rdfs:subClassOf*|rdf:type*
     * ?superClass` and an in-JS recursion. Superseded by the newer multi-hierarchy version.
     * @function
     * @name getNodesAncestorsOrDescendantsOld
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} classIds - Class URI(s) whose hierarchy is built
     * @param {Object} [options] - Query options
     * @param {boolean} [options.excludeItself] - Use `+` instead of `*` (exclude the class itself)
     * @param {boolean} [options.withLabels] - Also fetch class/subClass/superClass labels
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, {hierarchies, rawResult})`
     * @returns {void}
     */
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
     * Returns the ancestor (or descendant) hierarchies of given class(es), supporting multiple
     * hierarchy branches per class. Runs a nested `?class rdfs:subClassOf*[+] ?superClass` query
     * (direction depends on `options.descendants`) and rebuilds, for each input class, its
     * hierarchy as an array of hierarchy items in JS, skipping blank-node superclasses.
     * Used by `OntologyModels` to fetch the hierarchies of a set of nodes (start/end nodes).
     * @function
     * @name getNodesAncestorsOrDescendants
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} classIds - Class URI(s) whose hierarchy is built
     * @param {Object} [options] - Query options
     * @param {boolean} [options.descendants] - Build descendant hierarchies instead of ancestors
     * @param {boolean} [options.excludeItself] - Use `+` instead of `*` (exclude the class itself)
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, {hierarchies, rawResult})` where `hierarchies` maps each class URI to its ordered hierarchy
     * @returns {void}
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
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
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
                "  ?class rdf:type ?type. ?class rdfs:subClassOf" +
                modifier +
                " ?superClass.\n" +
                "    ?superClass rdf:type ?superClassType filter (?superClassType !=owl:Restriction)\n" +
                "  ?subject  rdfs:subClassOf|rdf:type ?class. ?subject rdf:type ?subjectType ";
        } else {
            filterStr = Sparql_common.setFilter("superClass", classIds, null, { values: 1 });
            query +=
                "  WHERE {" +
                "   ?superClassSubClass  rdfs:subClassOf ?class" +
                "  \n" +
                " { SELECT * where {" +
                "  ?class rdf:type ?type. ?class rdfs:subClassOf" +
                modifier +
                " ?superClass.\n" +
                "    ?superClass rdf:type ?superClassType filter (?superClassType !=owl:Restriction)\n" +
                "   OPTIONAL {?class rdfs:label ?classLabel }" +
                "  ?subject  rdfs:subClassOf|rdf:type ?class. ?subject rdf:type ?subjectType ";
        }

        if (options.filter) {
            query += options.filter;
        }
        if (!filterStr) {
            filterStr = "";
        }
        query += filterStr;

        //   query+="filter(!isBlank(?superClassSubClass))"

        query += "}}} LIMIT 10000";

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

    /**
     * Returns a map of each resource URI to its (semicolon-joined) `rdf:type`/`rdfs:subClassOf`
     * types, excluding `owl:Class` and blank nodes, via a `GROUP_CONCAT` query.
     *
     * Historical: no remaining caller in the codebase (kept for backward compatibility / plugins).
     * @function
     * @name getNodesTypesMap
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} ids - Resource URI(s) whose types are fetched
     * @param {Object} [options] - Query options
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, map)` mapping URI → `";;"`-joined type URIs
     * @returns {void}
     */
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

    /**
     * Alternative to {@link module:Sparql_OWL.getFilteredTriples} that resolves the type and
     * label of subject, property and object from any graph, then matches the actual triples in
     * the source's own graph. Filters by subject/property/object ids.
     *
     * Not historical — selected over `getFilteredTriples` on demand: `Lineage_whiteboard` toggles
     * between the two via `options.getFilteredTriples2`, and `nodeRelations_bot` calls it directly
     * to extract a node's distinct properties (`options.distinct = "?prop ?propLabel"`).
     * @function
     * @name getFilteredTriples2
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} subjectIds - Subject URI(s) to match (optional)
     * @param {(string|string[])} propertyIds - Property URI(s) to match (optional)
     * @param {(string|string[])} objectIds - Object URI(s) to match (optional)
     * @param {Object} [options] - Query options
     * @param {boolean} [options.withImports] - Include imported graphs in the `FROM` clause (imports are excluded by default here)
     * @param {string} [options.distinct] - Variables for the SELECT clause (defaults to `*`)
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with the matching triples and their labels/types
     * @returns {void}
     */
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

        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " + "PREFIX owl: <http://www.w3.org/2002/07/owl#> " + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";

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
     * Returns triples filtered by any combination of subject/property/object ids, with subject,
     * property and object labels and types. Literal objects are excluded by default. Subject or
     * object id lists are sliced into `Sparql_generic.slicesSize` batches and queried with
     * `async.eachSeries`, concatenating results.
     *
     * Canonical, widely used triple-fetch helper (Lineage, MappingModeler, bots).
     * See {@link module:Sparql_OWL.getFilteredTriples2} for the cross-graph variant.
     * @function
     * @name getFilteredTriples
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} subjectIds - Subject URI(s) to match (optional)
     * @param {(string|string[])} propertyIds - Property URI(s) to match (optional)
     * @param {(string|string[])} objectIds - Object URI(s) to match (optional)
     * @param {Object} [options] - Query options
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {boolean} [options.onlyObjectProperties] - Restrict to `owl:ObjectProperty` predicates
     * @param {boolean} [options.onlyDataTypeProperties] - Restrict to literal objects
     * @param {boolean} [options.includeLiterals] - Allow literal objects (otherwise excluded)
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {string} [options.distinct] - Variables for the SELECT clause (defaults to `*`)
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?prop`/`?object` and their labels
     * @returns {void}
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

                fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports, options);
            } else {
                // to be  implemented
            }
            var sourceGraphUri = Config.sources[sourceLabel].graphUri;

            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " + "PREFIX owl: <http://www.w3.org/2002/07/owl#> " + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";

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
            } else if (options.onlyDataTypeProperties) {
                (" filter (isLiteral(?object) )");
            } else if (!options.includeLiterals && !(options.filter && options.filter.indexOf("?object") > -1)) {
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
     * Returns every subject of the source with its label, `rdf:type` and taxonomy superclass
     * (`?subject ?p ?o` plus optional label/type/superclass patterns). Blank nodes are excluded
     * by default; results can be language-filtered.
     * @function
     * @name getItems
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Query options
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {boolean} [options.includeBlankNodes] - Include blank-node subjects
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {string} [options.distinct] - Variables for the SELECT clause (defaults to `*`)
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {string} [options.lang] - Restrict labels to this language
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?p`/`?o` (+ label/type/superClass)
     * @returns {void}
     */
    self.getItems = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports);

        var query = "";
        query += "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema# >" + "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + "PREFIX owl: <http://www.w3.org/2002/07/owl#> ";

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
    /**
     * Lists all `owl:ObjectProperty` of a source with their label, super-property, domain and
     * range (and those entities' labels). Imports are excluded from the `FROM` clause.
     * @function
     * @name listObjectProperties
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Reserved options object
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?prop`/`?propLabel`/`?superProp`/`?domain`/`?range`(+labels)
     * @returns {void}
     */
    self.listObjectProperties = function (sourceLabel, options, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel, false, true);
        var query =
            "PREFIX type: <http://info.deepcarbon.net/schema/type#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
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
     * Returns object (or datatype) properties with their domains, ranges, sub-properties and
     * inverse properties (plus all labels). The id filter can target the domain, range, prop or
     * subProp depending on options, and a `searchType` mode searches by words on prop/domain/range.
     * With `addInverseRestrictions`, recursively merges the inverse-direction results.
     * @function
     * @name getObjectPropertiesDomainAndRange
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} domainIds - Domain (or range) class URI(s) to filter by (optional)
     * @param {Object} [options] - Query options
     * @param {boolean} [options.inverseRestriction] - Filter on range instead of domain
     * @param {(string|string[])} [options.propIds] - Filter by property URI(s)
     * @param {(string|string[])} [options.subPropIds] - Filter by sub-property URI(s)
     * @param {boolean} [options.dataTypeProperties] - Query `owl:DatatypeProperty` instead of `owl:ObjectProperty`
     * @param {boolean} [options.inheritedProperties] - Include inherited properties via `rdfs:subPropertyOf*`
     * @param {string} [options.searchType] - One of `property`/`domain`/`range` to search by `options.words`
     * @param {(string|string[])} [options.words] - Label word(s) used when `searchType` is set
     * @param {boolean} [options.addInverseRestrictions] - Also fetch and merge inverse-direction results
     * @param {string} [options.filter] - Extra SPARQL filter (replaces the id filter)
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?domain`/`?prop`/`?range`/`?subProp`/`?inverseProp` (+labels)
     * @returns {void}
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
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "select distinct ?domain ?prop ?range ?domainLabel ?propLabel ?rangeLabel ?subProp ?subPropLabel ?inverseProp ?inversePropLabel" +
            fromStr +
            " WHERE {";

        if (options.selectGraph) {
            query += " GRAPH ?g ";
        }
        if (options.inheritedProperties) {
            query += "  { ?prop rdfs:subPropertyOf*/rdf:type owl:ObjectProperty ";
        }
        if (options.dataTypeProperties) {
            query +=
                "   {?prop rdf:type owl:DatatypeProperty. " +
                optionalLabelStr +
                "{?prop rdfs:label ?propLabel.  " +
                Sparql_common.getLangFilter(sourceLabel, "propLabel") +
                "}" +
                "OPTIONAL{?prop owl:inverseOf ?inverseProp. " +
                "OPTIONAL{?inverseProp rdfs:label ?inversePropLabel.  " +
                Sparql_common.getLangFilter(sourceLabel, "inversePropLabel") +
                "}}";
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

    /**
     * Returns the transitive sub-properties of given properties
     * (`?subProperty rdfs:subPropertyOf+ ?property`) with their labels.
     * @function
     * @name getObjectSubProperties
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} propertyIds - Property URI(s) whose sub-properties are fetched
     * @param {Object} [options] - Query options
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?property`/`?subProperty` (+labels)
     * @returns {void}
     */
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
            "PREFIX type: <http://info.deepcarbon.net/schema/type#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
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
     * Returns OWL restrictions on classes: matches `?subject rdfs:subClassOf ?node`, `?node
     * rdf:type owl:Restriction`, `?node owl:onProperty ?prop` and the constraint value
     * (`owl:someValuesFrom`/`allValuesFrom`/`hasValue`/`onClass`) plus any cardinality. Property
     * and value labels are filled afterwards (including from imported sources via
     * {@link module:Sparql_OWL.getLabelsMap}).
     * @function
     * @name getObjectRestrictions
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} subClassIds - Class URI(s) carrying the restrictions (or restriction values when `inverseRestriction`)
     * @param {Object} [options] - Query options
     * @param {boolean} [options.inverseRestriction] - Filter on the restriction value (range) instead of the subject
     * @param {(string|string[])} [options.restrictionIds] - Filter by restriction value URI(s)
     * @param {boolean} [options.listPropertiesOnly] - Select only `?prop`/`?propLabel`
     * @param {boolean} [options.withoutBlankNodes] - Select an explicit non-blank-node variable set
     * @param {boolean} [options.turtle] - Emit a CONSTRUCT query
     * @param {boolean} [options.someValuesFrom] - Restrict to `owl:someValuesFrom`/`owl:onClass`
     * @param {boolean} [options.allValuesFrom] - Restrict to `owl:allValuesFrom`/`owl:onClass`
     * @param {boolean} [options.hasValue] - Restrict to `owl:hasValue`/`owl:onClass`
     * @param {boolean} [options.getMetadata] - Also fetch status/creator/date/provenance metadata of each restriction
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {string} [options.filter] - Extra SPARQL filter (its `object` is mapped to `value`)
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?prop`/`?value`/`?node`/`?constraintType` (+labels)
     * @returns {void}
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

        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#> " + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ";

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

        query +=
            "optional {?node ?cardinalityType ?cardinalityValue filter (?cardinalityType in (owl:maxCardinality,owl:minCardinality,owl:cardinality,owl:maxQualifiedCardinality,owl:minQualifiedCardinality,owl:qualifiedCardinality ))}";

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
                caller: null,
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                Sparql_common.setSparqlResultPropertiesLabels(sourceLabel, result.results.bindings, "prop", function (err, result2) {
                    if (err) {
                        return callback(err);
                    }
                    // fill value labels for restrictions values from imports sources
                    var noValueLabelResults = result2.filter(function (result) {
                        return !result.valueLabel;
                    });
                    var valueIds = noValueLabelResults.map(function (result) {
                        return result.value?.value;
                    });

                    var options = {};
                    var filter = Sparql_common.setFilter("id", valueIds);
                    if (valueIds.length == 0) {
                        options.noExecute = true;
                    } else {
                        options.filter = filter;
                    }
                    Sparql_OWL.getLabelsMap(sourceLabel, options, function (err, labelsMap) {
                        if (err) {
                            return callback(err);
                        }
                        noValueLabelResults.forEach(function (result) {
                            if (labelsMap[result.value?.value]) {
                                result.valueLabel = { value: labelsMap[result.value?.value], type: "literal" };
                            }
                        });
                        result2 = Sparql_generic.setBindingsOptionalProperties(result2, ["prop", "node", "subject", "value"], { source: sourceLabel });
                        return callback(null, result2);
                    });
                });
            },
        );
    };

    /**
     * Returns the `owl:NamedIndividual` instances of given class(es): matches
     * `?subject rdf:type ?node` (filtered by `ids`) and `?subject rdf:type owl:NamedIndividual`,
     * with subject and class labels.
     * @function
     * @name getNamedIndividuals
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} ids - Class URI(s) whose individuals are fetched
     * @param {Object} [options] - Query options
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?node` (+labels)
     * @returns {void}
     */
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
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
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

    /**
     * Returns the concepts belonging to a SKOS collection within an OWL source (mixed
     * OWL/SKOS data). With no collection, lists non-collection subjects; with a collection URI,
     * walks `?collection skos:member* ?acollection` and the broader closure to the members.
     * @function
     * @name getCollectionNodes
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - Source name to query
     * @param {string} collection - Collection URI whose members are fetched (empty = all subjects)
     * @param {Object} [options] - Query options
     * @param {Object} [options.filter] - `{predicates}` to restrict the predicates returned
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?predicate`/`?object` (+labels)
     * @returns {void}
     */
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
     * Returns the `rdf:type` triples (with their graph) for given resources, batching the ids
     * into slices of 200 and concatenating results (`GRAPH ?g { ?subject rdf:type ?type }`).
     *
     * Historical: no remaining caller in the codebase (kept for backward compatibility / plugins).
     * Note: its body references an undeclared `options` variable, so it would currently throw if called.
     * @function
     * @name getNodesTypes
     * @memberof module:Sparql_OWL
     * @param {string} source - Source name whose endpoint is queried
     * @param {(string|string[])} ids - Resource URI(s) whose types are fetched
     * @param {Function} callback - Error-first callback `(err, allData)` with `?subject`/`?type`/`?g` bindings
     * @returns {void}
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
    /**
     * Returns a map of each resource URI to a simplified OWL type — `"NamedIndividual"`,
     * `"Class"` or `"Restriction"` — derived from its concatenated `rdf:type` values, batching
     * the ids into slices of 200.
     *
     * Live: used by `Lineage_createRelation` to determine a node's OWL kind. The canonical of the
     * three `getNodesType*` helpers (`getNodesTypes`/`getNodesTypesMap` are historical).
     * @function
     * @name getNodesOwlTypeMap
     * @memberof module:Sparql_OWL
     * @param {string} source - Source name whose endpoint is queried
     * @param {(string|string[])} ids - Resource URI(s) whose OWL type is determined
     * @param {Function} callback - Error-first callback `(err, typesMap)` mapping URI → `"NamedIndividual"`/`"Class"`/`"Restriction"`
     * @returns {void}
     */
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
     * Returns, for given properties, the restrictions that use them and the source/target
     * classes involved: `?restriction owl:onProperty ?prop`, `?sourceClass <taxonomyPredicate>
     * ?restriction`, plus the constraint value (`owl:someValuesFrom`/`allValuesFrom`/`hasValue`/
     * cardinality) as `?targetClass`. Missing labels are filled afterwards.
     * @function
     * @name getPropertiesRestrictionsDescription
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} propIds - Property URI(s) whose restrictions are described
     * @param {Object} [options] - Query options
     * @param {(string|string[])} [options.subPropIds] - Filter by sub-property URI(s) instead of `propIds`
     * @param {string} [options.filter] - Extra SPARQL filter (replaces the property filter)
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?prop`/`?restriction`/`?sourceClass`/`?targetClass` (+labels)
     * @returns {void}
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
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "select distinct * " +
            fromStr +
            " WHERE {";

        query +=
            " ?restriction <http://www.w3.org/2002/07/owl#onProperty> ?prop." +
            filterStr +
            "  ?sourceClass " +
            Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) +
            " ?restriction." +
            "  OPTIONAL {?restriction ?constraintType ?targetClass. filter (?constraintType in (owl:someValuesFrom, owl:allValuesFrom,owl:hasValue,owl:maxCardinality,owl:minCardinality,owl:cardinality,owl:maxQualifiedCardinality,owl:minQualifiedCardinality,owl:qualifiedCardinality))}";
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

    /**
     * Returns each resource's label plus its (comma-joined) types and graphs, using
     * `GRAPH ?g { ?subject rdf:type ?subjectType }` with `GROUP_CONCAT` and a preferred-language label.
     * @function
     * @name getNodesLabelTypesAndGraph
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} ids - Resource URI(s) to describe
     * @param {Object} [options] - Query options
     * @param {string} [options.orderBy] - SPARQL ORDER BY expression (defaults to `?subjectLabel`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?subject`/`?subjectLabel`/`?sTypes`/`?graphs`
     * @returns {void}
     */
    self.getNodesLabelTypesAndGraph = function (sourceLabel, ids, options, callback) {
        var filterStr = Sparql_common.setFilter("subject", ids, null);
        if (!options) {
            options = {};
        }

        var fromStr = (fromStr = Sparql_common.getFromStr(sourceLabel));

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
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
     * Returns a map of URI → `rdfs:label` for given URIs (`?s rdfs:label ?sLabel`), falling back
     * to the URI's local name for any URI without a label.
     * @function
     * @name getUrisLabelsMap
     * @memberof module:Sparql_OWL
     * @param {string} source - Source name to query
     * @param {string[]} uris - URIs whose labels are fetched
     * @param {Function} callback - Error-first callback `(err, labelsMap)` mapping URI → label
     * @returns {void}
     */
    self.getUrisLabelsMap = function (source, uris, callback) {
        var sparql_url = Config.sources[source].sparql_server.url;
        var fromStr = Sparql_common.getFromStr(source);

        var filter = Sparql_common.setFilter("s", uris);

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct * " +
            fromStr +
            " WHERE {\n" +
            "  ?s rdfs:label ?sLabel. " +
            filter +
            "} limit 10000";
        Sparql_proxy.querySPARQL_GET_proxy(sparql_url, query, null, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            var labelsMap = {};
            result.results.bindings.forEach(function (item) {
                labelsMap[item.s.value] = item.sLabel.value;
            });
            uris.forEach(function (uri) {
                if (!labelsMap[uri]) {
                    labelsMap[uri] = Sparql_common.getLabelFromURI(uri);
                }
            });

            callback(null, labelsMap);
        });
    };

    /**
     * Returns a map of URI → `rdfs:label` for a source, paginating through results in pages of
     * 2000 (`async.whilst` over offset) until `Config.queryLimit` is reached. URIs without a
     * label fall back to their local name. Returns `{}` immediately when `options.noExecute`.
     * @function
     * @name getLabelsMap
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Query options
     * @param {boolean} [options.noExecute] - Skip the query and return an empty map
     * @param {string} [options.lang] - Restrict labels to this language (or untagged)
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {number} [options.processorFectchSize] - Page size for pagination (defaults to 2000)
     * @param {number} [options.limit] - Total result cap (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, labelsMap)` mapping URI → label
     * @returns {void}
     */
    self.getLabelsMap = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        if (options.noExecute) {
            return callback(null, {});
        }
        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT distinct  ?id ?type ?label " +
            fromStr +
            " WHERE {";

        var langFilter = "";
        if (options.lang) {
            langFilter = " FILTER (lang(?label)='" + options.lang + "' || !lang(?label))  ";
        }
        var filter = "";
        if (options.filter) {
            filter = options.filter;
        }

        query += "?id rdfs:label ?label " + langFilter + "" + filter + " }";
        var totalSize = 0;
        var labelsMap = {};
        var resultSize = 1;
        var limitSize = 2000;
        if (options.processorFectchSize) {
            limitSize = options.processorFectchSize;
        }
        var totalLimit = options.limit || Config.queryLimit;
        var offset = 0;
        async.whilst(
            function (_test) {
                return resultSize > 0 && totalSize < totalLimit;
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
                    result = result.results.bindings;
                    resultSize = result.length;
                    totalSize += resultSize;
                    result.forEach(function (item) {
                        labelsMap[item.id.value] = item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value);
                    });

                    offset += limitSize;
                    callbackWhilst();
                });
            },
            function (err) {
                callback(err, labelsMap);
            },
        );
    };

    /**
     * Returns the dictionary of a source — the list of its resources as `{id, label}` (plus the
     * graph when `selectGraph`) — paginating in chunks of 2000 with `async.whilst`. Each page is
     * either passed to a `processor` callback (for streaming) or accumulated and returned at the end.
     * Supports type/label/blank-node filters and skos:prefLabel.
     *
     * Primary use across the app is id→label retrieval: building selection lists
     * (`promptedSelectWidget`), label maps for models (`KGquery_graph`), and search/standardizer
     * lookups. Callers fall back to {@link module:Sparql_common.getLabelFromURI} when `label` is absent.
     * @function
     * @name getDictionary
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Query options
     * @param {string} [options.lang] - Restrict labels to this language (or untagged)
     * @param {string} [options.type] - Restrict to resources of this `rdf:type`
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {boolean} [options.selectGraph] - Bind each triple's named graph
     * @param {boolean} [options.includeBlankNodes] - Include blank-node ids
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {boolean} [options.skosPrefLabel] - Also fetch `skos:prefLabel`
     * @param {number} [options.processorFectchSize] - Page size (defaults to 2000)
     * @param {number} [options.limit] - Total result cap (defaults to `Config.queryLimit`)
     * @param {Function} [processor] - Optional `(pageBindings, cb)` processor invoked per page; if omitted, pages are accumulated
     * @param {Function} callback - Error-first callback `(err, allData)` with the accumulated bindings (empty when a processor is used)
     * @returns {void}
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
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
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
        } else if (options.filter) {
            typeFilterStr = options.filter;
        } else {
            typeFilterStr = "";
        }

        var optionalLabel = "OPTIONAL"; ///???
        // var optionalLabel = "";
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

    /**
     * Lists the distinct predicates used in a source, with their graph and label
     * (`GRAPH ?g { ?sub ?property ?obj }`). When imports are included, graphs are bound via `GRAPH ?g`.
     * @function
     * @name getPredicates
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Query options
     * @param {boolean} [options.withoutImports] - Exclude imported graphs and the `GRAPH ?g` binding
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?g`/`?property` (+label)
     * @returns {void}
     */
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
    /**
     * Lists all `owl:ObjectProperty` of a source with their labels
     * (`?property rdf:type owl:ObjectProperty` + language-filtered label).
     * @function
     * @name getObjectProperties
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Query options
     * @param {boolean} [options.withGraph] - Wrap in `GRAPH ?g { ... }` and bind the graph
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {boolean} [options.skosLabels] - Also match `skos:prefLabel` for labels
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?property` (+label)
     * @returns {void}
     */
    self.getObjectProperties = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.withGraph, options.withoutImports);
        var query =
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
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

    /**
     * Returns the named graph each given URI lives in (`GRAPH ?g { ?id ?p ?o }`), batching the
     * ids into slices of 200. Can restrict the graphs to the source and its imports.
     * @function
     * @name getUrisNamedGraph
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - Source name defining the import scope
     * @param {string[]} ids - URIs to locate
     * @param {Object} [options] - Query options
     * @param {boolean} [options.onlySourceAndImports] - Restrict graphs to the source and its imports
     * @param {boolean} [options.withGraph] - Bind the graph in the `FROM` clause
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, allResults)` with `?id`/`?g` pairs
     * @returns {void}
     */
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

    /**
     * Finds graphs whose `owl:versionIRI` matches a regex pattern, returning the matching
     * version-IRI triples (`?s owl:versionIRI ?graph. filter(regex(str(?graph), pattern))`).
     * @function
     * @name getGraphsByRegex
     * @memberof module:Sparql_OWL
     * @param {string} pattern - Regular expression matched against each graph's version IRI
     * @param {Function} callback - Error-first callback `(err, bindings)` with the matching graph triples
     * @returns {void}
     */
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

    /**
     * Materialises the inverse of every restriction using a given property: fetches the
     * restrictions on `propId` via {@link module:Sparql_OWL.getObjectRestrictions}, builds the
     * inverse restriction triples (swapping subject/value, using `inversePropId`) and inserts
     * them in batches of 200.
     * @function
     * @name generateInverseRestrictions
     * @memberof module:Sparql_OWL
     * @param {string} source - Source name whose graph is edited
     * @param {string} propId - Property URI whose restrictions are inverted
     * @param {string} inversePropId - Property URI used in the generated inverse restrictions
     * @param {number} cardinality - Cardinality for the generated restrictions
     * @param {Function} callback - Error-first callback `(err, totalItems)` with the number of triples inserted
     * @returns {void}
     */
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

    /**
     * Returns, for each given property, the domain/range inherited from its super-properties
     * (`?prop0 rdfs:subPropertyOf+ ?prop` where `?prop` carries `rdfs:domain`/`rdfs:range`),
     * as a map keyed by the original property.
     * @function
     * @name getPropertiesInheritedConstraints
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {string[]} properties - Property URIs whose inherited constraints are fetched
     * @param {Object} options - Query options
     * @param {boolean} [options.withGraph] - Bind the graph in the `FROM` clause
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, propsMap)` mapping property URI → `{parentProp, prop, domain, range, domainLabel, rangeLabel}`
     * @returns {void}
     */
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
                    parentProp: obj.prop0,
                    prop: obj.prop,
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
     * Returns all object properties of a source with their inferred domains, ranges,
     * sub-properties and inverse properties (and their labels), assembled from a multi-`UNION`
     * query and folded into a per-property map. Domains/ranges of inverse properties are also covered.
     *
     * Example entry:
     * ```json
     * "…/hasArrangedPart": {
     *   "prop": "…/hasArrangedPart", "propLabel": "hasArrangedPart",
     *   "subProps": ["…/hasAssembledPart", "…/hasFeature"],
     *   "domain": "…/PhysicalObject", "domainLabel": "PhysicalObject",
     *   "range": "…/xx", "rangeLabel": "xx",
     *   "inverseProp": "…/arrangedPartOf", "inversePropLabel": "arrangedPartOf"
     * }
     * ```
     * @function
     * @name getInferredPropertiesDomainsAndRanges
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} [options] - Query options
     * @param {boolean} [options.prefLabelAlso] - Match `skos:prefLabel` in addition to `rdfs:label`
     * @param {string} [options.filter] - Extra SPARQL filter applied within each UNION branch
     * @param {Function} callback - Error-first callback `(err, propsMap)` mapping property URI → `{prop, propLabel, subProps, domain, domainLabel, range, rangeLabel, inverseProp, inversePropLabel}`
     * @returns {void}
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
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
            "SELECT  distinct *  " +
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

    /**
     * Legacy single-query version of {@link module:Sparql_OWL.getInferredPropertiesDomainsAndRanges},
     * resolving domains/ranges through `rdfs:subClassOf*` and inverse properties in one large
     * optional-pattern query. Returns the raw bindings rather than a folded map.
     * @function
     * @name getInferredPropertiesDomainsAndRangesOld
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} options - Query options
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {Function} callback - Error-first callback `(err, bindings)` with the raw property/domain/range bindings
     * @returns {void}
     */
    self.getInferredPropertiesDomainsAndRangesOld = function (sourceLabel, options, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
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

    /**
     * Returns the object properties that have no domain or range, even via super-properties or
     * inverse properties, using a `MINUS` query against properties whose super/inverse chain
     * carries a `rdfs:domain`/`rdfs:range`.
     * @function
     * @name getPropertiesWithoutDomainsAndRanges
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {Object} options - Query options
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?prop` (+label)
     * @returns {void}
     */
    self.getPropertiesWithoutDomainsAndRanges = function (sourceLabel, options, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
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

    /**
     * Returns all triples of a source (or explicit graph) with subject/predicate/object labels,
     * optionally restricted to triples where a given role (subject/predicate/object) is one of
     * `ids` (batched into `Sparql_generic.slicesSize` slices). Blank-node objects can be excluded.
     * @function
     * @name getAllTriples
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query (or null with `options.graphUri`)
     * @param {string} role - Variable (`subject`/`predicate`/`object`) the `ids` filter applies to
     * @param {(string|string[])} ids - URI(s) restricting the chosen role
     * @param {Object} [options] - Query options
     * @param {string} [options.source] - Override source (sets `graphUri` from it)
     * @param {string} [options.graphUri] - Explicit graph URI when no source is given
     * @param {boolean} [options.removeBlankNodesObjects] - Exclude blank-node objects
     * @param {Function} callback - Error-first callback `(err, allResults)` with `?subject`/`?predicate`/`?object` (+labels)
     * @returns {void}
     */
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
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
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

    /**
     * Returns raw `?s ?p ?o` triples of a source (or explicit graph), with an optional filter,
     * select-variable override and ordering.
     * @function
     * @name getTriples
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query (or null with `options.graphUri`)
     * @param {Object} [options] - Query options
     * @param {string} [options.graphUri] - Explicit graph URI when no source is given
     * @param {string} [options.selectVars] - Variables for the SELECT clause (defaults to `*`)
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {string} [options.orderBy] - SPARQL ORDER BY expression
     * @param {Function} callback - Error-first callback `(err, allResults)` with the triple bindings
     * @returns {void}
     */
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
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
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

    /**
     * Returns the stored queries saved for a given scope from the stored-queries graph
     * (`?s slsv:hasScope "<scope>"`).
     * @function
     * @name getStoredQueries
     * @memberof module:Sparql_OWL
     * @param {string} source - Source name to query
     * @param {string} scope - Scope value matched against `slsv:hasScope`
     * @param {Object} [options] - Reserved options object
     * @param {Function} callback - Error-first callback `(err, bindings)` with the stored-query triples
     * @returns {void}
     */
    self.getStoredQueries = function (source, scope, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source);

        var query = "PREFIX slsv:<" + Config.storedQueries_graphUri + "> \n" + "select * " + fromStr + ' where {?s ?p ?o.?s slsv:hasScope "' + scope + '"}order by ?label';

        var url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: source }, function (err, _result) {
            if (err) {
                return callback(err);
            }
            return calback(null, _result.results.bindings);
        });
    };

    /**
     * Serialises a source to Turtle by paginating `DESCRIBE ?s ?p ?o` queries (`text/turtle`
     * Accept header) in pages of 1000, separating `@prefix` lines from the body and concatenating
     * everything into a single Turtle document.
     * @function
     * @name generateOWL
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to serialise
     * @param {Object} [options] - Query options
     * @param {string} [options.filter] - Reserved filter (currently unused in the query body)
     * @param {Function} callback - Error-first callback `(err, turtle)` with the full Turtle string
     * @returns {void}
     */
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

    /**
     * Returns the distinct labels (or another property's values) of instances of given classes
     * (`?id rdf:type ?type` filtered by `classIds`, then `?id <labelProperty> ?label`).
     * @function
     * @name getDistinctClassLabels
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {(string|string[])} classIds - Class URI(s) whose instances' labels are fetched
     * @param {Object} [options] - Query options
     * @param {string} [options.otherProperty] - Use this property instead of `rdfs:label`
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?label`(/`?id`)
     * @returns {void}
     */
    self.getDistinctClassLabels = function (sourceLabel, classIds, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var filterStr = Sparql_common.setFilter("type", classIds);
        var labelProperty = "rdfs:label";
        var selectStr;
        if (options.otherProperty) {
            labelProperty = "<" + options.otherProperty + ">";
            selectStr = "?label";
        } else {
            selectStr = "?label ?id";
        }
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT distinct " +
            selectStr +
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

    /**
     * Returns the distinct object values of a datatype property across the source
     * (`?s <propertyUri> ?o`).
     * @function
     * @name getDataTypePropertyValues
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {string} propertyUri - URI of the datatype property whose values are fetched
     * @param {Function} callback - Error-first callback `(err, bindings)` with the distinct `?o` values
     * @returns {void}
     */
    self.getDataTypePropertyValues = function (sourceLabel, propertyUri, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel);

        var query =
            "" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
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

    /**
     * Returns the (non-`owl:NamedIndividual`) `rdf:type`(s) of given individuals, batching the
     * ids into slices of 50.
     * @function
     * @name getIndividualsType
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {string[]} allIds - Individual URIs whose class types are fetched
     * @param {Object} [options] - Reserved options object
     * @param {Function} callback - Error-first callback `(err, allBindings)` with the `?type` bindings
     * @returns {void}
     */
    self.getIndividualsType = function (sourceLabel, allIds, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel);

        var slices = common.array.slice(allIds, 50);
        var allBindings = [];
        async.eachSeries(
            slices,
            function (ids, callbackEach) {
                var filterStr = Sparql_common.setFilter("id", ids);
                var query =
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                    "SELECT distinct ?type" +
                    fromStr +
                    "" +
                    " WHERE { ?id rdf:type ?type. " +
                    filterStr +
                    "filter (?type!=owl:NamedIndividual)  } limit 10000";
                var url = Config.sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    allBindings = allBindings.concat(_result.results.bindings);
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, allBindings);
            },
        );
    };

    /**
     * Returns the `owl:NamedIndividual` instances of given classes with their labels
     * (`?id rdf:type ?type` filtered by `classIds` + `?id rdf:type owl:NamedIndividual`),
     * batching the class ids into slices of 50.
     * @function
     * @name getIndividualsOfClass
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {string[]} classIds - Class URIs whose individuals are fetched
     * @param {Object} [options] - Reserved options object
     * @param {Function} callback - Error-first callback `(err, allBindings)` with `?id`/`?label`
     * @returns {void}
     */
    self.getIndividualsOfClass = function (sourceLabel, classIds, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(sourceLabel);

        var slices = common.array.slice(classIds, 50);
        var allBindings = [];
        async.eachSeries(
            slices,
            function (ids, callbackEach) {
                var filterStr = Sparql_common.setFilter("type", ids);
                var query =
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
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
                        return callbackEach(err);
                    }
                    allBindings = allBindings.concat(_result.results.bindings);
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, allBindings);
            },
        );
    };

    /**
     * Returns a map of URI → label fetched from the dedicated labels graph
     * (`FROM <Config.labelsGraphUri>`), falling back to the URI local name when absent.
     * @function
     * @name getLabelsMapFromLabelsGraph
     * @memberof module:Sparql_OWL
     * @param {string[]} ids - URIs whose labels are fetched from the labels graph
     * @param {Function} callback - Error-first callback `(err, labelsMap)` mapping URI → label
     * @returns {void}
     */
    self.getLabelsMapFromLabelsGraph = function (ids, callback) {
        var filter = Sparql_common.setFilter("sub", ids);
        var query =
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
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

    /**
     * Empties a named graph by POSTing to the backend `/kg/clearGraph` endpoint (not a SPARQL query).
     * @function
     * @name clearGraph
     * @memberof module:Sparql_OWL
     * @param {string} graphUri - URI of the graph to clear
     * @param {Function} callback - Error-first callback `(err)`
     * @returns {void}
     */
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
                MainController.errorAlert(err);
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };

    /**
     * Builds (but does not yet execute) a query for the distinct properties used by individuals
     * of a class (`?s rdf:type <classId>. ?s ?p ?o`). Incomplete stub — no callback is invoked.
     * @function
     * @name getIndividualsOfClassDistinctProperties
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to query
     * @param {string} classId - Class URI whose individuals' properties are inspected
     * @param {Function} callback - Error-first callback `(err, bindings)` (not currently invoked)
     * @returns {void}
     */
    self.getIndividualsOfClassDistinctProperties = function (sourceLabel, classId, callback) {
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var query =
            "" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            " Select distinct ?p ?pType   " +
            fromStr +
            " where {\n" +
            " ?s  rdf:type " +
            "<" +
            classId +
            ">. " +
            " ?s  ?p ?o.   ?o rdf:type ?oType";
    };

    /**
     * Intended to copy a resource's triples from one source to another. Currently fetches the
     * resource's triples via {@link module:Sparql_OWL.getNodeInfos} and builds the triple list,
     * but does not yet insert them (incomplete).
     * @function
     * @name copyUriTriplesFromSourceToSource
     * @memberof module:Sparql_OWL
     * @param {string} fromSource - Source name to copy the resource from
     * @param {string} toSource - Destination source name
     * @param {string} subjectUri - URI of the resource to copy
     * @param {Function} callback - Error-first callback `(err)`; errors with `"nothing to copy"` when the resource has no triples
     * @returns {void}
     */
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

    /**
     * Returns all descendants of given resources via a configurable taxonomy predicate, with
     * each descendant's direct parent and labels. The path operator adapts to options (`+`
     * default, `*` to include the parent, `{0,depth}` for bounded depth), and results are
     * paginated in pages of 2000 with `async.whilst`.
     * @function
     * @name getAllDescendants
     * @memberof module:Sparql_OWL
     * @param {string} source - Source name to query
     * @param {(string|string[])} resourcesIds - Ancestor resource URI(s) whose descendants are fetched
     * @param {string} [taxonomyPredicate="rdfs:subClassOf"] - Predicate defining the parent relation
     * @param {Object} [options] - Query options
     * @param {boolean} [options.includeParent] - Include the starting resource(s) (`*` path)
     * @param {number} [options.depth] - Limit traversal to this depth (`{0,depth}` path)
     * @param {string} [options.filter] - Extra SPARQL filter appended to the query
     * @param {Function} callback - Error-first callback `(err, allResults)` with `?descendant`/`?descendantParent` (+labels)
     * @returns {void}
     */
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
        var resultSize = 1;
        var limitSize = 2000;
        var offset = 0;
        var allResults = [];

        async.whilst(
            function (_test) {
                return resultSize > 0;
            },
            function (callbackWhilst) {
                var query2 = "" + query;
                query2 += " limit " + (limitSize + 1) + " offset " + offset;

                Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", { source: source }, function (err, result) {
                    if (err) {
                        return callbackWhilst(err);
                    }

                    offset += limitSize;
                    allResults = allResults.concat(result.results.bindings);
                    resultSize = result.results.bindings.length;
                    callbackWhilst();
                });
            },
            function (err) {
                return callback(null, allResults);
            },
        );
    };

    /**
     * Finds the named graphs that share subjects with a source's graph: an inner
     * `SELECT ?sub` over the source graph feeds an outer `GRAPH ?g { ?sub ?p ?obj }`, returning
     * the distinct graphs containing those subjects.
     *
     * Historical: no remaining caller in the codebase (kept for backward compatibility / plugins).
     * @function
     * @name getGraphsWithSameClasses
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name whose subjects anchor the search
     * @param {string} filter - SPARQL filter restricting the inner subjects
     * @param {Function} callback - Error-first callback `(err, bindings)` with the distinct `?g` graphs
     * @returns {void}
     */
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

    /**
     * Generates a Semantic Knowledge Graph (SKG) from an OWL ontology into a target graph, in a
     * sequence of INSERT queries: turning `rdfs:subClassOf` into `rdf:type` (classes become
     * `owl:NamedIndividual`) and turning OWL restrictions (`owl:onProperty` + `owl:someValuesFrom`)
     * into direct predicates between individuals.
     * @function
     * @name createSkgFromOntology
     * @memberof module:Sparql_OWL
     * @param {string} sourceLabel - OWL source name to transform
     * @param {string} skgGraphUri - Target graph URI receiving the generated SKG triples
     * @param {Function} callback - Error-first callback `(err)`
     * @returns {void}
     */
    self.createSkgFromOntology = function (sourceLabel, skgGraphUri, callback) {
        var ontologygraphUri = Config.sources[sourceLabel].graphUri;
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

        async.series(
            [
                function (callbackSeries) {
                    // transform rdfs:subclassOf in rdf:type

                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                        "prefix owl: <http://www.w3.org/2002/07/owl#>\n" +
                        "insert {  graph <" +
                        skgGraphUri +
                        ">{\n" +
                        " ?sub rdf:type owl:NamedIndividual .\n" +
                        "   ?sub rdf:type ?superClass.\n" +
                        "    ?sub ?p ?obj\n" +
                        "}\n" +
                        "} WHERE { graph <" +
                        ontologygraphUri +
                        ">{\n" +
                        "  ?sub rdf:type owl:Class .\n" +
                        '    ?sub rdfs:subClassOf ?superClass . filter (regex(str(?superClass),"http"))\n' +
                        "    ?sub ?p ?obj filter (?p!=rdfs:subClassOf)\n" +
                        "}\n" +
                        "}";

                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    // transform restrictions in predicates

                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                        "insert {  graph <" +
                        skgGraphUri +
                        ">{\n" +
                        " ?sub ?prop ?obj .\n" +
                        "}" +
                        "} WHERE { graph <" +
                        ontologygraphUri +
                        ">{\n" +
                        "  ?sub rdfs:subClassOf ?restr .?restr rdf:type owl:Restriction.\n" +
                        "  ?restr owl:onProperty ?prop.\n" +
                        "    ?restr owl:someValuesFrom ?obj.\n" +
                        "}\n" +
                        "}";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
                        return callbackSeries(err);
                    });
                },
            ],
            function (err) {
                return callback(err, "done");
            },
        );
    };

    return self;
})();

export default Sparql_OWL;

window.Sparql_OWL = Sparql_OWL;
