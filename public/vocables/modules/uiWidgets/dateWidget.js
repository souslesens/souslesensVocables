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
        }
        $("#" + divId).load("modules/uiWidgets/html/dateWidget.html", function () {
            UI.openDialog("smallDialogDiv", {title: "Date Filter"});
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
            // showOn: "button",
            //  buttonImage: "images/calendar.gif",
            //  buttonImageOnly: true, //
            changeMonth: true,
            changeYear: true,
            buttonText: "Select date",
            dateFormat: "yy-mm-dd",
            onClose: function (selectedDate) {
                if (callback) {
                    return callback($("#" + inputId).datepicker("getDate"));
                }
            },
        });
    };
    self.unsetDatePickerOnInput = function (inputId, options) {
        if ($("#" + inputId).data("datepicker")) {
            $("#" + inputId).datepicker("destroy");
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

    self.showDateRangePicker = function (divId, minDate, maxDate, onValidateRangPickerFn) {
        self.onValidateRangPickerFn = onValidateRangPickerFn;

        if (!minDate) minDate = new Date(2020, 0, 1);
        if (!maxDate) maxDate = new Date(2035, 11, 31);

        $("#" + divId).load("/vocables/modules/uiWidgets/rangeWidget.html", function () {
            UI.openDialog(divId, {title: " Date Range"});
            $("#slider").dateRangeSlider({
                wheelMode: "scroll",
                wheelSpeed: 1,
                bounds: {
                    min: minDate,
                    max: maxDate,
                },
                defaultValues: {
                    min: new Date(),
                    max: new Date(new Date().setDate(new Date().getDate() + 1)),
                },
                step: false,
                /*   range:{
                min: {years: 1},
                max: {years: 2}
            }*/
            });

            $("#rangePickerOkbutton").on("click", function () {
                $("#" + divId).dialog("close");
                var dateValues = $("#slider").dateRangeSlider("values");
                if (self.onValidateRangPickerFn) {
                    return self.onValidateRangPickerFn(dateValues.min, dateValues.max);
                    // console.log(dateValues.min.toString() + " " + dateValues.max.toString());
                }
            });
        });
    };

    return self;
})();

export default DateWidget;
window.DateWidget = DateWidget;
