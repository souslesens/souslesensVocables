import common from "../../shared/common.js";

var Lineage_filterBy = (function () {
    var self = {};
    self.context = {};


    /**
     * Adds a new filter to the lineage query parameters.
     * Generates a unique filter ID and appends the filter to the UI.
     * @function
     * @name addFilter
     * @memberof Lineage_filterBy
     * @returns {Object} The filter object containing the filter ID, property, operator, and value.
     */
    self.addFilter = function () {
        var filterId = "filter_" + common.getRandomHexaId(5);
        var property = $("#Lineage_filterBy_propertySelect").val();

        var operator = $("#Lineage_filterBy_operator").val();
        var value = $("#Lineage_filterBy_value").val();

        var html = "<div class='LineageLinkedDataQueryParams_QueryElt' id='" + filterId + "'> ";
        html += "<button style='size: 10px' onclick='Lineage_filterBy.removeQueryElement(\"" + self.currentTable + '","' + filterId + "\")'>X</button>";

        var obj = {
            id: filterId,
        };

        obj.property = property;
        obj.operator = operator;
        obj.value = value;

        html += "&nbsp;" + property + " " + operator + "&nbsp;" + value + "&nbsp;";

        html += "</div>";

        $("#LineageLinkedDataQueryParams_Filters").append(html);
        $("#LineageLinkedDataQueryParams_createFilterDiv").css("display", "none");
        self.filters[filterId] = obj;
        return obj;
    };


    /**
     * Removes a filter element from the lineage query parameters.
     * Deletes the filter from the internal storage and removes its corresponding HTML element.
     * @function
     * @name removeQueryElement
     * @memberof Lineage_filterBy
     * @param {string} table - The name of the table associated with the filter.
     * @param {string} filterId - The unique ID of the filter to be removed.
     * @returns {void}
     */
    self.removeQueryElement = function (table, filterId) {
        delete self.filters[filterId];
        $("#" + filterId).remove();
    };

    return self;
})();

export default Lineage_filterBy;

window.Lineage_filterBy = Lineage_filterBy;
