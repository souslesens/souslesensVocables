// eslint-disable-next-line @typescript-eslint/no-unused-vars
var ConfigEditor = (function () {
    var self = {};
    import("/assets/index.js");
    self.createApp = null;
    self.umountKGUploadApp = null;
    self.unload = function () {
        self.umountKGUploadApp();
    };

    self.onSourceSelect = function () {
        // Pass
    };

    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });

        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").parent().show();
        $("#mainDialogDiv").dialog("option", "title", "Config Editor");
        //$("#mainDialogDiv").parent().css("left", "100px");
        $("#mainDialogDiv").dialog({
            close: function (event, ui) {
                self.umountKGUploadApp();
            },
        });
        $("#mainDialogDiv").html("");

        $("#mainDialogDiv").html(`
                    <div id="mount-app-here"></div>
            `);

        self.umountKGUploadApp = self.createApp();
    };

    return self;
})();

export default ConfigEditor;

window.ConfigEditor = ConfigEditor;
