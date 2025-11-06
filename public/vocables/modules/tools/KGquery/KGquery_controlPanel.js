/**
 * KGquery_controlPanel Module
 * Handles the user interface control panel for knowledge graph queries.
 * @module KGquery_controlPanel
 */

import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import KGquery_filter from "./KGquery_filter.js";

var KGquery_controlPanel = (function () {
    var self = {};
    self.vicinityArray = [];

    /**
     * Adds a new query set to the interface.
     * @function
     * @name addQuerySet
     * @memberof module:KGquery_controlPanel
     * @param {string} toDivId - The ID of the container div
     * @param {string} booleanOperator - The boolean operator for the set (Union/Minus)
     * @param {string} label - The label for the query set
     * @param {string} color - The color for the query set visualization
     * @returns {string} The ID of the created query set div
     */
    self.addQuerySet = function (toDivId, booleanOperator, label, color) {
        var querySetDivId = "querySetDiv_" + common.getRandomHexaId(5);
        var booleanOperatorHtml = "";
        if (true || booleanOperator) {
            var unionStr = booleanOperator == "Union" ? "selected=selected" : "";
            var minusStr = booleanOperator == "Minus" ? "selected=selected" : "";
            booleanOperatorHtml =
                "<div class='titleboxButtons' style='font-weight: bold;color: brown;margin:-15px 5px 0px 0px ;'>" +
                " <select class='select-bar-theme3' style='font-size:14px;' onchange='KGquery.onBooleanOperatorChange(\"" +
                querySetDivId +
                "\",$(this).val())'> " +
                "<option " +
                unionStr +
                ">Union</option>" +
                "<option " +
                minusStr +
                ">Minus</option>" +
                "</select>" +
                "</div>";
        }
        var setHtml = "<div id='" + querySetDivId + "' class='KGquery_setDiv' style='color:" + color + ";border-color:" + color + "'>" + booleanOperatorHtml + label;

        if (booleanOperator) {
            setHtml += "&nbsp;<button class=' titleboxButtons KGquery_smallButton  deleteIcon' onclick='KGquery.removeSet( \"" + querySetDivId + "\")' ></button>";
        }
        // "<button onclick='' >save</button>" +
        setHtml += "</div>";

        $("#" + toDivId).append(setHtml);
        $("#" + querySetDivId).bind("click", function () {
            var id = $(this).attr("id");
        });

        return querySetDivId;
    };

    /**
     * Adds a query element to the current set.
     * @function
     * @name addQueryElementToCurrentSet
     * @memberof module:KGquery_controlPanel
     * @param {string} querySetDivId - The ID of the query set div
     * @param {string} [color] - Optional color for the query element
     * @returns {string} The ID of the created query element div
     */
    self.addQueryElementToCurrentSet = function (querySetDivId, color) {
        var queryElementDivId = "queryElementDiv_" + common.getRandomHexaId(5);
        var sliderId = "slider_" + common.getRandomHexaId(5);
        var html;
        if (KGquery.currentQuerySet.elements.length == 0) {
            html =
                "<div  class='KGquery_pathDiv'  style='border:solid 2px " +
                color +
                "' id='" +
                queryElementDivId +
                "'>" +
                "&nbsp;<button class=' titleboxButtons KGquery_smallButton  deleteIcon' " +
                "onclick='KGquery.removeQueryElement( \"" +
                queryElementDivId +
                "\") '></button>" +
                "&nbsp;<input type='checkbox' id='KGquery_setOptionalCBX'  onchange='KGquery_controlPanel.onSetOptionalChange($(this).val()," +
                querySetDivId +
                ",";
        } else {
            html =
                "<div  class='KGquery_pathDiv'  style='border:solid 2px " +
                color +
                "' id='" +
                queryElementDivId +
                "'>" +
                "&nbsp;<button class=' titleboxButtons KGquery_smallButton  deleteIcon' " +
                "onclick='KGquery.removeQueryElement( \"" +
                queryElementDivId +
                "\") '></button>" +
                "&nbsp;<label class='kgquery-optional-slider'>" +
                "<input type='checkbox' id='" +
                sliderId +
                "' onchange='KGquery_controlPanel.onSetOptionalChange(this.checked, \"" +
                querySetDivId +
                '", "' +
                queryElementDivId +
                "\")' />" +
                "<span class='kgquery-slider'></span>" +
                "<span class='kgquery-slider-label'>Optional</span>" +
                "</label>";
        }

        ("</div>");
        $("#" + querySetDivId).append(html);

        return queryElementDivId;
    };

    /**
     * Adds a node to a query element div.
     * @function
     * @name addNodeToQueryElementDiv
     * @memberof module:KGquery_controlPanel
     * @param {string} queryElementDivId - The ID of the query element div
     * @param {string} role - The role of the node (fromNode/toNode)
     * @param {string} label - The label for the node
     * @returns {string} The ID of the created node div
     */
    self.addNodeToQueryElementDiv = function (queryElementDivId, role, label) {
        $("#" + queryElementDivId).css("display", "block");
        var nodeDivId = "nodeDiv_" + common.getRandomHexaId(5);
        var html = "";

        html +=
            "<div  class='KGquery_pathNodeDiv' id='" +
            nodeDivId +
            "'>" +
            "<div style='display:inline-flex'><span style='font:bold 14px'>" +
            label +
            "</span>" +
            "&nbsp;&nbsp;" +
            "<button  class='slsv-invisible-button filterIcon' about='add filter' onclick='KGquery_filter.addNodeFilter(\"" +
            nodeDivId +
            "\");'></button></div>";

        html += "<div style='font-size: 10px;' id='" + nodeDivId + "_filter'></div> " + "</div>" + "</div>";

        $("#" + queryElementDivId).append(html);
        //  $("#" + queryElementDivId) .find(".queryElement_" + role).html(html);
        return nodeDivId;
    };

    /**
     * Adds a predicate to a query element div.
     * @function
     * @name addPredicateToQueryElementDiv
     * @memberof module:KGquery_controlPanel
     * @param {string} queryElementDivId - The ID of the query element div
     * @param {string} label - The label for the predicate
     * @returns {void}
     */
    self.addPredicateToQueryElementDiv = function (queryElementDivId, label) {
        $("#" + queryElementDivId)
            .find(".queryElement_predicate")
            .html(label);
    };

    /**
     * Gets the predicate label for a query element.
     * @function
     * @name getQueryElementPredicateLabel
     * @memberof module:KGquery_controlPanel
     * @param {Object} queryElement - The query element
     * @param {Array} queryElement.paths - Array of paths in the query element
     * @returns {string} The formatted predicate label
     */
    self.getQueryElementPredicateLabel = function (queryElement) {
        var predicateLabel = "";
        queryElement.paths.forEach(function (path, index) {
            if (index > 0) {
                predicateLabel += ", ";
            }
            if (path.length > 3) {
                predicateLabel += "^";
            }
            predicateLabel += Sparql_common.getLabelFromURI(path[2]);
        });
        return predicateLabel;
    };

    self.onSetOptionalChange = function (state, querySetDivId, queryElementDivId) {
        var querySet = KGquery.divsMap[querySetDivId.id];
        querySet.elements.forEach(function (element) {
            if (element.divId == queryElementDivId.id) element.isOptional = state == "on";
        });
    };

    return self;
})();
export default KGquery_controlPanel;
window.KGquery_controlPanel = KGquery_controlPanel;
