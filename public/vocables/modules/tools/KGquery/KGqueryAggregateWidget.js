import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";

var KGqueryAggregateWidget = (function () {
    var self = {};
    self.groupFunctions = { COUNT: 1, SUM: 1, MAX: 1, MIN: 1, AVG: 1, concat: 1 };

    /**
     * It dynamically loads an aggregate query dialog, fetches class/property metadata, and
     * populates several jstree widgets for user selection. While it accomplishes its goal,
     * it mixes UI handling, data processing, and widget initialization in a single large callback
     * @function
     * @name showDialog
     * @memberof module:KGqueryAggregateWidget
     * @param {String} divId Target div id for the dialog; defaults to "smallDialogDiv" if falsy
     * @param {String} message optional message to display in the dialog
     * @param {function} loadClassesFn async function that provides class/property data via a callback
     * @param {function} validateFn Validation callback stored for later use
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
        $("#" + divId).load("modules/tools/KGquery/html/KGqueryAggregateWidget.html", function () {
            UI.openDialog(divId, { title: "Aggregate Query" });
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

                            var obj = { valueLabel: label, item: item, prop: prop, classLabel: item.data.label };

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
                        if (self.numericVarsMap[obj.node.text]) {
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

    /**
     * This handler assembles user‑selected grouping and aggregation options from several jstree widgets,
     * validates the selections, constructs aggregate query clauses, augments them with class‑filter
     * constraints, closes the UI dialog, and finally forwards the result to an optional validation callback
     * @function
     * @name onOKbutton
     * @memberof module:KGqueryAggregateWidget
     * @returns {void}
     */
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
        var aggregateClauses = self.getAggregateQueryClauses(groupByNodes, functionNodes, groupFnVars);

        KGquery.querySets.sets.forEach(function (set) {
            for (var key in set.classFiltersMap) {
                var filter = set.classFiltersMap[key].filter;
                var regex = /\?(\w+?)[^\w]/gm;
                var matches = filter.matchAll(regex);
                for (const match of matches) {
                    if (match) {
                        var property = match[1];
                    }
                }
                if (self.groupByVarsMap[property]) {
                    aggregateClauses.where += " ?" + set.classFiltersMap[key].class.label + " <" + self.groupByVarsMap[property].prop.id + "> ?" + property + ".\n";
                }
            }
        });

        $("#" + self.divId).dialog("close");
        $("#" + "smallDialogDiv").dialog("option", "title", "");
        if (self.validateFn) {
            return self.validateFn(null, aggregateClauses);
        }
    };

    /**
     *
     * @param groupByNodes
     * @param functionNodes
     * @param groupFnVars
     * @return {{select: string, orderBy: string, where: string, groupBy: string}}
     */
    self.getAggregateQueryClauses = function (groupByNodes, functionNodes, groupFnVars) {
        var selectStr = "";
        var groupByStr = "";
        var whereStr = "";
        var orderByStr = "";

        function getWhereClause(obj) {
            return "?" + Sparql_common.formatStringForTriple(obj.classLabel, true) + " <" + obj.prop.id + "> " + "?" + Sparql_common.formatStringForTriple(obj.valueLabel, true) + ".\n ";

            //  return "?" + Sparql_common.formatStringForTriple(obj.item.label, true) + " <" + obj.prop.id + "> " + "?" + Sparql_common.formatStringForTriple(obj.label, true) + ".\n ";
        }

        groupByNodes.forEach(function (node) {
            whereStr += getWhereClause(node);
            selectStr += " ?" + Sparql_common.formatStringForTriple(node.valueLabel, true);
            groupByStr += " ?" + Sparql_common.formatStringForTriple(node.valueLabel, true); // + " ?" +
        });

        whereStr += getWhereClause(groupFnVars[0]);

        functionNodes.forEach(function (fn, index) {
            var fnVar = Sparql_common.formatStringForTriple(groupFnVars[0].valueLabel, true);

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
        return aggregateClauses;
    };

    /**
     * Builds a simple jsTree data array from an object map and delegates rendering to JstreeWidget
     * It assumes all entries are root nodes (parent "#") and forces the tree to be fully expanded
     * via options.openAll
     * @function
     * @name loadJstree
     * @memberof module:KGqueryAggregateWidget
     * @param {Object} dataMap map where each key becomes a node id/text
     * @param {String} divId DOM element ID where the tree will be rendered
     * @param {Object, optionnal} options configuration for the jsTree; `openAll` is forced true
     * @returns {void}
     */
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
