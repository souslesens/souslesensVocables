import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Shacl from "./shacl.js";

var SubGraph = (function () {
    var self = {};

    self.getSubGraphResources = function (sourceLabel, baseClassId, options, callback) {
        if (!options) {
            options = {};
        }
        var nClasses = 1;
        var allRestrictions = {};
        var allClasses = {};
        var uniqueRestrictions = {};
        var allProperties = {};
        var filteredProperties = {};
        var level = 0;

        var filterPropStr = "";

        var fromStr = Sparql_common.getFromStr(sourceLabel, null, null, options);

        var currentClasses = [baseClassId];

        async.series(
            [
                function (callbackSeries) {
                    async.whilst(
                        function (callbackTest) {
                            level += 1;
                            return nClasses > 0;
                        },

                        function (callbackWhilst) {
                            var filter = Sparql_common.setFilter("s", currentClasses, null, { values: true });
                            var strFrom = Sparql_common.getFromStr(sourceLabel, null, null, options);
                            var query =
                                //  "PREFIX dexp: <http://totalenergies/resources/tsf/ontology/dexpi-process/specific/>\n" +
                                "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT distinct * " +
                                strFrom +
                                "WHERE {" +
                                "  ?s rdfs:subClassOf+ ?o. ?o rdf:type ?type " +
                                filter +
                                filterPropStr +
                                "optional { ?o owl:onProperty ?property. ?o owl:someValuesFrom|owl:onClass ?targetClass  optional { ?o ?cardinalityType  ?cardinalityValue. filter (?cardinalityType in (owl:minCardinality,owl:maxCardinality,owl:cardinality))}}\n" +
                                "  } limit 10000";
                            self.query(sourceLabel, query, function (err, result) {
                                if (err) {
                                    return alert(err);
                                }
                                currentClasses = [];
                                result.results.bindings.forEach(function (item) {
                                    if (!item.type) {
                                        return;
                                    }
                                    /*  console.log(
                                            Sparql_common.getLabelFromURI(item.s.value) +
                                                "-->" +
                                                Sparql_common.getLabelFromURI(item.o.value) +
                                                "--" +
                                                (item.property ? Sparql_common.getLabelFromURI(item.property.value) : "") +
                                                "--" +
                                                (item.targetClass ? Sparql_common.getLabelFromURI(item.targetClass.value) : "")
                                        );*/

                                    if (item.type.value.endsWith("Class")) {
                                        if (!allClasses[item.s.value]) {
                                            allClasses[item.s.value] = { ancestors: [], level: level };
                                            currentClasses.push(item.s.value);
                                        }
                                        if (!allClasses[item.o.value]) {
                                            currentClasses.push(item.o.value);
                                            allClasses[item.o.value] = { ancestors: [], level: level };
                                        }
                                        if (allClasses[item.s.value].ancestors.indexOf(item.o.value) < 0) {
                                            allClasses[item.s.value].ancestors.push(item.o.value);
                                        }
                                    } else if (item.type.value.endsWith("Restriction")) {
                                        if (!item.property) {
                                            return;
                                        }
                                        if (options.excludedproperties.indexOf(item.property.value) > -1) {
                                            return;
                                        }

                                        if (!allRestrictions[item.s.value]) {
                                            allRestrictions[item.s.value] = {};
                                        }

                                        var obj = {
                                            sourceClass: item.s.value,
                                            property: item.property ? item.property.value : null,
                                            targetClass: item.targetClass ? item.targetClass.value : null,
                                            cardinalityType: item.cardinalityType ? item.cardinalityType.value : null,
                                            cardinalityValue: item.cardinalityValue ? item.cardinalityValue.value : null,
                                        };
                                        if (!allProperties[item.property.value]) {
                                            allProperties[item.property.value] = 1;
                                        }

                                        if (item.targetClass) {
                                            if (!allClasses[item.targetClass.value]) {
                                                allClasses[item.targetClass.value] = { ancestors: [], level: level };
                                                currentClasses.push(item.targetClass.value);
                                            }
                                        }

                                        if (!allRestrictions[item.s.value][obj.property]) {
                                            allRestrictions[item.s.value][obj.property] = [];
                                        }
                                        if (!uniqueRestrictions[obj.property + obj.targetClass + obj.cardinalityType]) {
                                            uniqueRestrictions[obj.property + obj.targetClass + obj.cardinalityType] = 1;
                                            allRestrictions[item.s.value][obj.property].push(obj);
                                        }
                                    }
                                });

                                filterPropStr = Sparql_common.setFilter("property", Object.keys(allProperties)).replace(" in", " not in");

                                nClasses = currentClasses.length;
                                callbackWhilst();
                            });
                        },
                        function (err) {
                            callbackSeries();
                        },
                    );
                },

                function (callbackSeries) {
                    var uris = Object.keys(allClasses).concat(Object.keys(allRestrictions));
                    var filter = Sparql_common.setFilter("s", uris);

                    var query =
                        "PREFIX dexp: <http://totalenergies/resources/tsf/ontology/dexpi-process/specific/>\n" +
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT distinct *  FROM   <http://totalenergies/resources/tsf/ontology/dexpi-process/specific/>    FROM   <http://totalenergies/resources/tsf/ontology/dexpi-process/generic/>  WHERE {\n" +
                        "  ?s rdfs:label ?sLabel. " +
                        filter +
                        "} limit 10000";
                    self.query(sourceLabel, query, function (err, result) {
                        if (err) {
                            return alert(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            if (allClasses[item.s.value]) {
                                allClasses[item.s.value].label = item.sLabel.value;
                            }
                        });
                        return callbackSeries();
                    });
                },
            ],
            function (err) {
                return callback(err, { classes: allClasses, restrictions: allRestrictions });
            },
        );
    };

    self.rawTriplesToNodesMap = function (rawTriples) {
        var nodesMap = {};
        rawTriples.forEach(function (item) {
            if (!nodesMap[item.s.value]) {
                nodesMap[item.s.value] = {};
            }

            if (item.p.value.endsWith("type")) {
                var o = Sparql_common.getLabelFromURI(item.o.value);
                nodesMap[item.s.value].type = o;
            }

            if (item.p.value.endsWith("label")) {
                nodesMap[item.s.value].label = item.o.value;
            }
            if (item.p.value.endsWith("onProperty")) {
                nodesMap[item.s.value].property = item.o.value;
            }
            if (item.p.value.endsWith("onClass")) {
                nodesMap[item.s.value].range = item.o.value;
            }
            if (item.p.value.endsWith("someValuesFrom")) {
                nodesMap[item.s.value].range = item.o.value;
            }
            if (item.p.value.endsWith("ardinality")) {
                var p = Sparql_common.getLabelFromURI(item.p.value);
                nodesMap[item.s.value][p] = item.o.value;
            }
            if (item.p.value.endsWith("subClassOf")) {
                if (item.o.value.indexOf("http") < 0) {
                    if (!nodesMap[item.s.value].restrictions) {
                        nodesMap[item.s.value].restrictions = [];
                    }
                    nodesMap[item.s.value].restrictions.push(item.o.value);
                }
            }
        });
        return nodesMap;
    };

    /**
     * extract inerited restrictions  starting from a Class  and build triples that instantiate the generated graph
     *
     * @param sourceLabel
     * @param classUri
     * @param options
     * @param callback
     */
    self.instantiateSubGraphTriples = function (sourceLabel, classUri, options, callback) {
        var grahUri = Config.sources[sourceLabel].graphUri;
        grahUri += grahUri.endsWith("/") ? "" : "/";
        var triples = [];
        var uniqueResources = {};
        var classesDictionary = {};

        function getResourceUri() {
            return grahUri + common.getRandomHexaId(10);
        }

        function getCardinalityRange(restrictionTarget) {
            var str = restrictionTarget.cardinalityType;
            if (!str) {
                return { min: 1, max: 1 };
            }
            str = restrictionTarget.cardinalityValue.substring(0, 1);
            var value = parseInt(str);

            // to be refined later
            if (restrictionTarget.cardinalityType.endsWith("ardinality")) {
                return { min: value, max: value };
            }
        }

        function registerIndividual(classUri) {
            if (uniqueResources[classUri]) {
                return uniqueResources[classUri];
            }
            var uri = classUri + "#" + common.getRandomHexaId(10);
            uniqueResources[classUri] = uri;
            triples.push({
                subject: uri,
                predicate: "rdf:type",
                object: classUri,
            });
            if (classesDictionary[classUri]) {
                var label = classesDictionary[classUri].label;
                if (label) {
                    triples.push({
                        subject: uri,
                        predicate: "rdfs:label",
                        object: ":" + label,
                    });
                }
            }
            return uri;
        }

        self.getSubGraphResources(sourceLabel, classUri, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            classesDictionary = result.classes;
            var subClassesMap = {};
            for (var classUri in result.classes) {
                var ancestors = result.classes[classUri].ancestors;
                ancestors.forEach(function (ancestor) {
                    if (!subClassesMap[ancestor]) {
                        subClassesMap[ancestor] = [];
                    }
                    subClassesMap[ancestor].push(classUri);
                });
            }

            for (var classUri in result.restrictions) {
                var subjectUri = registerIndividual(classUri);

                var propUris = result.restrictions[classUri];
                for (var propUri in propUris) {
                    var predicateUri = propUri;
                    result.restrictions[classUri][propUri].forEach(function (item) {
                        var range = getCardinalityRange(item);
                        ///  for (var i = range.min; i <= range.max; i++) {

                        for (var i = 1; i <= 1; i++) {
                            var objectUri = registerIndividual(item.targetClass);
                            if (!subClassesMap[item.targetClass]) {
                                // if a subClass is not present in the graph
                                triples.push({
                                    subject: subjectUri,
                                    predicate: predicateUri,
                                    object: objectUri,
                                });
                            }
                        }
                    });
                }
            }

            return callback(null, { triples: triples, classes: result.classes });
        });
    };

    self.getSubGraphShaclTriples = function (sourceLabel, _classUri, options, callback) {
        if (!options) {
            options = {};
        }

        self.classUri = _classUri;

        Shacl.initSourceLabelPrefixes(sourceLabel);

        self.getSubGraphResources(sourceLabel, self.classUri, options, function (err, result) {
            //  var resources = result.classes.concat(result.restrictions);
            var classesMap = result.classes;
            var restrictionsMap = result.restrictions;
            // return;

            var usedClasses = {};
            usedClasses[self.classUri] = 1;
            for (var classUri2 in restrictionsMap) {
                for (var property in restrictionsMap[classUri2]) {
                    restrictionsMap[classUri2][property].forEach(function (item) {
                        if (item.targetClass) {
                            usedClasses[item.targetClass] = 1;
                        }
                    });
                }
            }

            var allSahcls = "";
            for (var classUri2 in usedClasses) {
                var item = classesMap[classUri2];

                var classRestrictions = restrictionsMap[classUri2];
                var shaclProperties = [];
                if (classRestrictions) {
                    for (var property in classRestrictions) {
                        classRestrictions[property].forEach(function (restriction) {
                            if (!restriction.property || !restriction.targetClass) {
                                return;
                            }

                            var propStr = Shacl.uriToPrefixedUri(restriction.property);
                            var rangeStr = Shacl.uriToPrefixedUri(restriction.targetClass);
                            var property = " sh:path " + propStr + " ;\n";

                            //  "        sh:maxCount " + count + " ;" +
                            property += "        sh:node " + rangeStr + " ;";
                            property += Shacl.getCardinalityProperty(restriction);

                            shaclProperties.push(property);
                        });
                    }
                    var domain = Shacl.uriToPrefixedUri(classUri2);
                    if (shaclProperties.length > 0) {
                        var shaclStr = Shacl.getShacl(domain, null, shaclProperties);
                        allSahcls += shaclStr;
                    }
                }
            }

            var prefixes = Shacl.getPrefixes();
            allSahcls = prefixes + "\n" + allSahcls; // + ".";
            var payload = {
                turtle: allSahcls,
            };

            // transfom shacl to triples
            const params = new URLSearchParams(payload);
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/rdf-io?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    if (data.result && data.result.indexOf("Error") > -1) {
                        return callback(data.result);
                    }
                    return callback(null, { triples: data.triples, shacl: allSahcls, classesMap: classesMap });
                    //  callback(null, data);
                },
                error(err) {
                    callback(err.responseText);
                },
            });
        });
    };

    self.getResourcesPredicates = function (sourceLabel, resources, action, options, callback) {
        if (!options) {
            options = {};
        }
        var selectStr = "SELECT ?s ?p ?o ";
        if (action == "CONSTRUCT") {
            selectStr = "CONSTRUCT {?s ?p ?o} ";
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var filter = Sparql_common.setFilter("s", resources);
        if (options.filter) {
            filter += options.filter;
        }
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
            " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            selectStr +
            fromStr +
            " WHERE {\n" +
            "  ?s ?p ?o. " +
            filter +
            "} limit 10000";

        self.query(sourceLabel, query, function (err, result) {
            if (err) {
                return callback(err);
            }

            if (action == "CONSTRUCT") {
                callback(null, result.result);
            } else {
                return callback(null, result.results.bindings);
            }
        });
    };

    self.query = function (sourceLabel, query, callback) {
        var url = Config._defaultSource.sparql_server.url;

        var prefixStr = "PREFIX " + Config.sources[sourceLabel].prefix + ": <" + Config.sources[sourceLabel].graphUri + ">\n";
        query = prefixStr + query;

        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: sourceLabel,
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback(null, result);
            },
        );
    };

    self.getSubGraphRDF = function (sourceLabel, processClass, options, callback) {
        SubGraph.instantiateSubGraphTriples(sourceLabel, processClass, options, function (err, result) {
            var triples = result.triples;


            var payload = {
                triples:result.triples//triples

            };

            $.ajax({
                type: "POST",
                url: Config.apiUrl + "/triples2rdf",
                data: JSON.stringify(payload),
                contentType: "application/json",
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {

                    return data.output;
                },
                error(err) {
                    UI.message("", true);
                    callback(err.responseText);
                },
            });
        });
    };

    self.getSubGraphVisjsData = function (sourceLabel, processClass, options, callback) {
        self.graphDiv=options.graphDiv
        SubGraph.instantiateSubGraphTriples(sourceLabel, processClass, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            var labelsMap = {};
            var typesMap = {};
            var qualitiesMap = {};
            var triples = result.triples;
            var classes = result.classes;

            triples.forEach(function (triple) {
                if (triple.predicate == "rdfs:label") {
                    labelsMap[triple.subject] = triple.object;
                }
                if (triple.predicate == "rdf:type") {
                    typesMap[triple.subject] = triple.object;
                }
                if (triple.predicate == "rdf:type") {
                    typesMap[triple.subject] = triple.object;
                }
                if (triple.predicate.endsWith("hasPhysicalQuantity")) {
                    if (!qualitiesMap[triple.subject]) {
                        qualitiesMap[triple.subject] = {};
                    }
                    qualitiesMap[triple.subject][triple.object] = "?";
                }
            });

            var visjsData = { nodes: [], edges: [] };
            var uniqueIds = {};

            var getLevel = function (uri) {
                var classUri = uri.substring(0, uri.lastIndexOf("#"));
                var level = 0;
                if (classUri == processClass) {
                    return 0;
                }
                if (classes[classUri]) {
                    level = classes[classUri].level || 0;
                }
                return level;
            };

            var colorsMap = {
                Material: "#3892ca",
                Energy: "#07b611",
            };

            var levelShapes = ["box", "box", "box", "box", "box", "box", "box", "box"];




            function getNodeColor(uri) {
                var color = "#ddd";
                for (var key in colorsMap) {
                    if (uri.indexOf(key) > -1) {
                        color = colorsMap[key];
                    }
                }
                return color;
            }

            triples.forEach(function (triple) {
                if (triple.predicate == "rdfs:label") {
                    return;
                }
                if (triple.predicate == "rdf:type") {
                    return;
                }

                if (triple.predicate.endsWith("hasPhysicalQuantity")) {
                    return;
                }
                var font=null;
                var borderWidth=null
                var color=getNodeColor(triple.subject)
                if(triple.subject.startsWith(processClass)){
                    font={size:18,bold: {size:18}}
                    borderWidth=5
                    color="#ddd"
                }

                if (!uniqueIds[triple.subject]) {
                    var level = getLevel(triple.subject);
                    uniqueIds[triple.subject] = 1;
                    visjsData.nodes.push({
                        id: triple.subject,
                        label: labelsMap[triple.subject],
                        shape: levelShapes[level],
                        level: level,
                        color: color,
                        font:font,
                        borderWidth:borderWidth,
                        data: {
                            id: triple.subject,
                            label: labelsMap[triple.subject],
                            type: typesMap[triple.subject],
                            qualities: qualitiesMap[triple.subject],
                        },
                    });
                }

                if (!uniqueIds[triple.object]) {
                    var level = getLevel(triple.object);
                    uniqueIds[triple.object] = 1;
                    visjsData.nodes.push({
                        id: triple.object,
                        label: labelsMap[triple.object],
                        shape: levelShapes[level],
                        level: level,
                        color: getNodeColor(triple.object),
                        data: {
                            id: triple.object,
                            label: labelsMap[triple.object],
                            type: typesMap[triple.object],
                        },
                    });
                }
                visjsData.edges.push({
                    from: triple.subject,
                    to: triple.object,
                    label: Sparql_common.getLabelFromURI(triple.predicate),
                    arrows: { to: true },
                });
            });

            var graphOptions = {
                keepNodePositionOnDrag: true,
                layoutHierarchical: {
                    direction: "UD",
                    nodeSpacing: 200,
                    levelSeparation: 50,
                },
                /* physics: {
            enabled:true},*/

                visjsOptions: {
                    edges: {
                        smooth: false,
                        /* smooth: {
                                type: "cubicBezier",
                                // type: "diagonalCross",
                                forceDirection: "horizontal",
                                roundness: 0.4,
                            },*/
                    },
                },
            };




            var nodeSpacing = 150;
            var levelSpacing = 30;
            var position = options.position|| { x: 0, y: 0 };


            //   self.setHierachicalLayout(visjsData, position, nodeSpacing, levelSpacing)

            if (callback) {
                return callback(null, { visjsData: visjsData, graphOptions: graphOptions });
            } else {
                self.visjsGraph = new VisjsGraphClass(options.graphDiv, visjsData, graphOptions);
                self.visjsGraph.draw(function () {});
            }
        });
        return;
    };

    self.setHierachicalLayout = function (visjsData, topPosition, nodeSpacing, levelSpacing) {
        var levelsMap = {};
        var groupId = "group_" + common.getRandomHexaId(5);
        var edgesToMap = {};
        var edgesFromMap = {};
        var nodesMap = {};

        visjsData.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });
        visjsData.edges.forEach(function (edge) {
            edgesToMap[edge.to] = nodesMap[edge.from];
            if (!edgesFromMap[edge.to]) edgesFromMap[edge.from] = [];
            edgesFromMap[edge.from].push(edge.to);
        });

        visjsData.nodes.forEach(function (node) {
            if (!levelsMap[node.level]) {
                levelsMap[node.level] = [];
            }

            levelsMap[node.level].push(node);
        });

        var nLevels = Object.keys(levelsMap).length;
        for (var level = 0; level < nLevels; level++) {
            var nodes = levelsMap[level];

            nodes.sort(function (a, b) {
                if (a.id.indexOf("PortIn") > -1) {
                    return 1;
                }
                if (a.id.indexOf("Connection") > -1) {
                    return -1;
                }
                return 0;
            });
            nodes.forEach(function (node, index) {
                var nSiblings;
                var parentNodeX;
                if (index == 0) {
                    nSiblings = 0;
                    parentNodeX = topPosition.x;
                } else {
                    var parentNode = edgesToMap[node.id];

                    var nSiblings = edgesFromMap[parentNode.id].length;
                    parentNodeX = parentNode.x;
                }
                node.x = parentNodeX + nodeSpacing * index; //- ((nodes.length * nodeSpacing) / 2)
                node.y = topPosition.y + levelSpacing * level;
                node.fixed = { x: true, y: true };
                node.group = groupId;
            });
        }
    };

    return self;
})();

export default SubGraph;
window.SubGraph = SubGraph;
