import Sparql_common from "./sparql_common.js";
import Sparql_proxy from "./sparql_proxy.js";
import common from "../shared/common.js";
import Sparql_OWL from "./sparql_OWL.js";
import searchUtil from "../search/searchUtil.js";

//biblio
//https://www.iro.umontreal.ca/~lapalme/ift6281/sparql-1_1-cheat-sheet.pdf

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Sparql_generic Module
 * Schema-agnostic CRUD and traversal layer over the triple store. Read operations
 * (`getTopConcepts`, `getNodeChildren`, `getNodeInfos`, …) delegate to the per-source
 * controller (`Sparql_OWL` or `Sparql_SKOS`) chosen by `Config.sources[source].controller`,
 * automatically batching large id/word lists into slices. Write operations build and run
 * `INSERT` / `DELETE` / `COPY` SPARQL against the source's named graph, and helpers convert
 * triple objects to SPARQL text and post-process result bindings (labels, types, sorting).
 * @module Sparql_generic
 */

var Sparql_generic = (function () {
    var self = {};
    self.slicesSize = 25;
    var sourcesVariables = {};

    /**
     * Builds and memoizes a per-source bundle of SPARQL building blocks (prefixes string,
     * `FROM` clause, hierarchy predicates, preferred-label predicate, language, limit, endpoint
     * URL). For SKOS sources, defaults come from `Sparql_SKOS.defaultPredicates`, overridden by
     * the source's own `predicates` config.
     * @function
     * @name getSourceVariables
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to compute query variables for
     * @returns {Object} Cached object with `prefixesStr`, `fromStr`, `broaderPredicate`, `narrowerPredicate`, `prefLabelPredicate`, `topConceptFilter`, `lang`, `limit`, `optionalDepth`, `url`, `queryOptions`, `graphUri`
     */
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
            if (source.predicates) {
                predicates = source.predicates;
            }

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

    /**
     * Returns the top-level concepts/classes of a source by delegating to its controller
     * (`Sparql_OWL` or `Sparql_SKOS`).
     * @function
     * @name getTopConcepts
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {Object} [options] - Controller-specific options
     * @param {Function} callback - Error-first callback `(err, result)` with the top concepts
     * @returns {void}
     */
    self.getTopConcepts = function (sourceLabel, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        Config.sources[sourceLabel].controller.getTopConcepts(sourceLabel, options, function (err, result) {
            callback(err, result);
        });
    };

    /**
     * Returns all properties/triples describing a node (or nodes) by delegating to the source
     * controller. Used to inspect a resource's outgoing predicates and values.
     * @function
     * @name getNodeInfos
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {(string|string[])} conceptId - URI(s) of the node(s) to describe
     * @param {Object} [options] - Controller-specific options
     * @param {Function} callback - Error-first callback `(err, result)` with the node's triples
     * @returns {void}
     */
    self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        Config.sources[sourceLabel].controller.getNodeInfos(sourceLabel, conceptId, options, function (err, result) {
            callback(err, result);
        });
    };

    /**
     * Returns all items (concepts/classes) of a source by delegating to its controller.
     * @function
     * @name getItems
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {Object} [options] - Controller-specific options
     * @param {Function} callback - Error-first callback `(err, result)` with the items
     * @returns {void}
     */
    self.getItems = function (sourceLabel, options, callback) {
        $("#waitImg").css("display", "block");
        if (!options) {
            options = {};
        }
        Config.sources[sourceLabel].controller.getItems(sourceLabel, options, function (err, result) {
            callback(err, result);
        });
    };
    /**
     * Returns the member nodes of a collection (SKOS collection / grouping) by delegating to
     * the source controller.
     * @function
     * @name getCollectionNodes
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {string} collection - URI of the collection whose members are fetched
     * @param {Object} [options] - Controller-specific options
     * @param {Function} callback - Error-first callback `(err, result)` with the collection members
     * @returns {void}
     */
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
     * Returns the children of node(s) down to a given depth, delegating to the source controller.
     * The `ids` or `words` filter is split into slices of `self.slicesSize` and queried
     * sequentially with `async.eachSeries`, concatenating the per-slice results.
     *
     * Example controller query (SKOS, with collection filtering):
     * ```sparql
     * select distinct ?child1 ?child1Label ?subjectLabel ?collLabel
     * FROM <http://souslesens/thesaurus/TEST/>
     * WHERE { ?child1 skos:broader ?subject. ?subject skos:prefLabel ?subjectLabel.
     *         OPTIONAL { ?child1 skos:prefLabel ?child1Label. } filter(?subject = <...>) }
     * ORDER BY ?child1Label limit 1000
     * ```
     * @function
     * @name getNodeChildren
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {(string|string[])} words - Label word(s) to match; mutually exclusive with `ids`
     * @param {(string|string[])} ids - Parent node URI(s) whose children are fetched
     * @param {number} descendantsDepth - Depth of descendants to retrieve
     * @param {Object} [options] - Controller-specific options (merged with `{depth: 0, source}`)
     * @param {Function} callback - Error-first callback `(err, bulkResult)` with the concatenated children
     * @returns {void}
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
            if (!Array.isArray(ids)) {
                ids = [ids];
            }
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
                if (fitlerType == "ids") {
                    ids = slice;
                } else if (fitlerType == "words") {
                    words = slice;
                }
                Config.sources[sourceLabel].controller.getNodeChildren(sourceLabel, words, ids, descendantsDepth, options, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    bulkResult = bulkResult.concat(result);
                    callbackEach(null, result);
                });
            },
            function (err) {
                return callback(err, bulkResult);
            },
        );
    };

    /**
     * Returns the ancestors of node(s) up to a given depth, delegating to the source controller.
     * The `ids` or `words` filter is sliced into `self.slicesSize` chunks and queried
     * sequentially, concatenating the per-slice results. Returns `[]` when the source has no controller.
     * @function
     * @name getNodeParents
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {(string|string[])} words - Label word(s) to match; mutually exclusive with `ids`
     * @param {(string|string[])} ids - Child node URI(s) whose ancestors are fetched
     * @param {number} ancestorsDepth - Depth of ancestors to retrieve
     * @param {Object} [options] - Controller-specific options (merged with `{depth: 0, source}`)
     * @param {Function} callback - Error-first callback `(err, bulkResult)` with the concatenated ancestors
     * @returns {void}
     */
    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        if (!Config.sources[sourceLabel] || !Config.sources[sourceLabel].controller) {
            return callback(null, []);
        }
        $("#waitImg").css("display", "block");
        if (!options) {
            options = { depth: 0 };
        }
        options.source = sourceLabel;

        var fitlerType;
        var slices;
        if (ids) {
            if (!Array.isArray(ids)) {
                ids = [ids];
            }
            fitlerType = "ids";
            slices = common.array.slice(ids, self.slicesSize);
        }
        if (words) {
            if (!Array.isArray(words)) {
                words = [words];
            }
            fitlerType = "words";
            slices = common.array.slice(words, self.slicesSize);
        }

        var bulkResult = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var words = null;
                var ids = null;
                if (fitlerType == "ids") {
                    ids = slice;
                } else if (fitlerType == "words") {
                    words = slice;
                }
                Config.sources[sourceLabel].controller.getNodeParents(sourceLabel, words, ids, ancestorsDepth, options, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    bulkResult = bulkResult.concat(result);
                    callbackEach(null, result);
                });
            },
            function (err) {
                return callback(err, bulkResult);
            },
        );
    };

    /*******************************************end basic requests (mode read) **************************************************************/

    /**
     * Returns the full chain of ancestors of a node. For non-SKOS sources, falls back to the
     * controller's `getTopConcepts`. For SKOS, runs a transitive-closure query
     * (`?subject broaderPredicate* ?broader`) fetching every broader concept's label and type.
     * @function
     * @name getSingleNodeAllGenealogy
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {string} id - URI of the node whose ancestors are fetched
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

        var url = sourceVariables.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    /**
     * Returns the full set of descendants of a node by running a transitive-closure query over
     * the inverse broader / narrower predicates (`?subject ^broader*|narrower* ?narrower`),
     * fetching each descendant's preferred label and type.
     * @function
     * @name getSingleNodeAllDescendants
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {string} id - URI of the node whose descendants are fetched
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

        var url = sourceVariables.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    /**
     * Fetches the preferred label and `rdf:type` of a single node, optionally filtered by
     * language. Runs `SELECT * WHERE { ?subject rdf:type ?type. ?subject prefLabel ?subjectLabel.
     * filter(?subject = <id>) }`.
     * @function
     * @name getNodeLabel
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {string} id - URI of the node whose label is fetched
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
        if (lang) {
            query += 'filter( lang(?subjectLabel)="' + lang + '")';
        }

        query += "}limit " + sourceVariables.limit + " ";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    /**
     * Lists all named graphs available on an endpoint by running
     * `SELECT distinct ?g WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 10000`.
     * @function
     * @name getEndPointAllGraphsMap
     * @memberof module:Sparql_generic
     * @param {string} [sparqlServerUrl] - Endpoint URL to query; defaults to the main server
     * @param {Function} callback - Error-first callback `(err, graphs)`; `graphs` is a map of graph URI → 1
     * @returns {void}
     */
    self.getEndPointAllGraphsMap = function (sparqlServerUrl, callback) {
        if (!sparqlServerUrl) {
            sparqlServerUrl = Config.sparql_server.url + "?format=json&query=";
        }
        var query = "select distinct ?g WHERE {GRAPH ?g{?s ?p ?o}} limit 10000";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            var graphs = {};
            result.results.bindings.forEach(function (item) {
                graphs[item.g.value] = 1;
            });
            return callback(null, graphs);
        });
    };
    /**
     * Fetches every outgoing triple (`?subject ?prop ?value`) for a list of subjects, batching
     * the subject ids into slices of 2000 and combining results. Used to bulk-export node data.
     * @function
     * @name getNodesAllTriples
     * @memberof module:Sparql_generic
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
                    if (index > 0) {
                        filterStr += ",";
                    }
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
            },
        );
    };
    /**
     * Deletes triples matching a subject/predicate/object pattern from a source's named graph.
     * Builds `with <graphUri> DELETE { ?s ?p ?o } WHERE { ?s ?p ?o <filters> }`, where each
     * supplied component contributes a `Sparql_common.getUriFilter` clause. Refuses to run when
     * all three filters are empty (would delete the whole graph).
     * @function
     * @name deleteTriples
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name whose graph is edited
     * @param {string} subjectUri - Subject URI to match (optional)
     * @param {string} predicateUri - Predicate URI to match (optional)
     * @param {(string|Object)} object - Object to match: a URI/literal string or a literal descriptor (optional)
     * @param {Function} callback - Error-first callback `(err, bindings)`; errors with a message if no filter is given
     * @returns {*} The callback result; early-returns a string error when no filter is supplied
     */
    self.deleteTriples = function (sourceLabel, subjectUri, predicateUri, object, callback) {
        if (!subjectUri && !predicateUri && !object) {
            return callback("no subject predicate or object filter : cannot delete");
        }

        var filterStr = "";
        if (subjectUri) {
            filterStr += Sparql_common.getUriFilter("s", subjectUri);
        }
        if (predicateUri) {
            filterStr += Sparql_common.getUriFilter("p", predicateUri);
        }
        if (object) {
            filterStr += Sparql_common.getUriFilter("o", object);
        }
        var graphUri = Config.sources[sourceLabel].graphUri;
        if (Array.isArray(graphUri)) {
            graphUri = graphUri[0];
        }

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

    /**
     * Serialises a triple descriptor object into a SPARQL/Turtle triple string, choosing the
     * right syntax for each element: angle-bracketed URIs and blank nodes, quoted literals with
     * optional `@lang` tag, prefixed names for allowed prefixes, and `^^datatype` typed literals
     * (with numeric and `xsd:dateTime` normalisation). An inverse predicate (prefixed with `^`)
     * swaps subject and object.
     * @function
     * @name triplesObjectToString
     * @memberof module:Sparql_generic
     * @param {Object} item - Triple descriptor with `subject`/`s`, `predicate`/`p`, `object`/`o`, and optional `lang`, `isString`, `valueType`
     * @returns {string} A single `subject predicate object . ` SPARQL triple string
     */
    self.triplesObjectToString = function (item) {
        if (!item.subject) {
            item.subject = item.s;
        }
        if (!item.predicate) {
            item.predicate = item.p;
        }
        if (!item.object) {
            item.object = item.o;
        }

        var allowedPrefixes = Object.keys(Config.defaultSparqlPrefixes);

        function setElementSyntax(elt) {
            var p = -1;
            if ((p = elt.indexOf("@")) > 0) {
                return '"' + elt.substring(0, p) + '"' + elt.substring(p);
            }
            if (elt.match(/^_:b\d+$/)) {
                return elt;
            } else if (elt.indexOf("_:b") == 0) {
                return "<" + elt + ">";
            } else if (elt.indexOf("nodeID:") == 0) {
                return "<" + elt + ">";
            } else if (elt.indexOf("_:") == 0) {
                return "<" + elt + ">";
            } else if (elt.indexOf("http") == 0 || item.valueType == "uri") {
                return "<" + elt + ">";
            } else if (elt.indexOf("<") == 0) {
                return elt;
            }

            if ((p = elt.indexOf("^^")) > 0) {
                //xsd type

                var object_value = item.object.substring(0, p);
                var string_number_version = +item.object.substring(0, p).replace(/'/gm, "");
                if (!isNaN(string_number_version)) {
                    object_value = '"' + string_number_version + '"';
                }
                if (item.object.split("^^")[1] == "xsd:dateTime") {
                    object_value = '"' + item.object.substring(0, p).replace(/'/gm, "") + '"';
                }
                return object_value + item.object.substring(p);
            }

            var array = elt.trim().split(":");
            if (array.length == 2 && allowedPrefixes.indexOf(array[0]) > -1) {
                return elt;
            }

            return '"' + elt.replace(/"/g, "'") + '"';
        }

        var subjectStr = setElementSyntax(item.subject);

        var objectStr;

        if (item.lang) {
            var langStr = "@" + item.lang;
            objectStr = "'" + item.object + "'" + langStr;
        }
        if (item.isString) {
            objectStr = '"' + item.object + '"';
        } else {
            // console.log(item.object + " is not a String ");
            objectStr = setElementSyntax(item.object);
        }

        var p = item.predicate.indexOf("^");
        if (p == 0) {
            var predicate = item.predicate.substring(1);
            return objectStr + " " + setElementSyntax(predicate) + " <" + item.subject + ">. ";
        } else {
            return subjectStr + " " + setElementSyntax(item.predicate) + " " + objectStr + ". ";
        }
    };

    /**
     * Builds a `PREFIX key: <uri>` string for every prefix declared in
     * `Config.defaultSparqlPrefixes`, to prepend to INSERT/DELETE queries.
     * @function
     * @name getDefaultSparqlPrefixesStr
     * @memberof module:Sparql_generic
     * @returns {string} Concatenated PREFIX declarations for all default prefixes
     */
    self.getDefaultSparqlPrefixesStr = function () {
        var str = "";
        for (var key in Config.defaultSparqlPrefixes) {
            str += "PREFIX " + key + ": " + Config.defaultSparqlPrefixes[key] + " ";
        }
        return str;
    };

    /**
     * Inserts triples into a source's named graph (or an explicit `options.graphUri`). Each
     * triple descriptor is serialised via {@link module:Sparql_generic.triplesObjectToString},
     * deduplicated, batched into slices of 200 and run as `WITH GRAPH <graphUri> INSERT { ... }`.
     * With `options.getSparqlOnly`, returns the generated query instead of executing it.
     * @function
     * @name insertTriples
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name whose graph receives the triples (may be null if `options.graphUri` is set)
     * @param {Object[]} _triples - Triple descriptor objects to insert
     * @param {Object} [options] - Insert options
     * @param {string} [options.graphUri] - Target graph URI when no `sourceLabel` is given
     * @param {Object} [options.sparqlPrefixes] - Prefix map used to expand prefixed names before insertion
     * @param {boolean} [options.getSparqlOnly] - Return the generated INSERT query instead of executing it
     * @param {Function} callback - Error-first callback `(err, insertedCount)` (or `(null, query)` when `getSparqlOnly`)
     * @returns {void}
     */
    self.insertTriples = function (sourceLabel, _triples, options, callback) {
        if (!options) {
            options = {};
        }
        var graphUri;
        if (!sourceLabel) {
            if (!options.graphUri) {
                return callback("no sourceLabel or graphUri");
            }
            graphUri = options.graphUri;
        } else {
            graphUri = Config.sources[sourceLabel].graphUri;
            if (Array.isArray(graphUri)) {
                graphUri = graphUri[0];
            }
        }

        var slices = common.array.slice(_triples, 200);
        var uniqueTriples = {};
        async.eachSeries(
            slices,
            function (triples, callbackEach) {
                var insertTriplesStr = "";
                triples.forEach(function (item, _index) {
                    var tripleStr = self.triplesObjectToString(item);
                    if (options.sparqlPrefixes) {
                        tripleStr = Sparql_common.replaceSparqlPrefixByUri(tripleStr, options.sparqlPrefixes);
                    }
                    if (!uniqueTriples[tripleStr]) {
                        // suppress duplicate if any
                        uniqueTriples[tripleStr] = 1;
                        insertTriplesStr += tripleStr;
                    }
                });

                var query = self.getDefaultSparqlPrefixesStr();
                //  query += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
                query += " WITH GRAPH  <" + graphUri + ">  " + "INSERT " + "  {" + insertTriplesStr + "  }";

                if (options.getSparqlOnly) {
                    return callback(null, query);
                }
                // console.log(query)
                var url = Config.sources[sourceLabel] ? Config.sources[sourceLabel].sparql_server.url : Config.sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
                    return callbackEach(err);
                });
            },
            function (err) {
                return callback(err, _triples.length);
            },
        );
    };

    /**
     * Deletes triples from a source's graph matching a SPARQL filter expression
     * (`WITH <graphUri> DELETE { ?s ?x ?y } WHERE { ?s ?x ?y. ?s ?p ?o. filter(<filter>) }`).
     * When no filter is given, prompts for confirmation before deleting the entire graph.
     * @function
     * @name deleteTriplesWithFilter
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name whose graph is edited
     * @param {string} filter - SPARQL filter expression selecting the triples to delete; empty deletes all (after confirmation)
     * @param {Function} callback - Error-first callback `(err, result)`
     * @returns {void}
     */
    self.deleteTriplesWithFilter = function (sourceLabel, filter, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;

        var query = " WITH <" + graphUri + "> DELETE {?s ?x ?y} ";

        if (filter) {
            query += " WHERE {?s ?x ?y.?s ?p ?o. filter(" + filter + ")}";
        }

        if (!filter) {
            if (!confirm("Do you really want to delete all triples of source " + sourceLabel)) {
                return;
            }
        }
        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, _result) {
            return callback(err, _result);
        });
    };

    /**
     * Copies all triples from a source's graph into another graph using paginated
     * `with <fromGraph> insert { graph <toGraph> { ?s ?p ?o } } where { ?s ?p ?o }` runs,
     * looping with `async.whilst` over `offset`/`limit` windows of 100000 until exhausted.
     * @function
     * @name copyGraph
     * @memberof module:Sparql_generic
     * @param {string} fromSourceLabel - Source name whose graph is the copy origin
     * @param {string} toGraphUri - Destination graph URI
     * @param {Function} callback - Error-first callback `(err, resultSize)` with the last batch size
     * @returns {void}
     */
    self.copyGraph = function (fromSourceLabel, toGraphUri, callback) {
        var fromGraphUri = Config.sources[fromSourceLabel].graphUri;
        var query = " COPY <" + fromGraphUri + "> TO <" + toGraphUri + ">;";

        var query = "with <" + fromGraphUri + ">\n" + "insert {graph <" + toGraphUri + "> {?s ?p ?o}}\n" + "where {?s ?p ?o}";

        var offset = 0;
        var step = 100000;
        var limit = step;
        var resultSize = step + 1;
        var totalSize = 0;
        var url = Config.sources[fromSourceLabel].sparql_server.url + "?format=json&query=";

        async.whilst(
            function (callbackTest) {
                callbackTest(null, resultSize == step);
            },

            function (callbackWhilst) {
                var queryOffest = query + " offset=" + offset + "limit =" + limit;
                Sparql_proxy.querySPARQL_GET_proxy(url, queryOffest, null, { source: fromSourceLabel }, function (err, _result) {
                    var result = result.results.bindings[0]["callret-0"].value;

                    try {
                        var regex = / (\d)+ /;
                        resultSize = result.match(regex)[1];
                        if (resultSize) {
                            resultSize = parseInt(resultSize);
                        }
                    } catch (e) {
                        console.log(e);
                        resultSize = -1;
                    }
                    totalSize += resultSize;
                    offset += step;
                    return callbackWhilst(err);
                });
            },
            function (err) {
                return callback(err, resultSize);
            },
        );
    };
    /**
     * Lists the distinct predicates used in a source, with their optional labels. Runs
     * `select distinct ?p ?pLabel WHERE { ?s ?p ?o. optional { ?p ?x ?pLabel. filter(?x in
     * (skos:prefLabel, rdfs:label)) } }` then fills missing labels via
     * {@link module:Sparql_generic.setBindingsOptionalProperties}.
     * @function
     * @name getDistinctPredicates
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name to query
     * @param {Object} [options] - Reserved options object
     * @param {Function} callback - Error-first callback `(err, bindings)` with `?p`/`?pLabel` bindings
     * @returns {void}
     */
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
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel, returnQueryStr: options && options.returnQueryStr }, function (_err, result) {
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["p"]);
            return callback(null, result.results.bindings);
        });
    };

    /**
     * Copies selected nodes (and their properties) from a source into a target graph, optionally
     * minting fresh URIs. Fetches each node's triples via {@link module:Sparql_generic.getNodeInfos},
     * remaps subject/object URIs (random hexa ids unless `keepOriginalUris`), can add
     * `skos:exactMatch`/`rdfs:sameAs` back-links, parent links and `rdf:type` triples per the
     * target schema, then INSERTs the rebuilt triples in batches of 100.
     * @function
     * @name copyNodes
     * @memberof module:Sparql_generic
     * @param {string} fromSourceLabel - Source name the nodes come from
     * @param {string} toGraphUri - Destination graph URI
     * @param {string[]} sourceIds - URIs of the nodes to copy
     * @param {Object} [options] - Copy options
     * @param {boolean} [options.keepOriginalUris] - Reuse source URIs instead of minting new ones
     * @param {boolean} [options.addExactMatchPredicate] - Add an exactMatch/sameAs link back to the source node
     * @param {Object} [options.setParentNode] - `{sourceUri, targetUri}` to attach a parent (broader/subClassOf) link
     * @param {string[]} [options.properties] - Only copy these property URIs
     * @param {string[]} [options.excludedProperties] - Skip these property URIs
     * @param {string[]} [options.additionalTriplesNt] - Extra N-Triples strings to insert
     * @param {Function} [options.setSubjectFn] - Hook to mutate each item's subject
     * @param {Function} [options.setPredicateFn] - Hook to mutate each item's predicate
     * @param {Function} [options.setObjectFn] - Hook to mutate each item's object
     * @param {Function} callback - Error-first callback `(err, insertedCount)`
     * @returns {void}
     */
    self.copyNodes = function (fromSourceLabel, toGraphUri, sourceIds, options, callback) {
        if (!options) {
            options = {};
        }
        var newTriplesSets = [];
        var newTriples = [];

        var setSize = 100;

        if (toGraphUri.charAt(toGraphUri.length - 1) != "/") {
            toGraphUri += "/";
        }
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
                        if (targetSchemaType == "SKOS") {
                            exactMatchPredicate = "http://www.w3.org/2004/02/skos/core#exactMatch";
                        } else {
                            exactMatchPredicate = "http://www.w3.org/2000/01/rdf-schema#sameAs";
                        }
                        var triple = targetUri + " <" + exactMatchPredicate + "> <" + sourceUri + "> .";
                        newTriples.push(triple);
                    }
                    if (options.setParentNode && options.setParentNode.sourceUri == sourceUri) {
                        var parentPredicate;
                        if (targetSchemaType == "SKOS") {
                            parentPredicate = "http://www.w3.org/2004/02/skos/core#broader";
                        } else {
                            parentPredicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
                        }
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
                        if (err) {
                            return callbackSeries(err);
                        }

                        result.forEach(function (item) {
                            if (options.setSubjectFn) {
                                options.setSubjectFn(item);
                            }
                            if (options.setPredicateFn) {
                                options.setPredicateFn(item);
                            }

                            if (options.setObjectFn) {
                                options.setObjectFn(item);
                            }

                            var subject = getTargetUri(item.id.value, item);
                            var prop = item.prop.value;
                            if (options.excludedProperties && options.excludedProperties.indexOf(prop) > -1) {
                                return;
                            }
                            if (!options.properties || options.properties.indexOf(item.prop.value) > -1) {
                                var valueStr = null;
                                if (item.prop.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                                    valueStr = "<" + item.value.value + ">";
                                } else if (item.value.type == "uri") {
                                    valueStr = getTargetUri(item.value.value, item);
                                } else {
                                    var langStr = "";
                                    if (item.value["xml:lang"]) {
                                        langStr = "@" + item.value["xml:lang"];
                                    }
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
                            if (newTriples.indexOf(triple) < 0) {
                                newTriples.push(triple);
                            }
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
                        },
                    );
                },
            ],
            function (err) {
                return callback(err, newTriples.length);
            },
        );
    };

    /**
     * Sorts SPARQL result bindings in place by the string value of a given field (missing
     * values sort as empty string).
     * @function
     * @name sortBindings
     * @memberof module:Sparql_generic
     * @param {Array<Object>} bindings - Result bindings to sort
     * @param {string} field - Variable name to sort by (`binding[field].value`)
     * @param {Object} [_options] - Reserved (unused)
     * @returns {Array<Object>} The same array, sorted ascending by the field value
     */
    self.sortBindings = function (bindings, field, _options) {
        bindings.sort(function (a, b) {
            var aValue = a[field] ? a[field].value : "";
            var bValue = b[field] ? b[field].value : "";
            if (aValue > bValue) {
                return 1;
            }
            if (aValue < bValue) {
                return -1;
            }
            return 0;
        });
        return bindings;
    };

    /**
     * Fills missing `<field>Label` cells in result bindings by deriving a label from the
     * field's URI value (its local name) via {@link module:Sparql_common.getLabelFromURI}.
     * @function
     * @name setMissingLabels
     * @memberof module:Sparql_generic
     * @param {Array<Object>} bindings - Result bindings to enrich in place
     * @param {(string|string[])} _fields - Variable name(s) whose labels to backfill
     * @param {Object} [options] - Reserved options object
     * @returns {Array<Object>} The same bindings with `<field>Label` cells added where missing
     */
    self.setMissingLabels = function (bindings, _fields, options) {
        if (!options) {
            options = {};
        }
        if (!Array.isArray(_fields)) {
            _fields = [_fields];
        }
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

    /**
     * Backfills missing `<field>Type` and `<field>Label` cells for a family of indexed fields
     * (`field`, `field1` … `field4`) in result bindings. Defaults the type to
     * `skos:Concept` (or `options.type`) and derives labels from the URI local name; blank
     * nodes get an empty label.
     * @function
     * @name setBindingsOptionalProperties
     * @memberof module:Sparql_generic
     * @param {Array<Object>} bindings - Result bindings to enrich in place
     * @param {(string|string[])} _fields - Base variable name(s); indexed variants 0–4 are processed
     * @param {Object} [options] - Enrichment options
     * @param {boolean} [options.noType] - Do not add `<field>Type` cells
     * @param {string} [options.type] - Type URI to use instead of the default `skos:Concept`
     * @returns {Array<Object>} The same bindings with type/label cells filled in
     */
    self.setBindingsOptionalProperties = function (bindings, _fields, options) {
        if (!options) {
            options = {};
        }
        if (!Array.isArray(_fields)) {
            _fields = [_fields];
        }

        _fields.forEach(function (_field) {
            bindings.forEach(function (item) {
                for (var i = 0; i < 5; i++) {
                    var iStr = "" + i;
                    if (i == 0) {
                        iStr = "";
                    }
                    var field = _field + "" + iStr;
                    if (!item[field]) {
                        continue;
                    }
                    if (!options.noType && !item[field + "Type"]) {
                        if (options.type) {
                            item[field + "Type"] = { value: options.type };
                        } else {
                            item[field + "Type"] = { value: "http://www.w3.org/2004/02/skos/core#Concept" };
                        }
                    }
                    var id = item[field].value;

                    if (!item[field + "Label"]) {
                        if (id.indexOf("_:") == 0) {
                            item[field + "Label"] = "";
                        } else {
                            var p = id.lastIndexOf("#");
                            if (p > -1) {
                                item[field + "Label"] = { value: id.substring(p + 1) };
                            } else {
                                p = id.lastIndexOf("/");
                                item[field + "Label"] = { value: id.substring(p + 1) };
                            }
                        }
                    }
                }

                //   item.child1Label={value:id.substring(id.lastIndexOf("#")+1)}
            });
        });
        return bindings;
    };

    /**
     * Builds a SPARQL language filter that keeps a variable's literals in the requested
     * language or with no language tag (`FILTER (lang(var)='xx' || !lang(var))`).
     * @function
     * @name getLangFilterStr
     * @memberof module:Sparql_generic
     * @param {Object} options - Filter options
     * @param {string} [options.lang] - BCP-47 language code to keep (alongside untagged literals); no filter emitted when absent
     * @param {string} variable - SPARQL variable expression (including `?`) the filter applies to
     * @returns {string} The language `FILTER` clause, or `""` when no `options.lang` is given
     */
    self.getLangFilterStr = function (options, variable) {
        var langFilter = "";
        if (!options || !options.lang) {
            return "";
        }
        return " FILTER (lang(" + variable + ")='" + options.lang + "' || !lang(" + variable + "))  ";
    };

    /**
     * Builds the complete subsumption taxonomy (class/concept hierarchy) of a source as a flat
     * map of nodes with resolved ancestor chains. The parent predicate and concept type are
     * chosen from the schema (`rdfs:subClassOf`/`owl:Class` for OWL, `skos:broader`/`skos:Concept`
     * for SKOS, `rdf:type`/`owl:NamedIndividual` for KNOWLEDGE_GRAPH, or `options.parentType`).
     * The hierarchy query is paginated (limit 500) with `async.whilst`; results are then folded
     * into `allClassesMap` (collecting labels/altLabels per node), each node's direct parents are
     * expanded into a single most-specific ancestor chain, and orphan parents are back-filled
     * (labels fetched via {@link module:Sparql_OWL.getLabelsMap} for OWL).
     * @function
     * @name getSourceTaxonomy
     * @memberof module:Sparql_generic
     * @param {string} sourceLabel - Source name whose taxonomy is built
     * @param {Object} [options] - Build options
     * @param {string[]} [options.ids] - Restrict to these subject URIs (adds a `setFilter` clause)
     * @param {string} [options.filter] - Extra SPARQL filter appended to the hierarchy query
     * @param {string} [options.parentType] - Parent predicate to use when the schema type is unrecognised
     * @param {boolean} [options.withoutImports] - Exclude imported graphs from the `FROM` clause
     * @param {Function} callback - Error-first callback `(err, {classesMap, labels})` where `classesMap` maps each node URI to `{id, label, lang, skoslabels, parents, type}` and `labels` maps URI → label
     * @returns {void}
     */
    self.getSourceTaxonomy = function (sourceLabel, options, callback) {
        var schemaType = Config.sources[sourceLabel].schemaType;
        if (!options) {
            options = {};
        }
        var parentType;
        var conceptType;
        if (schemaType == "OWL") {
            parentType = Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel);

            conceptType = "owl:Class";
        } else if (schemaType == "KNOWLEDGE_GRAPH") {
            parentType = "rdf:type";
            conceptType = "owl:NamedIndividual";
        } else if (schemaType == "SKOS") {
            parentType = "skos:broader";
            conceptType = "skos:Concept";
        } else if (options.parentType) {
            parentType = options.parentType;
            if (parentType == "rdfs:subPropertyOf") {
                conceptType: "owl:ObjectProperty";
            }
        } else {
            return alert("no schema type");
        }
        if (options.ids) {
            var idFilter = Sparql_common.setFilter("subject", options.ids);
            if (!options.filter) {
                options.filter = "";
            }
            options.filter += " " + idFilter;
        }

        var allClassesMap = {};
        var allLabels = {};
        var allData = [];

        async.series(
            [
                function (callbackSeries) {
                    if (!options) {
                        options = {};
                    }
                    var totalCount = 0;
                    var resultSize = 1;
                    var limitSize = 500;
                    var offset = 0;

                    var fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports, true);

                    var filter = options.filter || "";

                    if (schemaType == "OWL") {
                        var queryOld =
                            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                            "SELECT distinct *  " +
                            fromStr +
                            "  WHERE {{  ?subject   rdfs:subClassOf+   ?firstParent.?subject rdfs:label ?subjectLabel.  ?firstParent rdf:type owl:Class. " +
                            "filter(isIRI(?subject) && isIRI(?firstParent))" +
                            filter +
                            "OPTIONAL{?subject skos:altLabel \n" +
                            "          ?skosAltLabel. } " +
                            "} UNION " +
                            "{  ?subject   rdfs:subClassOf  ?firstParent.    ?firstParent rdf:type owl:Class. ?subject <http://www.w3.org/2004/02/skos/core#prefLabel> ?subjectLabel. filter(isIRI(?subject) && isIRI(?firstParent)) filter( lang(?subjectLabel)= 'en' || !lang(?subjectLabel))OPTIONAL{?subject skos:altLabel ?skosAltLabel }  " +
                            filter +
                            "}" +
                            "UNION  {" +
                            "    ?subject rdf:type owl:Class.?subject rdfs:label ?subjectLabel." +
                            "filter(isIRI(?subject))" +
                            filter +
                            "  OPTIONAL{?subject skos:altLabel  ?skosAltLabel}" +
                            "  filter( not exists{  ?subject   rdfs:subClassOf   ?aParent.  ?aParent rdf:type owl:Class.  })}" +
                            "}";

                        var query =
                            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>SELECT distinct * \n" +
                            fromStr +
                            "WHERE {\n" +
                            "    ?subject rdfs:subClassOf ?firstParent .\n" +
                            "    ?subject rdfs:label ?subjectLabel .\n" +
                            "  filter (  exists {?firstParent rdf:type owl:Class  } || not exists{?firstParent rdf:type ?t })\n" +
                            " filter (?firstParent!=owl:Class)\n" +
                            "    OPTIONAL {\n" +
                            "      ?subject skos:prefLabel|skos:altLabel ?subjectAltLabel .\n" +
                            "    }\n" +
                            "  }";
                    } else {
                        var query3 =
                            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                            "SELECT distinct * " +
                            fromStr +
                            " WHERE {";
                        //     var where = "  ?subject " + parentType + " ?firstParent." + Sparql_common.getVariableLangLabel("subject", false, true) + "OPTIONAL{?subject skos:altLabel ?skosAltLabel }";

                        var where =
                            "  ?subject " +
                            parentType +
                            " ?firstParent." +
                            " OPTIONAL {?subject rdfs:label ?subjectLabel.}" +
                            //  Sparql_common.getVariableLangLabel("subject", false, true)
                            "OPTIONAL{?subject skos:altLabel ?skosAltLabel }";

                        if (options.filter) {
                            where += " " + options.filter + " ";
                        }

                        //  where += "filter (?firstParent not in (owl:Restriction, owl:Class))";
                        //  where += " FILTER NOT EXISTS {?firstParent rdf:type owl:Restriction}";
                        where += "  filter (!regex(str(?firstParent),'http://www.w3.org/2002/07/owl#'))";
                        // make two queries and union them to solve timeout problem
                        if (schemaType == "OWL") {
                            var where1 = where.replace("|<http://www.w3.org/2004/02/skos/core#prefLabel>", "");
                            var where2 = where.replace("?subject rdfs:label|", "?subject ");
                            where = "{" + where1 + "}\n UNION \n{" + where2 + "}";
                        }
                        query += where;
                        query += "}";
                    }

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
                                    dontCacheCurrentQuery: true,
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
                                    //   UI.message(sourceLabel + "retreived triples :" + totalCount);
                                    offset += limitSize;
                                    callbackWhilst();
                                },
                            );
                        },
                        function (_err) {
                            callbackSeries();
                        },
                    );
                },

                //format result
                function (callbackSeries) {
                    var skosLabelsMap = {};
                    var conceptLabel = null;

                    function getConceptLabel(item) {
                        if (item.subjectLabel) {
                            conceptLabel = item.subjectLabel.value;
                        } else if (item.skosLabel) {
                            conceptLabel = item.skosLabel.value;
                        } else if (item.skosAltLabel) {
                            conceptLabel = item.skosAltLabel.value;
                        } else {
                            conceptLabel = Sparql_common.getLabelFromURI(item.subject.value);
                        }
                        return conceptLabel;
                    }

                    allData.forEach(function (item) {
                        if (!skosLabelsMap[item.subject.value]) {
                            skosLabelsMap[item.subject.value] = [];
                        }

                        if (!conceptLabel) {
                            return;
                        }
                        var decapitalizedLabel = common.decapitalizeLabel(conceptLabel);
                        if (decapitalizedLabel != conceptLabel) {
                            skosLabelsMap[item.subject.value].push(conceptLabel);
                            conceptLabel = decapitalizedLabel;
                        }
                        if (!allLabels[item.subject.value]) {
                            allLabels[item.subject.value] = conceptLabel;
                        }

                        if (item.skosLabel) {
                            if (skosLabelsMap[item.subject.value].indexOf(item.skosLabel.value) < 0) {
                                skosLabelsMap[item.subject.value].push(item.skosLabel.value);
                            }
                        }
                        if (item.code) {
                            if (skosLabelsMap[item.subject.value].indexOf(item.code.value) < 0) {
                                skosLabelsMap[item.subject.value].push(item.code.value);
                            }
                        }
                        if (item.skosAltLabel) {
                            if (skosLabelsMap[item.subject.value].indexOf(item.skosAltLabel.value) < 0) {
                                skosLabelsMap[item.subject.value].push(item.skosAltLabel.value);
                            }
                        }
                    });

                    allData.forEach(function (item) {
                        var conceptLabel = getConceptLabel(item);
                        if (!conceptLabel) {
                            return;
                        }
                        var decapitalizedLabel = common.decapitalizeLabel(conceptLabel);
                        if (decapitalizedLabel != conceptLabel) {
                            conceptLabel = decapitalizedLabel;
                        }
                        if (!allClassesMap[item.subject.value]) {
                            allClassesMap[item.subject.value] = {
                                id: item.subject.value,
                                label: conceptLabel,
                                lang: item.subjectLabel ? item.subjectLabel["xml:lang"] : null,
                                skoslabels: skosLabelsMap[item.subject.value],
                                parents: item.firstParent ? [item.firstParent.value] : [],
                                type: conceptType,
                            };
                        } else {
                            var newLang = item.subjectLabel ? item.subjectLabel["xml:lang"] : null;
                            if (newLang === "en" && allClassesMap[item.subject.value].lang !== "en") {
                                allClassesMap[item.subject.value].label = conceptLabel;
                                allClassesMap[item.subject.value].lang = "en";
                            }
                            if (item.firstParent) {
                                var parentVal = item.firstParent.value;
                                if (allClassesMap[item.subject.value].parents.indexOf(parentVal) < 0) {
                                    allClassesMap[item.subject.value].parents.push(parentVal);
                                }
                            }
                        }
                    });
                    callbackSeries();
                },

                // set ancestors
                function (callbackSeries) {
                    for (var key in allClassesMap) {
                        allClassesMap[key]._directParents = allClassesMap[key].parents.slice();
                        allClassesMap[key].parents = [];
                    }

                    function recurse(nodeId, ancestors) {
                        var obj = allClassesMap[nodeId];
                        if (!obj) return;
                        obj._directParents.forEach(function (parentId) {
                            if (ancestors.indexOf(parentId) < 0) {
                                ancestors.push(parentId);
                                recurse(parentId, ancestors);
                            }
                        });
                    }

                    for (var key in allClassesMap) {
                        recurse(key, allClassesMap[key].parents);
                    }

                    // pick single most-specific parent (deepest = most ancestors)
                    // read all depths before modifying any parents array
                    var chosenParents = {};
                    for (var key in allClassesMap) {
                        chosenParents[key] = allClassesMap[key]._directParents.reduce(function (best, candidateId) {
                            if (!best) return candidateId;
                            var bestDepth = allClassesMap[best] ? allClassesMap[best].parents.length : 0;
                            var candidateDepth = allClassesMap[candidateId] ? allClassesMap[candidateId].parents.length : 0;
                            return candidateDepth > bestDepth ? candidateId : best;
                        }, null);
                    }

                    // build full ancestor chain following chosen parents only (memoized)
                    function buildParentChain(nodeId) {
                        var obj = allClassesMap[nodeId];
                        if (!obj || obj._chainBuilt) return obj ? obj.parents : [];
                        var chosenParent = chosenParents[nodeId];
                        obj.parents = chosenParent ? [chosenParent].concat(buildParentChain(chosenParent)) : [];
                        obj._chainBuilt = true;
                        return obj.parents;
                    }

                    for (var key in allClassesMap) {
                        buildParentChain(key);
                        delete allClassesMap[key]._directParents;
                        delete allClassesMap[key]._chainBuilt;
                    }

                    // format parents: add source and sort top-down [source, ..., parent_direct]
                    for (var key in allClassesMap) {
                        var parentArray = allClassesMap[key].parents.slice();
                        parentArray.push(sourceLabel);
                        allClassesMap[key].parents = parentArray.reverse();
                    }

                    callbackSeries();
                },

                // add orphan parents to all data
                function (callbackSeries) {
                    var orphanParentIds = [];
                    for (var key in allClassesMap) {
                        allClassesMap[key].parents.forEach(function (parentId) {
                            if (parentId && parentId != sourceLabel && !allClassesMap[parentId] && orphanParentIds.indexOf(parentId) < 0) {
                                orphanParentIds.push(parentId);
                            }
                        });
                    }

                    if (schemaType !== "OWL" || orphanParentIds.length === 0) {
                        orphanParentIds.forEach(function (parentId) {
                            allClassesMap[parentId] = {
                                id: parentId,
                                label: Sparql_common.getLabelFromURI(parentId),
                                skoslabels: [],
                                parents: [sourceLabel],
                                type: "owl:class",
                            };
                        });
                        return callbackSeries();
                    }

                    var idFilter = Sparql_common.setFilter("id", orphanParentIds);
                    Sparql_OWL.getLabelsMap(sourceLabel, { filter: idFilter }, function (err, labelsMap) {
                        if (err) {
                            labelsMap = {};
                        }
                        orphanParentIds.forEach(function (parentId) {
                            allClassesMap[parentId] = {
                                id: parentId,
                                label: labelsMap[parentId] || Sparql_common.getLabelFromURI(parentId),
                                skoslabels: [],
                                parents: [sourceLabel],
                                type: "owl:class",
                            };
                        });
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                return callback(err, { classesMap: allClassesMap, labels: allLabels });
            },
        );
    };

    /**
     * For every item whose preferred label is capitalised, inserts a `skos:altLabel` triple
     * holding the decapitalised variant (improves search matching). Items are fetched via
     * {@link module:Sparql_generic.getItems}, and the new triples are inserted in batches of 100.
     * @function
     * @name createDecapitalizedLabelTriples
     * @memberof module:Sparql_generic
     * @param {string} source - Source name to process
     * @param {Function} callback - Error-first callback `(err, total)` with the number of triples inserted
     * @returns {void}
     */
    self.createDecapitalizedLabelTriples = function (source, callback) {
        Sparql_generic.getItems(source, {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            var total = 0;
            var slices = common.array.slice(result, 100);
            async.eachSeries(
                slices,
                function (slice, callbackEach) {
                    var triples = [];

                    slice.forEach(function (item) {
                        if (item.subjectLabel) {
                            var decapitalizedLabel = common.decapitalizeLabel(item.subjectLabel.value);
                            if (decapitalizedLabel == item.subjectLabel.value) {
                                return;
                            }

                            triples.push({
                                subject: item.subject.value,
                                predicate: "http://www.w3.org/2004/02/skos/core#altLabel",
                                object: decapitalizedLabel,
                            });
                        }
                    });

                    if (triples.length == 0) {
                        return callbackEach;
                    }
                    self.insertTriples(source, triples, null, function (err, result) {
                        total += result;
                        // eslint-disable-next-line no-console
                        console.log(total + " inserted");

                        callbackEach(err);
                    });
                },
                function (err) {
                    if (err) {
                        return callback(err);
                    }
                    return callback(err, total);
                },
            );
        });
    };

    /**
     * Stub intended to serialise an array of triples into Turtle (not yet implemented).
     * @function
     * @name triplesToTurtle
     * @memberof module:Sparql_generic
     * @param {Object[]} triples - Triple descriptors to serialise
     * @returns {void}
     */
    self.triplesToTurtle = function (triples) {
        var subjectsMap = {};

        triples.forEach(function () {});
    };

    return self;
})();

export default Sparql_generic;

window.Sparql_generic = Sparql_generic;
