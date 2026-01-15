import async from 'async';
import httpProxy from './httpProxy.js';
import request from 'request';
import fs from 'fs';
//const sources=require("../model/sources.js")

var OntologyModel = {
    instances: {},

    executeQuery: function (source, query, callback) {
        var serverUrl;
        var sourceObj = OntologyModel.Config.sources[source];
        if (sourceObj) serverUrl = sourceObj.sparql_server.url;
        else serverUrl = OntologyModel.Config.sparql_server.url;

        serverUrl += "?format=json&query=";
        var params = {
            auth: {
                user: OntologyModel.Config.sparql_server.user,
                pass: OntologyModel.Config.sparql_server.password,
                sendImmediately: false,
            },
            query: query,
        };

        var headers = {};
        headers["Accept"] = "application/sparql-results+json";
        headers["Content-Type"] = "application/x-www-form-urlencoded";

        httpProxy.post(serverUrl, headers, params, function (err, result) {
            if (err) return callback(err);
            callback(err, result);
        });
    },

    getOntologyModel: function (source, graphUri, callback) {
        if (OntologyModel.instances[source]) return callback(null, OntologyModel.instances[source]);

        var ontologyModel = {};
        var queryP = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

        ontologyModel = { graphUri: graphUri };

        graphUri = ontologyModel.graphUri;

        ontologyModel.constraints = {}; //range and domain
        ontologyModel.restrictions = {};
        ontologyModel.classes = {};
        ontologyModel.properties = [];

        var uniqueProperties = {};
        var propsWithoutDomain = [];
        var propsWithoutRange = [];
        var inversePropsMap = [];
        async.series(
            [
                function (callbackSeries) {
                    callbackSeries();
                },
                // set properties
                function (callbackSeries) {
                    var query =
                        queryP +
                        " SELECT distinct ?prop ?propLabel ?inverseProp ?superProperty from <" +
                        graphUri +
                        ">  WHERE {\n" +
                        "  ?prop ?p ?o " +
                        OntologyModel.util.getVariableLangLabel("prop", true, true) +
                        "optional{?prop owl:inverseOf ?inverseProp}" +
                        "optional{?prop rdfs:subPropertyOf ?superProperty}" +
                        " VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty owl:AnnotationProperty} }";

                    OntologyModel.executeQuery(source, query, function (err, result) {
                        //   Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        result.results.bindings.forEach(function (item) {
                            if (item.superProperty) {
                                var x = 3;
                            }
                            if (!uniqueProperties[item.prop.value]) {
                                uniqueProperties[item.prop.value] = 1;
                                ontologyModel.properties.push({
                                    id: item.prop.value,
                                    label: item.propLabel ? item.propLabel.value : OntologyModel.util.getLabelFromURI(item.prop.value),
                                    inverseProp: item.inverseProp ? item.inverseProp.value : null,
                                    superProp: item.superProperty ? item.superProperty.value : null,
                                });
                            }
                            if (item.inverseProp) {
                                inversePropsMap[item.prop.value] = item.inverseProp.value;

                                inversePropsMap[item.inverseProp.value] = item.prop.value;
                            }
                        });

                        callbackSeries();
                    });
                },
                // set model classes (if source not  declared in sources.json)
                function (callbackSeries) {
                    if (!OntologyModel.Config.basicVocabularies[source] && !!OntologyModel.Config.topLevelOntologies[source]) {
                        return callbackSeries();
                    }
                    var query =
                        queryP +
                        " select distinct ?sub ?subLabel FROM <" +
                        graphUri +
                        "> where{" +
                        " ?sub rdf:type ?class. " +
                        OntologyModel.util.getVariableLangLabel("sub", true, true) +
                        " VALUES ?class {owl:Class rdf:class rdfs:Class} filter( !isBlank(?sub))} order by ?sub";
                    OntologyModel.executeQuery(source, query, function (err, result) {
                        // Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            if (!ontologyModel.classes[item.sub.value]) {
                                ontologyModel.classes[item.sub.value] = {
                                    id: item.sub.value,
                                    label: item.subLabel ? item.subLabel.value : OntologyModel.util.getLabelFromURI(item.sub.value),
                                };
                            }
                        });
                        callbackSeries();
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
                        OntologyModel.util.getVariableLangLabel("domain", true, true) +
                        " }";

                    OntologyModel.executeQuery(source, query, function (err, result) {
                        // Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            if (!ontologyModel.constraints[item.prop.value]) {
                                ontologyModel.constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                            }
                            ontologyModel.constraints[item.prop.value].domain = item.domain.value;
                            ontologyModel.constraints[item.prop.value].domainLabel = item.domainLabel ? item.domainLabel.value : OntologyModel.util.getLabelFromURI(item.domain.value);
                        });
                        callbackSeries();
                    });
                },
                //set range constraints
                function (callbackSeries) {
                    var query =
                        queryP + " select distinct ?prop ?range FROM <" + graphUri + "> where{" + " ?prop rdfs:range ?range." + OntologyModel.util.getVariableLangLabel("range", true, true) + " }";
                    OntologyModel.executeQuery(source, query, function (err, result) {
                        //  Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            if (!ontologyModel.constraints[item.prop.value]) {
                                ontologyModel.constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                            }
                            ontologyModel.constraints[item.prop.value].range = item.range.value;
                            ontologyModel.constraints[item.prop.value].rangeLabel = item.rangeLabel ? item.rangeLabel.value : OntologyModel.util.getLabelFromURI(item.range.value);
                        });
                        callbackSeries();
                    });
                },

                // set restrictions constraints
                function (callbackSeries) {
                    // only relations  declared in sources.json
                    if (!OntologyModel.Config.sources[source]) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getObjectRestrictions(source, null, { withoutBlankNodes: 1, withoutImports: 1 }, function (err, result) {
                        result.forEach(function (item) {
                            var propLabel = item.propLabel ? item.propLabel.value : OntologyModel.util.getLabelFromURI(item.prop.value);
                            var domainLabel = item.subjectLabel ? item.subjectLabel.value : OntologyModel.util.getLabelFromURI(item.subject.value);
                            var rangeLabel = item.valueLabel ? item.valueLabel.value : OntologyModel.util.getLabelFromURI(item.value.value);
                            var propLabel = item.propLabel ? item.propLabel.value : OntologyModel.util.getLabelFromURI(item.prop.value);

                            if (!uniqueProperties[item.prop.value]) {
                                uniqueProperties[item.prop.value] = 1;
                                ontologyModel.properties.push({
                                    id: item.prop.value,
                                    label: propLabel,
                                });
                            }
                            if (!ontologyModel.restrictions[item.prop.value]) {
                                ontologyModel.restrictions[item.prop.value] = [];
                            }
                            ontologyModel.restrictions[item.prop.value].push({
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
                    /*
                    if (!Config.sources[source] || !Config.topLevelOntologies[source]) {
                        return callbackSeries();
                    }
                        */
                    if (!Config.sources[source]) {
                        return callbackSeries();
                    }
                    var constraints = ontologyModel.constraints;
                    ontologyModel.properties.forEach(function (prop) {
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
                    var props = propsWithoutDomain.concat(propsWithoutRange);
                    if (props.length == 0) return callbackSeries();
                    Sparql_OWL.getPropertiesInheritedConstraints(source, props, { withoutImports: 0 }, function (err, propsMap) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        // for (var propId in ontologyModel.properties) {
                        ontologyModel.properties.forEach(function (prop) {
                            var propId = prop.id;

                            if (propId == "http://rds.posccaesar.org/ontology/lis14/rdl/activeParticipantIn") var x = 3;
                            var inheritedConstaint = propsMap[propId];
                            if (inheritedConstaint) {
                                if (!ontologyModel.constraints[propId]) {
                                    ontologyModel.constraints[propId] = { domain: "", range: "" };
                                }

                                // inheritance but no overload of constraint
                                if (inheritedConstaint.domain && !ontologyModel.constraints[propId].domain) {
                                    ontologyModel.constraints[propId].domain = inheritedConstaint.domain;
                                    ontologyModel.constraints[propId].domainLabel = inheritedConstaint.domainLabel;
                                    ontologyModel.constraints[propId].domainParentProperty = inheritedConstaint.parentProp;
                                }

                                if (inheritedConstaint.range && !ontologyModel.constraints[propId].range) {
                                    ontologyModel.constraints[propId].range = inheritedConstaint.range;
                                    ontologyModel.constraints[propId].rangeLabel = inheritedConstaint.rangeLabel;
                                    ontologyModel.constraints[propId].rangeParentProperty = inheritedConstaint.parentProp;
                                }
                            }
                        });

                        return callbackSeries();
                    });
                },

                // set constraints prop label and superProp
                function (callbackSeries) {
                    ontologyModel.properties.forEach(function (property) {
                        if (ontologyModel.constraints[property.id]) {
                            ontologyModel.constraints[property.id].label = property.label;

                            ontologyModel.constraints[property.id].superProp = property.superProp;
                        }
                    });
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
                    for (var propId in ontologyModel.constraints) {
                        var constraint = ontologyModel.constraints[propId];
                        if (constraint.domain && classes.indexOf(constraint.domain) < 0) {
                            classes.push(constraint.domain);
                        }
                        if (constraint.range && classes.indexOf(constraint.range) < 0) {
                            classes.push(constraint.range);
                        }
                    }
                    if (classes.length == 0) return callbackSeries();
                    Sparql_OWL.getLabelsMapFromLabelsGraph(classes, function (err, labelsMap) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        for (var propId in ontologyModel.constraints) {
                            var constraint = ontologyModel.constraints[propId];
                            if (labelsMap[constraint.domain]) {
                                ontologyModel.constraints[propId].domainLabel = labelsMap[constraint.domain];
                            }
                            if (labelsMap[constraint.range]) {
                                ontologyModel.constraints[propId].rangeLabel = labelsMap[constraint.range];
                            }
                        }

                        return callbackSeries();
                    });

                    /*
var filter = OntologyModel.setFilter("id", classes);
Sparql_OWL.getDictionary(source, { lang: Config.default_lang, filter: filter }, null, function (err, result) {
  if (err) {
    return callbackSeries(err);
  }
  var labelsMap = {};
  result.forEach(function (item) {
    if (item.label) {
      labelsMap[item.id.value] = item.label.value;
    } else {
      labelsMap[item.id.value] = OntologyModel.util.getLabelFromURI(item.id.value);
    }
  });
  for (var propId in ontologyModel.constraints) {
    var constraint = ontologyModel.constraints[propId];
    if (labelsMap[constraint.domain]) {
      ontologyModel.constraints[propId].domainLabel = labelsMap[constraint.domain];
    }
    if (labelsMap[constraint.range]) {
      ontologyModel.constraints[propId].rangeLabel = labelsMap[constraint.range];
    }
  }

  return callbackSeries();
});*/
                },

                //register source in Config.sources
                function (callbackSeries) {
                    if (!Config.sources[source]) {
                        Config.sources[source] = { graphUri: graphUri, controllerName: Sparql_OWL, controller: Sparql_OWL, sparql_server: { url: Config.sparql_server.url } };
                    }
                    return callbackSeries();
                },
            ],
            function (err) {
                callbackEach(err);
            },
        );
    },

    setInversePropertiesConstaints: function (source, inversePropsMap) {
        for (var propId in inversePropsMap) {
            var propConstraints = ontologyModel.constraints[propId];
            var inversePropConstraints = ontologyModel.constraints[inversePropsMap[propId]];
            if (!propConstraints) {
                propConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                ontologyModel.constraints[propId] = propConstraints;
            }
            if (!inversePropConstraints) {
                inversePropConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                ontologyModel.constraints[inversePropsMap[propId]] = inversePropConstraints;
            }

            if (propConstraints.domain && !inversePropConstraints.range) {
                ontologyModel.constraints[inversePropsMap[propId]].range = propConstraints.domain;
                ontologyModel.constraints[inversePropsMap[propId]].rangeLabel = propConstraints.domainLabel;
            }
            if (propConstraints.range && !inversePropConstraints.domain) {
                ontologyModel.constraints[inversePropsMap[propId]].domain = propConstraints.range;
                ontologyModel.constraints[inversePropsMap[propId]].domainLabel = propConstraints.rangeLabel;
            }

            if (inversePropConstraints.domain && !propConstraints.range) {
                ontologyModel.constraints[propId].range = inversePropConstraints.domain;
                ontologyModel.constraints[propId].rangeLabel = inversePropConstraints.domainLabel;
            }
            if (inversePropConstraints.range && !propConstraints.domain) {
                ontologyModel.constraints[propId].domain = inversePropConstraints.range;
                ontologyModel.constraints[propId].domainLabel = inversePropConstraints.rangeLabel;
            }
        }
    },
    util: {
        getVariableLangLabel: function (variable, optional, skosPrefLabel) {
            var pred = "";
            if (skosPrefLabel) {
                pred = "|<http://www.w3.org/2004/02/skos/core#prefLabel>";
            }
            //     var str = "?" + variable + " rdfs:label" + pred + " ?" + variable + "Label. filter( lang(?" + variable + "Label)= '" + Config.default_lang + "' || !lang(?" + variable + "Label))";
            var str =
                "?" + variable + " rdfs:label" + pred + " ?" + variable + "Label. filter(regex( lang(?" + variable + "Label), '" + OntologyModel.Config.default_lang ||
                "en" + "') || !lang(?" + variable + "Label))";

            if (optional) {
                return " OPTIONAL {" + str + "} ";
            }
            return str;
        },
        getLabelFromURI: function (id) {
            const p = id.lastIndexOf("#");
            if (p > -1) {
                return id.substring(p + 1);
            } else {
                const p = id.lastIndexOf("/");
                return id.substring(p + 1);
            }
        },
    },

    initConfig: function () {
        const fs = require("fs");
        const path = require("path");
        OntologyModel.Config = JSON.parse("" + fs.readFileSync(path.resolve("../../config/mainConfig.json")));
        OntologyModel.Config.sources = JSON.parse("" + fs.readFileSync(path.resolve("../../config/sources.json")));

        OntologyModel.Config.default_lang = "en";
        OntologyModel.Config.topLevelOntologies = {
            IDO: { uriPattern: "lis14", prefix: "ido", prefixtarget: "http://rds.posccaesar.org/ontology/lis14/rdl/" },
            "ISO_15926-part-14_PCA": { uriPattern: "lis14", prefix: "part14", prefixtarget: "http://rds.posccaesar.org/ontology/lis14/rdl/" },
            BFO: { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },
            // "BFO-2020": { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },
            // "bfo.owl": { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },

            DOLCE: { uriPattern: "dul", prefix: "dul", prefixtarget: "http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#" },
            //   LML: { uriPattern: "lml", prefix: "lml", prefixtarget: "http://souslesens.org/ontology/lml/" },
        };

        OntologyModel.Config.basicVocabularies = {
            rdf: { graphUri: "https://www.w3.org/1999/02/22-rdf-syntax-ns" },
            rdfs: { graphUri: "https://www.w3.org/2000/01/rdf-schema" },
            owl: { graphUri: "https://www.w3.org/2002/07/owl" },
            "iof-av": { graphUri: "https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/" },
            skos: { graphUri: "http://www.w3.org/2004/02/skos/core/" },
        };
    },

    loadBasicVocabularies: function (callback) {
        OntologyModel.initConfig();

        var vocabs = Object.keys(OntologyModel.Config.basicVocabularies);
        async.eachSeries(vocabs, function (vocabLabel, callbackEach) {
            var vocabObj = OntologyModel.Config.basicVocabularies[vocabLabel];
            OntologyModel.getOntologyModel(vocabLabel, vocabObj.graphUri);
        });
    },
};

module.exports = OntologyModel;

OntologyModel.loadBasicVocabularies();
