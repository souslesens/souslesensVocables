import Sparql_OWL from "./../../sparqlProxies/sparql_OWL.js";
import Sparql_common from "./../../sparqlProxies/sparql_common.js";

var Lineage_upperOntologies = (function () {
    var self = {};
    self.objectPropertiesMap = {};
    self.getAuthorizedProperties = function (sourceLabel, upperOntologyDomains, upperOntologyRanges, callback) {
        self.getUpperOntologyObjectPropertiesDescription(sourceLabel, false, function (err, allProps) {
            if (err) return alert(err);

            let props = {};

            var subProposMap = {};

            for (var propId in allProps) {
                var prop = allProps[propId];
                var subProps = [prop.prop].concat(prop.subProps);
                subProps.forEach(function (subPropId) {
                    var item = allProps[subPropId];

                    let type = "";
                    let ok = false;
                    if (!item.range && item.domain && upperOntologyDomains[item.domain]) {
                        type = "D";
                        ok = true;
                    } else if (!item.domain && item.range && upperOntologyRanges[item.range]) {
                        type = "R";
                        ok = true;
                    } else if (item.domain && item.range && upperOntologyDomains[item.domain] && upperOntologyRanges[item.range]) {
                        type = "DR";
                        ok = true;
                    } else {
                    }
                    if (ok) {
                        props[item.prop] = {
                            prop: item.prop,
                            label: item.propLabel,
                            type: type,
                            upperDomainLabel: upperOntologyDomains[item.domain],
                            upperRangeLabel: upperOntologyRanges[item.range],
                            upperDomain: item.domain,
                            upperRange: item.range,
                        };
                    }
                });

                if (prop.inverseProp) {
                    var inverseProp = allProps[prop.inverseProp];
                    if (inverseProp) {
                        var subProps = [inverseProp.prop].concat(inverseProp.subProps);
                        subProps.forEach(function (subPropId) {
                            var inverseItem = allProps[subPropId];
                            let type = "";
                            let ok = false;
                            if (inverseItem.range && !inverseItem.domain && upperOntologyDomains[inverseItem.range]) {
                                type = "D";
                                ok = true;
                            } else if (inverseItem.domain && !inverseItem.range && upperOntologyRanges[inverseItem.domain]) {
                                type = "R";
                                ok = true;
                            } else if (inverseItem.domain && inverseItem.range && upperOntologyDomains[inverseItem.range] && upperOntologyRanges[inverseItem.domain]) {
                                type = "DR";
                                ok = true;
                            }
                            if (ok) {
                                props[inverseItem.prop] = {
                                    prop: inverseItem.inverseProp,
                                    label: inverseItem.inversePropLabel,
                                    type: type,
                                    upperDomainLabel: upperOntologyDomains[inverseItem.range],
                                    upperRangeLabel: upperOntologyRanges[inverseItem.domain],
                                    upperDomain: inverseItem.range,
                                    upperRange: inverseItem.domain,
                                };
                            }
                        });
                    }
                }
            }
            return callback(null, props);
        });
    };

    self.getUpperOntologyObjectPropertiesDescription = function (sourceLabel, reload, callback) {
        if (!Lineage_upperOntologies.objectPropertiesMap) Lineage_upperOntologies.objectPropertiesMap = {};

        if (Lineage_upperOntologies.objectPropertiesMap[sourceLabel] && !reload && callback) return callback(null, Lineage_upperOntologies.objectPropertiesMap[sourceLabel]);

        Sparql_OWL.getInferredPropertiesDomainsAndRanges(sourceLabel, {}, function (err, result) {
            if (err) return callback(err);

            Lineage_upperOntologies.objectPropertiesMap[sourceLabel] = result;
            if (callback) return callback(err, result);
        });
    };

    self.getTopOntologyClasses = function (upperOntologySource, options, callback) {
        if (!options) options = {};
        var predicates = [];

        if (!options.filter) {
            options.type = "owl:Class";
        }
        options.selectGraph = true;
        options.lang = Config.default_lang;

        Sparql_OWL.getDictionary(upperOntologySource, options, null, function (err, result) {
            if (err) callback(err);

            var topLevelOntologyObjects = [];

            var prefix = Config.topLevelOntologies[Config.currentTopLevelOntology].prefix + ":";
            result.forEach(function (item) {
                if (item.id.type == "bnode") return;

                if (!item.label) item.label = { value: Sparql_common.getLabelFromURI(item.id.value) };

                topLevelOntologyObjects.push({ label: prefix + item.label.value, id: item.id.value, type: item.type.value });
            });
            topLevelOntologyObjects.sort(function (a, b) {
                if (!a.label || !b.label) return 0;
                if (a.label > b.label) return 1;
                if (a.label < b.label) return -1;
                return 0;
            });

            return callback(null, topLevelOntologyObjects);
        });
    };

    self.setPropertiesMapInverseProps = function (propsMap) {
        for (var prop in propsMap) {
            var propObj = propsMap[prop];

            if (propObj.inverseProp) {
                var inversPropObj = propsMap[propObj.inverseProp];
                if (inversPropObj) {
                    if (!inversPropObj.domain && propObj.range) {
                        propsMap[propObj.inverseProp].domain = propObj.range;
                        propsMap[propObj.inverseProp].domainLabel = propObj.rangeLabel;
                    }

                    if (!inversPropObj.range && propObj.domain) {
                        propsMap[propObj.inverseProp].range = propObj.domain;
                        propsMap[propObj.inverseProp].rangeLabel = propObj.domainLabel;
                    }
                }
            }
        }

        /*  var flatPropsMap = {};
        for (var prop in propsMap) {
            flatPropsMap[prop] = propsMap[prop];
            var propObj = propsMap[prop];

            if ( propObj.inverseProp) {

                flatPropsMap[propObj.inverseProp] = {
                    prop: propObj.inverseProp,
                    propLabel: propObj.inversePropLabel,
                    subProps: [],
                    domain: propObj.range,
                    domainLabel: propObj.rangeLabel,
                    range: propObj.domain,
                    rangeLabel: propObj.domainLabel,
                    inverseProp: prop,
                    inversePropLabel: propObj.propLabel,
                };
            }
        }*/
        return propsMap;
    };

    return self;
})();

export default Lineage_upperOntologies;

window.Lineage_upperOntologies = Lineage_upperOntologies;
