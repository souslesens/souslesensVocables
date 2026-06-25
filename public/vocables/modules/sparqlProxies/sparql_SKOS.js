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

/**
 * Sparql_SKOS Module
 * SKOS controller: builds and runs the SPARQL queries for sources whose `schemaType` is
 * `"SKOS"`. Navigates thesauri/taxonomies via `skos:broader`/`skos:narrower`, reads labels
 * through `skos:prefLabel`/`skos:altLabel`, and supports SKOS collections. It is selected per
 * source through `Config.sources[source].controller` and invoked by {@link module:Sparql_generic};
 * query building blocks (prefixes, predicates, FROM clause, limit) come from
 * {@link module:Sparql_generic.getSourceVariables} and execution from {@link module:Sparql_proxy}.
 * @module Sparql_SKOS
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_SKOS = (function () {
    /**
     * Returns the top concepts of a SKOS source (concept-scheme roots). Runs
     * `select distinct ?topConcept ?topConceptLabel ... WHERE { <topConceptFilter>
     * ?topConcept prefLabel ?topConceptLabel. }` ordered by label, optionally restricting to a
     * language and to concepts reachable from given collections.
     * @function
     * @name getTopConcepts
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - SKOS source name to query
     * @param {Object} options - Query options
     * @param {boolean} [options.noLang] - Skip the preferred-language filter
     * @param {(string|string[])} [options.filterCollections] - Collection URI(s) the top concepts must belong to
     * @param {Function} callback - Error-first callback `(err, bindings)` with the top-concept bindings
     * @returns {void}
     */
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

        Sparql_proxy.querySPARQL_GET_proxy(
            sourceVariables.url,
            query,
            sourceVariables.queryOptions,
            { source: sourceLabel, returnQueryStr: options && options.returnQueryStr },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (result.query) return callback(null, result);
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept");
                return callback(null, result.results.bindings);
            },
        );
    };

    /**
     * Returns the children of node(s) down to a given depth in a SKOS hierarchy. Builds nested
     * `OPTIONAL` blocks chaining `?childN+1 skos:broader ?childN` (up to `optionalDepth`), each
     * fetching the child's preferred label (optionally language-filtered) and `rdf:type`. The
     * `ids`/`words` parent filter is required.
     *
     * Example (collection-filtered children):
     * ```sparql
     * select distinct ?child1 ?child1Label ?subjectLabel
     * FROM <http://souslesens/thesaurus/TEST/>
     * WHERE { ?child1 skos:broader ?subject. ?subject skos:prefLabel ?subjectLabel.
     *         OPTIONAL { ?child1 skos:prefLabel ?child1Label. } filter(?subject = <...>) }
     * ORDER BY ?child1Label limit 1000
     * ```
     * @function
     * @name getNodeChildren
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - SKOS source name to query
     * @param {(string|string[])} words - Label word(s) identifying the parent; mutually exclusive with `ids`
     * @param {(string|string[])} ids - Parent concept URI(s) whose children are fetched
     * @param {number} descendantsDepth - Number of `skos:broader` levels to expand (capped at `optionalDepth`)
     * @param {Object} [options] - Query options
     * @param {boolean} [options.noLang] - Skip the language filter on labels
     * @param {Function} callback - Error-first callback `(err, bindings)` with the children, label-enriched and sorted by `child1Label`
     * @returns {void}
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

        Sparql_proxy.querySPARQL_GET_proxy(
            sourceVariables.url,
            query,
            sourceVariables.queryOptions,
            { source: sourceLabel, returnQueryStr: options && options.returnQueryStr },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (result.query) return callback(null, result);
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "child"]);

                result.results.bindings = Sparql_generic.sortBindings(result.results.bindings, "child1Label");
                return callback(null, result.results.bindings);
            },
        );
    };

    /**
     * Returns the concepts belonging to a SKOS collection (and their `skos:broader` links). With
     * no collection, lists all non-collection subjects; with a collection URI, walks
     * `?collection skos:member* ?acollection` to the target collection and returns its members'
     * concepts with their preferred labels (filtered to English).
     * @function
     * @name getCollectionNodes
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - SKOS source name to query
     * @param {string} collection - Collection URI whose member concepts are fetched (empty = all concepts)
     * @param {Object} [options] - Query options
     * @param {Object} [options.filter] - `{predicates}` to restrict the predicates returned
     * @param {Function} callback - Error-first callback `(err, bindings)` with the collection's concept bindings
     * @returns {void}
     */
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

        Sparql_proxy.querySPARQL_GET_proxy(
            sourceVariables.url,
            query,
            sourceVariables.queryOptions,
            { source: sourceLabel, returnQueryStr: options && options.returnQueryStr },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (result.query) return callback(null, result);
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "predicate"]);
                return callback(null, result.results.bindings);
            },
        );
    };

    /**
     * Returns the ancestors of node(s) up to a given depth in a SKOS hierarchy. Builds nested
     * `OPTIONAL` blocks chaining `?broaderN-1 skos:broader ?broaderN` (up to `optionalDepth`),
     * each fetching the broader concept's preferred label and type. Can search alt labels and
     * exclude collection-only branches.
     * @function
     * @name getNodeParents
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - SKOS source name to query
     * @param {(string|string[])} words - Label word(s) identifying the start node; mutually exclusive with `ids`
     * @param {(string|string[])} ids - Start concept URI(s) whose ancestors are fetched
     * @param {number} ancestorsDepth - Number of `skos:broader` levels to climb (capped at `optionalDepth`)
     * @param {Object} [options] - Query options
     * @param {boolean} [options.noLang] - Skip the language filter on labels
     * @param {boolean} [options.searchAltLabels] - Also match `skos:altLabel` on the start node
     * @param {(string|string[])} [options.filterCollections] - Exclude ancestors that are members of these collections
     * @param {number} [options.limit] - Result limit (defaults to `Config.queryLimit`)
     * @param {Function} callback - Error-first callback `(err, bindings)` with the ancestor bindings
     * @returns {void}
     */
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
            if (result.query) return callback(null, result);
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "broader"]);
            return callback(null, result.results.bindings);
        });
    };

    /**
     * Returns all triples (`?id ?prop ?value`) describing a concept. Delegates to a non-SKOS
     * controller when the source's `controllerName` is not `Sparql_SKOS`. Can also fetch
     * value/property labels and restrict to a given property.
     * @function
     * @name getNodeInfos
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name to query
     * @param {(string|string[])} conceptId - Concept URI(s) to describe
     * @param {Object} [options] - Query options
     * @param {(string|string[])} [options.propertyFilter] - Restrict to these property URIs
     * @param {boolean} [options.getValuesLabels] - Also fetch `skos:prefLabel` of values and properties
     * @param {Function} callback - Error-first callback `(err, bindings)` with the concept's triples
     * @returns {void}
     */
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
            if (result.query) return callback(null, result);
            return callback(null, result.results.bindings);
        });
    };

    /**
     * Returns all concept items of a SKOS source with their preferred labels. Delegates to a
     * non-SKOS controller when applicable. Supports an extra filter, a language filter, and
     * restriction to members of given collections.
     * @function
     * @name getItems
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name to query
     * @param {Object} [options] - Query options
     * @param {string} [options.filter] - Extra SPARQL pattern appended to the WHERE clause
     * @param {(string|string[])} [options.filterCollections] - Collection URI(s) the items must belong to
     * @param {Function} callback - Error-first callback `(err, bindings)` with the item bindings
     * @returns {void}
     */
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

        Sparql_proxy.querySPARQL_GET_proxy(
            sourceVariables.url,
            query,
            sourceVariables.queryOptions,
            { source: sourceLabel, returnQueryStr: options && options.returnQueryStr },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (result.query) return callback(null, result);
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "subject");
                return callback(null, result.results.bindings);
            },
        );
    };

    /*******************************************end basic requests (mode read) **************************************************************/

    /**
     * Returns the full ancestor chain of a concept via the transitive closure
     * `?subject skos:broader* ?broader`, fetching each broader concept's label and type.
     * Falls back to top concepts for non-SKOS sources.
     * @function
     * @name getSingleNodeAllGenealogy
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name to query
     * @param {string} id - Concept URI whose ancestors are fetched
     * @param {Function} callback - Error-first callback `(err, bindings)` with the ancestor bindings
     * @returns {void}
     */
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

    /**
     * Returns the full set of descendants of a concept via the transitive closure over inverse
     * broader / narrower predicates (`?subject ^skos:broader*|skos:narrower* ?narrower`),
     * fetching each descendant's label and type.
     * @function
     * @name getSingleNodeAllDescendants
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name to query
     * @param {string} id - Concept URI whose descendants are fetched
     * @param {Function} callback - Error-first callback `(err, bindings)` with the descendant bindings
     * @returns {void}
     */
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

    /**
     * Fetches the preferred label and `rdf:type` of a single concept, optionally language-filtered.
     * @function
     * @name getNodeLabel
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name to query
     * @param {string} id - Concept URI whose label is fetched
     * @param {Function} callback - Error-first callback `(err, bindings)` with the label/type bindings
     * @returns {void}
     */
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

    /**
     * Fetches every outgoing triple for a list of subjects, batching the ids into slices of
     * 2000 (`?subject ?prop ?value. FILTER(?subject in (...))`) and concatenating results.
     * @function
     * @name getNodesAllTriples
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name to query
     * @param {string[]} subjectIds - Subject URIs whose triples are fetched
     * @param {Function} callback - Error-first callback `(err, triples)` with the concatenated triple bindings
     * @returns {void}
     */
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

    /**
     * Deletes triples matching a subject/predicate/object pattern from the source's named graph
     * (`with <graphUri> DELETE { ?s ?p ?o } WHERE { ?s ?p ?o <filters> }`), each component
     * contributing a `Sparql_common.getUriFilter` clause.
     * @function
     * @name deleteTriples
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name whose graph is edited
     * @param {string} subjectUri - Subject URI to match (optional)
     * @param {string} predicateUri - Predicate URI to match (optional)
     * @param {string} objectUri - Object URI to match (optional)
     * @param {Function} callback - Error-first callback `(err, bindings)`
     * @returns {void}
     */
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

    /**
     * Serialises a triple descriptor into a SPARQL triple string: URI objects are
     * angle-bracketed, literals are single-quoted with an optional `@lang` tag. An inverse
     * predicate (prefixed with `^`) swaps subject and object.
     * @function
     * @name triplesObjectToString
     * @memberof module:Sparql_SKOS
     * @param {Object} item - Triple descriptor with `subject`, `predicate`, `object`, `valueType`, and optional `sourceVariables.lang`
     * @returns {string} A single `subject predicate object . ` SPARQL triple string
     */
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

    /**
     * Inserts triples into the source's named graph as a single
     * `WITH GRAPH <graphUri> INSERT DATA { ... }` statement, serialising each triple via
     * {@link module:Sparql_SKOS.triplesObjectToString}.
     * @function
     * @name insertTriples
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name whose graph receives the triples
     * @param {Object[]} triples - Triple descriptor objects to insert
     * @param {Function} callback - Error-first callback `(err)`
     * @returns {void}
     */
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

    /**
     * Replaces all triples of a subject in the source's graph: deletes every `?s ?p ?o` for the
     * subject, then inserts the supplied triples, in one combined `WITH GRAPH ... DELETE ... ;
     * INSERT DATA ...` statement. The subject is taken from the first triple.
     * @function
     * @name update
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name whose graph is edited
     * @param {Object[]} triples - Replacement triple descriptors (all sharing the same subject)
     * @param {Function} callback - Error-first callback `(err)`
     * @returns {void}
     */
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

    /**
     * Empties the source's named graph by deleting all its triples
     * (`WITH <graphUri> DELETE { ?s ?p ?o }`).
     * @function
     * @name deleteGraph
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name whose graph is emptied
     * @param {Function} callback - Error-first callback `(err)`
     * @returns {void}
     */
    self.deleteGraph = function (sourceLabel, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;

        var query = " WITH <" + graphUri + "> DELETE {?s ?p ?o}";
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            return callback(err);
        });
    };

    /**
     * Copies a source's entire named graph into another graph using a single SPARQL
     * `COPY <fromGraph> TO <toGraph>` statement.
     * @function
     * @name copyGraph
     * @memberof module:Sparql_SKOS
     * @param {string} fromSourceLabel - Source name whose graph is the copy origin
     * @param {string} toGraphUri - Destination graph URI
     * @param {Function} callback - Error-first callback `(err)`
     * @returns {void}
     */
    self.copyGraph = function (fromSourceLabel, toGraphUri, callback) {
        var fromGraphUri = Config.sources[fromSourceLabel].graphUri;
        var query = " COPY <" + fromGraphUri + "> TO <" + toGraphUri + ">;";
        var url = Config.sources[fromSourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: fromSourceLabel }, function (err, _result) {
            return callback(err);
        });
    };

    /**
     * Backfills missing `<field>Type` and `<field>Label` cells for a family of indexed fields
     * (`field`, `field1` … up to the first gap, max 20) in result bindings. Defaults the type to
     * `skos:Concept` (or `options.type`) and derives labels from the URI's local name.
     * @function
     * @name setBindingsOptionalProperties
     * @memberof module:Sparql_SKOS
     * @param {Array<Object>} bindings - Result bindings to enrich in place
     * @param {string} _field - Base variable name; indexed variants are processed until the first missing one
     * @param {Object} [options] - Enrichment options
     * @param {string} [options.type] - Type URI to use instead of the default `skos:Concept`
     * @returns {Array<Object>} The same bindings with type/label cells filled in
     */
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

    /**
     * Lists the distinct languages used in a source's `skos:prefLabel` literals, via
     * `select distinct ?language WHERE { ?p skos:prefLabel ?o. BIND(LANG(?o) AS ?language) }`.
     * @function
     * @name getSourceLangsList
     * @memberof module:Sparql_SKOS
     * @param {string} sourceLabel - Source name to query
     * @param {Function} callback - Error-first callback `(err, langs)` with the array of language codes
     * @returns {void}
     */
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
