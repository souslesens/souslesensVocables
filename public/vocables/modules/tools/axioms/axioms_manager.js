import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import elasticSearchProxy from "../../search/elasticSearchProxy.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";

/**
 * one graph for each axiom , uri=[Source graphUri]/  »concepts »/[classUri.lastpart]/[axiomType]/[id]/
 *
 *
 * @type {{}}
 */
var Axioms_manager = (function () {
    var self = {};
    const conceptStr = "concept";

    self.saveAxiom = function (source, axiomType, nodeUri, triples, callback) {
        var sourceGraphUri = Config.sources[source].graphUri;
        if (!sourceGraphUri) {
            return alert(" no graphUri for source " + source);
        }
        if (!sourceGraphUri.endsWith("/") && !sourceGraphUri.endsWith("#")) {
            sourceGraphUri += "/";
        }
        var classIdentifier = "";
        var p = nodeUri.lastIndexOf("#");
        if (p < 0) {
            p = nodeUri.lastIndexOf("/");
        }
        if (p == nodeUri.length - 1) {
            p = nodeUri.substring(0, p).lastIndexOf("/");
        }
        classIdentifier = nodeUri.substring(p + 1);

        var axiomId = common.getRandomHexaId(5);
        var axiomGraphUri = sourceGraphUri + conceptStr + "/" + classIdentifier + "/" + axiomType + "/" + axiomId;

        Sparql_generic.insertTriples(null, triples, { graphUri: axiomGraphUri }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    };

    self.loadAxiomsSubgraphsMap = function (sourceLabel, callback) {
        if (sourceLabel) {
            sourceLabel = Axiom_editor.currentSource;
        }
        if (!sourceLabel) {
            return alert("no source selected");
        }

        var sourceGraphUri = Config.sources[sourceLabel].graphUri;
        if (!sourceGraphUri) {
            return alert(" no graphUri for source " + sourceLabel);
        }
        var subGraphsMap = {};

        var graphUriRoot = sourceGraphUri;
        if (!graphUriRoot.endsWith("/") && !graphUriRoot.endsWith("#")) {
            graphUriRoot += "/";
        }

        var sourceAxiomsMap = {};
        async.series(
            [
                // get all subGraphs
                function (callbackSeries) {
                    Sparql_OWL.getGraphsWithSameClasses(sourceLabel, function (err, result) {
                        result.forEach(function (item) {
                            if (item.g.value.startsWith(graphUriRoot + conceptStr)) {
                                subGraphsMap[item.g.value] = [];
                            }
                        });
                        callbackSeries();
                    });
                },
                // get each axioms content   from its subGraph
                function (callbackSeries) {
                    async.eachSeries(
                        Object.keys(subGraphsMap),
                        function (subGraph, callbackEach) {
                            Sparql_OWL.getTriples(null, { graphUri: subGraph }, function (err, result) {
                                result.forEach(function (item) {
                                    subGraphsMap[subGraph].push(item);
                                });
                                callbackEach();
                            });
                        },
                        function (err) {
                            return callbackSeries();
                        }
                    );
                },
                function (callbackSeries) {
                    for (var subGraphUri in subGraphsMap) {
                        var triples = [];
                        subGraphsMap[subGraphUri].forEach(function (item) {
                            triples.push({
                                subject: item.s.value,
                                predicate: item.p.value,
                                object: item.o.value,
                            });
                        });

                        var array = subGraphUri.replace(graphUriRoot, "").split("/");
                        var className = array[1];

                        var axiomType = array[2];
                        var axiomId = array[3];
                        if (!sourceAxiomsMap[className]) {
                            sourceAxiomsMap[className] = {};
                        }
                        if (!sourceAxiomsMap[className][axiomType]) {
                            sourceAxiomsMap[className][axiomType] = [];
                        }
                        sourceAxiomsMap[className][axiomType].push({ id: axiomId, triples: triples, graphUri: subGraphUri });
                    }

                    return callbackSeries();
                },
            ],
            function (err) {
                return callback(err, sourceAxiomsMap);
            }
        );
    };

    self.getManchesterAxiomsFromTriples = function (source, triples, callback) {
        var rawManchesterStr = "";

        var axiomText = "";
        var axiomtype = "";
        async.series(
            [
                function (callbackSeries) {
                    const params = new URLSearchParams({
                        ontologyGraphUri: Config.sources[source].graphUri,
                        axiomTriples: JSON.stringify(triples),
                    });
                    Axiom_editor.message("generating manchester syntax ");
                    $.ajax({
                        type: "GET",
                        url: Config.apiUrl + "/jowl/axiomTriples2manchester?" + params.toString(),
                        dataType: "json",

                        success: function (data, _textStatus, _jqXHR) {
                            if (data.result && data.result.indexOf("Error") > -1) {
                                return callbackSeries(data.result);
                            }
                            rawManchesterStr = data.result;
                            callbackSeries();
                        },
                        error(err) {
                            callbackSeries(err.responseText);
                        },
                    });
                },

                //parse rawManchesterSyntax
                function (callbackSeries) {
                    var lines = rawManchesterStr.split("\n");
                    var recording = false;

                    lines.forEach(function (line, index) {
                        if (line.trim() == "") return;
                        if (line.startsWith("Class") || line.startsWith("ObjectProperty")) {
                            return;
                        }
                        if (line.indexOf("SubClassOf") > -1) {
                            axiomtype = lines[index - 1];
                            recording = true;
                        }
                        if (line.indexOf("]") > -1) {
                            recording = false;
                        }

                        if (recording) {
                            axiomText += line + "\n";
                        }
                    });

                    var x = axiomText;

                    var regex = /<([^>]+)>/g;
                    var array = [];
                    var urisMap = {};

                    while ((array = regex.exec(axiomText)) !== null) {
                        if (array.length == 2) {
                            urisMap[array[0]] = Axiom_editor.allResourcesMap[array[1]];
                        }
                    }
                    for (var uri in urisMap) {
                        var resource = urisMap[uri];
                        if(resource) {
                            var cssClass;
                            if (resource.resourceType == "Class") {
                                cssClass = "axiom_Class";
                            } else {
                                cssClass = "axiom_Property";
                            }
                            axiomText = axiomText.replace(
                                uri,
                                "<span class='" +
                                cssClass +
                                "' " +
                                // "onclick=Axiom_editorUI.showNodeInfos('"+uri+"')" +
                                ">" +
                                resource.label +
                                "</span>"
                            );
                        }
                    }

                    axiomText = "<div class='axiom_keyword'>" + axiomText + "</div>";

                    callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    alert(err);
                }
                Axiom_editor.message("");
                if (callback) {
                    return callback(null, axiomText);
                }
            }
        );
    };

    self.generateTriples = function (callback) {
        var content = Axiom_editor.getAxiomContent();
        var sourceGraph = Config.sources[Axiom_editor.currentSource].graphUri;
        if (!sourceGraph) {
            return alert("no graph Uri");
        }

        var triples;
        async.series(
            [
                function (callbackSeries) {
                    Axiom_editor.message("checking axiom syntax");
                    Axiom_editor.checkSyntax(function (err, result) {
                        return callbackSeries(err);
                    });
                },

                function (callbackSeries) {
                    const params = new URLSearchParams({
                        graphUri: sourceGraph,
                        manchesterContent: content,
                        classUri: Axiom_editor.currentNode.id,
                        axiomType: Axiom_editor.axiomType,
                        saveTriples: false,
                        checkConsistency: true,
                    });
                    Axiom_editor.message("generating axioms triples");
                    $.ajax({
                        type: "GET",
                        url: Config.apiUrl + "/jowl/manchesterAxiom2triples?" + params.toString(),
                        dataType: "json",

                        success: function (data, _textStatus, _jqXHR) {
                            if (data.result && data.result.indexOf("Error") > -1) {
                                return callbackSeries(data.result);
                            }
                            triples = data;
                            callbackSeries();
                            //  callback(null, data);
                        },
                        error(err) {
                            callbackSeries(err.responseText);
                        },
                    });
                },
                function (callbackSeries) {
                    callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    alert(err);
                }
                Axiom_editor.message("");
                if (callback) {
                    return callback(null, triples);
                }
            }
        );
    };

    self.mergeAxiomsToSeparateGraphs = function (sourceLabel) {
        if (!sourceLabel) sourceLabel = Axiom_editor.currentSource;

        var triples = [];
        async.series(
            [
                function (callbackSeries) {
                    var query =
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                        "SELECT distinct ?o2 ?p2 ?o3 from <https://spec.industrialontologies.org/ontology/202401/core/Core/> WHERE {\n" +
                        "  \n" +
                        "     ?o3 ^(<http://www.w3.org/2002/07/owl#complementOf>|<http://www.w3.org/2002/07/owl#hasKey>|<http://www.w3.org/2002/07/owl#unionOf>|<http://www.w3.org/2002/07/owl#intersectionOf>|<http://www.w3.org/2002/07/owl#oneOf>|<http://www.w3.org/2000/01/rdf-schema#subClassOf>|<http://www.w3.org/2002/07/owl#Restriction>|<http://www.w3.org/2002/07/owl#onProperty>|<http://www.w3.org/2002/07/owl#someValuesFrom>|<http://www.w3.org/2002/07/owl#allValuesFrom>|<http://www.w3.org/2002/07/owl#hasValue>|<http://www.w3.org/2002/07/owl#minCardinality>|<http://www.w3.org/2002/07/owl#maxCardinality>|<http://www.w3.org/2002/07/owl#cardinality>|<http://www.w3.org/2002/07/owl#maxQualifiedCardinality>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>|rdf:type) ?o2.\n" +
                        "  ?o2 ?p2 ?o3\n" +
                        "  \n" +
                        "{ select * where{\n" +
                        "\n" +
                        "  <https://spec.industrialontologies.org/ontology/core/Core/MeasurementInformationContentEntity> ?p ?o . \n" +
                        "  filter (isblank(?o))\n" +
                        "  filter ( ?p in (<http://www.w3.org/2002/07/owl#disjointWith>,<http://www.w3.org/2002/07/owl#disjointUnionOf>,<http://www.w3.org/2002/07/owl#equivalentClass>,rdfs:subClassOf))\n" +
                        "  \n" +
                        " ?o (<http://www.w3.org/2002/07/owl#complementOf>|<http://www.w3.org/2002/07/owl#hasKey>|<http://www.w3.org/2002/07/owl#unionOf>|<http://www.w3.org/2002/07/owl#intersectionOf>|<http://www.w3.org/2002/07/owl#oneOf>|<http://www.w3.org/2000/01/rdf-schema#subClassOf>|<http://www.w3.org/2002/07/owl#Restriction>|<http://www.w3.org/2002/07/owl#onProperty>|<http://www.w3.org/2002/07/owl#someValuesFrom>|<http://www.w3.org/2002/07/owl#allValuesFrom>|<http://www.w3.org/2002/07/owl#hasValue>|<http://www.w3.org/2002/07/owl#minCardinality>|<http://www.w3.org/2002/07/owl#maxCardinality>|<http://www.w3.org/2002/07/owl#cardinality>|<http://www.w3.org/2002/07/owl#maxQualifiedCardinality>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>)+ ?o2.\n" +
                        "  \n" +
                        "    }}\n" +
                        "\n" +
                        "} LIMIT 1000";

                    var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        triples = result.results.bindings;
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var query =
                        "\n" +
                        "\n" +
                        "\n" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                        " with <https://spec.industrialontologies.org/ontology/202401/core/Core/> \n" +
                        "insert  {graph  <https://spec.industrialontologies.org/ontology/202401/core/Core/concept/MeasurementInformationContentEntity/subClassOf/TEST> {?o2 ?p2 ?o3}}\n" +
                        "\n" +
                        "WHERE {\n" +
                        "  \n" +
                        "     ?o3 ^(<http://www.w3.org/2002/07/owl#complementOf>|<http://www.w3.org/2002/07/owl#hasKey>|<http://www.w3.org/2002/07/owl#unionOf>|<http://www.w3.org/2002/07/owl#intersectionOf>|<http://www.w3.org/2002/07/owl#oneOf>|<http://www.w3.org/2000/01/rdf-schema#subClassOf>|<http://www.w3.org/2002/07/owl#Restriction>|<http://www.w3.org/2002/07/owl#onProperty>|<http://www.w3.org/2002/07/owl#someValuesFrom>|<http://www.w3.org/2002/07/owl#allValuesFrom>|<http://www.w3.org/2002/07/owl#hasValue>|<http://www.w3.org/2002/07/owl#minCardinality>|<http://www.w3.org/2002/07/owl#maxCardinality>|<http://www.w3.org/2002/07/owl#cardinality>|<http://www.w3.org/2002/07/owl#maxQualifiedCardinality>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>|rdf:type) ?o2.\n" +
                        "  ?o2 ?p2 ?o3\n" +
                        "  \n" +
                        "{ select distinct * where{\n" +
                        "\n" +
                        "  <https://spec.industrialontologies.org/ontology/core/Core/MeasurementInformationContentEntity> ?p ?o . \n" +
                        "  filter (isblank(?o))\n" +
                        "  filter ( ?p in (<http://www.w3.org/2002/07/owl#disjointWith>,<http://www.w3.org/2002/07/owl#disjointUnionOf>,<http://www.w3.org/2002/07/owl#equivalentClass>,rdfs:subClassOf))\n" +
                        "  \n" +
                        " ?o (<http://www.w3.org/2002/07/owl#complementOf>|<http://www.w3.org/2002/07/owl#hasKey>|<http://www.w3.org/2002/07/owl#unionOf>|<http://www.w3.org/2002/07/owl#intersectionOf>|<http://www.w3.org/2002/07/owl#oneOf>|<http://www.w3.org/2000/01/rdf-schema#subClassOf>|<http://www.w3.org/2002/07/owl#Restriction>|<http://www.w3.org/2002/07/owl#onProperty>|<http://www.w3.org/2002/07/owl#someValuesFrom>|<http://www.w3.org/2002/07/owl#allValuesFrom>|<http://www.w3.org/2002/07/owl#hasValue>|<http://www.w3.org/2002/07/owl#minCardinality>|<http://www.w3.org/2002/07/owl#maxCardinality>|<http://www.w3.org/2002/07/owl#cardinality>|<http://www.w3.org/2002/07/owl#maxQualifiedCardinality>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>|<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>)+ ?o2.\n" +
                        "  \n" +
                        "    }}\n" +
                        "\n" +
                        "} \n" +
                        "\n" +
                        "\n";
                    triples.forEach(function (item) {
                        // item.?o2 ?p2 ?o3
                    });
                },
            ],
            function (err) {}
        );
    };

    self.getClassAxioms = function (sourceLabel, classUri, options, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;
        if (!graphUri) return callback("no graphUri found");
        var payload = {
            graphUri: graphUri,
            classUri: classUri,
        };
        if (options.axiomType) {
            payload.axiomType = 1;
        }
        if (options.getManchesterExpression) {
            payload.getManchesterExpression = 1;
        }
        if (options.getTriples) {
            payload.getTriples = 1;
        }

        const params = new URLSearchParams(payload);
        Axiom_editor.message("getting Class axioms");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/classAxioms?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (data.result && data.result.indexOf("Error") > -1) {
                    return callback(data.result);
                }
                callback(null, data);
                //  callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };

    self.listClassesWithAxioms = function (sourceLabel, callback) {
        if (!sourceLabel) sourceLabel = Lineage_sources.activeSource;
        var graphUri = Config.sources[sourceLabel].graphUri;
        if (!graphUri) return callback("no graphUri found");
        var payload = {
            graphName: graphUri,
        };

        const params = new URLSearchParams(payload);
        Axiom_editor.message("getting Class axioms");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/listClassesWithAxioms?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (data.result && data.result.indexOf("Error") > -1) {
                    return callback(data.result);
                }
                callback(null, data);
                //  callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };

    return self;
})();

export default Axioms_manager;
window.Axiom_manager = Axioms_manager;
