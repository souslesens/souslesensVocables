import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var DateWidget = (function () {
    var self = {};

    self.showDialog = function (divId, varName, options, validateFn) {
        self.varName = varName;
        self.validateFn = validateFn;

        if (!divId) {
            divId = "smallDialogDiv";
            self.divId = divId;
            $("#smallDialogDiv").dialog("open");
        }
        $("#" + divId).load("modules/uiWidgets/dateWidget.html", function () {
            DateWidget.setDatePickerOnInput("dateWidget_input", null, function (date) {});
        });
    };
    self.form = {
        onOKbutton: function () {
            var property = $("#dateWidget_propertySelect").val();
            var operator = $("#dateWidget_operatorSelect").val();
            var value = $("#dateWidget_objectValue").val();

            var datePrecision = $("#dateWidget_datePrecisionSelect").val();

            $("#" + self.divId).dialog("close");

            if (!value && self.useLabelsList) {
            } else if (self.date && datePrecision) {
                var dateFilter = Sparql_common.setDateRangeSparqlFilter(self.varName, self.date, null, { precision: datePrecision });
                if (dateFilter) {
                    return self.validateFn(null, dateFilter);
                }
            }
        },
    };

    self.setDatePickerOnInput = function (inputId, options, callback) {
        $("#" + inputId).datepicker({
            dateFormat: "yy-mm-dd",
            onClose: function (selectedDate) {
                if (callback) {
                    return callback($("#" + inputId).datepicker("getDate"));
                }
            },
        });
    };
    self.unsetDatePickerOnInput = function (inputId, options) {
        if ($("#" + inputId).datepicker && $("#" + inputId).datepicker.destroy) {
            $("#" + inputId).datepicker.destroy();
        }
    };

    self.setDateRangePickerOnInput = function (inputId, callback) {
        $("#" + inputId)
            .daterangepicker(function (start, end, label) {})

            .on("apply.daterangepicker", function (ev, picker) {
                var dateRange = {};
                dateRange.startDate = picker.startDate._d;
                dateRange.endDate = picker.endDate._d;
                callback(dateRange);
            });
    };

    return self;
})();

export default DateWidget;
window.DateWidget = DateWidget;
