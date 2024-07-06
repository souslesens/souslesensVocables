import Axiom_editor from "./axiom_editor.js";

var Axioms_suggestions = (function() {
    var self = {};


    self.getValidResourceTypes = function(selectedObject, allClasses, allObjectProperties, callback) {
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
            source: Axiom_editor.currentSource,
            lastToken: axiomText,
            options: JSON.stringify(options)
        });


        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/suggestion?" + params.toString(),
            dataType: "json",

            success: function(data, _textStatus, _jqXHR) {
                data.forEach(function(item) {
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
                    keywordSuggestions: keywordSuggestions
                });
            },
            error(err) {
                callback(err.responseText);
            }
        });
    };


    self.getManchesterParserSuggestions = function(selectedObject, allClasses, allObjectProperties, callback) {
        self.currentObject = selectedObject;
        var allSuggestions = [];
        var keywordSuggestions = [];
        var selectClasses = allClasses;
        var selectProperties = allObjectProperties;
        async.series(
            [
                function(callbackSeries) {

                    self.getValidResourceTypes(selectedObject, allClasses, allObjectProperties, function(err, result) {
                        if (err) {
                            return callbackSeries(err.responseText);
                        }
                        selectClasses = result.selectClasses;
                        selectProperties = result.selectProperties;
                        keywordSuggestions = result.keywordSuggestions;

                        callbackSeries();

                    });
                },

                function(callbackSeries) {
                    //get  properties for current class (properties withe domain this class)
                    if (!selectProperties) {
                        return callbackSeries();
                    }
                    var index = Math.max(Axiom_editor.axiomContext.currentClassIndex, 0);
                    var classId = Axiom_editor.axiomContext.classes[index];
                    if (!classId || allObjectProperties) {
                        var props = [];
                        Axiom_editor.getAllProperties().forEach(function(item) {
                            if (item.resourceType == "ObjectProperty") {
                                props.push(item);
                            }
                        });
                        allSuggestions = allSuggestions.concat(props);

                        return callbackSeries();
                    }
                    self.getValidPropertiesForClass(classId, function(err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        allSuggestions = allSuggestions.concat(result);

                        callbackSeries();
                    });
                },
                function(callbackSeries) {
                    ////get  classes for current property (classes wich are   range of the current property)
                    if (!selectClasses) {
                        return callbackSeries();
                    }
                    var index = Math.max(Axiom_editor.axiomContext.currentPropertyIndex, 0);
                    var propId = Axiom_editor.axiomContext.properties[index];

                    if (!propId || allClasses) {
                        var classes = [];
                        Axiom_editor.getAllClasses().forEach(function(item) {
                            if (item.resourceType == "Class") {
                                classes.push(item);
                            }
                        });
                        allSuggestions = allSuggestions.concat(classes);

                        return callbackSeries();
                    }


                    self.getValidClassesForProperty(propId, function(err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        allSuggestions = allSuggestions.concat(result);
                        callbackSeries();
                    });
                }
            ],
            function(err) {
                allSuggestions = keywordSuggestions.concat(allSuggestions);
                allSuggestions.selectClasses=selectClasses
                allSuggestions.selectProperties=selectProperties

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
    self.getValidClassesForProperty = function(propId, callback) {
        if (!propId) {
            return callback(null, []);
        }
        OntologyModels.getPropertyDomainsAndRanges(Axiom_editor.currentSource, propId, "range", function(err, result) {
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

    self.getValidPropertiesForClass = function(classId, callback) {
        if (!classId) {
            return callback(null, []);
        }


        OntologyModels.getAllowedPropertiesBetweenNodes(Axiom_editor.currentSource, classId, null, { keepSuperClasses: true }, function(err, result) {
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
                            resourceType: "ObjectProperty"
                        });
                    }
                }
                if (role == "domain") {

                    for (var prop in result.constraints.domain) {
                        data.push({
                            id: prop,
                            label: result.constraints.domain[prop].label,
                            resourceType: "ObjectProperty"
                        });

                    }
                }
                if (role == "range") {
                    for (var prop in result.constraints.range) {
                        data.push({
                            id: prop,
                            label: result.constraints.range[prop].label,
                            resourceType: "ObjectProperty"
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
