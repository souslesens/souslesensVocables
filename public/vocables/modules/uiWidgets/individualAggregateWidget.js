import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var IndividualAggregateWidget = (function () {
    var self = {};
    self.groupFunctions = ["COUNT", "SUM", "MAX", "MIN", "AVG", "concat"];

    self.showDialog = function (divId, loadClassesFn, validateFn, message) {
        self.validateFn = validateFn;
        self.functionVarClasses = [];
        self.groupByClasses = [];

        if (!divId) {
            divId = "smallDialogDiv";
            self.divId = divId;
            $("#smallDialogDiv").dialog("open");
        }
        $("#" + divId).load("snippets/individualAggregateWidget.html", function () {
            loadClassesFn(function (data) {
                self.groupByClassesMap = {};
                self.functionVarClassesMap = {};
                for (var key in data) {
                    var item = data[key];

                    var otherproperties = item.data.nonObjectProperties;
                    if (otherproperties) {
                        var groupByTypes = [
                            "http://www.w3.org/2001/XMLSchema#string",
                            "http://www.w3.org/2001/XMLSchema#date",
                            "http://www.w3.org/2001/XMLSchema#datetime",
                            "http://www.w3.org/2000/01/rdf-schema#Literal",
                        ];
                        otherproperties.forEach(function (prop) {
                            var label = item.label + "_" + prop.label;
                            var obj = { label: label, item: item, prop: prop };
                            if (groupByTypes.indexOf(prop.datatype) > -1) {
                                self.groupByClassesMap[label] = obj;
                            } else {
                                self.functionVarClassesMap[label] = obj;
                            }
                        });
                    }

                    /*  if (item.data.datatype) {
                          self.functionVarClasses.push(item);
                      } else {
                          self.groupByClasses.push(item);
                      }*/
                }
                common.fillSelectOptions("individualAggregate_groupBySelect", Object.keys(self.groupByClassesMap), null);

                common.fillSelectOptions("individualAggregate_groupFunctionSelect", self.groupFunctions, null);
                if (message) {
                    $("#individualAggregate_messageDiv").html(message);
                }
            });
        });
    };

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

    self.onOKbutton = function () {
        var groupByObj = self.groupByClassesMap[$("#individualAggregate_groupBySelect").val()];
        var groupFunctions = $("#individualAggregate_groupFunctionSelect").val();
        var value = $("#individualAggregate_functionVariableSelect").val();
        var fnVarObj = self.functionVarClassesMap[value] || self.groupByClassesMap[value];

        var selectStr = "";
        var groupByStr = "";
        var whereStr = "";

        function getWhereClause(obj) {
            return "?" + obj.item.label + " <" + obj.prop.id + "> " + "?" + Sparql_common.formatStringForTriple(obj.label);
        }

        whereStr += getWhereClause(groupByObj);
        selectStr += " ?" + groupByObj.label + "   ";
        groupByStr += " ?" + groupByObj.label + "   ";

        groupFunctions.forEach(function (fn) {
            var fnVar = Sparql_common.formatStringForTriple(fnVarObj.label, true);

            if (fn == "concat") {
                selectStr += "(GROUP_CONCAT(distinct ?" + fnVar + ';SEPARATOR=",") AS ?concat_' + fnVar + ")";
            } else if (fn == "COUNT") {
                selectStr += " (" + fn + "(distinct ?" + fnVar + ") as ?" + fn + "_" + fnVar + ")";
            } else {
                selectStr += " (" + fn + "(distinct ?" + fnVar + ") as ?" + fn + "_" + fnVar + ")";
            }
        });

        var aggregateClauses = { select: selectStr, groupBy: groupByStr, where: whereStr };

        $("#" + self.divId).dialog("close");
        if (self.validateFn) {
            return self.validateFn(null, aggregateClauses);
        }
    };

    return self;
})();
export default IndividualAggregateWidget;
window.IndividualAggregateWidget = IndividualAggregateWidget;
