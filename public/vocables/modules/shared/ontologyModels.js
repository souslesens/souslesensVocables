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
                Config.ontologiesVocabularyModels[source].annotationProperties = {};

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
                                    if (!Config.ontologiesVocabularyModels[source].annotationProperties) {
                                        Config.ontologiesVocabularyModels[source].annotationProperties = {};
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
                        //set AnnotationProperties
                        function (callbackSeries) {
                            var query =
                                queryP +
                                " SELECT distinct ?prop ?propLabel from <" +
                                graphUri +
                                ">  WHERE {\n" +
                                " ?prop rdf:type ?type. filter (?type in (rdf:Property,<http://www.w3.org/2002/07/owl#AnnotationProperty>,owl:DatatypeProperty))  " +
                                Sparql_common.getVariableLangLabel("prop", true, true) +
                                "} limit 10000";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                result.results.bindings.forEach(function (item) {
                                    if (true || !uniqueProperties[item.prop.value]) {
                                        uniqueProperties[item.prop.value] = 1;
                                        Config.ontologiesVocabularyModels[source].annotationProperties[item.prop.value] = {
                                            id: item.prop.value,
                                            label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
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
                                        " select distinct ?sub ?subLabel FROM <" +
                                        graphUri +
                                        "> where{" +
                                        " ?sub rdf:type ?class. " +
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
        for (var prop in Config.ontologiesVocabularyModels[source].annotationProperties) {
            array.push(Config.ontologiesVocabularyModels[source].annotationProperties[prop]);
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



        /*  const buf = fflate.strToU8(JSON.stringify(model));
          const compressed = fflate.compressSync(buf, { level: 6, mem: 8 });

           var xx=fflate.strToU8(compressed)
           const decompressed = fflate.decompressSync(xx);
           model = { compressed:JSON.parse(decompressed)};*/

// Creates a TextReader object storing the text of the entry to add in the zip
// (i.e. "Hello world!").
        /*   var xx=JSON.stringify(model)

       const zipWriter = new ZipWriter(zipFileWriter);
        zipWriter.add(xx, helloWorldReader);
        zipWriter.close();*/

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
        var duplicateProps = [];

        var validConstraints = {};
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
                    Sparql_OWL.getNodesAncestors(source, startNodeIds, { excludeItself: 0, filter: filter }, function (err, result) {
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
                    Sparql_OWL.getNodesAncestors(source, endNodeIds, { excludeItself: 0, filter: filter }, function (err, result) {
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
                        hierarchies[startNodeId].forEach(function (item) {
                            startNodeAncestorIds.push(item.superClass.value);
                        });
                    });
                    endNodeIds.forEach(function (endNodeId) {
                        if (endNodeId) {
                            hierarchies[endNodeId].forEach(function (item, startNodeIndex) {
                                endNodeAncestorIds.push(item.superClass.value);
                            });
                        }
                    });

                    allSources.forEach(function (_source) {
                        if (!Config.ontologiesVocabularyModels[_source]) {
                            return;
                        }
                        var sourceConstraints = Config.ontologiesVocabularyModels[_source].constraints;
                        for (var property in sourceConstraints) {
                            var constraint = sourceConstraints[property];
                            constraint.source = _source;
                            var domainOK = false;
                            if (!allConstraints[property]) {
                                allConstraints[property] = constraint;

                                if (constraint.domain) {
                                    if (startNodeAncestorIds.indexOf(constraint.domain) > -1) {
                                        if (!constraint.range || constraint.range.indexOf("http") < 0 || endNodeIds.length == 0) {
                                            propertiesMatchingStartNode.push(property);
                                        } else {
                                            domainOK = true;
                                        }
                                    }
                                }
                                if (constraint.range) {
                                    if (endNodeAncestorIds.indexOf(constraint.range) > -1) {
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
                            } else if (allConstraints[property].domain != constraint.domain && allConstraints[property].range != constraint.range) {
                                duplicateProps.push(property + "_" + allConstraints[property].source + "-----" + constraint.source);
                            }
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

                    /*   validProperties = propertiesMatchingBoth;
validProperties = common.array.union(validProperties, propertiesMatchingStartNode);
validProperties = common.array.union(validProperties, propertiesMatchingEndNode);
validProperties = common.array.union(validProperties, noConstaintsArray);*/

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
            ],
            function (err) {
                if (duplicateProps.length > 0) {
                    MainController.UI.message(duplicateProps.length + " DUPLICATE PROPERTIES WITH DIFFERENT RANGE OR DOMAIN");
                }
                console.warn("DUPLICATE PROPERTIES WITH DIFFERENT RANGE OR DOMAIN\r");
                duplicateProps.forEach(function (item) {
                    console.warn(item);
                });
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

    self.getInferredModelOld = function (source, options, callback) {
        if (!options) {
            options = {};
        }

        var filterStr = options.filter || "";

        {
            var sourceGraphUri = Config.sources[source].graphUri;
            var sourceGraphUriFrom = Sparql_common.getFromStr(source, true, true);
            var importGraphUriFrom = Sparql_common.getFromStr(source, true, false);

            var query =
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "      SELECT   distinct ?prop ?sClass  ?oClass ?propLabel ?sClassLabel ?oClassLabel ?sparent ?oparent  ?sparentLabel ?oparentLabel \n" +
                sourceGraphUriFrom +
                " " +
                importGraphUriFrom +
                "  \n" +
                " WHERE {";

            query +=
                "      graph ?g2{\n" +
                "    ?sparent rdf:type ?stype filter (?stype in (owl:Class)) \n" +
                " optional { ?sparent rdfs:label ?sparentLabel}\n" +
                "    \n" +
                "  }\n" +
                "  graph ?g3{\n" +
                "      ?oparent rdf:type ?otype filter (?otype in (owl:Class))\n" +
                " optional { ?oparent rdfs:label ?oparentLabel}\n" +
                "  }\n" +
                "   graph <" +
                sourceGraphUri +
                ">  {\n" +
                "    ?s ?prop ?o.\n" +
                "     ?s rdf:type+ ?sparent.  \n" +
                "       ?o rdf:type+ ?oparent.  \n" +
                filterStr +
                "  }\n" +
                "    graph  ?g{\n" +
                "     \n" +
                "        ?prop  rdf:type  owl:ObjectProperty. optional{?prop rdfs:label ?propLabel} }\n" +
                "  } LIMIT 10000";

            let url = Config.sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                if (err) {
                    return callback(err);
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "sClass", "oClass"], { source: source });

                //   Config.ontologiesVocabularyModels[source].inferredClassModel = result.results.bindings;
                return callback(null, result.results.bindings);
            });
        }
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

            var queryNew =
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
                "filter(?sClass not in (owl:Class,owl:NamedIndividual,owl:Restriction)) \n" +
                " filter(?oClass not in (owl:Class,owl:NamedIndividual,owl:Restriction)) " +
                '  filter (!regex(str(?prop),"rdf","i"))\n' +
                "  filter (?s != ?o)\n" +
                "    }\n" +
                "    }\n" +
                "  }\n" +
                "\n" +
                "    }\n" +
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

    self.getInferredAnnotationProperties = function (source, options, callback) {
        if (!options) {
            options = {};
        }

        var metaDataProps = "&& ?prop not in (rdf:type,<http://purl.org/dc/terms/created>,<http://purl.org/dc/terms/creator>,<http://purl.org/dc/terms/source>)";
        if (options.withSLSmetadata) {
            metaDataProps = "&& ?prop not in (rdf:type)";
        }

        var sourceGraphUri = Config.sources[source].graphUri;
        if (!sourceGraphUri) {
            return callback("source " + source + " not declared");
        }
        var sourceGraphUriFrom = Sparql_common.getFromStr(source, false, true);
        var genericVocabsGraphUriFrom = "";
        for (var vocab in Config.basicVocabularies) {
            genericVocabsGraphUriFrom += " " + Sparql_common.getFromStr(vocab, false, false);
        }

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT   distinct ?class ?prop   " +
            sourceGraphUriFrom +
            " " +
            genericVocabsGraphUriFrom +
            "   where {\n" +
            " {?class rdfs:label ?classLabel.\n" +
            "    ?prop rdfs:label ?propLabel.\n" +
            "  }" +
            " { GRAPH <" +
            sourceGraphUri +
            "> {\n" +
            "    ?s rdf:type ?class\n" +
            "  }\n" +
            " }\n" +
            " {\n" +
            "   ?s ?prop ?o.\n" +
            "    ?prop rdf:type ?type. filter (?type in (rdf:Property,owl:AnnotationProperty)" +
            metaDataProps +
            ")\n" +
            "  }\n" +
            "}";
        let url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "class"]);

            //   Config.ontologiesVocabularyModels[source].inferredClassModel = result.results.bindings;
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
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
            if (err) {
                return callback(err);
            }

            //   Config.ontologiesVocabularyModels[source].inferredClassModel = result.results.bindings;
            return callback(null, result.results.bindings);
        });
    };

    return self;
})();

export default OntologyModels;

window.OntologyModels = OntologyModels;
