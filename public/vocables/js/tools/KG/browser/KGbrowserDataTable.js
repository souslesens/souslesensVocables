// eslint-disable-next-line @typescript-eslint/no-unused-vars
var KGbrowserDataTable = (function () {
    var self = {};

    self.showQueryResult = function (data, options) {
        var dataSet = [];
        var cols = [];
        var keys = {};

        options.selectVars.forEach(function (varName) {
            var key = varName.substring(1);
            cols.push({ title: key, defaultContent: "" });
            cols.push({ title: key + "Label", defaultContent: "" });
            keys[key] = 1;
            keys[key + "Label"] = 1;
        });
        data.data.forEach(function (item, _indexRow) {
            var line = [];
            for (var key in keys) {
                if (item[key]) line.push(item[key].value);
                else line.push("");
            }
            dataSet.push(line);
        });

        $("#mainDialogDiv").dialog("open");

        $("#mainDialogDiv").html("<table id='dataTableDiv'></table>");
        setTimeout(function () {
            $("#dataTableDiv").DataTable({
                data: dataSet,
                columns: cols,
                pageLength: 10,
                dom: "Bfrtip",
                buttons: [
                    {
                        extend: "csvHtml5",
                        text: "Export CSV",
                        fieldBoundary: "",
                        fieldSeparator: ";",
                    },
                    "copy",
                ],
            }),
                500;
        });
    };
    return self;
})();
