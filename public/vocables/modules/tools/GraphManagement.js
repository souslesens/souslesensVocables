const GraphManagement = (function () {
    const self = {};
    self.onSourceSelect = function () {};
    self.createApp = null;
    self.umountKGUploadApp = null;
    import("/assets/graph_management.js");
    self.unload = function () {
        self.umountKGUploadApp();
    };
    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });

        setTimeout(function () {
            UI.setDialogTitle("#mainDialogDiv", "Graph Management");

            $("#mainDialogDiv").on("dialogclose", function (event, ui) {
                self.umountKGUploadApp();
            });

            //$("#mainDialogDiv").parent().css("left", "100px");

            $("#mainDialogDiv").html("");
            $("#mainDialogDiv").html(`
                    <div style="width:90vw;height: 90vh"><div id="mount-graph-management-here"></div></div>
            `);
            $("#mainDialogDiv").dialog("open");
            self.umountKGUploadApp = self.createApp();
        }, 200);
    };

    return self;
})();

export default GraphManagement;

window.GraphManagement = GraphManagement;
