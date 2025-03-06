import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

/**
 * Module for managing individual aggregate queries in the KGquery tool.
 * Provides functionality to create and configure aggregate functions on query variables.
 * @module IndividualAggregateWidget
 */
var IndividualAggregateWidget = (function () {
    var self = {};
    self.groupFunctions = ["COUNT", "SUM", "MAX", "MIN", "AVG", "concat"];

    /**
     * Displays the aggregate configuration dialog.
     * @function
     * @name showDialog
     * @memberof IndividualAggregateWidget
     * @param {string} [divId="smallDialogDiv"] - The ID of the dialog container element
     * @param {Function} loadClassesFn - Function to load available classes for aggregation
     * @param {Function} validateFn - Function to validate and process the aggregate configuration
     * @param {string} [message] - Optional message to display in the dialog
     * @returns {void}
     */
    self.showDialog = function (divId, loadClassesFn, validateFn, message) {
        self.validateFn = validateFn;
        self.functionVarClasses = [];
        self.groupByClasses = [];

        if (!divId) {
            divId = "smallDialogDiv";
            self.divId = divId;
        }
        $("#" + divId).load("modules/tools/KGquery/html/individualAggregateWidget.html", function () {
            $("#" + divId).dialog("open");
            loadClassesFn(function (data) {
                self.groupByClassesMap = {};
                self.functionVarClassesMap = {};
                self.allProperties = {};
                for (var key in data) {
                    var item = data[key];

                    if (item.data.nonObjectProperties) {
                        var groupByTypes = [
                            "http://www.w3.org/2001/XMLSchema#string",
                            "http://www.w3.org/2001/XMLSchema#date",
                            "http://www.w3.org/2001/XMLSchema#dateTime",
                            "http://www.w3.org/2000/01/rdf-schema#Literal",
                        ];

                        item.data.nonObjectProperties.forEach(function (prop) {
                            var label = (item.alias || item.label) + "_" + prop.label;

                            var obj = { label: label, item: item, prop: prop, classLabel: item.data.label };

                            self.allProperties[label] = obj;
                            if (groupByTypes.indexOf(prop.datatype) > -1) {
                                self.groupByClassesMap[label] = obj;
                            } else {
                                self.functionVarClassesMap[label] = obj;
                            }
                        });
                    }
                }
                common.fillSelectOptions("individualAggregate_groupBySelect", Object.keys(self.groupByClassesMap), null);

                common.fillSelectOptions("individualAggregate_groupFunctionSelect", self.groupFunctions, null);
                if (message) {
                    $("#individualAggregate_messageDiv").html(message);
                }
            });
        });
    };

    /**
     * Handles selection of group functions.
     * Updates available variables based on the selected function.
     * @function
     * @name onGroupFunctionSelect
     * @memberof IndividualAggregateWidget
     * @param {string} fn - The selected group function
     * @returns {void}
     */
    self.onGroupFunctionSelect = function (fn) {
        var allVars = Object.keys(self.groupByClassesMap).concat(Object.keys(self.functionVarClassesMap));
        if (fn == "concat") {
            common.fillSelectOptions("individualAggregate_functionVariableSelect", allVars, null);
        } else if (fn == "COUNT") {
            common.fillSelectOptions("individualAggregate_functionVariableSelect", allVars, null);
        } else {
            common.fillSelectOptions("individualAggregate_functionVariableSelect", Object.keys(self.functionVarClassesMap), null);
        }
    };

    /**
     * Handles the OK button click in the dialog.
     * Processes the selected aggregation settings and calls the validation function.
     * @function
     * @name onOKbutton
     * @memberof IndividualAggregateWidget
     * @returns {void}
     */
    self.onOKbutton = function () {
        var groupByObj = self.groupByClassesMap[$("#individualAggregate_groupBySelect").val()];
        var groupFunctions = $("#individualAggregate_groupFunctionSelect").val();
        var value = $("#individualAggregate_functionVariableSelect").val();
        var fnVarObj = self.functionVarClassesMap[value] || self.groupByClassesMap[value];

        var selectStr = "";
        var groupByStr = "";
        var whereStr = "";

        function getWhereClause(obj) {
            return "?" + obj.item.label + " <" + obj.prop.id + "> " + "?" + Sparql_common.formatStringForTriple(obj.label) + ". ";
        }

        whereStr += getWhereClause(groupByObj);
        selectStr += " ?" + groupByObj.label; // + " ?" + groupByObj.classLabel + "  ";
        groupByStr += " ?" + groupByObj.label; //+ " ?" + groupByObj.classLabel + "  ";
        var groupByPredicates = {};
        groupByPredicates[groupByObj.label] = self.allProperties[groupByObj.label];
        groupFunctions.forEach(function (fn) {
            var fnVar = Sparql_common.formatStringForTriple(fnVarObj.label, true);

            if (fn == "concat") {
                selectStr += "(GROUP_CONCAT(distinct ?" + fnVar + ';SEPARATOR=",") AS ?concat_' + fnVar + ")";
            } else if (fn == "COUNT") {
                selectStr += " (" + fn + "(distinct ?" + fnVar + ") as ?" + fn + "_" + fnVar + ")";
            } else {
                selectStr += " (" + fn + " (?" + fnVar + ") as ?" + fn + "_" + fnVar + ")";
            }
            groupByPredicates[fnVar] = self.allProperties[fnVar];
        });

        var aggregateClauses = { select: selectStr, groupBy: groupByStr, where: whereStr, groupByPredicates: groupByPredicates };

        $("#" + self.divId).dialog("close");
        if (self.validateFn) {
            return self.validateFn(null, aggregateClauses);
        }
    };

    return self;
})();
export default IndividualAggregateWidget;
window.IndividualAggregateWidget = IndividualAggregateWidget;
