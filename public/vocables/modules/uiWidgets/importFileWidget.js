var ImportFileWidget = (function () {
    var self = {};

    self.showImportDialog = function (onValidateFn) {
        $("#smallDialogDiv").load("modules/uiWidgets/html/importDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            $("#importFileButton").on("click", function () {
                const file = $("#importFileInput")[0].files[0];
                if (!file) {
                    return alert("no file selected");
                }
                if (file && file.type !== "application/json") {
                    return alert("Select valid JSON file !");
                }
                const reader = new FileReader();
                reader.onload = function (e) {
                    var fileContent = e.target.result;
                    $("#smallDialogDiv").dialog("close");

                    if (onValidateFn) {
                        onValidateFn(null, fileContent);
                    }
                };
                reader.readAsText(file);
            });
        });
    };
    return self;
})();

export default ImportFileWidget;
window.ImportFileWidget = ImportFileWidget;
