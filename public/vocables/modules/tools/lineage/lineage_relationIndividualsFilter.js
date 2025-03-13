import common from "../../shared/common.js";
//import Lineage_relationFilter from "./lineage_relationFilter.js";
import Lineage_sources from "./lineage_sources.js";
import SearchUtil from "../../search/searchUtil.js";
import Lineage_relations from "./lineage_relations.js";
import DateWidget from "../../uiWidgets/dateWidget.js";
import IndividualValueFilterWidget from "../../uiWidgets/individualValuefilterWidget.js";

/**
 * @module Lineage_relationIndividualsFilter
 * @category Lineage
 * This module provides functionalities for filtering individuals in the lineage tool.
 * It includes functions for initializing the filter UI, searching for individuals,
 * adding individual filters, and executing the current filter.
 * @namespace lineage
 */     
var Lineage_relationIndividualsFilter = (function () {
    var self = {};
    self.filter = "";
    self.individualsFilter = [];

    /**
     * Initializes the filter UI for relation individuals.
     * Loads the dialog and sets up event listeners for filtering individuals.
     * @function
     * @name init
     * @memberof lineage.Lineage_relationIndividualsFilter
     * @returns {void}
     */
    self.init = function () {
        self.filter = "";
        var currentPropertyNode = Lineage_relations.currentPropertyTreeNode;

        $("#smallDialogDiv").load("modules/tools/lineage/html/relationPropDomainRangeDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            if (currentPropertyNode && currentPropertyNode.data.constraints) {
                var roles = [currentPropertyNode.data.constraints.domain, currentPropertyNode.data.constraints.range];
                $(".lineage_relationIndividuals_filterTypeDiv").css("display", "none");
                common.fillSelectOptions("lineage_relationIndividuals_filterRoleSelect", roles, null, "label", "id");
                if (currentPropertyNode.data.constraints) {
                    $("#lineage_relationIndividuals_filterRoleSelect").val(currentPropertyNode.data.constraints.domain.id);
                }

                $("#lineage_relationIndividuals_searchTermInput").keypress(function (e) {
                    if (e.which == 13 || e.which == 9) {
                        Lineage_relationIndividualsFilter.searchClassIndividuals();
                        self.filter = "";
                    }
                });
            } else {
                roles = [{ id: "anyClass", label: "any Class" }];
                self.onFilterTypeSelect("advanced");
            }
        });
    };

    /**
     * Searches for individuals belonging to a specific class based on a search term.
     * Populates a tree structure with the matching individuals.
     * @function
     * @name searchClassIndividuals
     * @memberof lineage.Lineage_relationIndividualsFilter
     * @param {string} term - The search term used to filter individuals.
     * @returns {void}
     */
    self.searchClassIndividuals = function (term) {
        var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
        IndividualValueFilterWidget.getClassLabelsJstreeData(term, classId, function (err, jstreeData) {
            if (err) return alert(err.responseText);
            var options = {
                openAll: true,
                withCheckboxes: true,
                selectTreeNodeFn: Lineage_relationIndividualsFilter.addIndividualFilter,
            };

            JstreeWidget.loadJsTree("lineage_relationIndividuals_matchesTreeDiv", jstreeData, options);
        });
    };

    /**
     * Adds an individual filter based on the selected search result.
     * Updates the filter textarea with the generated SPARQL filter query.
     * @function
     * @name addIndividualFilter
     * @memberof lineage.Lineage_relationIndividualsFilter
     * @param {Object} event - The event object triggered by the selection.
     * @param {Object} obj - The selected individual node data.
     * @returns {void}
     */
    self.addIndividualFilter = function (event, obj) {
        var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
        var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
        var classLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
        var individuals = [];
        var individualLabels = [];
        if (!obj) {
            var individualObjs = $("#lineage_relationIndividuals_matchesTreeDiv").jstree().get_checked(true);
            individualObjs.forEach(function (item) {
                individuals.push(item.id);
                individualLabels.push(item.text);
            });
        } else {
            individuals = [obj.node.id];
        }
        var individualLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
        //  var message="filter  "+classLabel+" = "+individualLabel
        Lineage_relations.currentQueryInfos.filter.classLabel = classLabel;
        Lineage_relations.currentQueryInfos.filter.value = individualLabels.toString();
        var role = classIndex == 0 ? "subject" : "object";
        var message = Sparql_common.setFilter(role, null, individuals, { exactMatch: true });
        //  var message = Sparql_common.setFilter(role, individuals);
        // var message = "FILTER(?" + role + " = <" + individual + ">)  ";
        $("#lineage_relationIndividuals_filterTA").text(message);
    };

    /**
     * Executes the current filter and applies it to the relation visualization.
     * Closes the dialog after applying the filter.
     * @function
     * @name execFilter
     * @memberof lineage.Lineage_relationIndividualsFilter
     * @param {string} action - The action to execute after applying the filter.
     * @returns {void}
     */
    self.execFilter = function (action) {
        Lineage_relationIndividualsFilter.addRangeAndDomainFilter();
        Lineage_relations.onshowDrawRelationsDialogValidate(action);
        $("#smallDialogDiv").dialog("close");
        $("#mainDialogDiv").dialog("close");
    };

    /**
     * Adds the range and domain filter to the query.
     * Updates the internal filter value based on the selected conditions.
     * @function
     * @name addRangeAndDomainFilter
     * @memberof lineage.Lineage_relationIndividualsFilter
     * @returns {void}
     */
    self.addRangeAndDomainFilter = function () {
        var filter = $("#lineage_relationIndividuals_filterTA").val();
        if (filter) {
            self.filter = filter;
        } else {
            self.filter = "";
        }
    };


    /**
     * Handles the selection of a filter type and updates the UI accordingly.
     * Allows users to choose between different filtering options.
     * @function
     * @name onFilterTypeSelect
     * @memberof lineage.Lineage_relationIndividualsFilter
     * @param {string} filterType - The type of filter selected (e.g., "searchLabel", "dateRange").
     * @returns {void}
     */
    self.onFilterTypeSelect = function (filterType) {
        $(".lineage_relationIndividuals_filterTypeDiv").css("display", "none");
        /*   var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
    if (!classId) {
      return alert(" select a class");
    }*/
        $(".filterTypeDiv_" + filterType).css("display", "flex");

        if (filterType == "searchLabel") {
            var term = prompt("contains");
            if (false && !term) {
                return $(".filterTypeDiv_" + filterType).css("display", "none");
            }
            self.searchClassIndividuals(term);
        } else if (filterType == "dateRange") {
            DateWidget.setDateRangePickerOnInput("lineage_relationIndividuals_dateRangePicker", function (dateRange) {
                var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
                var role = classIndex == 0 ? "subject" : "object";
                var filter = Sparql_common.setDateRangeSparqlFilter(role, dateRange.startDate, dateRange.endDate);
                $("#lineage_relationIndividuals_filterTA").text(filter);
            });
        } else if (filterType == "date") {
            DateWidget.setDatePickerOnInput("lineage_relationIndividuals_datePicker", function (date) {});
            Lineage_relations.currentQueryInfos.filter.value = "Date between " + dateRange.startDate + " and " + dateRange.endDate;
        } else if (filterType == "advanced") {
            $("#lineage_relationIndividuals_LeftDiv").css("display", "none");
            PredicatesSelectorWidget.load("lineage_relation_predicateSelectorDiv", Lineage_sources.activeSource, { withOperators: true });
        }
    };

    /**
     * Sets a date-based filter with the specified precision.
     * Updates the filter query based on the selected date and precision.
     * @function
     * @name setDateFilter
     * @memberof lineage.Lineage_relationIndividualsFilter
     * @param {string} precision - The level of precision for the date filter (e.g., "day", "month").
     * @returns {void}
     */
    self.setDateFilter = function (precision) {
        if (!precision) {
            return;
        }
        var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
        var date = $("#lineage_relationIndividuals_datePicker").datepicker("getDate");
        if (!date) {
            return alert("select a date");
        }
        var role = classIndex == 0 ? "subject" : "object";
        Lineage_relations.currentQueryInfos.filter.value = "Date" + precision + date.toDateString();

        var filter = Sparql_common.setDateRangeSparqlFilter(role, date, null, { precision: precision });
        $("#lineage_relationIndividuals_filterTA").text(filter);
    };

    return self;
})();

export default Lineage_relationIndividualsFilter;

window.Lineage_relationIndividualsFilter = Lineage_relationIndividualsFilter;
