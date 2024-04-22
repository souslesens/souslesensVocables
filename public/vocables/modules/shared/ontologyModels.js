import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Lineage_axioms_draw from "../tools/lineage/lineage_axioms_draw.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
//import fflate from "fflate";

// eslint-disable-next-line no-global-assign
var OntologyModels = (function () {
    self.loadedSources = {};
    self.registerSourcesModel = function (sources, callback) {
        MainController.UI.message("loading ontology models");
        if (!Array.isArray(sources)) {
            sources = [sources];
        }

        let url = Config.sparql_server.url + "?format=json&query=";

        var queryP = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var graphUri;
                if (!Config.ontologiesVocabularyModels[source]) {
                    if (!Config.sources[source]) {
                        MainController.UI.message("source " + source + " not allowed for user ");
                        return callbackEach();
                    }
                    graphUri = Config.sources[source].graphUri;
                    if (!graphUri) {
                        return callbackEach();
                    }
                    Config.ontologiesVocabularyModels[source] = { graphUri: graphUri };
                } else {
                    if (self.loadedSources[source]) {
                        return callbackEach();
                    }
                }

                graphUri = Config.ontologiesVocabularyModels[source].graphUri;

                Config.ontologiesVocabularyModels[source].constraints = {}; //range and domain
                Config.ontologiesVocabularyModels[source].restrictions = {};
                Config.ontologiesVocabularyModels[source].classes = {};
                Config.ontologiesVocabularyModels[source].properties = {};
                Config.ontologiesVocabularyModels[source].nonObjectProperties = {};

                var uniqueProperties = {};
                var propsWithoutDomain = [];
                var propsWithoutRange = [];
                var inversePropsMap = [];

                async.series(
                    [
                        function (callbackSeries) {
                            self.readModelOnServerCache(source, function (err, result) {
                                self.loadedSources[source] = 1;
                                if (result) {
                                    Config.ontologiesVocabularyModels[source] = result;
                                    if (!Config.ontologiesVocabularyModels[source].constraints) {
                                        Config.ontologiesVocabularyModels[source].constraints = {};
                                    } //range and domain
                                    if (!Config.ontologiesVocabularyModels[source].restrictions) {
                                        Config.ontologiesVocabularyModels[source].restrictions = {};
                                    }
                                    if (!Config.ontologiesVocabularyModels[source].classes) {
                                        Config.ontologiesVocabularyModels[source].classes = {};
                                    }
                                    if (!Config.ontologiesVocabularyModels[source].properties) {
                                        Config.ontologiesVocabularyModels[source].properties = {};
                                    }
                                    if (!Config.ontologiesVocabularyModels[source].nonObjectProperties) {
                                        Config.ontologiesVocabularyModels[source].nonObjectProperties = {};
                                    }

                                    return callbackEach();
                                } else {
                                    callbackSeries();
                                }
                            });
                        },

                        // set properties
                        function (callbackSeries) {
                            var query =
                                queryP +
                                " SELECT distinct ?prop ?propLabel ?inverseProp ?superProperty from <" +
                                graphUri +
                                ">  WHERE {\n" +
                                "  ?prop ?p ?o " +
                                Sparql_common.getVariableLangLabel("prop", true, true) +
                                "optional{?prop owl:inverseOf ?inverseProp}" +
                                "optional{?prop rdfs:subPropertyOf ?superProperty}" +
                                " VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty owl:AnnotationProperty} }";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                result.results.bindings.forEach(function (item) {
                                    if (item.superProperty) {
                                        var x = 3;
                                    }
                                    if (!uniqueProperties[item.prop.value]) {
                                        uniqueProperties[item.prop.value] = 1;
                                        Config.ontologiesVocabularyModels[source].properties[item.prop.value] = {
                                            id: item.prop.value,
                                            label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                                            inverseProp: item.inverseProp ? item.inverseProp.value : null,
                                            superProp: item.superProperty ? item.superProperty.value : null,
                                        };
                                    }
                                    if (item.inverseProp) {
                                        inversePropsMap[item.prop.value] = item.inverseProp.value;

                                        inversePropsMap[item.inverseProp.value] = item.prop.value;
                                    }
                                });

                                callbackSeries();
                            });
                        },
                        //set AnnotationProperties and datatypeProperties
                        function (callbackSeries) {
                            var query =
                                queryP +
                                " SELECT distinct ?prop ?propLabel ?propDomain ?propRange  from <" +
                                graphUri +
                                ">  WHERE {\n" +
                                " ?prop rdf:type ?type. filter (?type in (rdf:Property,<http://www.w3.org/2002/07/owl#AnnotationProperty>,owl:DatatypeProperty))  " +
                                Sparql_common.getVariableLangLabel("prop", true, true) +
                                "OPTIONAL {?prop rdfs:domain ?propDomain} OPTIONAL {?prop rdfs:range ?propRange}" +
                                "} limit 10000";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                result.results.bindings.forEach(function (item) {
                                    if (true || !uniqueProperties[item.prop.value]) {
                                        uniqueProperties[item.prop.value] = 1;
                                        Config.ontologiesVocabularyModels[source].nonObjectProperties[item.prop.value] = {
                                            id: item.prop.value,
                                            label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                                            domain: item.propDomain ? item.propDomain.value : null,
                                            range: item.propRange ? item.propRange.value : null,
                                        };
                                    }
                                });

                                callbackSeries();
                            });
                        },

                        // set model classes (if source not  declared in sources.json && classes.length<Config.ontologyModelMaxClasses)
                        function (callbackSeries) {
                            var query = queryP + " select (count (distinct ?sub) as ?numberOfClasses)  FROM <" + graphUri + "> where{" + " ?sub rdf:type owl:Class.} ";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                var numberOfClasses = parseFloat(result.results.bindings[0].numberOfClasses.value);
                                Config.ontologiesVocabularyModels[source].classesCount = numberOfClasses;

                                if (numberOfClasses > Config.ontologyModelMaxClasses) {
                                    return callbackSeries();
                                } else {
                                    var query =
                                        queryP +
                                        " select distinct ?sub ?subLabel ?superClass ?superClassLabel FROM <" +
                                        graphUri +
                                        "> where{" +
                                        " ?sub rdf:type ?class. " +
                                        "OPTIONAL {?sub rdfs:subClassOf ?superClass. " +
                                        " OPTIONAL {?superClass rdfs:label ?superClassLabel}}" +
                                        Sparql_common.getVariableLangLabel("sub", true, true) +
                                        " VALUES ?class {owl:Class rdf:class rdfs:Class} filter( !isBlank(?sub))} order by ?sub";
                                    Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }
                                        result.results.bindings.forEach(function (item) {
                                            if (!Config.ontologiesVocabularyModels[source].classes[item.sub.value]) {
                                                Config.ontologiesVocabularyModels[source].classes[item.sub.value] = {
                                                    id: item.sub.value,
                                                    label: item.subLabel ? item.subLabel.value : Sparql_common.getLabelFromURI(item.sub.value),
                                                    superClass: item.superClass ? item.superClass.value : null,
                                                    superClassLabel: item.superClass
                                                        ? item.superClassLabel
                                                            ? item.superClassLabel.value
                                                            : Sparql_common.getLabelFromURI(item.superClass.value)
                                                        : null,
                                                };
                                            }
                                        });
                                        callbackSeries();
                                    });
                                }
                            });
                        },

                        //set domain constraints
                        function (callbackSeries) {
                            var query =
                                queryP +
                                "" +
                                " select distinct ?prop ?domain FROM <" +
                                graphUri +
                                "> where{" +
                                " ?prop rdfs:domain ?domain." +
                                Sparql_common.getVariableLangLabel("domain", true, true) +
                                " }";
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
                            var query =
                                queryP + " select distinct ?prop ?range FROM <" + graphUri + "> where{" + " ?prop rdfs:range ?range." + Sparql_common.getVariableLangLabel("range", true, true) + " }";
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
                                        Config.ontologiesVocabularyModels[source].properties[item.prop.value] = {
                                            id: item.prop.value,
                                            label: propLabel,
                                        };
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

                        //set inverse Props constraints
                        function (callbackSeries) {
                            self.setInversePropertiesConstaints(source, inversePropsMap);
                            callbackSeries();
                        },

                        //set inherited Constraints
                        function (callbackSeries) {
                            if (!Config.sources[source] || !Config.topLevelOntologies[source]) {
                                return callbackSeries();
                            }
                            var constraints = Config.ontologiesVocabularyModels[source].constraints;
                            for (var prop in Config.ontologiesVocabularyModels[source].properties) {
                                var prop = Config.ontologiesVocabularyModels[source].properties[prop];
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
                            }
                            callbackSeries();
                        },

                        //set inherited domains
                        function (callbackSeries) {
                            var props = propsWithoutDomain.concat(propsWithoutRange);
                            if (props.length == 0) {
                                return callbackSeries();
                            }
                            Sparql_OWL.getPropertiesInheritedConstraints(source, props, { withoutImports: 0 }, function (err, propsMap) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                // for (var propId in Config.ontologiesVocabularyModels[source].properties) {

                                for (var prop in Config.ontologiesVocabularyModels[source].properties) {
                                    var prop = Config.ontologiesVocabularyModels[source].properties[prop];
                                    var propId = prop.id;

                                    if (propId == "http://rds.posccaesar.org/ontology/lis14/rdl/activeParticipantIn") {
                                        var x = 3;
                                    }
                                    var inheritedConstaint = propsMap[propId];
                                    if (inheritedConstaint) {
                                        if (!Config.ontologiesVocabularyModels[source].constraints[propId]) {
                                            Config.ontologiesVocabularyModels[source].constraints[propId] = { domain: "", range: "" };
                                        }

                                        // inheritance but no overload of constraint
                                        if (inheritedConstaint.domain && !Config.ontologiesVocabularyModels[source].constraints[propId].domain) {
                                            Config.ontologiesVocabularyModels[source].constraints[propId].domain = inheritedConstaint.domain;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = inheritedConstaint.domainLabel;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].domainParentProperty = inheritedConstaint.parentProp;
                                        }

                                        if (inheritedConstaint.range && !Config.ontologiesVocabularyModels[source].constraints[propId].range) {
                                            Config.ontologiesVocabularyModels[source].constraints[propId].range = inheritedConstaint.range;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = inheritedConstaint.rangeLabel;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].rangeParentProperty = inheritedConstaint.parentProp;
                                        }
                                    }
                                }
                                return callbackSeries();
                            });
                        },

                        // set constraints prop label and superProp
                        function (callbackSeries) {
                            for (var prop in Config.ontologiesVocabularyModels[source].properties) {
                                var property = Config.ontologiesVocabularyModels[source].properties[prop];
                                if (Config.ontologiesVocabularyModels[source].constraints[property.id]) {
                                    Config.ontologiesVocabularyModels[source].constraints[property.id].label = property.label;

                                    Config.ontologiesVocabularyModels[source].constraints[property.id].superProp = property.superProp;
                                }
                            }
                            return callbackSeries();
                        },

                        //set inverse Props constraints
                        function (callbackSeries) {
                            self.setInversePropertiesConstaints(source, inversePropsMap);
                            callbackSeries();
                        },

                        // set transSourceRangeAndDomainLabels
                        function (callbackSeries) {
                            if (!Config.sources[source]) {
                                return callbackSeries();
                            }
                            var classes = [];
                            for (var propId in Config.ontologiesVocabularyModels[source].constraints) {
                                var constraint = Config.ontologiesVocabularyModels[source].constraints[propId];
                                if (constraint.domain && classes.indexOf(constraint.domain) < 0) {
                                    classes.push(constraint.domain);
                                }
                                if (constraint.range && classes.indexOf(constraint.range) < 0) {
                                    classes.push(constraint.range);
                                }
                            }
                            if (classes.length == 0) {
                                return callbackSeries();
                            }
                            Sparql_OWL.getLabelsMapFromLabelsGraph(classes, function (err, labelsMap) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                for (var propId in Config.ontologiesVocabularyModels[source].constraints) {
                                    var constraint = Config.ontologiesVocabularyModels[source].constraints[propId];
                                    if (labelsMap[constraint.domain]) {
                                        Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = labelsMap[constraint.domain];
                                    }
                                    if (labelsMap[constraint.range]) {
                                        Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = labelsMap[constraint.range];
                                    }
                                }
                                return callbackSeries();
                            });
                        },

                        //register source in Config.sources
                        function (callbackSeries) {
                            if (!Config.sources[source]) {
                                Config.sources[source] = {
                                    graphUri: graphUri,
                                    controllerName: Sparql_OWL,
                                    controller: Sparql_OWL,
                                    sparql_server: { url: Config.sparql_server.url },
                                };
                            }
                            return callbackSeries();
                        },
                        function (callbackSeries) {
                            if (true || Config.basicVocabularies[source]) {
                                self.writeModelOnServerCache(source, Config.ontologiesVocabularyModels[source], function (err, result) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    return callbackSeries();
                                });
                            }
                        },
                    ],
                    function (err) {
                        callbackEach(err);
                    }
                );
            },
            function (err) {
                MainController.UI.message("", true);
                if (callback) {
                    return callback(err);
                }
            }
        );
    };

    self.setInversePropertiesConstaints = function (source, inversePropsMap) {
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
    };

    self.getPropertiesArray = function (source) {
        var array = [];
        for (var prop in Config.ontologiesVocabularyModels[source].properties) {
            array.push(Config.ontologiesVocabularyModels[source].properties[prop]);
        }
        return array;
    };

    self.getAnnotationProperties = function (source) {
        var array = [];
        for (var prop in Config.ontologiesVocabularyModels[source].nonObjectProperties) {
            array.push(Config.ontologiesVocabularyModels[source].nonObjectProperties[prop]);
        }
        return array;
    };

    self.unRegisterSourceModel = function () {
        var basicsSources = Object.keys(Config.basicVocabularies);
        for (var source in Config.ontologiesVocabularyModels) {
            if (basicsSources.indexOf(source) < 0) {
                delete Config.ontologiesVocabularyModels[source];
            }
        }
    };

    self.readModelOnServerCache = function (source, callback) {
        const params = new URLSearchParams({
            source: source,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/ontologyModels?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.updateModel = function (source, data, options, callback) {
        if (!options) {
            options = {};
        }

        if (!options.remove) {
            options.remove = false;
        }

        for (var entryType in data) {
            for (var id in data[entryType]) {
                if (entryType == "restrictions") {
                    if (options.remove) {
                        delete Config.ontologiesVocabularyModels[source][entryType][data[entryType][id]];
                    } else {
                        data[entryType][id].forEach((_restriction) => {
                            Config.ontologiesVocabularyModels[source][entryType][id].push(_restriction);
                        });
                    }
                } else {
                    if (options.remove) {
                        delete Config.ontologiesVocabularyModels[source][entryType][data[entryType][id]];
                    } else {
                        Config.ontologiesVocabularyModels[source][entryType][id] = data[entryType][id];
                    }
                }
            }
        }
        if (!options.noUpdateCache) {
            self.updateModelOnServerCache(
                source,
                data,
                function (err, result) {
                    callback(err);
                },
                options
            );
        } else {
            callback(done);
        }
    };

    self.updateModelOnServerCache = function (source, data, callback, options) {
        var payload = {
            source: source,
            data: data,
            options: options,
        };

        $.ajax({
            type: "PUT",
            url: `${Config.apiUrl}/ontologyModels`,
            data: payload,
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.writeModelOnServerCache = function (source, model, callback) {
        var keys = Object.keys(model);
        async.eachSeries(
            keys,
            function (key, callbackEach) {
                var payload = {
                    source: source,
                    model: JSON.stringify(model[key]),
                    key: key,
                };
                $.ajax({
                    type: "POST",
                    url: `${Config.apiUrl}/ontologyModels`,
                    data: payload,
                    success: function (data, _textStatus, _jqXHR) {
                        return callbackEach(null, data);
                    },
                    error: function (err) {
                        return callbackEach(err);
                    },
                });
            },
            function (err) {
                callback(err);
            }
        );

        return;

        var payload = {
            source: source,
            model: model,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/ontologyModels`,
            data: payload,
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.getAllowedPropertiesBetweenNodes = function (source, startNodeIds, endNodeIds, callback) {
        var startNodeAncestors = [];
        var endNodeAncestors = [];

        var validProperties = [];
        var validConstraints = {};
        var allConstraints = {};
        var hierarchies = {};

        var noConstaintsArray = [];
        var propertiesMatchingBoth = [];
        var propertiesMatchingStartNode = [];
        var propertiesMatchingEndNode = [];
        var filter = ""; // "filter (?superClass not in (<http://purl.obolibrary.org/obo/BFO_0000001>,<http://purl.obolibrary.org/obo/BFO_0000002>,<http://purl.obolibrary.org/obo/BFO_0000003>))";

        var startNodeAncestorIds = [];
        var endNodeAncestorIds = [];
        var allSources = [source];
        if (!Array.isArray(startNodeIds)) {
            startNodeIds = [startNodeIds];
        }
        if (!Array.isArray(endNodeIds)) {
            endNodeIds = [endNodeIds];
        }
        async.series(
            [
                function (callbackSeries) {
                    Sparql_OWL.getNodesAncestorsOrDescendants(source, startNodeIds, { excludeItself: 0, filter: filter }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        hierarchies = result.hierarchies;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (!endNodeIds) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getNodesAncestorsOrDescendants(source, endNodeIds, { excludeItself: 0, filter: filter }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var hierarchiesEnd = result.hierarchies;
                        for (var key in hierarchiesEnd) {
                            hierarchies[key] = hierarchiesEnd[key];
                        }

                        callbackSeries();
                    });
                }, //get matching properties
                function (callbackSeries) {
                    if (Config.sources[source].imports) {
                        allSources = allSources.concat(Config.sources[source].imports);
                    }

                    var allDomains = {};
                    var allRanges = {};

                    startNodeIds.forEach(function (startNodeId) {
                        startNodeAncestorIds.push(startNodeId);
                        hierarchies[startNodeId].forEach(function (item) {
                            startNodeAncestorIds.push(item.superClass.value);
                        });
                    });
                    endNodeIds.forEach(function (endNodeId) {
                        if (endNodeId) {
                            endNodeAncestorIds.push(endNodeId);
                            hierarchies[endNodeId].forEach(function (item, startNodeIndex) {
                                endNodeAncestorIds.push(item.superClass.value);
                            });
                        }
                    });

                    allSources.forEach(function (_source) {
                        if (!Config.ontologiesVocabularyModels[_source]) {
                            return;
                        }

                        //merge constraints( range/domain) and restrictions
                        var sourceConstraintsAndRestrictions = Config.ontologiesVocabularyModels[_source].restrictions;
                        for (var prop in Config.ontologiesVocabularyModels[_source].constraints) {
                            var constraint = Config.ontologiesVocabularyModels[_source].constraints[prop];
                            if (!sourceConstraintsAndRestrictions[prop]) {
                                sourceConstraintsAndRestrictions[prop] = [constraint];
                            } else {
                                sourceConstraintsAndRestrictions[prop].push(constraint);
                            }
                        }

                        for (var property in sourceConstraintsAndRestrictions) {
                            if (property == "http://rds.posccaesar.org/ontology/lis14/rdl/hasQuality") {
                                var x = 3;
                            }

                            sourceConstraintsAndRestrictions[property].forEach(function (constraint) {
                                constraint.source = _source;
                                var domainOK = false;
                                if (true || !allConstraints[property]) {
                                    allConstraints[property] = constraint;

                                    if (constraint.domain) {
                                        if (startNodeAncestorIds.indexOf(constraint.domain) > -1 || startNodeAncestorIds[0] == "http://www.w3.org/2002/07/owl#Class") {
                                            if (!constraint.range || constraint.range.indexOf("http") < 0 || endNodeIds.length == 0) {
                                                propertiesMatchingStartNode.push(property);
                                            } else {
                                                domainOK = true;
                                            }
                                        }
                                    }
                                    if (constraint.range) {
                                        if (endNodeAncestorIds.indexOf(constraint.range) > -1 || endNodeAncestorIds[0] == "http://www.w3.org/2002/07/owl#Class") {
                                            if (domainOK) {
                                                propertiesMatchingBoth.push(property);
                                            } else {
                                                if (!constraint.domain || constraint.domain.indexOf("http") < 0) {
                                                    propertiesMatchingEndNode.push(property);
                                                }
                                            }
                                        }
                                    }
                                    if (!constraint.domain && !constraint.range) {
                                        noConstaintsArray.push(property);
                                    }
                                }
                            });
                        }
                    });

                    callbackSeries();
                },

                //remove matching superproperties
                function (callbackSeries) {
                    var propsToRemove = [];

                    function recurse(propId) {
                        if (allConstraints[propId]) {
                            var superProp = allConstraints[propId].superProp;
                            if (superProp) {
                                if (validProperties.indexOf(superProp) > -1) {
                                    if (propsToRemove.indexOf(superProp) < 0) {
                                        propsToRemove.push(superProp);
                                    }
                                }
                                recurse(superProp);
                            }
                        }
                    }

                    propertiesMatchingBoth.forEach(function (propId) {
                        recurse(propId);
                    });
                    propertiesMatchingStartNode.forEach(function (propId) {
                        recurse(propId);
                    });
                    propertiesMatchingEndNode.forEach(function (propId) {
                        recurse(propId);
                    });

                    validConstraints = { both: {}, domain: {}, range: {}, noConstraints: {} };

                    propertiesMatchingBoth.forEach(function (propId) {
                        if (propsToRemove.indexOf(propId) < 0) {
                            validConstraints["both"][propId] = allConstraints[propId];
                        }
                    });
                    propertiesMatchingStartNode.forEach(function (propId) {
                        if (propsToRemove.indexOf(propId) < 0) {
                            validConstraints["domain"][propId] = allConstraints[propId];
                        }
                    });

                    propertiesMatchingEndNode.forEach(function (propId) {
                        if (propsToRemove.indexOf(propId) < 0) {
                            validConstraints["range"][propId] = allConstraints[propId];
                        }
                    });
                    noConstaintsArray.forEach(function (propId) {
                        validConstraints["noConstraints"][propId] = allConstraints[propId];
                    });
                    callbackSeries();
                },
                //add subProperties with superProporties constaints
                function (callbackSeries) {
                    for (var key in validConstraints) {
                        var subPropConstraints = {};
                        var constraints = validConstraints[key];
                        for (var propId in constraints) {
                            var allProperties = Config.ontologiesVocabularyModels[source].properties;
                            for (var propId2 in allProperties) {
                                if (propId2 != propId) {
                                    var prop = allProperties[propId2];
                                    if (prop.superProp == propId) {
                                        var superProp = constraints[propId];
                                        prop.range = superProp.range;
                                        prop.rangeLabel = superProp.rangeLabel;
                                        prop.domain = superProp.domain;
                                        prop.domainLabel = superProp.domainLabel;
                                        prop.source = source;
                                        subPropConstraints[propId2] = prop;
                                    }
                                }
                            }
                        }

                        for (var subProp in subPropConstraints) {
                            validConstraints[key][subProp] = subPropConstraints[subProp];
                        }
                    }

                    callbackSeries();
                },
            ],
            function (err) {
                return callback(err, { constraints: validConstraints, nodes: { startNode: startNodeAncestorIds, endNode: endNodeAncestorIds } });
            }
        );
    };

    self.getClassesConstraints = function (source, fromClass, toClass) {
        var constraints = {};
        var objs = Config.ontologiesVocabularyModels[source].constraints;
        for (var prop in objs) {
            var constraintsArray = objs[prop];
            if (!Array.isArray(constraintsArray)) {
                constraintsArray = [constraintsArray];
            }
            constraintsArray.forEach(function (constraint) {
                if ((!fromClass || constraint.domain == fromClass) && (!toClass || constraint.range == toClass)) {
                    constraints[prop] = constraint;
                }
            });
        }
        return constraints;
    };
    self.getClassesRestrictions = function (source, fromClass, toClass) {
        var restrictions = {};
        var objs = Config.ontologiesVocabularyModels[source].restrictions;
        for (var prop in objs) {
            var restrictionsArray = objs[prop];
            restrictionsArray.forEach(function (restriction) {
                if ((!fromClass || !restriction.domain || restriction.domain == fromClass) && (!toClass || !restriction.range || restriction.range == toClass)) {
                    restrictions[prop] = restriction;
                }
            });
        }
        return restrictions;
    };

    self.getInferredModel = function (source, options, callback) {
        if (!options) {
            options = {};
        }

        var filterStr = options.filter || "";

        {
            var sourceGraphUriFrom = Sparql_common.getFromStr(source, false, true);
            var sourceGraphUri = Config.sources[source].graphUri;
            if (!sourceGraphUri) {
                return callback("source " + source + " not declared");
            }
            var importGraphUriFrom = Sparql_common.getFromStr(source, false, false);

            var queryNewWithLabels =
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "SELECT   distinct ?prop ?sClass ?oClass ?sClassLabel ?oClassLabel ?propLabel ?g\n" +
                importGraphUriFrom +
                " where " +
                " {\n" +
                "   {\n" +
                "       ?sClass rdfs:label ?sClassLabel .\n" +
                "        ?oClass rdfs:label ?oClassLabel .\n" +
                "      ?prop rdfs:label ?propLabel .\n" +
                "      \n" +
                "  }\n" +
                " { select ?prop  ?sClass ?oClass where {\n" +
                "  graph <" +
                sourceGraphUri +
                "> {\n" +
                "   ?s ?prop ?o.\n" +
                "  ?s rdf:type ?sClass.\n" +
                "  ?o rdf:type ?oClass. \n" +
                "filter(?sClass not in (owl:Class,owl:NamedIndividual,owl:Restriction,rdf:Bag)) \n" +
                " filter(?oClass not in (owl:Class,owl:NamedIndividual,owl:Restriction,rdf:Bag)) " +
                '  filter (!regex(str(?prop),"rdf","i"))\n' +
                "  filter (?s != ?o)\n" +
                "    }\n" +
                "    }\n" +
                "  }\n" +
                "\n" +
                "    }\n" +
                "  ";

            var queryNew =
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "SELECT   distinct ?prop ?sClass ?oClass ?sClassLabel ?oClassLabel ?propLabel ?g\n" +
                importGraphUriFrom +
                " where " +
                " { select ?prop  ?sClass ?oClass where {\n" +
                "  graph <" +
                sourceGraphUri +
                "> {\n" +
                "   ?s ?prop ?o.\n" +
                "   {?s rdf:type ?sClass.}\n" +
                "   {?o rdf:type ?oClass.} \n" +
                "filter(?sClass not in (owl:Class,owl:NamedIndividual,owl:Restriction,rdf:Bag)) \n" +
                " filter(?oClass not in (owl:Class,owl:NamedIndividual,owl:Restriction,rdf:Bag)) " +
                ' filter (!regex(str(?prop),"rdf","i")) filter (?prop not in (<http://purl.org/dc/terms/created>, <http://souslesens.org/KGcreator#mappingFile>))' +
                "  filter (?s != ?o)\n" +
                "    }\n" +
                "    }\n" +
                "  }\n" +
                "\n" +
                "  ";

            let url = Config.sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, queryNew, null, {}, function (err, result) {
                if (err) {
                    return callback(err);
                }

                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "sClass", "oClass"], { source: source });

                //   Config.ontologiesVocabularyModels[source].inferredClassModel = result.results.bindings;
                return callback(null, result.results.bindings);
            });
        }
    };

    self.getKGnonObjectProperties = function (source, options, callback) {
        if (!options) {
            options = {};
        }
        if (Config.ontologiesVocabularyModels[source].KGnonObjectProperties && !options.reload) {
            return callback(null, Config.ontologiesVocabularyModels[source].KGnonObjectProperties);
        }
        var metaDataProps = "&& ?prop not in (rdf:type,<http://purl.org/dc/terms/created>,<http://purl.org/dc/terms/creator>,<http://purl.org/dc/terms/source>)";

        var sources = [source];
        if (Config.sources[source].imports) {
            sources = sources.concat(Config.sources[source].imports);
        }
        for (var vocab in Config.basicVocabularies) {
            sources.push(vocab);
        }
        var nonObjectPropertiesmap = {};
        MainController.UI.message("loading KG nonObjectProperties", false, true);
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var sourceGraphUriFrom = Sparql_common.getFromStr(source, false, true);
                var queryNew =
                    "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" +
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                    "SELECT   distinct ?class ?prop  ?datatype  " +
                    sourceGraphUriFrom +
                    "  where {\n" +
                    " { ?s rdf:type ?class. ?class rdf:type owl:Class .?class rdfs:label ?classLabel. filter (?class!=(rdfs:Class))}\n" +
                    " {\n" +
                    "   ?s ?prop ?o.\n" +
                    "      bind ( datatype(?o) as ?datatype )\n" +
                    "    ?prop rdf:type ?type. filter (?type in (<http://www.w3.org/2002/07/owl#DatatypeProperty>,rdf:Property,owl:AnnotationProperty)&& ?prop not in (rdf:type,<http://purl.org/dc/terms/created>,<http://purl.org/dc/terms/creator>,<http://purl.org/dc/terms/source>))\n" +
                    "}\n" +
                    "  UNION\n" +
                    "  {\n" +
                    "    ?s ?prop ?o. values ?prop{rdf:value}" +
                    "    bind ( datatype(?o) as ?datatype )\n" +
                    "  }\n" +
                    "} limit 100";

                let url = Config.sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, queryNew, null, {}, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "class"]);

                    result.results.bindings.forEach(function (item) {
                        if (!nonObjectPropertiesmap[item.class.value]) {
                            nonObjectPropertiesmap[item.class.value] = { label: item.classLabel.value, id: item.class.value, properties: [] };
                        }
                        nonObjectPropertiesmap[item.class.value].properties.push({
                            label: item.propLabel.value,
                            id: item.prop.value,
                            datatype: item.datatype ? item.datatype.value : "string",
                        });
                    });

                    callbackEach();
                    //   Config.ontologiesVocabularyModels[source].inferredClassModel = result.results.bindings;
                });
            },
            function (err) {
                Config.ontologiesVocabularyModels[source].KGnonObjectProperties = nonObjectPropertiesmap;
                MainController.UI.message("", true);
                return callback(null, nonObjectPropertiesmap);
            }
        );
    };

    self.getContainerBreakdownClasses = function (source, callback) {
        var fromStr = Sparql_common.getFromStr(source, false, true);

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT   distinct ?prop ?sClass ?oClass ?sClassLabel ?oClassLabel ?propLabel ?g\n" +
            fromStr +
            "  where  { " +
            "   ?s ?prop ?o.\n" +
            "   ?s rdf:type ?sClass.\n" +
            "   ?o rdf:type ?oClass. \n" +
            "filter(?prop= rdfs:member)\n" +
            "      filter (?sClass  not in(rdf:Bag,owl:NamedIndividual) && ?oClass not in(rdf:Bag,owl:NamedIndividual) )\n" +
            "  }";

        let url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "class"]);
            return callback(null, result.results.bindings);
        });
    };

    self.getInferredClassValueDataTypes = function (source, options, callback) {
        if (!options) {
            options = {};
        }
        if (!Config.ontologiesVocabularyModels[source]) {
            Config.ontologiesVocabularyModels[source];
        }
        var filterStr = options.filter || "";

        var sourceGraphUri = Config.sources[source].graphUri;
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?class ?datatype  FROM   <" +
            sourceGraphUri +
            ">" +
            " WHERE {   \n" +
            "  ?s rdf:type+ ?class.\n" +
            "  ?class rdf:type owl:Class.\n" +
            "  ?s owl:hasValue ?v.\n" +
            " bind (datatype(?v) as ?datatype)\n" +
            //  "   filter (t != '')\n" +
            "}";
        let url = Config.sparql_server.url + "?format=json&query=";

        MainController.UI.message("loading ", false, true);
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
            if (err) {
                return callback(err);
            }

            MainController.UI.message("", true);
            return callback(null, result.results.bindings);
        });
    };

    self.getClassHierarchyTreeData = function (sourcelabel, baseClassId, direction, options) {
        if (!options) {
            options = {};
        }

        var sources = [sourcelabel];
        if (Config.sources[sourcelabel].imports) {
            sources = sources.concat(Config.sources[sourcelabel].imports);
        }

        var classes = {};

        sources.forEach(function (source) {
            if (!Config.ontologiesVocabularyModels[source]) {
                return;
            }
            for (var key in Config.ontologiesVocabularyModels[source].classes) {
                var item = Config.ontologiesVocabularyModels[source].classes[key];
                if (classes[key]) {
                    classes[key].superClass = item.superClass;
                } else {
                    classes[key] = item;
                }
            }
        });
        var hierarchyArray = [];
        var uniqueIds = {};
        if (direction == "ancestors") {
            function recurse(classId) {
                if (classes[classId] && !uniqueIds[classId]) {
                    uniqueIds[classId] = 1;
                    hierarchyArray.push(classes[classId]);
                    if (classes[classId].superClass) {
                        recurse(classes[classId].superClass);
                    }
                }
            }

            recurse(baseClassId);
        } else if (direction == "descendants") {
            if (!options.depth) {
                var nClasses = Object.keys(classes).length;
                if (nClasses < 50) {
                    options.depth = 4;
                } else if (nClasses < 200) {
                    options.depth = 2;
                } else {
                    options.depth = 1;
                }
            }

            var childrenMap = {};
            var uniqueIds = {};
            hierarchyArray.push(classes[baseClassId]);
            for (var key in classes) {
                if (key == baseClassId) {
                    var x = 3;
                }
                if (!childrenMap[classes[key].superClass]) {
                    childrenMap[classes[key].superClass] = [];
                }
                childrenMap[classes[key].superClass].push(classes[key]);
            }

            function recurse(classId, depth) {
                if (depth >= options.depth) {
                    return;
                }
                if (childrenMap[classId]) {
                    childrenMap[classId].forEach(function (item) {
                        if (!uniqueIds[item.id]) {
                            uniqueIds[item.id] = 1;
                            hierarchyArray.push(item);
                            recurse(item.id, depth + 1);
                        }
                    });
                }
            }

            recurse(baseClassId, 0);
        }

        return hierarchyArray;
    };

    return self;
})();

export default OntologyModels;

window.OntologyModels = OntologyModels;
