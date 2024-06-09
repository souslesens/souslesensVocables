import Axioms_editor from "./axioms_editor.js";

var Axioms_suggestions = (function() {
    var self = {};


    self.getManchesterParserSuggestions = function(selectedObject, callback) {
        var axiomText = Axioms_editor.getAxiomText() + " ";
        var selectedLabel = selectedObject.label;
        if (selectedObject.resourceType == "Class") {
            selectedLabel = "_" + selectedLabel;

        }
        axiomText += selectedLabel + " ";

console.log(axiomText)
        var options = {};
        const params = new URLSearchParams({
            source: Axioms_editor.currentSource,
            lastToken: axiomText,
            options: JSON.stringify(options)
        });


        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/suggestion?" + params.toString(),
            dataType: "json",

            success: function(data, _textStatus, _jqXHR) {
                var keywordSuggestions = [];
                var selectClasses = false;
                var selectProperties = false;
                data.forEach(function(item) {
                    if (item.match(/^_$/g)) {                        // remove _ and replace by Classes
                        selectClasses = true;
                        return;
                    } else if (item.match(/^[A-z]$/g)) { // remove alphabetic letters and replace by ObjectProperties
                        selectProperties = true;
                        return;
                    } else {
                        keywordSuggestions.push({ id: item, label: item });
                    }
                });

                if (selectClasses || selectProperties) {

                    if (Axioms_editor.axiomContext.lastResourceType == "Class") {
                        var classId = Axioms_editor.axiomContext.classes[Axioms_editor.axiomContext.currentClassIndex];
                        OntologyModels.getAllowedPropertiesBetweenNodes(Axioms_editor.currentSource, classId, null, function(err, result) {
                            if (err) {
                                return callback(err);
                            }
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
                            data = common.array.sort(data, "label");
                            data = keywordSuggestions.concat(data);
                            Axioms_editor.axiomContext.lastResourceType = "ObjectProperty";
                            return callback(null, data);

                        });
                    } else if (Axioms_editor.axiomContext.lastResourceType == "ObjectProperty") {
                        var propId = Axioms_editor.axiomContext.properties[Axioms_editor.axiomContext.currentPropertyIndex];
                        var elements = Axioms_editor.getAxiomElements();
                        OntologyModels.getPropertyDomainsAndRanges(Axioms_editor.currentSource, propId, "range", function(err, result) {
                            if (err) {
                                return callback(err);
                            }
                            var ranges = result.ranges;
                            var data = [];
                            for (var key in result.ranges) {
                                result.ranges[key].resourceType = "Class";
                                data.push(result.ranges[key]);
                            }

                            Axioms_editor.axiomContext.lastResourceType = "Class";
                            data = common.array.sort(data, "label");
                            data = keywordSuggestions.concat(data);
                            return callback(null, data);
                        });
                    }


                } else {

                    callback(null, keywordSuggestions);
                }
            },
            error(err) {
                callback(err.responseText);
            }
        });
    };

    self.getAxiomNextResourcesList = function(classId, propId, role, callback) {
        /*
         Classs1 and participatesIn some * - here the filtering criteria is the range of participantsIn, i.e., all processes.
 Class1 and participantsIn some (Class2 and *) - still the range of participantsIn, i.e., all processes. It needs to remember the context.
 Class1 and participantsIn some (Class2 and (realises only * - now the filtering will change to the range of realises - i.e., RealizableEnitities.
 Class1 and participantsIn some (Class2 and (realises only Class3) and *) - again switch back to the range of participantsIn
 Similarly for properties but with each cascading it needs to filter properties by matching the domain to the previous class.
 Classs1 and * - only properties whose domains are superclass of Class1 or the Class1 itself.
 .Class1 and participantsIn some (Class2 and (* - only properties whose domains are superclass of Class2 or the Class2 itself.
 Complex case:
 Class1 and participantsIn some (* - here they can insert class or properties - possible classes are filtered by range of participatesIn and properties filtered by the domain matching the range of participatesIn.


         */


        function getLastProp() {
            var lastProp = null;
            elements.forEach(function(item) {
                if (item.type == "ObjectProperty") {
                    lastProp = item.id;
                }
            });
            return lastProp;
        }

        function getLastClass() {
            var lastProp = null;
            elements.forEach(function(item) {
                if (item.type == "class") {
                    lastProp = item.id;
                }
            });
            return lastProp;
        }

        if (!classId) {
            var elements = Axioms_editor.getAxiomElements();
            OntologyModels.getPropertyDomainsAndRanges(Axioms_editor.currentSource, propId, "range", function(err, result) {
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

                Axioms_editor.axiomContext.lastResourceType = "Class";
                return callback(null, data);
            });

        } else {


            OntologyModels.getAllowedPropertiesBetweenNodes(Axioms_editor.currentSource, classId, null, function(err, result) {
                if (err) {
                    return callback(err);
                }
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
                data = common.array.sort(data, "label");
                Axioms_editor.axiomContext.lastResourceType = "ObjectProperty";
                return callback(null, data);

            });
        }
    };


    self.setAxiomContext = function() {


    };


    return self;
})
();
export default Axioms_suggestions;
window.Axioms_suggestions = Axioms_suggestions;



