import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import KGquery_filter from "./KGquery_filter.js";

/**
 * Module for managing the control panel interface of the KGquery tool.
 * Handles the creation and management of query sets, elements, and nodes in the UI.
 * @module KGquery_controlPanel
 */
var KGquery_controlPanel = (function () {
    var self = {};
    self.vicinityArray = [];

    /**
     * Adds a new query set to the interface.
     * @function
     * @name addQuerySet
     * @memberof KGquery_controlPanel
     * @param {string} toDivId - The ID of the container div
     * @param {string} booleanOperator - The boolean operator for the query set ('Union' or 'Minus')
     * @param {string} label - Label for the query set
     * @param {string} color - Color for the query set visualization
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
     * @memberof KGquery_controlPanel
     * @param {string} querySetDivId - The ID of the parent query set div
     * @param {string} color - Color for the query element visualization
     * @returns {string} The ID of the created query element div
     */
    self.addQueryElementToCurrentSet = function (querySetDivId, color) {
        var queryElementDivId = "queryElementDiv_" + common.getRandomHexaId(5);
        var html =
            "<div  class='KGquery_pathDiv'  style='border:solid 2px " +
            color +
            "' id='" +
            queryElementDivId +
            "'>" +
            "&nbsp;<button class=' titleboxButtons KGquery_smallButton  deleteIcon' " +
            "onclick='KGquery.removeQueryElement( \"" +
            queryElementDivId +
            "\") '></button>" +
            "</div>";
        $("#" + querySetDivId).append(html);

        return queryElementDivId;
    };

    /**
     * Adds a node to a query element div.
     * @function
     * @name addNodeToQueryElementDiv
     * @memberof KGquery_controlPanel
     * @param {string} queryElementDivId - The ID of the query element div
     * @param {string} role - The role of the node in the query
     * @param {string} label - Label for the node
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
     * @memberof KGquery_controlPanel
     * @param {string} queryElementDivId - The ID of the query element div
     * @param {string} label - Label for the predicate
     */
    self.addPredicateToQueryElementDiv = function (queryElementDivId, label) {
        $("#" + queryElementDivId)
            .find(".queryElement_predicate")
            .html(label);
    };

    /**
     * Gets the label for a query element's predicate.
     * @function
     * @name getQueryElementPredicateLabel
     * @memberof KGquery_controlPanel
     * @param {Object} queryElement - The query element containing paths
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

    return self;
})();
export default KGquery_controlPanel;
window.KGquery_controlPanel = KGquery_controlPanel;
