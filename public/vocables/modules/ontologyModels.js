import Sparql_common from "./sparqlProxies/sparql_common.js"
import Sparql_OWL from "./sparqlProxies/sparql_OWL.js"
import Sparql_proxy from "./sparqlProxies/sparql_proxy.js"



// eslint-disable-next-line no-global-assign
var OntologyModels = (function () {
    self.registerSourcesModel = function (sources, callback) {
        if (!Array.isArray(sources)) {
            sources = [sources];
        }

        let url = Config.default_sparql_url + "?format=json&query=";

        var queryP = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var graphUri;
                if (!Config.ontologiesVocabularyModels[source]) {
                    graphUri = Config.sources[source].graphUri;
                    if (!graphUri) {
                        return callback();
                    }
                    Config.ontologiesVocabularyModels[source] = { graphUri: graphUri };
                }

                graphUri = Config.ontologiesVocabularyModels[source].graphUri;

                Config.ontologiesVocabularyModels[source].constraints = {}; //range and domain
                Config.ontologiesVocabularyModels[source].restrictions = {};
                Config.ontologiesVocabularyModels[source].classes = {};
                Config.ontologiesVocabularyModels[source].properties = [];

                var uniqueProperties = {};
                var propsWithoutDomain = [];
                var propsWithoutRange = [];
                var inversePropsMap = [];
                async.series(
                    [
                        // set propertie
                        function (callbackSeries) {
                            var query =
                                queryP +
                                " SELECT distinct ?prop ?propLabel ?inverseProp from <" +
                                graphUri +
                                ">  WHERE {\n" +
                                "  ?prop ?p ?o optional{?prop rdfs:label ?propLabel}" +
                                "optional{?prop owl:inverseOf ?inverseProp}" +
                                " VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty owl:AnnotationProperty} }";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                result.results.bindings.forEach(function (item) {
                                    if (!uniqueProperties[item.prop.value]) {
                                        uniqueProperties[item.prop.value] = 1;
                                        Config.ontologiesVocabularyModels[source].properties.push({
                                            id: item.prop.value,
                                            label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                                            inversProp: item.inverseProp ? item.inverseProp.value : null,
                                        });
                                    }
                                    if (item.inverseProp) {
                                        inversePropsMap[item.prop.value] = item.inverseProp.value;
                                    }
                                });

                                callbackSeries();
                            });
                        },
                        // set model classes (if source not  declared in sources.json)
                        function (callbackSeries) {
                            if (!Config.sources[source] || !Config.topLevelOntologies[source]) {
                                // dont take relations  declared in sources.json
                                return callbackSeries();
                            }
                            var query =
                                queryP +
                                " select distinct ?sub ?subLabel FROM <" +
                                graphUri +
                                "> where{" +
                                " ?sub rdf:type ?class. OPTIONAL{ ?sub rdfs:label ?subLabel} VALUES ?Class {owl:Class rdf:class rdfs:Class} filter( !isBlank(?sub))}";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.results.bindings.forEach(function (item) {
                                    if (!Config.ontologiesVocabularyModels[source].classes[item.sub.value]) {
                                        Config.ontologiesVocabularyModels[source].classes[item.sub.value] = {
                                            id: item.sub.value,
                                            label: item.subLabel ? item.subLabel.value : Sparql_common.getLabelFromURI(item.sub.value),
                                        };
                                    }
                                });
                                callbackSeries();
                            });
                        },

                        //set domain constraints
                        function (callbackSeries) {
                            var query = queryP + "" + " select distinct ?prop ?domain FROM <" + graphUri + "> where{" + " ?prop rdfs:domain ?domain." + "OPTIONAL{ ?domain rdfs:label ?domainLabel} }";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.results.bindings.forEach(function (item) {
                                    if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                                        Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                                    }
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domain = item.domain.value;
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domainLabel = item.domainLabel
                                        ? item.domainLabel.value
                                        : Sparql_common.getLabelFromURI(item.domain.value);
                                });
                                callbackSeries();
                            });
                        },
                        //set range constraints
                        function (callbackSeries) {
                            var query = queryP + " select distinct ?prop ?range FROM <" + graphUri + "> where{" + " ?prop rdfs:range ?range.OPTIONAL{ ?range rdfs:label ?rangeLabel} }";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.results.bindings.forEach(function (item) {
                                    if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                                        Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                                    }
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].range = item.range.value;
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].rangeLabel = item.rangeLabel
                                        ? item.rangeLabel.value
                                        : Sparql_common.getLabelFromURI(item.range.value);
                                });
                                callbackSeries();
                            });
                        },

                        //setinverse Props constraints
                        function (callbackSeries) {
                            for (var propId in inversePropsMap) {
                                var propConstraints = Config.ontologiesVocabularyModels[source].constraints[propId];
                                var inversePropConstraints = Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]];
                                if (!propConstraints) {
                                    propConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                                    Config.ontologiesVocabularyModels[source].constraints[propId] = propConstraints;
                                }
                                if (!inversePropConstraints) {
                                    inversePropConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]] = inversePropConstraints;
                                }

                                if (propConstraints.domain && !inversePropConstraints.range) {
                                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].range = propConstraints.domain;
                                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].rangeLabel = propConstraints.domainLabel;
                                }
                                if (propConstraints.range && !inversePropConstraints.domain) {
                                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].domain = propConstraints.range;
                                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].domainLabel = propConstraints.rangeLabel;
                                }

                                if (inversePropConstraints.domain && !propConstraints.range) {
                                    Config.ontologiesVocabularyModels[source].constraints[propId].range = inversePropConstraints.domain;
                                    Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = inversePropConstraints.domainLabel;
                                }
                                if (inversePropConstraints.range && !propConstraints.domain) {
                                    Config.ontologiesVocabularyModels[source].constraints[propId].domain = inversePropConstraints.range;
                                    Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = inversePropConstraints.rangeLabel;
                                }
                            }
                            callbackSeries();
                        },
                        // set retrictions constraints
                        function (callbackSeries) {
                            // only relations  declared in sources.json
                            if (!Config.sources[source]) {
                                return callbackSeries();
                            }
                            Sparql_OWL.getObjectRestrictions(source, null, { withoutBlankNodes: 1, withoutImports: 1 }, function (err, result) {
                                result.forEach(function (item) {
                                    var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);
                                    var domainLabel = item.subjectLabel ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value);
                                    var rangeLabel = item.valueLabel ? item.valueLabel.value : Sparql_common.getLabelFromURI(item.value.value);
                                    var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);

                                    if (!uniqueProperties[item.prop.value]) {
                                        uniqueProperties[item.prop.value] = 1;
                                        Config.ontologiesVocabularyModels[source].properties.push({
                                            id: item.prop.value,
                                            label: propLabel,
                                        });
                                    }
                                    if (!Config.ontologiesVocabularyModels[source].restrictions[item.prop.value]) {
                                        Config.ontologiesVocabularyModels[source].restrictions[item.prop.value] = [];
                                    }
                                    Config.ontologiesVocabularyModels[source].restrictions[item.prop.value].push({
                                        domain: item.subject.value,
                                        range: item.value.value,
                                        domainLabel: domainLabel,
                                        rangeLabel: rangeLabel,
                                    });
                                });

                                callbackSeries();
                            });
                        },

                        //set inherited Constraints
                        function (callbackSeries) {
                            if (!Config.sources[source] || !Config.topLevelOntologies[source]) {
                                return callbackSeries();
                            }
                            var constraints = Config.ontologiesVocabularyModels[source].constraints;
                            Config.ontologiesVocabularyModels[source].properties.forEach(function (prop) {
                                if (!constraints[prop.id]) {
                                    propsWithoutDomain.push(prop.id);
                                    propsWithoutRange.push(prop.id);
                                } else {
                                    if (!constraints[prop.id].domain) {
                                        propsWithoutDomain.push(prop.id);
                                    }
                                    if (!constraints[prop.id].range) {
                                        propsWithoutRange.push(prop.id);
                                    }
                                }
                            });
                            callbackSeries();
                        },

                        //set inherited domains
                        function (callbackSeries) {
                            if (propsWithoutDomain.length == 0) {
                                return callbackSeries();
                            }
                            var props = propsWithoutDomain.concat(propsWithoutRange);
                            Sparql_OWL.getPropertiesInheritedConstraints(source, props, {}, function (err, propsMap) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                for (var propId in propsMap) {
                                    var constraint = propsMap[propId];
                                    if (!Config.ontologiesVocabularyModels[source].constraints[propId]) {
                                        Config.ontologiesVocabularyModels[source].constraints[propId] = { domain: "", range: "" };
                                    }

                                    if (constraint.domain && !Config.ontologiesVocabularyModels[source].constraints[propId].domain) {
                                        Config.ontologiesVocabularyModels[source].constraints[propId].domain = constraint.domain;
                                        Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = constraint.domainLabel;
                                        Config.ontologiesVocabularyModels[source].constraints[propId].domainParentProperty = constraint.parentProp;
                                    }

                                    if (constraint.range && !Config.ontologiesVocabularyModels[source].constraints[propId].range) {
                                        Config.ontologiesVocabularyModels[source].constraints[propId].range = constraint.range;
                                        Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = constraint.rangeLabel;
                                        Config.ontologiesVocabularyModels[source].constraints[propId].rangeParentProperty = constraint.parentProp;
                                    }
                                }

                                return callbackSeries();
                            });
                        },
                        //register source in Config.sources
                        function (callbackSeries) {
                            if (!Config.sources[source]) {
                                Config.sources[source] = { graphUri: graphUri, controllerName: Sparql_OWL, controller: Sparql_OWL, sparql_server: { url: Config.default_sparql_url } };
                            }
                            return callbackSeries();
                        },
                    ],
                    function (err) {
                        callbackEach(err);
                    }
                );
            },
            function (err) {
                if (callback) {
                    return callback(err);
                }
            }
        );
    };

    self.unRegisterSourceModel = function () {
        var basicsSources = Object.keys(Config.basicVocabularies);
        for (var source in Config.ontologiesVocabularyModels) {
            if (basicsSources.indexOf(source) < 0) delete Config.ontologiesVocabularyModels[source];
        }
    };

    return self;
})();



export default OntologyModels
