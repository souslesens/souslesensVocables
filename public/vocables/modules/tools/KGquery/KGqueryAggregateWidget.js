import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";

var KGqueryAggregateWidget = (function () {
    var self = {};
    self.groupFunctions = { COUNT: 1, SUM: 1, MAX: 1, MIN: 1, AVG: 1, concat: 1 };

    self.showDialog = function (divId, loadClassesFn, validateFn, message) {
        self.validateFn = validateFn;
        self.functionVarClasses = [];
        self.groupByClasses = [];

        if (!divId) {
            divId = "smallDialogDiv";
            self.divId = divId;
        }
        $("#" + divId).load("modules/tools/KGquery/html/KGqueryAggregateWidget.html", function () {
            $("#" + divId).dialog("open");
            $("#" + divId).dialog("option", "title", "Aggregate Qyery");
            loadClassesFn(function (data) {
                self.groupByVarsMap = {};
                self.numericVarsMap = {};
                self.allProperties = {};
                for (var key in data) {
                    var item = data[key];

                    if (item.data.nonObjectProperties) {
                        var groupByTypes = [
                            "http://www.w3.org/2001/XMLSchema#string",
                            "http://www.w3.org/2001/XMLSchema#date",
                            "http://www.w3.org/2001/XMLSchema#dateTime",
                            "http://www.w3.org/2000/01/rdf-schema#Literal",
                            "http://www.w3.org/2001/XMLSchema#int",
                            "http://www.w3.org/2001/XMLSchema#integer",
                        ];
                        var numericGroups = [
                            "http://www.w3.org/2001/XMLSchema#int",
                            "http://www.w3.org/2001/XMLSchema#integer",
                            "http://www.w3.org/2001/XMLSchema#float",
                            "http://www.w3.org/2001/XMLSchema#decimal",
                            "http://www.w3.org/2001/XMLSchema#long",
                        ];

                        item.data.nonObjectProperties.forEach(function (prop) {
                            var label = (item.alias || item.label) + "_" + prop.label;

                            var obj = { label: label, item: item, prop: prop, classLabel: item.data.label };

                            self.allProperties[label] = obj;
                            if (groupByTypes.indexOf(prop.datatype) > -1) {
                                self.groupByVarsMap[label] = obj;
                            }
                            if (numericGroups.indexOf(prop.datatype) > -1) {
                                self.numericVarsMap[label] = obj;
                            }
                        });
                    }
                }

                self.loadJstree(self.allProperties, "KGqueryAggregate_groupBySelect", { withCheckboxes: true, tie_selection: true });

                var options = {
                    selectTreeNodeFn: function (event, obj) {
                        var groupFnsMap = {};
                        if (self.numericVarsMap[obj.node.label]) {
                            groupFnsMap = self.groupFunctions;
                        } else {
                            groupFnsMap = { COUNT: 1, concat: 1 };
                        }
                        self.loadJstree(groupFnsMap, "KGqueryAggregate_groupFunctionSelect", { withCheckboxes: true, tie_selection: true });
                    },
                };
                self.loadJstree(self.allProperties, "KGqueryAggregate_functionVariableSelect", options);

                /*   var options = {
                    selectTreeNodeFn: function (event, obj) {
                        if (obj.node.id == "concat" || obj.node.id == "COUNT") {
                            self.loadJstree(self.allVarsMap, "KGqueryAggregate_functionVariableSelect")
                        } else {
                            self.loadJstree(self.numericVarsMap, "KGqueryAggregate_functionVariableSelect")
                        }

                    },
                  withCheckboxes : true,
                    tie_selection:true,

                }
                self.loadJstree(self.groupFunctions, "KGqueryAggregate_groupFunctionSelect", options)*/

                //  common.fillSelectOptions("KGqueryAggregate_groupFunctionSelect", self.groupFunctions, null);
                if (false && message) {
                    $("#KGqueryAggregate_messageDiv").html(message);
                }
            });

            self.allVarsMap = {};
            for (var key in self.groupByVarsMap) {
                self.allVarsMap[key] = self.groupByVarsMap[key];
            }
            for (var key in self.numericVarsMap) {
                self.allVarsMap[key] = self.numericVarsMap[key];
            }
        });
    };

    self.onOKbutton = function () {
        var groupByNodes = [];
        $("#KGqueryAggregate_groupBySelect")
            .jstree("get_checked")
            .forEach(function (nodeId) {
                groupByNodes.push(self.groupByVarsMap[nodeId]);
            });
        var functionNodes = [];
        $("#KGqueryAggregate_groupFunctionSelect")
            .jstree("get_checked")
            .forEach(function (nodeId) {
                functionNodes.push(nodeId);
            });

        var groupFnVars = [];
        $("#KGqueryAggregate_functionVariableSelect")
            .jstree("get_selected")
            .forEach(function (nodeId) {
                groupFnVars.push(self.allVarsMap[nodeId]);
            });

        var error = "";
        if (groupByNodes.length == 0) {
            error += "missing groupBy statement";
        }
        if (functionNodes.length == 0) {
            error += "missing group function ";
        }
        if (functionNodes.length == 0) {
            error += "missing group function  variable";
        }
        if (error) {
            return alert(error);
        }

        //  var groupByObj = self.groupByVarsMap[$("#KGqueryAggregate_groupBySelect").val()];
        //  var groupFunctions = $("#KGqueryAggregate_groupFunctionSelect").val();

        // var fnVarObj = self.numericVarsMap[value] || self.groupByVarsMap[value];

        var selectStr = "";
        var groupByStr = "";
        var whereStr = "";
        var orderByStr = "";

        function getWhereClause(obj) {
            return "?" + Sparql_common.formatStringForTriple(obj.item.label, true) + " <" + obj.prop.id + "> " + "?" + Sparql_common.formatStringForTriple(obj.label, true) + ".\n ";
        }

        groupByNodes.forEach(function (node) {
            whereStr += getWhereClause(node);
            selectStr += " ?" + Sparql_common.formatStringForTriple(node.label, true);
            groupByStr += " ?" + Sparql_common.formatStringForTriple(node.label, true);// + " ?" +
        });

        whereStr += getWhereClause(groupFnVars[0]);

        functionNodes.forEach(function (fn, index) {
            var fnVar = Sparql_common.formatStringForTriple(groupFnVars[0].label, true);

            if (fn == "concat") {
                selectStr += "(GROUP_CONCAT(distinct ?" + fnVar + ';SEPARATOR=",") AS ?concat_' + fnVar + ")";
                if (index == 0) orderByStr += "?concat_" + fnVar + " ";
            } else if (fn == "COUNT") {
                selectStr += " (" + fn + "(distinct ?" + fnVar + ") as ?" + fn + "_" + fnVar + ")";
                if (index == 0) orderByStr += "?" + fn + "_" + fnVar + " ";
            } else {
                selectStr += " (" + fn + " (?" + fnVar + ") as ?" + fn + "_" + fnVar + ")";
                if (index == 0) orderByStr += "?" + fn + "_" + fnVar + " ";
            }
        });

        var aggregateClauses = {
            select: selectStr,
            groupBy: groupByStr,
            where: whereStr,
            orderBy: orderByStr,
        };

        $("#" + self.divId).dialog("close");
        $("#" + "smallDialogDiv").dialog("option", "title", "");
        if (self.validateFn) {
            return self.validateFn(null, aggregateClauses);
        }
    };

    self.loadJstree = function (dataMap, divId, options) {
        var jstreeData = [];
        for (var key in dataMap) {
            jstreeData.push({
                id: key,
                text: key,
                parent: "#",
            });
        }
        if (!options) {
            options = {};
        }
        options.openAll = true;
        JstreeWidget.loadJsTree(divId, jstreeData, options);
    };

    return self;
})();
export default KGqueryAggregateWidget;
window.KGqueryAggregateWidget = KGqueryAggregateWidget;
