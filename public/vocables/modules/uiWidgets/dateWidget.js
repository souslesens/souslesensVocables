import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var DateWidget = (function () {
    var self = {};

    // jQuery UI dateFormat, yy is the 4 digit year
    self.isoDateFormat = "yy-mm-dd";
    self.isoDateTextRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
    self.frDateTextRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    self.calendarIdSuffix = "_calendar";

    self.showDialog = function (divId, varName, options, validateFn) {
        self.varName = varName;
        self.validateFn = validateFn;

        if (!divId) {
            divId = "smallDialogDiv";
            self.divId = divId;
        }
        $("#" + divId).load("modules/uiWidgets/html/dateWidget.html", function () {
            UI.openDialog("smallDialogDiv", { title: "Date Filter" });
            UI.clampAndCenterDialog("smallDialogDiv");
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

    /**
     * Read a date typed by hand, ISO (2024-03-15) or French (15/03/2024).
     * @param {string} dateText
     * @returns {Date|null} local midnight of that day, null when the text is not a real date
     */
    self.parseDateText = function (dateText) {
        var trimmedText = String(dateText || "").trim();
        var isoMatch = trimmedText.match(self.isoDateTextRegex);
        var frMatch = trimmedText.match(self.frDateTextRegex);
        var year, month, day;
        if (isoMatch) {
            [, year, month, day] = isoMatch;
        } else if (frMatch) {
            [, day, month, year] = frMatch;
        } else {
            return null;
        }
        var date = new Date(Number(year), Number(month) - 1, Number(day));
        // 31/02 rolls over to March: not a real date
        if (date.getMonth() != Number(month) - 1 || date.getDate() != Number(day)) {
            return null;
        }
        return date;
    };

    self.setDatePickerOnInput = function (inputId, options, callback) {
        var input = $("#" + inputId);
        var datepickerOptions = {
            changeMonth: true,
            changeYear: true,
            buttonText: "Select date",
            dateFormat: self.isoDateFormat,
        };

        // jQuery UI datepicker ignores a textarea (the bot prompt is one): show an inline calendar under it
        if (input.is("textarea") || options?.isInline) {
            var calendar = $("<div>").attr("id", inputId + self.calendarIdSuffix);
            $("#" + inputId + self.calendarIdSuffix).remove();
            input.after(calendar);
            calendar.datepicker(
                Object.assign(datepickerOptions, {
                    defaultDate: self.parseDateText(input.val()),
                    onSelect: function (dateText) {
                        calendar.hide();
                        input.val(dateText).trigger("focus");
                        if (callback) {
                            return callback(calendar.datepicker("getDate"));
                        }
                    },
                }),
            );
            // closed by a picked day, back on a click or a key in the field
            input.on("click.dateWidget", function () {
                calendar.show();
            });
            input.on("input.dateWidget", function () {
                calendar.show();
                var typedDate = self.parseDateText(input.val());
                if (typedDate) {
                    calendar.datepicker("setDate", typedDate);
                }
            });
            return;
        }

        input.datepicker(
            Object.assign(datepickerOptions, {
                onClose: function (selectedDate) {
                    if (callback) {
                        return callback(input.datepicker("getDate"));
                    }
                },
            }),
        );
    };
    self.unsetDatePickerOnInput = function (inputId, options) {
        var input = $("#" + inputId);
        input.off(".dateWidget");
        $("#" + inputId + self.calendarIdSuffix).remove();
        if (input.data("datepicker")) {
            input.datepicker("destroy");
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

        $("#" + divId).load("modules/uiWidgets/html/rangeWidget.html", function () {
            UI.openDialog(divId, { title: " Date Range" });
            UI.clampAndCenterDialog(divId);
            // a popup under "from" would hide "to": both calendars stay open side by side
            self.setDatePickerOnInput("dateRangeWidget_minDate", { isInline: true });
            self.setDatePickerOnInput("dateRangeWidget_maxDate", { isInline: true });

            $("#rangePickerOkbutton").on("click", function () {
                var rangeMinDate = self.parseDateText($("#dateRangeWidget_minDate").val());
                var rangeMaxDate = self.parseDateText($("#dateRangeWidget_maxDate").val());
                if (!rangeMinDate || !rangeMaxDate || rangeMinDate > rangeMaxDate) {
                    return $("#dateRangeWidget_message").text("enter two dates, from before to");
                }
                self.unsetDatePickerOnInput("dateRangeWidget_minDate");
                self.unsetDatePickerOnInput("dateRangeWidget_maxDate");
                $("#" + divId).dialog("close");
                if (self.onValidateRangPickerFn) {
                    // UTC midnight, the same instant a typed single date gets from new Date("yyyy-mm-dd")
                    var utcMinDate = new Date(common.getSimpleDateStrFromDate(rangeMinDate));
                    var utcMaxDate = new Date(common.getSimpleDateStrFromDate(rangeMaxDate));
                    return self.onValidateRangPickerFn(utcMinDate, utcMaxDate);
                }
            });
        });
    };

    return self;
})();

export default DateWidget;
window.DateWidget = DateWidget;
