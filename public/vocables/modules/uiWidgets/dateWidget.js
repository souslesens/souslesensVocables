import common from "../shared/common.js";

var DateWidget = (function () {
    var self = {};
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
