import Axioms_editor from "./axioms_editor.js";

var Axioms_suggestions = (function () {
    var self = {};

    self.getManchesterParserSuggestions = function (selectedObject, callback) {
        var allSuggestions = [];
        var keywordSuggestions = [];
        var selectClasses = false;
        var selectProperties = false;
        async.series(
            [
                function (callbackSeries) {
                    //call sever for Manchester suggestions
                    var axiomText = Axioms_editor.getAxiomText() + " ";
                    var selectedLabel = selectedObject.label;
                    if (selectedObject.resourceType == "Class") {
                        selectedLabel = "_" + selectedLabel;
                    }
                    axiomText += selectedLabel + " ";
                    console.log(axiomText);

                    var options = {};
                    const params = new URLSearchParams({
                        source: Axioms_editor.currentSource,
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
                                    selectProperties = true;
                                    return;
                                } else {
                                    keywordSuggestions.push({ id: item, label: item });
                                }
                            });

                            callbackSeries();
                        },
                        error(err) {
                            callbackSeries(err.responseText);
                        },
                    });
                },

                function (callbackSeries) {
                    //get  properties for current class (properties withe domain this class)
                    if (!selectClasses) {
                        return callbackSeries();
                    }
                    var classId = Axioms_editor.axiomContext.classes[Axioms_editor.axiomContext.currentClassIndex];
                    self.getValidPropertiesForClass(classId, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        allSuggestions = allSuggestions.concat(result);

                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    ////get  classes for current property (classes wich are   range of the current property)
                    if (!selectProperties) {
                        return callbackSeries();
                    }
                    var propId = Axioms_editor.axiomContext.properties[Axioms_editor.axiomContext.currentPropertyIndex];
                    self.getValidClassesForProperty(propId, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        allSuggestions = allSuggestions.concat(result);
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                allSuggestions = keywordSuggestions.concat(allSuggestions);
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
    self.getValidClassesForProperty = function (propId, callback) {
        if (!propId) return callback(null, []);
        OntologyModels.getPropertyDomainsAndRanges(Axioms_editor.currentSource, propId, "range", function (err, result) {
            if (err) {
                return callback(err);
            }
            var ranges = result.ranges;
            var data = [];
            for (var key in result.ranges) {
                result.ranges[key].resourceType = "Class";
                data.push(result.ranges[key]);
            }

            data = common.array.sort(data, "label");

            return callback(null, data);
        });
    };

    self.getValidPropertiesForClass = function (classId, callback) {
        if (!classId) return callback(null, []);
        OntologyModels.getAllowedPropertiesBetweenNodes(Axioms_editor.currentSource, classId, null, { keepSuperClasses: 0 }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var role = "domain";
            var data = [];
            for (var prop in result.constraints) {
                if (role == "both") {
                    for (var prop in result.constraints.both) {
                        data.push({
                            id: prop,
                            label: result.constraints.both[prop].label,
                            resourceType: "ObjectProperty",
                        });
                    }
                }
                if (role == "domain") {
                    for (var prop in result.constraints.domain) {
                        data.push({
                            id: prop,
                            label: result.constraints.domain[prop].label,
                            resourceType: "ObjectProperty",
                        });
                    }
                }
                if (role == "range") {
                    for (var prop in result.constraints.range) {
                        data.push({
                            id: prop,
                            label: result.constraints.range[prop].label,
                            resourceType: "ObjectProperty",
                        });
                    }
                }
            }
            data = common.array.sort(data, "label");
            return callback(null, data);
        });
    };

    return self;
})();
export default Axioms_suggestions;
window.Axioms_suggestions = Axioms_suggestions;
