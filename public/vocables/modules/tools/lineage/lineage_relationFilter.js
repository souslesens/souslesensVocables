import common from "../../shared/common.js";

self.lineageVisjsGraph;
import PromptedSelectWidget from "../../uiWidgets/promptedSelectWidget.js";

/**
 * @module Lineage_relationFilter
 * @category Lineage
 * This module provides functionalities for filtering relations in the lineage tool.
 * It includes functions for displaying the filter UI, handling role selection,
 * and adding filters based on selected properties and values.
 * @namespace lineage
 */
var Lineage_relationFilter = (function () {
    var self = {};
    var restrictions = null;
    var constraints = null;

    /**
     * Displays the UI for adding a filter to a relation.
     * @function
     * @name showAddFilterDiv
     * @memberof lineage.Lineage_relationFilter
     * @param {boolean} clear - Indicates whether to reset the current property.
     * @returns {void}
     */
    self.showAddFilterDiv = function (clear) {
        if (clear) {
            self.currentProperty = null;
        }
        $("#Lineage_relation_constraints").html("");
        $("#Lineage_relation_filterTypeSelect").val("");
        $("#Lineage_relation_filterVocabularySelect").val("");
        $("#lineageQuery_uriValueDiv").css("display", "none");
        $("#lineageQuery_literalValueDiv").css("display", "none");
        $("#Lineage_relation_filterText").css("display", "none");
        $("#lineageQuery_addFilterButton").prop("disabled", true);
        var propStr = "";
        if (self.currentProperty) {
            propStr = self.currentProperty.vocabulary + "." + self.currentProperty.label + "<br>";
        }
        $("#lineageQuery_value").keypress(function (e) {
            if (e.which == 13) {
                var str = $("#lineageQuery_value").val();
                if (str.length > 0) {
                    Lineage_relationFilter.addFilter();
                }
            }
        });

        $("#lineageRelations_filterDiv").css("display", "flex");

        self.domainValue = "";
        self.rangeValue = "";
        self.domain = null;
        self.range = null;

        self.ObjectsTypesMap = {
            any: ["String", "Date", "Number", "owl:Class", "rdf:Bag", "owl:NamedIndividual", "owl:ObjectProperty", "owl:DataTypeProperty"],
            Literal: ["String", "Date", "Number"],
            Resource: ["owl:Class", "rdf:Bag", "owl:NamedIndividual"],
            Class: ["owl:Class"],
            Property: ["owl:ObjectProperty", "owl:DataTypeProperty"],
        };

        self.operators = {
            String: ["contains", "not contains", "="],
            Number: ["=", "!=", "<", "<=", ">", ">="],
        };

        function getHtmlLink(label, uri) {
            if (label == "any") {
                return label;
            }
            var target = "";
            if (!Config.basicVocabularies[self.currentProperty.vocabulary]) {
                target = "_slsvCallback";
            }
            return "<a href='" + uri + "' target='" + target + "'>" + label + "</a>";
        }

        if (self.currentProperty && Config.ontologiesVocabularyModels[self.currentProperty.vocabulary]) {
            restrictions = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].restrictions;
            constraints = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].constraints;

            var suffix = "";
            var domainLabel = "any";
            var rangeLabel = "any";

            if (restrictions[self.currentProperty.id]) {
                suffix = " Restr.";
                var str = "<table><tr><td>Domain</td><td>range</td></tr>";
                self.domain = [];
                self.range = [];
                restrictions[self.currentProperty.id].forEach(function (restriction) {
                    self.domain.push({ id: restriction.domain, label: restriction.domainLabel });
                    self.range.push({ id: restriction.range, label: restriction.rangeLabel });
                    domainLabel = restriction.domainLabel;
                    rangeLabel = restriction.rangeLabel;
                    str += "<tr><td>" + domainLabel + "</td><td>" + rangeLabel + "</td></tr>";
                });
                str += "</table>";

                $("#Lineage_relation_constraints").html("<b>" + self.currentProperty.label + "</b>" + str);
            } else if (constraints[self.currentProperty.id]) {
                self.domain = constraints[self.currentProperty.id].domain;
                self.range = constraints[self.currentProperty.id].range;

                if (self.domain) {
                    if (Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.domain]) {
                        domainLabel = self.currentProperty.vocabulary + ":" + Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.domain].label;
                    } else {
                        domainLabel = self.domain;
                    }
                }

                if (self.range) {
                    if (Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.range]) {
                        var rangeLabel = self.currentProperty.vocabulary + ":" + Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.range].label;
                    } else {
                        rangeLabel = self.range;
                    }
                }
                $("#Lineage_relation_constraints").html(
                    "<b>" + self.currentProperty.label + "</b>" + "<br> Domain :" + getHtmlLink(domainLabel, self.domain) + "<br> Range :" + getHtmlLink(rangeLabel, self.range),
                );
            }
        }
        $("#Lineage_relation_property").html(propStr);
    };

    /**
     * Handles the selection of a role type (subject or object) for the filter.
     * @function
     * @name onSelectRoleType
     * @memberof lineage.Lineage_relationFilter
     * @param {string} role - The selected role ("subject" or "object").
     * @returns {void}
     */
    self.onSelectRoleType = function (role) {
        self.currentResourceFilterRole = role;
        $("#lineage_relation_filterRole").html(role);

        if (!self.currentProperty) {
            return common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap["any"], false);
        }

        var types = Object.keys(self.ObjectsTypesMap);

        var ok = false;

        if (restrictions[self.currentProperty.id]) {
            type = "Resource";
            common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap[type], false);
        } else {
            for (var type in self.ObjectsTypesMap) {
                if ((role == "subject" && self.domain && self.domain.indexOf(type) > -1) || (role == "object" && self.range && self.range.indexOf(type) > -1)) {
                    ok = true;
                    common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap[type], false);
                }
            }
            if (!ok) {
                common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap["any"], false);
            }
        }
    };

    /**
     * Applies specific formatting to the selected value based on its type.
     * @function
     * @name onCommonUIWidgetSelectObjectValue
     * @memberof lineage.Lineage_relationFilter
     * @param {string} value - The selected value.
     * @returns {void}
     */
    self.onCommonUIWidgetSelectObjectValue = function (value) {
        if (value.indexOf("xsd") == 0) {
            if (value == "xsd:dateTime") {
                dateWidget.setDatePickerOnInput("editPredicate_objectValue");
            } else {
                $("#editPredicate_objectValue").val(value);
            }
        }
    };

    /**
     * Adds a filter based on the selected property and value.
     * @function
     * @name addFilter
     * @memberof lineage.Lineage_relationFilter
     * @returns {void}
     */
    self.addFilter = function () {
        var role = $("#lineage_relation_filterRoleSelect2").val();
        if (!role) role = "subject";
        var property = PredicatesSelectorWidget.getSelectedProperty();

        var filter = PredicatesSelectorWidget.getSparqlFilter(role);

        if (!filter) {
            return alert("select a property and  an object");
        }

        var text = $("#lineage_relationIndividuals_filterTA").val();
        $("#lineage_relationIndividuals_filterTA").val(text + filter);
    };

    return self;
})();

export default Lineage_relationFilter;

window.Lineage_relationFilter = Lineage_relationFilter;
