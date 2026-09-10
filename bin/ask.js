import async from "async";
import request from "request";
import fs from 'fs'
import ConfigManager from "./configManager.js";
import path from 'path'


import httpProxy from "./httpProxy.js";
import {sourceModel} from "../model/sources.js";


var Ask = {

    whoAmI: function (source, term, callback) {
        var sourceInfos = {}
        var termUrisMap = {}
        async.series([


            // search terms and topClasses
            function (callbackSeries) {
                var indexName = source.toLowerCase()
                Ask.executeElasticQuery("/_search", term, indexName, function (err, result) {
                    if (err) {
                        return callbackSeries(err)
                    } else {
                        var hits = result.body.hits.hits
                        hits.forEach(function (hit) {

                            termUrisMap[hit._source.id] = {
                                id: hit._source.id,
                                label: hit._source.label,
                                ancestors: hit._source.parents,
                                predicates: [],
                                relations: [],
                            }
                        })
                        return callbackSeries()
                    }
                });

            },
            function (callbackSeries) {
                Ask.getSourceInfos(source, function (err, result) {

                    if (err) {
                        return callbackSeries(err)
                    }
                    sourceInfos = result
                    callbackSeries()
                })

            },
//get Properties
            function (callbackSeries) {
                var filter = "filter (?sub in ("
                Object.keys(termUrisMap).forEach(function (item, index) {
                    if (index > 0) {
                        filter += ","
                    }
                    filter += "<" + item + ">"


                })
                filter += ") )"
                var fromStr = " FROM   <" + sourceInfos.graphUri + "> "
                // var imports=sourceInfos.imports

                /*
                                sourceInfos.importGraphUris.forEach(function(item){
                                    var fromStr = " FROM  NAMED  <"+item+"> "
                                })

                                */


                //    var fromStr = " FROM  NAMED  <http://datalenergies.total.com/resource/tsf/iso-14224-iof/all/>  FROM  NAMED  <http://purl.obolibrary.org/obo/bfo.owl>  FROM  NAMED  <https://spec.industrialontologies.org/ontology/202502/core/Core/> "
                var query = "  PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                    " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    " select distinct * " +
                    fromStr +
                    // " where {graph ?g {" +
                    " where { {" +
                    "?sub ?prop ?value." +
                    "    Optional {?value rdfs:label ?valueLabel} " +
                    filter +
                    " Optional {?prop rdfs:label ?propLabel}   FILTER (!exists{?value rdf:type owl:Restriction} ) } " +

                    "}LIMIT 10000"

                Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {

                    if (err) {
                        return callbackSeries(err)
                    }
                    sparqlResult.results.bindings.forEach(function (item) {
                        termUrisMap[item.sub.value].predicates.push(
                            {
                                predicate: item.prop.value,
                                predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                object: item.value.value,
                                objectLabel: item.valueLabel ? item.valueLabel.value : item.value.value
                            }
                        )

                    })

                    return callbackSeries()
                })


            }
            // get restrictions
            , function (callbackSeries) {

                var termUris = Object.keys(termUrisMap)
                Ask.getRestrictionsSparql(source, termUris, null, function (err, query) {

                    Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {

                        if (err) {
                            return callbackSeries(err)
                        }
                        sparqlResult.results.bindings.forEach(function (item) {
                            termUrisMap[item.class1.value].relations.push(
                                {
                                    predicate: item.prop.value,
                                    predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                    object: item.superClass2.value,
                                    objectLabel: item.superClass2Label ? item.superClass2Label.value : item.superClass2.value
                                }
                            )

                        })
                        return callbackSeries()

                    })
                })

            },


        ], function (err) {

            return callback(err, termUrisMap)
        })
    },
    /**
     *  get a simplified ontology model with nodes topConcepts and their semantic relations
     * @param source
     * @param callback :
     */
    getKnowledgeModelGraph: function (source, callback) {

        Ask.getTopConceptsGraphData(source, function (err, result) {
            if (err) {
                return callback(err)
            }

            var graph = {nodes: [], edges: []}
            var nodesMap = {}
            result.nodes.forEach(function (node) {
                graph.nodes.push(node.data)
                nodesMap[node.id] = node.data

            })
            result.edges.forEach(function (edge) {
                var newEdge = edge.data
                newEdge.from = edge.from
                newEdge.to = edge.to
                graph.edges.push(newEdge)

            })

            return callback(null, graph)

        })
    },
    /**

     /**
     * build a path between  classes that are linked together including inherited from the class hierrachy
     * @param source
     * @param term1
     * @param term2
     * @param callback
     */


    getTwoTermsShortestPath: function (source, term1, term2, callback) {


        var indexName = source.toLowerCase(source)

        var term1Uris = [];

        var term2Uris = [];
        var topConceptsGraphData = {}
        var topConcepts1 = []
        var topConcepts2 = []
        var shortestPath = []

        async.series([


                // search terms and topClasses
                function (callbackSeries) {
                    Ask.executeElasticQuery("/_search", term1, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                        } else {
                            var hits = result.body.hits.hits
                            hits.forEach(function (hit) {
                                term1Uris.push(hit._source)
                            })
                            return callbackSeries()
                        }
                    });

                },
                function (callbackSeries) {
                    Ask.executeElasticQuery("/_search", term2, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                        } else {
                            var hits = result.body.hits.hits
                            hits.forEach(function (hit) {
                                term2Uris.push(hit._source)
                            })
                            return callbackSeries()
                        }
                    });

                },
                // load the data model visjs
                function (callbackSeries) {
                    Ask.getTopConceptsGraphData(source, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                        }
                        topConceptsGraphData = result
                        callbackSeries()
                    })
                },

                //find path  betwwin topConcepts in visjsGraph
                function (callbackSeries) {
                    function getTopConcept(parents) {
                        var topUri = null;
                        parents.forEach(function (parent) {
                            topConceptsGraphData.nodes.forEach(function (node) {
                                if (!topUri && node.data.id == parent) {
                                    topUri = node.data.id
                                }
                            })
                        })
                        return topUri;
                    }


                    // top concpt is the parent that exists in visjsgraphModel

                    term1Uris.forEach(function (item) {
                        var topConcept = getTopConcept(item.parents)
                        if (topConcept && topConcepts1.indexOf(topConcept) < 0) {
                            topConcepts1.push(topConcept)
                        }
                    })
                    term2Uris.forEach(function (item) {
                        item.parents.push(item.id)
                        var topConcept = getTopConcept(item.parents)
                        if (topConcept && topConcepts2.indexOf(topConcept) < 0) {
                            topConcepts2.push(topConcept)
                        }
                    })
                    var x = topConcepts1;
                    var y = topConcepts2;

                    return callbackSeries()
                },


                // get shortest path between  terms and build a complete path between nodes
                function (callbackSeries) {
                    var start = topConcepts1[0]
                    var end = topConcepts2[0]

                    Ask.getShortestPath(topConceptsGraphData, start, end, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                        }
                        shortestPath = result
                        return callbackSeries()


                    })
                }


            ],

            function (err) {

                return callback(null, shortestPath)
            }
        )

    }

    ,
    /**
     * get the classes that are linked to term 1 in subClasses of term 2 if not null including relations of supeClasses of class1
     * @param source
     * @param term1
     * @param term2
     * @param callback
     */

    getLinkedClasses: function (source, term1, term2, callback) {
        var term1Uris = []
        var term2Uris = []
        var resultMap = {}
        var indexName = source.toLowerCase()
        var sourceInfos = null
        var query = ""


        async.series([

                function (callbackSeries) {

                    Ask.getSourceInfos(source, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                        } else {
                            sourceInfos = result
                        }
                    })
                },


                // search terms and topClasses
                function (callbackSeries) {
                    Ask.executeElasticQuery("/_search", term1, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                        } else {
                            var hits = result.body.hits.hits
                            hits.forEach(function (hit) {
                                term1Uris.push(hit._source)
                            })
                            return callbackSeries()
                        }
                    });

                },
                function (callbackSeries) {

                    if (!term2) {
                        return callbackSeries()
                    }
                    Ask.executeElasticQuery("/_search", term2, indexName, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                        } else {
                            var hits = result.body.hits.hits
                            hits.forEach(function (hit) {
                                term2Uris.push(hit._source)
                            })
                            return callbackSeries()
                        }
                    });

                },
                //build query
                function (callbackSeries) {

                    Ask.getRestrictionsSparql(source, term1Uris, term2Uris, function (err, query) {

                        Ask.executeSparqlQuery(source, query, function (err, sparqlResult) {

                            if (err) {
                                return callbackSeries(err)
                            }

                            sparqlResult.results.bindings.forEach(function (item) {
                                if (!resultMap[item.class1.value]) {
                                    resultMap[item.class1.value] = []
                                }
                                resultMap[item.class1.value].push(
                                    {
                                        predicate: item.prop.value,
                                        predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                        object: item.class2.value,
                                        objectLabel: item.class2Label ? item.class2Label.value : item.class2.value
                                    }
                                )

                            })


                            // on essaie la relation  inverse
                            if (true || result.length == 0 || term2 == null) {
                                query = query.replace("filter (?class2 in", "xx")
                                query = query.replace("filter (?class1 in", "filter (?class2 in")
                                query = query.replace("xx", "filter(?class1 in")

                                Ask.executeSparqlQuery(source, query, function (err, result2) {

                                    sparqlResult.results.bindings.forEach(function (item) {
                                        if (!resultMap[item.class2.value]) {
                                            resultMap[item.class2.value] = []
                                        }
                                        resultMap[item.class2.value].push(
                                            {
                                                predicate: item.prop.value,
                                                predicateLabel: item.propLabel ? item.propLabel.value : item.prop.value,
                                                object: item.class1.value,
                                                objectLabel: item.class1Label ? item.class1Label.value : item.class1.value
                                            }
                                        )

                                    })

                                    return callbackSeries()

                                })

                            }
                            return callbackSeries()

                        })
                    })


                }


            ],

            function (err) {
                return callback(null, resultMap)
            })


    },


    /*******************************************************Helpers*********************************************************/


    getSourceInfos: function (source, callback) {
        async function getSourceInfos2(source) {
            var user = {login: "admin"}
            const sourceInfos = await sourceModel.getOneUserSource(user, source);
            /**   if(sourceInfos.imports){
             sourceInfos.importGraphUris=[]
             sourceInfos.imports.forEach(function(importSource){

             Ask.getSourceInfos(importSource, function(err, importSourceInfos){

             sourceInfos.importGraphUris.push(importSourceInfos.graphUri)
             })



             })

             }*/

            return sourceInfos;
        }

        try {

            getSourceInfos2(source).then(sourceInfos => {

                /*  if(sourceInfos.imports) {
                      sourceInfos.importGraphUris = []
                      sourceInfos.imports.forEach(function (importSource) {

                          getSourceInfos2(importSource).then(importSourceInfos => {

                              sourceInfos.importGraphUris.push(importSourceInfos.graphUri)
                          })


                      })
                  }*/

                callback(null, sourceInfos)
            });


        } catch (e) {
            callback(e)
        }

    },

    getRestrictionsSparql: function (source, term1Uris, term2Uris, callback) {

        Ask.getSourceInfos(source, function (err, sourceInfos) {

            if (err) {
                return callback(err)
            }
            var graphUri = sourceInfos.graphUri
            var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> prefix owl: <http://www.w3.org/2002/07/owl#> "
            query += "Select * from <" + graphUri + "> where {" +
                "  ?class1 rdfs:subClassOf{0,5} ?superClass1.\n" +
                "  ?superClass1 rdf:type owl:Class.\n" +
                "  ?superClass1 rdfs:subClassOf  ?restr. ?restr rdf:type owl:Restriction.\n" +
                "  ?restr owl:onProperty ?prop. ?restr owl:someValuesFrom|owl:allValuesFrom|owl:hasValue ?superClass2.\n" +
                "   { ?class1 rdfs:label ?class1Label}\n" +
                "   optional { ?prop rdfs:label ?propLabel}\n" +
                "     { ?superClass2 rdfs:label ?superClass2Label}"

            var filter = ""
            if (term1Uris) {
                filter += "filter (?class1 in ("
                term1Uris.forEach(function (item, index) {
                    if (index > 0) {
                        filter += ","
                    }
                    filter += "<" + (item.id || item) + ">"


                })
                filter += ") )"
            }
            if (term2Uris) {

                query += "  ?superClass2 ^rdfs:subClassOf{0,5} ?class2."
                filter += "filter (?class2 in ("
                term2Uris.forEach(function (item, index) {
                    if (index > 0) {
                        filter += ","
                    }
                    filter += "<" + (item.id || item) + ">"


                })
                filter += ") )"
            }

            query += filter + "} limit 10000"

            return callback(null, query);
        })
    },


    getTopConceptsGraphData: function (source, callback) {
        var myPath = path.resolve("data/graphs/" + source + "_whiteBoard.json")
        var str = "" + fs.readFileSync(myPath)
        var json = JSON.parse(str)
        return callback(null, json)


    }
    ,
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
            return callback(null, oldResult)
        }
        var oldResult = null
        try {

            var params = {
                "query": query,
                //  "useProxy": true,
            }
            var serverUrl = ConfigManager.config.sparql_server.url + "?format=json&query="
            var headers = {
                "Accept": "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };


            httpProxy.post(serverUrl, headers, params, function (err, result) {
                if (!oldResult) {
                    oldResult = result
                }

                return callback(null, result);
            });


        } catch (err) {

            return callback(err)

        }

    },
    /**
     * give the best format (concise) for llm
     *
     * @param sparqlResult
     * @return {*}
     */
    formatSparqlResults: function (sparqlResult) {


        return sparqlResult
    },

    executeElasticQuery: function (urlPath, term, indexName, callback) {

        var query = JSON.parse("{\"query\": {\"bool\":{\"must\":[{\"query_string\":{\"query\":\"" + term + "\"," +
            "\"fields\":[\"label\",\"skoslabels\",\"skoslabels\"],\"default_operator\":\"AND\"}}]}}\n}")
        var elasticUrl = "https://51.178.139.80:9200/";
        var url = elasticUrl + indexName + urlPath;
        var method = "POST";

        var options = {
            method: method,
            json: query,
            headers: {
                "content-type": "application/json",
            },
            url: url,
        };


        options.auth = {
            user: "elastic",
            password: "sls#209",
        };

        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
        request(options, function (error, response, body) {
            return callback(error, response, body);
        });


    }
    ,

    getShortestPath: function (visjsdata, start, end, callback) {
        var countIterations = 0;
        var tooManyIterations = false;
        var maxPaths = 20

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

        var graph = getGraphFromVisjsData(visjsdata)
        var paths = findAllPathsUndirected(graph, start, end);
        var edgesFromToMap = getEdgesFromToMap(visjsdata)

        var resultArray = []
        paths.forEach(function (path) {
            var lineStr = "";
            for (var i = 1; i < path.length; i++) {
                var edgesFrom = edgesFromToMap[path[i - 1]];
                if (edgesFrom) {
                    var edge = edgesFrom[path[i]];


                    resultArray.push([
                        {id: edge.fromNode.id, label: edge.fromNode.label},
                        {id: edge.data.propertyId, label: edge.data.propertyLabel},
                        {id: edge.toNode.id, label: edge.toNode.label},


                    ]);
                }
            }
        })
        return callback(null, resultArray)
    },


}

export default Ask


/**export async function getSourceInfos(source){
 var user={login : "admin"}
 const sourceInfo = await sourceModel.getOneUserSource(user, source);
 return sourceInfo[source];
 }**/


if (false) {
    Ask.whoAmI("ISO-14224-IOF", " failure mode", function (err, result) {

    })


    Ask.getKnowledgeModelGraph("ISO-14224-IOF", function (err, result) {
    })

    Ask.getTwoTermsShortestPath("ISO-14224-IOF", " failure mode", "centrifugal pump", function (err, result) {

    })
}




