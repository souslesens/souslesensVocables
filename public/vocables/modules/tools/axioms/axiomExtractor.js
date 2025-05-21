import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Lineage_selection from "../lineage/lineage_selection.js";

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
                " FILTER (?cardinalityType in (owl:maxCardinality,owl:minCardinality,owl:cardinality ))} " +
                " filter (?constraintType in (owl:someValuesFrom, owl:allValuesFrom,owl:hasValue,owl:onClass))  } ";
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }

                var restrictions = [];

                result.forEach(function (item) {
                    restrictions.push({ s: item.subject, p: item.prop, o: item.object, type: "Restriction" });
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
                    if (err) {
                        return callback ? callback(err) : alert(err);
                    }

                    self.basicAxioms[source] = basicAxioms;
                    return callback ? callback(null, basicAxioms) : "done";
                },
            );
        });
    };

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
                            },
                        });
                    }
                    if (axiom.p == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                        if (axiom.o.indexOf("http") < 0) {
                            classesWithAxioms.push({
                                class: axiom.s,
                                label: label,
                                data: {
                                    id: axiom.s,
                                    label: label,
                                },
                            });
                        }
                    }
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
                return callback ? callback(err) : alert(err);
            }
            self.basicAxioms[source] = basicAxioms;
            var classURI = "https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess";
            var axioms = self.getClassAxioms(source, classURI, function (err, visjsData) {
                if (err) {
                    return alert(err);
                }
                self.drawGraphCanvas("graphDiv", visjsData);
            });
        });
    };

    self.getClassAxioms = function (source, classUri, callback) {
        var sourceBasicAxioms = self.basicAxioms[source];
        if (!sourceBasicAxioms) {
            return alert("source axioms not loaded");
        }
        var rootNode = sourceBasicAxioms[classUri];
        if (!rootNode) {
            return alert("classUri not found in axioms " + classUri);
        }

        var visjsData = { nodes: [], edges: [] };
        var distinctNodes = {};

        function recurse(subject, level) {
            var children = sourceBasicAxioms[subject];

            if (!children || !Array.isArray(children)) {
                return;
            }
            children.forEach(function (child) {
                var skipo = false;
                var propLabel = "";
                var nodeLabel = "";
                var nodeSize = 12;
                var shape = "dot";
                if (child.type && child.type == "Restriction") {
                    nodeSize = 1;
                    shape = "text";
                    nodeLabel = child.pLabel || Sparql_common.getLabelFromURI(child.p);
                } else {
                    nodeLabel = child.sLabel || Sparql_common.getLabelFromURI(child.s);
                }
                if (!distinctNodes[child.s]) {
                    distinctNodes[child.s] = 1;
                    visjsData.nodes.push({
                        id: child.s,
                        label: nodeLabel,
                        shape: shape,
                        level: level,
                        size: nodeSize,
                        data: {
                            id: child.s,
                            label: nodeLabel,
                            source: source,
                        },
                    });
                }

                var propLabel = "";

                if (true || child.o.startsWith("http")) {
                    propLabel = child.pLabel || Sparql_common.getLabelFromURI(child.p);
                }
                visjsData.edges.push({
                    from: subject,
                    to: child.o,
                    label: propLabel,
                    arrows: "to",
                });

                if (child.o.startsWith("http")) {
                    //stop on classes and properties
                    if (!distinctNodes[child.o]) {
                        distinctNodes[child.o] = 1;
                        var label = child.oLabel || Sparql_common.getLabelFromURI(child.o);
                        visjsData.nodes.push({
                            id: child.o,
                            label: label,
                            shape: "dot",
                            size: nodeSize,
                            level: level + 1,
                            data: {
                                id: child.s,
                                label: label,
                                source: source,
                            },
                        });
                    }
                } else {
                    recurse(child.o, level + 1);
                }
            });
        }

        recurse(classUri, 1);

        self.removeBlankNodes(visjsData);

        callback(null, visjsData);

        // Lineage_whiteboard.drawNewGraph(visjsData)
    };

    self.removeBlankNodes = function (visjData) {
        var nodesMap = [];
        var edgesFromMap = {};
        var edgesToMap = {};

        visjData.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        visjData.edges.forEach(function (edge) {
            if (!edgesFromMap[edge.from]) {
                edgesFromMap[edge.from] = [];
            }
            edgesFromMap[edge.from].push(edge);
        });

        function shiftBackRecurse(edge, shift) {
            if (edgesFromMap[edge.to]) {
                edgesFromMap[edge.to].forEach(function (edge2) {
                    if (!nodesMap[edge2.to] || nodesMap[edge2.to].shifted) {
                        // on ne shifte qu'une fois
                        return;
                    }
                    nodesMap[edge2.to].level -= shift;
                    nodesMap[edge2.to].shifted = true;
                    shiftBackRecurse(edge2, shift);
                });
            }
        }

        var symbolsMap = {
            unionOf: {
                symbol: "⨆",
                color: "#70ac47",
            },
            intersectionOf: {
                symbol: "⊓",
                color: "#70ac47",
            },
            complementOf: {
                symbol: "┓",
                color: "#70ac47",
            },
            inverseOf: {
                symbol: "^",
                color: "#70ac47",
            },
            members: {
                symbol: "⊑ ┓",
                color: "#70ac47",
            },
        };

        var nodesToDelete = [];
        visjData.edges.forEach(function (edge) {
            if (edge.label == "intersectionOf" || edge.label == "unionOf" || edge.label == "disjointWith") {
                var obj = symbolsMap[edge.label];
                // on skippe les noeuds de disjonction
                nodesMap[edge.from].label = obj.symbol;
                nodesMap[edge.from].shape = "circle";
                nodesMap[edge.from].font = { color: "white", bold: true };
                nodesMap[edge.from].color = obj.color;

                nodesToDelete.push(edge.to);
                visjData.edges.forEach(function (edge2) {
                    if (edge2.from == edge.to) {
                        edge2.from = edge.from;
                        shiftBackRecurse(edge2, 1);
                    }
                });
            }
            if (edge.label == "first") {
                edge.label = "";
            }
            if (edge.label == "rest") {
                edge.label = "";
                // on skippe les boeuds rest puis first

                visjData.edges.forEach(function (edge2) {
                    if (edge2.from == edge.to) {
                        nodesToDelete.push(edge.to);
                        shiftBackRecurse(edge2, 1);
                    }
                    if (edge2.from == edge.to) {
                        edge2.from = edge.from;
                    }
                });
            }
        });

        var nodesToKeep = [];
        visjData.nodes.forEach(function (node) {
            if (nodesToDelete.indexOf(node.id) < 0) {
                nodesToKeep.push(node);
            }
        });
        visjData.nodes = nodesToKeep;
    };

    self.layoutHierarchical = {
        direction: "LR",
        sortMethod: "hubsize",
        shakeTowards: "roots",
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true,
        treeSpacing: 200,
        nodeSpacing: 100,
        levelSeparation: 300,
    };
    self.physicsHierarchical = {
        enabled: false,
        hierarchicalRepulsion: {
            centralGravity: 0.3,
            nodeDistance: 200,
        },
    };
    self.drawGraphCanvas = function (graphDiv, visjsData, callback) {
        self.graphOptions = {
            keepNodePositionOnDrag: true,
            physics: self.physicsHierarchical,

            visjsOptions: {
                edges: {
                    smooth: true,
                },
            },

            layoutHierarchical: self.layoutHierarchical,
            onclickFn: function (node) {
                if (!node.data) {
                    return;
                }
                NodeInfosWidget.showNodeInfos(node.data.source, node, "mainDialogDiv", { resetVisited: 1 });
            },
            //  onRightClickFn: Lineage_whiteboard.graphActions.showGraphPopupMenu,
            //  onHoverNodeFn: Lineage_selection.selectNodesOnHover,
        };

        self.visjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.visjsGraph.draw(function () {
            if (callback) {
                return callback();
            }
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

    return self;
})();

export default AxiomExtractor;
window.AxiomExtractor = AxiomExtractor;
