import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Lineage_selection from "../lineage/lineage_selection.js";
import sparql_common from "../../sparqlProxies/sparql_common.js";

var AxiomExtractor = (function () {
    var self = {};
    self.basicAxioms = {};
    self.prefixes = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";

    self.getFromStr = function (source) {
        return Sparql_common.getFromStr(source);
    };

    var extractFns = [
        function getSubClasses(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s rdfs:subClassOf ?o  bind( rdfs:subClassOf as ?p) }";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
        function getEquivalentClasses(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s owl:equivalentClass ?o  bind( owl:equivalentClass as ?p) }";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
        function getRestrictions(source, callback) {
            var query =
                self.prefixes +
                "SELECT distinct *  " +
                self.getFromStr(source) +
                "\n" +
                "WHERE { ?subject rdf:type owl:Restriction." +
                "  ?subject owl:onProperty ?prop .\n" +
                "   ?subject ?constraintType ?object." +
                " ?object rdf:type ?objectType." +
                "optional {?subject ?cardinalityType ?cardinalityValue " +
                " FILTER (?cardinalityType in (owl:maxCardinality,owl:minCardinality,owl:cardinality,owl:qualifiedCardinality ))} " +
                " filter (?constraintType in (owl:someValuesFrom, owl:allValuesFrom,owl:hasValue,owl:onClass)) " +
                "" +
                " } ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }

                var restrictions = [];

                result.forEach(function (item) {
                    restrictions.push({
                        s: item.subject,
                        p: item.prop,
                        o: item.object,
                        type: "Restriction",
                        cardinalityType: item.cardinalityType,
                        cardinalityValue: item.cardinalityValue,
                        constraintType: item.constraintType,
                    });
                });
                return callback(null, restrictions);
            });
        },
        function getIntesections(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s owl:intersectionOf  ?o bind( owl:intersectionOf as ?p) } ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
        function getUnions(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s owl:unionOf  ?o bind( owl:unionOf as ?p)} ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
        function getUnions(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s owl:unionOf  ?o bind( owl:unionOf as ?p)} ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
        function getInverses(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s  owl:inverseOf  ?o bind( owl:inverseOf as ?p)} ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },

        function getDisjoints(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s  owl:disjointWith  ?o bind( owl:disjointWith as ?p)} ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },

        function getComplements(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s  owl:complementOf  ?o bind( owl:complementOf as ?p)} ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },

        function getFirsts(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s rdf:first  ?o bind( rdf:first as ?p)}";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
        function getRests(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" + "WHERE { ?s rdf:rest  ?o filter (?o !=rdf:nil) bind( rdf:rest as ?p) }";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
    ];

    self.getBasicAxioms = function (source, callback) {
        if (self.basicAxioms[source]) {
            return callback(null, self.basicAxioms[source]);
        }

        UI.message("loading axioms of source " + source);

        var basicAxioms = {};
        var labelsMap = {};
        Sparql_OWL.getLabelsMap(source, null, function (err, labelsMap) {
            if (err) {
                return callback(err);
            }

            async.eachSeries(
                extractFns,
                function (fn, callbackEach) {
                    fn(source, function (err, result) {
                        if (err) {
                            return callbackEach(err);
                        }
                        result.forEach(function (item) {
                            if (labelsMap[item.s]) {
                                item.sLabel = labelsMap[item.s];
                            }
                            if (labelsMap[item.p]) {
                                item.pLabel = labelsMap[item.p];
                            }
                            if (labelsMap[item.o]) {
                                item.oLabel = labelsMap[item.o];
                            }
                            if (!basicAxioms[item.s]) {
                                basicAxioms[item.s] = [];
                            }
                            basicAxioms[item.s].push(item);
                        });

                        callbackEach();
                    });
                },
                function (err) {
                    UI.message("", true);
                    if (err) {
                        return callback ? callback(err) : MainController.errorAlert(err);
                    }

                    self.basicAxioms[source] = basicAxioms;
                    return callback ? callback(null, basicAxioms) : "done";
                },
            );
        });
    };

    /**
     *
     * after inserting axiomstriples into tripleStore update basicAxioms map
     *
     * @param triples
     */
    self.updateBasicAxioms = function (triples) {};

    self.listClassesWithAxioms = function (sourceLabel, callback) {
        AxiomExtractor.getBasicAxioms(sourceLabel, function (err, basicAxioms) {
            var classesWithAxioms = [];
            if (err) {
                return callback(err);
            }
            var axioms;
            for (var uri in basicAxioms) {
                var axioms = basicAxioms[uri];
                axioms.forEach(function (axiom) {
                    var label = axiom.sLabel || Sparql_common.getLabelFromURI(axiom.s);
                    if (axiom.p == "http://www.w3.org/2002/07/owl#equivalentClass") {
                        classesWithAxioms.push({
                            class: axiom.s,
                            label: label,
                            data: {
                                id: axiom.s,
                                label: label,
                                axiomType: "equivalentClass",
                            },
                        });
                    }
                    /*   if (axiom.p == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                        if (axiom.o.indexOf("http") < 0) {
                            classesWithAxioms.push({
                                class: axiom.s,
                                label: label,
                                data: {
                                    id: axiom.s,
                                    label: label,
                                    axiomType:"subClassOf"
                                },
                            });
                        }
                    }*/
                });
            }
            return callback(null, classesWithAxioms);
        });
    };

    self.test = function (source, callback) {
        if (!source) {
            source = "IOF-CORE-202401";
            //  source="VaccineOntology"
        }

        self.getBasicAxioms(source, function (err, basicAxioms) {
            if (err) {
                return callback ? callback(err) : MainController.errorAlert(err);
            }
            self.basicAxioms[source] = basicAxioms;
            var classURI = "https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess";
            var axioms = self.getClassAxioms(source, classURI, function (err, visjsData) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.drawGraphCanvas("graphDiv", visjsData);
            });
        });
    };

    self.execQuery = function (query, callback) {
        var url = Config.sparql_server.url;
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings.forEach(function (item) {
                for (var key in item) {
                    item[key] = item[key].value;
                }
            });

            return callback(null, result.results.bindings);
        });
    };

    self.getClassAxiomsTriples = function (source, classUri, callback) {
        self.getBasicAxioms(source, function (err, sourceBasicAxioms) {
            if (!sourceBasicAxioms) {
                return alert("source axioms not loaded");
            }
            var rootNode = sourceBasicAxioms[classUri];
            if (!rootNode) {
                return alert("classUri not found in axioms " + classUri);
            }

            var triples = [];
            var distinctNodes = {};

            function recurse(subject, level) {
                var children = sourceBasicAxioms[subject];

                if (!children || !Array.isArray(children)) {
                    return;
                }
                children.forEach(function (child) {
                    if (child.type == "Restriction") {
                        triples.push({
                            subject: child.s,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "http://www.w3.org/2002/07/owl#Restriction",
                        });

                        triples.push({
                            subject: child.s,
                            predicate: child.constraintType,
                            object: child.o,
                        });
                        if (child.cardinalityType) {
                            triples.push({
                                subject: child.s,
                                predicate: child.cardinalityType,
                                object: child.cardinalityValue,
                            });
                        }

                        triples.push({
                            subject: child.o,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "http://www.w3.org/2002/07/owl#Class",
                        });

                        triples.push({
                            subject: child.s,
                            predicate: "http://www.w3.org/2002/07/owl#onProperty",
                            object: child.p,
                        });

                        triples.push({
                            subject: child.o,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "http://www.w3.org/2002/07/owl#Class",
                        });

                        if (!distinctNodes[child.p]) {
                            distinctNodes[child.p] = 1;
                            triples.push({
                                subject: child.p,
                                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                object: "http://www.w3.org/2002/07/owl#ObjectProperty",
                            });
                        }
                        if (!distinctNodes[child.o] && child.o.indexOf("http") < 0) {
                            recurse(child.o, level + 1);
                        }
                    } else {
                        triples.push({
                            subject: child.s,
                            predicate: child.p,
                            object: child.o,
                        });

                        if (!distinctNodes[child.p] && child.p.indexOf("http") == 0) {
                            distinctNodes[child.p] = 1;
                            triples.push({
                                subject: child.p,
                                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                object: "http://www.w3.org/2002/07/owl#ObjectProperty",
                            });
                        }

                        if (!distinctNodes[child.o]) {
                            // on ne passe pas deux fois par le meme noeud
                            distinctNodes[child.o] = 1;
                            if (child.o.indexOf("http") == 0) {
                                //on recurse pas les classes de l'ontologie
                            } else {
                                // on ne recurse que les blanknodes
                                recurse(child.o, level + 1);
                            }
                            if (child.o.indexOf("http") == 0) {
                                triples.push({
                                    subject: child.o,
                                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    object: "http://www.w3.org/2002/07/owl#Class",
                                });
                            }
                            if (child.s.indexOf("http") == 0) {
                                triples.push({
                                    subject: child.s,
                                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    object: "http://www.w3.org/2002/07/owl#Class",
                                });
                            }
                        }
                    }
                });
            }

            recurse(classUri);
            callback(null, triples);
        });
    };

    self.addTriplesToBasicAxioms = function (source, triples, callback) {
        var uris = {};
        triples.forEach(function (item) {
            if (uris[item.subject]) {
                uris[item.subject] = 1;
            }
            if (uris[item.predicate]) {
                uris[item.predicate] = 1;
            }
            if (uris[item.object]) {
                uris[item.object] = 1;
            }
        });
        var options = {
            filter: Sparql_common.setFilter("id", Object.keys(uris)),
        };
        if (Object.keys(uris).length == 0) {
            options.noExecute = true;
        }

        Sparql_OWL.getLabelsMap(source, options, function (err, labelsMap) {
            if (err) return callback(err);
            triples.forEach(function (triple) {
                if (!self.basicAxioms[triple.subject]) {
                    self.basicAxioms[triple.subject] = [];
                }
                self.basicAxioms[triple.subject].push({
                    s: triple.subject,
                    p: triple.predicate,
                    o: triple.object,
                    sLabel: labelsMap[triple.subject] || sparql_common.getLabelFromURI(triple.subject),
                    pLabel: labelsMap[triple.predicate] || sparql_common.getLabelFromURI(triple.subject),
                    oLabel: labelsMap[triple.object] || sparql_common.getLabelFromURI(triple.subject),
                });
            });
            callback();
        });
    };

    return self;
})();

export default AxiomExtractor;
window.AxiomExtractor = AxiomExtractor;
