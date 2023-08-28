import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import SearchUtil from "../search/searchUtil.js";
import DateWidget from "./dateWidget.js";

var IndividualValueFilterWidget = (function () {
    var self = {};
    self.operators = {
        String: ["contains", "not contains", "="],
        Number: ["=", "!=", "<", "<=", ">", ">="],
    };

    self.properties = {
        String: ["rdfs:label", "rdfs:isDefinedBy", "rdfs:comment", "skos:altLabel", "skos:prefLabel", "skos:definition", "skos:example"],
    };

    self.showDialog = function (divId, varName, classId, datatype, validateFn) {
        self.varName = varName;
        self.validateFn = validateFn;
        self.classId = classId;

        if (!divId) {
            divId = "smallDialogDiv";
            self.divId = divId;
            $("#smallDialogDiv").dialog("open");
        }
        $("#" + divId).load("snippets/IndividualValueFilterWidget.html", function () {
            if (datatype) {
                if (datatype.indexOf("dateTime") > -1) {
                    DateWidget.setDatePickerOnInput("individualValueFilter_objectValue", null, function (date) {
                        self.date = date;
                    });
                    $("#individualValueFilter_datePrecisionDiv").css("display", "block");
                }
                common.fillSelectOptions("individualValueFilter_propertySelect", [{ id: "owl:hasValue", label: "owl:hasValue" }], false, "label", "value");
                common.fillSelectOptions("individualValueFilter_operatorSelect", self.operators.Number, false);
                $("#individualValueFilter_operatorSelect").val(">");
            } else {
                common.fillSelectOptions("individualValueFilter_propertySelect", self.properties.String, false);
                common.fillSelectOptions("individualValueFilter_operatorSelect", self.operators.String, false);
                $("#individualValueFilter_operatorSelect").val("contains");
            }

            $("#individualValueFilter_propertySelect option").eq(1).prop("selected", true);
            $("#individualValueFilter_objectValue").focus();
        });
    };

    self.getSparqlFilter = function (varName, property, operator, value) {
        if (varName) {
            varName = "?" + varName;
        } else {
            varName = "";
        }
        if (!property || !value) {
            return null;
        }
        if (property.indexOf("xsd:") == 0) {
            var xsd = property;
            property = "owl:hasValue";
            value = "'" + value + "'^^" + xsd;
        }

        var filter = "";

        if (value.indexOf("xsd:dateTime") > -1) {
            filter = varName + "  owl:hasValue " + varName + "_value  filter(    datatype(" + varName + "_value) = xsd:dateTime" + " && " + varName + "_value" + operator + value + ")";
        } else if (value.indexOf("xsd:") > -1) {
            filter = varName + "  owl:hasValue " + varName + "_value  filter(  " + varName + "_value" + operator + value + ")";
        } else {
            if (operator == "contains") {
                filter += varName + "  " + property + " " + varName + "_value. Filter(regex(str(" + varName + "_value),'" + value + "','i')).";
            } else if (operator == "not contains") {
                filter += varName + "  " + property + " " + varName + "_value. Filter(!regex(str(" + varName + "_value),'" + value + "','i')).";
            } else {
                if (Sparql_common.isTripleObjectString(property, value)) {
                    value = "'" + value + "'";
                }

                filter += varName + "  " + property + " " + varName + "_value. Filter(" + varName + "_value" + operator + "" + value + ").";
            }
        }

        return filter;
    };

    self.onSelectOperator = function (value) {
        $("#individualValueFilter_objectValue").focus();
    };
    self.onSelectObject = function (value) {};
    self.onSelectProperty = function (property) {};

    self.onOKbutton = function () {
        var property = $("#individualValueFilter_propertySelect").val();
        var operator = $("#individualValueFilter_operatorSelect").val();
        var value = $("#individualValueFilter_objectValue").val();

        var datePrecision = $("#individualValueFilter_datePrecisionSelect").val();

        /*   if (self.validateFn && (!property || !operator || !value)) {
         return self.validateFn("missing paramaters in filter");
       }*/

        $("#" + self.divId).dialog("close");
        if (self.useLabelsList) {
            var labelsListIds = [];
            var individualObjs = $("#individualValueFilter_labelsTreeDiv").jstree().get_checked(true);
            individualObjs.forEach(function (item, index) {
                labelsListIds.push(item.id);
            });
            var listFilter = Sparql_common.setFilter(self.varName, labelsListIds);

            return self.validateFn(null, listFilter);
        } else if (self.date && datePrecision) {
            var dateFilter = Sparql_common.setDateRangeSparqlFilter(self.varName, self.date, null, { precision: datePrecision });
            if (dateFilter) {
                return self.validateFn(null, dateFilter);
            }
        } else {
            self.filter = self.getSparqlFilter(self.varName, property, operator, value);

            if (self.validateFn) {
                return self.validateFn(null, self.filter);
            }
        }
    };

    self.listLabels = function () {
        var term = prompt("label contains");

        self.getClassLabelsJstreeData(term, self.classId, function (err, jstreeData) {
            if (err) {
                return alert(err.responseText);
            }
            var options = {
                openAll: true,
                withCheckboxes: true,
                selectTreeNodeFn: function () {
                    self.useLabelsList = true;
                },
            };

            JstreeWidget.loadJsTree("individualValueFilter_labelsTreeDiv", jstreeData, options);
        });
    };

    self.getClassLabelsJstreeData = function (term, classId, callback) {
        if (!classId && classId != "anyClass") {
            return alert(" select a class");
        }
        if (term.indexOf("*") < 0) {
            term += "*";
        }

        var mode = "exactMatch";
        if (term.indexOf("*") > -1) {
            mode = "fuzzyMatch";
            // term=term.replace("*","")
        }
        if (classId == "anyClass") classId = null;
        var options = { classFilter: classId, skosLabels: true };
        var indexes = [Lineage_sources.activeSource.toLowerCase()];
        SearchUtil.getElasticSearchMatches([term], indexes, mode, 0, 1000, options, function (err, result) {
            if (err) {
                return alert(err);
            }

            var matches = [];
            result.forEach(function (item, index) {
                if (item.error) {
                    return alert(err);
                }
                var hits = item.hits.hits;
                var uniqueItems = {};
                hits.forEach(function (hit) {
                    if (!uniqueItems[hit._source.id]) {
                        uniqueItems[hit._source.id] = 1;
                        matches.push(hit._source);
                    }
                });
            });

            var jstreeData = [];
            matches.forEach(function (item) {
                jstreeData.push({
                    id: item.id,
                    text: item.label,
                    parent: "#",
                });
            });
            return callback(null, jstreeData);
        });
    };

    return self;
})();
export default IndividualValueFilterWidget;
window.IndividualValueFilterWidget = IndividualValueFilterWidget;
