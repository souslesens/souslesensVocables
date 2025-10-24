import common from "../shared/common.js";

var SimpleListSelectorWidget = (function () {
    var self = {};

    self.showDialog = function (options, loadFn, validateFn) {
        self.validateFn = validateFn;
        if (!options) {
            options = { size: 10, multiple: false };
        }

        var multipleStr = "";
        var onClick = "";
        if (options.multiple) {
            multipleStr = " multiple='multiple'";
        } else {
            onClick = " onclick='SimpleListSelectorWidget.onOKbutton()' ";
        }

        var html =
            "<div><select id='SimpleListSelectorWidget_select' size='" +
            options.size +
            "'" +
            onClick +
            multipleStr +
            ">" +
            " </select> <br> <button onclick='SimpleListSelectorWidget.onOKbutton()'>OK</button></div>";

        var divId = "smallDialogDiv";
        self.divId = divId;

        $("#" + divId).html(html);
        $("#" + divId).dialog("open");

        if (options.title) {
            UI.setDialogTitle("#" + divId, options.title);
        }

        loadFn(function (data) {
            if (typeof data[0] === "object") {
                common.fillSelectOptions("SimpleListSelectorWidget_select", data, !options.multiple, "label", "id");
            } else {
                common.fillSelectOptions("SimpleListSelectorWidget_select", data, !options.multiple);
            }
        });
    };

    self.onOKbutton = function () {
        var value = $("#SimpleListSelectorWidget_select").val();

        $("#" + self.divId).dialog("close");
        return self.validateFn(value);
    };

    return self;
})();
export default SimpleListSelectorWidget;
window.SimpleListSelectorWidget = SimpleListSelectorWidget;
