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
     *  variables : [?conceptGraph] ?topConcept  ?topConceptLabel  ?conceptGraph
     */
    self.getTopConcepts = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = "";

        var strFilterTopConcept;
        var topClassFilter = Config.sources[sourceLabel].topClassFilter;
        if (topClassFilter && topClassFilter != "" && topClassFilter != "_default") {
            strFilterTopConcept = topClassFilter;
        } else {
            strFilterTopConcept = "?topConcept rdf:type  owl:Class. filter(NOT EXISTS {?topConcept " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) + " ?z}) ";
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
            "select   distinct ?topConcept  ?topConceptLabel  ?conceptGraph  " +
            fromStr +
            "  where {";
        if (options.selectGraph) {
            query += " GRAPH ?conceptGraph {";
        }
        if (Config.sources[sourceLabel].schemaType != "KNOWLEDGE_GRAPH") {
            query += "?topConcept rdf:type owl:Class.";
        }
        query += strFilterTopConcept + " OPTIONAL{?topConcept rdfs:label ?topConceptLabel.}";
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
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", { type: "http://www.w3.org/2002/07/owl#Class" });

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
     *   variables [?conceptGraph] ?concept (parent) ?conceptLabel ?child[X] ?shild[X]label
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
            strFilter = Sparql_common.setFilter("concept", null, words, options);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("concept", ids, null, options);
        }
        if (!Config.sources[sourceLabel].graphUri) {
            options.selectGraph = false;
        }

        fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph);

        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "select   distinct * " + fromStr + " where {";
        if (options.selectGraph) {
            query += " GRAPH ?child1Graph {";
        }
        query +=
            "?child1 " +
            Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel, options) +
            " ?concept.  FILTER (!isBlank(?concept)) " +
            strFilter +
            "OPTIONAL {?concept rdfs:label ?conceptLabel." +
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
            query += "} "; // query += " GRAPH ?conceptGraph {?concept rdf:type ?o}";
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
                " ?concept.   " +
                strFilter +
                "   ?collection skos:member* ?acollection. " +
                Sparql_generic.Sparql_common.getUriFilter("collection", options.filterCollections) +
                "?acollection rdf:type skos:Collection.    ?acollection skos:member/(" +
                Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) +
                "*) ?child1.  " +
                "  " +
                "   ?collection skos:prefLabel ?collectionLabel." +
                "   ?acollection skos:prefLabel ?acollectionLabel." +
                "   optional{?concept rdfs:label ?conceptLabel.}" +
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
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "child"]);
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
     *   variables [?conceptGraph] ?prop ?value [?propLabel] [?valueLabel]
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

        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " + "select * " + fromStr + " where {";
        if (options.selectGraph && Config.sources[sourceLabel].graphUri) {
            query += "graph ?g ";
        }
        query += "{<" + conceptId + "> ?prop ?value.  ";
        if (options.getValuesLabels) {
            query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} ";
        }
        query += "    filter( !isBlank(?value))";
        query += "}";

        if (options.inverseProperties) {
            query += "UNION {?value  ?prop <" + conceptId + "> .  ";
            if (options.getValuesLabels) {
                query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} ";
            }
            query += "}";
        }

        query += " }";
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

    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        if (Config.sources[sourceLabel].imports && Config.sources[sourceLabel].imports.length > 0) {
            //limit at 4 ancestorsDepth when imports
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
            strFilter = Sparql_common.setFilter("concept", null, words, options);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("concept", ids, null, options);
        }
        options.selectGraph = false;
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports);

        var selectStr = " * ";
        if (options.excludeType) {
            selectStr = " ?concept ?conceptLabel";
            for (var i = 1; i <= ancestorsDepth; i++) {
                selectStr += " ?broader" + i + " ?broader" + i + "Label";
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
        if (false && options.selectGraph) {
            query += " GRAPH ?conceptGraph {";
        }
        query += "?concept rdf:type  ?conceptType. filter (?conceptType not in(owl:Restriction)) ";
        if (words) {
            query += " ?concept rdfs:label ?conceptLabel.";
        } else {
            query += " OPTIONAL { ?concept rdfs:label ?conceptLabel.}";
        }

        ancestorsDepth = Math.min(ancestorsDepth, self.ancestorsDepth);

        for (var i = 1; i <= ancestorsDepth; i++) {
            if (i == 1) {
                //  query += "  OPTIONAL{?concept " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) + "  ?broader" + i + ".";
                query += "  ?concept " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel, options) + "  ?broader" + i + ".";
                query += "  OPTIONAL{ ?broader1 rdf:type ?broaderType. filter(?broaderType !=owl:Restriction)} ";
                query += Sparql_common.getVariableLangLabel("broader" + i);
                // query += " OPTIONAL{?broader" + i + " rdfs:label ?broader" + i + "Label.}";
            } else {
                query += "OPTIONAL { ?broader" + (i - 1) + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel, options) + " ?broader" + i + ".";
                //   "?broader" + i + " rdf:type owl:Class."
                query += " ?broader" + i + " rdf:type ?broaderType" + i + ". filter(?broaderType" + i + " !=owl:Restriction) ";
                // query += "OPTIONAL{?broader" + i + " rdfs:label ?broader" + i + "Label."
                // + Sparql_common.getLangFilter(sourceLabel, "broader" + i + "Label") + "}";
                query += Sparql_common.getVariableLangLabel("broader" + i);
            }
        }

        for (let i = 1; i < ancestorsDepth; i++) {
            query += "} ";
        }
        query += " FILTER (!isBlank(?concept))" + strFilter;
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
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "broader"]);
            return callback(null, result.results.bindings);
        });
    };

    self.getNodesAncestors = function (sourceLabel, classIds, options, callback) {
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
            "SELECT * " +
            fromStr +
            " WHERE {" +
            "?class rdf:type ?type. ?class (rdf:type|rdfs:subClassOf)" +
            modifier +
            " ?superClass." +
            " optional {?superClass rdf:type ?superClassType}";
        ("filter (isIRI(?superClass) && ?superClassType!= <http://www.w3.org/2002/07/owl#Restriction>) ");

        if (options.withLabels) {
            query += "OPTIONAL {?class rdfs: label classLabel } OPTIONAL {?superClass rdfs: label superClassLabel }";
        }
        query += filterStr;
        query += "} LIMIT 100";

        var url = self.sparql_url + "?format=json&query=";
        self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
        if (self.no_params) {
            url = self.sparql_url;
        }
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["class", "superClass"]);

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
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            var fromStr = Sparql_common.getFromStr(sourceLabel, false, true, options);

            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>";

            if (options.distinct) {
                query += "select distinct " + options.distinct + " ";
            } else {
                query += "select distinct * ";
            }
            query +=
                fromStr +
                " WHERE {?subject ?prop ?object. " +
                filterStr +
                " " +
                "?subject rdf:type ?subjectType. " +
                "?object rdf:type ?objectType. " +
                Sparql_common.getVariableLangLabel("prop", true) +
                Sparql_common.getVariableLangLabel("subject", true) +
                Sparql_common.getVariableLangLabel("object", true);
            /* "OPTIONAL{?prop rdfs:label ?propertyLabel.}  " +
" OPTIONAL{?subject rdfs:label ?subjectLabel.}  " +
" OPTIONAL{?object rdfs:label ?objectLabel.}  ";*/
            if (options.onlyObjectProperties) {
                (" ?prop rdf:type owl:ObjectProperty.");
            }
            if (options.filter) {
                query += " " + options.filter;
            }
            if (true || options.onlyObject) {
                query += " filter (!isLiteral(?object) )";

                /*   query += " filter (?subjectType in (owl:NamedIndividual, owl:Class))";
query += " filter (?objectType in (owl:NamedIndividual, owl:Class))";*/
            }
            query += " } order by ?propLabel ";
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit;

            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params;
            if (self.no_params) {
                url = self.sparql_url;
            }
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
                if (err) {
                    return callbackQuery(err);
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["object", "prop", "subject"]);
                return callbackQuery(null, result.results.bindings);
            });
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
                }
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
                }
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
     * @param callback return ?concept ?p ?o [?conceptLabel] [?conceptType] [?superClass]
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
        query += "{ ?concept ?p ?o.";
        if (!options.includeBlankNodes) {
            query += "FILTER (!isBlank(?concept))";
        }
        query += "OPTIONAL {?concept rdfs:label ?conceptLabel.}";
        query += "OPTIONAL {?concept rdf:type ?conceptType.}";
        query += "OPTIONAL {?concept " + Sparql_OWL.getSourceTaxonomyPredicates(sourceLabel) + " ?superClass. }";

        if (options.filter) {
            query += options.filter;
        }
        if (options.lang) {
            query += "filter(lang(?conceptLabel )='" + options.lang + "')";
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

            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "concept");
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
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "superPropLabel"]);
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
                "OPTIONAL{?prop rdfs:label ?propLabel.  " +
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
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "inverseProp", "domain", "range"]);
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
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["property", "subProperty"]);
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
     *  - ?g ?concept  ?prop ?propLabel ?conceptLabel  ?value ?valueLabel ?node
     */

    self.getObjectRestrictions = function (sourceLabel, ids, options, callback) {
        if (!options) {
            options = {};
        }

        var filterStr = "";
        if (ids) {
            if (options.inverseRestriction) {
                filterStr = Sparql_common.setFilter("value", ids, null, options);
            } else {
                filterStr = Sparql_common.setFilter("concept", ids, null, options);
            }
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
        if (options.listPropertiesOnly) {
            query += " SELECT distinct ?prop ?propLabel ";
        } else if (options.withoutBlankNodes) {
            query += " SELECT distinct ?concept  ?prop ?propLabel ?conceptLabel  ?value ?valueLabel ?node";
        } else {
            query += "SELECT distinct * ";
        }
        query += "" + fromStr + " WHERE {";
        if (options.selectGraph) {
            query += " GRAPH ?g ";
        }
        query +=
            "{ ?concept rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction." +
            filterStr +
            " ?node owl:onProperty ?prop ." +
            //  " OPTIONAL {?prop rdfs:label ?propLabel}" +
            //  " OPTIONAL {?concept rdfs:label ?conceptLabel}";
            Sparql_common.getVariableLangLabel("prop", true) +
            Sparql_common.getVariableLangLabel("concept", true);

        if (options.someValuesFrom) {
            query += "?node owl:someValuesFrom ?value." + Sparql_common.getVariableLangLabel("value", true); //OPTIONAL {?value rdfs:label ?valueLabel}";
        } else if (options.allValuesFrom) {
            query += "?node owl:allValuesFrom ?value." + Sparql_common.getVariableLangLabel("value", true); // OPTIONAL {?value rdfs:label ?valueLabel}";
        } else if (options.aValueFrom) {
            query += "?node owl:aValueFrom ?value." + Sparql_common.getVariableLangLabel("value", true); // OPTIONAL {?value rdfs:label ?valueLabel}";
        } else {
            query += "?node owl:allValuesFrom|owl:someValuesFrom|owl:aValueFrom ?value." + Sparql_common.getVariableLangLabel("value", true); // OPTIONAL {?value rdfs:label ?valueLabel}";
            /*  query +=
"  OPTIONAL {?node owl:allValuesFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}}" +
"   OPTIONAL {?node owl:someValuesFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}}" +
"   OPTIONAL {?node owl:aValueFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}}";*/
        }

        if (options.getMetadata) {
            query +=
                " ?node  <https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status>" +
                " ?status.?node <http://purl.org/dc/terms/created> ?creationDate. " +
                "?node  <http://purl.org/dc/terms/creator> ?creator." +
                "?node  <http://purl.org/dc/terms/source> ?provenance." +
                "?node <http://data.souslesens.org/property#domainSourceLabel> ?domainSourceLabel." +
                "?node <http://data.souslesens.org/property#rangeSourceLabel> ?rangeSourceLabel.";
        }

        if (options.filter) {
            query += " " + options.filter + " ";
        }

        query += "} }";
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            Sparql_common.setSparqlResultPropertiesLabels(sourceLabel, result.results.bindings, "prop", function (err, result2) {
                if (err) {
                    return callback(err);
                }
                result2 = Sparql_generic.setBindingsOptionalProperties(result2, ["prop", "node", "concept", "value"]);
                return callback(null, result2);
            });
        });
    };

    self.getInverseRestriction = function (sourceLabel, restrictionId, callback) {
        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
        query += "SELECT distinct * where ";

        query += "{ graph ?g {?subject owl:inverseOf <" + restrictionId + ">." + "?subject ?predicate ?object.}}";
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
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
        query += "{ ?concept rdf:type ?node. " + filterStr + " OPTIONAL {?concept rdfs:label ?conceptLabel}" + " OPTIONAL {?node rdfs:label ?nodeLabel}";
        query += " ?concept rdf:type owl:NamedIndividual .";
        query += " }";
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["node", "concept"]);
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
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "predicate"]);
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
                var filterStr = Sparql_common.setFilter("concept", slice, null, options);
                var query = " select  distinct *   WHERE { GRAPH ?g{ " + " ?concept rdf:type ?type. " + filterStr + " }}";

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
            }
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
            "  OPTIONAL {?restriction  owl:someValuesFrom ?targetClass. " +
            "  OPTIONAL {?targetClass rdfs:label ?targetClassLabel}}" +
            "  OPTIONAL {?sourceClass rdfs:label ?sourceClassLabel}" +
            "  OPTIONAL {?prop rdfs:label ?propLabel}";
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
        var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct * " +
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

        var typeFilterStr = "";
        if (options.type) {
            typeFilterStr = "FILTER (?type =" + options.type + ")";
        } else {
            typeFilterStr = "FILTER (?type in(owl:Class, owl:NamedIndividual))";
        }
        query += "{ ?id rdf:type ?type. " + typeFilterStr + " OPTIONAL {?id rdfs:label ?label " + langFilter + "}" + filter + " }}";

        var allData = [];
        var resultSize = 1;
        var limitSize = 2000;
        var offset = 0;
        async.whilst(
            function (_test) {
                return resultSize > 0;
            },
            function (callbackWhilst) {
                var query2 = "" + query;
                var limit = options.limit || Config.queryLimit;
                query2 += " limit " + limitSize + " offset " + offset;

                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                var url = self.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", { source: sourceLabel }, function (err, result) {
                    if (err) {
                        return callbackWhilst(err);
                    }
                    result = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["label"]);
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
            }
        );
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
    self.getGraphsByRegex = function (pattern, callback) {
        var query = "SELECT * " + "WHERE {" + '  ?s <http://www.w3.org/2002/07/owl#versionIRI> ?graph. filter (regex(str(?graph),"' + pattern + '"))' + " ?graph ?p ?value." + "}";

        self.sparql_url = Config.default_sparql_url;
        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.generateInverseRestrictions = function (source, propId, inversePropId, callback) {
        var filter = "filter (?prop=<" + propId + ">)";
        self.getObjectRestrictions(source, null, { filter: filter }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var triples = [];
            result.forEach(function (item) {
                if (item.value && item.concept) {
                    triples = triples.concat(Lineage_blend.getRestrictionTriples(item.value.value, item.concept.value, inversePropId));
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
                        MainController.UI.message((totalItems += slice.length) + " done ");
                        callbackEach();
                    });
                },
                function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(err, totalItems);
                }
            );
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
            "  }" +
            " UNION " +
            "   {" +
            "    ?prop rdf:type owl:ObjectProperty. " +
            "     ?prop rdfs:domain  ?propDomain.    ?propDomain " +
            labelProperty +
            "  ?propDomainLabel.   FILTER (lang(?propDomainLabel)='en' || !lang(?propDomainLabel))" +
            "  }" +
            " UNION " +
            "  {" +
            "    ?prop rdf:type owl:ObjectProperty. " +
            "     ?prop rdfs:range  ?propRange.    ?propRange " +
            labelProperty +
            "  ?propRangeLabel.   FILTER (lang(?propRangeLabel)='en' || !lang(?propRangeLabel))" +
            "}" +
            "   UNION " +
            "   {?prop rdf:type owl:ObjectProperty. " +
            "  ?subProp rdfs:subPropertyOf ?prop .   ?subProp " +
            labelProperty +
            "  ?subPropLabel     filter(   lang(?subPropLabel)= 'en' || !lang(?subPropLabel))" +
            "  }" +
            "  UNION " +
            "   {?prop rdf:type owl:ObjectProperty." +
            "  ?prop owl:inverseOf|^owl:inverseOf ?inverseProp optional {?inverseProp " +
            labelProperty +
            ' ?inversePropLabel    {filter( langMatches( lang(?inversePropLabel), "en" ))} ' +
            "  }" +
            "  } " +
            "} LIMIT 10000";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["propDomain", "propRange", "domain", "range", "subProp", "inverseProp"]);

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
            _result.results.bindings = Sparql_generic.setBindingsOptionalProperties(_result.results.bindings, ["prop", "superProp"]);

            return callback(null, _result.results.bindings);
        });
    };

    self.getAllTriples = function (sourceLabel, role, ids, options, callback) {
        //   if (!role) return callback("no role sepecified");
        //   if (!ids) return callback("no uris sepecified");
        if (!options) {
            options = {};
        }

        var fromStr = "";
        if (options.source) {
            fromStr = Sparql_common.getFromStr(options.source);
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
                    " WHERE { ?subject ?predicate ?object.";
                if (role && ids) {
                    query += Sparql_common.setFilter(role, sliceIds);
                }
                if (options.removeBlankNodesObjects) {
                    query += " FILTER (!isBlank(?object)) ";
                }

                query += "}LIMIT 10000";

                var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
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
            }
        );
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
                    }
                );
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, prefixesStr + str);
            }
        );
    };

    self.schema = {
        getOwlChildrenClasses: function (callback) {
            var query =
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "SELECT *  from <http://data.total.com/resource/one-model/rdfsOwlSimplified/> WHERE {\n" +
                "  ?sub rdf:type rdfs:Class .\n" +
                "} LIMIT 500";

            var url = OwlSchema.currentSourceSchema.sparql_url;
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Blender.currentSource }, function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback(null, result.results.bindings);
            });
        },

        getObjectProperties: function (classId, callback) {
            var query =
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "SELECT *  from <http://data.total.com/resource/one-model/rdfsOwlSimplified/> WHERE {\n" +
                "  ?sub rdf:type rdf:Property .\n" +
                "} LIMIT 500";

            var url = OwlSchema.currentSourceSchema.sparql_url;
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Blender.currentSource }, function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback(null, result.results.bindings);
            });
        },
    };

    return self;
})();
