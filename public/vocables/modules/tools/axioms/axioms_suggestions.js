import Axiom_editor from "./axiom_editor.js";
import Axioms_manager from "./axioms_manager.js";

var Axioms_suggestions = (function () {
    var self = {};

    self.getValidResourceTypes = function (selectedObject, allClasses, allObjectProperties, callback) {
        self.currentObject = selectedObject;
        var selectClasses = allClasses;
        var selectProperties = allObjectProperties;
        var keywordSuggestions = [];

        //call sever for Manchester suggestions
        var axiomText = Axiom_editor.getAxiomText() + " ";
        var selectedLabel = selectedObject.label;
        if (selectedObject.resourceType == "Class") {
            selectedLabel = "_" + selectedLabel;
        }
        axiomText += selectedLabel + " ";

        var options = {};
        const params = new URLSearchParams({
            lastToken: axiomText,
            options: JSON.stringify(options),
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/suggestion?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                data.forEach(function (item) {
                    if (item.match(/^_$/g)) {
                        // remove _ and replace by Classes
                        selectClasses = true;
                        return;
                    } else if (item.match(/^[A-z]$/g)) {
                        // remove alphabetic letters and replace by ObjectProperties
                        if (selectedObject.id != "some" && selectedObject.id != "only") {
                            selectProperties = true;
                        }
                        return;
                    } else {
                        keywordSuggestions.push({ id: item, label: item });
                    }
                });

                callback(null, {
                    selectClasses: selectClasses,
                    selectProperties: selectProperties,
                    keywordSuggestions: keywordSuggestions,
                });
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };

    self.getManchesterParserSuggestions = function (selectedObject, allClasses, allObjectProperties, callback) {
        self.currentObject = selectedObject;
        var allSuggestions = [];
        var keywordSuggestions = [];
        var selectClasses = allClasses;
        var selectProperties = allObjectProperties;
        async.series(
            [
                function (callbackSeries) {
                    self.getValidResourceTypes(selectedObject, allClasses, allObjectProperties, function (err, result) {
                        if (err) {
                            return callbackSeries(err.responseText);
                        }
                        selectClasses = result.selectClasses;
                        selectProperties = result.selectProperties;
                        keywordSuggestions = result.keywordSuggestions;

                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    //get  properties for current class (properties withe domain this class)
                    if (!selectProperties) {
                        return callbackSeries();
                    }
                    var index = Math.max(Axiom_editor.axiomContext.currentClassIndex, 0);
                    var classId = Axiom_editor.axiomContext.classes[index];
                    if (!classId || allObjectProperties) {
                        var props = [];
                        Axioms_manager.getAllProperties().forEach(function (item) {
                            if (item.resourceType == "ObjectProperty") {
                                props.push(item);
                            }
                        });
                        allSuggestions = allSuggestions.concat(props);

                        return callbackSeries();
                    }
                    self.getValidPropertiesForClass(Axiom_editor.currentSource, classId, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        allSuggestions = allSuggestions.concat(result);

                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    ////get  classes for current property (classes wich are   range of the current property)
                    if (!selectClasses) {
                        return callbackSeries();
                    }
                    var index = Math.max(Axiom_editor.axiomContext.currentPropertyIndex, 0);
                    var propId = Axiom_editor.axiomContext.properties[index];

                    if (!propId || allClasses) {
                        var classes = [];
                        Axioms_manager.getAllClasses().forEach(function (item) {
                            if (item.resourceType == "Class") {
                                classes.push(item);
                            }
                        });
                        allSuggestions = allSuggestions.concat(classes);

                        return callbackSeries();
                    }

                    self.getValidClassesForProperty(Axiom_editor.currentSource, propId, "domain", function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        allSuggestions = allSuggestions.concat(result);
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                allSuggestions = keywordSuggestions.concat(allSuggestions);
                allSuggestions.selectClasses = selectClasses;
                allSuggestions.selectProperties = selectProperties;

                return callback(err, allSuggestions);
            }
        );
    };
    /**
     *
     *
     * @param propId
     * @param callback
     */
    self.getValidClassesForProperty = function (source, propId, role, callback) {
        if (!propId) {
            return callback(null, []);
        }
        OntologyModels.getPropertyDomainsAndRanges(source, propId, role, function (err, result) {
            if (err) {
                return callback(err);
            }
            var data = [];
            if (role == "range" || role == "rangeAndDomain") {
                var ranges = result.ranges;

                for (var key in result.ranges) {
                    result.ranges[key].resourceType = "Class";
                    data.push(result.ranges[key]);
                }
            }
            if (role == "domain" || role == "rangeAndDomain") {
                var domains = result.domains;
                for (var key in result.domains) {
                    result.domains[key].resourceType = "Class";
                    data.push(result.ranges[key]);
                }
            }

            data = common.array.sort(data, "label");

            return callback(null, data);
        });
    };
    self.getClassMatchingPropertiesRangeAndDomain = function (source, propId, domainClassId, rangeClassId, callback) {
        var role = "";
        if (domainClassId && rangeClassId) role = null;
        else if (domainClassId) {
            role = "range";
        } else if (rangeClassId) {
            role = "domain";
        }
        OntologyModels.getPropertyDomainsAndRanges(source, propId, role, function (err, result) {
            if (err) return callback(err.responseText);

            var data = [];

            if (role == "range" || role == null) {
                var ranges = result.ranges;
                for (var key in result.ranges) {
                    result.ranges[key].resourceType = "Class";
                    data.push(result.ranges[key]);
                }
            }
            if (role == "domain" || role == null) {
                var ranges = result.domains;
                for (var key in result.domains) {
                    result.domains[key].resourceType = "Class";
                    data.push(result.domains[key]);
                }
            }
            if (data.length == 0) {
                var allClasses = Axioms_manager.getAllClasses(NodeInfosAxioms.currentSource);
                return callback(null, allClasses);
            }
            data = common.array.sort(data, "label");
            return callback(null, data);
        });
    };

    self.getValidPropertiesForClasses = function (source, domainClassId, rangeClassId, options, callback) {
        if (!options) {
            options = {};
        }

        OntologyModels.getAllowedPropertiesBetweenNodes(source, domainClassId, rangeClassId, { keepSuperClasses: true }, function (err, result) {
            if (err) {
                return callback(err);
            }
            if(options.getAllProperties){
                //return toutes les proprietes
                
            }
            var data = [];

            for (var prop in result.constraints) {
                if (domainClassId && rangeClassId) {
                    for (var prop in result.constraints.both) {
                        data.push({
                            id: prop,
                            label: result.constraints.both[prop].label,
                            source: result.constraints.both[prop].source,
                            resourceType: "ObjectProperty",
                        });
                    }
                } else if (domainClassId) {
                    for (var prop in result.constraints.domain) {
                        data.push({
                            id: prop,
                            label: result.constraints.domain[prop].label,
                            source: result.constraints.domain[prop].source,
                            resourceType: "ObjectProperty",
                        });
                    }
                }
                if (rangeClassId) {
                    for (var prop in result.constraints.range) {
                        data.push({
                            id: prop,
                            label: result.constraints.range[prop].label,
                            source: result.constraints.range[prop].source,
                            resourceType: "ObjectProperty",
                        });
                    }
                } else {
                    for (var type in result.constraints) {
                        for (var prop in result.constraints[type]) {
                            data.push({
                                id: prop,
                                label: result.constraints[type][prop].label,
                                source: result.constraints[type][prop].source,
                                resourceType: "ObjectProperty",
                            });
                        }
                    }
                }
                if ((!domainClassId && !rangeClassId) || options.includesnoConstraintsProperties) {
                    for (var prop in result.constraints.noConstraints) {
                        data.push({
                            id: prop,
                            label: result.constraints.noConstraints[prop].label,
                            source: result.constraints.noConstraints[prop].source,
                            resourceType: "ObjectProperty",
                        });
                    }
                }
            }

            data = common.array.distinctValues(data, "id");
            data = common.array.sort(data, "label");
            return callback(null, data);
        });
    };

    return self;
})();
export default Axioms_suggestions;
window.Axioms_suggestions = Axioms_suggestions;
