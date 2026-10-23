import async from "async";
import request from "request";
import fs from "fs";
import ConfigManager from "./configManager.js";
import path from "path";

import httpProxy from "./httpProxy.js";
import { sourceModel } from "../model/sources.js";

var Ask = {
    getTermClassesInfos: function (user, source, term, callback) {
        var indexName = source.toLowerCase();
        Ask.executeElasticQuery("/_search", term, indexName, function (err, result) {
            if (err) {
                return callback(err);
            }
            var termUrisMap = {};
            var hits = (result.body.hits && result.body.hits.hits) || [];
            hits.forEach(function (hit) {
                termUrisMap[hit._source.id] = {
                    id: hit._source.id,
                    label: hit._source.label,
                    ancestors: hit._source.parents,
                    predicates: [],
                    relations: [],
                };
            });
            Ask.fillClassesInfos(user, source, termUrisMap, callback);
        });
    },
    getUriClassesInfos: function (user, source, uri, callback) {
        // characters that cannot sit inside a SPARQL IRIREF, so the uri cannot break out of <...>
        if (!Ask.isValidIri(uri)) {
            return callback("uri is not a valid IRI: " + uri);
        }
        var uriInfos = { id: uri, label: null, ancestors: [], predicates: [], relations: [] };
        Ask.getSourceInfos(user, source, function (err, sourceInfos) {
            if (err) {
                return callback(err);
            }
            if (!Ask.isValidIri(sourceInfos.graphUri)) {
                return callback("source graph URI is not a valid IRI: " + sourceInfos.graphUri);
            }
            var query =
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                "select distinct ?label ?ancestor from <" +
                sourceInfos.graphUri +
                "> where { { <" +
                uri +
                "> rdfs:label ?label } UNION { <" +
                uri +
                "> rdfs:subClassOf+ ?ancestor filter (!isBlank(?ancestor)) } } limit 10000";
            Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {
                if (err) {
                    return callback(err);
                }
                var labels = [];
                sparqlResult.results.bindings.forEach(function (binding) {
                    if (binding.label && labels.indexOf(binding.label.value) < 0) {
                        labels.push(binding.label.value);
                    }
                    if (binding.ancestor && uriInfos.ancestors.indexOf(binding.ancestor.value) < 0) {
                        uriInfos.ancestors.push(binding.ancestor.value);
                    }
                });
                // one label per language, sorted so the pick does not follow the endpoint row order
                labels.sort();
                uriInfos.label = labels.length > 0 ? labels[0] : null;
                var uriInfosMap = {};
                uriInfosMap[uri] = uriInfos;
                Ask.fillClassesInfos(user, source, uriInfosMap, callback);
            });
        });
    },
    fillClassesInfos: function (user, source, termUrisMap, callback) {
        var sourceInfos = {};
        async.series(
            [
                function (callbackSeries) {
                    Ask.getSourceInfos(user, source, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        if (!Ask.isValidIri(result.graphUri)) {
                            return callbackSeries("source graph URI is not a valid IRI: " + result.graphUri);
                        }
                        sourceInfos = result;
                        callbackSeries();
                    });
                },
                //get Properties
                function (callbackSeries) {
                    var filter = "filter (?sub in (";
                    Object.keys(termUrisMap).forEach(function (item, index) {
                        if (index > 0) {
                            filter += ",";
                        }
                        filter += "<" + item + ">";
                    });
                    filter += ") )";

                    var query = Ask.getPropertiesSparql(sourceInfos.graphUri, filter);

                    Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sparqlResult.results.bindings.forEach(function (item) {
                            termUrisMap[item.sub.value].predicates.push({
                                predicate: item.prop.value,
                                predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                object: item.value.value,
                                objectLabel: item.valueLabel ? item.valueLabel.value : item.value.value,
                            });
                        });

                        return callbackSeries();
                    });
                },
                // get restrictions
                function (callbackSeries) {
                    var termUris = Object.keys(termUrisMap);
                    Ask.getRestrictionsSparql(user, source, termUris, null, function (err, query) {
                        Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            sparqlResult.results.bindings.forEach(function (item) {
                                termUrisMap[item.class1.value].relations.push({
                                    predicate: item.prop.value,
                                    predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                    object: item.class2.value,
                                    objectLabel: item.class2Label ? item.class2Label.value : item.class2.value,
                                });
                            });
                            return callbackSeries();
                        });
                    });
                },
            ],
            function (err) {
                return callback(err, termUrisMap);
            },
        );
    },
    /**
     *  get a simplified ontology model with nodes topConcepts and their semantic relations
     * @param source
     * @param callback :
     */
    getKnowledgeModelGraph: function (user, source, callback) {
        var graph = { nodes: [], edges: [] };
        var nodesMap = {};
        var sourceInfos = null;
        async.series(
            [
                function (callbackSeries) {
                    Ask.getTopConceptsGraphData(source, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        result.nodes.forEach(function (node) {
                            graph.nodes.push(node.data);
                            nodesMap[node.id] = node.data;
                        });
                        result.edges.forEach(function (edge) {
                            var newEdge = edge.data;
                            newEdge.from = edge.from;
                            newEdge.to = edge.to;
                            graph.edges.push(newEdge);
                        });

                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    Ask.getSourceInfos(user, source, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        } else if (!Ask.isValidIri(result.graphUri)) {
                            return callbackSeries("source graph URI is not a valid IRI: " + result.graphUri);
                        } else {
                            sourceInfos = result;
                            return callbackSeries();
                        }
                    });
                },

                //add node Descriptions
                function (callbackSeries) {
                    var filter = "filter (?sub in (";
                    Object.keys(nodesMap).forEach(function (item, index) {
                        if (index > 0) {
                            filter += ",";
                        }
                        filter += "<" + item + ">";
                    });
                    filter += ") )";
                    filter += "FILTER(?prop in (<http://purl.org/dc/terms/description>,<http://purl.org/dc/terms/description>,<http://www.w3.org/2004/02/skos/core#definition>,rdfs:isDefinedBy))";

                    var query = Ask.getPropertiesSparql(sourceInfos.graphUri, filter);

                    Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        var definitionsMap = {};
                        sparqlResult.results.bindings.forEach(function (item) {
                            definitionsMap[item.sub.value] = item.value.value;
                        });
                        graph.nodes.forEach(function (node) {
                            node.description = definitionsMap[node.id];
                        });
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                return callback(err, graph);
            },
        );
    },
    /**
     * the ontologies a user may read that describe themselves, as {source, graphUri, imports, description}.
     * A source whose graph carries no description is left out rather than returned empty.
     * @param userSources : map sourceName -> source config, as returned by sourceModel.getUserSources
     * @param callback : (err, summaries)
     */
    getOntologySummary: function (userSources, callback) {
        var sourceNamesByGraphUri = {};
        Object.keys(userSources).forEach(function (sourceName) {
            var source = userSources[sourceName];
            var endpointUrl = (source.sparql_server && source.sparql_server.url) || "_default";
            if (!source.graphUri || !Ask.isValidIri(source.graphUri) || endpointUrl != "_default") {
                return;
            }
            if (!sourceNamesByGraphUri[source.graphUri]) {
                sourceNamesByGraphUri[source.graphUri] = [];
            }
            sourceNamesByGraphUri[source.graphUri].push(sourceName);
        });

        var graphUris = Object.keys(sourceNamesByGraphUri);
        if (graphUris.length == 0) {
            return callback(null, []);
        }

        Ask.executeSparqlQuery(null, Ask.getOntologyDescriptionsSparql(graphUris), function (err, sparqlResult) {
            if (err) {
                return callback(err);
            }

            var annotationsByGraphUri = {};
            sparqlResult.results.bindings.forEach(function (binding) {
                var graphUri = binding.graph.value;
                if (!annotationsByGraphUri[graphUri]) {
                    annotationsByGraphUri[graphUri] = [];
                }
                annotationsByGraphUri[graphUri].push({
                    ontology: binding.ontology.value,
                    predicate: binding.predicate.value,
                    value: binding.value.value,
                    language: binding.value["xml:lang"] || "",
                });
            });

            var summaries = [];
            Object.keys(annotationsByGraphUri).forEach(function (graphUri) {
                var graphAnnotations = annotationsByGraphUri[graphUri];

                // a graph describes several nodes, its imports included
                var graphNodeAnnotations = graphAnnotations.filter(function (annotation) {
                    return Ask.withoutTrailingSlash(annotation.ontology) == Ask.withoutTrailingSlash(graphUri);
                });
                var describingAnnotations = graphNodeAnnotations.length > 0 ? graphNodeAnnotations : graphAnnotations;
                var description = Ask.getBestAnnotation(describingAnnotations, Ask.ontologyDescriptionPredicates);

                sourceNamesByGraphUri[graphUri].forEach(function (sourceName) {
                    summaries.push({
                        source: sourceName,
                        graphUri: graphUri,
                        imports: userSources[sourceName].imports || [],
                        description: description,
                    });
                });
            });

            return callback(null, summaries);
        });
    },
    /**
     * build a path between  classes that are linked together including inherited from the class hierrachy
     * @param source
     * @param term1
     * @param term2
     * @param callback
     */

    getTwoTermsShortestPath: function (source, term1, term2, callback) {
        var indexName = source.toLowerCase(source);

        var term1Uris = [];

        var term2Uris = [];
        var topConceptsGraphData = {};
        var topConcepts1 = [];
        var topConcepts2 = [];
        var shortestPath = [];
        var termsShortestPaths = [];

        async.series(
            [
                // search terms and topClasses
                function (callbackSeries) {
                    Ask.executeElasticQuery("/_search", term1, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        } else {
                            var hits = (result.body.hits && result.body.hits.hits) || [];
                            hits.forEach(function (hit) {
                                term1Uris.push(hit._source);
                            });
                            return callbackSeries();
                        }
                    });
                },
                function (callbackSeries) {
                    Ask.executeElasticQuery("/_search", term2, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        } else {
                            var hits = (result.body.hits && result.body.hits.hits) || [];
                            hits.forEach(function (hit) {
                                term2Uris.push(hit._source);
                            });
                            return callbackSeries();
                        }
                    });
                },
                // load the data model visjs
                function (callbackSeries) {
                    Ask.getTopConceptsGraphData(source, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        topConceptsGraphData = result;
                        callbackSeries();
                    });
                },

                //find path  betwwin topConcepts in visjsGraph
                function (callbackSeries) {
                    function getTopConcept(parents) {
                        var topUri = null;
                        parents.forEach(function (parent) {
                            topConceptsGraphData.nodes.forEach(function (node) {
                                if (!topUri && node.data.id == parent) {
                                    topUri = node.data.id;
                                }
                            });
                        });
                        return topUri;
                    }

                    // top concpt is the parent that exists in visjsgraphModel

                    term1Uris.forEach(function (item) {
                        var topConcept = getTopConcept(item.parents || []);
                        if (topConcept && topConcepts1.indexOf(topConcept) < 0) {
                            topConcepts1.push(topConcept);
                        }
                    });
                    term2Uris.forEach(function (item) {
                        var parents = item.parents || [];
                        parents.push(item.id);
                        var topConcept = getTopConcept(parents);
                        if (topConcept && topConcepts2.indexOf(topConcept) < 0) {
                            topConcepts2.push(topConcept);
                        }
                    });

                    return callbackSeries();
                },

                // get shortest path between  terms and build a complete path between nodes
                function (callbackSeries) {
                    topConcepts1.forEach(function (start) {
                        topConcepts2.forEach(function (end) {
                            Ask.getShortestPath(topConceptsGraphData, start, end, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                shortestPath = [];
                                if (term1Uris[start]) {
                                    shortestPath.push({ id: term1Uris[start].id, label: term1Uris[start].label });
                                    shortestPath.push({ id: "subClassOf", label: "subClassOf" });
                                    shortestPath.push(shortestPath[0]);
                                }
                                shortestPath = shortestPath.concat(result);

                                if (term1Uris[end]) {
                                    shortestPath.push(shortestPath[shortestPath.length - 1]);
                                    shortestPath.push({ id: term1Uris[end].id, label: term1Uris[end].label });
                                    shortestPath.push({ id: "superClassOf", label: "superClassOf" });
                                }

                                /*   var parents= term1Uris[start].parents
                                             parents.forEach(function(parent){*


                                             })*/

                                termsShortestPaths.push(shortestPath);
                            });
                        });
                    });
                    callbackSeries();
                },
            ],

            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, termsShortestPaths);
            },
        );
    },

    /**
     * get the classes that are linked to term 1 in subClasses of term 2 if not null including relations of supeClasses of class1
     * @param source
     * @param term1
     * @param term2
     * @param callback
     */

    getLinkedClasses: function (user, source, uri1, uri2, callback) {
        var resultMap = {};
        var indexName = source.toLowerCase();
        var sourceInfos = null;
        var query = "";

        var uris2 = uri2 ? [uri2] : null;

        Ask.getRestrictionsSparql(user, source, [uri1], uris2, function (err, query) {
            if (err) {
                return callback(err);
            }
            Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {
                if (err) {
                    return callback(err);
                }

                sparqlResult.results.bindings.forEach(function (item) {
                    if (!resultMap[item.class1.value]) {
                        resultMap[item.class1.value] = [];
                    }
                    resultMap[item.class1.value].push({
                        subjectLabel: item.class1Label ? item.class1Label.value : item.class1.value,
                        predicate: item.prop.value,
                        predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                        object: item.class2 ? item.class2.value : item.superClass2.value,
                        objectLabel: item.class2Label ? item.class2Label.value : item.superClass2Label ? item.superClass2Label.value : item.superClass2.value,
                    });
                });

                // on essaie la relation  inverse
                if (uri2 != null) {
                    Ask.getRestrictionsSparql(user, source, [uri2], [uri1], function (err, queryInverse) {
                        if (err) {
                            return callback(err);
                        }
                        /*  query = query.replace("filter (?class2 in", "xx")
                                          query = query.replace("filter (?class1 in", "filter (?class2 in")
                                          query = query.replace("xx", "filter(?class1 in")*/

                        Ask.executeSparqlQuery(source, queryInverse, function (err, sparqlResult2) {
                            if (err) {
                                return callback(err);
                            }

                            sparqlResult2.results.bindings.forEach(function (item) {
                                if (!resultMap[item.class1.value]) {
                                    resultMap[item.class1.value] = [];
                                }
                                resultMap[item.class1.value].push({
                                    subjectLabel: item.class1Label ? item.class1Label.value : item.class1.value,
                                    predicate: item.prop.value,
                                    inverseRelation: true,
                                    predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                    object: item.class2 ? item.class2.value : item.superClass2.value,
                                    objectLabel: item.class2Label ? item.class2Label.value : item.superClass2Label ? item.superClass2Label.value : item.superClass2.value,
                                });
                            });

                            return callback(null, resultMap);
                        });
                    });
                } else {
                    return callback(null, resultMap);
                }
            });
        });
    },

    getTermsLinkedClasses: function (user, source, term1, term2, callback) {
        var term1Uris = [];
        var term2Uris = [];
        var resultMap = {};
        var indexName = source.toLowerCase();
        var sourceInfos = null;
        var query = "";

        async.series(
            [
                function (callbackSeries) {
                    Ask.getSourceInfos(user, source, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        } else if (!Ask.isValidIri(result.graphUri)) {
                            return callbackSeries("source graph URI is not a valid IRI: " + result.graphUri);
                        } else {
                            sourceInfos = result;
                            return callbackSeries();
                        }
                    });
                },

                // search terms and topClasses
                function (callbackSeries) {
                    Ask.executeElasticQuery("/_search", term1, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        } else {
                            var hits = (result.body.hits && result.body.hits.hits) || [];
                            hits.forEach(function (hit) {
                                term1Uris.push(hit._source);
                            });
                            return callbackSeries();
                        }
                    });
                },
                function (callbackSeries) {
                    if (!term2) {
                        return callbackSeries();
                    }
                    Ask.executeElasticQuery("/_search", term2, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        } else {
                            var hits = (result.body.hits && result.body.hits.hits) || [];
                            hits.forEach(function (hit) {
                                term2Uris.push(hit._source);
                            });
                            return callbackSeries();
                        }
                    });
                },
                //build query
                function (callbackSeries) {
                    Ask.getRestrictionsSparql(user, source, term1Uris, term2Uris, function (err, query) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {
                            if (err) {
                                return callbackSeries(err);
                            }

                            sparqlResult.results.bindings.forEach(function (item) {
                                if (!resultMap[item.class1.value]) {
                                    resultMap[item.class1.value] = [];
                                }
                                resultMap[item.class1.value].push({
                                    subjectLabel: item.class1Label ? item.class1Label.value : item.class1.value,
                                    predicate: item.prop.value,
                                    predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                    object: item.class2 ? item.class2.value : item.superClass2.value,
                                    objectLabel: item.class2Label ? item.class2Label.value : item.superClass2Label ? item.superClass2Label.value : item.superClass2.value,
                                });
                            });

                            // on essaie la relation  inverse
                            if (term2Uris.length > 0) {
                                Ask.getRestrictionsSparql(user, source, term2Uris, term1Uris, function (err, queryInverse) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    /*  query = query.replace("filter (?class2 in", "xx")
                                          query = query.replace("filter (?class1 in", "filter (?class2 in")
                                          query = query.replace("xx", "filter(?class1 in")*/

                                    Ask.executeSparqlQuery(source, queryInverse, function (err, result2) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }
                                        result2.results.bindings.forEach(function (item) {
                                            if (!resultMap[item.class1.value]) {
                                                resultMap[item.class1.value] = [];
                                            }
                                            resultMap[item.class1.value].push({
                                                subjectLabel: item.class1Label ? item.class1Label.value : item.class1.value,
                                                predicate: item.prop.value,
                                                inverseRelation: true,
                                                predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                                object: item.class2 ? item.class2.value : item.superClass2.value,
                                                objectLabel: item.class2Label ? item.class2Label.value : item.superClass2Label ? item.superClass2Label.value : item.superClass2.value,
                                            });
                                        });

                                        return callbackSeries();
                                    });
                                });
                            } else {
                                return callbackSeries();
                            }
                        });
                    });
                },
            ],

            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, resultMap);
            },
        );
    },

    /*******************************************************Helpers*********************************************************/

    // Read in this order : the first predicate an ontology carries wins.
    ontologyDescriptionPredicates: [
        "http://purl.org/dc/terms/description",
        "http://purl.org/dc/elements/1.1/description",
        "http://purl.org/dc/terms/abstract",
        "http://www.w3.org/2000/01/rdf-schema#comment",
        "http://www.w3.org/2004/02/skos/core#definition",
    ],

    /**
     * a graph URI ends with a slash, the ontology node inside it often not
     * @param uri
     * @return {string}
     */
    withoutTrailingSlash: function (uri) {
        var trailingSlashRegex = /\/$/;
        return uri.replace(trailingSlashRegex, "");
    },

    /**
     * whether a string can sit inside a SPARQL IRIREF <...> without breaking the query
     * @param uri
     * @return {boolean}
     */
    isValidIri: function (uri) {
        var iriForbiddenCharactersRegex = /[\s<>"{}|\\^`]/;
        return typeof uri === "string" && uri.length > 0 && !iriForbiddenCharactersRegex.test(uri);
    },

    /**
     * the descriptions the given graphs carry on the node describing themselves
     * @param graphUris
     * @return {string} sparql query returning ?graph ?ontology ?predicate ?value
     */
    getOntologyDescriptionsSparql: function (graphUris) {
        var graphTerms = graphUris.map(function (graphUri) {
            return "<" + graphUri + ">";
        });
        var graphValues = graphTerms.join(" ");

        // both spellings, the FILTER below keeps the one of the graph being read
        var graphNodeTerms = [];
        graphUris.forEach(function (graphUri) {
            graphNodeTerms.push("<" + graphUri + ">");
            var graphNodeUri = Ask.withoutTrailingSlash(graphUri);
            if (graphNodeUri != graphUri) {
                graphNodeTerms.push("<" + graphNodeUri + ">");
            }
        });
        var graphNodeValues = graphNodeTerms.join(" ");

        var predicateTerms = Ask.ontologyDescriptionPredicates.map(function (predicate) {
            return "<" + predicate + ">";
        });
        var predicateValues = predicateTerms.join(" ");

        return (
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
            " select distinct ?graph ?ontology ?predicate ?value where {" +
            " VALUES ?graph {" +
            graphValues +
            "}" +
            " graph ?graph {" +
            "  {" +
            "   ?ontology rdf:type ?ontologyType." +
            "   VALUES ?ontologyType {owl:Ontology skos:ConceptScheme}" +
            "  } UNION {" +
            // a node named like its graph describes the source whether it declares a type or not
            "   VALUES ?ontology {" +
            graphNodeValues +
            "}" +
            '   FILTER (REPLACE(STR(?ontology), "/$", "") = REPLACE(STR(?graph), "/$", ""))' +
            "  }" +
            "  ?ontology ?predicate ?value." +
            "  VALUES ?predicate {" +
            predicateValues +
            "}" +
            "  FILTER (isLiteral(?value))" +
            " } } LIMIT 10000"
        );
    },

    /**
     * the value of the first predicate of the priority list the annotations carry, in english when a
     * translation exists, else the lowest language tag rather than the endpoint row order
     * @param annotations : [{predicate, value, language}]
     * @param predicatesByPriority
     * @return {string|null}
     */
    getBestAnnotation: function (annotations, predicatesByPriority) {
        var englishLanguageRegex = /^en(-|$)/i;
        for (var priorityIndex = 0; priorityIndex < predicatesByPriority.length; priorityIndex++) {
            var predicate = predicatesByPriority[priorityIndex];
            var candidates = annotations.filter(function (annotation) {
                return annotation.predicate == predicate;
            });
            if (candidates.length == 0) {
                continue;
            }
            var englishCandidate = candidates.find(function (annotation) {
                return englishLanguageRegex.test(annotation.language || "");
            });
            if (englishCandidate) {
                return englishCandidate.value;
            }
            candidates.sort(function (leftAnnotation, rightAnnotation) {
                if (leftAnnotation.language != rightAnnotation.language) {
                    return leftAnnotation.language < rightAnnotation.language ? -1 : 1;
                }
                if (leftAnnotation.value == rightAnnotation.value) {
                    return 0;
                }
                return leftAnnotation.value < rightAnnotation.value ? -1 : 1;
            });
            return candidates[0].value;
        }
        return null;
    },

    getSourceInfos: function (user, source, callback) {
        sourceModel
            .getOneUserSource(user, source)
            .then(function (sourceInfos) {
                if (!sourceInfos) {
                    return callback("source not found or not allowed: " + source);
                }
                return callback(null, sourceInfos);
            })
            .catch(callback);
    },
    getPropertiesSparql: function (graphUri, filter) {
        var fromStr = " FROM   <" + graphUri + "> ";
        var query =
            "  PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct * " +
            fromStr +
            // " where {graph ?g {" +
            " where { {" +
            "?sub ?prop ?value." +
            "    Optional {?value rdfs:label ?valueLabel} " +
            filter +
            "FILTER (?prop !=rdfs:subClassOf)" +
            " Optional {?prop rdfs:label ?propLabel}   FILTER (!exists{?value rdf:type owl:Restriction} ) } " +
            "}LIMIT 10000";
        return query;
    },
    getRestrictionsSparql: function (user, source, term1Uris, term2Uris, callback) {
        Ask.getSourceInfos(user, source, function (err, sourceInfos) {
            if (err) {
                return callback(err);
            }
            if (!Ask.isValidIri(sourceInfos.graphUri)) {
                return callback("source graph URI is not a valid IRI: " + sourceInfos.graphUri);
            }
            var graphUri = sourceInfos.graphUri;
            var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> prefix owl: <http://www.w3.org/2002/07/owl#> ";
            /*  query+= "Select distinct * from <" + graphUri + "> where {" +
                " \n" +
                "  ?class1 rdfs:subClassOf  ?restr. ?restr rdf:type owl:Restriction.\n" +
                "  #  ?class1 rdfs:subClassOf* ?superClass1. ?superClass1 rdf:type owl:Class.\n" +
                "  ?restr owl:onProperty ?prop. ?restr owl:someValuesFrom|owl:allValuesFrom|owl:hasValue ?class2.\n" +
                "\n" +
                "   ?class1 rdfs:label ?class1Label." +
                "  \n" +
                " ?class1 rdfs:subClassOf* ?superClass1."+
                "  ?class2 rdfs:label ?class2Label."*/
            query +=
                "SELECT DISTINCT\n" +
                "    ?class1\n" +
                "    ?class1Label\n" +
                "    ?superClass1\n" +
                "    ?prop\n" +
                "    ?propLabel\n" +
                "    ?class2\n" +
                "    ?class2Label\n" +
                "from <" +
                graphUri +
                ">" +
                "WHERE {\n" +
                "\n" +
                " ?class1 rdfs:subClassOf* ?superClass1 .\n" +
                "    # Class1 elle-même + toutes ses superclasses\n" +
                "   \n" +
                "    # Restrictions définies directement sur une de ces classes\n" +
                "    ?superClass1 rdfs:subClassOf ?restr .\n" +
                "\n" +
                "    ?restr a owl:Restriction ;\n" +
                "           owl:onProperty ?prop .\n" +
                "\n" +
                "    ?restr (owl:someValuesFrom|owl:allValuesFrom|owl:hasValue) ?class2 .\n" +
                "\n" +
                "    OPTIONAL { ?class1 rdfs:label ?class1Label . }\n" +
                "    OPTIONAL { ?class2 rdfs:label ?class2Label . }\n" +
                "    OPTIONAL { ?prop rdfs:label ?propLabel . }\n";

            var filter = "";

            filter += " filter (?class1 in (";
            term1Uris.forEach(function (item, index) {
                if (index > 0) {
                    filter += ",";
                }
                filter += "<" + (item.id || item) + ">";
            });
            filter += ") )";

            if (term2Uris && term2Uris.length > 0) {
                filter += "?class2 rdfs:subClassOf* ?superClass2.";

                //cas uri
                if (("" + (term2Uris[0].id || term2Uris[0])).startsWith("http")) {
                    filter += " filter (?superClass2 in (";
                    term2Uris.forEach(function (item, index) {
                        if (index > 0) {
                            filter += ",";
                        }
                        filter += "<" + (item.id || item) + ">";
                    });
                    filter += ") )";
                } // case term
                else {
                    filter += '   ?class2 rdfs:label ?class2Label filter (regex(?class2Label,"' + term2Uris[0] + '","i"))';
                }
            }

            query += filter + "} limit 10000";

            return callback(null, query);
        });
    },
    getTopConceptsGraphData: function (source, callback) {
        var myPath = path.resolve("data/graphs/" + source + "_KGmodelGraph.json");
        try {
            return callback(null, JSON.parse(fs.readFileSync(myPath, "utf8")));
        } catch (err) {
            return callback(err);
        }
    },
    /**
     * To be implemented
     *
     *
     * @param source
     * @param query
     * @param callback
     */
    executeSparqlQuery: function (source, query, callback) {
        if (!query) {
            return callback("no SPARQL query to run");
        }
        try {
            var params = {
                query: query,
                //  "useProxy": true,
            };
            var serverUrl = ConfigManager.config.sparql_server.url + "?format=json&query=";
            var headers = {
                Accept: "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded",
            };
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };

            httpProxy.post(serverUrl, headers, params, function (err, result) {
                return callback(err, result);
            });
        } catch (err) {
            return callback(err);
        }
    },
    /**
     * give the best format (concise) for llm
     *
     * @param sparqlResult
     * @return {*}
     */
    formatSparqlResults: function (sparqlResult) {
        return sparqlResult;
    },
    executeElasticQuery: function (urlPath, term, indexName, callback) {
        var query = {
            query: {
                bool: {
                    must: [{ query_string: { query: term, fields: ["label", "skoslabels"], default_operator: "AND" } }],
                },
            },
        };
        var elasticConf = ConfigManager.config.ElasticSearch;
        var url = elasticConf.url + indexName + urlPath;
        var method = "POST";

        var options = {
            method: method,
            json: query,
            timeout: 30000,
            headers: {
                "content-type": "application/json",
            },
            url: url,
        };

        if (elasticConf.user) {
            options.auth = {
                user: elasticConf.user,
                password: elasticConf.password,
            };
        }
        if (elasticConf.skipSslVerify) {
            options.strictSSL = false;
        }

        request(options, function (error, response, body) {
            if (error) {
                return callback("" + error);
            }
            if (!response || response.statusCode != 200) {
                return callback("ElasticSearch returned " + (response ? response.statusCode : "no response") + " for index " + indexName);
            }
            return callback(null, response, body);
        });
    },
    getShortestPath: function (visjsdata, start, end, callback) {
        var countIterations = 0;
        var tooManyIterations = false;
        var maxPaths = 20;

        // var graph = self.getGraphFromVisjsData(visjsData, options.inverse);

        function getGraphFromVisjsData(visjsdata, inverse) {
            var graph = {};
            visjsdata.edges.forEach(function (edge) {
                if (!graph[edge.from]) {
                    graph[edge.from] = [];
                }
                graph[edge.from].push(edge.to);
                if (inverse) {
                    if (!graph[edge.to]) {
                        graph[edge.to] = [];
                    }
                    graph[edge.to].push(edge.from);
                }
            });
            return graph;
        }

        function getEdgesFromToMap(visjsData) {
            var nodesMap = {};
            var edgesFromToMap = {};
            visjsData.nodes.forEach(function (node) {
                nodesMap[node.id] = node;
            });
            visjsData.edges.forEach(function (edge) {
                edge.fromNode = nodesMap[edge.from];
                edge.toNode = nodesMap[edge.to];
                if (!edgesFromToMap[edge.from]) {
                    edgesFromToMap[edge.from] = {};
                }
                edgesFromToMap[edge.from][edge.to] = edge;

                if (!edgesFromToMap[edge.to]) {
                    edgesFromToMap[edge.to] = {};

                    edgesFromToMap[edge.to][edge.from] = edge;
                }
            });
            return edgesFromToMap;
        }

        function findAllPathsUndirected(graph, start, target) {
            let result = [];

            function dfs(node, path, visited) {
                path.push(node);
                visited.add(node);

                if (node === target) {
                    if (countIterations++ > maxPaths) {
                        return (tooManyIterations = true);
                    }
                    result.push([...path]); // found one path
                } else {
                    for (let neighbor of graph[node] || []) {
                        if (!visited.has(neighbor)) {
                            dfs(neighbor, path, visited);
                        }
                    }
                }

                path.pop();
                visited.delete(node); // backtrack for other paths
            }

            dfs(start, [], new Set());
            return result;
        }

        var graph = getGraphFromVisjsData(visjsdata);
        var paths = findAllPathsUndirected(graph, start, end);
        var edgesFromToMap = getEdgesFromToMap(visjsdata);

        var resultArray = [];
        paths.forEach(function (path) {
            var lineStr = "";
            for (var i = 1; i < path.length; i++) {
                var edgesFrom = edgesFromToMap[path[i - 1]];
                if (edgesFrom) {
                    var edge = edgesFrom[path[i]];

                    resultArray.push([
                        { id: edge.fromNode.id, label: edge.fromNode.label },
                        { id: edge.data.propertyId, label: edge.data.propertyLabel },
                        { id: edge.toNode.id, label: edge.toNode.label },
                    ]);
                }
            }
        });
        return callback(null, resultArray);
    },
};

export default Ask;

/**export async function getSourceInfos(source){
 var user={login : "admin"}
 const sourceInfo = await sourceModel.getOneUserSource(user, source);
 return sourceInfo[source];
 }**/

if (false) {
    Ask.whoAmI("ISO-14224-IOF", " failure mode", function (err, result) {});

    Ask.getKnowledgeModelGraph({ login: "admin" }, "ISO-14224-IOF", function (err, result) {});

    Ask.getTwoTermsShortestPath("ISO-14224-IOF", " failure mode", "centrifugal pump", function (err, result) {});
}
