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

        $("#mainDialogDiv").on("dialogclose", function (event, ui) {
            self.umountKGUploadApp();
        });

        $("#mainDialogDiv").html("");

        $("#mainDialogDiv").html(`
                    <div style="width:90vw;height: 90vh"><div id="mount-app-here"></div></div>
            `);

        self.umountKGUploadApp = self.createApp();
        UI.openDialog("mainDialogDiv", { title: "Config Editor" });
    };

    return self;
})();

export default ConfigEditor;

window.ConfigEditor = ConfigEditor;
