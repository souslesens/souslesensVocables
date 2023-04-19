import common from "./../../common.js"



var Lineage_filterBy = (function () {
    var self = {};
    self.context = {};
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

    self.removeQueryElement = function (table, filterId) {
        delete self.filters[filterId];
        $("#" + filterId).remove();
    };

    return self;
})();



export default Lineage_filterBy

window.Lineage_filterBy=Lineage_filterBy;